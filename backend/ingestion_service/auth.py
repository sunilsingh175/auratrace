"""Real account authentication for AuraTrace.

Credentials are stored server-side. Passwords are never stored in plaintext;
PBKDF2-HMAC-SHA256 with a per-user salt is used so this service does not
require an additional password-hashing dependency.
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import redis.asyncio as aioredis
import time
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_HOST = os.getenv("REDIS_HOST", "redis-broker")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
OTP_TTL_SECONDS = int(os.getenv("AURA_OTP_TTL_SECONDS", "300"))
AUTH_SECRET = os.getenv("AURA_AUTH_SECRET", "")
ADMIN_REGISTRATION_KEY = os.getenv("AURA_ADMIN_REGISTRATION_KEY", "")
SESSION_TTL_SECONDS = int(os.getenv("AURA_SESSION_TTL_SECONDS", "28800"))

router = APIRouter(prefix="/auth", tags=["Authentication"])

_engine = create_async_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None
_redis = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


class RegisterPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=320)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field("Developer", pattern="^(Developer|Admin)$")
    admin_registration_key: Optional[str] = None


class VerifyOtpPayload(BaseModel):
    email: str = Field(..., min_length=5, max_length=320)
    otp: str = Field(..., pattern=r"^\\d{6}$")
    purpose: str = Field(..., pattern="^(register|login)$")


class LoginPayload(BaseModel):
    email: str = Field(..., min_length=5, max_length=320)
    password: str = Field(..., min_length=1, max_length=128)


def _require_config() -> None:
    if not _engine or not AUTH_SECRET:
        raise HTTPException(
            status_code=503,
            detail="Authentication is not configured. Set DATABASE_URL and AURA_AUTH_SECRET.",
        )


def _hash_password(password: str, salt: bytes) -> str:
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return base64.b64encode(digest).decode()


def _make_password_record(password: str) -> tuple[str, str]:
    salt = secrets.token_bytes(16)
    return base64.b64encode(salt).decode(), _hash_password(password, salt)


def _verify_password(password: str, salt_b64: str, expected_hash: str) -> bool:
    try:
        salt = base64.b64decode(salt_b64.encode())
    except Exception:
        return False
    return hmac.compare_digest(_hash_password(password, salt), expected_hash)


def _make_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": int(time.time()) + SESSION_TTL_SECONDS,
    }
    body = base64.urlsafe_b64encode(
        json.dumps(payload, separators=(",", ":")).encode()
    ).decode().rstrip("=")
    signature = hmac.new(
        AUTH_SECRET.encode(), body.encode(), hashlib.sha256
    ).digest()
    sig = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{body}.{sig}"


async def init_auth_table() -> None:
    _require_config()
    async with _engine.begin() as conn:
        await conn.execute(text(
            """
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                name VARCHAR(120) NOT NULL,
                email VARCHAR(320) NOT NULL UNIQUE,
                password_hash VARCHAR(128) NOT NULL,
                password_salt VARCHAR(64) NOT NULL,
                role VARCHAR(16) NOT NULL DEFAULT 'Developer',
                status VARCHAR(16) NOT NULL DEFAULT 'Active',
                created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT users_role_check CHECK (role IN ('Developer', 'Admin')),
                CONSTRAINT users_status_check CHECK (status IN ('Active', 'Suspended'))
            )
            """
        ))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS users_email_idx ON users (email)"))


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterPayload):
    _require_config()
    name = payload.name.strip()
    email = payload.email.strip().lower()

    if len(name) < 2:
        raise HTTPException(status_code=400, detail="Name must contain at least 2 characters.")

    if payload.role == "Admin":
        if not ADMIN_REGISTRATION_KEY:
            raise HTTPException(status_code=403, detail="Admin registration is disabled.")
        if not hmac.compare_digest(payload.admin_registration_key or "", ADMIN_REGISTRATION_KEY):
            raise HTTPException(status_code=403, detail="Invalid admin registration key.")

    salt, password_hash = _make_password_record(payload.password)
    user_id = uuid.uuid4()

    async with _engine.begin() as conn:
        existing = await conn.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": email},
        )
        if existing.first():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")

        await conn.execute(
            text(
                """
                INSERT INTO users (id, name, email, password_hash, password_salt, role)
                VALUES (:id, :name, :email, :password_hash, :password_salt, :role)
                """
            ),
            {
                "id": user_id,
                "name": name,
                "email": email,
                "password_hash": password_hash,
                "password_salt": salt,
                "role": payload.role,
            },
        )

    otp = f"{secrets.randbelow(1_000_000):06d}"
    await _redis.setex(f"auratrace:otp:register:{email}", OTP_TTL_SECONDS, otp)
    print(f"[AuraTrace OTP] registration email={email} otp={otp}")
    return {"otp_required": True, "message": "OTP sent. Verify the OTP to activate the account.", "email": email, "purpose": "register"}


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpPayload):
    _require_config()
    email = payload.email.strip().lower()
    expected = await _redis.get(f"auratrace:otp:{payload.purpose}:{email}")
    if not expected or not hmac.compare_digest(expected, payload.otp):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")
    await _redis.delete(f"auratrace:otp:{payload.purpose}:{email}")
    async with _engine.begin() as conn:
        result = await conn.execute(text("SELECT id, name, email, role, status, created_at FROM users WHERE email = :email"), {"email": email})
        user = result.mappings().first()
    if not user or user["status"] != "Active":
        raise HTTPException(status_code=401, detail="Account is unavailable.")
    token = _make_token(str(user["id"]), user["role"])
    return {"access_token": token, "token_type": "bearer", "user": {"id": str(user["id"]), "name": user["name"], "email": user["email"], "role": user["role"], "status": user["status"], "created_at": user["created_at"].date().isoformat()}}


@router.post("/login")
async def login(payload: LoginPayload):
    _require_config()
    email = payload.email.strip().lower()
    async with _engine.begin() as conn:
        result = await conn.execute(text("SELECT id, name, email, password_hash, password_salt, role, status FROM users WHERE email = :email"), {"email": email})
        user = result.mappings().first()
    if not user or not _verify_password(payload.password, user["password_salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user["status"] != "Active":
        raise HTTPException(status_code=403, detail="This account is suspended.")
    otp = f"{secrets.randbelow(1_000_000):06d}"
    await _redis.setex(f"auratrace:otp:login:{email}", OTP_TTL_SECONDS, otp)
    print(f"[AuraTrace OTP] login email={email} otp={otp}")
    return {"otp_required": True, "message": "OTP sent. Verify the OTP to complete login.", "email": email, "purpose": "login"}


@router.get("/me")
async def me():
    raise HTTPException(status_code=501, detail="Session introspection is not enabled yet.")

        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user_id),
            "name": name,
            "email": email,
            "role": payload.role,
            "status": "Active",
            "created_at": datetime.now(timezone.utc).date().isoformat(),
        },
    }


@router.post("/login")
async def login(payload: LoginPayload):
    _require_config()
    email = payload.email.strip().lower()

    async with _engine.begin() as conn:
        result = await conn.execute(
            text(
                """
                SELECT id, name, email, password_hash, password_salt, role, status, created_at
                FROM users
                WHERE email = :email
                """
            ),
            {"email": email},
        )
        user = result.mappings().first()

    if not user or not _verify_password(
        payload.password, user["password_salt"], user["password_hash"]
    ):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if user["status"] != "Active":
        raise HTTPException(status_code=403, detail="This account is suspended.")

    role = user["role"]
    token = _make_token(str(user["id"]), role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["id"]),
            "name": user["name"],
            "email": user["email"],
            "role": role,
            "status": user["status"],
            "created_at": user["created_at"].date().isoformat(),
        },
    }


router.get("/me")
async def me(authorization: Optional[str] = None):
    # The frontend currently keeps the session in sessionStorage. This endpoint
    # is intentionally small; protected business APIs can adopt the same token
    # verifier as authorization is rolled out across the API surface.
    raise HTTPException(status_code=501, detail="Session introspection is not enabled yet.")

"""AuraTrace account authentication with password + email OTP verification."""

import base64
import hashlib
import hmac
import json
import os
import secrets
import smtplib
import time
import uuid
from email.message import EmailMessage
from datetime import datetime, timezone

import redis.asyncio as aioredis
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_HOST = os.getenv("REDIS_HOST", "redis-broker")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
AUTH_SECRET = os.getenv("AURA_AUTH_SECRET", "")
ADMIN_REGISTRATION_KEY = os.getenv("AURA_ADMIN_REGISTRATION_KEY", "")
SESSION_TTL_SECONDS = int(os.getenv("AURA_SESSION_TTL_SECONDS", "28800"))
OTP_TTL_SECONDS = int(os.getenv("AURA_OTP_TTL_SECONDS", "300"))
OTP_RESEND_SECONDS = int(os.getenv("AURA_OTP_RESEND_SECONDS", "30"))
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

router = APIRouter(prefix="/auth", tags=["Authentication"])
_engine = create_async_engine(DATABASE_URL, pool_pre_ping=True) if DATABASE_URL else None
_redis = aioredis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)


class RegisterPayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=320)
    password: str = Field(..., min_length=8, max_length=128)
    role: str = Field(..., pattern="^(Developer|Admin)$")
    admin_registration_key: str | None = None


class LoginPayload(BaseModel):
    email: str = Field(..., min_length=5, max_length=320)
    password: str = Field(..., min_length=8, max_length=128)


class VerifyOtpPayload(BaseModel):
    email: str = Field(..., min_length=5, max_length=320)
    otp: str = Field(..., pattern=r"^\d{6}$")
    purpose: str = Field(..., pattern="^(register|login)$")


def _require_config() -> None:
    if not DATABASE_URL or not AUTH_SECRET:
        raise HTTPException(status_code=503, detail="Authentication service is not configured.")


def _hash_password(password: str, salt: bytes | None = None) -> tuple[str, str]:
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 310_000)
    return base64.b64encode(digest).decode(), base64.b64encode(salt).decode()


def _verify_password(password: str, salt: str, expected_hash: str) -> bool:
    actual, _ = _hash_password(password, base64.b64decode(salt))
    return hmac.compare_digest(actual, expected_hash)


def _make_token(user_id: str, role: str) -> str:
    payload = {"sub": user_id, "role": role, "exp": int(time.time()) + SESSION_TTL_SECONDS}
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(AUTH_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
    return body + "." + signature


async def init_auth_table() -> None:
    _require_config()
    async with _engine.begin() as conn:
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY,
                name VARCHAR(120) NOT NULL,
                email VARCHAR(320) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                password_salt TEXT NOT NULL,
                role VARCHAR(20) NOT NULL CHECK (role IN ('Developer', 'Admin')),
                status VARCHAR(20) NOT NULL DEFAULT 'Active',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))


def _send_otp_email(email: str, otp: str, purpose: str) -> None:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        print(f"[AuraTrace OTP - development delivery] {purpose} email={email} otp={otp}")
        return
    msg = EmailMessage()
    msg["Subject"] = "Your AuraTrace verification code"
    msg["From"] = SMTP_FROM
    msg["To"] = email
    msg.set_content(f"Your AuraTrace {purpose} verification code is {otp}. It expires in 5 minutes.")
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(msg)


async def _issue_otp(email: str, purpose: str) -> None:
    cooldown_key = f"auratrace:otp:cooldown:{purpose}:{email}"
    if await _redis.exists(cooldown_key):
        raise HTTPException(status_code=429, detail="Please wait before requesting another OTP.")
    otp = f"{secrets.randbelow(1_000_000):06d}"
    # Store only a digest so Redis never contains the plaintext code.
    digest = hmac.new(AUTH_SECRET.encode(), otp.encode(), hashlib.sha256).hexdigest()
    await _redis.setex(f"auratrace:otp:{purpose}:{email}", OTP_TTL_SECONDS, digest)
    await _redis.setex(cooldown_key, OTP_RESEND_SECONDS, "1")
    try:
        _send_otp_email(email, otp, purpose)
    except Exception as exc:
        await _redis.delete(f"auratrace:otp:{purpose}:{email}")
        raise HTTPException(status_code=502, detail="Unable to deliver verification email.") from exc


@router.post("/register")
async def register(payload: RegisterPayload):
    _require_config()
    if payload.role == "Admin" and payload.admin_registration_key != ADMIN_REGISTRATION_KEY:
        raise HTTPException(status_code=403, detail="Invalid admin registration key.")
    email = payload.email.strip().lower()
    password_hash, password_salt = _hash_password(payload.password)
    user_id = uuid.uuid4()
    async with _engine.begin() as conn:
        existing = await conn.execute(text("SELECT id FROM users WHERE email = :email"), {"email": email})
        if existing.first():
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        await conn.execute(text("""
            INSERT INTO users (id, name, email, password_hash, password_salt, role)
            VALUES (:id, :name, :email, :password_hash, :password_salt, :role)
        """), {"id": user_id, "name": payload.name.strip(), "email": email,
               "password_hash": password_hash, "password_salt": password_salt, "role": payload.role})
    await _issue_otp(email, "register")
    return {"otp_required": True, "message": "Verification code sent to your email.", "email": email, "purpose": "register"}


@router.post("/login")
async def login(payload: LoginPayload):
    _require_config()
    email = payload.email.strip().lower()
    async with _engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT password_hash, password_salt, status FROM users WHERE email = :email
        """), {"email": email})
        user = result.mappings().first()
    if not user or not _verify_password(payload.password, user["password_salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user["status"] != "Active":
        raise HTTPException(status_code=403, detail="This account is suspended.")
    await _issue_otp(email, "login")
    return {"otp_required": True, "message": "Verification code sent to your email.", "email": email, "purpose": "login"}


@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpPayload):
    _require_config()
    email = payload.email.strip().lower()
    key = f"auratrace:otp:{payload.purpose}:{email}"
    expected = await _redis.get(key)
    digest = hmac.new(AUTH_SECRET.encode(), payload.otp.encode(), hashlib.sha256).hexdigest()
    if not expected or not hmac.compare_digest(expected, digest):
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")
    await _redis.delete(key)
    async with _engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT id, name, email, role, status, created_at FROM users WHERE email = :email
        """), {"email": email})
        user = result.mappings().first()
    if not user or user["status"] != "Active":
        raise HTTPException(status_code=401, detail="Account is unavailable.")
    token = _make_token(str(user["id"]), user["role"])
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": str(user["id"]), "name": user["name"], "email": user["email"],
                     "role": user["role"], "status": user["status"],
                     "created_at": user["created_at"].date().isoformat()}}


@router.post("/resend-otp")
async def resend_otp(payload: VerifyOtpPayload):
    _require_config()
    await _issue_otp(payload.email.strip().lower(), payload.purpose)
    return {"message": "A new verification code was sent.", "email": payload.email.strip().lower(), "purpose": payload.purpose}

"""Trace account authentication with password + email OTP verification."""

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
from fastapi import APIRouter, HTTPException, status, Header, Depends
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

DATABASE_URL = os.getenv("DATABASE_URL")
REDIS_HOST = os.getenv("REDIS_HOST", "redis-broker")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))
AUTH_SECRET = os.getenv("AURA_AUTH_SECRET", "").strip()
ADMIN_REGISTRATION_KEY = os.getenv("AURA_ADMIN_REGISTRATION_KEY", "").strip()
SESSION_TTL_SECONDS = int(os.getenv("AURA_SESSION_TTL_SECONDS", "28800"))
OTP_TTL_SECONDS = int(os.getenv("AURA_OTP_TTL_SECONDS", "300"))
OTP_RESEND_SECONDS = int(os.getenv("AURA_OTP_RESEND_SECONDS", "30"))
OTP_MAX_ATTEMPTS = int(os.getenv("AURA_OTP_MAX_ATTEMPTS", "5"))
SMTP_HOST = os.getenv("SMTP_HOST", "")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "startuphub695@gmail.com").strip()

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
    purpose: str = Field(..., pattern="^(register|login|reset_password)$")


class ResendOtpPayload(BaseModel):
    email: str = Field(..., min_length=5, max_length=320)
    purpose: str = Field(..., pattern="^(register|login|reset_password)$")


class ForgotPasswordPayload(BaseModel):
    email: str = Field(..., min_length=5, max_length=320)


class ResetPasswordPayload(BaseModel):
    email: str = Field(..., min_length=5, max_length=320)
    otp: str = Field(..., pattern=r"^\d{6}$")
    new_password: str = Field(..., min_length=8, max_length=128)


class UpdateProfilePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)


class ChangePasswordPayload(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8, max_length=128)



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


def _decode_token(token: str) -> dict:
    try:
        body, signature = token.split(".", 1)
        expected = hmac.new(AUTH_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError("invalid signature")
        padded = body + "=" * (-len(body) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()))
        if int(payload.get("exp", 0)) < int(time.time()):
            raise ValueError("expired")
        if not payload.get("sub") or payload.get("role") not in {"Developer", "Admin"}:
            raise ValueError("invalid claims")
        return payload
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired access token.") from exc


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    _require_config()
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Bearer access token required.")
    payload = _decode_token(authorization.split(" ", 1)[1].strip())
    async with _engine.connect() as conn:
        result = await conn.execute(text("SELECT id, name, email, role, status FROM users WHERE id = :id"), {"id": payload["sub"]})
        user = result.mappings().first()
    if not user or user["status"] != "Active" or user["role"] != payload["role"]:
        raise HTTPException(status_code=401, detail="Account is unavailable.")
    return dict(user)


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user["role"] != "Admin":
        raise HTTPException(status_code=403, detail="Admin role required.")
    return user


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
    print(f"[Trace OTP Email] Sending {purpose.upper()} code {otp} to {email}")
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        print(f"[Trace OTP Email] SMTP not configured. OTP logged to console: {otp}")
        return

    msg = EmailMessage()
    subject_purpose = (
        "Account Registration"
        if purpose == "register"
        else "Password Reset"
        if purpose == "reset_password"
        else "Security Verification"
    )
    msg["Subject"] = f"Automatic Backend Diagnostics - {subject_purpose} Code: {otp}"
    msg["From"] = SMTP_FROM or f"Automatic Backend Diagnostics Security <{SMTP_USER}>"
    msg["To"] = email

    readable_purpose = (
        "account registration"
        if purpose == "register"
        else "password recovery"
        if purpose == "reset_password"
        else "verification"
    )

    text_content = (
        f"Your verification code is {otp}.\n\n"
        f"This code was requested for {readable_purpose}. It will expire in 5 minutes.\n"
        f"If you did not request this code, please ignore this email."
    )

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #080c14; color: #f1f5f9; padding: 24px; margin: 0; }}
        .card {{ max-width: 480px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; text-align: center; }}
        .brand {{ font-size: 20px; font-weight: 800; color: #38bdf8; margin-bottom: 8px; letter-spacing: -0.5px; }}
        .subtitle {{ font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 20px; }}
        .title {{ font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 8px; }}
        .desc {{ font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }}
        .code-box {{ background: #020617; border: 1px solid #334155; border-radius: 12px; padding: 18px 28px; display: inline-block; margin-bottom: 24px; }}
        .code {{ font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #38bdf8; font-family: 'Courier New', monospace; }}
        .footer {{ font-size: 11px; color: #64748b; margin-top: 24px; border-top: 1px solid #1e293b; padding-top: 16px; }}
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">✦ Automatic Backend Diagnostics Platform</div>
        <div class="subtitle">Autonomous AI Observability</div>
        <div class="title">Email Verification Code</div>
        <p class="desc">Please use the 6-digit verification code below to complete your {readable_purpose}.</p>
        <div class="code-box">
          <div class="code">{otp}</div>
        </div>
        <p class="desc" style="font-size: 12px; margin-bottom: 0;">This code is valid for <strong>5 minutes</strong>. If you did not make this request, you can safely ignore this message.</p>
        <div class="footer">
          Automatic Backend Diagnostics Platform · Security Notification
        </div>
      </div>
    </body>
    </html>
    """

    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype="html")

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
        smtp.starttls()
        smtp.login(SMTP_USER, SMTP_PASSWORD)
        smtp.send_message(msg)
    print(f"[Trace OTP Email] Dispatched email successfully to {email}")



async def _issue_otp(email: str, purpose: str) -> tuple[str, bool]:
    email = email.strip().lower()
    cooldown_key = f"auratrace:otp:cooldown:{purpose}:{email}"
    if await _redis.exists(cooldown_key):
        raise HTTPException(status_code=429, detail="Please wait before requesting another OTP.")
    otp = f"{secrets.randbelow(1_000_000):06d}"
    digest = hmac.new(AUTH_SECRET.encode(), otp.encode(), hashlib.sha256).hexdigest()
    otp_key = f"auratrace:otp:{purpose}:{email}"
    attempts_key = f"auratrace:otp:attempts:{purpose}:{email}"
    await _redis.setex(otp_key, OTP_TTL_SECONDS, digest)
    await _redis.setex(attempts_key, OTP_TTL_SECONDS, "0")
    await _redis.setex(cooldown_key, OTP_RESEND_SECONDS, "1")
    email_delivered = True
    try:
        _send_otp_email(email, otp, purpose)
    except Exception as exc:
        email_delivered = False
        print(f"[Trace SMTP Delivery Error] {exc}")
        print("=" * 60)
        print(f" [Trace Verification Code] {purpose.upper()} for {email}: {otp}")
        print("=" * 60)
    return otp, email_delivered


@router.post("/register")
async def register(payload: RegisterPayload):
    _require_config()
    if payload.role == "Admin":
        if not ADMIN_REGISTRATION_KEY:
            raise HTTPException(status_code=503, detail="Admin registration is not configured.")
        if not hmac.compare_digest(payload.admin_registration_key or "", ADMIN_REGISTRATION_KEY):
            raise HTTPException(status_code=403, detail="Invalid admin registration key.")
    email = payload.email.strip().lower()
    password_hash, password_salt = _hash_password(payload.password)
    user_id = uuid.uuid4()
    async with _engine.begin() as conn:
        existing = await conn.execute(text("SELECT id, status FROM users WHERE email = :email"), {"email": email})
        existing_user = existing.mappings().first()
        if existing_user:
            raise HTTPException(status_code=409, detail="An account with this email already exists.")
        await conn.execute(text("""
            INSERT INTO users (id, name, email, password_hash, password_salt, role, status)
            VALUES (:id, :name, :email, :password_hash, :password_salt, :role, 'Pending')
        """), {"id": user_id, "name": payload.name.strip(), "email": email,
               "password_hash": password_hash, "password_salt": password_salt, "role": payload.role})
    try:
        otp, delivered = await _issue_otp(email, "register")
    except Exception:
        async with _engine.begin() as conn:
            await conn.execute(text("DELETE FROM users WHERE id = :id AND status = 'Pending'"), {"id": user_id})
        raise
    msg = (
        "A 6-digit verification code has been sent to your email. Please check your inbox."
        if delivered
        else "Verification code generated. (Email delivery notice: Check server logs for OTP or verify Gmail App Password in .env)"
    )
    return {
        "otp_required": True,
        "message": msg,
        "email": email,
        "purpose": "register"
    }


@router.post("/login")
async def login(payload: LoginPayload):
    _require_config()
    email = payload.email.strip().lower()
    async with _engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT id, name, role, password_hash, password_salt, status, created_at FROM users WHERE email = :email
        """), {"email": email})
        user = result.mappings().first()
    if not user or not _verify_password(payload.password, user["password_salt"], user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    if user["status"] == "Pending":
        otp, delivered = await _issue_otp(email, "register")
        msg = (
            "A verification code has been sent to activate your account. Please check your inbox."
            if delivered
            else "Verification code generated. (Check server logs for code: docker logs auratrace-ingestion)"
        )
        return {
            "otp_required": True,
            "message": msg,
            "email": email,
            "purpose": "register"
        }
    if user["status"] != "Active":
        raise HTTPException(status_code=403, detail="This account is suspended.")

    # Direct password login without OTP for active users
    token = _make_token(str(user["id"]), user["role"])
    created_at = user["created_at"]
    created_date = created_at.date().isoformat() if isinstance(created_at, datetime) else str(created_at)[:10]
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user["id"]),
            "name": user["name"],
            "email": email,
            "role": user["role"],
            "status": user["status"],
            "created_at": created_date
        }
    }


@router.post("/forgot-password")
async def forgot_password(payload: ForgotPasswordPayload):
    _require_config()
    email = payload.email.strip().lower()
    async with _engine.begin() as conn:
        result = await conn.execute(text("SELECT id, status FROM users WHERE email = :email"), {"email": email})
        user = result.mappings().first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered.")
    if user["status"] != "Active":
        raise HTTPException(status_code=403, detail="This account is unavailable or pending activation.")
    otp, delivered = await _issue_otp(email, "reset_password")
    msg = (
        "A 6-digit password reset code has been sent to your email. Please check your inbox."
        if delivered
        else "Password reset code generated. (Check server logs for code: docker logs auratrace-ingestion)"
    )
    return {
        "otp_required": True,
        "message": msg,
        "email": email,
        "purpose": "reset_password"
    }


@router.post("/reset-password")
async def reset_password(payload: ResetPasswordPayload):
    _require_config()
    email = payload.email.strip().lower()
    key = f"auratrace:otp:reset_password:{email}"
    attempts_key = f"auratrace:otp:attempts:reset_password:{email}"
    expected = await _redis.get(key)
    if not expected:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")
    attempts = int(await _redis.get(attempts_key) or "0")
    if attempts >= OTP_MAX_ATTEMPTS:
        await _redis.delete(key, attempts_key)
        raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Request a new code.")
    digest = hmac.new(AUTH_SECRET.encode(), payload.otp.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, digest):
        attempts = await _redis.incr(attempts_key)
        if attempts >= OTP_MAX_ATTEMPTS:
            await _redis.delete(key, attempts_key)
            raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Request a new code.")
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")
    await _redis.delete(key, attempts_key)

    new_hash, new_salt = _hash_password(payload.new_password)
    async with _engine.begin() as conn:
        result = await conn.execute(text("""
            UPDATE users SET password_hash = :hash, password_salt = :salt WHERE email = :email
            RETURNING id, name, role, status
        """), {"hash": new_hash, "salt": new_salt, "email": email})
        user = result.mappings().first()
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered.")
    return {
        "success": True,
        "message": "Password reset successfully. You can now log in with your new password."
    }



@router.post("/verify-otp")
async def verify_otp(payload: VerifyOtpPayload):
    _require_config()
    email = payload.email.strip().lower()
    key = f"auratrace:otp:{payload.purpose}:{email}"
    attempts_key = f"auratrace:otp:attempts:{payload.purpose}:{email}"
    expected = await _redis.get(key)
    if not expected:
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")
    attempts = int(await _redis.get(attempts_key) or "0")
    if attempts >= OTP_MAX_ATTEMPTS:
        await _redis.delete(key, attempts_key)
        raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Request a new code.")
    digest = hmac.new(AUTH_SECRET.encode(), payload.otp.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, digest):
        attempts = await _redis.incr(attempts_key)
        if attempts >= OTP_MAX_ATTEMPTS:
            await _redis.delete(key, attempts_key)
            raise HTTPException(status_code=429, detail="Too many incorrect OTP attempts. Request a new code.")
        raise HTTPException(status_code=401, detail="Invalid or expired OTP.")
    await _redis.delete(key, attempts_key)
    async with _engine.begin() as conn:
        result = await conn.execute(text("""
            SELECT id, name, email, role, status, created_at FROM users WHERE email = :email
        """), {"email": email})
        user = result.mappings().first()
        if not user:
            raise HTTPException(status_code=401, detail="Account is unavailable.")
        if payload.purpose == "register" and user["status"] == "Pending":
            await conn.execute(text("UPDATE users SET status = 'Active' WHERE id = :id"), {"id": user["id"]})
            user = dict(user)
            user["status"] = "Active"
    if user["status"] != "Active":
        raise HTTPException(status_code=401, detail="Account is unavailable.")
    token = _make_token(str(user["id"]), user["role"])
    created_at = user["created_at"]
    created_date = created_at.date().isoformat() if isinstance(created_at, datetime) else str(created_at)[:10]
    return {"access_token": token, "token_type": "bearer",
            "user": {"id": str(user["id"]), "name": user["name"], "email": user["email"],
                     "role": user["role"], "status": user["status"], "created_at": created_date}}


@router.get("/users")
async def list_users(_: dict = Depends(require_admin)):
    _require_config()
    async with _engine.connect() as conn:
        result = await conn.execute(text("""
            SELECT id, name, email, role, status, created_at
            FROM users ORDER BY created_at DESC
        """))
        rows = result.mappings().all()
    return [{"id": str(row["id"]), "name": row["name"], "email": row["email"],
             "role": row["role"], "status": row["status"],
             "created_at": row["created_at"].date().isoformat() if isinstance(row["created_at"], datetime) else str(row["created_at"])[:10]}
            for row in rows]

@router.patch("/users/{user_id}/status")
async def update_user_status(user_id: str, payload: dict, admin: dict = Depends(require_admin)):
    _require_config()
    new_status = payload.get("status")
    if new_status not in {"Active", "Suspended"}:
        raise HTTPException(status_code=400, detail="Status must be Active or Suspended.")
    if user_id == str(admin["id"]) and new_status == "Suspended":
        raise HTTPException(status_code=400, detail="An administrator cannot suspend their own account.")
    async with _engine.begin() as conn:
        result = await conn.execute(text("""
            UPDATE users SET status = :status WHERE id = :id
            RETURNING id, name, email, role, status, created_at
        """), {"status": new_status, "id": user_id})
        row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"id": str(row["id"]), "name": row["name"], "email": row["email"],
            "role": row["role"], "status": row["status"],
            "created_at": row["created_at"].date().isoformat() if isinstance(row["created_at"], datetime) else str(row["created_at"])[:10]}

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    _require_config()
    if user_id == str(admin["id"]):
        raise HTTPException(status_code=400, detail="An administrator cannot delete their own account.")
    async with _engine.begin() as conn:
        result = await conn.execute(text("DELETE FROM users WHERE id = :id RETURNING id, name, email"), {"id": user_id})
        deleted = result.mappings().first()
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found.")
    return {
        "success": True,
        "message": f"User {deleted['name']} ({deleted['email']}) has been permanently deleted.",
        "id": str(deleted["id"])
    }


@router.get("/users/{user_id}")
async def get_user_detail(user_id: str, _: dict = Depends(require_admin)):
    _require_config()
    async with _engine.connect() as conn:
        result = await conn.execute(text("""
            SELECT id, name, email, role, status, created_at
            FROM users WHERE id = :id
        """), {"id": user_id})
        row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")
    created_at = row["created_at"]
    return {
        "id": str(row["id"]),
        "name": row["name"],
        "email": row["email"],
        "role": row["role"],
        "status": row["status"],
        "created_at": created_at.date().isoformat() if isinstance(created_at, datetime) else str(created_at)[:10]
    }


@router.patch("/profile")
async def update_profile(payload: UpdateProfilePayload, user: dict = Depends(get_current_user)):
    _require_config()
    clean_name = payload.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    async with _engine.begin() as conn:
        result = await conn.execute(text("""
            UPDATE users SET name = :name WHERE id = :id
            RETURNING id, name, email, role, status, created_at
        """), {"name": clean_name, "id": user["id"]})
        row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="User not found.")
    created_at = row["created_at"]
    return {
        "user": {
            "id": str(row["id"]),
            "name": row["name"],
            "email": row["email"],
            "role": row["role"],
            "status": row["status"],
            "created_at": created_at.date().isoformat() if isinstance(created_at, datetime) else str(created_at)[:10]
        },
        "message": "Profile details updated successfully."
    }


@router.post("/change-password")
async def change_password(payload: ChangePasswordPayload, user: dict = Depends(get_current_user)):
    _require_config()
    async with _engine.begin() as conn:
        result = await conn.execute(text("SELECT password_hash, password_salt FROM users WHERE id = :id"), {"id": user["id"]})
        db_user = result.mappings().first()
        if not db_user or not _verify_password(payload.current_password, db_user["password_salt"], db_user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password does not match.")
        new_hash, new_salt = _hash_password(payload.new_password)
        await conn.execute(text("""
            UPDATE users SET password_hash = :hash, password_salt = :salt WHERE id = :id
        """), {"hash": new_hash, "salt": new_salt, "id": user["id"]})
    return {"success": True, "message": "Password changed successfully."}


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    async with _engine.connect() as conn:
        result = await conn.execute(text("SELECT id, name, email, role, status, created_at FROM users WHERE id = :id"), {"id": user["id"]})
        row = result.mappings().first()
    if not row or row["status"] != "Active":
        raise HTTPException(status_code=401, detail="Account is unavailable.")
    created_at = row["created_at"]
    return {
        "user": {
            "id": str(row["id"]),
            "name": row["name"],
            "email": row["email"],
            "role": row["role"],
            "status": row["status"],
            "created_at": created_at.date().isoformat() if isinstance(created_at, datetime) else str(created_at)[:10]
        }
    }


@router.post("/resend-otp")
async def resend_otp(payload: ResendOtpPayload):
    _require_config()
    email = payload.email.strip().lower()
    if payload.purpose == "register":
        async with _engine.begin() as conn:
            result = await conn.execute(text("SELECT status FROM users WHERE email = :email"), {"email": email})
            user = result.mappings().first()
        if not user or user["status"] != "Pending":
            raise HTTPException(status_code=400, detail="No pending registration requires verification.")
    elif payload.purpose == "reset_password":
        async with _engine.begin() as conn:
            result = await conn.execute(text("SELECT status FROM users WHERE email = :email"), {"email": email})
            user = result.mappings().first()
        if not user:
            raise HTTPException(status_code=404, detail="Email not registered.")
        if user["status"] != "Active":
            raise HTTPException(status_code=400, detail="No active account is available for password reset.")
    else:
        async with _engine.begin() as conn:
            result = await conn.execute(text("SELECT status FROM users WHERE email = :email"), {"email": email})
            user = result.mappings().first()
        if not user or user["status"] != "Active":
            raise HTTPException(status_code=400, detail="No active account is available for verification.")
    otp, delivered = await _issue_otp(email, payload.purpose)
    msg = (
        "A new verification code has been sent to your email. Please check your inbox."
        if delivered
        else "A new verification code was generated. (Check server logs for code: docker logs auratrace-ingestion)"
    )
    return {
        "message": msg,
        "email": email,
        "purpose": payload.purpose
    }


class ContactInquiryPayload(BaseModel):
    name: str = Field(default="", max_length=120)
    email: str = Field(..., min_length=5, max_length=320)
    phone: str = Field(default="", max_length=50)
    comment: str = Field(..., min_length=1, max_length=4000)


def _send_contact_email(name: str, user_email: str, phone: str, comment: str) -> bool:
    target_admin = ADMIN_EMAIL or "startuphub695@gmail.com"
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASSWORD:
        print(f"[Trace Contact Ingestion] SMTP not configured. Inquiry for {target_admin} from {user_email}: {comment}")
        return False

    msg = EmailMessage()
    msg["Subject"] = f"[Automatic Backend Detection Inquiry] New message from {name or user_email}"
    msg["From"] = SMTP_FROM or f"Automatic Backend Detection <{SMTP_USER}>"
    msg["To"] = target_admin
    msg["Reply-To"] = user_email

    text_content = f"""
New Contact Inquiry Received via Automatic Backend Detection Portal:

Sender Name: {name or 'N/A'}
Sender Email: {user_email}
Phone: {phone or 'N/A'}
Timestamp: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

Message:
--------------------------------------------------
{comment}
--------------------------------------------------
"""

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; padding: 24px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
        <div style="display: flex; align-items: center; margin-bottom: 20px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 20px;">Automatic Backend Detection</h2>
        </div>
        <div style="padding: 12px 16px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px; margin-bottom: 24px;">
          <strong style="color: #991b1b; font-size: 14px;">New Contact Message Received</strong>
        </div>
        <table style="width: 100%; font-size: 14px; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="font-weight: 600; color: #64748b; padding: 8px 0; width: 120px;">Sender Name:</td>
            <td style="color: #0f172a; font-weight: 600;">{name or 'N/A'}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b; padding: 8px 0;">Sender Email:</td>
            <td style="color: #dc2626; font-weight: 600;"><a href="mailto:{user_email}" style="color: #dc2626; text-decoration: none;">{user_email}</a></td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b; padding: 8px 0;">Phone:</td>
            <td style="color: #0f172a;">{phone or 'N/A'}</td>
          </tr>
          <tr>
            <td style="font-weight: 600; color: #64748b; padding: 8px 0;">Time (UTC):</td>
            <td style="color: #64748b;">{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
          </tr>
        </table>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px;">
          <span style="display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 8px;">Message Content</span>
          <p style="margin: 0; white-space: pre-wrap; color: #334155; font-size: 14px; line-height: 1.6;">{comment}</p>
        </div>
        <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px;">
          Direct communication routed to administrator inbox ({target_admin}).
        </div>
      </div>
    </body>
    </html>
    """

    msg.set_content(text_content)
    msg.add_alternative(html_content, subtype="html")

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(SMTP_USER, SMTP_PASSWORD)
            smtp.send_message(msg)
        print(f"[Trace Contact Email] Dispatched contact message to admin ({target_admin}) from {user_email}")
        return True
    except Exception as exc:
        print(f"[Trace Contact SMTP Delivery Error] {exc}")
        return False


@router.post("/contact")
async def handle_contact_inquiry(payload: ContactInquiryPayload):
    inquiry_id = f"INQ-{uuid.uuid4().hex[:8].upper()}"
    user_email = payload.email.strip().lower()
    
    _send_contact_email(
        name=payload.name.strip(),
        user_email=user_email,
        phone=(payload.phone or "").strip(),
        comment=payload.comment.strip()
    )

    return {
        "success": True,
        "inquiry_id": inquiry_id,
        "message": "Your message has been submitted directly to the administrative team."
    }





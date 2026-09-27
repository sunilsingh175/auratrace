"""
JWT authentication for admin endpoints and dashboard sessions.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

try:
    from jose import JWTError, jwt
except ImportError:
    try:
        import jwt
        class JWTError(Exception):
            pass
    except ImportError:
        jwt = None
        class JWTError(Exception):
            pass

try:
    from passlib.context import CryptContext
    _pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
except ImportError:
    _pwd = None

try:
    import bcrypt
except ImportError:
    bcrypt = None

JWT_SECRET = os.getenv("JWT_SECRET", os.getenv("AURA_AUTH_SECRET", "change-me-in-production-auratrace-2026"))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

_bearer = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    if _pwd is not None:
        try:
            return _pwd.hash(password)
        except Exception:
            pass
    if bcrypt is not None:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
    import hashlib
    return "sha256$" + hashlib.sha256((password + JWT_SECRET).encode("utf-8")).hexdigest()


def verify_password(password: str, password_hash: str) -> bool:
    if _pwd is not None:
        try:
            return _pwd.verify(password, password_hash)
        except Exception:
            pass
    if bcrypt is not None and password_hash.startswith("$2"):
        try:
            return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
        except Exception:
            pass
    if password_hash.startswith("sha256$"):
        import hashlib
        return password_hash == ("sha256$" + hashlib.sha256((password + JWT_SECRET).encode("utf-8")).hexdigest())
    return False


def create_access_token(user_id: str, email: str, role: str = "user") -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "email": email,
        "role": role,
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    if jwt:
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    import base64, json, hmac, hashlib
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).rstrip(b'=').decode()
    claims = base64.urlsafe_b64encode(json.dumps({"sub": str(user_id), "email": email, "role": role, "exp": int((now + timedelta(hours=24)).timestamp())}).encode()).rstrip(b'=').decode()
    signature = base64.urlsafe_b64encode(hmac.new(JWT_SECRET.encode(), f"{header}.{claims}".encode(), hashlib.sha256).digest()).rstrip(b'=').decode()
    return f"{header}.{claims}.{signature}"


def decode_token(token: str) -> dict:
    if jwt:
        try:
            return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired JWT token: {e}",
            )
    try:
        import base64, json
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token")
        payload_data = parts[1] + "=" * ((4 - len(parts[1]) % 4) % 4)
        return json.loads(base64.urlsafe_b64decode(payload_data.encode()).decode())
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {e}",
        )


async def current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
) -> dict:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
        )
    return decode_token(credentials.credentials)


async def require_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required",
        )
    return user

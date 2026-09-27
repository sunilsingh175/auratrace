"""
API key generation/verification + Fernet token encryption.
"""
import base64
import hashlib
import logging
import secrets
from typing import Tuple

from passlib.context import CryptContext
from cryptography.fernet import Fernet
from shared.config import get_settings

settings = get_settings()
log = logging.getLogger("shared.security")
_pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── API Keys ─────────────────────────────────────────────

def generate_api_key() -> Tuple[str, str, str]:
    """
    Generate a new API key (pure random 32-character hex string).
    Returns: (full_key, prefix, hash)
    """
    full_key = secrets.token_hex(16)  # 32 hex chars
    prefix = full_key[:8]              # first 8 chars for fast indexed lookup
    key_hash = hashlib.sha256(full_key.encode("utf-8")).hexdigest()
    return full_key, prefix, key_hash


def verify_api_key(api_key: str, key_hash: str) -> bool:
    """Verify a raw API key against its stored hash (SHA-256, direct, or bcrypt)."""
    if not api_key or not key_hash:
        return False
    try:
        # Direct string or SHA-256 hash match
        if api_key == key_hash:
            return True
        sha_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()
        if sha_hash == key_hash:
            return True
        # Check bcrypt hash fallback
        if key_hash.startswith(("$2a$", "$2b$", "$2y$")):
            try:
                return _pwd.verify(api_key[:72], key_hash)
            except Exception:
                pass
        return False
    except Exception as e:
        log.warning(f"Error verifying API key: {e}")
        return False


# ── Token Encryption (for GitHub tokens etc.) ────────────

def _get_fernet_key() -> bytes:
    if settings.ENCRYPTION_KEY:
        try:
            # Ensure it is valid base64 32-bytes
            raw = settings.ENCRYPTION_KEY.strip()
            if len(raw) == 44:
                return raw.encode()
        except Exception:
            pass
    secret = settings.AURA_AUTH_SECRET or "aura_secret_key_2026_super_secure_entropy"
    key_digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(key_digest)


def encrypt_token(plaintext: str) -> str:
    """Encrypt a sensitive token for storage."""
    if not plaintext:
        return ""
    try:
        f = Fernet(_get_fernet_key())
        return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")
    except Exception as e:
        log.warning(f"Fernet encryption error, falling back to base64: {e}")
        return "b64:" + base64.b64encode(plaintext.encode("utf-8")).decode("utf-8")


def decrypt_token(ciphertext: str) -> str:
    """Decrypt a stored token."""
    if not ciphertext:
        return ""
    if ciphertext.startswith("b64:"):
        return base64.b64decode(ciphertext[4:].encode("utf-8")).decode("utf-8")
    try:
        f = Fernet(_get_fernet_key())
        return f.decrypt(ciphertext.encode("utf-8")).decode("utf-8")
    except Exception as e:
        log.warning(f"Fernet decryption error, returning raw: {e}")
        return ciphertext

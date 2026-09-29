"""
Cryptographic module for AuraTrace L3 Automated Repair Engine.
Handles secure token encryption and decryption at rest using AES-256 Fernet.
"""

from __future__ import annotations

import base64
import logging
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken

logger = logging.getLogger("auratrace.repair.crypto")


def get_encryption_key() -> bytes:
    """
    Retrieve and validate the master encryption key from AURATRACE_REPAIR_ENCRYPTION_KEY.
    Falls back to AURA_AUTH_SECRET (derived) if not explicitly set.
    """
    raw_key = os.getenv("AURATRACE_REPAIR_ENCRYPTION_KEY", "").strip()
    if raw_key:
        try:
            # Ensure valid 32-byte url-safe base64 key
            key_bytes = raw_key.encode("utf-8")
            # Verify by attempting to instantiate Fernet
            Fernet(key_bytes)
            return key_bytes
        except Exception as exc:
            logger.warning(f"Invalid AURATRACE_REPAIR_ENCRYPTION_KEY provided: {exc}. Generating derived fallback.")

    # Fallback key derivation from AURA_AUTH_SECRET or default secret
    secret = os.getenv("AURA_AUTH_SECRET", "auratrace_default_repair_key_32bytes_fallback").strip()
    import hashlib
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def generate_encryption_key() -> str:
    """Generate a new high-entropy 32-byte url-safe base64 encryption key."""
    return Fernet.generate_key().decode("utf-8")


def encrypt_secret(plaintext: str, key: Optional[str | bytes] = None) -> str:
    """
    Encrypt a plaintext secret (e.g. GitHub Personal Access Token).
    Returns a url-safe ciphertext string.
    """
    if not plaintext:
        return ""
    key_bytes = key.encode("utf-8") if isinstance(key, str) else (key or get_encryption_key())
    fernet = Fernet(key_bytes)
    encrypted_bytes = fernet.encrypt(plaintext.encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_secret(ciphertext: str, key: Optional[str | bytes] = None) -> str:
    """
    Decrypt a ciphertext secret into plaintext.
    Returns the original plaintext or raises ValueError on invalid token.
    """
    if not ciphertext:
        return ""
    key_bytes = key.encode("utf-8") if isinstance(key, str) else (key or get_encryption_key())
    fernet = Fernet(key_bytes)
    try:
        decrypted_bytes = fernet.decrypt(ciphertext.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except (InvalidToken, Exception) as exc:
        logger.error(f"Failed to decrypt secret: {exc}")
        raise ValueError("Decryption failed. The secret could not be decrypted with current key.") from exc


def mask_token(token: Optional[str]) -> str:
    """Mask a token for safe UI/API display (e.g., 'ghp_****a1b2')."""
    if not token:
        return ""
    token = token.strip()
    if len(token) <= 8:
        return "********"
    prefix = token[:4]
    suffix = token[-4:]
    return f"{prefix}****{suffix}"

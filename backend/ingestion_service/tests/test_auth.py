import hashlib
import hmac
import time
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from backend.ingestion_service import auth


class FakeRedis:
    def __init__(self):
        self.data = {}
        self.expirations = {}
        self.increments = {}

    async def get(self, key):
        expiry = self.expirations.get(key)
        if expiry is not None and expiry <= time.time():
            self.data.pop(key, None)
            return None
        return self.data.get(key)

    async def setex(self, key, ttl, value):
        self.data[key] = value
        self.expirations[key] = time.time() + ttl

    async def exists(self, key):
        return 1 if await self.get(key) is not None else 0

    async def incr(self, key):
        value = int(self.data.get(key, "0")) + 1
        self.data[key] = str(value)
        return value

    async def delete(self, *keys):
        for key in keys:
            self.data.pop(key, None)
            self.expirations.pop(key, None)
            self.increments.pop(key, None)


class FakeResult:
    def __init__(self, row=None):
        self.row = row

    def mappings(self):
        return self

    def first(self):
        return self.row


class FakeConn:
    def __init__(self, user):
        self.user = user
        self.updated_status = None

    async def execute(self, statement, params=None):
        sql = str(statement)
        if "SELECT id, name, email, role, status, created_at" in sql:
            return FakeResult(self.user)
        if "UPDATE users SET status = 'Active'" in sql:
            if self.user:
                self.user = dict(self.user)
                self.user["status"] = "Active"
            return FakeResult()
        return FakeResult(self.user)


class FakeConnectContext:
    def __init__(self, conn):
        self.conn = conn

    async def __aenter__(self):
        return self.conn

    async def __aexit__(self, *args):
        return False


class FakeEngine:
    def __init__(self, conn):
        self.conn = conn

    def connect(self):
        return FakeConnectContext(self.conn)


def otp_digest(otp):
    return hmac.new(auth.AUTH_SECRET.encode(), otp.encode(), hashlib.sha256).hexdigest()


@pytest.fixture(autouse=True)
def auth_config(monkeypatch):
    monkeypatch.setattr(auth, "AUTH_SECRET", "test-auth-secret")
    monkeypatch.setattr(auth, "DATABASE_URL", "postgresql+asyncpg://test")
    monkeypatch.setattr(auth, "OTP_MAX_ATTEMPTS", 5)


@pytest.mark.asyncio
async def test_registration_otp_activates_pending_user(monkeypatch):
    redis = FakeRedis()
    monkeypatch.setattr(auth, "_redis", redis)

    user = {
        "id": uuid.uuid4(),
        "name": "Developer",
        "email": "dev@example.com",
        "role": "Developer",
        "status": "Pending",
        "created_at": None,
    }
    conn = FakeConn(user)
    monkeypatch.setattr(auth, "_engine", FakeEngine(conn))

    await redis.setex("auratrace:otp:register:dev@example.com", 300, otp_digest("123456"))
    await redis.setex("auratrace:otp:attempts:register:dev@example.com", 300, "0")

    result = await auth.verify_otp(
        auth.VerifyOtpPayload(
            email="DEV@EXAMPLE.COM", otp="123456", purpose="register"
        )
    )

    assert result["access_token"]
    assert result["user"]["status"] == "Active"
    assert conn.user["status"] == "Active"


@pytest.mark.asyncio
async def test_login_requires_otp_for_active_user(monkeypatch):
    issued = []

    async def fake_issue_otp(email, purpose):
        issued.append((email, purpose))

    async def fake_connect():
        return None

    user = {
        "password_hash": auth._hash_password("correct-password")[0],
        "password_salt": auth._hash_password("correct-password")[1],
        "status": "Active",
    }

    class LoginConn(FakeConn):
        async def execute(self, statement, params=None):
            return FakeResult(user)

    class LoginEngine:
        def begin(self):
            return FakeConnectContext(LoginConn(user))

    monkeypatch.setattr(auth, "_engine", LoginEngine())
    monkeypatch.setattr(auth, "_issue_otp", fake_issue_otp)

    result = await auth.login(
        auth.LoginPayload(email="dev@example.com", password="correct-password")
    )

    assert result["otp_required"] is True
    assert result["purpose"] == "login"
    assert issued == [("dev@example.com", "login")]


@pytest.mark.asyncio
async def test_expired_otp_is_rejected(monkeypatch):
    redis = FakeRedis()
    monkeypatch.setattr(auth, "_redis", redis)

    key = "auratrace:otp:login:dev@example.com"
    await redis.setex(key, -1, otp_digest("123456"))

    with pytest.raises(HTTPException) as exc:
        await auth.verify_otp(
            auth.VerifyOtpPayload(
                email="dev@example.com", otp="123456", purpose="login"
            )
        )

    assert exc.value.status_code == 401
    assert "expired" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_wrong_otp_is_rejected_and_fifth_attempt_locks_code(monkeypatch):
    redis = FakeRedis()
    monkeypatch.setattr(auth, "_redis", redis)

    key = "auratrace:otp:login:dev@example.com"
    attempts_key = "auratrace:otp:attempts:login:dev@example.com"
    await redis.setex(key, 300, otp_digest("123456"))
    await redis.setex(attempts_key, 300, "0")

    for attempt in range(1, 5):
        with pytest.raises(HTTPException) as exc:
            await auth.verify_otp(
                auth.VerifyOtpPayload(
                    email="dev@example.com", otp="000000", purpose="login"
                )
            )
        assert exc.value.status_code == 401
        assert await redis.get(attempts_key) == str(attempt)

    with pytest.raises(HTTPException) as exc:
        await auth.verify_otp(
            auth.VerifyOtpPayload(
                email="dev@example.com", otp="000000", purpose="login"
            )
        )

    assert exc.value.status_code == 429
    assert await redis.get(key) is None
    assert await redis.get(attempts_key) is None


@pytest.mark.asyncio
async def test_suspended_user_cannot_login(monkeypatch):
    password_hash, password_salt = auth._hash_password("correct-password")
    user = {
        "password_hash": password_hash,
        "password_salt": password_salt,
        "status": "Suspended",
    }

    class LoginConn:
        async def execute(self, statement, params=None):
            return FakeResult(user)

    class LoginEngine:
        def begin(self):
            return FakeConnectContext(LoginConn())

    async def unexpected_otp(*args):
        raise AssertionError("Suspended users must not receive an OTP")

    monkeypatch.setattr(auth, "_engine", LoginEngine())
    monkeypatch.setattr(auth, "_issue_otp", unexpected_otp)

    with pytest.raises(HTTPException) as exc:
        await auth.login(
            auth.LoginPayload(
                email="dev@example.com", password="correct-password"
            )
        )

    assert exc.value.status_code == 403
    assert "suspended" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_developer_is_forbidden_from_admin_dependency():
    with pytest.raises(HTTPException) as exc:
        await auth.require_admin(
            {"id": uuid.uuid4(), "role": "Developer", "status": "Active"}
        )

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_admin_passes_admin_dependency():
    admin = {"id": uuid.uuid4(), "role": "Admin", "status": "Active"}
    assert await auth.require_admin(admin) == admin


def test_expired_token_is_rejected(monkeypatch):
    monkeypatch.setattr(auth, "AUTH_SECRET", "test-auth-secret")
    token = auth._make_token(str(uuid.uuid4()), "Developer")

    monkeypatch.setattr(time, "time", lambda: time.time() + 10**6)

    with pytest.raises(HTTPException) as exc:
        auth._decode_token(token)

    assert exc.value.status_code == 401


def test_resend_payload_does_not_require_otp():
    payload = auth.ResendOtpPayload(
        email="dev@example.com",
        purpose="login",
    )
    assert payload.email == "dev@example.com"
    assert payload.purpose == "login"

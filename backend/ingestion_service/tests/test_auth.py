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

    def begin(self):
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

    await redis.setex("trace:otp:register:dev@example.com", 300, otp_digest("123456"))
    await redis.setex("trace:otp:attempts:register:dev@example.com", 300, "0")

    result = await auth.verify_otp(
        auth.VerifyOtpPayload(
            email="DEV@EXAMPLE.COM", otp="123456", purpose="register"
        )
    )

    assert result["access_token"]
    assert result["user"]["status"] == "Active"
    assert conn.user["status"] == "Active"


@pytest.mark.asyncio
async def test_login_direct_for_active_user(monkeypatch):
    password_hash, password_salt = auth._hash_password("correct-password")
    user = {
        "id": uuid.uuid4(),
        "name": "Dev User",
        "email": "dev@example.com",
        "role": "Developer",
        "password_hash": password_hash,
        "password_salt": password_salt,
        "status": "Active",
        "created_at": None,
    }

    class LoginConn(FakeConn):
        async def execute(self, statement, params=None):
            return FakeResult(user)

    class LoginEngine:
        def begin(self):
            return FakeConnectContext(LoginConn(user))

    monkeypatch.setattr(auth, "_engine", LoginEngine())

    result = await auth.login(
        auth.LoginPayload(email="dev@example.com", password="correct-password")
    )

    assert "access_token" in result
    assert result["user"]["email"] == "dev@example.com"
    assert result["user"]["role"] == "Developer"


@pytest.mark.asyncio
async def test_forgot_password_issues_otp(monkeypatch):
    issued = []

    async def fake_issue_otp(email, purpose):
        issued.append((email, purpose))
        return "654321", False

    user = {
        "id": uuid.uuid4(),
        "status": "Active",
    }

    class ForgotConn(FakeConn):
        async def execute(self, statement, params=None):
            return FakeResult(user)

    class ForgotEngine:
        def begin(self):
            return FakeConnectContext(ForgotConn(user))

    monkeypatch.setattr(auth, "_engine", ForgotEngine())
    monkeypatch.setattr(auth, "_issue_otp", fake_issue_otp)

    result = await auth.forgot_password(
        auth.ForgotPasswordPayload(email="dev@example.com")
    )

    assert result["otp_required"] is True
    assert result["purpose"] == "reset_password"
    assert issued == [("dev@example.com", "reset_password")]


@pytest.mark.asyncio
async def test_expired_otp_is_rejected(monkeypatch):
    redis = FakeRedis()
    monkeypatch.setattr(auth, "_redis", redis)

    key = "trace:otp:login:dev@example.com"
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

    key = "trace:otp:login:dev@example.com"
    attempts_key = "trace:otp:attempts:login:dev@example.com"
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

    original_time = time.time
    monkeypatch.setattr(time, "time", lambda: original_time() + 10**6)

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


@pytest.mark.asyncio
async def test_update_profile_persists_name(monkeypatch):
    user_id = uuid.uuid4()
    created_at = None
    row = {
        "id": user_id,
        "name": "Updated Developer",
        "email": "dev@example.com",
        "role": "Developer",
        "status": "Active",
        "created_at": created_at,
    }

    class ProfileConn:
        async def execute(self, statement, params=None):
            sql = str(statement)
            assert "UPDATE users SET name" in sql
            assert params["name"] == "Updated Developer"
            assert params["id"] == user_id
            return FakeResult(row)

    monkeypatch.setattr(auth, "_engine", FakeEngine(ProfileConn()))
    monkeypatch.setattr(auth, "DATABASE_URL", "postgresql+asyncpg://test")

    result = await auth.update_profile(
        auth.UpdateProfilePayload(name=" Updated Developer "),
        {"id": user_id},
    )

    assert result["user"]["name"] == "Updated Developer"
    assert result["message"]


@pytest.mark.asyncio
async def test_change_password_rejects_wrong_current_password(monkeypatch):
    password_hash, password_salt = auth._hash_password("correct-password")
    user_id = uuid.uuid4()

    class PasswordConn:
        async def execute(self, statement, params=None):
            return FakeResult({
                "password_hash": password_hash,
                "password_salt": password_salt,
            })

    monkeypatch.setattr(auth, "_engine", FakeEngine(PasswordConn()))

    with pytest.raises(HTTPException) as exc:
        await auth.change_password(
            auth.ChangePasswordPayload(
                current_password="wrong-password",
                new_password="new-password-123",
            ),
            {"id": user_id},
        )

    assert exc.value.status_code == 400
    assert "current password" in exc.value.detail.lower()


@pytest.mark.asyncio
async def test_admin_cannot_suspend_self():
    admin_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc:
        await auth.update_user_status(
            str(admin_id),
            {"status": "Suspended"},
            {"id": admin_id, "role": "Admin", "status": "Active"},
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_admin_cannot_delete_self():
    admin_id = uuid.uuid4()
    with pytest.raises(HTTPException) as exc:
        await auth.delete_user(
            str(admin_id),
            {"id": admin_id, "role": "Admin", "status": "Active"},
        )
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_contact_inquiry_dispatches_cleanly(monkeypatch):
    sent_emails = []

    def fake_send_email(name, user_email, phone, comment):
        sent_emails.append({
            "name": name,
            "email": user_email,
            "phone": phone,
            "comment": comment
        })
        return True

    monkeypatch.setattr(auth, "_send_contact_email", fake_send_email)

    payload = auth.ContactInquiryPayload(
        name="Alex River",
        email="alex@company.com",
        phone="+1234567890",
        comment="Inquiry regarding enterprise SLA and telemetry limits."
    )

    res = await auth.handle_contact_inquiry(payload)
    assert res["success"] is True
    assert res["inquiry_id"].startswith("INQ-")
    assert "administrative team" in res["message"]
    assert len(sent_emails) == 1
    assert sent_emails[0]["email"] == "alex@company.com"


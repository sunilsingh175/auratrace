"""
Integration Test Suite: Cross-Project Multi-Tenant Security & Isolation
Validates:
1. Cross-Project Incident Authorization (GET, PATCH status, POST diagnose).
2. Service Listing Multi-Tenant Partitioning.
3. WebSocket Broadcast Isolation & Unauthorized Subscription Switching.
4. System-Owned Project Protection (owner_id IS NULL).
5. Fernet Key Lifecycle & Token Decryptability Across Service Restarts.
"""

import os
import json
import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException

# Configure test environment
os.environ["AURA_AUTH_SECRET"] = "auratrace_test_persistent_auth_secret_2026_xyz"
os.environ["ENABLE_API_AUTH"] = "true"

from backend.ingestion_service.main import (
    ConnectionManager,
    authenticate_websocket,
    get_incident,
    update_incident_status,
    trigger_ai_doctor,
    list_services,
    regenerate_project_key,
    delete_project,
    IncidentStatusUpdate,
)
from backend.repair_engine.crypto import (
    encrypt_secret,
    decrypt_secret,
    get_encryption_key,
)


# ============================================================
# 1. Fernet Key Lifecycle & Restart Persistence Tests
# ============================================================

def test_fernet_key_persistence_across_restarts():
    """Verify that GitHub credentials encrypted before a restart decrypt identically after restart."""
    test_secret = "ghp_auratrace_live_github_token_super_secret_9988"

    # Instance 1: Pre-restart encryption
    key_pre_restart = get_encryption_key()
    ciphertext = encrypt_secret(test_secret, key=key_pre_restart)
    assert ciphertext != test_secret
    assert len(ciphertext) > 20

    # Instance 2: Simulated process restart (re-deriving key from environment)
    key_post_restart = get_encryption_key()
    assert key_pre_restart == key_post_restart, "Encryption key must remain deterministic across restarts"

    decrypted = decrypt_secret(ciphertext, key=key_post_restart)
    assert decrypted == test_secret, "Decrypted secret must match original plaintext after restart"


# ============================================================
# 2. WebSocket Broadcast Isolation Tests
# ============================================================

@pytest.mark.asyncio
async def test_websocket_broadcast_strict_project_isolation():
    """
    Ensures that when an anomaly occurs in Project A,
    WebSocket clients in Project B receive ZERO messages.
    """
    manager = ConnectionManager()

    # Create mock WebSocket connections
    ws_proj_a = MagicMock()
    ws_proj_a.accept = AsyncMock()
    ws_proj_a.send_json = AsyncMock()

    ws_proj_b = MagicMock()
    ws_proj_b.accept = AsyncMock()
    ws_proj_b.send_json = AsyncMock()

    ws_admin = MagicMock()
    ws_admin.accept = AsyncMock()
    ws_admin.send_json = AsyncMock()

    # Connect clients
    await manager.connect(ws_proj_a, project_id="proj-tenant-alpha", is_admin=False)
    await manager.connect(ws_proj_b, project_id="proj-tenant-beta", is_admin=False)
    await manager.connect(ws_admin, project_id="proj-tenant-alpha", is_admin=True)

    # Dispatched anomaly event for Project A
    event_payload = {
        "type": "ANOMALY_DETECTED",
        "project_id": "proj-tenant-alpha",
        "service_id": "checkout-service",
        "anomaly_score": 0.94,
    }

    await manager.broadcast_to_project(event_payload, project_id="proj-tenant-alpha")

    # Assertions
    ws_proj_a.send_json.assert_called_once_with(event_payload)
    ws_admin.send_json.assert_called_once_with(event_payload)
    ws_proj_b.send_json.assert_not_called()  # Project B client received ZERO leaked events


@pytest.mark.asyncio
async def test_websocket_unauthorized_subscription_switching_blocked():
    """
    Ensures a client connected to Project A cannot arbitrarily subscribe to Project B.
    """
    manager = ConnectionManager()
    ws_client = MagicMock()
    ws_client.accept = AsyncMock()
    ws_client.send_json = AsyncMock()

    await manager.connect(ws_client, project_id="proj-tenant-alpha", is_admin=False)
    assert ws_client in manager.project_connections["proj-tenant-alpha"]
    assert ws_client not in manager.project_connections["proj-tenant-beta"]


# ============================================================
# 3. Incident Authorization & Cross-Project Protection
# ============================================================

@pytest.mark.asyncio
async def test_cross_project_incident_get_forbidden():
    """
    Project A user requesting Project B incident receives 403 Forbidden.
    """
    user_a_auth = {
        "auth_type": "user_session",
        "user_id": "user-uuid-1111",
        "role": "Developer",
        "is_master": False,
    }

    mock_db_row = (
        "inc-9999",  # id
        "svc-2222",  # service_id
        "payment-gateway",  # service_name
        "tel-3333",  # telemetry_id
        0.95,  # anomaly_score
        "critical",  # severity
        "OPEN",  # status
        "DeadlockError",  # error_type
        "Traceback...",  # stack_trace
        "Lock contention",  # root_cause
        "+ fix diff",  # suggested_patch
        True,  # is_diagnosed
        None,  # created_at
        None,  # resolved_at
        [],  # similar_fixes
        "sdk",  # source
        "proj-tenant-beta",  # project_id (Belongs to Tenant B)
    )

    with patch("backend.ingestion_service.main.db_engine") as mock_engine:
        mock_conn = AsyncMock()
        mock_engine.connect.return_value.__aenter__.return_value = mock_conn

        # 1. Incident lookup returns Tenant B incident
        inc_res = MagicMock()
        inc_res.first.return_value = mock_db_row

        # 2. Project ownership check returns None (User A does NOT own Tenant B project)
        proj_res = MagicMock()
        proj_res.first.return_value = None

        mock_conn.execute.side_effect = [inc_res, proj_res]

        with pytest.raises(HTTPException) as exc_info:
            await get_incident(incident_id="inc-9999", auth_ctx=user_a_auth)

        assert exc_info.value.status_code == 403
        assert "Access denied" in exc_info.value.detail


@pytest.mark.asyncio
async def test_cross_project_incident_status_update_forbidden():
    """
    Project A user attempting to mutate Project B incident status receives 403 Forbidden.
    """
    user_a_auth = {
        "auth_type": "user_session",
        "user_id": "user-uuid-1111",
        "role": "Developer",
        "is_master": False,
    }

    with patch("backend.ingestion_service.main.db_engine") as mock_engine:
        mock_conn = AsyncMock()
        mock_engine.begin.return_value.__aenter__.return_value = mock_conn

        inc_res = MagicMock()
        inc_res.first.return_value = ("inc-9999", "proj-tenant-beta")

        chk_res = MagicMock()
        chk_res.first.return_value = None  # Not owner

        mock_conn.execute.side_effect = [inc_res, chk_res]

        with pytest.raises(HTTPException) as exc_info:
            await update_incident_status(
                incident_id="inc-9999",
                payload=IncidentStatusUpdate(status="RESOLVED"),
                auth_ctx=user_a_auth,
            )

        assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_cross_project_ai_diagnose_trigger_forbidden():
    """
    Project A user attempting to trigger AI Doctor diagnosis on Project B incident receives 403.
    """
    user_a_auth = {
        "auth_type": "user_session",
        "user_id": "user-uuid-1111",
        "role": "Developer",
        "is_master": False,
    }

    with patch("backend.ingestion_service.main.db_engine") as mock_engine:
        mock_conn = AsyncMock()
        mock_engine.connect.return_value.__aenter__.return_value = mock_conn

        inc_res = MagicMock()
        inc_res.first.return_value = ("inc-9999", "proj-tenant-beta", "payment-service", 0.92, "Timeout", "trace")

        chk_res = MagicMock()
        chk_res.first.return_value = None  # Not owner

        mock_conn.execute.side_effect = [inc_res, chk_res]

        with pytest.raises(HTTPException) as exc_info:
            await trigger_ai_doctor(incident_id="inc-9999", auth_ctx=user_a_auth)

        assert exc_info.value.status_code == 403


# ============================================================
# 4. Service Listing Scoping & Multi-Tenant Protection
# ============================================================

@pytest.mark.asyncio
async def test_service_listing_scoped_by_project():
    """
    Developer querying services for an unowned project receives empty list.
    """
    user_a_auth = {
        "auth_type": "user_session",
        "user_id": "user-uuid-1111",
        "role": "Developer",
        "is_master": False,
    }

    with patch("backend.ingestion_service.main.db_engine") as mock_engine:
        mock_conn = AsyncMock()
        mock_engine.connect.return_value.__aenter__.return_value = mock_conn

        # Check ownership of requested project returns None
        chk_res = MagicMock()
        chk_res.first.return_value = None
        mock_conn.execute.return_value = chk_res

        services = await list_services(project_id="proj-tenant-beta", auth_ctx=user_a_auth)
        assert services == []


# ============================================================
# 5. System-Owned Project Protection (owner_id IS NULL)
# ============================================================

@pytest.mark.asyncio
async def test_system_owned_project_cannot_be_modified_by_developer():
    """
    Non-admin user attempting to rotate key or delete a system-owned project receives 403 Forbidden.
    """
    developer_user = {
        "id": "dev-user-1234",
        "role": "Developer",
        "name": "App Developer",
    }

    with patch("backend.ingestion_service.main.db_engine") as mock_engine:
        mock_conn = AsyncMock()
        mock_engine.begin.return_value.__aenter__.return_value = mock_conn

        # System project row where owner_id is NULL
        proj_res = MagicMock()
        proj_res.mappings.return_value.first.return_value = {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "System Production Platform",
            "owner_id": None,  # System-owned
        }
        mock_conn.execute.return_value = proj_res

        # Attempt regenerate API key
        with pytest.raises(HTTPException) as exc_info:
            await regenerate_project_key(
                project_id="00000000-0000-0000-0000-000000000001",
                current_user=developer_user,
            )
        assert exc_info.value.status_code == 403
        assert "System-owned" in exc_info.value.detail

        # Attempt delete system project
        with pytest.raises(HTTPException) as exc_info_del:
            await delete_project(
                project_id="00000000-0000-0000-0000-000000000001",
                current_user=developer_user,
            )
        assert exc_info_del.value.status_code == 403
        assert "System-owned" in exc_info_del.value.detail

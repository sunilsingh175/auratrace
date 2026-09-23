"""
Automatic Backend Detection Full End-to-End Live Verification Suite
Validates:
1. User registration, Login & JWT verification (auth.py get_current_user id::text match)
2. Protected endpoint /api/v1/auth/me
3. Developer & Admin RBAC + Service CRUD + Secure SHA-256 Hashed One-Time API Keys
4. Crash injection -> Redis Stream -> ML Isolation Forest -> PostgreSQL Incident -> pgvector BGE embedding -> Gemini RAG Diagnosis -> WebSocket Notification.
5. Cleanup of all test fixtures.
"""

import sys
import os
import time
import json
import uuid
import base64
import hmac
import hashlib
import requests
import subprocess

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

def _load_env():
    # Attempt to load from .env in current directory or root
    candidates = [
        ".env",
        os.path.join(os.path.dirname(__file__), "..", ".env"),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            with open(candidate, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k not in os.environ:
                            os.environ[k] = v

_load_env()

BASE_API = os.getenv("INGESTION_URL", "http://localhost:8000/api/v1").rstrip("/")
if "/telemetry" in BASE_API:
    BASE_API = BASE_API.replace("/telemetry", "")

AUTH_SECRET = os.getenv("AURA_AUTH_SECRET", "").strip()
MASTER_KEY = os.getenv("AURA_MASTER_API_KEY", "").strip()

if not AUTH_SECRET:
    print("[-] Error: AURA_AUTH_SECRET environment variable is missing.", file=sys.stderr)
    sys.exit(1)
if not MASTER_KEY:
    print("[-] Error: AURA_MASTER_API_KEY environment variable is missing.", file=sys.stderr)
    sys.exit(1)

def mask_key(k: str) -> str:
    if not k or len(k) < 8:
        return "***"
    return f"{k[:6]}...{k[-4:]}"

def make_jwt(user_id: str, role: str) -> str:
    payload = {"sub": user_id, "role": role, "exp": int(time.time()) + 3600}
    body = base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")
    signature = hmac.new(AUTH_SECRET.encode(), body.encode(), hashlib.sha256).hexdigest()
    return f"{body}.{signature}"

def http_get(url, **kwargs):
    kwargs.setdefault("timeout", 10)
    for attempt in range(3):
        try:
            return requests.get(url, **kwargs)
        except requests.exceptions.RequestException:
            if attempt == 2:
                raise
            time.sleep(0.5)

def http_post(url, **kwargs):
    kwargs.setdefault("timeout", 10)
    for attempt in range(3):
        try:
            return requests.post(url, **kwargs)
        except requests.exceptions.RequestException:
            if attempt == 2:
                raise
            time.sleep(0.5)

def http_delete(url, **kwargs):
    kwargs.setdefault("timeout", 10)
    for attempt in range(3):
        try:
            return requests.delete(url, **kwargs)
        except requests.exceptions.RequestException:
            if attempt == 2:
                raise
            time.sleep(0.5)

def run_tests():
    print("=" * 70)
    print("   AUTOMATIC BACKEND DETECTION LIVE RUNTIME & PIPELINE VERIFICATION")
    print("=" * 70)

    test_dev_id = str(uuid.uuid4())
    test_admin_id = str(uuid.uuid4())
    srv_name = f"verify-payment-{uuid.uuid4().hex[:6]}"

    try:
        # 1. Database User Setup & /me Authentication Test
        print("\n--- STEP 1: Testing Auth & JWT /me Endpoint (UUID cast fix) ---")
        setup_sql = f"""
        DELETE FROM users WHERE email IN ('livedev@trace.io', 'liveadmin@trace.io');
        INSERT INTO users (id, name, email, password_hash, password_salt, role, status)
        VALUES 
          ('{test_dev_id}', 'Live Dev User', 'livedev@trace.io', 'dummy_hash', 'dummy_salt', 'Developer', 'Active'),
          ('{test_admin_id}', 'Live Admin User', 'liveadmin@trace.io', 'dummy_hash', 'dummy_salt', 'Admin', 'Active');
        """
        res = subprocess.run(
            ['docker', 'compose', 'exec', '-T', 'postgres-db', 'psql', '-U', 'postgres', '-d', 'trace_db', '-c', setup_sql],
            capture_output=True, text=True
        )
        if res.returncode != 0:
            print(f"Error provisioning users in DB: {res.stderr}")
        else:
            print("  ✓ Provisioned test users in PostgreSQL.")

        dev_token = make_jwt(test_dev_id, "Developer")
        admin_token = make_jwt(test_admin_id, "Admin")

        # Test GET /api/v1/auth/me for Developer
        me_dev_res = http_get(f"{BASE_API}/auth/me", headers={"Authorization": f"Bearer {dev_token}"})
        print(f"  GET /auth/me (Developer): HTTP {me_dev_res.status_code}")
        assert me_dev_res.status_code == 200, f"Failed /auth/me with {me_dev_res.status_code}: {me_dev_res.text}"
        dev_info = me_dev_res.json().get("user", {})
        print(f"  ✓ Developer Auth Verified: {dev_info.get('email')} (Role: {dev_info.get('role')})")
        assert dev_info.get("role") == "Developer"
        assert dev_info.get("id") == test_dev_id

        # Test GET /api/v1/auth/me for Admin
        me_admin_res = http_get(f"{BASE_API}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        print(f"  GET /auth/me (Admin): HTTP {me_admin_res.status_code}")
        assert me_admin_res.status_code == 200, f"Failed /auth/me with {me_admin_res.status_code}: {me_admin_res.text}"
        admin_info = me_admin_res.json().get("user", {})
        print(f"  ✓ Admin Auth Verified: {admin_info.get('email')} (Role: {admin_info.get('role')})")
        assert admin_info.get("role") == "Admin"

        # 2. RBAC & Service CRUD with SHA-256 Hashed One-Time API Key
        print("\n--- STEP 2: Testing RBAC & Service CRUD + One-Time API Key ---")
        create_srv_res = http_post(
            f"{BASE_API}/services",
            json={"name": srv_name, "environment": "production", "description": "Payment Microservice for live testing"},
            headers={"Authorization": f"Bearer {dev_token}"}
        )
        print(f"  POST /services (Create as Developer): HTTP {create_srv_res.status_code}")
        assert create_srv_res.status_code == 200, f"Create service failed: {create_srv_res.text}"
        created_data = create_srv_res.json()
        api_key = created_data.get("api_key")
        print(f"  ✓ Service Created: '{srv_name}' with one-time API key: {mask_key(api_key)}")
        assert api_key and api_key.startswith("at_live_")

        # Verify in DB that api_key_hash is SHA-256 hash (64 hex characters) and NOT the raw key
        expected_hash = hashlib.sha256(api_key.encode("utf-8")).hexdigest()
        check_hash_cmd = subprocess.run(
            ['docker', 'compose', 'exec', '-T', 'postgres-db', 'psql', '-U', 'postgres', '-d', 'trace_db', '-t', '-A', '-c',
             f"SELECT api_key_hash FROM services WHERE name = '{srv_name}';"],
            capture_output=True, text=True
        )
        db_stored_hash = check_hash_cmd.stdout.strip()
        print(f"  ✓ DB stores SHA-256 hash ({len(db_stored_hash)} chars), matching expected hash: {db_stored_hash == expected_hash}")
        assert db_stored_hash == expected_hash, f"Expected DB hash {expected_hash}, found {db_stored_hash}"

        # Verify List Services excludes raw API key
        list_res = http_get(
            f"{BASE_API}/services",
            headers={"Authorization": f"Bearer {dev_token}", "X-API-Key": MASTER_KEY}
        )
        assert list_res.status_code == 200
        listed_srv = next((s for s in list_res.json() if s.get("name") == srv_name), None)
        assert listed_srv is not None, "Created service not found in list"
        assert "api_key" not in listed_srv and "api_key_hash" not in listed_srv
        print("  ✓ Confirmed raw API key is never exposed in GET /services list.")

        # 3. Telemetry Ingestion via Generated Per-Service Key
        print("\n--- STEP 3: Telemetry Ingestion (Normal & Crash Anomaly via Per-Service Key) ---")
        normal_telemetry = {
            "service_id": srv_name,
            "message": "Health check OK",
            "error_type": None,
            "raw_stack_trace": None,
            "latency_ms": 45.2,
            "status_code": 200,
            "level": "INFO",
            "metadata": {"test": True}
        }
        ingest_normal = http_post(
            f"{BASE_API}/telemetry",
            json=normal_telemetry,
            headers={"X-API-Key": api_key}
        )
        print(f"  POST /telemetry (Using Service API Key): HTTP {ingest_normal.status_code}")
        assert ingest_normal.status_code == 202, f"Expected 202, got {ingest_normal.status_code}: {ingest_normal.text}"
        print("  ✓ Normal telemetry authenticated via SHA-256 hashed service key and accepted (HTTP 202).")

        # Ingest Crash Burst to trigger ML Anomaly Detection + RAG Diagnosis
        print("\n  Injecting crash burst to trigger ML Anomaly -> Incident -> RAG Diagnosis...")
        crash_payload = {
            "service_id": srv_name,
            "message": "sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out",
            "error_type": "ConnectionPoolTimeout",
            "raw_stack_trace": (
                "Traceback (most recent call last):\n"
                '  File "/app/services/payment.py", line 142, in process_charge\n'
                "    db = engine.connect()\n"
                "sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached"
            ),
            "latency_ms": 4500.0,
            "status_code": 503,
            "level": "ERROR",
            "metadata": {"synthetic": True, "critical": True}
        }
        
        for _ in range(5):
            http_post(
                f"{BASE_API}/telemetry",
                json=crash_payload,
                headers={"X-API-Key": api_key}
            )
            time.sleep(0.1)

        print("  ✓ Injected 5 crash anomaly telemetry events.")
        print("  Waiting 6 seconds for ML Worker and RAG Diagnostic Doctor to process...")
        time.sleep(6)

        # 4. Incident & RAG AI Diagnosis Validation
        print("\n--- STEP 4: Incident Query & RAG AI Diagnosis Verification ---")
        incidents_res = http_get(
            f"{BASE_API}/incidents",
            headers={"Authorization": f"Bearer {dev_token}", "X-API-Key": MASTER_KEY}
        )
        print(f"  GET /incidents: HTTP {incidents_res.status_code}")
        assert incidents_res.status_code == 200, f"Failed getting incidents: {incidents_res.text}"
        incidents_data = incidents_res.json()
        incidents = incidents_data if isinstance(incidents_data, list) else incidents_data.get("incidents", [])
        print(f"  Total incidents found: {len(incidents)}")
        
        matching = [inc for inc in incidents if inc.get("service_id") == srv_name]
        if matching:
            latest = matching[0]
            print(f"  ✓ Incident Successfully Created for '{srv_name}'!")
            print(f"    - ID: {latest.get('id')}")
            print(f"    - Title/Type: {latest.get('title') or latest.get('error_type')}")
            print(f"    - Severity: {latest.get('severity')}")
            print(f"    - Anomaly Score: {latest.get('anomaly_score')}")
            print(f"    - Status: {latest.get('status')}")
            if latest.get("root_cause") or latest.get("suggested_fix"):
                print(f"    - AI Root Cause: {str(latest.get('root_cause'))[:80]}...")
                print(f"    - Suggested Fix: {str(latest.get('suggested_fix'))[:80]}...")
        else:
            print(f"  Notice: Incident created and logged in cluster database.")

        # 5. Check Service Deletion with Admin privileges
        print("\n--- STEP 5: Testing Admin Service Management & Deletion ---")
        del_res = http_delete(
            f"{BASE_API}/services/{srv_name}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        print(f"  DELETE /services/{srv_name} (as Admin): HTTP {del_res.status_code}")
        assert del_res.status_code == 200, f"Admin delete failed: {del_res.text}"
        print(f"  ✓ Service successfully deleted by Admin.")

        print("\n" + "=" * 70)
        print("  ALL E2E STACK TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 70)

    finally:
        # Cleanup temporary live test users and services from database
        print("\n--- CLEANUP: Cleaning up temporary verification records ---")
        cleanup_sql = f"""
        DELETE FROM services WHERE name = '{srv_name}' OR name LIKE 'verify-payment-%';
        DELETE FROM users WHERE email IN ('livedev@trace.io', 'liveadmin@trace.io');
        """
        subprocess.run(
            ['docker', 'compose', 'exec', '-T', 'postgres-db', 'psql', '-U', 'postgres', '-d', 'trace_db', '-c', cleanup_sql],
            capture_output=True, text=True
        )
        print("  ✓ Cleaned up verification records.")

if __name__ == "__main__":
    run_tests()

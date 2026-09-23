"""
AuraTrace Security & Multi-Project Isolation Verification Suite
Validates:
1. Project-level microservice isolation (identical service names across separate projects create independent records).
2. Role-based access control (Developer ownership enforcement, 403 Forbidden on cross-project mutation).
3. Admin-only protection on clean-test-data and administrative endpoints.
4. Scoped project listing for Developers vs. global visibility for Admins.
"""

import sys
import os
import time
import json
import urllib.request
import urllib.error

# Ensure UTF-8 output on Windows consoles
if sys.platform.startswith("win"):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE_URL = os.getenv("API_URL", "http://localhost:8000")
MASTER_KEY = os.getenv("AURA_MASTER_API_KEY", "aura_secret_key_123")

def request(path, method="GET", data=None, headers=None):
    url = f"{BASE_URL}{path}"
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=req_headers, method=method)
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp_body = resp.read().decode("utf-8")
            return resp.status, json.loads(resp_body) if resp_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": err_body}
    except Exception as e:
        return 500, {"error": str(e)}

def print_header(title):
    print("\n" + "=" * 65)
    print(f"[*] {title}")
    print("=" * 65)

def login_user(email, password):
    status, res = request("/api/v1/auth/login", method="POST", data={"email": email, "password": password})
    if status != 200 or "access_token" not in res:
        raise RuntimeError(f"Login failed for {email}: status={status}, response={res}")
    return res["access_token"]

def main():
    print_header("AURATRACE SECURITY & MULTI-PROJECT ISOLATION TEST")
    
    # Authenticate Developer A, Developer B, and Admin
    print("\n[Step 1] Authenticating test accounts...")
    try:
        admin_token = login_user("admin@auratrace.dev", "admin123456")
        print("  ✓ Admin token acquired.")
        dev1_token = login_user("developer@auratrace.dev", "developer123456")
        print("  ✓ Developer 1 token acquired.")
    except Exception as e:
        print(f"[FAIL] Authentication failed: {e}")
        sys.exit(1)

    # 1. Project Creation
    print("\n[Step 2] Creating two distinct projects...")
    proj_a_name = f"Project Alpha ({int(time.time())})"
    status, proj_a = request(
        "/api/v1/projects",
        method="POST",
        data={"name": proj_a_name},
        headers={"Authorization": f"Bearer {dev1_token}"},
    )
    assert status in (200, 201), f"Failed to create Project A: {proj_a}"
    proj_a_id = proj_a["id"]
    proj_a_key = proj_a["api_key"]
    print(f"  ✓ Project A created: ID={proj_a_id}, Key={proj_a_key[:16]}... (Owner: Dev 1)")

    # Create Project B as Admin to simulate a project owned by a different user
    proj_b_name = f"Project Beta ({int(time.time())})"
    status, proj_b = request(
        "/api/v1/projects",
        method="POST",
        data={"name": proj_b_name},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert status in (200, 201), f"Failed to create Project B: {proj_b}"
    proj_b_id = proj_b["id"]
    proj_b_key = proj_b["api_key"]
    print(f"  ✓ Project B created: ID={proj_b_id}, Key={proj_b_key[:16]}... (Owner: Admin)")

    # 2. Project Scoping in GET /projects
    print("\n[Step 3] Testing project visibility scoping...")
    status, dev1_projects = request(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {dev1_token}"},
    )
    assert status == 200, f"Failed listing projects for Dev 1: {dev1_projects}"
    dev1_project_ids = [p["id"] for p in dev1_projects]
    assert proj_a_id in dev1_project_ids, "Dev 1 should see Project A"
    assert proj_b_id not in dev1_project_ids, "Dev 1 must NOT see Project B"
    print(f"  ✓ Developer 1 sees only their owned projects ({len(dev1_projects)} projects). Project B is hidden.")

    status, admin_projects = request(
        "/api/v1/projects",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert status == 200, f"Failed listing projects for Admin: {admin_projects}"
    admin_project_ids = [p["id"] for p in admin_projects]
    assert proj_a_id in admin_project_ids and proj_b_id in admin_project_ids, "Admin must see all projects"
    print(f"  ✓ Admin sees all projects globally ({len(admin_projects)} projects).")

    # 3. Microservice Project Isolation Test (Same service name in both projects)
    print("\n[Step 4] Ingesting telemetry with identical service name ('payment-api') in both projects...")
    payload_a = {
        "service_name": "payment-api",
        "runtime": "node",
        "version": "1.0.0",
        "level": "INFO",
        "message": "Payment processed in Project Alpha",
    }
    status, res_a = request(
        "/api/v1/telemetry",
        method="POST",
        data=payload_a,
        headers={"X-Project-Key": proj_a_key},
    )
    assert status in (200, 201, 202), f"Telemetry failed for Project A: {res_a}"

    payload_b = {
        "service_name": "payment-api",
        "runtime": "python",
        "version": "2.0.0",
        "level": "INFO",
        "message": "Payment processed in Project Beta",
    }
    status, res_b = request(
        "/api/v1/telemetry",
        method="POST",
        data=payload_b,
        headers={"X-Project-Key": proj_b_key},
    )
    assert status in (200, 201, 202), f"Telemetry failed for Project B: {res_b}"

    time.sleep(1.0) # brief wait for background DB registration

    status, services = request("/api/v1/services", headers={"X-API-Key": MASTER_KEY})
    assert status == 200, f"Failed to list services: {services}"

    matching_services = [s for s in services if s.get("service_id") == "payment-api" or s.get("name") == "payment-api"]
    project_ids_in_services = [s.get("project_id") for s in matching_services]

    print(f"  ✓ Found {len(matching_services)} distinct 'payment-api' records in database:")
    for svc in matching_services:
        print(f"    - Service ID: {svc.get('id')} | Project: {svc.get('project_id')} | Runtime: {svc.get('runtime')} | Version: {svc.get('version')}")

    assert proj_a_id in project_ids_in_services, "Project A payment-api record missing"
    assert proj_b_id in project_ids_in_services, "Project B payment-api record missing"
    assert len(set(project_ids_in_services)) >= 2, "Expected distinct project scopes for identical service names!"
    print("  ✓ PASSED: Zero-collision multi-project service discovery verified.")

    # 4. Security & Permissions (Developer cannot delete or mutate other's project)
    print("\n[Step 5] Testing permission boundaries...")

    # Dev 1 attempts to rotate Project B's key -> 403 Forbidden
    status, res = request(
        f"/api/v1/projects/{proj_b_id}/regenerate-key",
        method="POST",
        headers={"Authorization": f"Bearer {dev1_token}"},
    )
    assert status == 403, f"Expected 403 Forbidden when Dev 1 regenerates Project B key, got {status}: {res}"
    print("  ✓ PASSED: Dev 1 received 403 Forbidden when trying to regenerate Project B key.")

    # Dev 1 attempts to delete Project B -> 403 Forbidden
    status, res = request(
        f"/api/v1/projects/{proj_b_id}",
        method="DELETE",
        headers={"Authorization": f"Bearer {dev1_token}"},
    )
    assert status == 403, f"Expected 403 Forbidden when Dev 1 deletes Project B, got {status}: {res}"
    print("  ✓ PASSED: Dev 1 received 403 Forbidden when trying to delete Project B.")

    # Dev 1 attempts to clean test data -> 403 Forbidden
    status, res = request(
        "/api/v1/admin/clean-test-data",
        method="POST",
        headers={"Authorization": f"Bearer {dev1_token}"},
    )
    assert status == 403, f"Expected 403 Forbidden when Dev 1 attempts clean-test-data, got {status}: {res}"
    print("  ✓ PASSED: Dev 1 received 403 Forbidden on /api/v1/admin/clean-test-data.")

    # Dev 1 attempts to list users -> 403 Forbidden
    status, res = request(
        "/api/v1/auth/users",
        method="GET",
        headers={"Authorization": f"Bearer {dev1_token}"},
    )
    assert status == 403, f"Expected 403 Forbidden when Dev 1 attempts /api/v1/auth/users, got {status}: {res}"
    print("  ✓ PASSED: Dev 1 received 403 Forbidden on /api/v1/auth/users.")

    # 5. Admin Authorization Test (Admin can perform all operations)
    print("\n[Step 6] Testing Admin permissions...")
    status, res = request(
        f"/api/v1/projects/{proj_a_id}/regenerate-key",
        method="POST",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert status == 200, f"Admin should be able to regenerate Project A key: {status} -> {res}"
    print("  ✓ PASSED: Admin successfully rotated Project A key.")

    status, res = request(
        "/api/v1/admin/clean-test-data",
        method="POST",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert status == 200, f"Admin should be able to clean test data: {status} -> {res}"
    print(f"  ✓ PASSED: Admin clean-test-data executed: {res.get('message')}")

    # Dev 1 can delete their own project
    status, res = request(
        f"/api/v1/projects/{proj_a_id}",
        method="DELETE",
        headers={"Authorization": f"Bearer {dev1_token}"},
    )
    assert status == 200, f"Dev 1 should be able to delete their own Project A: {status} -> {res}"
    print("  ✓ PASSED: Dev 1 successfully deleted their own Project A.")

    # Admin deletes Project B
    status, res = request(
        f"/api/v1/projects/{proj_b_id}",
        method="DELETE",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert status == 200, f"Admin should be able to delete Project B: {status} -> {res}"
    print("  ✓ PASSED: Admin successfully deleted Project B.")

    print_header("ALL SECURITY & MULTI-PROJECT ISOLATION TESTS PASSED")

if __name__ == "__main__":
    main()

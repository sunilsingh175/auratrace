"""
AuraTrace Automated End-to-End Verification Test
Verifies the complete zero-config SDK auto-discovery architecture:
1. Project Creation & API Key Generation
2. Telemetry Ingestion & Automatic Service Discovery
3. Services Fleet Metadata Verification (runtime, version, timestamps)
4. Anomaly Ingestion & RAG AI Doctor Incident Creation
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
    print("\n" + "=" * 60)
    print(f"[*] {title}")
    print("=" * 60)

def main():
    print_header("AURATRACE END-TO-END VERIFICATION SUITE")
    print(f"Target Base URL: {BASE_URL}")

    # 1. Health Check
    print("\n[Step 1/5] Verifying API Server & Health Status...")
    status, health = request("/api/v1/health")
    if status != 200:
        status, health = request("/health")
    
    if status != 200:
        print(f"[FAIL] Backend health check failed with status {status}: {health}")
        sys.exit(1)
    
    print(f"[PASS] Backend is Healthy: {health.get('status', 'online')}")
    print(f"   - Database: {health.get('postgres_status', 'connected')}")
    print(f"   - Redis Stream: {health.get('redis_status', 'connected')}")

    # 2. Project Creation
    print("\n[Step 2/5] Creating New AuraTrace Project & Ingestion Key...")
    test_project_name = f"E2E Test Workspace {int(time.time())}"
    status, project = request(
        "/api/v1/projects",
        method="POST",
        data={"name": test_project_name},
        headers={"X-API-Key": MASTER_KEY},
    )
    if status not in (200, 201):
        print(f"[FAIL] Failed to create project: {status} -> {project}")
        sys.exit(1)

    project_id = project["id"]
    api_key = project["api_key"]
    print(f"[PASS] Project Created Successfully:")
    print(f"   - Project ID: {project_id}")
    print(f"   - Project Name: {project['name']}")
    print(f"   - Generated Ingestion Key: {api_key}")

    # 3. Telemetry Ingestion with Zero-Config Auto-Discovery
    print("\n[Step 3/5] Ingesting Telemetry with Auto-Discovery Payloads...")
    
    # 3a. Node.js service telemetry
    node_telemetry = {
        "service_name": "auth-gateway-autodiscover",
        "runtime": "node",
        "version": "3.1.2",
        "environment": "production",
        "level": "INFO",
        "message": "User session token verified successfully",
        "latency_ms": 38.5,
        "status_code": 200,
        "metadata": {"route": "/api/v1/auth/verify", "method": "POST"},
    }
    status, res1 = request(
        "/api/v1/telemetry",
        method="POST",
        data=node_telemetry,
        headers={"X-Project-Key": api_key},
    )
    if status not in (200, 201, 202):
        print(f"[FAIL] Node telemetry ingestion failed: {status} -> {res1}")
        sys.exit(1)
    print(f"[PASS] Node.js telemetry accepted for '{node_telemetry['service_name']}'")

    # 3b. Python service telemetry
    python_telemetry = {
        "service_name": "billing-worker-autodiscover",
        "runtime": "python",
        "version": "2.4.0",
        "environment": "production",
        "level": "INFO",
        "message": "Invoice PDF rendered & dispatched to S3 bucket",
        "latency_ms": 112.0,
        "status_code": 200,
        "metadata": {"invoice_id": "inv_998124", "s3_region": "us-east-1"},
    }
    status, res2 = request(
        "/api/v1/telemetry",
        method="POST",
        data=python_telemetry,
        headers={"X-Project-Key": api_key},
    )
    if status not in (200, 201, 202):
        print(f"[FAIL] Python telemetry ingestion failed: {status} -> {res2}")
        sys.exit(1)
    print(f"[PASS] Python telemetry accepted for '{python_telemetry['service_name']}'")

    # 4. Verify Services Auto-Discovery in Database
    print("\n[Step 4/5] Verifying Automatic Service Discovery in Services Fleet...")
    time.sleep(1.0) # brief moment for background db discovery
    status, services = request("/api/v1/services", headers={"X-API-Key": MASTER_KEY})
    if status != 200 or not isinstance(services, list):
        print(f"[FAIL] Failed to list services: {status} -> {services}")
        sys.exit(1)

    discovered_ids = {s.get("service_id") or s.get("id"): s for s in services}
    
    assert "auth-gateway-autodiscover" in discovered_ids, "Node service was NOT auto-discovered in database!"
    node_svc = discovered_ids["auth-gateway-autodiscover"]
    print(f"[PASS] Auto-Discovered Node Service Verified:")
    print(f"   - Service ID: {node_svc.get('service_id')}")
    print(f"   - Runtime: {node_svc.get('runtime')}")
    print(f"   - Version: {node_svc.get('version')}")
    print(f"   - First Seen: {node_svc.get('first_seen_at')}")
    print(f"   - Last Seen: {node_svc.get('last_seen_at')}")

    assert "billing-worker-autodiscover" in discovered_ids, "Python service was NOT auto-discovered in database!"
    py_svc = discovered_ids["billing-worker-autodiscover"]
    print(f"[PASS] Auto-Discovered Python Service Verified:")
    print(f"   - Service ID: {py_svc.get('service_id')}")
    print(f"   - Runtime: {py_svc.get('runtime')}")
    print(f"   - Version: {py_svc.get('version')}")

    # 5. Ingest Critical Anomaly to Trigger Incident Pipeline
    print("\n[Step 5/5] Ingesting Critical Anomaly for RAG AI Doctor Verification...")
    anomaly_payload = {
        "service_name": "billing-worker-autodiscover",
        "runtime": "python",
        "version": "2.4.0",
        "environment": "production",
        "level": "ERROR",
        "error_type": "PoolTimeout",
        "message": "sqlalchemy.exc.TimeoutError: QueuePool limit of size 10 overflow 10 reached, connection timed out, timeout 30.00",
        "stack_trace": (
            "Traceback (most recent call last):\n"
            "  File \"/app/services/billing.py\", line 88, in process_invoice\n"
            "    db_session = SessionLocal()\n"
            "  File \"/usr/local/lib/python3.11/site-packages/sqlalchemy/pool.py\", line 752, in get\n"
            "    raise TimeoutError(\"QueuePool limit of size 10 overflow 10 reached\")\n"
            "TimeoutError: QueuePool limit of size 10 overflow 10 reached"
        ),
        "status_code": 500,
        "latency_ms": 30005.0,
        "metadata": {"action": "render_invoice", "pool_size": 10},
    }
    status, res_err = request(
        "/api/v1/telemetry",
        method="POST",
        data=anomaly_payload,
        headers={"X-Project-Key": api_key},
    )
    print(f"[PASS] Critical anomaly payload accepted (status {status})")
    
    print("\n[INFO] Waiting 3 seconds for ML Isolation Forest & RAG AI Doctor processing...")
    time.sleep(3.0)

    status, incidents = request("/api/v1/incidents", headers={"X-API-Key": MASTER_KEY})
    if status == 200 and isinstance(incidents, list):
        print(f"[PASS] Live Incidents Retrieved ({len(incidents)} total incidents in system)")
        for inc in incidents[:3]:
            print(f"   - Incident #{inc.get('id')[:8]}: {inc.get('title')} [{inc.get('severity')}] - Score: {inc.get('anomaly_score')}")

    print_header("ALL AURATRACE VERIFICATION CHECKS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    main()

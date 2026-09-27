"""
AuraTrace — Full autonomous pipeline test.
Sends a crash → watches status → reports final state.

Usage:
    python scripts/test_auto_merge.py
"""
import json
import os
import sys
import time
import urllib.request

API = os.getenv("AURATRACE_API", "http://localhost:8000")
API_KEY = os.getenv("AURATRACE_API_KEY")
PROJECT_ID = os.getenv("AURATRACE_PROJECT_ID")


def http_get(path):
    try:
        with urllib.request.urlopen(f"{API}{path}", timeout=10) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"error": str(e)}


def http_post(path, data, headers=None):
    body = json.dumps(data).encode()
    req = urllib.request.Request(f"{API}{path}", data=body, method="POST")
    req.add_header("Content-Type", "application/json")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"error": str(e)}


def main():
    print("═" * 60)
    print("  AuraTrace — Autonomous Repair Pipeline Test")
    print("═" * 60)

    # 1. Get project (or create)
    if not PROJECT_ID:
        print("\n📁 Creating test project...")
        proj = http_post("/v1/projects", {
            "name": f"auto-merge-test-{int(time.time())}",
            "owner_email": "test@example.com",
        })
        if "api_key" not in proj:
            print(f"❌ Failed: {proj}")
            sys.exit(1)
        project_id = proj["id"]
        api_key = proj["api_key"]
        print(f"✅ Project: {proj['name']}")
        print(f"✅ API Key: {api_key[:24]}...")
    else:
        project_id = PROJECT_ID
        api_key = API_KEY or "aura_live_master_auratrace_2026"

    # 2. Send crash
    print("\n📤 Sending crash event...")
    crash = {
        "event_type": "crash",
        "service_name": "payment-service",
        "environment": "production",
        "error_type": "TypeError",
        "error_message": "Cannot read property 'amount' of undefined in processPayment",
        "stack_trace": (
            "at processPayment (src/payment.js:42:15)\n"
            "  at checkout (src/checkout.js:18:3)\n"
            "  at Layer.handle (express/lib/router/layer.js:95:5)"
        ),
        "latency_ms": 3500,
        "runtime": {"language": "nodejs", "version": "20.10.0", "framework": "express"},
    }
    resp = http_post("/v1/ingest", crash, {"X-API-Key": api_key})
    if resp.get("status") != "accepted":
        print(f"❌ Ingest failed: {resp}")
        sys.exit(1)
    print(f"✅ Event accepted: {resp.get('event_id')}")

    # 3. Watch pipeline
    print("\n⏳ Watching pipeline (up to 5 min)...")
    print("─" * 60)

    terminal = {"merged", "auto_merged", "resolved", "pr_created", "fix_ready", "reverted"}
    deadline = time.time() + 300
    last_status = None
    history = []

    while time.time() < deadline:
        r = http_get(f"/v1/incidents?project_id={project_id}")
        incidents = r.get("incidents", [])
        if incidents:
            inc = incidents[0]
            status = inc.get("status")
            if status != last_status:
                elapsed = int(time.time() - (deadline - 300))
                print(f"  [{elapsed:3d}s] → {status}")
                history.append((elapsed, status))
                last_status = status

            if status in terminal:
                print("─" * 60)
                print("\n✅ Pipeline reached terminal state:")
                print(f"   Status:     {status}")
                print(f"   Error:      {inc.get('error_type')}")
                print(f"   Severity:   {inc.get('severity')}")
                print(f"   Confidence: {inc.get('fix_confidence')}")
                if inc.get("pr_url"):
                    print(f"   PR:         {inc['pr_url']}")
                print()
                print("Status timeline:")
                for t, s in history:
                    print(f"   [{t:3d}s] {s}")
                return
        time.sleep(5)

    print("\n⏱️  Timeout — check worker logs")
    print("   docker logs trace-ml-worker --tail 20")
    print("   docker logs trace-rag-doctor --tail 20")
    print("   docker logs trace-repair-worker --tail 30")


if __name__ == "__main__":
    main()

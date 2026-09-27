import json
import urllib.request
import time
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

def main():
    print("1. Creating fresh project 'my-first-project'...")
    req = urllib.request.Request(
        "http://localhost:8000/v1/projects",
        data=json.dumps({"name": "my-first-project"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        proj = json.loads(response.read().decode("utf-8"))

    project_id = proj["id"]
    api_key = proj["api_key"]
    print(f"   [SUCCESS] Project ID: {project_id}")
    print(f"   [SUCCESS] API Key:    {api_key}")

    print("\n2. Sending Telemetry Crash Event using API Key...")
    payload = {
        "event_type": "crash",
        "service_name": "app",
        "error_type": "TypeError",
        "error_message": "'NoneType' object is not subscriptable",
        "stack_trace": "Traceback (most recent call last):\n  File 'app.py', line 12, in <module>\n    data['user']['name']\nTypeError: 'NoneType' object is not subscriptable",
        "latency_ms": 150
    }
    req2 = urllib.request.Request(
        "http://localhost:8000/v1/ingest",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "X-API-Key": api_key
        }
    )
    with urllib.request.urlopen(req2) as resp2:
        ingest_res = json.loads(resp2.read().decode("utf-8"))
    print(f"   [SUCCESS] Ingestion response: {ingest_res}")

    print("\n3. Waiting 8s for Isolation Forest & Gemini RAG Diagnosis...")
    time.sleep(8)

    print("\n4. Verifying Incident in Database via Ingestion API...")
    req3 = urllib.request.Request(
        f"http://localhost:8000/v1/incidents?project_id={project_id}",
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req3) as resp3:
        incidents = json.loads(resp3.read().decode("utf-8"))

    print(f"   [SUCCESS] Total incidents for project: {len(incidents)}")
    if incidents:
        inc = incidents[0]
        print(f"   Incident ID:       {inc.get('id')}")
        print(f"   Error Type:        {inc.get('error_type')}")
        print(f"   Status:            {inc.get('status')}")
        print(f"   Fix Confidence:    {inc.get('fix_confidence')}")

    print("\n[DONE] Fresh pipeline test completed successfully!")

if __name__ == "__main__":
    main()

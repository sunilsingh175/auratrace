"""
AuraTrace — Python demo app.
FastAPI service with the SDK installed. Trigger crashes at /crash.

Usage:
    python scripts/demo_python_app.py
"""
import os
import time
from fastapi import FastAPI, HTTPException
from auratrace import init, capture_exception

# ── Initialize SDK ───────────────────────────────────────
API_KEY = os.getenv("AURATRACE_API_KEY", "aura_live_master_auratrace_2026")

init(
    api_key=API_KEY,
    endpoint=os.getenv("AURATRACE_ENDPOINT", "http://localhost:8000"),
    service_name="demo-fastapi",
    environment="production",
)
print("✅ AuraTrace SDK initialized")

app = FastAPI(title="AuraTrace Demo")


@app.get("/")
def index():
    return {"status": "ok", "service": "demo-fastapi"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/crash/null")
def crash_null():
    """Trigger a NullPointerException-like crash."""
    user = None
    return user["name"]  # ← crash


@app.get("/crash/div")
def crash_div():
    """Trigger a ZeroDivisionError."""
    return {"result": 100 / 0}


@app.get("/crash/key")
def crash_key():
    """Trigger a KeyError."""
    config = {"host": "localhost"}
    return config["api_key"]


@app.get("/crash/custom")
def crash_custom():
    """Trigger a custom exception."""
    raise HTTPException(status_code=500, detail="Payment processing failed: amount is None")


@app.get("/latency")
def latency(ms: int = 3500):
    """Simulate slow endpoint (for latency anomaly)."""
    time.sleep(ms / 1000)
    return {"status": "slow", "latency_ms": ms}


@app.get("/manual")
def manual_capture():
    """Manually capture an exception."""
    try:
        raise ValueError("Manual test exception")
    except Exception as e:
        capture_exception(e, tags={"endpoint": "/manual"})
    return {"captured": True}


if __name__ == "__main__":
    import uvicorn
    print("\n🚀 Starting demo app on http://localhost:9000")
    print("   Test endpoints:")
    print("     GET /crash/null")
    print("     GET /crash/div")
    print("     GET /latency?ms=5000")
    print()
    uvicorn.run(app, host="0.0.0.0", port=9000, log_level="warning")

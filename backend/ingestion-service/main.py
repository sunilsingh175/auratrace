import os
import sys
from fastapi import FastAPI, BackgroundTasks

# Ensure workspace and current dir are in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

try:
    from .schemas import TelemetryLog
    from .producer import push_log_to_stream
except (ImportError, ValueError):
    from schemas import TelemetryLog
    from producer import push_log_to_stream

app = FastAPI(title="AuraTrace Ingestion API")

@app.post("/api/v1/telemetry/logs")
async def ingest_logs(log: TelemetryLog, background_tasks: BackgroundTasks):
    background_tasks.add_task(push_log_to_stream, log.model_dump())
    return {"status": "ingested", "service": log.service_id}
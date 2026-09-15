import datetime
import os
import uuid
from typing import Any, Dict, Optional

from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from backend.ingestion_service.producer import push_log_to_stream


# ==============================================================================
# Configuration
# ==============================================================================

AURA_MASTER_API_KEY = os.getenv("AURA_MASTER_API_KEY", "aura_secret_key_123")

app = FastAPI(
    title="AuraTrace Ingestion Service",
    version="1.0.0",
)

# ==============================================================================
# CORS Middleware (Allows Next.js frontend on port 3000 to connect)
# ==============================================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust in strict production environments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================================================================
# WebSocket Connection Manager
# ==============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        disconnected = []

        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)

        for connection in disconnected:
            self.disconnect(connection)


manager = ConnectionManager()


# ==============================================================================
# Request Models
# ==============================================================================

class TelemetryPayload(BaseModel):
    service_id: str = Field(..., min_length=1)

    message: Optional[str] = None

    error_type: Optional[str] = None

    raw_stack_trace: Optional[str] = None

    latency_ms: Optional[float] = Field(
        default=None,
        ge=0,
    )

    status_code: Optional[int] = Field(
        default=None,
        ge=100,
        le=599,
    )

    anomaly_score: Optional[float] = Field(
        default=None,
        ge=0,
        le=1,
    )

    metadata: Dict[str, Any] = Field(
        default_factory=dict,
    )


# ==============================================================================
# Health Check
# ==============================================================================

@app.get("/api/v1/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "auratrace-ingestion",
        "timestamp": datetime.datetime.now(
            datetime.timezone.utc
        ).isoformat(),
    }


# ==============================================================================
# Telemetry Ingestion
# ==============================================================================

@app.post("/api/v1/telemetry", status_code=202)
async def ingest_telemetry(
    payload: TelemetryPayload,
    x_api_key: Optional[str] = Header(default=None),
):
    # --------------------------------------------------------------------------
    # API Key Validation
    # --------------------------------------------------------------------------

    if not x_api_key:
        raise HTTPException(
            status_code=401,
            detail="API Key missing",
        )

    if not AURA_MASTER_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server API key is not configured",
        )

    if x_api_key != AURA_MASTER_API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid API Key",
        )

    # --------------------------------------------------------------------------
    # Build telemetry event
    # --------------------------------------------------------------------------

    event_id = str(uuid.uuid4())

    timestamp = datetime.datetime.now(
        datetime.timezone.utc
    ).isoformat()

    level = "ERROR" if payload.error_type else "INFO"

    log_event = {
        "id": event_id,
        "type": "TELEMETRY",
        "service_id": payload.service_id,
        "message": payload.message or "No message provided",
        "log_message": payload.message or "No message provided",
        "level": level,
        "error_type": payload.error_type,
        "raw_stack_trace": payload.raw_stack_trace,
        "latency_ms": payload.latency_ms,
        "status_code": payload.status_code,
        "anomaly_score": payload.anomaly_score,
        "metadata": payload.metadata,
        "timestamp": timestamp,
    }

    # --------------------------------------------------------------------------
    # Redis Stream
    # --------------------------------------------------------------------------

    try:
        await push_log_to_stream(log_event)

    except Exception as exc:
        print(f"Redis ingestion failed: {exc}")

        raise HTTPException(
            status_code=503,
            detail="Telemetry queue unavailable",
        )

    # --------------------------------------------------------------------------
    # Broadcast telemetry to connected dashboard clients
    # --------------------------------------------------------------------------

    await manager.broadcast(log_event)

    # --------------------------------------------------------------------------
    # Immediate response
    # --------------------------------------------------------------------------

    return {
        "status": "accepted",
        "event_id": event_id,
        "message": "Telemetry accepted for processing",
    }


# ==============================================================================
# Cluster Statistics
# ==============================================================================

@app.get("/api/v1/stats")
async def get_cluster_stats():
    return {
        "events_per_sec": 0,
        "ingestion_rate_per_sec": 0,
        "total_logs_ingested": 0,
        "p95_latency_ms": 10,
        "error_ratio": 0.0,
        "error_rate_percent": 0.0,
        "open_incidents_count": 0,
        "active_services_count": 1,
    }


# ==============================================================================
# Incidents
# ==============================================================================

@app.get("/api/v1/incidents")
async def get_incidents(limit: int = 50):
    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100
    return []


# ==============================================================================
# WebSocket
# ==============================================================================

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(websocket)

    except Exception:
        manager.disconnect(websocket)
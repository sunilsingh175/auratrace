from fastapi import FastAPI, Header, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import datetime
import uuid

app = FastAPI(title="AuraTrace Ingestion Service")

# Configure CORS to allow your frontend dashboard on port 3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket Connection Manager for Real-Time Streaming
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(data)
            except Exception:
                pass

manager = ConnectionManager()

class TelemetryPayload(BaseModel):
    service_id: str
    message: Optional[str] = None
    error_type: Optional[str] = None
    raw_stack_trace: Optional[str] = None
    anomaly_score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

@app.post("/api/v1/telemetry", status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(
    payload: TelemetryPayload, 
    x_api_key: Optional[str] = Header(None)
):
    if not x_api_key:
        raise HTTPException(status_code=401, detail="API Key missing")
        
    print(f"Received telemetry for service: {payload.service_id} -> {payload.message}")
    
    log_event = {
        "id": str(uuid.uuid4()),
        "type": "LOG_ENTRY",
        "service_id": payload.service_id,
        "message": payload.message or "No message provided",
        "level": "ERROR" if payload.error_type else "INFO",
        "error_type": payload.error_type,
        "raw_stack_trace": payload.raw_stack_trace,
        "anomaly_score": payload.anomaly_score or 0.0,
        "metadata": payload.metadata or {},
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

    await manager.broadcast(log_event)
    
    return {
        "status": "success",
        "message": "Telemetry event ingested successfully",
        "service_id": payload.service_id
    }

@app.get("/api/v1/stats")
async def get_cluster_stats():
    return {
        "events_per_sec": 2,
        "total_logs_ingested": 50,
        "p95_latency_ms": 10,
        "error_ratio": 0.0,
        "active_services_count": 1
    }

@app.get("/api/v1/incidents")
async def get_incidents(limit: int = 50):
    return []

@app.get("/api/v1/health")
async def health_check():
    return {"status": "healthy"}


@app.websocket("/ws/telemetry")
@app.websocket("ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)        
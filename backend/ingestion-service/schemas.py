"""
AuraTrace Ingestion Service Pydantic Schemas
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TelemetryItem(BaseModel):
    service_id: str = Field(..., example="default-service", description="Unique registered service ID")
    timestamp: Optional[datetime] = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="ISO 8601 UTC timestamp of the log event"
    )
    level: str = Field(
        default="INFO",
        description="Log severity level: DEBUG, INFO, WARN, ERROR, CRITICAL"
    )
    latency_ms: float = Field(default=0.0, ge=0.0, description="Response time or operation duration in milliseconds")
    error_type: Optional[str] = Field(default=None, example="DatabaseConnectionPoolExhausted")
    message: Optional[str] = Field(default=None, example="Failed to acquire connection from pool")
    stack_trace: Optional[str] = Field(default=None, description="Full trace or exception traceback")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Custom contextual key-value pairs")


class TelemetryBatch(BaseModel):
    events: List[TelemetryItem] = Field(..., min_length=1, max_length=5000)


class IngestionResponse(BaseModel):
    status: str = "success"
    ingested_count: int
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class IncidentResponse(BaseModel):
    id: uuid.UUID
    service_id: str
    anomaly_score: float
    status: str
    error_type: Optional[str] = None
    raw_stack_trace: str
    ai_root_cause: Optional[str] = None
    ai_suggested_patch: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class IncidentStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(OPEN|INVESTIGATING|RESOLVED)$")


class ServiceRegister(BaseModel):
    id: str = Field(..., min_length=3, max_length=64)
    name: str = Field(..., min_length=3, max_length=128)
    api_key: Optional[str] = None
    environment: str = Field(default="production", pattern="^(development|staging|production)$")


class StatsResponse(BaseModel):
    total_logs_ingested: int
    ingestion_rate_per_sec: float
    error_rate_percent: float
    p95_latency_ms: float
    open_incidents_count: int
    active_services_count: int

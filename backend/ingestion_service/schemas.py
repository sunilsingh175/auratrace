"""
Pydantic request/response models for the ingestion API.
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, EmailStr, Field


class RuntimeInfo(BaseModel):
    language: Optional[str] = None
    version: Optional[str] = None
    framework: Optional[str] = None
    framework_version: Optional[str] = None
    hostname: Optional[str] = None


class EventPayload(BaseModel):
    """Telemetry event sent by SDK."""
    event_type: str = "error"                    # crash | error | latency | spike | info
    timestamp: Optional[str] = None
    service_name: Optional[str] = "unknown"
    environment: Optional[str] = "production"

    # Error info
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    stack_trace: Optional[str] = None

    # Metrics
    latency_ms: Optional[float] = None
    status_code: Optional[int] = None
    cpu_percent: Optional[float] = None
    memory_mb: Optional[float] = None

    # Context
    runtime: Optional[RuntimeInfo] = None
    request: Optional[Dict[str, Any]] = None
    user: Optional[Dict[str, Any]] = None
    tags: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None

    # SDK metadata
    sdk_name: Optional[str] = None
    sdk_version: Optional[str] = None


class CreateProjectRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    owner_email: Optional[EmailStr] = None


class CreateProjectResponse(BaseModel):
    id: str
    name: str
    slug: str
    api_key: str                                  # returned ONCE
    api_key_prefix: str
    warning: str = "Store this API key securely. It will not be shown again."


class IngestResponse(BaseModel):
    status: str
    event_id: str
    incident_signature: Optional[str] = None


# Legacy compatibility schemas
class TelemetryLog(BaseModel):
    service_id: str = Field(..., min_length=1)
    runtime: Optional[str] = "node"
    environment: Optional[str] = "production"
    version: Optional[str] = "1.0.0"
    message: Optional[str] = None
    level: Optional[str] = "INFO"
    error_type: Optional[str] = None
    stack_trace: Optional[str] = None
    raw_stack_trace: Optional[str] = None
    latency_ms: Optional[float] = None
    status_code: Optional[int] = None
    anomaly_score: Optional[float] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ProjectCreatePayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class ProjectResponse(BaseModel):
    id: str
    name: str
    api_key: Optional[str] = None
    created_at: str
    service_count: Optional[int] = 0
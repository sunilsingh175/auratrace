from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List

class TelemetryLog(BaseModel):
    service_id: str = Field(..., min_length=1, description="Microservice identifier e.g. 'payment-service'")
    runtime: Optional[str] = Field("node", description="Runtime environment e.g. 'node', 'python', 'java'")
    environment: Optional[str] = Field("production", description="Deployment environment: production, staging, development")
    version: Optional[str] = Field("1.0.0", description="Application semantic release version")
    message: Optional[str] = None
    level: Optional[str] = "INFO"
    error_type: Optional[str] = None
    stack_trace: Optional[str] = None
    raw_stack_trace: Optional[str] = None
    latency_ms: Optional[float] = Field(default=None, ge=0)
    status_code: Optional[int] = Field(default=None, ge=100, le=599)
    anomaly_score: Optional[float] = Field(default=None, ge=0, le=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)

class ProjectCreatePayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="AuraTrace Project Name e.g. 'My E-Commerce App'")

class ProjectResponse(BaseModel):
    id: str
    name: str
    api_key: Optional[str] = None
    created_at: str
    service_count: Optional[int] = 0
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class TelemetryLog(BaseModel):
    service_id: str = Field(..., min_length=1)
    message: Optional[str] = None
    level: Optional[str] = "INFO"
    error_type: Optional[str] = None
    stack_trace: Optional[str] = None
    raw_stack_trace: Optional[str] = None
    latency_ms: Optional[float] = Field(default=None, ge=0)
    status_code: Optional[int] = Field(default=None, ge=100, le=599)
    anomaly_score: Optional[float] = Field(default=None, ge=0, le=1)
    metadata: Dict[str, Any] = Field(default_factory=dict)
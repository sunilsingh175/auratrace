from pydantic import BaseModel
from typing import Optional

class TelemetryLog(BaseModel):
    service_id: str
    log_message: str
    level: str
    timestamp: float
    trace_id: Optional[str] = None
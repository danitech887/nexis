from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class TelemetryEvent(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    system_id: str = Field(..., description="Target system identifier e.g. shulebase")
    software_id: Optional[str] = Field(None, description="Optional parent software ID")
    level: str = Field("INFO", description="Log level: INFO, WARN, ERROR, CRITICAL")
    tag: str = Field("application", description="Component or subsystem tag")
    message: str = Field(..., description="Event or log message payload")
    stack_trace: Optional[str] = Field(None, description="Optional runtime error stack trace")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context/attributes")


class TelemetryBatch(BaseModel):
    system_id: str
    events: List[TelemetryEvent]


class MetricPoint(BaseModel):
    metric_name: str
    value: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    tags: Dict[str, str] = Field(default_factory=dict)


class TelemetryIngestResponse(BaseModel):
    status: str = "accepted"
    ingested_count: int
    system_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

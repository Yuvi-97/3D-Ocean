from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class AlertItem(BaseModel):
    id: str
    level: str  # 'high', 'medium', 'warning', 'info'
    type: str
    region: str
    anomaly_val: str
    description: str
    coordinates: Optional[Dict[str, float]] = None

class AlertsResponse(BaseModel):
    generated_at: str
    alerts_count: int
    alerts: List[AlertItem]

class HovmollerLocation(BaseModel):
    lat: float
    lon: float

class HovmollerResponse(BaseModel):
    location: HovmollerLocation
    variable: str
    unit: str
    time_axis: List[str]
    depth_axis: List[float]
    matrix: List[List[Optional[float]]]

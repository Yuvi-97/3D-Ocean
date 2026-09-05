from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class FloatLatestPosition(BaseModel):
    lat: float
    lon: float
    timestamp: str

class ArgoFloatItem(BaseModel):
    wmo_id: str
    institution: Optional[str] = "INCOIS"
    profiler_type: Optional[str] = None
    total_profiles: int
    latest_position: FloatLatestPosition
    data_modes: List[str] = ["R", "D"]
    has_bgc: bool = False

class ArgoFloatsResponse(BaseModel):
    total_floats: int
    floats: List[ArgoFloatItem]

class TrajectoryPoint(BaseModel):
    cycle: Optional[int] = None
    profile_id: str
    profile_file: str
    lat: float
    lon: float
    date: str

class ArgoTrajectoryResponse(BaseModel):
    wmo_id: str
    cycle_count: int
    trajectory: List[TrajectoryPoint]

class ArgoProfileLevel(BaseModel):
    pres: Optional[float] = None
    pres_qc: Optional[int] = None
    temp: Optional[float] = None
    temp_qc: Optional[int] = None
    psal: Optional[float] = None
    psal_qc: Optional[int] = None
    pres_adjusted: Optional[float] = None
    temp_adjusted: Optional[float] = None
    psal_adjusted: Optional[float] = None

class ArgoProfileResponse(BaseModel):
    profile_id: str
    wmo_id: str
    timestamp: str
    location: Dict[str, float]
    profile_qc: Dict[str, Any]
    levels_count: int
    data: List[ArgoProfileLevel]

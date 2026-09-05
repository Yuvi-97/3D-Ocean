from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class GliderDateRange(BaseModel):
    start: str
    end: str

class GliderBBox(BaseModel):
    min_lat: float
    max_lat: float
    min_lon: float
    max_lon: float

class GliderItem(BaseModel):
    glider_id: str
    wmo: str
    mission_name: str
    total_dives: int
    date_range: GliderDateRange
    bbox: GliderBBox
    max_recorded_pressure_dbar: float
    sensors: List[str]

class GlidersResponse(BaseModel):
    total_gliders: int
    gliders: List[GliderItem]

class GliderTrackPoint(BaseModel):
    dive: Optional[int] = None
    timestamp: str
    lat: float
    lon: float
    max_pres: Optional[float] = None
    profile_file: str

class GliderTrackResponse(BaseModel):
    glider_id: str
    points_count: int
    track: List[GliderTrackPoint]

class GliderProfileLevel(BaseModel):
    depth_m: Optional[float] = None
    temp: Optional[float] = None
    temp_qc: Optional[int] = None
    psal: Optional[float] = None
    psal_qc: Optional[int] = None
    doxy_umol_kg: Optional[float] = None
    doxy_qc: Optional[int] = None
    cndc: Optional[float] = None
    pitch: Optional[float] = None
    roll: Optional[float] = None

class GliderProfileResponse(BaseModel):
    profile_id: str
    glider_id: str
    timestamp: str
    location: Dict[str, float]
    max_pressure_dbar: Optional[float] = None
    levels_count: int
    data: List[GliderProfileLevel]

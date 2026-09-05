from typing import List, Optional, Tuple, Any
from pydantic import BaseModel

class ModelSliceResponse(BaseModel):
    variable: str
    unit: str
    time_index: int
    date: str
    depth_index: int
    depth_m: float
    grid_shape: Tuple[int, int]
    latitudes: List[float]
    longitudes: List[float]
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    mean_value: Optional[float] = None
    values: List[List[Optional[float]]]

class PointCoord(BaseModel):
    lat: float
    lon: float

class PointProfileLevel(BaseModel):
    depth_m: float
    thetao: Optional[float] = None
    so: Optional[float] = None
    uo: Optional[float] = None
    vo: Optional[float] = None
    speed: Optional[float] = None

class PointProfileResponse(BaseModel):
    query_point: PointCoord
    nearest_grid_point: PointCoord
    date: str
    time_index: int
    profile: List[PointProfileLevel]

class CurrentVectorItem(BaseModel):
    lat: float
    lon: float
    uo: Optional[float] = None
    vo: Optional[float] = None
    speed: Optional[float] = None
    direction_deg: Optional[float] = None

class VectorCurrentsResponse(BaseModel):
    date: str
    time_index: int
    depth_m: float
    depth_index: int
    total_vectors: int
    vectors: List[CurrentVectorItem]

class TransectCoord(BaseModel):
    lat: float
    lon: float

class TransectResponse(BaseModel):
    variable: str
    unit: str
    time_index: int
    date: str
    num_points: int
    distances_km: List[float]
    coordinates: List[TransectCoord]
    depths_m: List[float]
    matrix: List[List[Optional[float]]]

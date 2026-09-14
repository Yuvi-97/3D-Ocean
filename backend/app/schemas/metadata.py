from typing import List, Optional
from pydantic import BaseModel

class SpatialCoverage(BaseModel):
    lat_min: float
    lat_max: float
    lon_min: float
    lon_max: float
    lat_points: int
    lon_points: int
    resolution_deg: float

class TemporalCoverage(BaseModel):
    start_date: str
    end_date: str
    total_steps: int
    step_interval: str

class VariableMetadata(BaseModel):
    name: str
    standard_name: Optional[str] = None
    long_name: Optional[str] = None
    unit: str
    valid_min: Optional[float] = None
    valid_max: Optional[float] = None

class InSituInventory(BaseModel):
    argo_floats_count: int
    argo_profiles_count: int
    gliders_count: int
    glider_profiles_count: int

class DatasetOverviewResponse(BaseModel):
    dataset: str
    data_source: str = "LOCAL"
    dataset_repo: Optional[str] = None
    spatial_coverage: SpatialCoverage
    temporal_coverage: TemporalCoverage
    depth_levels_count: int
    variables: List[VariableMetadata]
    in_situ_inventory: InSituInventory

class DepthLevelItem(BaseModel):
    index: int
    depth_m: float
    zone: str

class TimeStepItem(BaseModel):
    index: int
    date: str
    label: str

class LevelsResponse(BaseModel):
    depth_levels: List[DepthLevelItem]
    time_steps: List[TimeStepItem]

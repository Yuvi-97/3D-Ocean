from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class ColocatedObs(BaseModel):
    type: str
    profile_id: str
    wmo: str
    lat: float
    lon: float
    timestamp: str

class ColocatedModel(BaseModel):
    time_index: int
    model_date: str
    grid_lat: float
    grid_lon: float

class ColocatedPairItem(BaseModel):
    pair_id: str
    observation: ColocatedObs
    model: ColocatedModel
    separation_km: float
    delta_hours: float

class ColocatedPairsResponse(BaseModel):
    tolerance: Dict[str, float]
    total_matched_pairs: int
    matches: List[ColocatedPairItem]

class ComparisonMetadata(BaseModel):
    observation_id: str
    platform: str
    variable: str
    unit: str
    lat: float
    lon: float
    date: str

class ValidationMetrics(BaseModel):
    rmse: float
    mean_bias: float
    correlation_r: float
    max_absolute_error: float
    matched_levels: int

class DualProfileLevel(BaseModel):
    depth_m: float
    obs_value: Optional[float] = None
    model_value: Optional[float] = None
    delta: Optional[float] = None

class DualProfileResponse(BaseModel):
    comparison_metadata: ComparisonMetadata
    validation_metrics: ValidationMetrics
    levels: List[DualProfileLevel]

class ValidationStatisticsResponse(BaseModel):
    variable: str
    pairs_analyzed: int
    overall_rmse: float
    overall_mean_bias: float
    overall_r: float
    bias_distribution: Dict[str, float]
    status: str

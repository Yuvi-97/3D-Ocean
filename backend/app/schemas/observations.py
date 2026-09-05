from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class SpatialObservationItem(BaseModel):
    id: str
    type: str  # 'argo' or 'glider'
    platform_id: str
    timestamp: str
    lat: float
    lon: float
    max_depth_m: Optional[float] = None
    qc_summary: Optional[str] = "good"

class SpatialSearchResponse(BaseModel):
    total_found: int
    argo_count: int
    glider_count: int
    observations: List[SpatialObservationItem]

class CatalogRecordItem(BaseModel):
    record_id: str
    platform_type: str
    wmo: str
    institution: Optional[str] = None
    date: str
    latitude: float
    longitude: float
    levels: Optional[int] = None
    ocean: Optional[str] = "Indian Ocean"
    file_path: str

class CatalogResponse(BaseModel):
    page: int
    page_size: int
    total_records: int
    total_pages: int
    items: List[CatalogRecordItem]

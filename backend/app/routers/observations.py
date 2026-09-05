"""
Integrated In-Situ Observation router: spatial bounding-box discovery and paginated catalog search.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from ..services.observation_service import ObservationService, get_observation_service
from ..schemas.observations import SpatialSearchResponse, CatalogResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/observations",
    tags=["Integrated In-Situ Observations"],
    responses={
        400: {"description": "Invalid parameters"},
        500: {"description": "Internal server error"},
    },
)

@router.get(
    "/spatial-search",
    response_model=SpatialSearchResponse,
    summary="Spatial discovery of in-situ platforms",
    description="Returns all Argo floats and underwater gliders present inside a bounding box and optional date window.",
)
async def spatial_search(
    bbox: str = Query(..., description="Bounding box 'min_lon,min_lat,max_lon,max_lat' (e.g. '40,-20,100,25')"),
    start_date: Optional[str] = Query(None, description="Start date ISO string (e.g. '2026-06-01')"),
    end_date: Optional[str] = Query(None, description="End date ISO string (e.g. '2026-06-23')"),
    platform_type: str = Query("all", description="'all', 'argo', or 'glider'"),
    min_qc: int = Query(2, ge=1, le=4, description="Quality control flag threshold"),
    service: ObservationService = Depends(get_observation_service),
) -> SpatialSearchResponse:
    try:
        return service.spatial_search(
            bbox=bbox,
            start_date=start_date,
            end_date=end_date,
            platform_type=platform_type,
            min_qc=min_qc,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in spatial observation search: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/catalog",
    response_model=CatalogResponse,
    summary="Paginated observation data catalog",
    description="Multi-criteria paginated catalog for the Observations page with sorting and filtering.",
)
async def get_catalog(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=5, le=100, description="Items per page"),
    platform_type: Optional[str] = Query(None, description="Filter: 'argo' or 'glider'"),
    wmo: Optional[str] = Query(None, description="Filter by float or glider WMO ID"),
    sort_by: str = Query("date_desc", description="Sorting: 'date_desc' or 'date_asc'"),
    service: ObservationService = Depends(get_observation_service),
) -> CatalogResponse:
    try:
        return service.get_catalog(
            page=page,
            page_size=page_size,
            platform_type=platform_type,
            wmo=wmo,
            sort_by=sort_by,
        )
    except Exception as e:
        logger.error(f"Error in observation catalog: {e}")
        raise HTTPException(status_code=500, detail=str(e))

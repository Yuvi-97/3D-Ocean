"""
Argo Profiling Floats API router: fleet inventory, drift trajectories, and CTD soundings.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query, Path

from ..services.argo_service import ArgoService, get_argo_service
from ..schemas.argo import (
    ArgoFloatsResponse, ArgoTrajectoryResponse, ArgoProfileResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/argo",
    tags=["Argo Profiling Floats"],
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Internal server error"},
    },
)

@router.get(
    "/floats",
    response_model=ArgoFloatsResponse,
    summary="Get active Argo float fleet inventory",
    description="Returns list of unique Argo floats, their latest coordinates, update timestamps, and profile counts.",
)
async def get_floats(
    active_only: bool = Query(True, description="Filter active floats only"),
    bbox: Optional[str] = Query(None, description="Optional bounding box 'min_lon,min_lat,max_lon,max_lat'"),
    service: ArgoService = Depends(get_argo_service),
) -> ArgoFloatsResponse:
    try:
        return service.get_floats(active_only=active_only, bbox=bbox)
    except Exception as e:
        logger.error(f"Error fetching Argo floats: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/floats/{wmo_id}/trajectory",
    response_model=ArgoTrajectoryResponse,
    summary="Get drift trajectory of a specific float",
    description="Returns the chronological sequence of surface fixes and profile cycles for a float WMO ID.",
)
async def get_trajectory(
    wmo_id: str = Path(..., description="Argo float WMO identifier (e.g. '1902669')"),
    service: ArgoService = Depends(get_argo_service),
) -> ArgoTrajectoryResponse:
    try:
        return service.get_float_trajectory(wmo_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching trajectory for float {wmo_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/profiles/{profile_id}",
    response_model=ArgoProfileResponse,
    summary="Get individual CTD vertical profile",
    description="Reads the physical NetCDF profile file on disk, returning sorted pressure, temperature, salinity, and QC flags.",
)
async def get_profile(
    profile_id: str = Path(..., description="Profile identifier (e.g. 'R1902669_085')"),
    qc_filter: Optional[str] = Query(None, description="Comma-separated accepted QC flags (e.g. '1,2')"),
    service: ArgoService = Depends(get_argo_service),
) -> ArgoProfileResponse:
    try:
        parsed_qc = None
        if qc_filter:
            parsed_qc = [int(x.strip()) for x in qc_filter.split(",") if x.strip().isdigit()]

        return service.get_profile(profile_id, qc_filter=parsed_qc)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error reading Argo profile {profile_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

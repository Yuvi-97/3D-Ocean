"""
Autonomous Underwater Gliders API router: fleet inventory, mission tracks, and CTD + DOXY soundings.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query, Path

from ..services.glider_service import GliderService, get_glider_service
from ..schemas.glider import (
    GlidersResponse, GliderTrackResponse, GliderProfileResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/gliders",
    tags=["Underwater Gliders"],
    responses={
        404: {"description": "Resource not found"},
        500: {"description": "Internal server error"},
    },
)

@router.get(
    "",
    response_model=GlidersResponse,
    summary="Get autonomous glider fleet inventory",
    description="Returns list of deployed gliders (R6801558 and R8901048), mission envelopes, total dives, and sensor suite.",
)
async def get_gliders(
    service: GliderService = Depends(get_glider_service),
) -> GlidersResponse:
    try:
        return service.get_gliders()
    except Exception as e:
        logger.error(f"Error fetching gliders inventory: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/{glider_id}/track",
    response_model=GliderTrackResponse,
    summary="Get glider mission trajectory & dive sequence",
    description="Returns the high-density sawtooth mission path and coordinates for 3D trajectory rendering.",
)
async def get_glider_track(
    glider_id: str = Path(..., description="Glider identifier (e.g. '8901048' or '6801558')"),
    downsample_factor: int = Query(2, ge=1, le=10, description="Sampling decimation factor"),
    service: GliderService = Depends(get_glider_service),
) -> GliderTrackResponse:
    try:
        return service.get_glider_track(glider_id, downsample_factor=downsample_factor)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching track for glider {glider_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/{glider_id}/profiles/{profile_id}",
    response_model=GliderProfileResponse,
    summary="Get glider CTD + Dissolved Oxygen profile",
    description="Reads individual glider dive sounding including temperature, salinity, dissolved oxygen, and pitch/roll attitude.",
)
async def get_glider_profile(
    glider_id: str = Path(..., description="Glider WMO ID (e.g. '8901048')"),
    profile_id: str = Path(..., description="Profile ID (e.g. 'R8901048_20251220_187D')"),
    service: GliderService = Depends(get_glider_service),
) -> GliderProfileResponse:
    try:
        return service.get_profile(glider_id, profile_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error reading glider profile {profile_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

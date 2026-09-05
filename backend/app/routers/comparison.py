"""
Model vs In-Situ Observation Comparison router: space-time colocation, dual profile extraction,
and operational validation metrics (RMSE, Bias, Pearson r).
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from ..services.comparison_service import ComparisonService, get_comparison_service
from ..schemas.comparison import (
    ColocatedPairsResponse, DualProfileResponse, ValidationStatisticsResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/comparison",
    tags=["Model vs Observation Comparison"],
    responses={
        400: {"description": "Invalid parameters"},
        500: {"description": "Internal server error"},
    },
)

@router.get(
    "/colocated-pairs",
    response_model=ColocatedPairsResponse,
    summary="Find space-time colocated model and in-situ pairs",
    description="Discovers observation soundings occurring within a spatial tolerance radius and time window of CMEMS model fields.",
)
async def get_colocated_pairs(
    spatial_tolerance_km: float = Query(25.0, ge=1.0, le=100.0, description="Spatial tolerance radius in km"),
    time_tolerance_hours: float = Query(12.0, ge=1.0, le=72.0, description="Temporal window tolerance in hours"),
    variable: str = Query("thetao", description="Target parameter: 'thetao' or 'so'"),
    service: ComparisonService = Depends(get_comparison_service),
) -> ColocatedPairsResponse:
    try:
        return service.find_colocated_pairs(
            spatial_tolerance_km=spatial_tolerance_km,
            time_tolerance_hours=time_tolerance_hours,
            variable=variable,
        )
    except Exception as e:
        logger.error(f"Error finding colocated pairs: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/dual-profile",
    response_model=DualProfileResponse,
    summary="Get colocated model vs observation dual profile",
    description="Extracts both in-situ and model soundings, interpolates to matching depth nodes, and computes RMSE, Bias, and error curves.",
)
async def get_dual_profile(
    observation_type: str = Query(..., description="'argo' or 'glider'"),
    profile_id: str = Query(..., description="Observation profile ID (e.g. 'R1902669_085')"),
    variable: str = Query("thetao", description="'thetao' or 'so'"),
    time_index: Optional[int] = Query(None, ge=0, le=22, description="Optional model snapshot index (0-22)"),
    service: ComparisonService = Depends(get_comparison_service),
) -> DualProfileResponse:
    try:
        return service.get_dual_profile(
            observation_type=observation_type,
            profile_id=profile_id,
            variable=variable,
            time_index=time_index,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error computing dual profile comparison: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/statistics",
    response_model=ValidationStatisticsResponse,
    summary="Get regional model validation scorecards",
    description="Returns aggregate statistical error metrics (RMSE, Bias, Correlation) across the Indian Ocean basin.",
)
async def get_validation_statistics(
    variable: str = Query("thetao", description="'thetao' or 'so'"),
    depth_range: Optional[str] = Query(None, description="Optional depth interval e.g. '0,200'"),
    service: ComparisonService = Depends(get_comparison_service),
) -> ValidationStatisticsResponse:
    try:
        return service.get_validation_statistics(
            variable=variable,
            depth_range=depth_range,
        )
    except Exception as e:
        logger.error(f"Error retrieving validation statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

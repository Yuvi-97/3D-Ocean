"""
CMEMS 3D Numerical Model endpoints: horizontal grid slices, water column profiles,
current vector fields, and vertical transects.
"""

import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query

from ..services.model_service import ModelService, get_model_service
from ..schemas.model import (
    ModelSliceResponse, PointProfileResponse, VectorCurrentsResponse, TransectResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/model",
    tags=["CMEMS Numerical Model"],
    responses={
        400: {"description": "Invalid query parameters"},
        500: {"description": "Internal server error"},
    },
)

@router.get(
    "/slice",
    response_model=ModelSliceResponse,
    summary="Get 2D horizontal slice at depth & time",
    description="Extracts a 2D scalar field for visualization on the 3D globe. Supports downsampling stride and bounding box.",
)
async def get_slice(
    variable: str = Query(..., description="Target variable: 'thetao', 'so', 'uo', 'vo', or 'speed'"),
    time_index: int = Query(0, ge=0, le=22, description="Time step index (0 to 22)"),
    depth_index: int = Query(0, ge=0, le=35, description="Depth level index (0 to 35)"),
    stride: int = Query(2, ge=1, le=16, description="Spatial decimation step for responsive rendering"),
    bbox: Optional[str] = Query(None, description="Optional bounding box 'min_lon,min_lat,max_lon,max_lat'"),
    service: ModelService = Depends(get_model_service),
) -> ModelSliceResponse:
    try:
        return service.get_slice(
            variable=variable,
            time_index=time_index,
            depth_index=depth_index,
            stride=stride,
            bbox=bbox,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in model slice: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate model slice: {e}")

@router.get(
    "/point-profile",
    response_model=PointProfileResponse,
    summary="Get vertical water column profile at point",
    description="Probes the 3D model at arbitrary lat/lon coordinates across all 36 depth levels.",
)
async def get_point_profile(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Target latitude coordinate"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Target longitude coordinate"),
    time_index: int = Query(22, ge=0, le=22, description="Time step index (0 to 22)"),
    service: ModelService = Depends(get_model_service),
) -> PointProfileResponse:
    try:
        return service.get_point_profile(
            latitude=latitude,
            longitude=longitude,
            time_index=time_index,
        )
    except Exception as e:
        logger.error(f"Error in point profile: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract point profile: {e}")

@router.get(
    "/vector-currents",
    response_model=VectorCurrentsResponse,
    summary="Get ocean current velocity vector field",
    description="Extracts eastward (uo) and northward (vo) current velocity vectors, speed, and heading for vector flow layers.",
)
async def get_vector_currents(
    time_index: int = Query(22, ge=0, le=22, description="Time step index (0 to 22)"),
    depth_index: int = Query(0, ge=0, le=35, description="Depth level index (0 to 35)"),
    grid_step: int = Query(6, ge=2, le=30, description="Grid sampling decimation step"),
    bbox: Optional[str] = Query(None, description="Optional bounding box 'min_lon,min_lat,max_lon,max_lat'"),
    service: ModelService = Depends(get_model_service),
) -> VectorCurrentsResponse:
    try:
        return service.get_vector_currents(
            time_index=time_index,
            depth_index=depth_index,
            grid_step=grid_step,
            bbox=bbox,
        )
    except Exception as e:
        logger.error(f"Error in vector currents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate current vectors: {e}")

@router.get(
    "/transect",
    response_model=TransectResponse,
    summary="Get vertical ocean transect / cross-section",
    description="Computes vertical curtain cross-section between two geographic coordinates across all depth levels.",
)
async def get_transect(
    start_coord: str = Query(..., description="Starting coordinate 'lat1,lon1' (e.g. '5.0,80.0')"),
    end_coord: str = Query(..., description="Ending coordinate 'lat2,lon2' (e.g. '20.0,90.0')"),
    variable: str = Query("thetao", description="Variable: 'thetao', 'so', or 'speed'"),
    time_index: int = Query(22, ge=0, le=22, description="Time step index (0 to 22)"),
    num_samples: int = Query(100, ge=10, le=300, description="Number of interpolation stations"),
    service: ModelService = Depends(get_model_service),
) -> TransectResponse:
    try:
        return service.get_transect(
            start_coord=start_coord,
            end_coord=end_coord,
            variable=variable,
            time_index=time_index,
            num_samples=num_samples,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in transect calculation: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate ocean transect: {e}")

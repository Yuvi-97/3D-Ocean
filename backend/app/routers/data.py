"""
API Routers for ocean data endpoints.

Design Decisions:
1. **FastAPI Router**: Using FastAPI's router pattern for clean, modular API structure.
2. **Query Parameters**: GET requests use query params for stateless, cacheable requests.
3. **Dependency Injection**: OceanDataService is injected per-request for clean separation.
4. **Error Handling**: HTTPException with proper status codes for client and server errors.
5. **Documentation**: Extensive docstrings and OpenAPI examples for API discoverability.
"""

from typing import Optional
import logging

from fastapi import APIRouter, HTTPException, Depends, Query

from ..services.ocean_data import (
    OceanDataService,
    get_ocean_service,
    DatasetMetadata,
    TileResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/data",
    tags=["data"],
    responses={
        500: {"description": "Internal server error"},
        400: {"description": "Bad request - invalid parameters"},
    },
)


# ============================================================================
# Metadata Endpoint
# ============================================================================
@router.get(
    "/metadata",
    response_model=DatasetMetadata,
    summary="Get dataset metadata",
    description="Returns complete metadata about the ocean dataset including variables, "
    "dimensions, time range, geographic extent, and data types.",
    responses={
        200: {
            "description": "Metadata retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "title": "daily mean fields from Global Ocean Physics...",
                        "institution": "MERCATOR OCEAN",
                        "source": "MERCATOR GLORYS12V1",
                        "variables": [
                            {
                                "name": "thetao",
                                "long_name": "Temperature",
                                "units": "degrees_C",
                                "valid_min": -2.999,
                                "valid_max": 36.605,
                            }
                        ],
                        "dimensions": {
                            "time": 7,
                            "depth": 36,
                            "latitude": 301,
                            "longitude": 600,
                        },
                        "latitude_range": [0.0, 25.0],
                        "longitude_range": [50.0, 99.92],
                    }
                }
            },
        }
    },
)
async def get_metadata(
    service: OceanDataService = Depends(get_ocean_service),
) -> DatasetMetadata:
    """
    Get complete metadata about the ocean dataset.
    
    This endpoint is useful for:
    - Frontend initialization (to know what variables are available)
    - Understanding the data range and structure
    - Building UI controls (dropdowns for variables, time, depth)
    
    Performance: O(1) - only reads metadata, never loads actual data arrays.
    Typical response time: < 10ms
    """
    try:
        metadata = service.get_metadata()
        logger.info("Metadata request successful")
        return metadata
    except Exception as e:
        logger.error(f"Error in metadata endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve metadata: {str(e)}",
        )


# ============================================================================
# Tile Data Endpoint
# ============================================================================
@router.get(
    "/tile",
    response_model=TileResponse,
    summary="Get a data tile",
    description="Retrieve a subset of ocean data for visualization. Supports filtering by "
    "variable, time, depth, and geographic region. Returns grid data optimized for Three.js.",
    responses={
        200: {
            "description": "Tile data retrieved successfully",
        },
        400: {
            "description": "Bad request - invalid parameters or out of range",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Unknown variable 'invalid'. Available: ['thetao', 'so', 'uo', 'vo']"
                    }
                }
            },
        },
    },
)
async def get_tile(
    variable: str = Query(
        ...,
        description="Variable to retrieve ('thetao', 'so', 'uo', 'vo')",
    ),
    time_index: int = Query(
        ...,
        ge=0,
        le=22,
        description="Time index (0-22). Use /api/v1/metadata/levels to see time values.",
    ),
    depth_index: int = Query(
        ...,
        ge=0,
        le=35,
        description="Depth index (0-35). Use /api/v1/metadata/levels to see depth values.",
    ),
    latitude_start: Optional[int] = Query(
        None,
        ge=0,
        description="Start latitude index (inclusive, default: 0)",
    ),
    latitude_end: Optional[int] = Query(
        None,
        le=841,
        description="End latitude index (exclusive, default: 841)",
    ),
    longitude_start: Optional[int] = Query(
        None,
        ge=0,
        description="Start longitude index (inclusive, default: 0)",
    ),
    longitude_end: Optional[int] = Query(
        None,
        le=1201,
        description="End longitude index (exclusive, default: 1201)",
    ),
    service: OceanDataService = Depends(get_ocean_service),
) -> TileResponse:
    """
    Retrieve a data tile optimized for 3D visualization.
    
    Use Cases:
    1. **Full dataset at surface**: time_index=0, depth_index=0 (no geographic bounds)
    2. **Regional deep-water analysis**: Same + geographic bounds + depth_index=20
    3. **Time series at a point**: Use small geographic bounds + iterate time_index
    
    Design Notes:
    - Returns data as a 2D grid (latitude × longitude) for easy three.js texture generation.
    - Includes statistical summaries (min, max, mean) for color mapping.
    - Geographic bounds are represented as integer indices for efficiency.
    
    Performance Expectations:
    - Small tile (50×50): ~10-50ms
    - Medium tile (300×300): ~100-500ms
    - Large tile (500×500): ~500-2000ms
    
    Typical response size: 50-500KB (varies with tile size)
    
    Args:
        variable: One of 'thetao' (temperature), 'so' (salinity), 'uo' (E velocity), 'vo' (N velocity)
        time_index: Which time step to retrieve (0-6 in this dataset)
        depth_index: Which depth level to retrieve (0-35 in this dataset)
        latitude_start, latitude_end: Geographic subsetting (optional)
        longitude_start, longitude_end: Geographic subsetting (optional)
    
    Returns:
        TileResponse with grid data, statistics, and metadata
    
    Raises:
        HTTPException 400: Invalid parameters
        HTTPException 500: Server error during data loading
    """
    try:
        logger.info(
            f"Tile request: {variable} [t={time_index}, d={depth_index}, "
            f"lat={latitude_start}:{latitude_end}, lon={longitude_start}:{longitude_end}]"
        )
        
        tile = service.get_tile(
            variable=variable,
            time_index=time_index,
            depth_index=depth_index,
            latitude_start=latitude_start,
            latitude_end=latitude_end,
            longitude_start=longitude_start,
            longitude_end=longitude_end,
        )
        
        logger.info(
            f"Tile request successful: {tile.latitude_count}×{tile.longitude_count} grid"
        )
        return tile
        
    except ValueError as e:
        # Client error - invalid request
        logger.warning(f"Invalid tile request: {e}")
        raise HTTPException(
            status_code=400,
            detail=str(e),
        )
    except Exception as e:
        # Server error
        logger.error(f"Error in tile endpoint: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve tile: {str(e)}",
        )


# ============================================================================
# Health Check Endpoint (Optional but useful)
# ============================================================================
@router.get(
    "/health",
    summary="Health check",
    description="Simple endpoint to verify the server and dataset are accessible.",
    responses={
        200: {
            "description": "Server is healthy",
            "content": {
                "application/json": {
                    "example": {
                        "status": "healthy",
                        "dataset": "loaded",
                    }
                }
            },
        },
        500: {"description": "Server or dataset is not accessible"},
    },
)
async def health_check(
    service: OceanDataService = Depends(get_ocean_service),
) -> dict:
    """
    Quick health check to verify server and dataset connectivity.
    
    Useful for:
    - Load balancer health checks
    - Monitoring scripts
    - Debugging connection issues
    """
    try:
        # Try to access basic metadata to confirm dataset is accessible
        _ = service.get_metadata()
        return {
            "status": "healthy",
            "dataset": "loaded",
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Dataset not accessible: {str(e)}",
        )

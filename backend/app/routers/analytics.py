"""
Ocean Analytics & Marine Hazards router: marine heatwaves, boundary current shears,
hypoxic zones, and Hovmöller time-depth diagrams.
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Query

from ..services.analytics_service import AnalyticsService, get_analytics_service
from ..schemas.analytics import AlertsResponse, HovmollerResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analytics",
    tags=["Ocean Analytics & Marine Hazards"],
    responses={
        400: {"description": "Invalid parameters"},
        500: {"description": "Internal server error"},
    },
)

@router.get(
    "/alerts",
    response_model=AlertsResponse,
    summary="Get operational marine hazard alerts",
    description="Evaluates ocean thermal anomalies, intense current velocity shears, and hypoxic zones from physical observations.",
)
async def get_alerts(
    time_index: int = Query(22, ge=0, le=22, description="Time step index (0 to 22)"),
    service: AnalyticsService = Depends(get_analytics_service),
) -> AlertsResponse:
    try:
        return service.get_alerts(time_index=time_index)
    except Exception as e:
        logger.error(f"Error computing marine hazard alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/hovmoller",
    response_model=HovmollerResponse,
    summary="Get time-depth Hovmöller diagram matrix",
    description="Computes vertical thermocline or current velocity evolution across the 23 June daily snapshots at a given location.",
)
async def get_hovmoller(
    latitude: float = Query(..., ge=-90.0, le=90.0, description="Target latitude"),
    longitude: float = Query(..., ge=-180.0, le=180.0, description="Target longitude"),
    variable: str = Query("thetao", description="'thetao', 'so', or 'speed'"),
    service: AnalyticsService = Depends(get_analytics_service),
) -> HovmollerResponse:
    try:
        return service.get_hovmoller(
            latitude=latitude,
            longitude=longitude,
            variable=variable,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating Hovmöller diagram: {e}")
        raise HTTPException(status_code=500, detail=str(e))

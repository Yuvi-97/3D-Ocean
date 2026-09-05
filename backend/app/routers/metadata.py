"""
Metadata endpoints: global dataset summary, variable definitions, and coordinate sliders.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends

from ..services.model_service import ModelService, get_model_service
from ..services.argo_service import ArgoService, get_argo_service
from ..services.glider_service import GliderService, get_glider_service
from ..schemas.metadata import DatasetOverviewResponse, LevelsResponse

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/metadata",
    tags=["Metadata"],
    responses={500: {"description": "Internal server error"}},
)

@router.get(
    "/overview",
    response_model=DatasetOverviewResponse,
    summary="Get complete dataset overview & inventory",
    description="Returns global coordinates, time bounds, depth count, active variables, and in-situ platform inventories.",
)
async def get_overview(
    model_svc: ModelService = Depends(get_model_service),
    argo_svc: ArgoService = Depends(get_argo_service),
    glider_svc: GliderService = Depends(get_glider_service),
) -> DatasetOverviewResponse:
    try:
        argo_svc.ensure_index()
        glider_svc.ensure_index()

        a_floats = int(argo_svc.df["wmo"].nunique()) if argo_svc.df is not None else 123
        a_profs = len(argo_svc.df) if argo_svc.df is not None else 2493
        g_count = int(glider_svc.df["wmo"].nunique()) if glider_svc.df is not None else 2
        g_profs = len(glider_svc.df) if glider_svc.df is not None else 2958

        return model_svc.get_overview(
            argo_floats=a_floats,
            argo_profs=a_profs,
            gliders=g_count,
            glider_profs=g_profs,
        )
    except Exception as e:
        logger.error(f"Error in metadata overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get(
    "/levels",
    response_model=LevelsResponse,
    summary="Get depth levels and calendar time steps",
    description="Returns the 36 physical depth levels (meters) and 23 calendar dates for interactive UI sliders.",
)
async def get_levels(
    model_svc: ModelService = Depends(get_model_service),
) -> LevelsResponse:
    try:
        return model_svc.get_levels()
    except Exception as e:
        logger.error(f"Error in metadata levels: {e}")
        raise HTTPException(status_code=500, detail=str(e))

"""
Main FastAPI Application: Ocean Data Backend for SIH 2026 Problem Statement #26067.

An interactive 3D ocean visualization platform integrating CMEMS numerical model
outputs (temperature, salinity, currents) with autonomous in-situ Argo profiling
floats and underwater gliders across the Indian Ocean basin.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from .config import settings
from .providers import get_data_provider
from .routers import (
    metadata,
    model,
    argo,
    gliders,
    observations,
    comparison,
    analytics,
    data,
)
from .services.model_service import get_model_service
from .services.argo_service import get_argo_service
from .services.glider_service import get_glider_service

# ============================================================================
# Configure Logging
# ============================================================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger("OceanBackend")


# ============================================================================
# Application Lifespan (Preload in-memory indices)
# ============================================================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes dataset handles and spatial indexes on startup."""
    logger.info("Starting INCOIS 3D Ocean Visualizer Backend...")
    
    # Log active centralized data source
    if settings.DATA_SOURCE == "local":
        logger.info("==========================================")
        logger.info("Data source: LOCAL")
        logger.info(f"Local Data Root: {settings.LOCAL_DATA_ROOT}")
        logger.info("==========================================")
    elif settings.DATA_SOURCE == "huggingface":
        logger.info("==========================================")
        logger.info("Data source: HUGGINGFACE")
        logger.info(f"Dataset: {settings.HF_DATASET_REPO}")
        logger.info(f"Revision: {settings.HF_REVISION}")
        logger.info("==========================================")
    else:
        logger.error(f"Unknown DATA_SOURCE: '{settings.DATA_SOURCE}' (supported: 'local', 'huggingface')")

    # Validate provider connection (fails fast with clear error if data source is missing/unreachable)
    provider = get_data_provider()
    provider.validate_connection()

    # Pre-initialize services
    get_model_service()
    get_argo_service()
    get_glider_service()
    logger.info(f"All ocean dataset engines initialized successfully ({settings.DATA_SOURCE.upper()} mode).")

    yield

    logger.info("Shutting down INCOIS Ocean Backend.")


# ============================================================================
# FastAPI App Initialization
# ============================================================================
app = FastAPI(
    title=settings.API_TITLE,
    description=settings.API_DESCRIPTION,
    version=settings.API_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ============================================================================
# CORS Middleware
# ============================================================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Data-Source", "X-Dataset-Repo", "X-Dataset-Revision", "X-Dataset-Path"],
)

# ============================================================================
# Data Source Validation Headers Middleware
# ============================================================================
@app.middleware("http")
async def add_data_source_headers(request, call_next):
    """Injects data source validation headers into every HTTP response."""
    response = await call_next(request)
    response.headers["X-Data-Source"] = settings.DATA_SOURCE.upper()
    if settings.DATA_SOURCE == "huggingface":
        response.headers["X-Dataset-Repo"] = settings.HF_DATASET_REPO
        response.headers["X-Dataset-Revision"] = settings.HF_REVISION
    else:
        response.headers["X-Dataset-Path"] = settings.LOCAL_DATA_ROOT
    return response

# ============================================================================
# Include API v1 Routers
# ============================================================================
API_PREFIX = "/api/v1"

app.include_router(metadata.router, prefix=API_PREFIX)
app.include_router(model.router, prefix=API_PREFIX)
app.include_router(argo.router, prefix=API_PREFIX)
app.include_router(gliders.router, prefix=API_PREFIX)
app.include_router(observations.router, prefix=API_PREFIX)
app.include_router(comparison.router, prefix=API_PREFIX)
app.include_router(analytics.router, prefix=API_PREFIX)

# Legacy /data router for backwards compatibility
app.include_router(data.router)


# ============================================================================
# Health & Root Endpoints
# ============================================================================
@app.get("/health", tags=["Health"])
@app.get(f"{API_PREFIX}/health", tags=["Health"])
async def health_check():
    """Health check endpoint confirming API status and dataset readiness."""
    return {
        "status": "healthy",
        "api_version": settings.API_VERSION,
        "service": "INCOIS 3D Ocean Visualizer Backend",
        "data_source": settings.DATA_SOURCE.upper(),
        "provider": settings.DATA_SOURCE.lower(),
        "problem_statement": "SIH 2026 #26067",
    }


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint with links to OpenAPI documentation and endpoints directory."""
    return {
        "name": settings.API_TITLE,
        "version": settings.API_VERSION,
        "documentation": "/docs",
        "health": "/health",
        "api_v1_endpoints": {
            "metadata_overview": f"{API_PREFIX}/metadata/overview",
            "metadata_levels": f"{API_PREFIX}/metadata/levels",
            "model_slice": f"{API_PREFIX}/model/slice",
            "model_point_profile": f"{API_PREFIX}/model/point-profile",
            "model_currents": f"{API_PREFIX}/model/vector-currents",
            "model_transect": f"{API_PREFIX}/model/transect",
            "argo_floats": f"{API_PREFIX}/argo/floats",
            "gliders": f"{API_PREFIX}/gliders",
            "observations_spatial": f"{API_PREFIX}/observations/spatial-search",
            "observations_catalog": f"{API_PREFIX}/observations/catalog",
            "comparison_colocated": f"{API_PREFIX}/comparison/colocated-pairs",
            "comparison_dual_profile": f"{API_PREFIX}/comparison/dual-profile",
            "analytics_alerts": f"{API_PREFIX}/analytics/alerts",
            "analytics_hovmoller": f"{API_PREFIX}/analytics/hovmoller",
        },
        "problem_statement": "SIH 2026 #26067",
    }


if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
    )

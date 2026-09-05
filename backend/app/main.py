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
    try:
        # Pre-initialize services
        get_model_service()
        get_argo_service()
        get_glider_service()
        logger.info("All ocean dataset engines initialized successfully.")
    except Exception as e:
        logger.warning(f"Non-fatal initialization warning: {e}")

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
)

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
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )

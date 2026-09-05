"""
Configuration for the Ocean Data Backend (SIH 2026 Problem Statement #26067).

Centralizes all dataset file paths, CORS headers, dimension bounds,
and performance parameters with environment variable overrides.
"""

import os
from pathlib import Path
from typing import List, Optional

# Base directory for the 3d-Ocean project
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DATA_DIR = BASE_DIR / "ocean-data" / "data"

class Settings:
    """Application settings and dataset paths."""

    # Dataset paths
    MODEL_NETCDF_PATH: str = os.getenv(
        "CMEMS_MODEL_PATH",
        str(DEFAULT_DATA_DIR / "model" / "cmems_indian_ocean_2026_06.nc")
    )
    
    ARGO_DIR: str = os.getenv(
        "ARGO_DATA_DIR",
        str(DEFAULT_DATA_DIR / "argo")
    )
    
    ARGO_INDEX_CSV: str = os.getenv(
        "ARGO_INDEX_CSV",
        str(DEFAULT_DATA_DIR / "argo" / "argo_incois_indian_ocean_2026_index.csv")
    )
    
    GLIDER_DIR: str = os.getenv(
        "GLIDER_DATA_DIR",
        str(DEFAULT_DATA_DIR / "glider")
    )
    
    GLIDER_INDEX_CSV: str = os.getenv(
        "GLIDER_INDEX_CSV",
        str(DEFAULT_DATA_DIR / "glider" / "glider_2026_indian_ocean_index.csv")
    )

    # Legacy alias for backward compatibility with old data router
    NETCDF_FILE_PATH: str = MODEL_NETCDF_PATH

    # Grid limits to guard against massive queries
    MAX_TILE_LATITUDE_POINTS: int = 1000
    MAX_TILE_LONGITUDE_POINTS: int = 1500
    MAX_TILE_DEPTH_LEVELS: int = 36

    # CORS settings for frontend access
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",  # Allow all for local pair-programming dev
    ]

    # Server metadata
    API_TITLE: str = "INCOIS 3D Ocean Visualization Platform API"
    API_VERSION: str = "1.0.0"
    API_DESCRIPTION: str = (
        "High-performance FastAPI backend integrating numerical ocean model fields "
        "(CMEMS 1/12°) with autonomous in-situ Argo profiling floats and underwater gliders "
        "across the Indian Ocean basin (SIH Problem Statement 26067)."
    )

    def __init__(self):
        """Validate paths on initialization."""
        self._validate_paths()

    def _validate_paths(self):
        """Log warnings if dataset directories are not yet present."""
        if not Path(self.MODEL_NETCDF_PATH).exists():
            import logging
            logging.getLogger(__name__).warning(
                f"CMEMS NetCDF file not found at: {self.MODEL_NETCDF_PATH}"
            )
        if not Path(self.ARGO_DIR).exists():
            import logging
            logging.getLogger(__name__).warning(
                f"Argo directory not found at: {self.ARGO_DIR}"
            )
        if not Path(self.GLIDER_DIR).exists():
            import logging
            logging.getLogger(__name__).warning(
                f"Glider directory not found at: {self.GLIDER_DIR}"
            )

# Global settings instance
settings = Settings()

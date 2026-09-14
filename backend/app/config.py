"""
Configuration for the Ocean Data Backend (SIH 2026 Problem Statement #26067).

Centralizes all dataset file paths, CORS headers, dimension bounds,
and performance parameters with environment variable overrides.
"""

import os
from pathlib import Path
from typing import List, Optional
from dotenv import load_dotenv

# Base directory for the 3d-Ocean project (repository root)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DEFAULT_DATA_DIR = BASE_DIR / "ocean-data" / "data"

# Automatically load environment variables from backend/.env or root .env
load_dotenv(BASE_DIR / "backend" / ".env")
load_dotenv(BASE_DIR / ".env")

def resolve_path(raw_path: Optional[str], default_path: Path, base_dir: Path = BASE_DIR) -> str:
    """
    Resolves a path to ensure cross-platform relative path portability.
    - If raw_path is None or empty, returns str(default_path.resolve()).
    - If raw_path is already absolute, returns normalized str(Path(raw_path).resolve()).
    - If raw_path is relative, it is resolved against base_dir (the repo root),
      or base_dir / 'backend', ensuring teammates can run the backend from either
      the root directory or the backend subdirectory without path errors.
    """
    if not raw_path or not str(raw_path).strip():
        return str(default_path.resolve())

    p = Path(str(raw_path).strip())
    if p.is_absolute():
        return str(p.resolve())

    # Check relative to base_dir (e.g. "ocean-data/data")
    cand_from_base = (base_dir / p).resolve()
    if cand_from_base.exists():
        return str(cand_from_base)

    # Check relative to base_dir / "backend" (e.g. "../ocean-data/data")
    cand_from_backend = (base_dir / "backend" / p).resolve()
    if cand_from_backend.exists():
        return str(cand_from_backend)

    return str(cand_from_base)

class Settings:
    """Application settings and dataset paths."""

    # Centralized Data Source Selection ("local" or "huggingface")
    DATA_SOURCE: str = os.getenv("DATA_SOURCE", "local").strip().lower()

    # Local Data Paths (resolved relative to project root)
    LOCAL_DATA_ROOT: str = resolve_path(
        os.getenv("LOCAL_DATA_ROOT"),
        DEFAULT_DATA_DIR
    )
    
    # Dataset paths (can still be individually overridden if needed)
    MODEL_NETCDF_PATH: str = resolve_path(
        os.getenv("CMEMS_MODEL_PATH"),
        Path(LOCAL_DATA_ROOT) / "model" / "cmems_indian_ocean_2026_06.nc"
    )
    
    ARGO_DIR: str = resolve_path(
        os.getenv("ARGO_DATA_DIR"),
        Path(LOCAL_DATA_ROOT) / "argo"
    )
    
    ARGO_INDEX_CSV: str = resolve_path(
        os.getenv("ARGO_INDEX_CSV"),
        Path(LOCAL_DATA_ROOT) / "argo" / "argo_incois_indian_ocean_2026_index.csv"
    )
    
    GLIDER_DIR: str = resolve_path(
        os.getenv("GLIDER_DATA_DIR"),
        Path(LOCAL_DATA_ROOT) / "glider"
    )
    
    GLIDER_INDEX_CSV: str = resolve_path(
        os.getenv("GLIDER_INDEX_CSV"),
        Path(LOCAL_DATA_ROOT) / "glider" / "glider_2026_indian_ocean_index.csv"
    )

    # Hugging Face Dataset Configuration
    HF_DATASET_REPO: str = os.getenv("HF_DATASET_REPO", "Yuvi2006pro/ocean-data").strip()
    HF_REVISION: str = os.getenv("HF_REVISION", "main").strip()
    HF_TOKEN: Optional[str] = os.getenv("HF_TOKEN") or None
    HF_CACHE_DIR: Optional[str] = os.getenv("HF_CACHE_DIR") or None

    # In-memory Caching Parameters
    CACHE_ENABLED: bool = os.getenv("CACHE_ENABLED", "true").strip().lower() in ("true", "1", "yes")
    CACHE_MAX_ENTRIES: int = int(os.getenv("CACHE_MAX_ENTRIES", "128"))

    # Legacy alias for backward compatibility with old data router
    NETCDF_FILE_PATH: str = MODEL_NETCDF_PATH

    # Grid limits to guard against massive queries
    MAX_TILE_LATITUDE_POINTS: int = 1000
    MAX_TILE_LONGITUDE_POINTS: int = 1500
    MAX_TILE_DEPTH_LEVELS: int = 36

    # CORS settings for frontend access
    _cors_env = os.getenv("CORS_ORIGINS")
    CORS_ORIGINS: List[str] = [orig.strip() for orig in _cors_env.split(",") if orig.strip()] if _cors_env else [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "*",  # Allow all including Vercel deployments
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
        """Validate configuration on initialization."""
        self._validate_paths()

    def _validate_paths(self):
        """Log warnings if dataset directories are not yet present for active data source."""
        import logging
        log = logging.getLogger(__name__)

        if self.DATA_SOURCE == "local":
            if not Path(self.MODEL_NETCDF_PATH).exists():
                log.warning(f"LOCAL mode: CMEMS NetCDF file not found at: {self.MODEL_NETCDF_PATH}")
            if not Path(self.ARGO_DIR).exists():
                log.warning(f"LOCAL mode: Argo directory not found at: {self.ARGO_DIR}")
            if not Path(self.GLIDER_DIR).exists():
                log.warning(f"LOCAL mode: Glider directory not found at: {self.GLIDER_DIR}")
        elif self.DATA_SOURCE == "huggingface":
            log.info(f"HUGGINGFACE mode configured: repo='{self.HF_DATASET_REPO}', revision='{self.HF_REVISION}'")
        else:
            log.warning(f"Unknown DATA_SOURCE '{self.DATA_SOURCE}'. Supported: 'local', 'huggingface'.")

# Global settings instance
settings = Settings()

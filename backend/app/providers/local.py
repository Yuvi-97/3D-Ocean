"""
Local Filesystem Data Provider for Ocean Visualizer Backend.

Reads numerical model NetCDF and in-situ observation profiles directly
from local disk using high-performance POSIX file handles and memory-mapping.
"""

import os
import logging
from pathlib import Path
from typing import Optional

import pandas as pd
import xarray as xr

from ..config import settings
from .base import BaseDataProvider

logger = logging.getLogger(__name__)


class LocalDataProvider(BaseDataProvider):
    """Data provider reading from the local filesystem."""

    name: str = "local"

    def __init__(
        self,
        model_path: Optional[str] = None,
        argo_dir: Optional[str] = None,
        argo_index_csv: Optional[str] = None,
        glider_dir: Optional[str] = None,
        glider_index_csv: Optional[str] = None,
    ):
        self.model_path = Path(model_path or settings.MODEL_NETCDF_PATH)
        self.argo_dir = Path(argo_dir or settings.ARGO_DIR)
        self.argo_index_csv = Path(argo_index_csv or settings.ARGO_INDEX_CSV)
        self.glider_dir = Path(glider_dir or settings.GLIDER_DIR)
        self.glider_index_csv = Path(glider_index_csv or settings.GLIDER_INDEX_CSV)

        self._model_ds: Optional[xr.Dataset] = None
        self._argo_df: Optional[pd.DataFrame] = None
        self._glider_df: Optional[pd.DataFrame] = None

    def validate_connection(self) -> None:
        """Verifies that all required local dataset files and indices exist."""
        missing = []
        if not self.model_path.exists():
            missing.append(f"Model NetCDF: {self.model_path}")
        if not self.argo_index_csv.exists():
            missing.append(f"Argo Index CSV: {self.argo_index_csv}")
        if not self.argo_dir.exists():
            missing.append(f"Argo Directory: {self.argo_dir}")
        if not self.glider_index_csv.exists():
            missing.append(f"Glider Index CSV: {self.glider_index_csv}")
        if not self.glider_dir.exists():
            missing.append(f"Glider Directory: {self.glider_dir}")

        if missing:
            err_msg = "LOCAL data source verification failed. Missing files/directories:\n  - " + "\n  - ".join(missing)
            logger.error(err_msg)
            raise FileNotFoundError(err_msg)

        logger.info(f"LOCAL data source validated: root='{settings.LOCAL_DATA_ROOT}'")

    def get_model_dataset(self) -> xr.Dataset:
        """Opens and returns the CMEMS model dataset via lazy memory-mapping."""
        if self._model_ds is None:
            if not self.model_path.exists():
                raise FileNotFoundError(f"CMEMS NetCDF file does not exist at: {self.model_path}")
            logger.info(f"Opening local CMEMS model NetCDF: {self.model_path}")
            self._model_ds = xr.open_dataset(self.model_path)
        return self._model_ds

    def get_argo_index(self) -> pd.DataFrame:
        """Loads and parses the Argo float index CSV."""
        if self._argo_df is None:
            if not self.argo_index_csv.exists():
                raise FileNotFoundError(f"Argo index CSV not found at: {self.argo_index_csv}")
            
            logger.info(f"Loading local Argo index: {self.argo_index_csv}")
            df = pd.read_csv(self.argo_index_csv)
            # Extract WMO ID from path e.g. "incois/1902669/profiles/R1902669_085.nc"
            df["wmo"] = df["file"].apply(
                lambda f: f.split("/")[1] if "/" in str(f) else str(f).split("_")[0].replace("R", "").replace("D", "")
            )
            df["profile_id"] = df["file"].apply(
                lambda f: os.path.basename(str(f)).replace(".nc", "")
            )
            df["date_dt"] = pd.to_datetime(df["date"], errors="coerce")
            self._argo_df = df
        return self._argo_df

    def get_argo_profile_dataset(
        self,
        wmo_id: str,
        profile_id: str,
        file_rel_path: Optional[str] = None
    ) -> xr.Dataset:
        """Opens a local Argo profile NetCDF."""
        clean_id = profile_id.replace(".nc", "")
        file_path = self.argo_dir / f"{clean_id}.nc"

        if not file_path.exists() and file_rel_path:
            file_path = self.argo_dir / os.path.basename(file_rel_path)

        if not file_path.exists():
            # Search dataframe
            df = self.get_argo_index()
            row = df[df["profile_id"] == clean_id]
            if not row.empty:
                fname = os.path.basename(row.iloc[0]["file"])
                file_path = self.argo_dir / fname

        if not file_path.exists():
            raise FileNotFoundError(f"Local Argo profile NetCDF not found for: {profile_id} at {file_path}")

        return xr.open_dataset(file_path)

    def get_glider_index(self) -> pd.DataFrame:
        """Loads and parses the autonomous Glider index CSV."""
        if self._glider_df is None:
            if not self.glider_index_csv.exists():
                raise FileNotFoundError(f"Glider index CSV not found at: {self.glider_index_csv}")

            logger.info(f"Loading local Glider index: {self.glider_index_csv}")
            df = pd.read_csv(self.glider_index_csv)
            df["wmo"] = df["wmo"].astype(str)
            df["profile_id"] = df["file"].apply(
                lambda f: os.path.basename(str(f)).replace(".nc", "")
            )
            df["date_dt"] = pd.to_datetime(df["date"].astype(str), format="%Y%m%d%H%M%S", errors="coerce")
            self._glider_df = df
        return self._glider_df

    def get_glider_profile_dataset(
        self,
        glider_id: str,
        profile_id: str,
        file_rel_path: Optional[str] = None
    ) -> xr.Dataset:
        """Opens a local Glider profile NetCDF."""
        clean_id = profile_id.replace(".nc", "")
        clean_wmo = str(glider_id).replace("R", "")

        # Try wmo subdirectory first: data/glider/<wmo>/<profile_id>.nc
        file_path = self.glider_dir / clean_wmo / f"{clean_id}.nc"
        if not file_path.exists():
            # Try directly in data/glider/<profile_id>.nc
            file_path = self.glider_dir / f"{clean_id}.nc"

        if not file_path.exists():
            df = self.get_glider_index()
            row = df[df["profile_id"] == clean_id]
            if not row.empty:
                fname = os.path.basename(row.iloc[0]["file"])
                wmo_val = str(row.iloc[0]["wmo"])
                file_path = self.glider_dir / wmo_val / fname

        if not file_path.exists():
            raise FileNotFoundError(f"Local Glider profile NetCDF not found for: {profile_id} at {file_path}")

        return xr.open_dataset(file_path)

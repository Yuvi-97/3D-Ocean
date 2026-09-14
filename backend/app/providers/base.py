"""
Abstract BaseDataProvider interface for Ocean Visualizer Backend.

Decouples the endpoint and analytics service layers from physical file locations,
enabling seamless switching between local filesystem and cloud Hugging Face Datasets.
"""

from abc import ABC, abstractmethod
from typing import Optional
import pandas as pd
import xarray as xr


class BaseDataProvider(ABC):
    """Abstract data provider contract."""

    name: str = "base"

    @abstractmethod
    def validate_connection(self) -> None:
        """
        Validates availability of the underlying data source.
        Must raise RuntimeError or FileNotFoundError with a clear message if unavailable.
        Must NOT silently fall back to an alternate data source.
        """
        pass

    @abstractmethod
    def get_model_dataset(self) -> xr.Dataset:
        """
        Opens and returns the 3D CMEMS numerical model xarray Dataset.
        Must NOT download the full 2.1 GB dataset for every API request.
        """
        pass

    @abstractmethod
    def get_argo_index(self) -> pd.DataFrame:
        """
        Loads and returns the Argo profiling floats index DataFrame.
        Columns: file, date, latitude, longitude, ocean, profiler_type, institution, wmo, profile_id, date_dt
        """
        pass

    @abstractmethod
    def get_argo_profile_dataset(
        self,
        wmo_id: str,
        profile_id: str,
        file_rel_path: Optional[str] = None
    ) -> xr.Dataset:
        """
        Opens and returns an individual Argo float CTD vertical profile NetCDF.
        """
        pass

    @abstractmethod
    def get_glider_index(self) -> pd.DataFrame:
        """
        Loads and returns the autonomous underwater glider index DataFrame.
        Columns: wmo, file, date, latitude, longitude, ocean, profiler_type, institution, profile_id, date_dt
        """
        pass

    @abstractmethod
    def get_glider_profile_dataset(
        self,
        glider_id: str,
        profile_id: str,
        file_rel_path: Optional[str] = None
    ) -> xr.Dataset:
        """
        Opens and returns an individual Glider CTD + DOXY vertical profile NetCDF.
        """
        pass

"""
CMEMS Numerical Model Service.

Handles high-performance memory-mapped access to CMEMS 3D ocean model fields
(temperature, salinity, currents, speed, transects, and point profiles).
"""

import math
import logging
from typing import Dict, List, Optional, Tuple, Any
from functools import lru_cache
from pathlib import Path

import xarray as xr
import numpy as np
import pandas as pd

from ..config import settings
from ..utils.serializers import sanitize_value
from ..utils.geo import haversine_distance_km, parse_bbox, interpolate_line
from ..schemas.metadata import (
    DatasetOverviewResponse, SpatialCoverage, TemporalCoverage,
    VariableMetadata, InSituInventory, LevelsResponse, DepthLevelItem, TimeStepItem
)
from ..schemas.model import (
    ModelSliceResponse, PointProfileResponse, PointCoord,
    PointProfileLevel, VectorCurrentsResponse, CurrentVectorItem,
    TransectResponse, TransectCoord
)

logger = logging.getLogger(__name__)

def classify_depth_zone(depth_m: float) -> str:
    """Classifies depth into standard oceanographic zones."""
    if depth_m <= 200.0:
        return "Sunlight (Epipelagic)"
    elif depth_m <= 1000.0:
        return "Twilight (Mesopelagic)"
    elif depth_m <= 4000.0:
        return "Midnight (Bathypelagic)"
    else:
        return "Abyssal (Abyssopelagic)"

class ModelService:
    """Service for querying and slicing CMEMS 3D numerical model dataset."""

    _instance: Optional["ModelService"] = None

    def __init__(self, nc_path: Optional[str] = None):
        self.nc_path = nc_path or settings.MODEL_NETCDF_PATH
        self.ds: Optional[xr.Dataset] = None
        self._load_dataset()

    def _load_dataset(self):
        """Opens the NetCDF dataset lazily with memory-mapping."""
        path = Path(self.nc_path)
        if not path.exists():
            logger.error(f"CMEMS NetCDF file does not exist at: {self.nc_path}")
            return
        
        try:
            # Open without loading all data arrays into memory
            self.ds = xr.open_dataset(self.nc_path)
            logger.info(
                f"CMEMS NetCDF opened successfully: dims={dict(self.ds.sizes)}, "
                f"vars={list(self.ds.data_vars.keys())}"
            )
        except Exception as e:
            logger.error(f"Failed to open CMEMS NetCDF dataset: {e}")
            self.ds = None

    def ensure_dataset(self):
        """Ensures dataset is open, attempts reload if needed."""
        if self.ds is None:
            self._load_dataset()
        if self.ds is None:
            raise RuntimeError(f"CMEMS NetCDF dataset could not be opened from {self.nc_path}")

    def get_overview(self, argo_floats: int = 123, argo_profs: int = 2493,
                     gliders: int = 2, glider_profs: int = 2958) -> DatasetOverviewResponse:
        """Returns global dataset overview, coordinate bounds, and inventory."""
        self.ensure_dataset()
        ds = self.ds

        lats = ds["latitude"].values
        lons = ds["longitude"].values
        times = ds["time"].values
        depths = ds["depth"].values

        start_date = str(pd.to_datetime(times[0]).date())
        end_date = str(pd.to_datetime(times[-1]).date())

        variables = [
            VariableMetadata(
                name="thetao",
                standard_name="sea_water_potential_temperature",
                long_name="Sea water potential temperature",
                unit="degC",
                valid_min=-2.0,
                valid_max=36.0,
            ),
            VariableMetadata(
                name="so",
                standard_name="sea_water_salinity",
                long_name="Sea water salinity",
                unit="PSU",
                valid_min=28.0,
                valid_max=38.0,
            ),
            VariableMetadata(
                name="uo",
                standard_name="eastward_sea_water_velocity",
                long_name="Eastward current velocity",
                unit="m/s",
                valid_min=-2.5,
                valid_max=2.5,
            ),
            VariableMetadata(
                name="vo",
                standard_name="northward_sea_water_velocity",
                long_name="Northward current velocity",
                unit="m/s",
                valid_min=-2.5,
                valid_max=2.5,
            ),
        ]

        return DatasetOverviewResponse(
            dataset="CMEMS Global Ocean Physics Analysis & Forecast (1/12°)",
            spatial_coverage=SpatialCoverage(
                lat_min=float(lats.min()),
                lat_max=float(lats.max()),
                lon_min=float(lons.min()),
                lon_max=float(lons.max()),
                lat_points=len(lats),
                lon_points=len(lons),
                resolution_deg=float(round(abs(lats[1] - lats[0]), 4)),
            ),
            temporal_coverage=TemporalCoverage(
                start_date=start_date,
                end_date=end_date,
                total_steps=len(times),
                step_interval="1D",
            ),
            depth_levels_count=len(depths),
            variables=variables,
            in_situ_inventory=InSituInventory(
                argo_floats_count=argo_floats,
                argo_profiles_count=argo_profs,
                gliders_count=gliders,
                glider_profiles_count=glider_profs,
            ),
        )

    def get_levels(self) -> LevelsResponse:
        """Returns depth level values and calendar time steps for UI controls."""
        self.ensure_dataset()
        ds = self.ds

        depths = ds["depth"].values
        times = ds["time"].values

        depth_levels = [
            DepthLevelItem(
                index=i,
                depth_m=round(float(d), 2),
                zone=classify_depth_zone(float(d)),
            )
            for i, d in enumerate(depths)
        ]

        time_steps = []
        for i, t in enumerate(times):
            dt = pd.to_datetime(t)
            time_steps.append(
                TimeStepItem(
                    index=i,
                    date=str(dt.date()),
                    label=dt.strftime("%d %b %Y"),
                )
            )

        return LevelsResponse(depth_levels=depth_levels, time_steps=time_steps)

    def get_slice(
        self,
        variable: str,
        time_index: int = 0,
        depth_index: int = 0,
        stride: int = 2,
        bbox: Optional[str] = None,
    ) -> ModelSliceResponse:
        """
        Retrieves a 2D horizontal slice of ocean data at specified time and depth.
        Supports downsampling stride and geographic bounding box filtering.
        """
        self.ensure_dataset()
        ds = self.ds

        # Validate indices
        max_time = len(ds["time"]) - 1
        max_depth = len(ds["depth"]) - 1

        if not (0 <= time_index <= max_time):
            raise ValueError(f"time_index {time_index} out of range (0 to {max_time})")
        if not (0 <= depth_index <= max_depth):
            raise ValueError(f"depth_index {depth_index} out of range (0 to {max_depth})")

        stride = max(1, min(stride, 16))
        depth_val = float(ds["depth"].values[depth_index])
        time_val = str(pd.to_datetime(ds["time"].values[time_index]).date())

        # Select data
        if variable == "speed":
            u_slice = ds["uo"].isel(time=time_index, depth=depth_index)
            v_slice = ds["vo"].isel(time=time_index, depth=depth_index)
            da = np.sqrt(u_slice**2 + v_slice**2)
            unit = "m/s"
        elif variable in ds.data_vars:
            da = ds[variable].isel(time=time_index, depth=depth_index)
            unit = da.attrs.get("units", "")
        else:
            raise ValueError(f"Unknown variable '{variable}'. Available: ['thetao', 'so', 'uo', 'vo', 'speed']")

        # Apply bounding box if provided
        if bbox:
            min_lon, min_lat, max_lon, max_lat = parse_bbox(bbox)
            da = da.sel(
                latitude=slice(min_lat, max_lat),
                longitude=slice(min_lon, max_lon)
            )

        # Apply spatial stride for responsive frontend rendering
        da_sub = da[::stride, ::stride]
        lats = da_sub["latitude"].values.astype(float).tolist()
        lons = da_sub["longitude"].values.astype(float).tolist()
        vals = da_sub.values

        # Compute basic statistics
        valid_mask = ~np.isnan(vals)
        if np.any(valid_mask):
            min_v = float(np.nanmin(vals))
            max_v = float(np.nanmax(vals))
            mean_v = float(np.nanmean(vals))
        else:
            min_v = max_v = mean_v = None

        # Clean NaN values for JSON output
        cleaned_values = [
            [None if (math.isnan(v) or math.isinf(v)) else round(float(v), 3) for v in row]
            for row in vals
        ]

        return ModelSliceResponse(
            variable=variable,
            unit=unit,
            time_index=time_index,
            date=time_val,
            depth_index=depth_index,
            depth_m=round(depth_val, 2),
            grid_shape=(len(lats), len(lons)),
            latitudes=[round(lat, 4) for lat in lats],
            longitudes=[round(lon, 4) for lon in lons],
            min_value=round(min_v, 3) if min_v is not None else None,
            max_value=round(max_v, 3) if max_v is not None else None,
            mean_value=round(mean_v, 3) if mean_v is not None else None,
            values=cleaned_values,
        )

    def get_point_profile(
        self,
        latitude: float,
        longitude: float,
        time_index: int = 22,
        variables: Optional[List[str]] = None,
    ) -> PointProfileResponse:
        """Extracts vertical sounding profile at clicked latitude and longitude."""
        self.ensure_dataset()
        ds = self.ds

        time_index = max(0, min(time_index, len(ds["time"]) - 1))
        time_val = str(pd.to_datetime(ds["time"].values[time_index]).date())

        # Nearest neighbor interpolation
        pt = ds.sel(latitude=latitude, longitude=longitude, method="nearest")
        nearest_lat = float(pt["latitude"].values)
        nearest_lon = float(pt["longitude"].values)

        depths = ds["depth"].values.astype(float)
        thetao = pt["thetao"].isel(time=time_index).values if "thetao" in pt else None
        so = pt["so"].isel(time=time_index).values if "so" in pt else None
        uo = pt["uo"].isel(time=time_index).values if "uo" in pt else None
        vo = pt["vo"].isel(time=time_index).values if "vo" in pt else None

        levels = []
        for i in range(len(depths)):
            t_val = float(thetao[i]) if (thetao is not None and not np.isnan(thetao[i])) else None
            s_val = float(so[i]) if (so is not None and not np.isnan(so[i])) else None
            u_val = float(uo[i]) if (uo is not None and not np.isnan(uo[i])) else None
            v_val = float(vo[i]) if (vo is not None and not np.isnan(vo[i])) else None
            
            spd = (
                round(math.sqrt(u_val**2 + v_val**2), 3)
                if (u_val is not None and v_val is not None)
                else None
            )

            levels.append(
                PointProfileLevel(
                    depth_m=round(float(depths[i]), 2),
                    thetao=round(t_val, 2) if t_val is not None else None,
                    so=round(s_val, 2) if s_val is not None else None,
                    uo=round(u_val, 3) if u_val is not None else None,
                    vo=round(v_val, 3) if v_val is not None else None,
                    speed=spd,
                )
            )

        return PointProfileResponse(
            query_point=PointCoord(lat=latitude, lon=longitude),
            nearest_grid_point=PointCoord(lat=round(nearest_lat, 4), lon=round(nearest_lon, 4)),
            date=time_val,
            time_index=time_index,
            profile=levels,
        )

    def get_vector_currents(
        self,
        time_index: int = 22,
        depth_index: int = 0,
        grid_step: int = 6,
        bbox: Optional[str] = None,
    ) -> VectorCurrentsResponse:
        """Extracts subsampled uo, vo current vectors for 3D vector and particle flow layers."""
        self.ensure_dataset()
        ds = self.ds

        time_index = max(0, min(time_index, len(ds["time"]) - 1))
        depth_index = max(0, min(depth_index, len(ds["depth"]) - 1))
        depth_val = float(ds["depth"].values[depth_index])
        time_val = str(pd.to_datetime(ds["time"].values[time_index]).date())

        uo_da = ds["uo"].isel(time=time_index, depth=depth_index)
        vo_da = ds["vo"].isel(time=time_index, depth=depth_index)

        if bbox:
            min_lon, min_lat, max_lon, max_lat = parse_bbox(bbox)
            uo_da = uo_da.sel(latitude=slice(min_lat, max_lat), longitude=slice(min_lon, max_lon))
            vo_da = vo_da.sel(latitude=slice(min_lat, max_lat), longitude=slice(min_lon, max_lon))

        grid_step = max(2, min(grid_step, 20))
        uo_sub = uo_da[::grid_step, ::grid_step]
        vo_sub = vo_da[::grid_step, ::grid_step]

        lats = uo_sub["latitude"].values
        lons = uo_sub["longitude"].values
        u_vals = uo_sub.values
        v_vals = vo_sub.values

        vectors = []
        for i in range(len(lats)):
            for j in range(len(lons)):
                u = u_vals[i, j]
                v = v_vals[i, j]
                if not (np.isnan(u) or np.isnan(v)):
                    spd = math.sqrt(u**2 + v**2)
                    direction = math.degrees(math.atan2(v, u)) % 360
                    vectors.append(
                        CurrentVectorItem(
                            lat=round(float(lats[i]), 3),
                            lon=round(float(lons[j]), 3),
                            uo=round(float(u), 3),
                            vo=round(float(v), 3),
                            speed=round(float(spd), 3),
                            direction_deg=round(float(direction), 1),
                        )
                    )

        return VectorCurrentsResponse(
            date=time_val,
            time_index=time_index,
            depth_m=round(depth_val, 2),
            depth_index=depth_index,
            total_vectors=len(vectors),
            vectors=vectors,
        )

    def get_transect(
        self,
        start_coord: str,
        end_coord: str,
        variable: str = "thetao",
        time_index: int = 22,
        num_samples: int = 100,
    ) -> TransectResponse:
        """Computes vertical cross-section / curtain slice between two coordinates."""
        self.ensure_dataset()
        ds = self.ds

        time_index = max(0, min(time_index, len(ds["time"]) - 1))
        time_val = str(pd.to_datetime(ds["time"].values[time_index]).date())

        lat1, lon1 = [float(p.strip()) for p in start_coord.split(",")]
        lat2, lon2 = [float(p.strip()) for p in end_coord.split(",")]

        line_pts = interpolate_line(lat1, lon1, lat2, lon2, n_points=num_samples)
        depths = ds["depth"].values.astype(float)
        
        if variable == "speed":
            da_u = ds["uo"].isel(time=time_index)
            da_v = ds["vo"].isel(time=time_index)
            da = np.sqrt(da_u**2 + da_v**2)
            unit = "m/s"
        elif variable in ds:
            da = ds[variable].isel(time=time_index)
            unit = da.attrs.get("units", "")
        else:
            raise ValueError(f"Unknown variable '{variable}'")

        # Interpolate along transect coordinates
        target_lats = xr.DataArray([p[0] for p in line_pts], dims="points")
        target_lons = xr.DataArray([p[1] for p in line_pts], dims="points")
        transect_da = da.sel(latitude=target_lats, longitude=target_lons, method="nearest")
        
        # Matrix shape: (depth, points)
        mat = transect_da.values
        matrix_cleaned = [
            [None if (math.isnan(v) or math.isinf(v)) else round(float(v), 2) for v in row]
            for row in mat
        ]

        return TransectResponse(
            variable=variable,
            unit=unit,
            time_index=time_index,
            date=time_val,
            num_points=len(line_pts),
            distances_km=[round(p[2], 1) for p in line_pts],
            coordinates=[TransectCoord(lat=round(p[0], 4), lon=round(p[1], 4)) for p in line_pts],
            depths_m=[round(float(d), 2) for d in depths],
            matrix=matrix_cleaned,
        )

    def get_hovmoller(
        self,
        latitude: float,
        longitude: float,
        variable: str = "thetao",
    ) -> Dict[str, Any]:
        """Generates Hovmöller diagram matrix across time (23 steps) and depth (36 levels)."""
        self.ensure_dataset()
        ds = self.ds

        pt = ds.sel(latitude=latitude, longitude=longitude, method="nearest")
        nearest_lat = float(pt["latitude"].values)
        nearest_lon = float(pt["longitude"].values)

        if variable == "speed":
            da = np.sqrt(pt["uo"]**2 + pt["vo"]**2)
            unit = "m/s"
        elif variable in pt:
            da = pt[variable]
            unit = da.attrs.get("units", "")
        else:
            raise ValueError(f"Variable {variable} not found in model dataset")

        # Matrix: depth x time
        # da shape: (time, depth) -> transpose to (depth, time)
        mat = da.values.T
        times = [str(pd.to_datetime(t).date()) for t in ds["time"].values]
        depths = [round(float(d), 2) for d in ds["depth"].values]

        matrix_cleaned = [
            [None if (math.isnan(v) or math.isinf(v)) else round(float(v), 2) for v in row]
            for row in mat
        ]

        return {
            "location": {"lat": round(nearest_lat, 4), "lon": round(nearest_lon, 4)},
            "variable": variable,
            "unit": unit,
            "time_axis": times,
            "depth_axis": depths,
            "matrix": matrix_cleaned,
        }

# Singleton accessor
_model_service_instance: Optional[ModelService] = None

def get_model_service() -> ModelService:
    global _model_service_instance
    if _model_service_instance is None:
        _model_service_instance = ModelService()
    return _model_service_instance

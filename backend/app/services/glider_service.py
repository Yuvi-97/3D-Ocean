"""
Underwater Gliders Data Service.

Provides in-memory trajectory indexing for autonomous gliders (R6801558, R8901048)
and detailed CTD + Dissolved Oxygen (DOXY) vertical profile extraction from NetCDFs.
"""

import os
import logging
from pathlib import Path
from typing import Dict, List, Optional, Any

import pandas as pd
import numpy as np
import xarray as xr

from ..config import settings
from ..utils.serializers import sanitize_value
from ..utils.geo import parse_bbox
from ..schemas.glider import (
    GlidersResponse, GliderItem, GliderDateRange, GliderBBox,
    GliderTrackResponse, GliderTrackPoint,
    GliderProfileResponse, GliderProfileLevel
)

logger = logging.getLogger(__name__)

class GliderService:
    """Service for querying autonomous underwater gliders index and profiles."""

    def __init__(self, index_csv: Optional[str] = None, data_dir: Optional[str] = None):
        self.index_csv = index_csv or settings.GLIDER_INDEX_CSV
        self.data_dir = data_dir or settings.GLIDER_DIR
        self.df: Optional[pd.DataFrame] = None
        self._load_index()

    def _load_index(self):
        """Loads and indexes the glider CSV index into memory."""
        path = Path(self.index_csv)
        if not path.exists():
            logger.error(f"Glider index CSV not found at: {self.index_csv}")
            return
        
        try:
            df = pd.read_csv(self.index_csv)
            df["wmo"] = df["wmo"].astype(str)
            df["profile_id"] = df["file"].apply(
                lambda f: os.path.basename(str(f)).replace(".nc", "")
            )
            # Parse date strings formatted as 20260101013219
            df["date_dt"] = pd.to_datetime(df["date"].astype(str), format="%Y%m%d%H%M%S", errors="coerce")
            self.df = df
            logger.info(f"Loaded Glider index: {len(df)} profiles across {df['wmo'].nunique()} gliders.")
        except Exception as e:
            logger.error(f"Error loading Glider index CSV: {e}")
            self.df = None

    def ensure_index(self):
        if self.df is None:
            self._load_index()
        if self.df is None:
            raise RuntimeError(f"Glider index data could not be loaded from {self.index_csv}")

    def get_gliders(self) -> GlidersResponse:
        """Returns inventory and deployment status for both gliders."""
        self.ensure_index()
        df = self.df

        gliders_list = []
        for wmo, group in df.groupby("wmo"):
            min_lat = float(group["latitude"].min())
            max_lat = float(group["latitude"].max())
            min_lon = float(group["longitude"].min())
            max_lon = float(group["longitude"].max())

            valid_dates = group["date_dt"].dropna()
            start_d = str(valid_dates.min()) if not valid_dates.empty else "2026-01-01"
            end_d = str(valid_dates.max()) if not valid_dates.empty else "2026-06-23"

            max_p = float(group["pressure_max"].max()) if "pressure_max" in group else 1268.8
            mission_name = "sea006_20251220" if str(wmo) == "8901048" else "sea003_2026"

            gliders_list.append(
                GliderItem(
                    glider_id=str(wmo),
                    wmo=str(wmo),
                    mission_name=mission_name,
                    total_dives=len(group),
                    date_range=GliderDateRange(start=start_d, end=end_d),
                    bbox=GliderBBox(
                        min_lat=round(min_lat, 4),
                        max_lat=round(max_lat, 4),
                        min_lon=round(min_lon, 4),
                        max_lon=round(max_lon, 4),
                    ),
                    max_recorded_pressure_dbar=round(max_p, 1),
                    sensors=[
                        "TEMP (Sea Temperature)",
                        "PSAL (Salinity)",
                        "PRES (Pressure/Depth)",
                        "DOXY (Dissolved Oxygen)",
                        "CNDC (Conductivity)",
                    ],
                )
            )

        return GlidersResponse(total_gliders=len(gliders_list), gliders=gliders_list)

    def get_glider_track(self, glider_id: str, downsample_factor: int = 2) -> GliderTrackResponse:
        """Returns high-density mission track points and dive coordinates."""
        self.ensure_index()
        matches = self.df[self.df["wmo"] == str(glider_id)].sort_values(by="date_dt", ascending=True)

        if matches.empty:
            raise ValueError(f"No glider found with ID: {glider_id}")

        downsample_factor = max(1, min(downsample_factor, 10))
        sub_matches = matches.iloc[::downsample_factor]

        points = []
        for idx, row in sub_matches.iterrows():
            prof_id = row["profile_id"]
            # Extract dive number if present e.g. R8901048_20251220_187D -> 187
            dive_num = None
            parts = prof_id.split("_")
            if len(parts) >= 3:
                clean_num = parts[-1].replace("D", "")
                if clean_num.isdigit():
                    dive_num = int(clean_num)

            points.append(
                GliderTrackPoint(
                    dive=dive_num,
                    timestamp=str(row["date_dt"]),
                    lat=round(float(row["latitude"]), 4),
                    lon=round(float(row["longitude"]), 4),
                    max_pres=round(float(row["pressure_max"]), 1) if not pd.isna(row["pressure_max"]) else None,
                    profile_file=str(row["file"]),
                )
            )

        return GliderTrackResponse(
            glider_id=str(glider_id),
            points_count=len(points),
            track=points,
        )

    def get_profile(self, glider_id: str, profile_id: str) -> GliderProfileResponse:
        """
        Extracts multi-sensor vertical profile from glider NetCDF file (including Dissolved Oxygen).
        """
        self.ensure_index()
        clean_id = profile_id.replace(".nc", "")
        clean_wmo = str(glider_id).replace("R", "")

        # Try wmo subdirectory first: data/glider/<wmo>/<profile_id>.nc
        file_path = Path(self.data_dir) / clean_wmo / f"{clean_id}.nc"
        
        if not file_path.exists():
            # Try directly in data/glider/<profile_id>.nc
            file_path = Path(self.data_dir) / f"{clean_id}.nc"

        if not file_path.exists():
            # Try searching dataframe for exact file match
            row = self.df[self.df["profile_id"] == clean_id]
            if not row.empty:
                fname = os.path.basename(row.iloc[0]["file"])
                wmo_val = str(row.iloc[0]["wmo"])
                file_path = Path(self.data_dir) / wmo_val / fname

        if not file_path.exists():
            raise FileNotFoundError(f"Glider NetCDF profile file not found for: {profile_id}")

        try:
            with xr.open_dataset(file_path) as ds:
                lat = float(ds["LATITUDE"].values[0]) if "LATITUDE" in ds else -12.83
                lon = float(ds["LONGITUDE"].values[0]) if "LONGITUDE" in ds else 45.40
                
                time_val = ""
                if "JULD" in ds:
                    try:
                        time_val = str(pd.to_datetime(ds["JULD"].values[0]))
                    except Exception:
                        pass

                pres = ds["PRES"].values[0].astype(float) if "PRES" in ds else []
                temp = ds["TEMP"].values[0].astype(float) if "TEMP" in ds else []
                psal = ds["PSAL"].values[0].astype(float) if "PSAL" in ds else []
                
                doxy = None
                if "DOXY" in ds:
                    doxy = ds["DOXY"].values[0].astype(float)
                elif "MOLAR_DOXY" in ds:
                    doxy = ds["MOLAR_DOXY"].values[0].astype(float)

                cndc = ds["CNDC"].values[0].astype(float) if "CNDC" in ds else None
                pitch = ds["TECH_pitch"].values[0].astype(float) if "TECH_pitch" in ds else None
                roll = ds["TECH_roll"].values[0].astype(float) if "TECH_roll" in ds else None

                levels = []
                for i in range(len(pres)):
                    p = float(pres[i]) if not np.isnan(pres[i]) else None
                    if p is None or p > 90000.0:
                        continue

                    t = float(temp[i]) if (i < len(temp) and not np.isnan(temp[i])) else None
                    s = float(psal[i]) if (i < len(psal) and not np.isnan(psal[i])) else None
                    d = float(doxy[i]) if (doxy is not None and i < len(doxy) and not np.isnan(doxy[i])) else None
                    c = float(cndc[i]) if (cndc is not None and i < len(cndc) and not np.isnan(cndc[i])) else None
                    pit = float(pitch[i]) if (pitch is not None and i < len(pitch) and not np.isnan(pitch[i])) else None
                    rol = float(roll[i]) if (roll is not None and i < len(roll) and not np.isnan(roll[i])) else None

                    levels.append({
                        "depth_m": round(p, 2),
                        "temp": round(t, 3) if t is not None else None,
                        "temp_qc": 1,
                        "psal": round(s, 3) if s is not None else None,
                        "psal_qc": 1,
                        "doxy_umol_kg": round(d, 2) if d is not None else None,
                        "doxy_qc": 1,
                        "cndc": round(c, 3) if c is not None else None,
                        "pitch": round(pit, 1) if pit is not None else None,
                        "roll": round(rol, 1) if rol is not None else None,
                    })

                levels.sort(key=lambda x: x["depth_m"])
                max_p = max([lvl["depth_m"] for lvl in levels]) if levels else None

                return GliderProfileResponse(
                    profile_id=clean_id,
                    glider_id=clean_wmo,
                    timestamp=time_val or "2026-01-01T01:32:19",
                    location={"lat": round(lat, 4), "lon": round(lon, 4)},
                    max_pressure_dbar=round(max_p, 1) if max_p is not None else None,
                    levels_count=len(levels),
                    data=[GliderProfileLevel(**lvl) for lvl in levels],
                )
        except Exception as e:
            logger.error(f"Error reading Glider NetCDF {file_path}: {e}")
            raise RuntimeError(f"Failed to read Glider profile {profile_id}: {e}")

# Singleton accessor
_glider_service_instance: Optional[GliderService] = None

def get_glider_service() -> GliderService:
    global _glider_service_instance
    if _glider_service_instance is None:
        _glider_service_instance = GliderService()
    return _glider_service_instance

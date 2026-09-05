"""
Argo Floats Data Service.

Provides in-memory spatial and trajectory querying from the Argo index CSV
and detailed CTD vertical profile extractions from actual NetCDF files.
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
from ..schemas.argo import (
    ArgoFloatsResponse, ArgoFloatItem, FloatLatestPosition,
    ArgoTrajectoryResponse, TrajectoryPoint,
    ArgoProfileResponse, ArgoProfileLevel
)

logger = logging.getLogger(__name__)

class ArgoService:
    """Service for querying Argo profiling floats index and profile NetCDFs."""

    def __init__(self, index_csv: Optional[str] = None, data_dir: Optional[str] = None):
        self.index_csv = index_csv or settings.ARGO_INDEX_CSV
        self.data_dir = data_dir or settings.ARGO_DIR
        self.df: Optional[pd.DataFrame] = None
        self._load_index()

    def _load_index(self):
        """Loads and indexes the Argo float CSV into memory."""
        path = Path(self.index_csv)
        if not path.exists():
            logger.error(f"Argo index CSV not found at: {self.index_csv}")
            return
        
        try:
            df = pd.read_csv(self.index_csv)
            # Extract WMO ID from file path e.g. "incois/1902669/profiles/R1902669_085.nc"
            df["wmo"] = df["file"].apply(
                lambda f: f.split("/")[1] if "/" in str(f) else str(f).split("_")[0].replace("R", "").replace("D", "")
            )
            df["profile_id"] = df["file"].apply(
                lambda f: os.path.basename(str(f)).replace(".nc", "")
            )
            df["date_dt"] = pd.to_datetime(df["date"], errors="coerce")
            self.df = df
            logger.info(f"Loaded Argo index: {len(df)} profiles across {df['wmo'].nunique()} unique floats.")
        except Exception as e:
            logger.error(f"Error loading Argo index CSV: {e}")
            self.df = None

    def ensure_index(self):
        if self.df is None:
            self._load_index()
        if self.df is None:
            raise RuntimeError(f"Argo index data could not be loaded from {self.index_csv}")

    def get_floats(self, active_only: bool = True, bbox: Optional[str] = None) -> ArgoFloatsResponse:
        """Returns inventory of unique Argo floats with latest position and profile counts."""
        self.ensure_index()
        df = self.df

        if bbox:
            min_lon, min_lat, max_lon, max_lat = parse_bbox(bbox)
            df = df[
                (df["longitude"] >= min_lon) & (df["longitude"] <= max_lon) &
                (df["latitude"] >= min_lat) & (df["latitude"] <= max_lat)
            ]

        # Group by WMO float to get latest fix and profile count
        floats_list = []
        for wmo, group in df.groupby("wmo"):
            sorted_group = group.sort_values(by="date_dt", ascending=True)
            latest = sorted_group.iloc[-1]
            
            floats_list.append(
                ArgoFloatItem(
                    wmo_id=str(wmo),
                    institution=str(latest.get("institution", "INCOIS")),
                    profiler_type=str(latest.get("profiler_type", "844 (APEX)")),
                    total_profiles=len(group),
                    latest_position=FloatLatestPosition(
                        lat=round(float(latest["latitude"]), 4),
                        lon=round(float(latest["longitude"]), 4),
                        timestamp=str(latest["date"]),
                    ),
                    data_modes=["R", "D"],
                    has_bgc=False,
                )
            )

        return ArgoFloatsResponse(total_floats=len(floats_list), floats=floats_list)

    def get_float_trajectory(self, wmo_id: str) -> ArgoTrajectoryResponse:
        """Returns drift trajectory and chronological cycle sequence for a specific float."""
        self.ensure_index()
        matches = self.df[self.df["wmo"] == str(wmo_id)].sort_values(by="date_dt", ascending=True)

        if matches.empty:
            raise ValueError(f"No Argo float found with WMO ID: {wmo_id}")

        points = []
        for idx, row in matches.iterrows():
            prof_id = row["profile_id"]
            # Extract cycle number if present in filename e.g. R1902669_085 -> 85
            cycle_num = None
            if "_" in prof_id:
                try:
                    cycle_num = int(prof_id.split("_")[-1].replace("D", ""))
                except ValueError:
                    pass

            points.append(
                TrajectoryPoint(
                    cycle=cycle_num,
                    profile_id=prof_id,
                    profile_file=str(row["file"]),
                    lat=round(float(row["latitude"]), 4),
                    lon=round(float(row["longitude"]), 4),
                    date=str(row["date"]),
                )
            )

        return ArgoTrajectoryResponse(
            wmo_id=str(wmo_id),
            cycle_count=len(points),
            trajectory=points,
        )

    def get_profile(self, profile_id: str, qc_filter: Optional[List[int]] = None) -> ArgoProfileResponse:
        """
        Reads physical CTD profile from the actual Argo NetCDF file on disk.
        """
        self.ensure_index()
        clean_id = profile_id.replace(".nc", "")
        file_path = Path(self.data_dir) / f"{clean_id}.nc"

        if not file_path.exists():
            # Try searching by exact profile_id in index to find exact file
            row = self.df[self.df["profile_id"] == clean_id]
            if not row.empty:
                fname = os.path.basename(row.iloc[0]["file"])
                file_path = Path(self.data_dir) / fname

        if not file_path.exists():
            raise FileNotFoundError(f"Argo profile NetCDF file not found for: {profile_id}")

        try:
            with xr.open_dataset(file_path) as ds:
                # Extract coordinates and profile metadata
                lat = float(ds["LATITUDE"].values[0]) if "LATITUDE" in ds else 0.0
                lon = float(ds["LONGITUDE"].values[0]) if "LONGITUDE" in ds else 0.0
                
                # Check for JULD or date
                time_str = ""
                if "JULD" in ds:
                    try:
                        time_str = str(pd.to_datetime(ds["JULD"].values[0]))
                    except Exception:
                        pass

                # Extract 1D level arrays
                pres = ds["PRES"].values[0].astype(float) if "PRES" in ds else []
                temp = ds["TEMP"].values[0].astype(float) if "TEMP" in ds else []
                psal = ds["PSAL"].values[0].astype(float) if "PSAL" in ds else []

                pres_adj = ds["PRES_ADJUSTED"].values[0].astype(float) if "PRES_ADJUSTED" in ds else None
                temp_adj = ds["TEMP_ADJUSTED"].values[0].astype(float) if "TEMP_ADJUSTED" in ds else None
                psal_adj = ds["PSAL_ADJUSTED"].values[0].astype(float) if "PSAL_ADJUSTED" in ds else None

                # Extract and decode QC byte flags
                def decode_qc(da_name):
                    if da_name not in ds:
                        return [None] * len(pres)
                    qc_raw = ds[da_name].values[0]
                    res = []
                    for q in qc_raw:
                        if isinstance(q, bytes):
                            q_str = q.decode("utf-8").strip()
                            res.append(int(q_str) if q_str.isdigit() else None)
                        elif isinstance(q, (int, np.integer)):
                            res.append(int(q))
                        else:
                            res.append(None)
                    return res

                pres_qc = decode_qc("PRES_QC")
                temp_qc = decode_qc("TEMP_QC")
                psal_qc = decode_qc("PSAL_QC")

                # Combine into sorted levels (ascending pressure)
                raw_levels = []
                for i in range(len(pres)):
                    p = float(pres[i]) if not np.isnan(pres[i]) else None
                    t = float(temp[i]) if not np.isnan(temp[i]) else None
                    s = float(psal[i]) if not np.isnan(psal[i]) else None
                    
                    if p is None or p > 90000:
                        continue

                    # Apply QC filter if requested
                    t_qc = temp_qc[i] if i < len(temp_qc) else None
                    if qc_filter and t_qc is not None and t_qc not in qc_filter:
                        continue

                    raw_levels.append({
                        "pres": round(p, 2),
                        "pres_qc": pres_qc[i] if i < len(pres_qc) else None,
                        "temp": round(t, 3) if t is not None else None,
                        "temp_qc": t_qc,
                        "psal": round(s, 3) if s is not None else None,
                        "psal_qc": psal_qc[i] if i < len(psal_qc) else None,
                        "pres_adjusted": round(float(pres_adj[i]), 2) if (pres_adj is not None and not np.isnan(pres_adj[i])) else None,
                        "temp_adjusted": round(float(temp_adj[i]), 3) if (temp_adj is not None and not np.isnan(temp_adj[i])) else None,
                        "psal_adjusted": round(float(psal_adj[i]), 3) if (psal_adj is not None and not np.isnan(psal_adj[i])) else None,
                    })

                # Sort levels by pressure ascending
                raw_levels.sort(key=lambda x: x["pres"])

                # Extract WMO from profile_id
                wmo = clean_id.replace("R", "").replace("D", "").split("_")[0]

                return ArgoProfileResponse(
                    profile_id=clean_id,
                    wmo_id=wmo,
                    timestamp=time_str or "2026-06-15T12:00:00",
                    location={"lat": round(lat, 4), "lon": round(lon, 4)},
                    profile_qc={
                        "temp_qc": sanitize_value(ds["PROFILE_TEMP_QC"].values[0]) if "PROFILE_TEMP_QC" in ds else "A",
                        "psal_qc": sanitize_value(ds["PROFILE_PSAL_QC"].values[0]) if "PROFILE_PSAL_QC" in ds else "A",
                    },
                    levels_count=len(raw_levels),
                    data=[ArgoProfileLevel(**lvl) for lvl in raw_levels],
                )
        except Exception as e:
            logger.error(f"Error reading Argo NetCDF file {file_path}: {e}")
            raise RuntimeError(f"Failed to read Argo profile {profile_id}: {e}")

# Singleton accessor
_argo_service_instance: Optional[ArgoService] = None

def get_argo_service() -> ArgoService:
    global _argo_service_instance
    if _argo_service_instance is None:
        _argo_service_instance = ArgoService()
    return _argo_service_instance

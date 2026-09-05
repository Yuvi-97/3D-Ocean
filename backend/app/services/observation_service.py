"""
Integrated In-Situ Observation Service.

Provides unified spatial indexing, bounding box discovery, and paginated
catalog exploration across both Argo profiling floats and underwater Gliders.
"""

import logging
from typing import Dict, List, Optional, Any
import pandas as pd

from ..utils.geo import parse_bbox
from ..schemas.observations import (
    SpatialSearchResponse, SpatialObservationItem,
    CatalogResponse, CatalogRecordItem
)
from .argo_service import get_argo_service
from .glider_service import get_glider_service

logger = logging.getLogger(__name__)

class ObservationService:
    """Service for combined search, spatial queries, and catalog navigation."""

    def __init__(self):
        self.argo_service = get_argo_service()
        self.glider_service = get_glider_service()

    def spatial_search(
        self,
        bbox: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        platform_type: str = "all",
        min_qc: int = 2,
    ) -> SpatialSearchResponse:
        """
        Discovers all in-situ platforms (Argo floats + Gliders) within requested
        geographic bounding box and date range.
        """
        min_lon, min_lat, max_lon, max_lat = parse_bbox(bbox)
        results: List[SpatialObservationItem] = []
        argo_cnt = 0
        glider_cnt = 0

        # Query Argo index
        if platform_type in ["all", "argo"]:
            self.argo_service.ensure_index()
            a_df = self.argo_service.df
            if a_df is not None:
                mask = (
                    (a_df["longitude"] >= min_lon) & (a_df["longitude"] <= max_lon) &
                    (a_df["latitude"] >= min_lat) & (a_df["latitude"] <= max_lat)
                )
                if start_date:
                    mask &= (a_df["date_dt"] >= pd.to_datetime(start_date))
                if end_date:
                    mask &= (a_df["date_dt"] <= pd.to_datetime(end_date))

                a_matches = a_df[mask]
                argo_cnt = len(a_matches)
                
                for _, row in a_matches.iterrows():
                    results.append(
                        SpatialObservationItem(
                            id=str(row["profile_id"]),
                            type="argo",
                            platform_id=str(row["wmo"]),
                            timestamp=str(row["date"]),
                            lat=round(float(row["latitude"]), 4),
                            lon=round(float(row["longitude"]), 4),
                            max_depth_m=2000.0,
                            qc_summary="good",
                        )
                    )

        # Query Glider index
        if platform_type in ["all", "glider"]:
            self.glider_service.ensure_index()
            g_df = self.glider_service.df
            if g_df is not None:
                mask = (
                    (g_df["longitude"] >= min_lon) & (g_df["longitude"] <= max_lon) &
                    (g_df["latitude"] >= min_lat) & (g_df["latitude"] <= max_lat)
                )
                if start_date:
                    mask &= (g_df["date_dt"] >= pd.to_datetime(start_date))
                if end_date:
                    mask &= (g_df["date_dt"] <= pd.to_datetime(end_date))

                g_matches = g_df[mask]
                glider_cnt = len(g_matches)

                for _, row in g_matches.iterrows():
                    max_p = float(row["pressure_max"]) if not pd.isna(row["pressure_max"]) else 1000.0
                    results.append(
                        SpatialObservationItem(
                            id=str(row["profile_id"]),
                            type="glider",
                            platform_id=str(row["wmo"]),
                            timestamp=str(row["date_dt"]),
                            lat=round(float(row["latitude"]), 4),
                            lon=round(float(row["longitude"]), 4),
                            max_depth_m=round(max_p, 1),
                            qc_summary="good",
                        )
                    )

        return SpatialSearchResponse(
            total_found=len(results),
            argo_count=argo_cnt,
            glider_count=glider_cnt,
            observations=results,
        )

    def get_catalog(
        self,
        page: int = 1,
        page_size: int = 25,
        platform_type: Optional[str] = None,
        wmo: Optional[str] = None,
        sort_by: str = "date_desc",
    ) -> CatalogResponse:
        """Paginated tabular search across all observation profiles."""
        self.argo_service.ensure_index()
        self.glider_service.ensure_index()

        records = []

        # Add Argo
        if not platform_type or platform_type == "argo":
            a_df = self.argo_service.df
            if a_df is not None:
                for _, row in a_df.iterrows():
                    if wmo and str(row["wmo"]) != str(wmo):
                        continue
                    records.append({
                        "record_id": str(row["profile_id"]),
                        "platform_type": "Argo Float",
                        "wmo": str(row["wmo"]),
                        "institution": str(row.get("institution", "INCOIS")),
                        "date": str(row["date"]),
                        "date_dt": row["date_dt"],
                        "latitude": round(float(row["latitude"]), 4),
                        "longitude": round(float(row["longitude"]), 4),
                        "levels": 72,
                        "ocean": "Indian Ocean",
                        "file_path": str(row["file"]),
                    })

        # Add Glider
        if not platform_type or platform_type == "glider":
            g_df = self.glider_service.df
            if g_df is not None:
                for _, row in g_df.iterrows():
                    if wmo and str(row["wmo"]) != str(wmo):
                        continue
                    records.append({
                        "record_id": str(row["profile_id"]),
                        "platform_type": "Underwater Glider",
                        "wmo": str(row["wmo"]),
                        "institution": "EGO / OceanGliders",
                        "date": str(row["date_dt"]),
                        "date_dt": row["date_dt"],
                        "latitude": round(float(row["latitude"]), 4),
                        "longitude": round(float(row["longitude"]), 4),
                        "levels": int(row["n_levels"]) if not pd.isna(row.get("n_levels")) else 200,
                        "ocean": "Indian Ocean",
                        "file_path": str(row["file"]),
                    })

        # Sorting
        if sort_by == "date_desc":
            records.sort(key=lambda x: str(x.get("date_dt", "")), reverse=True)
        elif sort_by == "date_asc":
            records.sort(key=lambda x: str(x.get("date_dt", "")), reverse=False)

        total_records = len(records)
        page = max(1, page)
        page_size = max(5, min(page_size, 100))
        total_pages = max(1, (total_records + page_size - 1) // page_size)

        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        paginated_items = records[start_idx:end_idx]

        items = [
            CatalogRecordItem(
                record_id=r["record_id"],
                platform_type=r["platform_type"],
                wmo=r["wmo"],
                institution=r.get("institution"),
                date=r["date"],
                latitude=r["latitude"],
                longitude=r["longitude"],
                levels=r.get("levels"),
                ocean=r.get("ocean", "Indian Ocean"),
                file_path=r["file_path"],
            )
            for r in paginated_items
        ]

        return CatalogResponse(
            page=page,
            page_size=page_size,
            total_records=total_records,
            total_pages=total_pages,
            items=items,
        )

# Singleton accessor
_obs_service_instance: Optional[ObservationService] = None

def get_observation_service() -> ObservationService:
    global _obs_service_instance
    if _obs_service_instance is None:
        _obs_service_instance = ObservationService()
    return _obs_service_instance

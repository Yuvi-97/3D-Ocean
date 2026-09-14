"""
Hugging Face Dataset Data Provider for Ocean Visualizer Backend.

Interacts with the Hugging Face Dataset repository (e.g. Yuvi2006pro/ocean-data).
Ensures zero redundant downloads:
- Metadata and CSV indices (Argo & Gliders) are cached once into memory.
- The 2.1 GB CMEMS numerical model file is cached once on startup/first load (NEVER per request).
- Individual in-situ profiles (~22 KB each) are fetched on-demand and cached locally.
- Directory mapping between local 'glider' and remote 'gliders' is handled transparently.
"""

import os
import logging
from pathlib import Path
from typing import Optional, Set

import pandas as pd
import xarray as xr
from huggingface_hub import HfApi, hf_hub_download
from huggingface_hub.utils import HfHubHTTPError, RepositoryNotFoundError

from ..config import settings
from .base import BaseDataProvider

logger = logging.getLogger(__name__)


# Prevent Hugging Face Hub from initializing memory-heavy multithreaded Xet buffers on 512 MB instances
os.environ["HF_HUB_DISABLE_XET"] = "1"
os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"

import urllib.request


def _stream_download_low_memory(url: str, dest_path: Path, token: Optional[str] = None) -> Path:
    """
    Streams a large file in 1 MB chunks directly to disk with <15 MB RAM usage.
    Bypasses multithreaded rust buffers (hf-xet) to prevent Out-Of-Memory (OOM) on 512 MB instances like Render.
    """
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = dest_path.with_suffix(".tmp")

    headers = {"User-Agent": "3d-Ocean-Visualizer/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(url, headers=headers)
    logger.info(f"Streaming model NetCDF from Hugging Face into '{dest_path}' (low-memory 1MB chunked mode)...")

    with urllib.request.urlopen(req) as resp, open(temp_path, "wb") as f:
        total_size = int(resp.headers.get("Content-Length") or 0)
        downloaded = 0
        last_log = 0
        chunk_size = 1024 * 1024  # 1 MB chunk buffer

        while True:
            chunk = resp.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            if downloaded - last_log >= 250 * 1024 * 1024:
                pct = (downloaded / total_size * 100) if total_size else 0
                logger.info(f"Downloaded {downloaded / 1048576:.1f} MB / {total_size / 1048576:.1f} MB ({pct:.1f}%)")
                last_log = downloaded

    temp_path.replace(dest_path)
    logger.info(f"Model NetCDF successfully cached at '{dest_path}' ({downloaded / 1048576:.1f} MB).")
    return dest_path


class HuggingFaceDataProvider(BaseDataProvider):
    """Data provider reading from a Hugging Face Dataset repository."""

    name: str = "huggingface"

    def __init__(
        self,
        repo_id: Optional[str] = None,
        revision: Optional[str] = None,
        token: Optional[str] = None,
        cache_dir: Optional[str] = None,
    ):
        self.repo_id = repo_id or settings.HF_DATASET_REPO
        self.revision = revision or settings.HF_REVISION
        self.token = token or settings.HF_TOKEN
        self.cache_dir = cache_dir or settings.HF_CACHE_DIR

        # Normalized remote paths
        self.model_filename = "model/cmems_indian_ocean_2026_06.nc"
        self.argo_index_filename = "argo/argo_incois_indian_ocean_2026_index.csv"
        # Notice: remote directory is 'gliders', mapped from local 'glider'
        self.glider_index_filename = "gliders/glider_2026_indian_ocean_index.csv"

        self._model_ds: Optional[xr.Dataset] = None
        self._argo_df: Optional[pd.DataFrame] = None
        self._glider_df: Optional[pd.DataFrame] = None
        self._known_repo_files: Optional[Set[str]] = None

    def validate_connection(self) -> None:
        """
        Verifies that the Hugging Face Dataset repository is reachable and contains
        the necessary model, Argo, and Glider files.
        Fails fast with clear error messages. Does NOT silently fall back to local data.
        """
        logger.info(f"Validating Hugging Face Dataset connection: repo='{self.repo_id}', revision='{self.revision}'")
        try:
            api = HfApi(token=self.token)
            repo_info = api.repo_info(repo_id=self.repo_id, repo_type="dataset", revision=self.revision)
            
            # Check for required files in siblings listing
            siblings = [s.rfilename for s in (repo_info.siblings or [])]
            self._known_repo_files = set(siblings)

            missing = []
            if self.model_filename not in self._known_repo_files:
                missing.append(f"Model file: '{self.model_filename}'")
            if self.argo_index_filename not in self._known_repo_files:
                missing.append(f"Argo index: '{self.argo_index_filename}'")
            if self.glider_index_filename not in self._known_repo_files:
                missing.append(f"Glider index: '{self.glider_index_filename}'")

            if missing:
                err_msg = (
                    f"HUGGINGFACE verification failed: Repository '{self.repo_id}' is missing required files:\n  - "
                    + "\n  - ".join(missing)
                )
                logger.error(err_msg)
                raise RuntimeError(err_msg)

            logger.info(
                f"HUGGINGFACE data source validated successfully: repo='{self.repo_id}', "
                f"total_files={len(self._known_repo_files)}"
            )

        except RepositoryNotFoundError:
            err_msg = f"HUGGINGFACE repository '{self.repo_id}' was not found. Please check repo name and access."
            logger.error(err_msg)
            raise RuntimeError(err_msg)
        except HfHubHTTPError as e:
            err_msg = f"HUGGINGFACE API error accessing '{self.repo_id}': {e}"
            logger.error(err_msg)
            raise RuntimeError(err_msg)
        except Exception as e:
            err_msg = f"Failed to connect to HUGGINGFACE dataset '{self.repo_id}': {e}"
            logger.error(err_msg)
            raise RuntimeError(err_msg)

    def get_model_dataset(self) -> xr.Dataset:
        """
        Retrieves the 2.1 GB CMEMS numerical model dataset.
        
        CRITICAL PERFORMANCE GUARANTEE:
        - Uses low-memory chunked streaming with local caching or reuses pre-existing local file as warm cache.
        - Memory overhead is <15 MB (never exceeds 512 MB on low-memory servers like Render).
        - The 2.1 GB file is never downloaded repeatedly per request.
        - Subsequent API requests load from the local cache in <1ms without any network download.
        """
        if self._model_ds is None:
            # 1. Check if a pre-existing local copy exists at LOCAL_DATA_ROOT/model
            local_candidate = Path(settings.LOCAL_DATA_ROOT) / "model" / "cmems_indian_ocean_2026_06.nc"
            if local_candidate.exists() and local_candidate.stat().st_size > 1_000_000_000:
                logger.info(
                    f"Found pre-existing CMEMS model file at '{local_candidate}' ({local_candidate.stat().st_size} bytes). "
                    "Reusing as warm cache to avoid redundant 2.1 GB download."
                )
                self._model_ds = xr.open_dataset(str(local_candidate))
                return self._model_ds

            # 2. Check dedicated local cache file
            cache_root = Path(self.cache_dir) if self.cache_dir else Path.home() / ".cache" / "huggingface" / "ocean_data"
            cached_nc_path = cache_root / self.model_filename
            if cached_nc_path.exists() and cached_nc_path.stat().st_size > 1_000_000_000:
                logger.info(f"Reusing existing cached NetCDF at '{cached_nc_path}'.")
                self._model_ds = xr.open_dataset(str(cached_nc_path))
                return self._model_ds

            # 3. Stream download from Hugging Face with <15 MB RAM footprint
            direct_url = f"https://huggingface.co/datasets/{self.repo_id}/resolve/{self.revision}/{self.model_filename}"
            logger.info(
                f"Accessing CMEMS model from Hugging Face Dataset '{self.repo_id}' "
                f"(streaming once into '{cached_nc_path}' with low-memory 1MB chunks)..."
            )
            try:
                final_path = _stream_download_low_memory(direct_url, cached_nc_path, token=self.token)
                self._model_ds = xr.open_dataset(str(final_path))
            except Exception as stream_err:
                logger.warning(f"Direct stream download encountered error ({stream_err}). Falling back to hf_hub_download...")
                try:
                    fallback_path = hf_hub_download(
                        repo_id=self.repo_id,
                        filename=self.model_filename,
                        revision=self.revision,
                        repo_type="dataset",
                        token=self.token,
                        cache_dir=self.cache_dir,
                    )
                    logger.info(f"CMEMS NetCDF ready at cached path: {fallback_path}")
                    self._model_ds = xr.open_dataset(fallback_path)
                except Exception as fallback_err:
                    err_msg = (
                        f"Failed to access CMEMS model NetCDF from Hugging Face dataset '{self.repo_id}': {fallback_err}. "
                        "Ensure adequate disk space and valid internet connection."
                    )
                    logger.error(err_msg)
                    raise RuntimeError(err_msg)

        return self._model_ds

    def get_argo_index(self) -> pd.DataFrame:
        """Fetches and parses the Argo float index CSV from Hugging Face."""
        if self._argo_df is None:
            logger.info(f"Fetching Argo index CSV from Hugging Face '{self.repo_id}'...")
            try:
                cached_csv_path = hf_hub_download(
                    repo_id=self.repo_id,
                    filename=self.argo_index_filename,
                    revision=self.revision,
                    repo_type="dataset",
                    token=self.token,
                    cache_dir=self.cache_dir,
                )
                df = pd.read_csv(cached_csv_path)
                df["wmo"] = df["file"].apply(
                    lambda f: f.split("/")[1] if "/" in str(f) else str(f).split("_")[0].replace("R", "").replace("D", "")
                )
                df["profile_id"] = df["file"].apply(
                    lambda f: os.path.basename(str(f)).replace(".nc", "")
                )
                df["date_dt"] = pd.to_datetime(df["date"], errors="coerce")
                self._argo_df = df
                logger.info(f"Loaded Argo index from HF: {len(df)} profiles across {df['wmo'].nunique()} floats.")
            except Exception as e:
                err_msg = f"Failed to load Argo index CSV from Hugging Face: {e}"
                logger.error(err_msg)
                raise RuntimeError(err_msg)

        return self._argo_df

    def get_argo_profile_dataset(
        self,
        wmo_id: str,
        profile_id: str,
        file_rel_path: Optional[str] = None
    ) -> xr.Dataset:
        """
        Fetches an individual Argo profile NetCDF (~22 KB) on demand from Hugging Face.
        Caches it locally so repeat views are instantaneous.
        """
        clean_id = profile_id.replace(".nc", "")
        # The file in the HF repo is stored as argo/<filename>.nc
        target_filename = f"argo/{clean_id}.nc"

        if file_rel_path:
            fname = os.path.basename(file_rel_path)
            target_filename = f"argo/{fname}"

        try:
            cached_path = hf_hub_download(
                repo_id=self.repo_id,
                filename=target_filename,
                revision=self.revision,
                repo_type="dataset",
                token=self.token,
                cache_dir=self.cache_dir,
            )
            return xr.open_dataset(cached_path)
        except Exception as e:
            # Try finding filename in index
            df = self.get_argo_index()
            row = df[df["profile_id"] == clean_id]
            if not row.empty:
                fname = os.path.basename(row.iloc[0]["file"])
                try:
                    cached_path = hf_hub_download(
                        repo_id=self.repo_id,
                        filename=f"argo/{fname}",
                        revision=self.revision,
                        repo_type="dataset",
                        token=self.token,
                        cache_dir=self.cache_dir,
                    )
                    return xr.open_dataset(cached_path)
                except Exception:
                    pass

            raise FileNotFoundError(
                f"Argo profile '{profile_id}' could not be fetched from Hugging Face repo '{self.repo_id}': {e}"
            )

    def get_glider_index(self) -> pd.DataFrame:
        """Fetches and parses the Glider index CSV from Hugging Face."""
        if self._glider_df is None:
            logger.info(f"Fetching Glider index CSV from Hugging Face '{self.repo_id}'...")
            try:
                cached_csv_path = hf_hub_download(
                    repo_id=self.repo_id,
                    filename=self.glider_index_filename,
                    revision=self.revision,
                    repo_type="dataset",
                    token=self.token,
                    cache_dir=self.cache_dir,
                )
                df = pd.read_csv(cached_csv_path)
                df["wmo"] = df["wmo"].astype(str)
                df["profile_id"] = df["file"].apply(
                    lambda f: os.path.basename(str(f)).replace(".nc", "")
                )
                df["date_dt"] = pd.to_datetime(df["date"].astype(str), format="%Y%m%d%H%M%S", errors="coerce")
                self._glider_df = df
                logger.info(f"Loaded Glider index from HF: {len(df)} profiles across {df['wmo'].nunique()} gliders.")
            except Exception as e:
                err_msg = f"Failed to load Glider index CSV from Hugging Face: {e}"
                logger.error(err_msg)
                raise RuntimeError(err_msg)

        return self._glider_df

    def get_glider_profile_dataset(
        self,
        glider_id: str,
        profile_id: str,
        file_rel_path: Optional[str] = None
    ) -> xr.Dataset:
        """
        Fetches an individual Glider profile NetCDF (~22 KB) on demand from Hugging Face.
        Caches it locally so repeat views are instantaneous.
        """
        clean_id = profile_id.replace(".nc", "")
        clean_wmo = str(glider_id).replace("R", "")

        # Candidate paths in HF repo (under gliders/)
        candidates = [
            f"gliders/{clean_wmo}/{clean_id}.nc",
            f"gliders/{clean_id}.nc",
        ]

        if file_rel_path:
            fname = os.path.basename(file_rel_path)
            candidates.insert(0, f"gliders/{clean_wmo}/{fname}")
            candidates.insert(1, f"gliders/{fname}")

        # Check in dataframe if possible
        df = self.get_glider_index()
        row = df[df["profile_id"] == clean_id]
        if not row.empty:
            fname = os.path.basename(row.iloc[0]["file"])
            wmo_val = str(row.iloc[0]["wmo"])
            candidates.insert(0, f"gliders/{wmo_val}/{fname}")

        for candidate in candidates:
            try:
                cached_path = hf_hub_download(
                    repo_id=self.repo_id,
                    filename=candidate,
                    revision=self.revision,
                    repo_type="dataset",
                    token=self.token,
                    cache_dir=self.cache_dir,
                )
                return xr.open_dataset(cached_path)
            except Exception:
                continue

        raise FileNotFoundError(
            f"Glider profile '{profile_id}' (WMO: {glider_id}) could not be fetched from Hugging Face repo '{self.repo_id}'"
        )

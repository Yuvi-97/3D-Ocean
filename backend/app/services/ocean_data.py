"""
Ocean Data Service: Lazy-loading data access using xarray.

Design Decisions:
1. **Lazy Loading**: xarray + netCDF4 engine loads data lazily.
   - The 694MB file is never loaded into memory at startup.
   - Only requested subsets are fetched and returned.
   - This approach scales to multi-GB files without performance impact.

2. **Singleton Pattern**: OceanDataService is instantiated once and reused.
   - Initializing xarray.Dataset is relatively fast (~100ms).
   - Reusing prevents repeated disk I/O.

3. **Data Selection by Indices**: We use integer indexing (isel) instead of label-based 
   indexing (sel) for predictable performance and to avoid floating-point precision issues.

4. **Validation Before Slicing**: Always validate user input against known dimensions
   before attempting to slice data. This prevents cryptic xarray errors.

5. **Float32 for Tiles**: Deep learning frameworks expect float32.
   NetCDF already stores as float32, so no conversion overhead.
"""

from typing import Optional, Dict, List, Tuple, Any
import logging

import xarray as xr
import numpy as np
from pydantic import BaseModel

from ..config import settings

logger = logging.getLogger(__name__)


# ============================================================================
# Response Models (Pydantic)
# ============================================================================
class MetadataVariable(BaseModel):
    """Metadata for a single ocean data variable."""
    name: str
    long_name: str
    units: str
    valid_min: float
    valid_max: float
    standard_name: Optional[str] = None


class DatasetMetadata(BaseModel):
    """Complete metadata for the ocean dataset."""
    title: str
    institution: str
    source: str
    variables: List[MetadataVariable]
    dimensions: Dict[str, int]
    time_values: List[str]  # ISO 8601 formatted
    depth_values: List[float]
    latitude_range: Tuple[float, float]  # (min, max)
    longitude_range: Tuple[float, float]  # (min, max)
    geographical_area: str
    dataset_id: str
    creation_date: str


class TileResponse(BaseModel):
    """Response model for data tiles suitable for Three.js visualization."""
    variable: str
    time_index: int
    time_value: str
    depth_index: int
    depth_value: float
    latitude_count: int
    longitude_count: int
    data: List[List[float]]  # Grid of values [latitude][longitude]
    data_min: float
    data_max: float
    data_mean: float
    latitude_range: Tuple[float, float]
    longitude_range: Tuple[float, float]


# ============================================================================
# Ocean Data Service
# ============================================================================
class OceanDataService:
    """
    Lazy-loading service for ocean data from NetCDF files.
    
    This service wraps xarray operations to provide:
    - Efficient subset selection (lazy evaluation)
    - Proper error handling
    - Response formatting for frontend consumption
    """
    
    def __init__(self, netcdf_path: str):
        """
        Initialize the service by opening the NetCDF dataset.
        
        Args:
            netcdf_path: Path to the NetCDF file
            
        Design Note:
        - We open the dataset at initialization.
        - xarray does NOT load data into memory until explicitly requested (chunks=None).
        - Dataset metadata (dimensions, coordinates) is loaded, but data arrays remain on disk.
        - This initialization is fast (~100ms) and safe to do at server startup.
        """
        logger.info(f"Opening NetCDF file: {netcdf_path}")
        try:
            self.dataset = xr.open_dataset(
                netcdf_path,
                engine='netcdf4',
                chunks={}  # Enable chunking for lazy loading
            )
            logger.info(f"Dataset loaded. Dimensions: {dict(self.dataset.dims)}")
        except Exception as e:
            logger.error(f"Failed to open NetCDF file: {e}")
            raise
    
    def get_metadata(self) -> DatasetMetadata:
        """
        Extract and return dataset metadata.
        
        Returns:
            DatasetMetadata with full dataset information
            
        Design Note:
        - This method only reads metadata (coordinates, attributes).
        - No data arrays are loaded into memory.
        - Safe to call frequently without performance impact.
        """
        logger.debug("Generating metadata response")
        
        # Extract variables metadata
        variables = []
        for var_name in ['thetao', 'so', 'uo', 'vo']:
            if var_name in self.dataset.data_vars:
                var = self.dataset[var_name]
                variables.append(MetadataVariable(
                    name=var_name,
                    long_name=var.attrs.get('long_name', ''),
                    units=var.attrs.get('units', ''),
                    standard_name=var.attrs.get('standard_name', ''),
                    valid_min=float(var.attrs.get('valid_min', np.nan)),
                    valid_max=float(var.attrs.get('valid_max', np.nan)),
                ))
        
        # Extract time values (convert to ISO 8601 strings for JSON serialization)
        time_values = [str(t) for t in self.dataset['time'].values]
        
        # Extract depth and lat/lon coordinates
        depth_values = self.dataset['depth'].values.tolist()
        latitude = self.dataset['latitude'].values
        longitude = self.dataset['longitude'].values
        
        return DatasetMetadata(
            title=self.dataset.attrs.get('title', 'Unknown'),
            institution=self.dataset.attrs.get('institution', 'Unknown'),
            source=self.dataset.attrs.get('source', 'Unknown'),
            variables=variables,
            dimensions=dict(self.dataset.dims),
            time_values=time_values,
            depth_values=depth_values,
            latitude_range=(float(latitude.min()), float(latitude.max())),
            longitude_range=(float(longitude.min()), float(longitude.max())),
            geographical_area="Western Indian Ocean (50–100°E, 0–25°N)",
            dataset_id=self.dataset.attrs.get('subset:datasetId', 'cmems_mod_glo_phy_my'),
            creation_date=self.dataset.attrs.get('subset:date', 'Unknown'),
        )
    
    def get_tile(
        self,
        variable: str,
        time_index: int,
        depth_index: int,
        latitude_start: Optional[int] = None,
        latitude_end: Optional[int] = None,
        longitude_start: Optional[int] = None,
        longitude_end: Optional[int] = None,
    ) -> TileResponse:
        """
        Extract a data tile (subset) for rendering.
        
        Args:
            variable: Variable name ('thetao', 'so', 'uo', 'vo')
            time_index: Index into time dimension
            depth_index: Index into depth dimension
            latitude_start: Start latitude index (default: 0)
            latitude_end: End latitude index (default: all)
            longitude_start: Start longitude index (default: 0)
            longitude_end: End longitude index (default: all)
            
        Returns:
            TileResponse with data ready for Three.js visualization
            
        Raises:
            ValueError: If input is invalid
            
        Design Notes:
        1. Integer indexing (isel) is used for predictable, fast slicing.
        2. Data is only loaded when .values is called (lazy evaluation in action).
        3. Validation prevents index out-of-bounds errors and huge requests.
        4. Grid data is returned as List[List[float]] for JSON serialization.
        """
        
        # Validation Phase
        self._validate_tile_request(
            variable, time_index, depth_index,
            latitude_start, latitude_end,
            longitude_start, longitude_end
        )
        
        # Apply defaults and constraints
        lat_size = self.dataset.dims['latitude']
        lon_size = self.dataset.dims['longitude']
        
        latitude_start = latitude_start or 0
        latitude_end = latitude_end or lat_size
        longitude_start = longitude_start or 0
        longitude_end = longitude_end or lon_size
        
        # Enforce maximum tile sizes to prevent server overload
        if latitude_end - latitude_start > settings.MAX_TILE_LATITUDE_POINTS:
            latitude_end = latitude_start + settings.MAX_TILE_LATITUDE_POINTS
        if longitude_end - longitude_start > settings.MAX_TILE_LONGITUDE_POINTS:
            longitude_end = longitude_start + settings.MAX_TILE_LONGITUDE_POINTS
        
        logger.info(
            f"Fetching tile: {variable}[time={time_index}, depth={depth_index}, "
            f"lat={latitude_start}:{latitude_end}, lon={longitude_start}:{longitude_end}]"
        )
        
        # Selection Phase (still lazy at this point)
        try:
            data_subset = self.dataset[variable].isel(
                time=time_index,
                depth=depth_index,
                latitude=slice(latitude_start, latitude_end),
                longitude=slice(longitude_start, longitude_end),
            )
            
            # Materialization Phase (actual data loading happens here)
            data_values = data_subset.values  # This triggers disk I/O for the subset
            
        except Exception as e:
            logger.error(f"Error fetching tile: {e}")
            raise ValueError(f"Failed to fetch tile: {str(e)}")
        
        # Extract coordinate values for the selected region
        lat_indices = range(latitude_start, latitude_end)
        lon_indices = range(longitude_start, longitude_end)
        latitude_coords = self.dataset['latitude'].isel(latitude=lat_indices).values
        longitude_coords = self.dataset['longitude'].isel(longitude=lon_indices).values
        
        # Prepare response
        response = TileResponse(
            variable=variable,
            time_index=time_index,
            time_value=str(self.dataset['time'].isel(time=time_index).values),
            depth_index=depth_index,
            depth_value=float(self.dataset['depth'].isel(depth=depth_index).values),
            latitude_count=data_values.shape[0],
            longitude_count=data_values.shape[1],
            data=data_values.tolist(),  # Convert numpy array to nested list for JSON
            data_min=float(np.nanmin(data_values)),
            data_max=float(np.nanmax(data_values)),
            data_mean=float(np.nanmean(data_values)),
            latitude_range=(float(latitude_coords.min()), float(latitude_coords.max())),
            longitude_range=(float(longitude_coords.min()), float(longitude_coords.max())),
        )
        
        logger.debug(
            f"Tile ready: {data_values.size} points, "
            f"value range: {response.data_min:.2f} to {response.data_max:.2f}"
        )
        
        return response
    
    def _validate_tile_request(
        self,
        variable: str,
        time_index: int,
        depth_index: int,
        latitude_start: Optional[int],
        latitude_end: Optional[int],
        longitude_start: Optional[int],
        longitude_end: Optional[int],
    ) -> None:
        """
        Validate tile request parameters before attempting to load data.
        
        Raises:
            ValueError: If any parameter is invalid
            
        Design Note:
        - Validation prevents cryptic xarray IndexError messages.
        - Early validation saves disk I/O on invalid requests.
        """
        
        # Validate variable
        if variable not in self.dataset.data_vars:
            available = list(self.dataset.data_vars.keys())
            raise ValueError(
                f"Unknown variable '{variable}'. "
                f"Available: {available}"
            )
        
        # Validate indices
        time_size = self.dataset.dims['time']
        depth_size = self.dataset.dims['depth']
        lat_size = self.dataset.dims['latitude']
        lon_size = self.dataset.dims['longitude']
        
        if not (0 <= time_index < time_size):
            raise ValueError(f"time_index {time_index} out of range [0, {time_size})")
        
        if not (0 <= depth_index < depth_size):
            raise ValueError(f"depth_index {depth_index} out of range [0, {depth_size})")
        
        # Validate slice bounds
        if latitude_start is not None and not (0 <= latitude_start < lat_size):
            raise ValueError(f"latitude_start {latitude_start} out of range [0, {lat_size})")
        
        if latitude_end is not None and not (0 < latitude_end <= lat_size):
            raise ValueError(f"latitude_end {latitude_end} out of range (0, {lat_size}]")
        
        if longitude_start is not None and not (0 <= longitude_start < lon_size):
            raise ValueError(f"longitude_start {longitude_start} out of range [0, {lon_size})")
        
        if longitude_end is not None and not (0 < longitude_end <= lon_size):
            raise ValueError(f"longitude_end {longitude_end} out of range (0, {lon_size}]")
        
        # Validate slice ordering
        if latitude_start is not None and latitude_end is not None:
            if latitude_start >= latitude_end:
                raise ValueError(
                    f"Invalid latitude range: start ({latitude_start}) >= end ({latitude_end})"
                )
        
        if longitude_start is not None and longitude_end is not None:
            if longitude_start >= longitude_end:
                raise ValueError(
                    f"Invalid longitude range: start ({longitude_start}) >= end ({longitude_end})"
                )


# ============================================================================
# Service Initialization
# ============================================================================
# Global instance (lazy initialized)
_ocean_service: Optional[OceanDataService] = None


def get_ocean_service() -> OceanDataService:
    """
    Dependency injection function for FastAPI.
    
    Returns the singleton OceanDataService instance.
    
    Design Note:
    - FastAPI's dependency injection calls this for each request.
    - We use a module-level singleton to ensure the dataset is only opened once.
    - This pattern is safe and efficient.
    """
    global _ocean_service
    if _ocean_service is None:
        _ocean_service = OceanDataService(settings.NETCDF_FILE_PATH)
    return _ocean_service

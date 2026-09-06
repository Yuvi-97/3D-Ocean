import os
import xarray as xr

FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "model", "cmems_indian_ocean_2026_06.nc")

ds = xr.open_dataset(FILE)

print("\n=== CMEMS DATA ANALYSIS ===")

# File size
size_gb = os.path.getsize(FILE) / (1024**3)
print(f"File size   : {size_gb:.2f} GB")

# Dimensions
print(f"Dimensions  : {dict(ds.sizes)}")

# Variables
print("Variables   :", list(ds.data_vars))

# Coordinate ranges
for coord in ["longitude", "latitude", "depth", "time"]:
    if coord in ds:
        values = ds[coord].values
        print(f"{coord:<11}: {values.min()} → {values.max()}")

# Variable details
print("\n=== VARIABLES ===")

for var in ds.data_vars:
    da = ds[var]

    # Don't load the entire 2 GB dataset into RAM
    print(
        f"{var:<8} | "
        f"shape={da.shape} | "
        f"units={da.attrs.get('units', 'N/A')}"
    )

ds.close()
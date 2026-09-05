import os
import glob
import xarray as xr

# ============================================================
# CONFIG
# ============================================================

GLIDER_DIR = r"D:\3d-Ocean\ocean-data\data\glider"

# ============================================================
# FIND FILES
# ============================================================

files = glob.glob(os.path.join(GLIDER_DIR, "**", "*.nc"), recursive=True)

print("=" * 60)
print("GLIDER DATASET ANALYSIS")
print("=" * 60)

print(f"\nTotal profile files : {len(files)}")

if not files:
    print("No NetCDF files found!")
    exit()


# ============================================================
# UNIQUE GLIDERS
# Extract directly from filename
# Example:
# R6801558_20260203_001.nc
#        ↓
# R6801558
# ============================================================

unique_gliders = set()

for file in files:
    filename = os.path.basename(file)
    glider_id = filename.split("_")[0]
    unique_gliders.add(glider_id)

print(f"Unique gliders     : {len(unique_gliders)}")

print("\nGlider IDs:")
print(", ".join(sorted(unique_gliders)))


# ============================================================
# INSPECT ONE PROFILE
# ============================================================

sample_file = files[0]

print("\n" + "=" * 60)
print("SAMPLE GLIDER PROFILE")
print("=" * 60)

print(f"\nFile: {os.path.basename(sample_file)}")

ds = xr.open_dataset(sample_file)


# ============================================================
# BASIC PROFILE INFORMATION
# ============================================================

print("\n--- Profile Information ---")

# Platform / Glider ID
for var in ["PLATFORM_NUMBER", "PLATFORM", "GLIDER", "PLATFORM_ID"]:
    if var in ds:
        value = ds[var].values.flatten()[0]

        if hasattr(value, "decode"):
            value = value.decode().strip()

        print(f"Glider ID   : {value}")
        break


# Date / Time
if "JULD" in ds:
    print(f"Date/Time   : {ds['JULD'].values.flatten()[0]}")


# Latitude
if "LATITUDE" in ds:
    print(f"Latitude    : {ds['LATITUDE'].values.flatten()[0]}")


# Longitude
if "LONGITUDE" in ds:
    print(f"Longitude   : {ds['LONGITUDE'].values.flatten()[0]}")


# ============================================================
# DIMENSIONS
# ============================================================

print("\n--- Profile Size ---")

for name, size in ds.sizes.items():
    print(f"{name:12}: {size}")


# ============================================================
# IMPORTANT MEASUREMENTS ONLY
# ============================================================

print("\n--- Measurements ---")

important_vars = [
    "PRES",
    "TEMP",
    "PSAL",
    "DOXY",
    "MOLAR_DOXY"
]

for var in important_vars:

    if var in ds:

        data = ds[var]

        units = data.attrs.get("units", "N/A")

        values = data.values.flatten()

        # Remove NaN values
        try:
            values = values[~__import__("numpy").isnan(values)]
        except:
            pass

        print(f"\n{var}")
        print(f"  Units : {units}")
        print(f"  Levels: {len(values)}")

        if len(values) > 0:
            print(f"  Range : {values.min():.3f} → {values.max():.3f}")


# ============================================================
# CLOSE
# ============================================================

ds.close()

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
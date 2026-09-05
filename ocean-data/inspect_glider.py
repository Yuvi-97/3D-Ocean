import xarray as xr
import numpy as np
import os

# ============================================================
# CHANGE ONLY THIS
# ============================================================

NC_FILE = r"D:\3d-Ocean\ocean-data\data\glider\6801558\R6801558_20260203_001.nc"


# ============================================================
# OPEN
# ============================================================

ds = xr.open_dataset(NC_FILE)

print("=" * 70)
print("GLIDER NETCDF - SIH 26067 INSPECTION")
print("=" * 70)

print("File:", os.path.basename(NC_FILE))
print("Size:", round(os.path.getsize(NC_FILE) / (1024 * 1024), 2), "MB")


# ============================================================
# 1. PROFILE STRUCTURE
# ============================================================

print("\n" + "=" * 70)
print("1. PROFILE STRUCTURE")
print("=" * 70)

for dim, size in ds.sizes.items():
    print(f"{dim:15} : {size}")


# ============================================================
# 2. LOCATION + TIME
# ============================================================

print("\n" + "=" * 70)
print("2. LOCATION & TIME")
print("=" * 70)

for var in ["LATITUDE", "LONGITUDE", "TIME"]:

    if var in ds:
        values = ds[var].values

        print(f"\n{var}:")
        print(values)


# ============================================================
# 3. OCEAN VARIABLES WE NEED
# ============================================================

print("\n" + "=" * 70)
print("3. IMPORTANT OCEAN VARIABLES")
print("=" * 70)

# Priority variables for PS 26067
variables = [
    "PRES",
    "PRES_ADJUSTED",

    "TEMP",
    "TEMP_ADJUSTED",

    "TEMP_DOXY",
    "TEMP_DOXY_ADJUSTED",

    "PSAL",
    "PSAL_ADJUSTED",

    "DOXY",
    "DOXY_ADJUSTED",

    "MOLAR_DOXY",
    "MOLAR_DOXY_ADJUSTED",

    "CHLA",
    "CHLA_ADJUSTED"
]

found = []

for var in variables:

    if var in ds:

        found.append(var)

        data = ds[var]

        print(f"\n{var}")
        print("  Shape :", data.shape)
        print("  Units :", data.attrs.get("units", "N/A"))
        print("  Long name :", data.attrs.get("long_name", "N/A"))


# ============================================================
# 4. ACTUAL PROFILE VALUES
# ============================================================

print("\n" + "=" * 70)
print("4. SAMPLE DATA")
print("=" * 70)

for var in found:

    data = ds[var].values

    # Remove profile dimension if present
    values = np.asarray(data).flatten()

    print(f"\n{var}")

    if values.size == 0:
        print("  No data")

    elif values.size <= 10:
        print(" ", values)

    else:
        print("  First 5 :", values[:5])
        print("  Last 5  :", values[-5:])


# ============================================================
# 5. DATA RANGES
# ============================================================

print("\n" + "=" * 70)
print("5. DATA RANGES")
print("=" * 70)

for var in found:

    try:

        values = np.asarray(ds[var].values, dtype=float)

        valid = values[np.isfinite(values)]

        if len(valid) > 0:

            print(
                f"{var:25} "
                f"min={np.min(valid):.3f}   "
                f"max={np.max(valid):.3f}"
            )

    except:
        pass


# ============================================================
# 6. QUALITY CONTROL VARIABLES
# ============================================================

print("\n" + "=" * 70)
print("6. QUALITY CONTROL")
print("=" * 70)

qc_vars = [
    v for v in ds.data_vars
    if "_QC" in v
]

if qc_vars:

    for var in qc_vars:

        values = np.asarray(ds[var].values).flatten()

        print(f"\n{var}")
        print("Unique values:", np.unique(values))

else:

    print("No QC variables found.")


# ============================================================
# 7. OTHER POTENTIALLY USEFUL VARIABLES
# ============================================================

print("\n" + "=" * 70)
print("7. OTHER VARIABLES AVAILABLE")
print("=" * 70)

for var in ds.data_vars:

    # Don't repeat the important variables
    if var not in found and "_QC" not in var:

        print(var)


# ============================================================
# 8. SUMMARY FOR OUR PROJECT
# ============================================================

print("\n" + "=" * 70)
print("8. SIH 26067 SUMMARY")
print("=" * 70)

print("\nVariables useful for 3D visualization:")

for var in found:
    print(" ✓", var)

print("\nAll variables available:", len(ds.data_vars))

print("\nDataset dimensions:")

for dim, size in ds.sizes.items():
    print(f" {dim}: {size}")


ds.close()

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)

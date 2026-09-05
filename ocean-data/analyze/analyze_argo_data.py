import os
import glob
import xarray as xr

# ============================================================
# CONFIG
# ============================================================

ARGO_DIR = r"D:\3d-Ocean\ocean-data\data\argo"

# ============================================================
# FIND FILES
# ============================================================

files = glob.glob(os.path.join(ARGO_DIR, "**", "*.nc"), recursive=True)

print("=" * 70)
print("ARGO DATASET ANALYSIS")
print("=" * 70)

print(f"\nTotal NetCDF files: {len(files)}")

if not files:
    print("No NetCDF files found!")
    exit()


# ============================================================
# FIND UNIQUE FLOATS
# ============================================================

unique_floats = set()

for file in files:
    try:
        ds = xr.open_dataset(file)

        # Try PLATFORM_NUMBER first
        if "PLATFORM_NUMBER" in ds:
            values = ds["PLATFORM_NUMBER"].values.flatten()

            for value in values:
                if value is not None:
                    value = str(value).strip()

                    if value and value.lower() != "nan":
                        unique_floats.add(value)

        # Fallback: extract from filename
        else:
            filename = os.path.basename(file)
            float_id = filename.split("_")[0]
            unique_floats.add(float_id)

        ds.close()

    except Exception as e:
        print(f"Could not read: {file}")
        print(f"Error: {e}")


# ============================================================
# RESULTS
# ============================================================

print("\n" + "-" * 70)
print("UNIQUE ARGO FLOATS")
print("-" * 70)

print(f"Unique floats: {len(unique_floats)}")

print("\nFirst 20 float IDs:")

for float_id in sorted(unique_floats)[:20]:
    print("  ", float_id)


# ============================================================
# INSPECT ONE PROFILE
# ============================================================

sample_file = files[0]

print("\n" + "=" * 70)
print("SAMPLE ARGO PROFILE")
print("=" * 70)

print(f"\nFile:")
print(sample_file)

ds = xr.open_dataset(sample_file)

print("\n--- Dimensions ---")

for name, size in ds.sizes.items():
    print(f"{name:20} : {size}")


print("\n--- Variables ---")

for var in ds.variables:

    data = ds[var]

    print(f"\n{var}")
    print(f"  Dimensions : {data.dims}")
    print(f"  Shape      : {data.shape}")
    print(f"  Data type  : {data.dtype}")

    if "units" in data.attrs:
        print(f"  Units      : {data.attrs['units']}")

    if "long_name" in data.attrs:
        print(f"  Description: {data.attrs['long_name']}")


# ============================================================
# IMPORTANT ARGO VARIABLES
# ============================================================

print("\n" + "-" * 70)
print("IMPORTANT PROFILE DATA")
print("-" * 70)

important_vars = [
    "PLATFORM_NUMBER",
    "JULD",
    "LATITUDE",
    "LONGITUDE",
    "PRES",
    "TEMP",
    "PSAL",
    "DOXY"
]

for var in important_vars:

    if var in ds:

        data = ds[var]

        print(f"\n{var}")

        print(f"  Shape : {data.shape}")

        if "units" in data.attrs:
            print(f"  Units : {data.attrs['units']}")

        # Show first few values
        try:
            print("  Sample:", data.values.flatten()[:10])
        except:
            pass


# ============================================================
# FILE ATTRIBUTES
# ============================================================

print("\n" + "-" * 70)
print("GLOBAL ATTRIBUTES")
print("-" * 70)

for key, value in ds.attrs.items():
    print(f"{key}: {value}")


ds.close()

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)
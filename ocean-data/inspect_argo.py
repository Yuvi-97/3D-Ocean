import xarray as xr
import pandas as pd
import numpy as np

FILE = r"D:\3d-Ocean\ocean-data\data\argo\R1902669_085.nc"

# Open Argo file
ds = xr.open_dataset(FILE)

print("\n" + "=" * 70)
print("ARGO PROFILE")
print("=" * 70)

# Basic information
print("\nDimensions:")
print(ds.sizes)

print("\nAll Variables:")
print(list(ds.data_vars))

# Float information
print("\nFloat Information:")
if "PLATFORM_NUMBER" in ds:
    print("Float ID:", ds["PLATFORM_NUMBER"].values)

if "LATITUDE" in ds:
    print("Latitude:", ds["LATITUDE"].values)

if "LONGITUDE" in ds:
    print("Longitude:", ds["LONGITUDE"].values)

if "JULD" in ds:
    print("Date:", ds["JULD"].values)

# Main measurements
print("\n" + "=" * 70)
print("TEMPERATURE / SALINITY PROFILE")
print("=" * 70)

pressure = ds["PRES"].values
temperature = ds["TEMP"].values
salinity = ds["PSAL"].values

# Argo files usually have dimensions (N_PROF, N_LEVELS)
# Take the first profile
pressure = pressure[0]
temperature = temperature[0]
salinity = salinity[0]

# Create table
df = pd.DataFrame({
    "Pressure_dbar": pressure,
    "Temperature_C": temperature,
    "Salinity_PSU": salinity
})

# Remove invalid values
df = df.replace([99999, 99999.0, 9999, 9999.0], np.nan)

# Remove rows where pressure is missing
df = df.dropna(subset=["Pressure_dbar"])

print("\nNumber of measurements:", len(df))

print("\nFirst 20 measurements:")
print(df.head(20).to_string(index=False))

print("\nLast 20 measurements:")
print(df.tail(20).to_string(index=False))

print("\nTemperature range:")
print(df["Temperature_C"].min(), "to", df["Temperature_C"].max(), "°C")

print("\nSalinity range:")
print(df["Salinity_PSU"].min(), "to", df["Salinity_PSU"].max(), "PSU")

print("\nMaximum pressure:")
print(df["Pressure_dbar"].max(), "dbar")

# BGC variables
print("\n" + "=" * 70)
print("BGC VARIABLES")
print("=" * 70)

for var in ["DOXY", "CHLA", "NITRATE", "PH_IN_SITU_TOTAL", "BBP"]:
    if var in ds:
        print(var, ": AVAILABLE")

print("\n" + "=" * 70)
print("DONE")
print("=" * 70)

ds.close()
import os
import sys
import copernicusmarine
from datetime import datetime
from calendar import monthrange
from concurrent.futures import ThreadPoolExecutor, as_completed

# Ensure UTF-8 output encoding across all terminals (Windows cmd/PowerShell & Linux)
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


# ============================================================
# CONFIGURATION
# ============================================================

DATASET_ID = "cmems_mod_glo_phy_my_0.083deg_P1D-m"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "data", "model")

# Indian Ocean bounding box
MIN_LON = 20
MAX_LON = 120

MIN_LAT = -40
MAX_LAT = 30

# Time range
START_YEAR = 2026
START_MONTH = 6

END_YEAR = 2026
END_MONTH = 6

# Depth
MIN_DEPTH = 0.49402499198913574
MAX_DEPTH = 1062.44

# Variables
VARIABLES = [
    "thetao",
    "so",
    "uo",
    "vo"
]

# Number of simultaneous downloads
MAX_WORKERS = 3


# ============================================================
# CREATE OUTPUT DIRECTORY
# ============================================================

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============================================================
# GENERATE MONTH LIST
# ============================================================

months = []

year = START_YEAR
month = START_MONTH

while (year < END_YEAR) or (year == END_YEAR and month <= END_MONTH):

    months.append((year, month))

    month += 1

    if month > 12:
        month = 1
        year += 1


# ============================================================
# DOWNLOAD ONE MONTH
# ============================================================

def download_month(year, month, index):

    month_name = datetime(year, month, 1).strftime("%B")

    last_day = monthrange(year, month)[1]

    start_date = f"{year}-{month:02d}-01T00:00:00"

    # June ends on June 23
    if year == END_YEAR and month == END_MONTH:
        end_date = "2026-06-23T23:59:59"
    else:
        end_date = f"{year}-{month:02d}-{last_day:02d}T23:59:59"

    output_filename = (
        f"cmems_indian_ocean_{year}_{month:02d}.nc"
    )

    output_path = os.path.join(
        OUTPUT_DIR,
        output_filename
    )

    # --------------------------------------------------------
    # Skip if already downloaded (verify file is not corrupted/empty)
    # --------------------------------------------------------

    if os.path.exists(output_path) and os.path.getsize(output_path) > 10 * 1024 * 1024:

        size_mb = os.path.getsize(output_path) / (1024 * 1024)

        return (
            index,
            month_name,
            "EXISTING",
            f"{size_mb:.2f} MB"
        )

    print()
    print(
        f"[START {index}/{len(months)}] "
        f"{month_name} {year}"
    )

    print(
        f"    {start_date} -> {end_date}"
    )

    try:

        result = copernicusmarine.subset(

            dataset_id=DATASET_ID,

            variables=VARIABLES,

            # ------------------------------------------------
            # Geographic region
            # ------------------------------------------------

            minimum_longitude=MIN_LON,
            maximum_longitude=MAX_LON,

            minimum_latitude=MIN_LAT,
            maximum_latitude=MAX_LAT,

            # ------------------------------------------------
            # Time
            # ------------------------------------------------

            start_datetime=start_date,
            end_datetime=end_date,

            # ------------------------------------------------
            # Depth
            # ------------------------------------------------

            minimum_depth=MIN_DEPTH,
            maximum_depth=MAX_DEPTH,

            # ------------------------------------------------
            # Output
            # ------------------------------------------------

            output_directory=OUTPUT_DIR,

            output_filename=output_filename,

            # ------------------------------------------------
            # Compression
            # ------------------------------------------------

            netcdf_compression_level=4
        )

        # ----------------------------------------------------
        # Get file size
        # ----------------------------------------------------

        if os.path.exists(output_path):

            size_mb = (
                os.path.getsize(output_path)
                / (1024 * 1024)
            )

            size_text = f"{size_mb:.2f} MB"

        else:

            size_text = "Unknown size"

        return (
            index,
            month_name,
            "SUCCESS",
            size_text
        )

    except Exception as e:

        return (
            index,
            month_name,
            "FAILED",
            str(e)
        )


# ============================================================
# START DOWNLOAD
# ============================================================

print()
print("=" * 75)
print("       CMEMS INDIAN OCEAN MODEL DATA DOWNLOAD")
print("=" * 75)

print()
print("Dataset     :", DATASET_ID)
print("Region      :", f"{MIN_LON}°E to {MAX_LON}°E")
print("Latitude    :", f"{MIN_LAT}° to {MAX_LAT}°")
print("Depth       :", f"{MIN_DEPTH} m to {MAX_DEPTH} m")
print("Variables   :", ", ".join(VARIABLES))
print("Months      :", len(months))
print("Parallel    :", MAX_WORKERS)
print()

print("=" * 75)
print("Starting parallel downloads...")
print("=" * 75)


# ============================================================
# PARALLEL DOWNLOADS
# ============================================================

results = []

with ThreadPoolExecutor(
    max_workers=MAX_WORKERS
) as executor:

    futures = []

    for index, (year, month) in enumerate(months, start=1):

        future = executor.submit(
            download_month,
            year,
            month,
            index
        )

        futures.append(future)

    for future in as_completed(futures):

        result = future.result()

        results.append(result)

        index, month_name, status, info = result

        if status == "SUCCESS":

            print(
                f"\n[OK] [{index}/{len(months)}] "
                f"{month_name} COMPLETE - {info}"
            )

        elif status == "EXISTING":

            print(
                f"\n[SKIP] [{index}/{len(months)}] "
                f"{month_name} ALREADY EXISTS - {info}"
            )

        else:

            print(
                f"\n[FAIL] [{index}/{len(months)}] "
                f"{month_name} FAILED"
            )

            print(
                f"    Error: {info}"
            )


# ============================================================
# FINAL SUMMARY
# ============================================================

print()
print("=" * 75)
print("                 DOWNLOAD SUMMARY")
print("=" * 75)

success = 0
existing = 0
failed = 0

for result in sorted(results):

    index, month_name, status, info = result

    if status == "SUCCESS":
        success += 1

    elif status == "EXISTING":
        existing += 1

    else:
        failed += 1

    print(
        f"{month_name:<12} "
        f"{status:<10} "
        f"{info}"
    )


print()
print("-" * 75)

print("Successful :", success)
print("Existing   :", existing)
print("Failed     :", failed)

print()
print("Output directory:")
print(OUTPUT_DIR)

print("=" * 75)
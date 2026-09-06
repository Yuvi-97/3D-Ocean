import os
import csv
import ftplib
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

FTP_HOST = "ftp.ifremer.fr"
REMOTE_ROOT = "/ifremer/glider/v2"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_FILE = os.path.join(SCRIPT_DIR, "glider_prof_index.txt")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "data", "glider")

# ============================================================
# INDIAN OCEAN REGION
# ============================================================

MIN_LAT = -40
MAX_LAT = 30
MIN_LON = 20
MAX_LON = 120

# ============================================================
# PARALLEL DOWNLOAD SETTINGS
# ============================================================

MAX_WORKERS = 8

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============================================================
# ENSURE & READ INDEX
# ============================================================

def ensure_index_file():
    if not os.path.exists(INDEX_FILE):
        print("=" * 70)
        print(f"Downloading glider_prof_index.txt from {FTP_HOST}...")
        print("=" * 70)
        ftp = ftplib.FTP(FTP_HOST, timeout=120)
        ftp.login()
        ftp.cwd(REMOTE_ROOT)
        ftp.set_pasv(True)
        with open(INDEX_FILE, "wb") as f:
            ftp.retrbinary("RETR glider_prof_index.txt", f.write, blocksize=1024 * 1024)
        ftp.quit()
        print("Glider index downloaded successfully.")

def read_index():
    ensure_index_file()

    profiles = []

    print("=" * 70)
    print("Reading Glider profile index...")
    print("=" * 70)

    with open(INDEX_FILE, "r", encoding="utf-8") as f:

        for line in f:

            if line.startswith("#") or not line.strip():
                continue

            parts = line.strip().split(",")

            if parts[0] == "file":
                continue

            if len(parts) < 9:
                continue

            try:

                file_path = parts[0]
                wmo = parts[1]
                date_string = parts[2]

                latitude = float(parts[3])
                longitude = float(parts[4])

                pressure_max = float(parts[5])
                n_levels = int(parts[6])

                parameter = parts[7]
                ocean = parts[8]

                date = datetime.strptime(
                    date_string,
                    "%Y%m%d%H%M%S"
                )

                # ------------------------------------------------
                # 2026 ONLY
                # ------------------------------------------------

                if date.year != 2026:
                    continue

                # ------------------------------------------------
                # INDIAN OCEAN BOUNDING BOX
                # ------------------------------------------------

                if not (
                    MIN_LAT <= latitude <= MAX_LAT
                    and
                    MIN_LON <= longitude <= MAX_LON
                ):
                    continue

                profiles.append({

                    "file": file_path,
                    "wmo": wmo,
                    "date": date_string,
                    "latitude": latitude,
                    "longitude": longitude,
                    "pressure_max": pressure_max,
                    "n_levels": n_levels,
                    "parameter": parameter,
                    "ocean": ocean

                })

            except Exception:
                continue

    return profiles


# ============================================================
# DOWNLOAD ONE FILE
# ============================================================

def download_file(profile):

    ftp = None

    try:

        # --------------------------------------------------------
        # Create a NEW FTP connection for this worker
        # --------------------------------------------------------

        ftp = ftplib.FTP(
            FTP_HOST,
            timeout=120
        )

        ftp.login()

        # --------------------------------------------------------
        # Remote path
        # --------------------------------------------------------

        remote_path = (
            REMOTE_ROOT +
            profile["file"]
        )

        # --------------------------------------------------------
        # Filename
        # --------------------------------------------------------

        filename = os.path.basename(
            profile["file"]
        )

        # --------------------------------------------------------
        # WMO directory
        # --------------------------------------------------------

        wmo_dir = os.path.join(
            OUTPUT_DIR,
            profile["wmo"]
        )

        os.makedirs(
            wmo_dir,
            exist_ok=True
        )

        # --------------------------------------------------------
        # Local path
        # --------------------------------------------------------

        local_path = os.path.join(
            wmo_dir,
            filename
        )

        # --------------------------------------------------------
        # Skip existing file
        # --------------------------------------------------------

        if os.path.exists(local_path):

            return {
                "status": "exists",
                "file": filename,
                "wmo": profile["wmo"]
            }

        # --------------------------------------------------------
        # Download
        # --------------------------------------------------------

        with open(
            local_path,
            "wb"
        ) as f:

            ftp.retrbinary(
                f"RETR {remote_path}",
                f.write,
                blocksize=1024 * 1024
            )

        return {
            "status": "downloaded",
            "file": filename,
            "wmo": profile["wmo"]
        }

    except Exception as e:

        # Remove incomplete file
        try:

            if 'local_path' in locals():
                if os.path.exists(local_path):
                    os.remove(local_path)

        except Exception:
            pass

        return {
            "status": "failed",
            "file": profile.get("file", "unknown"),
            "wmo": profile.get("wmo", "unknown"),
            "error": str(e)
        }

    finally:

        # --------------------------------------------------------
        # Close FTP connection
        # --------------------------------------------------------

        if ftp is not None:

            try:
                ftp.quit()
            except Exception:
                pass


# ============================================================
# MAIN
# ============================================================

def main():

    print()
    print("=" * 70)
    print("GLIDER 2026 INDIAN OCEAN PARALLEL DOWNLOADER")
    print("=" * 70)

    print()
    print("Region:")
    print(f"Latitude : {MIN_LAT} to {MAX_LAT}")
    print(f"Longitude: {MIN_LON} to {MAX_LON}")

    print()
    print("Parallel workers:", MAX_WORKERS)

    # ========================================================
    # READ INDEX
    # ========================================================

    profiles = read_index()

    print()
    print("=" * 70)
    print("FILTER RESULTS")
    print("=" * 70)

    print(
        "Matching profiles:",
        len(profiles)
    )

    if not profiles:

        print("No matching profiles found.")
        return

    # ========================================================
    # SAVE FILTERED INDEX
    # ========================================================

    filtered_index = os.path.join(
        OUTPUT_DIR,
        "glider_2026_indian_ocean_index.csv"
    )

    with open(
        filtered_index,
        "w",
        newline="",
        encoding="utf-8"
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=profiles[0].keys()
        )

        writer.writeheader()
        writer.writerows(profiles)

    print(
        "Filtered index saved:",
        filtered_index
    )

    # ========================================================
    # PARALLEL DOWNLOAD
    # ========================================================

    print()
    print("=" * 70)
    print("STARTING PARALLEL DOWNLOAD")
    print("=" * 70)

    downloaded = 0
    already_exists = 0
    failed = 0

    total = len(profiles)

    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS
    ) as executor:

        futures = [
            executor.submit(
                download_file,
                profile
            )
            for profile in profiles
        ]

        for completed, future in enumerate(
            as_completed(futures),
            start=1
        ):

            result = future.result()

            status = result["status"]

            if status == "downloaded":

                downloaded += 1

                print(
                    f"[{completed}/{total}] "
                    f"DOWNLOADED | "
                    f"WMO {result['wmo']} | "
                    f"{result['file']}"
                )

            elif status == "exists":

                already_exists += 1

                print(
                    f"[{completed}/{total}] "
                    f"EXISTS | "
                    f"WMO {result['wmo']} | "
                    f"{result['file']}"
                )

            else:

                failed += 1

                print(
                    f"[{completed}/{total}] "
                    f"FAILED | "
                    f"{result['file']} | "
                    f"{result['error']}"
                )

    # ========================================================
    # FINAL SUMMARY
    # ========================================================

    print()
    print("=" * 70)
    print("GLIDER DOWNLOAD COMPLETE")
    print("=" * 70)

    print(
        "Matching profiles:",
        total
    )

    print(
        "Downloaded:",
        downloaded
    )

    print(
        "Already existed:",
        already_exists
    )

    print(
        "Failed:",
        failed
    )

    print(
        "Output:",
        OUTPUT_DIR
    )

    print("=" * 70)


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()
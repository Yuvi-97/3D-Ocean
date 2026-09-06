import os
import gzip
import shutil
import requests
import pandas as pd

from concurrent.futures import ThreadPoolExecutor, as_completed


# ============================================================
# CONFIGURATION
# ============================================================

INDEX_URL = "https://data-argo.ifremer.fr/ar_index_global_prof.txt.gz"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "data", "argo")

# ------------------------------------------------------------
# Indian Ocean approximate region
# ------------------------------------------------------------

MIN_LAT = -40
MAX_LAT = 30

MIN_LON = 20
MAX_LON = 120

YEAR = 2026

# Only download floats handled by INCOIS
DAC = "incois"

# ------------------------------------------------------------
# Parallel download settings
# ------------------------------------------------------------

MAX_WORKERS = 8

# Maximum number of profiles for testing
# Set to None for all profiles
MAX_PROFILES = None


# ============================================================
# CREATE OUTPUT DIRECTORY
# ============================================================

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============================================================
# DOWNLOAD INDEX
# ============================================================

index_gz = os.path.join(
    OUTPUT_DIR,
    "ar_index_global_prof.txt.gz"
)

index_txt = os.path.join(
    OUTPUT_DIR,
    "ar_index_global_prof.txt"
)


def download_index():

    if os.path.exists(index_txt):

        print("Index already exists.")

        return

    print("Downloading Argo global profile index...")

    response = requests.get(
        INDEX_URL,
        timeout=120
    )

    response.raise_for_status()

    with open(index_gz, "wb") as f:
        f.write(response.content)

    print("Index downloaded.")

    print("Extracting index...")

    with gzip.open(index_gz, "rb") as f_in:

        with open(index_txt, "wb") as f_out:

            shutil.copyfileobj(
                f_in,
                f_out
            )

    print("Index extracted.")


# ============================================================
# READ ARGO INDEX
# ============================================================

def read_index():

    print("Reading Argo index...")

    df = pd.read_csv(
        index_txt,
        comment="#"
    )

    print(
        "Total profiles in global index:",
        len(df)
    )

    print(
        "Columns:",
        list(df.columns)
    )

    return df


# ============================================================
# FILTER
# ============================================================

def filter_profiles(df):

    print("\nFiltering profiles...")

    # --------------------------------------------------------
    # Convert date
    # --------------------------------------------------------

    df["date"] = pd.to_datetime(
        df["date"],
        format="%Y%m%d%H%M%S",
        errors="coerce"
    )

    # --------------------------------------------------------
    # 2026
    # --------------------------------------------------------

    df = df[
        df["date"].dt.year == YEAR
    ]

    print(
        f"After {YEAR} filter:",
        len(df)
    )

    # --------------------------------------------------------
    # Indian Ocean geographic region
    # --------------------------------------------------------

    df = df[
        (df["latitude"] >= MIN_LAT) &
        (df["latitude"] <= MAX_LAT) &
        (df["longitude"] >= MIN_LON) &
        (df["longitude"] <= MAX_LON)
    ]

    print(
        "After Indian Ocean geographic filter:",
        len(df)
    )

    # --------------------------------------------------------
    # INCOIS DAC
    # --------------------------------------------------------

    df = df[
        df["file"].str.startswith(
            f"{DAC}/"
        )
    ]

    print(
        "After INCOIS DAC filter:",
        len(df)
    )

    return df


# ============================================================
# DOWNLOAD ONE PROFILE
# ============================================================

def download_profile(relative_path):

    base_url = "https://data-argo.ifremer.fr/dac/"

    url = base_url + relative_path

    filename = os.path.basename(
        relative_path
    )

    local_path = os.path.join(
        OUTPUT_DIR,
        filename
    )

    # --------------------------------------------------------
    # Skip existing file
    # --------------------------------------------------------

    if os.path.exists(local_path):

        return {
            "status": "exists",
            "filename": filename
        }

    try:

        response = requests.get(
            url,
            stream=True,
            timeout=120
        )

        response.raise_for_status()

        with open(local_path, "wb") as f:

            for chunk in response.iter_content(
                chunk_size=1024 * 1024
            ):

                if chunk:
                    f.write(chunk)

        return {
            "status": "downloaded",
            "filename": filename
        }

    except Exception as e:

        # Remove incomplete file if download failed
        if os.path.exists(local_path):
            try:
                os.remove(local_path)
            except:
                pass

        return {
            "status": "failed",
            "filename": filename,
            "error": str(e)
        }


# ============================================================
# PARALLEL DOWNLOAD
# ============================================================

def download_profiles_parallel(download_df):

    total = len(download_df)

    successful = 0
    already_exists = 0
    failed = 0

    print("\n======================================")
    print("STARTING PARALLEL ARGO DOWNLOAD")
    print("======================================")

    print(
        f"Total profiles: {total}"
    )

    print(
        f"Parallel workers: {MAX_WORKERS}"
    )

    print("======================================\n")

    # --------------------------------------------------------
    # Thread pool
    # --------------------------------------------------------

    with ThreadPoolExecutor(
        max_workers=MAX_WORKERS
    ) as executor:

        futures = {
            executor.submit(
                download_profile,
                row["file"]
            ): row["file"]

            for _, row in download_df.iterrows()
        }

        # ----------------------------------------------------
        # Process completed downloads
        # ----------------------------------------------------

        completed = 0

        for future in as_completed(futures):

            relative_path = futures[future]

            completed += 1

            try:

                result = future.result()

                status = result["status"]

                filename = result["filename"]

                if status == "downloaded":

                    successful += 1

                    print(
                        f"[{completed}/{total}] "
                        f"Downloaded: {filename}"
                    )

                elif status == "exists":

                    already_exists += 1

                    print(
                        f"[{completed}/{total}] "
                        f"Already exists: {filename}"
                    )

                elif status == "failed":

                    failed += 1

                    print(
                        f"[{completed}/{total}] "
                        f"FAILED: {filename}"
                    )

                    print(
                        "   Error:",
                        result.get("error")
                    )

            except Exception as e:

                failed += 1

                print(
                    f"[{completed}/{total}] "
                    f"FAILED: {relative_path}"
                )

                print(
                    "   Error:",
                    e
                )

    return (
        successful,
        already_exists,
        failed
    )


# ============================================================
# MAIN
# ============================================================

def main():

    # --------------------------------------------------------
    # 1. Download index
    # --------------------------------------------------------

    download_index()

    # --------------------------------------------------------
    # 2. Read index
    # --------------------------------------------------------

    df = read_index()

    # --------------------------------------------------------
    # 3. Filter
    # --------------------------------------------------------

    filtered = filter_profiles(df)

    if len(filtered) == 0:

        print(
            "\nNo matching profiles found."
        )

        return

    # --------------------------------------------------------
    # Save matching index
    # --------------------------------------------------------

    filtered_csv = os.path.join(
        OUTPUT_DIR,
        "argo_incois_indian_ocean_2026_index.csv"
    )

    filtered.to_csv(
        filtered_csv,
        index=False
    )

    print(
        "\nMatching profile index saved:"
    )

    print(
        filtered_csv
    )

    # --------------------------------------------------------
    # Limit for testing
    # --------------------------------------------------------

    download_df = filtered

    if MAX_PROFILES is not None:

        download_df = filtered.head(
            MAX_PROFILES
        )

    print(
        f"\nProfiles to download: "
        f"{len(download_df)}"
    )

    # --------------------------------------------------------
    # Parallel download
    # --------------------------------------------------------

    successful, already_exists, failed = (
        download_profiles_parallel(
            download_df
        )
    )

    # --------------------------------------------------------
    # Summary
    # --------------------------------------------------------

    print("\n======================================")
    print("ARGO DOWNLOAD COMPLETE")
    print("======================================")

    print(
        "Matching profiles:",
        len(filtered)
    )

    print(
        "Downloaded:",
        successful
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

    print("======================================")


# ============================================================
# RUN
# ============================================================

if __name__ == "__main__":
    main()
# INCOIS 3D Ocean Visualization & Analytics Platform

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![CesiumJS](https://img.shields.io/badge/CesiumJS-1.114-68A063?logo=cesium&logoColor=white)](https://cesium.com/)
[![Three.js](https://img.shields.io/badge/Three.js-r180-black?logo=three.js&logoColor=white)](https://threejs.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![SIH 2026](https://img.shields.io/badge/SIH%202026-Problem%20%2326067-FF6F00)](https://www.sih.gov.in/)

An interactive 3D digital-twin platform of the **Indian Ocean basin** integrating high-resolution numerical ocean model outputs (**CMEMS 1/12°**) with autonomous in-situ observation platforms (**INCOIS Argo profiling floats** and **underwater Gliders**).

Built for **Smart India Hackathon (SIH 2026) — Problem Statement #26067**.

---

## Table of Contents

1. [Key Features](#key-features)
2. [System Architecture](#system-architecture)
3. [Prerequisites](#prerequisites)
4. [Step 0: Download Ocean Datasets (Needed for Full Backend — ~40–60 mins)](#step-0-download-ocean-datasets-needed-for-full-backend---4060-mins)
5. [Quickstart: How to Start the Application](#quickstart-how-to-start-the-application)
   - [1. Backend Setup (FastAPI)](#1-backend-setup-fastapi)
   - [2. Frontend Setup (React & CesiumJS)](#2-frontend-setup-react--cesiumjs)
   - [3. Running Both with a Single Script](#3-running-both-with-a-single-script)
6. [Verification & Automated Tests](#verification--automated-tests)
7. [Datasets & Data Pipeline](#datasets--data-pipeline)
8. [Environment Configuration](#environment-configuration)
9. [Frontend Route Guide](#frontend-route-guide)
10. [API Reference Overview](#api-reference-overview)
11. [Troubleshooting & FAQs](#troubleshooting--faqs)

---

## Key Features

- **Interactive 3D Geospatial Globe**: CesiumJS and Three.js-powered digital twin rendering bathymetry, continent/ocean annotations, underwater camera perspectives, and depth slicing down to 2,000 meters.
- **Numerical Model Field Engine**: Sub-second slicing across 36 depth levels and 23 temporal steps (CMEMS Global Physics Model, 841x1201 Indian Ocean grid: temperature `thetao`, salinity `so`, eastward current `uo`, northward current `vo`, and speed).
- **Autonomous In-Situ Fleet Tracking**: Real-time rendering and historical trajectory inspection for **123 Argo profiling floats** and high-frequency sawtooth dives for **underwater gliders** (including dissolved oxygen `DOXY`).
- **Statistical Model-Observation Validation**: Spatiotemporally colocated dual profiles computing Root Mean Square Error (RMSE), Mean Bias, and Pearson correlation coefficients ($r$).
- **Marine Hazard Analytics**: Automated alerts for Marine Heatwaves (MHW), Somali Jet current shear zones, and coastal hypoxia events, plus Hovmöller time-depth diagrams.

---

## System Architecture

```
3d-Ocean/
├── backend/                  # FastAPI high-performance REST API
│   ├── app/
│   │   ├── config.py         # App settings & dynamic dataset paths
│   │   ├── main.py           # FastAPI entry point & CORS configuration
│   │   ├── routers/          # API v1 routes (metadata, model, argo, gliders, etc.)
│   │   ├── schemas/          # Pydantic validation & response schemas
│   │   ├── services/         # Memory-mapped Xarray & NetCDF query engines
│   │   └── utils/            # Geodesic math (Haversine) & JSON serializers
│   ├── requirements.txt      # Python dependencies
│   ├── run_backend.ps1       # Convenience PowerShell startup script
│   ├── test_api_endpoints.py # 20-endpoint automated verification suite
│   └── test_performance.py   # Latency & throughput stress tests
│
├── frontend/                 # React 19 interactive visualization UI
│   ├── public/               # CesiumJS CDN loader, 3D glTF models, textures
│   ├── src/
│   │   ├── components/       # Explorer (Globe), Observations, Comparison, Alerts, etc.
│   │   ├── constants/        # Ocean coordinates, bounds, labels
│   │   ├── App.js            # React Router 7 route definitions
│   │   └── index.css         # TailwindCSS styles
│   └── package.json          # Node dependencies and scripts
│
├── ocean-data/               # Data ingestion & processing pipelines
│   ├── data/                 # Local directory for raw NetCDF & index files (git-ignored)
│   ├── download_argo.py      # Automated INCOIS / IFREMER Argo float downloader
│   ├── download_glider.py    # Autonomous glider NetCDF fetcher
│   ├── download_model.py     # Copernicus Marine CMEMS NetCDF fetcher
│   └── analyze/              # Data analysis & inspection scripts
│
└── .gitignore                # Comprehensive rules for datasets, node, and python
```

---

## Prerequisites

Before getting started, make sure you have the following installed:

- **Python**: Version `3.10` or higher (`python --version`)
- **Node.js**: Version `18.x` or higher (`node --version`)
- **npm**: Version `9.x` or higher (`npm --version`)
- **Git**: (`git --version`)

---

## Step 0: Download Ocean Datasets (Needed for Full Backend — ~40–60 mins)

> [!NOTE]
> - **Working only on the Frontend?** You do **not** need to download these datasets! You can start the frontend right away and refer to the [Backend README](file:///d:/3d-Ocean/backend/README.md) for endpoint specifications and mock schemas.
> - **Running the Backend with Real Data?** If you want to run the FastAPI backend with actual Indian Ocean measurements (CMEMS model, Argo floats, and Gliders), run the download scripts inside the `ocean-data/` folder first.
>
> Because these scripts download thousands of high-resolution NetCDF files (~2,400+ Argo profiles, ~2,900+ Glider soundings) and a 2.18 GB numerical model grid directly from scientific servers (IFREMER & Copernicus Marine), the initial download takes **roughly 40 to 60 minutes** depending on your internet bandwidth.

### How to Run the Data Downloaders

If you plan to run the backend with physical ocean data, open a terminal in the root `3d-Ocean` directory and execute:

```bash
# 1. Navigate to the ocean-data directory
cd ocean-data

# 2. Run the three download scripts:

# A. Download INCOIS / IFREMER Argo float indices & CTD profiles (~2,400+ NetCDF files)
python download_argo.py

# B. Download underwater glider mission tracks & dive soundings (~2,900+ NetCDF files)
python download_glider.py

# C. Download Copernicus Marine (CMEMS) numerical model grid (2.18 GB NetCDF)
python download_model.py
```

> [!TIP]
> **Helpful Notes for Downloading:**
> - **Automatic Folders:** The scripts automatically create the required `ocean-data/data/` folders (`argo/`, `glider/`, and `model/`).
> - **Live Progress:** Real-time transfer progress and profile counts are displayed in your terminal.
> - **Git Safe:** Downloaded files are saved under `ocean-data/data/` and are already ignored by Git to keep your repository clean.
> - **Background Process:** You can leave the download running in the background while you continue frontend development.

---

## Quickstart: How to Start the Application

### 1. Backend Setup (FastAPI)

Open a terminal in the root directory `3d-Ocean`:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create a Python virtual environment
python -m venv venv

# 3. Activate the virtual environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (Command Prompt):
.\venv\Scripts\activate.bat
# On Linux / macOS:
source venv/bin/activate

# 4. Install backend dependencies
pip install --upgrade pip
pip install -r requirements.txt

# 5. Start the FastAPI server
 
```

> **Windows PowerShell Shortcut**: Alternatively, you can run `./run_backend.ps1` from the `backend/` directory.

The backend will now be live:
- **API Base URL:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)

---

### 2. Frontend Setup (React & CesiumJS)

Open a **second terminal** window in the root directory `3d-Ocean`:

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install frontend dependencies
npm install

# 3. Start the React development server
npm start
```

The React app will automatically compile and open in your default browser at:
- **Application URL:** [http://localhost:3000](http://localhost:3000)

---

### 3. Running Both with a Single Script

If you are on Windows and want to launch both services in separate windows simultaneously, run the following command from the root directory in PowerShell:

```powershell
# Start backend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\Activate.ps1; uvicorn app.main:app --reload --port 8000"

# Start frontend in a new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm start"
```

---

## Verification & Automated Tests

To ensure all backend routers and physical NetCDF data readers are operating with zero runtime errors, run the automated verification test suite:

```bash
cd backend
python test_api_endpoints.py
```

To run the performance and benchmark suite:

```bash
python test_performance.py
```

---

## Datasets & Data Pipeline

The application connects to three primary ocean datasets:

1. **CMEMS Numerical Ocean Model (`cmems_indian_ocean_2026_06.nc`)**:
   - 2.18 GB NetCDF covering the Indian Ocean basin ($-40^\circ\text{S}$ to $+30^\circ\text{N}$, $20^\circ\text{E}$ to $120^\circ\text{E}$).
   - Downloaded via `ocean-data/download_model.py`.
2. **Argo Profiling Floats (`argo_incois_indian_ocean_2026_index.csv`)**:
   - Over 2,400 physical `.nc` profiles from 123 active floats.
   - Downloaded via `ocean-data/download_argo.py`.
3. **Autonomous Underwater Gliders (`glider_2026_indian_ocean_index.csv`)**:
   - Continuous CTD and dissolved oxygen measurements from gliders `R6801558` and `R8901048`.
   - Downloaded via `ocean-data/download_glider.py`.

> [!NOTE]
> All raw data files and download indices are stored under `ocean-data/data/` and are automatically ignored by Git to prevent repository bloat.

---

## Environment Configuration

By default, the backend dynamically resolves paths relative to your project root. If your datasets reside in custom directories, configure these optional environment variables:

| Environment Variable | Description | Default Value |
| :--- | :--- | :--- |
| `CMEMS_MODEL_PATH` | Path to CMEMS NetCDF file | `../ocean-data/data/model/cmems_indian_ocean_2026_06.nc` |
| `ARGO_DATA_DIR` | Directory containing Argo `.nc` files | `../ocean-data/data/argo` |
| `ARGO_INDEX_CSV` | Path to Argo index CSV | `../ocean-data/data/argo/argo_incois_indian_ocean_2026_index.csv` |
| `GLIDER_DATA_DIR` | Directory containing Glider `.nc` files | `../ocean-data/data/glider` |
| `GLIDER_INDEX_CSV` | Path to Glider index CSV | `../ocean-data/data/glider/glider_2026_indian_ocean_index.csv` |

Example for setting in PowerShell:
```powershell
$env:CMEMS_MODEL_PATH="D:\3d-Ocean\ocean-data\data\model\cmems_indian_ocean_2026_06.nc"
```

---

## Frontend Route Guide

Once the frontend is running at `http://localhost:3000`, explore the following views:

| Path | View | Highlights |
| :--- | :--- | :--- |
| `/` | **Dashboard** | Mission control overview, key operational indicators, and fleet status. |
| `/explorer` | **3D Explorer** | Interactive CesiumJS 3D globe with layer toggles, depth sliders, and soundings. |
| `/observations` | **Fleet Observations** | In-situ Argo floats and Glider tracks with spatial bounding-box search. |
| `/comparison` | **Model vs Observations** | Spatiotemporal colocation with dual profile plots and validation scorecards. |
| `/alerts` | **Marine Alerts** | Heatwaves (MHW), western boundary current shear, and hypoxia monitors. |
| `/analytics` | **Advanced Analytics** | Depth vs Time Hovmöller cross-sections and trend projections. |
| `/data` | **Data Catalog** | Searchable directory of integrated datasets, NetCDF metadata, and downloads. |
| `/about` | **About** | System architecture, INCOIS attribution, and SIH 2026 problem info. |

---

## API Reference Overview

The FastAPI backend exposes modular REST endpoints grouped under `/api/v1`:

| Router | Path Prefix | Key Functionalities |
| :--- | :--- | :--- |
| **Metadata** | `/api/v1/metadata` | Coordinate bounds, available depth levels (36), time steps (23), and variables. |
| **Model** | `/api/v1/model` | 2D horizontal slices, single point soundings, vector currents ($u,v$), and transects. |
| **Argo** | `/api/v1/argo` | Active float inventory, trajectory history, and single-cycle CTD profiles. |
| **Gliders** | `/api/v1/gliders` | Glider status, sawtooth dive tracks, and high-resolution CTD+DOXY profiles. |
| **Observations**| `/api/v1/observations` | Unified multi-platform spatial bounding box search and paginated catalog. |
| **Comparison** | `/api/v1/comparison` | Space-time colocation pairs, dual-profile overlay curves, RMSE, and bias stats. |
| **Analytics** | `/api/v1/analytics` | Marine Heatwave (MHW) detection, hypoxia warnings, and Hovmöller matrices. |
| **System** | `/health`, `/` | Server status checks, dataset readiness probe, and OpenAPI discovery. |
| **Legacy Data** | `/data` | Backward-compatibility endpoints (`/data/metadata`, `/data/tile`, `/data/health`). |

Full schema details and live "Try it out" requests are available at [http://localhost:8000/docs](http://localhost:8000/docs) (or [http://localhost:8000/redoc](http://localhost:8000/redoc)).

---

## Troubleshooting & FAQs

### 1. Port 8000 or 3000 already in use
- Change the backend port:
  ```bash
  uvicorn app.main:app --reload --port 8001
  ```
- If port 3000 is occupied, React will prompt `Would you like to run the app on another port instead? (Y/n)`. Type `Y` to start on `3001`.

### 2. "CMEMS NetCDF file not found" warning on backend startup
- The backend will log a non-fatal warning if dataset files have not yet been downloaded. The API continues to run in demo/fallback mode. Run the download scripts in `ocean-data/` to populate datasets.

### 3. CesiumJS Globe Black Screen or Token Notice
- Ensure you have active internet connectivity to fetch CesiumJS 1.114 assets from the CDN.
- If needed, update `CESIUM_ION_TOKEN` in `frontend/src/components/Explorer/GlobeViewer.jsx` with your personal Cesium Ion token from [cesium.com](https://cesium.com/ion/).

---

## License & Attribution

Developed for the **Smart India Hackathon (SIH 2026)** — Problem Statement #26067.  
Data provided in collaboration with **INCOIS** (Indian National Centre for Ocean Information Services) and the **Copernicus Marine Environment Monitoring Service (CMEMS)**.

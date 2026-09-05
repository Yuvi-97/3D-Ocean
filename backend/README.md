# INCOIS 3D Ocean Visualization Platform — Backend API
**SIH Problem Statement 26067**

A high-performance, modular FastAPI backend integrating numerical ocean model outputs (**CMEMS 1/12°**) with autonomous in-situ observation platforms (**Argo profiling floats** and **underwater Gliders**) across the Indian Ocean basin.

---

## 1. System Architecture

```
backend/
├── app/
│   ├── __init__.py
│   ├── config.py                 # Centralized configuration & dataset paths
│   ├── main.py                   # FastAPI application, CORS, lifespan, router inclusion
│   ├── schemas/                  # Pydantic validation & response models
│   │   ├── __init__.py
│   │   ├── metadata.py           # Overview and depth/time level schemas
│   │   ├── model.py              # 2D slices, point soundings, vector currents, transects
│   │   ├── argo.py               # Fleet inventory, drift tracks, CTD profile schemas
│   │   ├── glider.py             # Glider status, sawtooth tracks, CTD+DOXY profiles
│   │   ├── observations.py       # Spatial bounding-box and catalog schemas
│   │   ├── comparison.py         # Space-time colocation, dual profile & validation metrics
│   │   └── analytics.py          # Marine hazard alerts & Hovmöller matrix schemas
│   ├── services/                 # High-performance data processing & query engines
│   │   ├── __init__.py
│   │   ├── model_service.py      # Xarray memory-mapped CMEMS NetCDF slice & transect engine
│   │   ├── argo_service.py       # In-memory Argo CSV indexer & NetCDF profile reader
│   │   ├── glider_service.py     # In-memory Glider CSV indexer & NetCDF profile reader
│   │   ├── observation_service.py# Unified spatial query and catalog filter
│   │   ├── comparison_service.py # Spatiotemporal colocation & statistical validation
│   │   ├── analytics_service.py  # Operational alerts (MHW, jets, hypoxia) & Hovmöller
│   │   └── ocean_data.py         # Legacy data service for backward compatibility
│   ├── routers/                  # API v1 route definitions
│   │   ├── __init__.py
│   │   ├── metadata.py           # /api/v1/metadata/*
│   │   ├── model.py              # /api/v1/model/*
│   │   ├── argo.py               # /api/v1/argo/*
│   │   ├── gliders.py            # /api/v1/gliders/*
│   │   ├── observations.py       # /api/v1/observations/*
│   │   ├── comparison.py         # /api/v1/comparison/*
│   │   ├── analytics.py          # /api/v1/analytics/*
│   │   └── data.py               # /data/* (legacy compatibility)
│   └── utils/
│       ├── __init__.py
│       ├── serializers.py        # Safe JSON sanitization (NaN/Inf -> null, numpy types)
│       └── geo.py                # Haversine distance, bounding box, transect interpolation
├── test_api_endpoints.py         # End-to-end verification test suite for all endpoints
├── requirements.txt              # Dependencies (fastapi, uvicorn, xarray, netCDF4, pandas)
└── README.md                     # Documentation
```

---

## 2. Integrated Datasets

- **CMEMS Numerical Model (`cmems_indian_ocean_2026_06.nc` — 2.18 GB):**
  - **Temporal:** 23 daily time steps (1–23 June 2026)
  - **Vertical:** 36 depth levels ($0.49\text{ m}$ to $1,062.44\text{ m}$)
  - **Spatial:** 841 latitude $\times$ 1,201 longitude grid ($-40^\circ\text{S}$ to $+30^\circ\text{N}$, $20^\circ\text{E}$ to $120^\circ\text{E}$)
  - **Variables:** `thetao` (temperature), `so` (salinity), `uo` (eastward current), `vo` (northward current), `speed` ($\sqrt{u^2+v^2}$)
- **Argo Profiling Floats (`argo_incois_indian_ocean_2026_index.csv` & 2,493 `.nc` files):**
  - 123 unique floats, physical measurements down to $2,000\text{ m}$, quality control flags (`1`=Good, `2`=Probably Good, etc.).
- **Autonomous Gliders (`glider_2026_indian_ocean_index.csv` & 2,952 `.nc` files):**
  - 2 gliders (`R6801558` and `R8901048`), high vertical resolution, temperature, salinity, and dissolved oxygen (`DOXY`, `MOLAR_DOXY`).

---

## 3. Implemented API Endpoints

### Core Metadata (`/api/v1/metadata`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/metadata/overview` | Global coordinate bounds, time coverage, variables, and in-situ inventory |
| `GET` | `/api/v1/metadata/levels` | Exact 36 depth levels and 23 calendar dates for UI sliders |

### CMEMS Numerical Model Data (`/api/v1/model`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/model/slice` | 2D horizontal field slice at depth and time (supports `stride` & `bbox`) |
| `GET` | `/api/v1/model/point-profile` | Complete water column vertical sounding at clicked point |
| `GET` | `/api/v1/model/vector-currents` | Subsampled $u, v$ ocean current vector field for 3D vector and particle flow |
| `GET` | `/api/v1/model/transect` | Vertical curtain cross-section between two coordinates |

### Argo Profiling Floats (`/api/v1/argo`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/argo/floats` | Active Argo fleet inventory, latest coordinates, and cycle count |
| `GET` | `/api/v1/argo/floats/{wmo_id}/trajectory` | Historical drift path and cycle surface fixes |
| `GET` | `/api/v1/argo/profiles/{profile_id}` | Individual CTD vertical profile data and QC flags from NetCDF |

### Autonomous Gliders (`/api/v1/gliders`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/gliders` | Inventory, mission info, and bounding boxes of deployed gliders |
| `GET` | `/api/v1/gliders/{glider_id}/track` | Sawtooth mission track and dive coordinate sequence |
| `GET` | `/api/v1/gliders/{glider_id}/profiles/{profile_id}` | High-density profile with CTD + Dissolved Oxygen (`DOXY`) from NetCDF |

### Integrated In-Situ Observations (`/api/v1/observations`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/observations/spatial-search` | Unified spatial bounding-box search across Argo + Gliders |
| `GET` | `/api/v1/observations/catalog` | Paginated multi-criteria table query for Observations catalog |

### Model–Observation Validation (`/api/v1/comparison`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/comparison/colocated-pairs` | Discovers space-time matched model and in-situ pairs |
| `GET` | `/api/v1/comparison/dual-profile` | Co-located model vs in-situ overlay, error curves, RMSE, Bias, and $r$ |
| `GET` | `/api/v1/comparison/statistics` | Aggregate regional validation scorecards |

### Ocean Analytics & Marine Alerts (`/api/v1/analytics`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/analytics/alerts` | Marine heatwave, boundary current shear, and hypoxia hazard alerts |
| `GET` | `/api/v1/analytics/hovmoller` | Time vs Depth Hovmöller matrix at a chosen location |

### System & Health Endpoints
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Root API directory and service discovery mapping |
| `GET` | `/health` | Primary health check validating server status & dataset connectivity |
| `GET` | `/api/v1/health` | Namespaced health check alias under API v1 |
| `GET` | `/docs` | Interactive Swagger UI API documentation and testing playground |
| `GET` | `/redoc` | Alternative ReDoc OpenAPI documentation |

### Legacy Data Router (`/data` — Backward Compatibility)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/data/metadata` | Legacy metadata endpoint returning dimensions, coordinates, and variables |
| `GET` | `/data/tile` | Legacy 2D scalar tile slice extraction for Three.js grid visualization |
| `GET` | `/data/health` | Legacy data service health check |

---

## 4. Setup & Running the Server

> [!IMPORTANT]
> **First-Time Setup: Download Ocean Data First (~40–60 mins)**:
> Before launching the backend for the first time, make sure to populate the dataset files by running the download scripts in `ocean-data/` (`python download_argo.py`, `python download_glider.py`, `python download_model.py`). This one-time download fetches ~5,000+ NetCDF profiles and model grids and takes approximately **40 to 60 minutes**.

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Configure Environment (Optional)
Dataset locations default to `D:\3d-Ocean\ocean-data\data\...`. You can override them via environment variables:
```bash
$env:CMEMS_MODEL_PATH="D:\3d-Ocean\ocean-data\data\model\cmems_indian_ocean_2026_06.nc"
$env:ARGO_DATA_DIR="D:\3d-Ocean\ocean-data\data\argo"
$env:GLIDER_DATA_DIR="D:\3d-Ocean\ocean-data\data\glider"
```

### 3. Run Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Interactive Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

### 4. Run Verification Test Suite
```bash
python test_api_endpoints.py
```
This runs automated tests hitting the actual physical NetCDF files and CSV indices for all 20 endpoints.

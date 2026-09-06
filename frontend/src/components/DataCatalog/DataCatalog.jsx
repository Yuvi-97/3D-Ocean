import React, { useState } from "react";
import Header from "../Header/Header";

const DataCatalog = () => {
  const [selectedFormat, setSelectedFormat] = useState("All");

  const datasets = [
    {
      id: "DS-ROMS-3D-DAILY",
      title: "INCOIS-ROMS 3D High-Resolution Ocean Forecast",
      variables: "Temperature, Salinity, Current Vectors (u,v,w), Chlorophyll-a",
      grid: "1/12° (~9 km) horizontal • 40 vertical sigma levels",
      coverage: "Indian Ocean (30°S - 30°N, 30°E - 120°E)",
      timeStep: "3-Hourly outputs • 72h operational forecast",
      format: "NetCDF-4 (CF-1.6) • OPeNDAP Server",
      size: "4.2 GB / day",
      status: "Operational",
    },
    {
      id: "DS-ARGO-INCOIS-RT",
      title: "Indian Ocean Argo Profiling Float In-Situ Archive",
      variables: "In-Situ Temperature, Practical Salinity, Dissolved Oxygen, Chlorophyll-a",
      grid: "Discrete profile points across Arabian Sea & Bay of Bengal",
      coverage: "0m to 2,000m depth profiles",
      timeStep: "10-day cycle per float • Near real-time feed",
      format: "NetCDF-3 / ASCII Text / GeoJSON",
      size: "120 MB / month",
      status: "Operational",
    },
    {
      id: "DS-GLIDER-BOB-2026",
      title: "Autonomous Underwater Glider Mission Transects",
      variables: "High-frequency Temp, Salinity, Density, CDOM, Turbidity",
      grid: "Sawtooth undulating trajectory (0 - 1,000m)",
      coverage: "Central Bay of Bengal & SW Arabian Sea transects",
      timeStep: "Continuous dive-climb cycles (~4 hours)",
      format: "Delimited CSV • NetCDF-4",
      size: "85 MB / mission",
      status: "Active Mission",
    },
    {
      id: "DS-OMNI-BUOY-MET",
      title: "Moored Ocean Buoy Network (OMNI) Time-Series",
      variables: "Surface Met (Wind, Pressure, SST) + Subsurface ADCP Currents (0-500m)",
      grid: "10 Fixed mooring stations (BD08, BD09, BD11, AD01-AD04)",
      coverage: "Deep sea Arabian Sea and Bay of Bengal",
      timeStep: "Hourly transmissions via satellite",
      format: "NetCDF-4 • REST JSON API",
      size: "15 MB / month",
      status: "Operational",
    },
    {
      id: "DS-PFZ-DAILY-GIS",
      title: "Potential Fishing Zone (PFZ) Thermal Front Grids",
      variables: "Ocean thermal front boundaries, Chlorophyll-a gradients, Solitary wave fronts",
      grid: "Coastal and shelf waters of Indian EEZ",
      coverage: "Gujarat, Maharashtra, Goa, Karnataka, Kerala, TN, AP, Odisha, WB",
      timeStep: "Daily bulletin advisory",
      format: "OGC WMS / WFS • GeoJSON • Shapefiles",
      size: "45 MB / day",
      status: "Operational",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 px-6 pb-12 max-w-7xl mx-auto">
        {/* Header Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 text-xs font-bold rounded uppercase">
              INCOIS Data Repository
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Multi-Format Ocean Data Repository & OPeNDAP Services
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            Data Catalog & Ingestion Services
          </h1>
          <p className="text-sm text-gray-600 max-w-3xl mt-1">
            Standardized CF-compliant NetCDF repository, autonomous in-situ observation feeds, OGC web services (WMS/WCS), and lightweight REST/OPeNDAP APIs.
          </p>
        </div>

        {/* Architecture Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-teal-600 uppercase">NetCDF Ingestion</span>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">xarray / PyNIO</p>
            <span className="text-xs text-gray-500">Automated CF-1.6 standard parser</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-blue-600 uppercase">In-Situ Autonomous</span>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">Argo & Gliders</p>
            <span className="text-xs text-gray-500">Real-time ASCII & NetCDF feeds</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-cyan-600 uppercase">Web Services</span>
            <p className="text-2xl font-extrabold text-cyan-600 mt-1">OGC WMS / WCS</p>
            <span className="text-xs text-gray-500">Interoperable geospatial layers</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-emerald-600 uppercase">Data Subsetting</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">OPeNDAP / REST</p>
            <span className="text-xs text-gray-500">Depth, Bounding-Box & Time query</span>
          </div>
        </div>

        {/* Dataset Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-semibold">Filter by Data Format:</span>
            {["All", "NetCDF-4", "ASCII / CSV", "OGC WMS", "REST API"].map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  selectedFormat === fmt
                    ? "bg-teal-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {fmt}
              </button>
            ))}
          </div>
          <div className="text-gray-400">
            All data complies with CF Conventions for NetCDF & MoES Open Data Policy
          </div>
        </div>

        {/* Datasets Catalog Cards */}
        <div className="space-y-4 mb-8">
          {datasets.map((ds) => (
            <div
              key={ds.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-gray-100 pb-3 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      {ds.id}
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                      {ds.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-base mt-1">{ds.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 font-mono">{ds.size}</span>
                  <button className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded text-xs transition-colors">
                    Access Endpoint
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 font-medium">Variables Available:</span>
                  <p className="font-medium text-gray-700 mt-0.5">{ds.variables}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Grid Resolution & Levels:</span>
                  <p className="font-medium text-gray-700 mt-0.5">{ds.grid}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Coverage & Cadence:</span>
                  <p className="font-medium text-gray-700 mt-0.5">{ds.coverage}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{ds.timeStep}</p>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Access Protocols:</span>
                  <p className="font-mono text-teal-800 font-medium mt-0.5">{ds.format}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* REST / OPeNDAP Code Sandbox Preview */}
        <div className="bg-slate-900 rounded-xl shadow-lg border border-slate-800 p-6 text-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="px-2 py-0.5 bg-teal-500/30 text-teal-300 text-[10px] font-bold rounded uppercase">
                Developer & Scientist API
              </span>
              <h3 className="text-base font-bold text-white mt-1">
                Lightweight REST & OPeNDAP Subsetting API Sandbox
              </h3>
            </div>
            <div className="flex gap-2 text-xs">
              <span className="px-2.5 py-1 bg-slate-800 text-teal-300 rounded font-mono">Python (xarray)</span>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded font-mono">cURL</span>
              <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded font-mono">JavaScript / WebGL</span>
            </div>
          </div>

          <pre className="bg-slate-950 p-4 rounded-lg font-mono text-xs text-teal-300 overflow-x-auto border border-slate-800">
{`import xarray as xr

# Stream 3D volumetric ocean model variables via INCOIS OPeNDAP endpoint
url = "https://incois.gov.in/opendap/roms_3d/daily_forecast_20260905.nc"
ds = xr.open_dataset(url)

# Subset depth-slice for Arabian Sea & Bay of Bengal
slice_3d = ds.sel(
    depth=slice(0, 500),         # 0m surface down to 500m
    lat=slice(8.0, 22.0),        # Indian EEZ Latitudes
    lon=slice(68.0, 90.0)        # Arabian Sea to Bay of Bengal
)

print(slice_3d[['temp', 'salt', 'u', 'v']])`}
          </pre>
        </div>
      </main>
    </div>
  );
};

export default DataCatalog;

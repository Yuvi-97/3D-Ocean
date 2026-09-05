import React, { useState } from "react";
import Header from "../Header/Header";

const Observations = () => {
  const [selectedPlatform, setSelectedPlatform] = useState("WMO 2902123");

  const platforms = [
    {
      id: "WMO 2902123",
      type: "Argo BGC Profiling Float",
      region: "Bay of Bengal",
      lat: "13.412° N",
      lon: "85.234° E",
      depth: "2,000 m",
      sensors: "Temp, Salinity, O₂, Chlorophyll-a",
      cycle: "#142",
      timestamp: "2026-09-05 04:30 UTC",
      status: "Active - QC Passed",
    },
    {
      id: "INCOIS-GL04",
      type: "Autonomous Slocum Glider",
      region: "Central Arabian Sea",
      lat: "10.145° N",
      lon: "71.820° E",
      depth: "1,000 m",
      sensors: "Temp, Salinity, Density, CDOM, Backscatter",
      cycle: "Mission Dive #38",
      timestamp: "2026-09-05 06:15 UTC",
      status: "Active - Diving",
    },
    {
      id: "WMO 2903341",
      type: "Standard CTD Argo Float",
      region: "Equatorial Indian Ocean",
      lat: "02.120° S",
      lon: "78.432° E",
      depth: "2,000 m",
      sensors: "Temperature, Practical Salinity, Pressure",
      cycle: "#98",
      timestamp: "2026-09-04 18:00 UTC",
      status: "Active - QC Passed",
    },
    {
      id: "BD08-OMNI",
      type: "Moored Ocean Buoy (ADCP)",
      region: "Northern Bay of Bengal",
      lat: "18.210° N",
      lon: "89.700° E",
      depth: "500 m (Currents)",
      sensors: "Current Vectors (u,v), SST, Surface Wind, Air Temp",
      cycle: "Hourly Telemetry",
      timestamp: "2026-09-05 08:00 UTC",
      status: "Active - Transmitting",
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
              Problem Statement 26067
            </span>
            <span className="text-xs text-gray-500 font-medium">
              In-Situ Autonomous Observation Pipeline
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            In-Situ Instrument Observations
          </h1>
          <p className="text-sm text-gray-600 max-w-3xl mt-1">
            Real-time and delayed-mode vertical ocean profiles from autonomous Argo profiling floats, underwater gliders, CTD casts, and biogeochemical (BGC) sensors across India's EEZ.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-teal-600 uppercase">Active Argo Floats</span>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">38 Deployed</p>
            <span className="text-xs text-gray-500">22 CTD • 16 BGC Floats</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-cyan-600 uppercase">Autonomous Gliders</span>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">6 Missions</p>
            <span className="text-xs text-gray-500">Continuous 0-1000m Sawtooth</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-blue-600 uppercase">Moored Buoy Network</span>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">10 OMNI Buoys</p>
            <span className="text-xs text-gray-500">Surface Met + Subsurface ADCP</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-emerald-600 uppercase">Data Quality (QC)</span>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">99.4% Passed</p>
            <span className="text-xs text-gray-500">Automated INCOIS Real-Time QC</span>
          </div>
        </div>

        {/* Interactive Profile Inspector (Co-Display with Model) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Platform Selector & Metadata */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-3">
              Selected In-Situ Platform
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Choose Instrument:</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="w-full mt-1 bg-gray-50 border border-gray-200 text-gray-800 font-semibold rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-500"
                >
                  {platforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.id} ({p.type})</option>
                  ))}
                </select>
              </div>

              {/* Metadata Details Card */}
              <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-100 text-xs space-y-2 text-gray-700">
                <div className="flex justify-between">
                  <span className="font-semibold text-teal-900">Platform ID:</span>
                  <span className="font-mono font-bold text-teal-800">{selectedPlatform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sea Region:</span>
                  <span className="font-medium">Bay of Bengal (Central)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Coordinates:</span>
                  <span className="font-mono font-medium">13.412° N, 85.234° E</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Max Depth:</span>
                  <span className="font-medium">2,000 meters</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Cycle Number:</span>
                  <span className="font-medium">Profile #142</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Timestamp:</span>
                  <span className="font-mono text-[11px]">2026-09-05 04:30 UTC</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-teal-200/60">
                  <span className="text-gray-500">QC Status:</span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">Passed</span>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold shadow transition-colors">
                  Download NetCDF
                </button>
                <button className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs font-semibold border border-gray-300 transition-colors">
                  ASCII Text
                </button>
              </div>
            </div>
          </div>

          {/* Depth vs Variable Profile Chart Placeholders */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800">
                  Depth-vs-Variable Vertical Profile (0m - 2,000m)
                </h3>
                <p className="text-xs text-gray-500">
                  Inspection chart comparing in-situ sensor measurements across the water column
                </p>
              </div>
              <div className="flex gap-1.5 text-xs">
                <span className="px-2 py-0.5 bg-teal-100 text-teal-800 rounded font-semibold text-[11px]">Temp (°C)</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-[11px]">Salinity (PSU)</span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px]">Chl-a</span>
              </div>
            </div>

            {/* Profile Chart Placeholder Graphic */}
            <div className="h-64 bg-slate-900 rounded-lg p-4 relative flex flex-col justify-between border border-slate-800">
              <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                <span>Surface (0m)</span>
                <span>Mixed Layer (~45m)</span>
                <span>Thermocline (~120m)</span>
                <span>Deep Ocean (2000m)</span>
              </div>

              {/* Schematic Vertical Curves */}
              <div className="my-auto flex items-center justify-around h-40 relative px-6">
                <div className="absolute inset-0 flex flex-col justify-between opacity-15 pointer-events-none">
                  <div className="border-b border-dashed border-teal-400 w-full"></div>
                  <div className="border-b border-dashed border-teal-400 w-full"></div>
                  <div className="border-b border-dashed border-teal-400 w-full"></div>
                  <div className="border-b border-dashed border-teal-400 w-full"></div>
                </div>

                <div className="text-center z-10">
                  <span className="text-2xl">📉</span>
                  <p className="text-teal-300 font-mono text-xs mt-1 font-semibold">Temperature Profile</p>
                  <p className="text-[11px] text-slate-400">29.4°C (Surface) &rarr; 4.1°C (2000m)</p>
                </div>

                <div className="text-center z-10">
                  <span className="text-2xl">📊</span>
                  <p className="text-cyan-300 font-mono text-xs mt-1 font-semibold">Salinity Profile</p>
                  <p className="text-[11px] text-slate-400">33.2 PSU (Surface) &rarr; 34.8 PSU (Deep)</p>
                </div>

                <div className="text-center z-10">
                  <span className="text-2xl">🌿</span>
                  <p className="text-emerald-300 font-mono text-xs mt-1 font-semibold">Chlorophyll-a (DCM)</p>
                  <p className="text-[11px] text-slate-400">Subsurface Peak at 60m depth</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-teal-400 pt-2 border-t border-slate-800">
                <span>Sensor: Sea-Bird SBE 41CP CTD</span>
                <span>Sampling Rate: 1 Hz</span>
                <span>Vertical Resolution: 2 dbar</span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span>Co-display enabled: Overlay against INCOIS-ROMS 1/12° numerical model</span>
              <a href="/comparison" className="text-teal-600 font-semibold hover:underline">
                Compare with Numerical Model &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* Observation Records Table Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-800">
                In-Situ Instrument Deployment Registry
              </h3>
              <p className="text-xs text-gray-500">
                Live monitoring of all autonomous profiling assets in the Indian Ocean
              </p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search float ID or region..."
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-teal-500"
              />
              <button className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg shadow-sm">
                Filter
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Platform ID</th>
                  <th className="py-3 px-4">Instrument Type</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4">Coordinates</th>
                  <th className="py-3 px-4">Depth Range</th>
                  <th className="py-3 px-4">Sensors</th>
                  <th className="py-3 px-4">Cycle</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {platforms.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">{p.id}</td>
                    <td className="py-3 px-4 font-medium">{p.type}</td>
                    <td className="py-3 px-4">{p.region}</td>
                    <td className="py-3 px-4 font-mono text-gray-600">{p.lat}, {p.lon}</td>
                    <td className="py-3 px-4">{p.depth}</td>
                    <td className="py-3 px-4 text-gray-500">{p.sensors}</td>
                    <td className="py-3 px-4 font-mono">{p.cycle}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold text-[10px]">
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Observations;

import React, { useState } from "react";
import Header from "../Header/Header";

const ModelObservation = () => {
  const [selectedVariable, setSelectedVariable] = useState("Temperature");
  const [selectedModel, setSelectedModel] = useState("INCOIS-ROMS 1/12°");

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
              Operational Model Validation & Error Estimation
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            Model vs Observation Comparison
          </h1>
          <p className="text-sm text-gray-600 max-w-3xl mt-1">
            Simultaneous co-visualization and statistical validation of numerical ocean model forecasts (ROMS, NEMO) against in-situ autonomous profiles (Argo floats, underwater gliders).
          </p>
        </div>

        {/* Validation Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-teal-600 uppercase">Profile RMSE</span>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">0.38 °C</p>
            <span className="text-xs text-emerald-600 font-medium">Within INCOIS operational tolerance (&lt;0.5°C)</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-blue-600 uppercase">Mean Model Bias</span>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">+0.12 °C</p>
            <span className="text-xs text-gray-500">Minor warm surface bias in northern Bay</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-cyan-600 uppercase">Correlation (r)</span>
            <p className="text-2xl font-extrabold text-teal-600 mt-1">r = 0.96</p>
            <span className="text-xs text-gray-500">Thermocline structure alignment</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-purple-600 uppercase">Colocated Pairs</span>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">142 Matches</p>
            <span className="text-xs text-gray-500">Within 25 km & ±3 hrs window</span>
          </div>
        </div>

        {/* Colocated Match & Comparison Toolbar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className="text-gray-500 font-semibold block mb-1">Numerical Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-800 font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500"
              >
                <option>INCOIS-ROMS 1/12° (Regional)</option>
                <option>NEMO Global 1/4° (INCOIS-GODAS)</option>
                <option>HYCOM 1/12° Ocean Analysis</option>
              </select>
            </div>

            <div>
              <span className="text-gray-500 font-semibold block mb-1">In-Situ Float / Glider:</span>
              <select className="bg-gray-50 border border-gray-200 text-gray-800 font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500">
                <option>Argo Float #2902123 (Bay of Bengal)</option>
                <option>Glider INCOIS-GL04 (Arabian Sea)</option>
                <option>Argo Float #2903341 (Equatorial IO)</option>
                <option>Moored Buoy BD08 ADCP (Northern Bay)</option>
              </select>
            </div>

            <div>
              <span className="text-gray-500 font-semibold block mb-1">Variable:</span>
              <select
                value={selectedVariable}
                onChange={(e) => setSelectedVariable(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-800 font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500"
              >
                <option value="Temperature">Temperature (°C)</option>
                <option value="Salinity">Salinity (PSU)</option>
                <option value="Currents">Horizontal Current Speed (m/s)</option>
                <option value="Density">Potential Density (kg/m³)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Match radius: 25 km | ±3h</span>
            <button className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg shadow-sm transition-colors">
              Recompute Match
            </button>
          </div>
        </div>

        {/* Co-Visualization Visual Graphs Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Dual-Profile Comparison Plot */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  Vertical Profile Comparison: {selectedVariable} vs Depth (0 - 1,000m)
                </h3>
                <p className="text-xs text-gray-500">
                  Colocated Argo observation vs INCOIS-ROMS model forecast grid cell
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-teal-500 rounded-full"></div>
                  <span className="font-semibold text-gray-700">Observed (Argo #2902123)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-0.5 bg-rose-500 border-b border-rose-500 border-dashed"></div>
                  <span className="font-semibold text-gray-700">Model Forecast (ROMS)</span>
                </div>
              </div>
            </div>

            {/* Depth Chart Visual Graphic Placeholder */}
            <div className="h-72 bg-slate-900 rounded-lg p-5 relative flex flex-col justify-between border border-slate-800 overflow-hidden">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>0m (Surface: 29.2°C Obs vs 29.4°C Model)</span>
                <span>Thermocline: ~120m</span>
                <span>500m</span>
                <span>1,000m (Deep)</span>
              </div>

              {/* Graphical Curves Mockup */}
              <div className="my-auto flex items-center justify-around h-48 relative px-4">
                <div className="absolute inset-0 flex flex-col justify-between opacity-15 pointer-events-none">
                  <div className="border-b border-teal-400 w-full"></div>
                  <div className="border-b border-teal-400 w-full"></div>
                  <div className="border-b border-teal-400 w-full"></div>
                  <div className="border-b border-teal-400 w-full"></div>
                </div>

                <div className="z-10 text-center max-w-sm">
                  <span className="text-3xl">📐</span>
                  <p className="text-white font-semibold text-sm mt-1">Colocated Depth Profiles Aligned</p>
                  <p className="text-xs text-teal-300/90 mt-1">
                    Strong thermocline agreement within ±6m depth error. Model accurately captures surface mixed layer temperature and thermocline gradient.
                  </p>
                </div>

                <div className="z-10 bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-lg p-3 text-[11px] text-slate-300 font-mono space-y-1">
                  <div className="text-teal-400 font-bold border-b border-slate-700 pb-1">Error Breakdown by Layer:</div>
                  <div>• Mixed Layer (0-50m): Bias +0.18°C</div>
                  <div>• Thermocline (50-250m): RMSE 0.44°C</div>
                  <div>• Intermediate (250-1000m): RMSE 0.16°C</div>
                  <div className="text-emerald-400 font-bold pt-1">Overall Skill Score: 0.94 / 1.0</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>Colocated Lat/Lon: 13.4° N, 85.2° E</span>
                <span>Forecast Lead Time: T + 24 Hours</span>
                <span>Data Source: INCOIS NetCDF Archive</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>Statistical confidence interval: 95% Bootstrap</span>
              <button className="text-teal-600 font-semibold hover:underline">
                Export Colocated NetCDF & CSV Dataset &rarr;
              </button>
            </div>
          </div>

          {/* Model Bias & Error Distribution Widget */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-800 mb-1">
                Residual & Bias Diagnostics
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Difference: Model Output minus Observation
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700">Surface Mixed Layer (0-50m)</span>
                    <span className="text-amber-600">+0.18 °C Bias</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Slight solar insolation overestimation</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700">Thermocline Layer (50-200m)</span>
                    <span className="text-teal-600">-0.06 °C Bias</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: '25%' }}></div>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Near-perfect isotherm curvature match</span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-gray-700">Deep Layer (200-1000m)</span>
                    <span className="text-emerald-600">+0.02 °C Bias</span>
                  </div>
                  <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '10%' }}></div>
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 block">Negligible drift</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <a
                href="/explorer"
                className="w-full block text-center py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold rounded-lg border border-teal-200 transition-colors"
              >
                Inspect in 3D Volumetric Canvas &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* Colocated Match Registry Table Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-base font-bold text-gray-800 mb-1">
            Recent Colocated Validation Matches
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Continuous verification pipeline validating ROMS numerical forecasts with real-time in-situ telemetry
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Observation ID</th>
                  <th className="py-3 px-4">Model Run</th>
                  <th className="py-3 px-4">Match Location</th>
                  <th className="py-3 px-4">Spatial Delta</th>
                  <th className="py-3 px-4">Temp RMSE</th>
                  <th className="py-3 px-4">Salinity RMSE</th>
                  <th className="py-3 px-4">Skill Score</th>
                  <th className="py-3 px-4">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-teal-700">Argo #2902123</td>
                  <td className="py-3 px-4">ROMS 1/12° (T+24h)</td>
                  <td className="py-3 px-4">13.4° N, 85.2° E</td>
                  <td className="py-3 px-4 font-mono">11.4 km</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">0.38 °C</td>
                  <td className="py-3 px-4">0.08 PSU</td>
                  <td className="py-3 px-4 font-bold">0.96</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">Verified</span></td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-teal-700">Glider INCOIS-GL04</td>
                  <td className="py-3 px-4">ROMS 1/12° (T+12h)</td>
                  <td className="py-3 px-4">10.1° N, 71.8° E</td>
                  <td className="py-3 px-4 font-mono">6.2 km</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">0.42 °C</td>
                  <td className="py-3 px-4">0.09 PSU</td>
                  <td className="py-3 px-4 font-bold">0.94</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">Verified</span></td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-teal-700">Buoy BD08 ADCP</td>
                  <td className="py-3 px-4">ROMS 1/12° (T+00h)</td>
                  <td className="py-3 px-4">18.2° N, 89.7° E</td>
                  <td className="py-3 px-4 font-mono">3.8 km</td>
                  <td className="py-3 px-4 font-bold text-emerald-600">0.31 °C</td>
                  <td className="py-3 px-4">0.11 PSU</td>
                  <td className="py-3 px-4 font-bold">0.97</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">Verified</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ModelObservation;

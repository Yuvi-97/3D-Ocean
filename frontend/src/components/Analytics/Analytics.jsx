import React, { useState } from "react";
import Header from "../Header/Header";

const Analytics = () => {
  const [selectedPeriod, setSelectedPeriod] = useState("Last 30 Days");

  const reportsList = [
    {
      id: "REP-2026-0905",
      title: "Daily Operational Ocean State Forecast Bulletin",
      date: "2026-09-05",
      format: "PDF (3.4 MB) • NetCDF Summary",
      coverage: "Arabian Sea, Bay of Bengal, Equatorial IO",
      status: "Published",
      author: "INCOIS Operational Oceanography Division",
    },
    {
      id: "MHW-REP-WK36",
      title: "Weekly Marine Heatwave & Ecological Vulnerability Report",
      date: "2026-09-03",
      format: "PDF (5.1 MB) • GeoTIFF Rasters",
      coverage: "Lakshadweep Sea & Gulf of Mannar",
      status: "Published",
      author: "MoES Coral Health Monitoring Unit",
    },
    {
      id: "PFZ-SUMMARY-AUG",
      title: "Monthly Potential Fishing Zone (PFZ) Validation Synthesis",
      date: "2026-08-31",
      format: "PDF (8.2 MB) • CSV Data Tables",
      coverage: "Gujarat, Maharashtra, Kerala, Tamil Nadu & AP Coast",
      status: "Archived",
      author: "Fishery Advisory Services Group",
    },
    {
      id: "CLIM-IOD-2026",
      title: "Indian Ocean Dipole (IOD) & Climatological Trend Brief",
      date: "2026-08-25",
      format: "PDF (4.8 MB) • Interactive 3D Slides",
      coverage: "Tropical Indian Ocean Basin",
      status: "Published",
      author: "INCOIS Climate Modelling & Prediction",
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
              Ocean Analytics
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Ocean State Synthesis & Public Outreach
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            Analytics & Reports
          </h1>
          <p className="text-sm text-gray-600 max-w-3xl mt-1">
            Comprehensive oceanographic analytics, decadal climatology trends, automated bulletin publishing, and public science communication tools.
          </p>
        </div>

        {/* Oceanographic Climate Indices Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-teal-600 uppercase">Indian Ocean Dipole (IOD)</span>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">+0.42 °C</p>
            <span className="text-xs text-gray-500">Neutral-Positive Phase (DMI)</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-blue-600 uppercase">Basin SST Anomaly</span>
            <p className="text-2xl font-extrabold text-blue-600 mt-1">+0.64 °C</p>
            <span className="text-xs text-gray-500">Above 1990-2020 Climatology</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-cyan-600 uppercase">Ocean Heat Content (OHC)</span>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">78.4 kJ/cm²</p>
            <span className="text-xs text-gray-500">Top 700m Layer in Bay of Bengal</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <span className="text-xs font-semibold text-purple-600 uppercase">Mixed Layer Depth</span>
            <p className="text-2xl font-extrabold text-purple-600 mt-1">42 meters</p>
            <span className="text-xs text-gray-500">Monsoon Wind-Driven Deepening</span>
          </div>
        </div>

        {/* Climatology Trends & Interactive Export Sandbox */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Trend Chart Graphic Placeholder */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-800">
                  Sea Surface Temperature (SST) Anomaly Climatology (1995 - 2026)
                </h3>
                <p className="text-xs text-gray-500">
                  Historical decadal trend across Northern Indian Ocean and Arabian Sea
                </p>
              </div>
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-xs">
                {["1 Year", "5 Years", "Decadal"].map((range) => (
                  <button
                    key={range}
                    className={`px-2.5 py-1 rounded font-medium ${
                      range === "Decadal" ? "bg-white text-teal-700 shadow-sm font-bold" : "text-gray-600"
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Series Graphic Placeholder */}
            <div className="h-60 bg-slate-900 rounded-lg p-5 relative flex flex-col justify-between border border-slate-800">
              <div className="flex justify-between text-xs text-slate-400 font-mono">
                <span>1995 (Baseline: +0.0°C)</span>
                <span>2005 (+0.25°C)</span>
                <span>2015 (+0.48°C)</span>
                <span>2026 (+0.64°C Peak)</span>
              </div>

              {/* Schematic Trend Bar / Curve */}
              <div className="my-auto flex items-center justify-around h-32 relative px-4">
                <div className="absolute inset-0 flex flex-col justify-between opacity-15 pointer-events-none">
                  <div className="border-b border-teal-400 w-full"></div>
                  <div className="border-b border-teal-400 w-full"></div>
                  <div className="border-b border-teal-400 w-full"></div>
                </div>

                <div className="z-10 text-center">
                  <span className="text-3xl">📈</span>
                  <p className="text-teal-300 font-semibold text-sm mt-1">Steady Ocean Warming Trend: +0.14°C / Decade</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Modulated by positive Indian Ocean Dipole events and seasonal Southwest Monsoon upwelling
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] text-teal-400 pt-2 border-t border-slate-800">
                <span>Dataset: INCOIS OISST High-Resolution Reanalysis</span>
                <span>Spatial Domain: 0°N - 25°N, 50°E - 100°E</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
              <span>CF-1.6 standard compliant netcdf export available</span>
              <button className="text-teal-600 font-semibold hover:underline">
                Download Statistical Data (.CSV / .NetCDF) &rarr;
              </button>
            </div>
          </div>

          {/* Science Communication & Outreach Showcase */}
          <div className="bg-gradient-to-br from-teal-950 to-slate-900 text-white rounded-xl shadow-sm p-6 flex flex-col justify-between">
            <div>
              <span className="px-2 py-0.5 bg-teal-500/30 text-teal-200 text-[10px] font-bold rounded uppercase">
                Public Science Outreach
              </span>
              <h3 className="text-base font-bold text-white mt-2">
                E-Learning & Interactive 3D Storyboards
              </h3>
              <p className="text-xs text-teal-200/90 mt-1">
                Transforming numerical model outputs into intuitive 3D visual experiences for school/college students, exhibitions, and policymakers.
              </p>

              <div className="mt-4 space-y-2.5 text-xs">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="font-semibold text-teal-300">🎓 Ocean Stratification & Thermocline</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">Explore how warm tropical waters sit atop cold abyss layers in 3D.</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="font-semibold text-cyan-300">🌀 Monsoon Wind-Driven Currents</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">Visualizing Somalia Current reversal and Bay of Bengal gyres.</p>
                </div>
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <p className="font-semibold text-emerald-300">🤖 Autonomous Argo Fleet in Action</p>
                  <p className="text-[11px] text-slate-300 mt-0.5">How robotic floats dive 2,000m deep and beam data via satellites.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 mt-4">
              <a
                href="/about"
                className="w-full block text-center py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow"
              >
                Learn More About INCOIS Mission &rarr;
              </a>
            </div>
          </div>
        </div>

        {/* Published Reports & Bulletins Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-800">
                Operational Reports & Bulletins Archive
              </h3>
              <p className="text-xs text-gray-500">
                Downloadable technical summaries and daily forecast bulletins generated by INCOIS
              </p>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-teal-500"
              >
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
                <option>Year 2026 Archive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Report ID</th>
                  <th className="py-3 px-4">Bulletin Title</th>
                  <th className="py-3 px-4">Publish Date</th>
                  <th className="py-3 px-4">Spatial Coverage</th>
                  <th className="py-3 px-4">Formats Available</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {reportsList.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-teal-700">{r.id}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{r.title}</td>
                    <td className="py-3 px-4 text-gray-500">{r.date}</td>
                    <td className="py-3 px-4">{r.coverage}</td>
                    <td className="py-3 px-4 text-gray-500 font-mono text-[11px]">{r.format}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button className="px-2.5 py-1 bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold rounded border border-teal-200 transition-colors">
                        Download
                      </button>
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

export default Analytics;

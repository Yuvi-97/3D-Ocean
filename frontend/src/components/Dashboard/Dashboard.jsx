import React, { useState, useEffect } from "react";
import Header from "../Header/Header";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const Dashboard = () => {
  // Slider state
  const images = [
    "https://www.india.gov.in/sites/upload_files/npi/files/pm-suryaghar_0.jpg",
    "https://media.gettyimages.com/id/1244355897/photo/new-delhi-india-a-general-view-of-connaught-place-covered-with-smog-due-to-air-pollution.jpg?s=612x612&w=0&k=20&c=qTsz5n4nmy4XcpwmxxPRQEKpHtnpKRyNKwtFMRgvpUg=",
    "https://www.india.gov.in/sites/upload_files/npi/files/Swachhata_Hi_Seva_2024.jpg",
    "https://powermin.gov.in/sites/default/files/styles/slider_1024x422/public/UJALA1.png?itok=YGftv199",
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (!isPaused) setCurrentIndex((i) => (i + 1) % images.length);
    }, 4000);
    return () => clearInterval(id);
  }, [isPaused, images.length]);

  const handlePrev = () =>
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  const handleNext = () => setCurrentIndex((i) => (i + 1) % images.length);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Full-width slider: centered viewport-width element so images stretch left-to-right */}
      <div
        className="relative left-1/2 right-1/2 -translate-x-1/2 w-screen mt-28"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="relative w-full overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {images.map((src, idx) => (
              <div key={idx} className="w-full flex-shrink-0">
                <img
                  src={src}
                  alt={`Slide ${idx}`}
                  className="w-full h-48 md:h-64 lg:h-72 object-cover"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handlePrev}
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white px-2 py-2 rounded-full shadow focus:outline-none"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white px-2 py-2 rounded-full shadow focus:outline-none"
          >
            <FaChevronRight />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? "bg-teal-600" : "bg-white/70"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main content stays in the centered container */}
      <main className="pt-6 px-6 pb-12 max-w-7xl mx-auto">
        {/* Ocean Platform Title Banner */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 rounded-xl shadow-lg p-6 mb-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 bg-teal-500/30 text-teal-200 text-xs font-semibold rounded-full uppercase tracking-wider mb-2">
                Problem Statement ID: 26067 | MoES & INCOIS
              </span>
              <h2 className="text-2xl font-bold tracking-tight">
                3D Ocean Model & In-Situ Observation Platform
              </h2>
              <p className="text-teal-100 text-sm mt-1 max-w-3xl">
                Integrated web-based 3D volumetric visualization for numerical ocean model forecasts (temperature, salinity, currents, chlorophyll) and autonomous in-situ observation streams (Argo floats, gliders, moorings).
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/explorer"
                className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold text-sm rounded-lg shadow transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
              >
                🌊 Launch 3D Explorer
              </a>
              <a
                href="/explorer"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-medium text-sm rounded-lg border border-white/20 transition-all duration-200 whitespace-nowrap"
              >
                📡 In-Situ Profiles on 3D Globe
              </a>
            </div>
          </div>
        </div>

        {/* Operational Stats Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">In-Situ Sensors</span>
              <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">Live Telemetry</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-800 mt-3">54 Active</p>
            <p className="text-xs text-gray-500 mt-2">
              38 Argo Floats • 6 Gliders • 10 Moored Buoys
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Ocean Model Run</span>
              <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">ROMS 1/12°</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-800 mt-3">T + 72h</p>
            <p className="text-xs text-gray-500 mt-2">
              40 Depth Sigma Levels • Temp/Salinity/Currents
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Hazard Advisories</span>
              <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">2 Warnings</span>
            </div>
            <p className="text-3xl font-extrabold text-amber-600 mt-3">Active Alert</p>
            <p className="text-xs text-gray-500 mt-2">
              Marine Heatwave Cat-II & High Swell Surge
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Data Ingestion</span>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Synced</span>
            </div>
            <p className="text-3xl font-extrabold text-gray-800 mt-3">NetCDF / CF</p>
            <p className="text-xs text-gray-500 mt-2">
              OPeNDAP REST API • Automated xarray pipeline
            </p>
          </div>
        </section>

        {/* 3D Volumetric Field Preview & Quick Slice Controls */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  3D Volumetric Ocean Model State (Preview)
                </h3>
                <p className="text-xs text-gray-500">
                  Interactive WebGL/Three.js depth rendering for Arabian Sea & Bay of Bengal
                </p>
              </div>
              <a
                href="/explorer"
                className="text-xs font-medium text-teal-600 hover:text-teal-700 underline"
              >
                Open Full 3D Canvas &rarr;
              </a>
            </div>

            {/* Visual simulation preview card */}
            <div className="h-64 bg-gradient-to-br from-slate-900 via-sky-950 to-teal-950 rounded-lg relative overflow-hidden border border-teal-800/40 p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start z-10">
                <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-teal-200 border border-teal-500/30">
                  Variable: <span className="font-bold text-white">Temperature (°C) & Current Vectors</span>
                </div>
                <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-cyan-200 border border-cyan-500/30">
                  Depth Slice: <span className="font-bold text-white">0m to 2000m Water Column</span>
                </div>
              </div>

              {/* Decorative ocean grid graphic */}
              <div className="absolute inset-0 opacity-25 flex items-center justify-center pointer-events-none">
                <div className="w-full h-full bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px]"></div>
              </div>

              <div className="z-10 flex flex-col items-center justify-center my-auto text-center px-4">
                <span className="text-4xl mb-2">🌊</span>
                <p className="text-white font-semibold text-sm">
                  3D Volumetric Iso-surface & Velocity Vector Engine
                </p>
                <p className="text-xs text-teal-200/80 max-w-md mt-1">
                  Co-visualizes ROMS numerical model outputs alongside in-situ Argo float profiles with depth-slice sliders and customizable colorbars.
                </p>
              </div>

              <div className="flex items-center justify-between z-10 pt-2 border-t border-teal-800/50 text-[11px] text-teal-300">
                <span>Colorbar: Turbo (12°C - 31°C)</span>
                <span>Vertical Exaggeration: 15x</span>
                <span>Time Step: 2026-09-05 12:00 UTC</span>
              </div>
            </div>

            {/* Depth slice quick selectors */}
            <div className="mt-4 flex flex-wrap gap-2 items-center text-xs">
              <span className="text-gray-500 font-medium">Quick Depth Level:</span>
              {['Surface (0m)', '50m (Mixed Layer)', '150m (Thermocline)', '500m (Intermediate)', '1000m', '2000m (Abyssal)'].map((depth, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded cursor-pointer border transition-colors ${
                    idx === 2 ? 'bg-teal-50 text-teal-700 border-teal-300 font-semibold' : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {depth}
                </span>
              ))}
            </div>
          </div>

          {/* Operational Marine Hazard Advisories */}
          <aside className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-800 text-sm">Hazard & Early Warnings</h4>
                <a href="/alerts" className="text-xs text-teal-600 hover:underline">View All</a>
              </div>
              <ul className="space-y-3 text-xs">
                <li className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-red-700">Marine Heatwave Alert</span>
                    <span className="px-1.5 py-0.5 bg-red-200 text-red-800 rounded font-semibold text-[10px]">Cat-II</span>
                  </div>
                  <p className="text-gray-600 mt-1">SST Anomaly +2.4°C detected in Central Arabian Sea. Bleaching risk for coral reefs.</p>
                  <span className="text-[10px] text-gray-400 mt-1 block">Valid: Next 72 Hours</span>
                </li>

                <li className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-amber-800">High Swell Surge Warning</span>
                    <span className="px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded font-semibold text-[10px]">Moderate</span>
                  </div>
                  <p className="text-gray-600 mt-1">Waves 3.2m - 4.1m along Southern Coast. Fishermen advised against deep-sea fishing.</p>
                  <span className="text-[10px] text-gray-400 mt-1 block">Indian Ocean Swells</span>
                </li>

                <li className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-emerald-800">Potential Fishing Zone (PFZ)</span>
                    <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-900 rounded font-semibold text-[10px]">Favorable</span>
                  </div>
                  <p className="text-gray-600 mt-1">Chlorophyll-a frontal boundary active off Gujarat / Saurashtra coast.</p>
                  <span className="text-[10px] text-gray-400 mt-1 block">Daily Advisory</span>
                </li>
              </ul>
            </div>

            <a
              href="/alerts"
              className="mt-4 block text-center py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded border border-gray-200 transition-colors"
            >
              Manage Alert Subscriptions
            </a>
          </aside>
        </section>

        {/* Live In-Situ Telemetry Table Placeholder */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-800">
                Recent In-Situ Autonomous Instrument Feeds
              </h3>
              <p className="text-xs text-gray-500">
                Argo floats and underwater gliders co-displayed with numerical model grids
              </p>
            </div>
            <a
              href="/explorer"
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold"
            >
              Explore All Platforms on 3D Globe &rarr;
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">Platform ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Location (Lat/Lon)</th>
                  <th className="py-3 px-4">Max Depth</th>
                  <th className="py-3 px-4">Variables Measured</th>
                  <th className="py-3 px-4">Last Cycle</th>
                  <th className="py-3 px-4">Quality Flag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-teal-700">WMO 2902123</td>
                  <td className="py-3 px-4">Argo Apex BGC Float</td>
                  <td className="py-3 px-4">13.4° N, 85.2° E (Bay of Bengal)</td>
                  <td className="py-3 px-4">2,000 m</td>
                  <td className="py-3 px-4">Temp, Salinity, O₂, Chl-a</td>
                  <td className="py-3 px-4 text-gray-500">Today, 04:30 UTC</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium text-[10px]">QC Passed</span></td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-teal-700">INCOIS-GL04</td>
                  <td className="py-3 px-4">Autonomous Slocum Glider</td>
                  <td className="py-3 px-4">10.1° N, 71.8° E (Arabian Sea)</td>
                  <td className="py-3 px-4">1,000 m (Sawtooth)</td>
                  <td className="py-3 px-4">Temp, Salinity, Density, CDOM</td>
                  <td className="py-3 px-4 text-gray-500">Today, 06:15 UTC</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium text-[10px]">QC Passed</span></td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-teal-700">BD08-OMNI</td>
                  <td className="py-3 px-4">Moored Deep-Sea Buoy</td>
                  <td className="py-3 px-4">18.2° N, 89.7° E (Northern Bay)</td>
                  <td className="py-3 px-4">500 m Subsurface ADCP</td>
                  <td className="py-3 px-4">Current Vectors, Surface Met, SST</td>
                  <td className="py-3 px-4 text-gray-500">Hourly Telemetry</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium text-[10px]">QC Passed</span></td>
                </tr>
                <tr className="hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-teal-700">WMO 2903341</td>
                  <td className="py-3 px-4">Standard CTD Argo Float</td>
                  <td className="py-3 px-4">02.1° S, 78.4° E (Equatorial IO)</td>
                  <td className="py-3 px-4">2,000 m</td>
                  <td className="py-3 px-4">Temperature, Practical Salinity</td>
                  <td className="py-3 px-4 text-gray-500">Yesterday, 18:00 UTC</td>
                  <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-medium text-[10px]">QC Passed</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Problem Statement 26067 Key Capabilities Roadmap */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <span className="text-2xl">🧊</span>
            <h5 className="font-bold text-gray-800 text-sm mt-2">3D Volumetric Engine</h5>
            <p className="text-xs text-gray-600 mt-1">WebGL/Three.js depth slices, isosurfaces, and full water column velocity vector fields.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <span className="text-2xl">🎯</span>
            <h5 className="font-bold text-gray-800 text-sm mt-2">Co-Visualization</h5>
            <p className="text-xs text-gray-600 mt-1">Simultaneous display of in-situ profiles (Argo/Gliders) alongside numerical model outputs.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <span className="text-2xl">📦</span>
            <h5 className="font-bold text-gray-800 text-sm mt-2">Multi-Format Ingestion</h5>
            <p className="text-xs text-gray-600 mt-1">Automated parsers for CF-compliant NetCDF and delimited text via lightweight REST API backend.</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <span className="text-2xl">🎓</span>
            <h5 className="font-bold text-gray-800 text-sm mt-2">Science Outreach</h5>
            <p className="text-xs text-gray-600 mt-1">Intuitive 3D ocean dynamics visualization for students, researchers, and disaster managers.</p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

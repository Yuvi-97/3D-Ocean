import React from "react";
import Header from "../Header/Header";

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="pt-28 px-6 pb-12 max-w-7xl mx-auto">
        {/* Header Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-teal-100 text-teal-800 text-xs font-bold rounded uppercase">
              MoES &amp; INCOIS Mission
            </span>
            <span className="text-xs text-gray-500 font-medium">
              Operational Oceanography | 3D Visualization Platform
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            About the 3D Ocean Visualization Platform
          </h1>
          <p className="text-sm text-gray-600 max-w-3xl mt-1">
            Web-based interactive 3D visualization platform that integrates numerical ocean model outputs and autonomous in-situ observations for operational oceanography and public science outreach.
          </p>
        </div>

        {/* Organization Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="bg-gradient-to-br from-teal-900 to-slate-900 rounded-xl p-6 text-white shadow-sm border border-teal-800/40 flex flex-col justify-between">
            <div>
              <span className="px-2 py-0.5 bg-teal-500/30 text-teal-200 text-[10px] font-bold rounded uppercase">
                Government Organization
              </span>
              <h3 className="text-xl font-bold mt-2">
                Ministry of Earth Sciences (MoES)
              </h3>
              <p className="text-xs text-teal-100/80 mt-1">
                Government of India mandate to provide the nation with best possible services in forecasting the ocean state, hazards, climate, and monsoon.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-teal-800/60 text-xs text-teal-200/90 flex justify-between items-center">
              <span>Apex Scientific Body</span>
              <span>New Delhi, India</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-sky-950 to-slate-900 rounded-xl p-6 text-white shadow-sm border border-sky-800/40 flex flex-col justify-between">
            <div>
              <span className="px-2 py-0.5 bg-cyan-500/30 text-cyan-200 text-[10px] font-bold rounded uppercase">
                Nodal Operational Agency
              </span>
              <h3 className="text-xl font-bold mt-2">
                INCOIS (Ocean Valley)
              </h3>
              <p className="text-xs text-cyan-100/80 mt-1">
                Indian National Centre for Ocean Information Services — Providing ocean information and advisory services to society, industry, government, and scientific community through sustained ocean observations and numerical modeling.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-sky-800/60 text-xs text-cyan-200/90 flex justify-between items-center">
              <span>Pragathi Nagar, Hyderabad</span>
              <span>Ocean Information Services</span>
            </div>
          </div>
        </div>

        {/* Operational Challenge Background & Key Gaps */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-2">
            The Operational Challenge & Background
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            India's vast Exclusive Economic Zone (EEZ) and 7,516 km coastline demand continuous, high-resolution monitoring of ocean state variables. INCOIS routinely generates and archives large volumes of ocean model outputs — including three-dimensional fields of temperature, salinity, current vectors, chlorophyll, etc. — as well as real-time and delayed-mode observations from autonomous instruments such as Argo profiling floats and underwater Gliders.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mt-2">
            Despite the richness of this data, no integrated, web-based 3D visualization platform previously existed that could simultaneously render numerical model fields and in-situ instrument observations in a single interactive browser environment. Existing tools were either desktop-bound, supported only 2D plan views, or lacked the ability to co-visualize model outputs alongside instrument profiles.
          </p>

          <h3 className="text-sm font-bold text-gray-800 mt-5 mb-3 uppercase tracking-wider">
            Critical Operational Gaps Addressed:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-700">
            <div className="p-3 bg-red-50/60 rounded-lg border border-red-100">
              <span className="font-bold text-red-800">1. No Platform-Independent 3D Rendering:</span>
              <p className="mt-1 text-gray-600">Lack of web-based 3D rendering for depth-resolved volumetric ocean fields across the water column.</p>
            </div>
            <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100">
              <span className="font-bold text-amber-800">2. Absence of Unified Co-Display:</span>
              <p className="mt-1 text-gray-600">No simultaneous display of Argo float and Glider profiles (Lat, Lon, Depth, Temp, Salinity, Chl-a) alongside model grids.</p>
            </div>
            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100">
              <span className="font-bold text-blue-800">3. Inflexible Controls:</span>
              <p className="mt-1 text-gray-600">Absence of interactive controls for variable selection, depth-slice navigation (0-2000m), time-step animation, and customizable colorbars.</p>
            </div>
            <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100">
              <span className="font-bold text-purple-800">4. Rigid Data Ingestion:</span>
              <p className="mt-1 text-gray-600">Inability to easily ingest new observational data streams or additional model variables without extensive re-engineering.</p>
            </div>
          </div>
        </div>

        {/* Proposed Architecture & Core Functional Capabilities */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            System Architecture & Core Capabilities
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <span className="text-2xl">🧊</span>
                <h4 className="font-bold text-gray-800 text-sm mt-2">3D Volumetric Rendering</h4>
                <p className="text-gray-600 mt-1">
                  WebGL / Three.js browser-native engine rendering 3D ocean fields (temperature, salinity, current vectors) across the full water column, with depth-slice views, isosurface extraction, and time-step animation.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-teal-700 mt-3 pt-2 border-t border-gray-200">Zero Client Plugins Needed</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <span className="text-2xl">🎯</span>
                <h4 className="font-bold text-gray-800 text-sm mt-2">Instrument Data Overlay</h4>
                <p className="text-gray-600 mt-1">
                  Co-display of Argo float, Glider profile, CTD, and BGC data using geospatially accurate markers. Users can click a float/glider to inspect depth-vs-variable profile charts with timestamps.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-teal-700 mt-3 pt-2 border-t border-gray-200">Interactive Colocation</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col justify-between">
              <div>
                <span className="text-2xl">⚙️</span>
                <h4 className="font-bold text-gray-800 text-sm mt-2">Multi-Format Ingestion</h4>
                <p className="text-gray-600 mt-1">
                  Automated parsers for NetCDF (via PyNIO / xarray backend) and delimited text formats, adhering to OGC WMS/WCS standards and CF Conventions for NetCDF.
                </p>
              </div>
              <span className="text-[11px] font-semibold text-teal-700 mt-3 pt-2 border-t border-gray-200">Lightweight REST / OPeNDAP</span>
            </div>
          </div>
        </div>

        {/* Public Outreach & Science Communication Mandate */}
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="px-2 py-0.5 bg-teal-400/30 text-teal-200 text-[10px] font-bold rounded uppercase">
                Science Communication & Outreach
              </span>
              <h3 className="text-xl font-bold mt-1">
                Bridging Ocean Science with Society
              </h3>
              <p className="text-xs text-teal-100/90 mt-1 max-w-3xl">
                Beyond operational use by INCOIS forecasters, this platform transforms complex numerical model outputs into intuitive, interactive 3D experiences. It serves as an educational tool for school and college students, general public awareness during ocean exhibitions, and decision support for coastal disaster management authorities.
              </p>
            </div>
            <a
              href="/explorer"
              className="px-4 py-2.5 bg-teal-400 hover:bg-teal-300 text-slate-950 font-bold text-xs rounded-lg shadow whitespace-nowrap transition-colors"
            >
              Explore 3D Visualization &rarr;
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default About;

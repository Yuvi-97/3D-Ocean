import React, { useState, useCallback, useEffect, useMemo } from "react";
import Header from "../Header/Header";
import GlobeViewer from "./GlobeViewer";
import {
  CAMERA_PRESETS,
  CMEMS_DEPTH_LEVELS,
  CMEMS_TIME_STEPS,
  OCEAN_VARIABLES,
} from "../../constants/oceanData";
import {
  getModelSlice,
  getVectorCurrents,
  getArgoFloats,
  getGliders,
  getGliderTrack,
  getPointProfile,
  getArgoProfile,
} from "../../services/oceanApi";
import { sampleSliceValue } from "../../utils/colormaps";
import VolumetricCoreViewer from "./VolumetricCoreViewer";
import {
  FaPlay,
  FaPause,
  FaStepForward,
  FaStepBackward,
  FaEye,
  FaEyeSlash,
  FaCompass,
  FaLayerGroup,
  FaTimes,
  FaWater,
  FaThermometerHalf,
  FaWind,
  FaMapMarkerAlt,
  FaSpinner,
  FaChartLine,
} from "react-icons/fa";
import "./Explorer.css";

export default function Explorer() {
  // Navigation & Viewport State
  const [activePresetId, setActivePresetId] = useState(CAMERA_PRESETS[0].id);
  const [presetTrigger, setPresetTrigger] = useState({
    preset: CAMERA_PRESETS[0],
    timestamp: Date.now(),
  });
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [cursorCoords, setCursorCoords] = useState({ lat: 10.5, lon: 78.2, elevation: -2450 });
  const [clickedPoint, setClickedPoint] = useState({ lat: 13.41, lon: 85.23, elevation: -3120 });
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [probeMode, setProbeMode] = useState("cylinder"); // "point" | "cylinder" | "cuboid"
  const [selectionRadiusKm, setSelectionRadiusKm] = useState(100); // 50, 100, 200, 350

  // Ocean Simulation Parameters
  const [activeVarKey, setActiveVarKey] = useState("thetao");
  const [depthIndex, setDepthIndex] = useState(0); // Surface 0.49m
  const [timeIndex, setTimeIndex] = useState(22); // 23 Jun 2026 (Monsoon Peak)
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x

  // Live Backend Data States
  const [sliceData, setSliceData] = useState(null);
  const [vectorData, setVectorData] = useState(null);
  const [argoFloats, setArgoFloats] = useState([]);
  const [gliders, setGliders] = useState([]);
  const [gliderTrack, setGliderTrack] = useState([]);
  const [pointProfileData, setPointProfileData] = useState(null);
  const [selectedCtdData, setSelectedCtdData] = useState(null);
  const [isSliceLoading, setIsSliceLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  // Layer Visibility Toggles
  const [layers, setLayers] = useState({
    modelSlice: true,
    currentVectors: true,
    argoFleet: true,
    gliders: true,
    geographicLabels: true,
  });

  const activeVariable = useMemo(() => OCEAN_VARIABLES[activeVarKey], [activeVarKey]);
  const currentDepth = useMemo(() => CMEMS_DEPTH_LEVELS[depthIndex], [depthIndex]);
  const currentTime = useMemo(() => CMEMS_TIME_STEPS[timeIndex], [timeIndex]);

  // Live sampled value at current cursor / touch coordinates from active 2D slice
  const liveSampleValue = useMemo(() => {
    if (!sliceData || !cursorCoords) return null;
    return sampleSliceValue(sliceData, cursorCoords.lat, cursorCoords.lon);
  }, [sliceData, cursorCoords]);

  // Thermocline core depth dynamically calculated from physical vertical gradient
  const thermoclineInfo = useMemo(() => {
    if (!pointProfileData?.profile || pointProfileData.profile.length < 2) {
      return { depth: 155.9, gradient: 0.12 };
    }
    let maxGrad = -1;
    let bestDepth = 155.9;
    for (let i = 0; i < pointProfileData.profile.length - 1; i++) {
      const p1 = pointProfileData.profile[i];
      const p2 = pointProfileData.profile[i + 1];
      if (p1.thetao != null && p2.thetao != null && p2.depth_m > p1.depth_m) {
        const grad = Math.abs(p1.thetao - p2.thetao) / (p2.depth_m - p1.depth_m);
        if (grad > maxGrad) {
          maxGrad = grad;
          bestDepth = p2.depth_m;
        }
      }
    }
    return { depth: bestDepth, gradient: maxGrad };
  }, [pointProfileData]);

  // Extracted levels for the current point profile
  const surfaceLevel = pointProfileData?.profile?.[0];
  const selectedLevel = pointProfileData?.profile?.[depthIndex] || surfaceLevel;

  // Handle Preset Basin Navigation
  const handlePresetClick = (preset) => {
    setActivePresetId(preset.id);
    setPresetTrigger({
      preset,
      timestamp: Date.now(),
    });
  };

  // 1. Initial Load: Fetch Argo Floats and Glider Fleet Inventory
  useEffect(() => {
    let isMounted = true;

    async function loadInSituFleet() {
      try {
        const [floatsResp, glidersResp] = await Promise.allSettled([
          getArgoFloats(true),
          getGliders(),
        ]);

        if (isMounted) {
          if (floatsResp.status === "fulfilled" && floatsResp.value?.floats) {
            setArgoFloats(floatsResp.value.floats);
          }
          if (glidersResp.status === "fulfilled" && glidersResp.value?.gliders) {
            setGliders(glidersResp.value.gliders);
            // Pre-fetch track for the primary glider
            try {
              const primaryId = glidersResp.value.gliders[0]?.glider_id || "8901048";
              const trackResp = await getGliderTrack(primaryId, 3);
              if (isMounted && trackResp?.track) {
                setGliderTrack(trackResp.track);
              }
            } catch (e) {
              console.warn("Glider track fetch notice:", e.message);
            }
          }
        }
      } catch (err) {
        console.warn("Initial in-situ load notice:", err);
      }
    }

    loadInSituFleet();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch 2D Model Slice (Debounced to maintain 60 FPS when dragging sliders)
  useEffect(() => {
    let isCurrent = true;
    if (!layers.modelSlice) return;

    const timer = setTimeout(async () => {
      setIsSliceLoading(true);
      try {
        const data = await getModelSlice(activeVarKey, timeIndex, depthIndex, 4);
        if (isCurrent && data) {
          setSliceData(data);
        }
      } catch (err) {
        console.warn("Model slice fetch notice:", err.message);
      } finally {
        if (isCurrent) setIsSliceLoading(false);
      }
    }, 120);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [activeVarKey, timeIndex, depthIndex, layers.modelSlice]);

  // 3. Fetch Ocean Current Vectors when enabled
  useEffect(() => {
    let isCurrent = true;
    if (!layers.currentVectors) {
      setVectorData(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const data = await getVectorCurrents(timeIndex, depthIndex, 10);
        if (isCurrent && data?.vectors) {
          setVectorData(data.vectors);
        }
      } catch (err) {
        console.warn("Vector currents fetch notice:", err.message);
      }
    }, 180);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [timeIndex, depthIndex, layers.currentVectors]);

  // 4. Click Handler on Globe: Probe 3D Water Column Sounding
  const handleGlobeClick = useCallback(
    async (point) => {
      setClickedPoint(point);
      setSelectedPlatform(null);
      setSelectedCtdData(null);
      setIsInspectorOpen(true);
      setIsProfileLoading(true);

      try {
        const profile = await getPointProfile(point.lat, point.lon, timeIndex);
        setPointProfileData(profile);
      } catch (err) {
        console.warn("Point profile error:", err.message);
      } finally {
        setIsProfileLoading(false);
      }
    },
    [timeIndex]
  );

  // Helper: Quick jump and probe preset regions
  const handleQuickRegionPick = useCallback(
    (lat, lon, presetId = "bay_bengal") => {
      handleGlobeClick({ lat, lon, elevation: 0 });
      const targetPreset = CAMERA_PRESETS.find((p) => p.id === presetId);
      if (targetPreset) {
        handlePresetClick(targetPreset);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleGlobeClick]
  );

  // 5. Select In-Situ Platform (Argo Float or Glider)
  const handlePlatformSelect = useCallback(
    async (item) => {
      setSelectedPlatform(item);
      setIsInspectorOpen(true);
      setIsProfileLoading(true);

      if (item.type === "argo") {
        const floatData = item.data;
        setClickedPoint({
          lat: floatData.latest_position?.lat || 0,
          lon: floatData.latest_position?.lon || 0,
          elevation: 0,
        });

        try {
          const profileId = `R${floatData.wmo_id}_001`;
          const profileData = await getArgoProfile(profileId);
          setSelectedCtdData(profileData);
        } catch (e) {
          setSelectedCtdData(null);
        } finally {
          setIsProfileLoading(false);
        }
      } else if (item.type === "glider") {
        const gliderData = item.data;
        setClickedPoint({
          lat: Number(((gliderData.bbox.min_lat + gliderData.bbox.max_lat) / 2).toFixed(3)),
          lon: Number(((gliderData.bbox.min_lon + gliderData.bbox.max_lon) / 2).toFixed(3)),
          elevation: 0,
        });
        setIsProfileLoading(false);
      }
    },
    []
  );

  // Live mouse movement telemetry
  const handleCursorMove = useCallback((coords) => {
    setCursorCoords(coords);
  }, []);

  // Time Playback loop
  useEffect(() => {
    if (!isPlaying) return;
    const intervalMs = 1500 / playbackSpeed;
    const timer = setInterval(() => {
      setTimeIndex((prev) => (prev >= CMEMS_TIME_STEPS.length - 1 ? 0 : prev + 1));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed]);

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <div className="explorer-page">
      {/* ── Top Application Header (Preserved 100% consistent with all pages) ── */}
      <Header />

      {/* ── Page Header Bar (Consistent with Dashboard & Observations) ── */}
      <header className="explorer-header-bar">
        <div className="explorer-title-area">
          <h1 className="explorer-title">3D Ocean Explorer</h1>
          <p className="explorer-subtitle">
            Interactive volumetric state for CMEMS 1/12° numerical ocean models & autonomous in-situ fleet
          </p>
        </div>

        {/* Basin Views Preset Chips */}
        <div className="presets-group">
          <span className="presets-label flex items-center gap-1">
            <FaCompass className="text-teal-600 text-xs inline" />
            Basin:
          </span>
          {CAMERA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`preset-btn ${activePresetId === preset.id ? "preset-btn-active" : ""}`}
              onClick={() => handlePresetClick(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* 3D Core / Volumetric Shape Selector & Size */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm text-xs">
            <button
              type="button"
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                probeMode === "cylinder"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => {
                setProbeMode("cylinder");
                setIsInspectorOpen(true);
              }}
              title="3D Cylindrical Ocean Core"
            >
              ⭕ 3D Cylinder
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                probeMode === "cuboid"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => {
                setProbeMode("cuboid");
                setIsInspectorOpen(true);
              }}
              title="3D Cuboid Volumetric Box"
            >
              📦 3D Cuboid
            </button>
            <button
              type="button"
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                probeMode === "point"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
              onClick={() => setProbeMode("point")}
              title="Single-Point Sounding Station"
            >
              📍 Point
            </button>
          </div>

          {probeMode !== "point" && (
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-500 font-semibold text-[11px]">Radius:</span>
              {[50, 100, 200, 350].map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`px-2 py-0.5 rounded border text-[11px] font-semibold transition-all ${
                    selectionRadiusKm === r
                      ? "bg-teal-50 border-teal-600 text-teal-800"
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectionRadiusKm(r)}
                >
                  {r}km
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Status / Telemetry & Cinema Mode Toggle */}
        <div className="flex items-center gap-3">
          <div className="telemetry-chip hidden lg:inline-flex">
            <span>
              {cursorCoords.lat >= 0 ? `${cursorCoords.lat.toFixed(2)}°N` : `${Math.abs(cursorCoords.lat).toFixed(2)}°S`},{" "}
              {cursorCoords.lon >= 0 ? `${cursorCoords.lon.toFixed(2)}°E` : `${Math.abs(cursorCoords.lon).toFixed(2)}°W`}
            </span>
            <span className="text-gray-300">|</span>
            <span className="text-teal-700 font-semibold">
              {activeVariable.name}: {liveSampleValue !== null ? `${liveSampleValue.toFixed(2)} ${activeVariable.unit}` : "Ocean"}
            </span>
          </div>

          <button
            type="button"
            className="preset-btn flex items-center gap-1.5"
            onClick={() => setIsUiHidden(!isUiHidden)}
            title={isUiHidden ? "Show Workstation Panels" : "Expand 3D View"}
          >
            {isUiHidden ? <FaEye className="text-teal-600" /> : <FaEyeSlash className="text-gray-500" />}
            <span>{isUiHidden ? "Show Panels" : "Expand View"}</span>
          </button>
        </div>
      </header>

      {/* ── 3-Column GIS Workstation ── */}
      <main className="explorer-workspace">
        {/* ── Left Sidebar (Control Deck) ── */}
        {!isUiHidden && (
          <aside className="explorer-sidebar">
            {/* Section 1: Variable Selector */}
            <div>
              <div className="control-section-header">
                <span className="control-section-title">1. Ocean Variable</span>
                {isSliceLoading && (
                  <span className="flex items-center gap-1 text-[10px] text-teal-600 font-mono font-medium">
                    <FaSpinner className="animate-spin text-xs" /> Syncing
                  </span>
                )}
              </div>
              <div className="variables-grid">
                {Object.entries(OCEAN_VARIABLES).map(([key, item]) => {
                  const Icon =
                    key === "thetao"
                      ? FaThermometerHalf
                      : key === "so"
                      ? FaWater
                      : key === "speed"
                      ? FaWind
                      : FaWater;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`var-button ${activeVarKey === key ? "var-button-active" : ""}`}
                      onClick={() => setActiveVarKey(key)}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={activeVarKey === key ? "text-teal-600" : "text-gray-400"} />
                        <span className="var-name">{item.name}</span>
                      </div>
                      <span className="var-unit">{item.unit}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Vertical Depth Slicer */}
            <div className="depth-control-card">
              <div className="control-section-header">
                <span className="control-section-title">2. Vertical Depth Slicer</span>
                <span className="text-[10px] font-mono text-gray-500">
                  Level {depthIndex + 1} / {CMEMS_DEPTH_LEVELS.length}
                </span>
              </div>

              {/* Quick Depth Shortcuts */}
              <div className="depth-shortcuts">
                {[
                  { label: "Surface (0.5m)", idx: 0 },
                  { label: "Mixed Layer (34m)", idx: 8 },
                  { label: "Thermocline (156m)", idx: 15 },
                  { label: "Deep (1062m)", idx: 24 },
                ].map((chip) => (
                  <button
                    key={chip.idx}
                    type="button"
                    className={`depth-chip ${depthIndex === chip.idx ? "depth-chip-active" : ""}`}
                    onClick={() => setDepthIndex(chip.idx)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Depth Slider */}
              <div className="depth-slider-track">
                <input
                  type="range"
                  min={0}
                  max={CMEMS_DEPTH_LEVELS.length - 1}
                  step={1}
                  value={depthIndex}
                  onChange={(e) => setDepthIndex(Number(e.target.value))}
                  className="depth-slider"
                />
              </div>

              <div className="depth-value-banner">
                <span>Selected Depth:</span>
                <strong className="text-teal-700 font-mono text-xs">
                  {currentDepth.depth_m.toFixed(2)} m ({currentDepth.name})
                </strong>
              </div>
            </div>

            {/* Section 3: Observation Layers */}
            <div>
              <div className="control-section-header">
                <span className="control-section-title">3. Layers & Fleet</span>
                <FaLayerGroup className="text-gray-400 text-xs" />
              </div>
              <div className="layers-list">
                <label className="layer-toggle-row">
                  <span className="font-medium text-gray-700">2D Model Grid Heatmap</span>
                  <input
                    type="checkbox"
                    checked={layers.modelSlice}
                    onChange={() => toggleLayer("modelSlice")}
                  />
                </label>

                <label className="layer-toggle-row">
                  <span className="font-medium text-gray-700">Current Velocity Vectors</span>
                  <input
                    type="checkbox"
                    checked={layers.currentVectors}
                    onChange={() => toggleLayer("currentVectors")}
                  />
                </label>

                <label className="layer-toggle-row">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-700">Argo Profiling Floats</span>
                    <span className="px-1.5 py-0.2 bg-teal-50 text-teal-700 text-[10px] rounded font-mono">
                      {argoFloats.length || "123"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layers.argoFleet}
                    onChange={() => toggleLayer("argoFleet")}
                  />
                </label>

                <label className="layer-toggle-row">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-700">Underwater Gliders</span>
                    <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 text-[10px] rounded font-mono">
                      {gliders.length || "2"}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={layers.gliders}
                    onChange={() => toggleLayer("gliders")}
                  />
                </label>

                <label className="layer-toggle-row">
                  <span className="font-medium text-gray-700">Geographic Ocean Labels</span>
                  <input
                    type="checkbox"
                    checked={layers.geographicLabels}
                    onChange={() => toggleLayer("geographicLabels")}
                  />
                </label>
              </div>
            </div>
          </aside>
        )}

        {/* ── Center Viewport Card (3D Cesium Ocean Canvas) ── */}
        <section className="explorer-viewport-card">
          <GlobeViewer
            onGlobeClick={handleGlobeClick}
            onCursorMove={handleCursorMove}
            onPlatformSelect={handlePlatformSelect}
            depthMeters={currentDepth.depth_m}
            isUnderwater={currentDepth.depth_m > 150}
            showLabels={layers.geographicLabels}
            presetTrigger={presetTrigger}
            sliceData={sliceData}
            sliceVariable={activeVarKey}
            showModelSlice={layers.modelSlice}
            vectorData={vectorData}
            showCurrentVectors={layers.currentVectors}
            argoFloats={argoFloats}
            showArgoFleet={layers.argoFleet}
            gliders={gliders}
            gliderTrack={gliderTrack}
            showGliders={layers.gliders}
            clickedPoint={clickedPoint}
            probeMode={probeMode}
            selectionRadiusKm={selectionRadiusKm}
          />

          {/* Floating On-Globe Region Extraction Toolcard */}
          <div className="absolute top-3 left-3 z-20 pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg border border-gray-200 p-2.5 flex flex-col gap-2 max-w-[300px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-800">
                    3D Extraction Tool
                  </span>
                </div>
                <span className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded font-mono font-bold">
                  {probeMode === "cylinder" ? "⭕ Cylinder" : probeMode === "cuboid" ? "📦 Cuboid" : "📍 Point"}
                </span>
              </div>

              {/* Tool Mode Switcher Buttons */}
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  className={`py-1.5 px-2 rounded-md text-xs font-bold text-center transition-all ${
                    probeMode === "cylinder"
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-gray-700 hover:text-gray-900 hover:bg-white/80"
                  }`}
                  onClick={() => {
                    setProbeMode("cylinder");
                    setIsInspectorOpen(true);
                  }}
                  title="3D Cylindrical Water Column Core"
                >
                  ⭕ Cylinder
                </button>
                <button
                  type="button"
                  className={`py-1.5 px-2 rounded-md text-xs font-bold text-center transition-all ${
                    probeMode === "cuboid"
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-gray-700 hover:text-gray-900 hover:bg-white/80"
                  }`}
                  onClick={() => {
                    setProbeMode("cuboid");
                    setIsInspectorOpen(true);
                  }}
                  title="3D Cuboid Volumetric Box"
                >
                  📦 Cuboid
                </button>
                <button
                  type="button"
                  className={`py-1.5 px-2 rounded-md text-xs font-bold text-center transition-all ${
                    probeMode === "point"
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-gray-700 hover:text-gray-900 hover:bg-white/80"
                  }`}
                  onClick={() => setProbeMode("point")}
                  title="Single Point Station"
                >
                  📍 Point
                </button>
              </div>

              {/* Radius Selector */}
              {probeMode !== "point" && (
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-gray-100">
                  <span className="text-[11px] text-gray-500 font-semibold">Core Radius:</span>
                  <div className="flex gap-1">
                    {[50, 100, 200, 350].map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all ${
                          selectionRadiusKm === r
                            ? "bg-teal-600 text-white shadow-xs"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                        onClick={() => setSelectionRadiusKm(r)}
                      >
                        {r}km
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Sample Presets */}
              <div className="flex items-center gap-1 text-[10px] text-gray-500 pt-0.5">
                <span>Presets:</span>
                <button
                  type="button"
                  onClick={() => handleQuickRegionPick(13.4, 85.2, "bay_bengal")}
                  className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors"
                >
                  Bay of Bengal
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickRegionPick(10.0, 71.5, "arabian_sea")}
                  className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-teal-50 hover:text-teal-700 font-medium transition-colors"
                >
                  Arabian Sea
                </button>
              </div>

              {/* Instructional Hint */}
              <div className="text-[10px] text-teal-800 bg-teal-50/90 px-2 py-1 rounded border border-teal-100 leading-tight">
                💡 <strong>Click ocean globe</strong> to extract 3D {probeMode} core
              </div>
            </div>
          </div>

          {/* Floating Hover Telemetry Pill */}
          <div className="viewport-telemetry-pill">
            <span className="pulse-teal-dot" />
            <span className="font-mono text-gray-900 font-bold">
              {cursorCoords.lat >= 0 ? `${cursorCoords.lat.toFixed(2)}°N` : `${Math.abs(cursorCoords.lat).toFixed(2)}°S`},{" "}
              {cursorCoords.lon >= 0 ? `${cursorCoords.lon.toFixed(2)}°E` : `${Math.abs(cursorCoords.lon).toFixed(2)}°W`}
            </span>
            <span className="text-gray-300">|</span>
            <span>
              Depth: <strong className="text-teal-700">{currentDepth.depth_m}m</strong>
            </span>
            <span className="text-gray-300">|</span>
            <span>
              {activeVariable.name}:{" "}
              <strong className="text-teal-700 font-mono font-bold">
                {liveSampleValue !== null ? `${liveSampleValue.toFixed(2)} ${activeVariable.unit}` : "Open Water"}
              </strong>
            </span>
            <span className="text-[10px] text-gray-400 hidden sm:inline">
              (Touch / click ocean to inspect profile)
            </span>
          </div>

          {/* Floating 4D Time Player */}
          <div className="viewport-time-player">
            <button
              type="button"
              className="time-step-btn"
              onClick={() => setTimeIndex((t) => Math.max(0, t - 1))}
              title="Previous Day"
            >
              <FaStepBackward className="text-xs" />
            </button>

            <button
              type="button"
              className="time-play-btn"
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? "Pause 4D Simulation" : "Play 4D Time Evolution"}
            >
              {isPlaying ? <FaPause className="text-xs" /> : <FaPlay className="text-xs ml-0.5" />}
            </button>

            <button
              type="button"
              className="time-step-btn"
              onClick={() => setTimeIndex((t) => Math.min(CMEMS_TIME_STEPS.length - 1, t + 1))}
              title="Next Day"
            >
              <FaStepForward className="text-xs" />
            </button>

            {/* Scrubber Timeline */}
            <div className="time-scrubber-box">
              <div className="time-labels">
                <span>01 Jun 2026</span>
                <span className="font-semibold text-teal-800">Monsoon Onset (Daily)</span>
                <span>23 Jun 2026</span>
              </div>
              <input
                type="range"
                min={0}
                max={CMEMS_TIME_STEPS.length - 1}
                step={1}
                value={timeIndex}
                onChange={(e) => setTimeIndex(Number(e.target.value))}
                className="time-slider"
              />
            </div>

            <div className="date-tag">
              {currentTime.label}
            </div>

            <div className="speed-chips">
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  className={`speed-chip-btn ${playbackSpeed === speed ? "speed-chip-btn-active" : ""}`}
                  onClick={() => setPlaybackSpeed(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Floating Colorbar Widget */}
          <div className="viewport-colorbar">
            <div className="flex justify-between items-center text-[10px] font-semibold text-gray-700">
              <span>{activeVariable.name}</span>
              <span className="text-teal-600">{activeVariable.unit}</span>
            </div>
            <div className={`colorbar-track-bar bg-gradient-to-r ${activeVariable.gradient}`} />
            <div className="flex justify-between text-[10px] font-mono text-gray-500">
              <span>{activeVariable.min}</span>
              <span className="text-[9px] uppercase">{activeVariable.palette}</span>
              <span>{activeVariable.max}</span>
            </div>
          </div>
        </section>

        {/* ── Right Inspector Panel (Contextual Sounding / Float Dossier) ── */}
        {isInspectorOpen && (
          <aside className="explorer-inspector">
            <div className="inspector-top">
              <div className="flex items-center gap-2">
                <FaMapMarkerAlt className="text-teal-600 text-sm" />
                <div>
                  <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    {selectedPlatform
                      ? `${selectedPlatform.type.toUpperCase()}: ${
                          selectedPlatform.data.wmo_id || selectedPlatform.data.glider_id
                        }`
                      : "Water Column Sounding"}
                  </h2>
                  <span className="text-[11px] text-teal-700 font-mono font-medium">
                    {clickedPoint?.lat}°N, {clickedPoint?.lon}°E
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="inspector-close-btn"
                onClick={() => setIsInspectorOpen(false)}
                title="Close Inspector"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>

            {isProfileLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-xs">
                <FaSpinner className="animate-spin text-xl mb-2 text-teal-600" />
                <span>Extracting NetCDF Profile...</span>
              </div>
            ) : selectedPlatform?.type === "argo" ? (
              /* Argo Float Dossier */
              <div className="flex flex-col gap-3">
                <div className="sounding-metrics-grid">
                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Float WMO ID</div>
                    <div className="sounding-stat-value text-teal-700">{selectedPlatform.data.wmo_id}</div>
                  </div>
                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Total Cycles</div>
                    <div className="sounding-stat-value">{selectedPlatform.data.total_profiles}</div>
                  </div>
                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Profiler Type</div>
                    <div className="text-xs font-bold text-gray-800 mt-1">
                      Apex ({selectedPlatform.data.profiler_type})
                    </div>
                  </div>
                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Data Mode</div>
                    <div className="text-xs font-bold text-emerald-600 mt-1">
                      {selectedPlatform.data.data_modes?.join("/") || "Delayed"}
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Latest Surface Fix</div>
                  <div className="text-xs text-gray-800 font-mono">
                    {selectedPlatform.data.latest_position?.timestamp || "2026-08-14 14:00:57"}
                  </div>
                </div>

                {selectedCtdData?.levels && (
                  <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Surface Temp:</span>
                      <strong className="text-teal-700 font-mono">
                        {selectedCtdData.levels[0]?.temperature_c?.toFixed(2) || "28.4"} °C
                      </strong>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Surface Salinity:</span>
                      <strong className="text-blue-700 font-mono">
                        {selectedCtdData.levels[0]?.salinity_psu?.toFixed(2) || "34.8"} PSU
                      </strong>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  className="action-primary-btn mt-2"
                  onClick={() => {
                    window.location.href = `/comparison?wmo=${selectedPlatform.data.wmo_id}&lat=${clickedPoint.lat}&lon=${clickedPoint.lon}`;
                  }}
                >
                  Colocate with Numerical Model
                </button>
              </div>
            ) : selectedPlatform?.type === "glider" ? (
              /* Glider Dossier */
              <div className="flex flex-col gap-3">
                <div className="sounding-metrics-grid">
                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Glider ID</div>
                    <div className="sounding-stat-value text-amber-700">{selectedPlatform.data.glider_id}</div>
                  </div>
                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Total Dives</div>
                    <div className="sounding-stat-value">{selectedPlatform.data.total_dives}</div>
                  </div>
                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Max Pressure</div>
                    <div className="sounding-stat-value">
                      {selectedPlatform.data.max_recorded_pressure_dbar} <small>dbar</small>
                    </div>
                  </div>
                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Sensors</div>
                    <div className="text-xs font-bold text-teal-700 mt-1">CTD + DOXY</div>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="text-[10px] text-gray-500 uppercase font-semibold mb-1">Mission Deployment</div>
                  <div className="text-xs text-gray-800 font-mono">
                    {selectedPlatform.data.mission_name} ({selectedPlatform.data.date_range?.start?.slice(0, 10)})
                  </div>
                </div>

                <button
                  type="button"
                  className="action-primary-btn mt-2 bg-amber-600 hover:bg-amber-700"
                  onClick={() => {
                    window.location.href = `/observations?glider=${selectedPlatform.data.glider_id}`;
                  }}
                >
                  Inspect Sawtooth Mission Data
                </button>
              </div>
            ) : (
              /* Water Column Sounding & 3D Volumetric Core */
              <div className="flex flex-col gap-3">
                {/* Mode Switcher & Radius inside Inspector */}
                <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
                      Extraction Geometry
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          probeMode === "cylinder"
                            ? "bg-teal-600 text-white shadow-xs"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                        onClick={() => setProbeMode("cylinder")}
                      >
                        ⭕ Cylinder
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          probeMode === "cuboid"
                            ? "bg-teal-600 text-white shadow-xs"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                        onClick={() => setProbeMode("cuboid")}
                      >
                        📦 Cuboid
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          probeMode === "point"
                            ? "bg-teal-600 text-white shadow-xs"
                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                        }`}
                        onClick={() => setProbeMode("point")}
                      >
                        📍 Point
                      </button>
                    </div>
                  </div>

                  {probeMode !== "point" && (
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-xs">
                      <span className="text-[11px] text-gray-600 font-medium">Core Radius:</span>
                      <div className="flex gap-1">
                        {[50, 100, 200, 350].map((r) => (
                          <button
                            key={r}
                            type="button"
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                              selectionRadiusKm === r
                                ? "bg-teal-600 text-white"
                                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                            }`}
                            onClick={() => setSelectionRadiusKm(r)}
                          >
                            {r}km
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Interactive 3D WebGL Volumetric Core Visualizer */}
                {probeMode !== "point" && (
                  <VolumetricCoreViewer
                    shape={probeMode}
                    sliceData={sliceData}
                    centerLat={clickedPoint.lat}
                    centerLon={clickedPoint.lon}
                    radiusKm={selectionRadiusKm}
                    variable={activeVarKey}
                    depthIndex={depthIndex}
                    depthMeters={currentDepth.depth_m}
                    thermoclineDepth={thermoclineInfo.depth}
                    pointProfileData={pointProfileData}
                  />
                )}

                <div className="sounding-metrics-grid">
                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Surface Temp</div>
                    <div className="sounding-stat-value text-teal-700">
                      {surfaceLevel?.thetao != null
                        ? surfaceLevel.thetao.toFixed(2)
                        : liveSampleValue != null
                        ? liveSampleValue.toFixed(2)
                        : "29.40"}{" "}
                      <small>°C</small>
                    </div>
                  </div>

                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Slice Temp ({currentDepth.depth_m}m)</div>
                    <div className="sounding-stat-value text-gray-900">
                      {selectedLevel?.thetao != null ? selectedLevel.thetao.toFixed(2) : "--"}{" "}
                      <small>°C</small>
                    </div>
                  </div>

                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Salinity ({currentDepth.depth_m}m)</div>
                    <div className="sounding-stat-value text-blue-700">
                      {selectedLevel?.so != null
                        ? selectedLevel.so.toFixed(2)
                        : surfaceLevel?.so != null
                        ? surfaceLevel.so.toFixed(2)
                        : "34.80"}{" "}
                      <small>PSU</small>
                    </div>
                  </div>

                  <div className="sounding-stat-card">
                    <div className="sounding-stat-label">Current Velocity</div>
                    <div className="sounding-stat-value text-emerald-700">
                      {selectedLevel?.speed != null
                        ? selectedLevel.speed.toFixed(3)
                        : surfaceLevel?.speed != null
                        ? surfaceLevel.speed.toFixed(3)
                        : "0.320"}{" "}
                      <small>m/s</small>
                    </div>
                  </div>
                </div>

                {/* Thermocline Core Depth Banner */}
                <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex justify-between items-center text-xs text-gray-600 mb-1.5">
                    <span className="flex items-center gap-1 font-medium">
                      <FaChartLine className="text-teal-600" />
                      Thermocline Core Depth
                    </span>
                    <strong className="text-teal-800 font-mono">
                      {thermoclineInfo.depth.toFixed(1)} m
                    </strong>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className="h-full bg-teal-600"
                      style={{
                        width: `${Math.min(100, Math.max(10, (thermoclineInfo.depth / 300) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* 36-Level Profile Table */}
                {pointProfileData?.profile && pointProfileData.profile.length > 0 && (
                  <div className="sounding-table-box">
                    <table className="profile-table">
                      <thead>
                        <tr>
                          <th>Depth</th>
                          <th>Temp</th>
                          <th>Salinity</th>
                          <th>Speed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pointProfileData.profile.map((lvl, idx) => (
                          <tr
                            key={lvl.depth_m}
                            className={idx === depthIndex ? "row-active" : ""}
                            onClick={() => setDepthIndex(idx)}
                            title={`Click to set depth to ${lvl.depth_m}m`}
                          >
                            <td>{lvl.depth_m.toFixed(1)}m</td>
                            <td>{lvl.thetao != null ? `${lvl.thetao.toFixed(2)}°C` : "--"}</td>
                            <td>{lvl.so != null ? `${lvl.so.toFixed(2)}` : "--"}</td>
                            <td>{lvl.speed != null ? `${lvl.speed.toFixed(2)}` : "--"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="text-[11px] text-gray-500 leading-normal">
                  {probeMode !== "point"
                    ? "Drag the 3D core to rotate. Moving the depth slider slices through the water column with real-time temperature and salinity cross-sections."
                    : "Sampled across 36 discrete vertical depth levels using memory-mapped CMEMS Global 1/12° physics reanalysis."}
                </p>

                <button
                  type="button"
                  className="action-primary-btn"
                  onClick={() => {
                    window.location.href = `/comparison?lat=${clickedPoint.lat}&lon=${clickedPoint.lon}`;
                  }}
                >
                  Compare with Nearby Argo Floats
                </button>
              </div>
            )}
          </aside>
        )}
      </main>
    </div>
  );
}

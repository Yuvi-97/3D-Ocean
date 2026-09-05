import React, { useState, useCallback, useEffect } from "react";
import Header from "../Header/Header";
import GlobeViewer from "./GlobeViewer";
import "./Explorer.css";

export default function Explorer() {
  const [clickedPoint, setClickedPoint] = useState({ lat: "13.4100", lon: "85.2300" });
  const [activeLayer, setActiveLayer] = useState("temperature");
  const [depth, setDepth] = useState(1000);
  const [time, setTime] = useState(23);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleGlobeClick = useCallback((point) => {
    setClickedPoint(point);
  }, []);

  // Time playback animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTime((prev) => (prev >= 30 ? 17 : prev + 1));
    }, 1500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  return (
    <div className="ocean-dashboard-container">
      {/* Top Application Header */}
      <Header />

      {/* 3D Ocean Dashboard matching Frontend 1 */}
      <div className="ocean-dashboard">
        {/* ── Globe: full background ── */}
        <div className="globe-bg">
          <GlobeViewer
            onGlobeClick={handleGlobeClick}
            depthMeters={depth}
            isUnderwater={depth > 200}
          />
        </div>

        {/* ── Left panel ── */}
        <aside className="panel panel-left">
          <div className="panel-header">
            <span className="panel-title">Ocean Variables</span>
            <span className="live-badge">LIVE DEMO</span>
          </div>

          {/* Variable buttons */}
          <div className="variable-pills">
            {[
              "Temperature",
              "Salinity",
              "Current Velocity",
              "Sea Surface Height",
              "Chlorophyll",
            ].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setActiveLayer(v.toLowerCase())}
                className={
                  activeLayer === v.toLowerCase() ? "pill pill-active" : "pill"
                }
              >
                {v}
              </button>
            ))}
          </div>

          {/* Depth slider */}
          <div className="slider-group">
            <label className="slider-label" htmlFor="depth">
              Depth <strong>{depth} m</strong>
            </label>
            <input
              id="depth"
              type="range"
              min="0"
              max="6000"
              step="100"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
            />
            <div className="slider-ticks">
              <span>Surface</span>
              <span>6000m</span>
            </div>
          </div>

          {/* Time slider */}
          <div className="slider-group">
            <label className="slider-label" htmlFor="time">
              Time <strong>{time} Jun 2026</strong>
            </label>
            <input
              id="time"
              type="range"
              min="17"
              max="30"
              value={time}
              onChange={(e) => setTime(Number(e.target.value))}
            />
            <div className="slider-ticks">
              <span>17 Jun 2026</span>
              <span>30 Jun 2026</span>
            </div>
          </div>

          {/* Playback */}
          <div className="playback-row">
            <button
              type="button"
              className="pill"
              onClick={() => setTime((t) => Math.max(17, t - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className={`pill ${isPlaying ? "pill-active" : ""}`}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              className="pill"
              onClick={() => setTime((t) => Math.min(30, t + 1))}
            >
              Next
            </button>
          </div>

          {/* Layer checkboxes */}
          <div className="layer-checks">
            {["Model Data", "Argo", "Gliders", "Current Vectors"].map((l, i) => (
              <label key={l} className="check-label">
                <input
                  type="checkbox"
                  defaultChecked={i < 2}
                  className="check-input"
                />
                {l}
              </label>
            ))}
          </div>
        </aside>

        {/* ── Right column — two stacked panels ── */}
        <div className="right-col">
          {/* Conditions panel */}
          <aside className="panel">
            <div className="panel-header">
              <span className="panel-title">Ocean Conditions</span>
              <span className="status-dot" />
            </div>
            {[
              ["Temperature", "28.4", "°C"],
              ["Salinity", "34.8", "PSU"],
              ["Current Speed", "0.72", "m/s"],
              ["Sea Level Height", "+0.18", "m"],
            ].map(([label, value, unit]) => (
              <div key={label} className="condition-row">
                <span className="condition-label">{label}</span>
                <strong className="condition-value">
                  {value} <small>{unit}</small>
                </strong>
              </div>
            ))}
            <div className="legend-block">
              <div className="legend-title">Temperature</div>
              <div className="legend-bar" />
              <div className="legend-ticks">
                <span>5°C</span>
                <span>32°C</span>
              </div>
            </div>
          </aside>

          {/* Argo profile panel */}
          <aside className="panel">
            <div className="panel-header">
              <span className="panel-title">Selected Argo Profile</span>
            </div>
            <div className="argo-chart">
              <span className="chart-line" />
              <span className="chart-label-y">Temperature (°C)</span>
              <span className="chart-depth-axis">
                0<br />
                <br />
                20<br />
                <br />
                60<br />
                <br />
                100m
              </span>
            </div>
            <div className="argo-coords">
              <span>Lat: {clickedPoint?.lat ?? "—"}</span>
              <span>Lon: {clickedPoint?.lon ?? "—"}</span>
            </div>
            <button type="button" className="pill pill-active w-full mt-2">
              View Full Profile
            </button>
          </aside>
        </div>

        {/* ── Bottom bar ── */}
        <div className="bottom-bar">
          <div className="stats-panel panel">
            {[
              ["Active Argo Floats", "127"],
              ["Active Gliders", "18"],
              ["Observations", "4,826"],
              ["Model Time Steps", "7"],
              ["Ocean Area Covered", "8.2M km²"],
            ].map(([label, value]) => (
              <div key={label} className="stat-item">
                <span className="stat-label">{label}</span>
                <strong className="stat-value">{value}</strong>
              </div>
            ))}
          </div>

          <div className="alerts-panel panel">
            <div className="panel-title mb-2">Ocean Alerts</div>
            <p className="alert-item">
              <i className="alert-dot alert-red" />
              High Temperature Anomaly: Arabian Sea +2.1°C
            </p>
            <p className="alert-item">
              <i className="alert-dot alert-orange" />
              Strong Current: Western Indian Ocean 1.8 m/s
            </p>
            <p className="alert-item">
              <i className="alert-dot alert-yellow" />
              Low Observation Coverage: Central Indian Ocean
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

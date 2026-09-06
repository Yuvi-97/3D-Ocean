import React, { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import {
  renderRegionalCoreTexture,
  generateSyntheticLevelTexture,
  generateVerticalColumnMantleTexture,
} from "../../utils/colormaps";
import { FaSyncAlt, FaLayerGroup } from "react-icons/fa";

/**
 * 3D Volumetric Water Column Core Visualizer
 * Renders an interactive Three.js Cylindrical or Cuboid core with:
 * - Multi-depth stacked heatmap slices through the full vertical column
 * - Dynamic active depth slicing disc linked to the depth slider
 * - Continuous vertical temperature gradient mantle
 * - Interactive orbit rotation & reset controls
 */
export default function VolumetricCoreViewer({
  shape = "cylinder",
  sliceData = null,
  centerLat = 13.41,
  centerLon = 85.23,
  radiusKm = 100,
  variable = "thetao",
  depthIndex = 0,
  depthMeters = 0.49,
  thermoclineDepth = 155.9,
  pointProfileData = null,
  hasValidOceanData = true,
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const coreGroupRef = useRef(null);
  const activeSliceMeshRef = useRef(null);
  const activeSliceTextureRef = useRef(null);
  const activeRingMeshRef = useRef(null);
  const animFrameRef = useRef(null);

  const [showStackedLayers, setShowStackedLayers] = useState(true);

  const [coreStats, setCoreStats] = useState({
    meanVal: 28.6,
    minVal: 26.2,
    maxVal: 29.8,
    oceanPct: 100,
  });

  // Rotation / Drag Interaction State
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const rotationRef = useRef({ x: 0.35, y: -0.45 });

  const handleResetView = () => {
    rotationRef.current = { x: 0.35, y: -0.45 };
    if (coreGroupRef.current) {
      coreGroupRef.current.rotation.x = 0.35;
      coreGroupRef.current.rotation.y = -0.45;
    }
  };

  // 1. Generate Regional Heatmap Texture for the active depth
  const textureData = useMemo(() => {
    return renderRegionalCoreTexture(
      sliceData,
      centerLat,
      centerLon,
      radiusKm,
      shape === "cylinder" ? "circle" : "rectangle",
      variable,
      depthMeters
    );
  }, [sliceData, centerLat, centerLon, radiusKm, shape, variable, depthMeters]);

  useEffect(() => {
    if (!hasValidOceanData) {
      setCoreStats({
        meanVal: -1.0,
        minVal: -1.0,
        maxVal: -1.0,
        oceanPct: 0,
      });
    } else if (textureData) {
      setCoreStats({
        meanVal: textureData.meanVal,
        minVal: textureData.minVal,
        maxVal: textureData.maxVal,
        oceanPct: textureData.oceanPct,
      });
    }
  }, [hasValidOceanData, textureData]);

  // Key depth levels for the stacked volumetric core
  const stackedLevels = useMemo(() => {
    const profile = pointProfileData?.profile || [];
    const getVal = (idx, defT, defS) => {
      const p = profile[idx];
      return {
        depth: p?.depth_m || [0.49, 34.4, 77.8, 155.8, 318.1, 541.1, 1062.4][idx] || 100,
        temp: p?.thetao ?? defT,
        sal: p?.so ?? defS,
      };
    };

    return [
      { id: "surface", label: "0m (Surface)", idx: 0, ...getVal(0, 29.9, 33.3) },
      { id: "mixed", label: "34m (Mixed Layer)", idx: 8, ...getVal(8, 29.8, 33.4) },
      { id: "upper_thermo", label: "78m (Thermocline Top)", idx: 11, ...getVal(11, 27.4, 34.0) },
      { id: "thermo_core", label: "156m (Thermocline Core)", idx: 15, ...getVal(15, 21.5, 34.8) },
      { id: "sub_thermo", label: "318m (Intermediate)", idx: 18, ...getVal(18, 12.6, 35.0) },
      { id: "deep", label: "541m (Deep Layer)", idx: 22, ...getVal(22, 9.7, 35.0) },
      { id: "floor", label: "1062m (Abyss Floor)", idx: 35, ...getVal(35, 6.6, 34.9) },
    ];
  }, [pointProfileData]);

  // 2. Initialize Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 310;
    const height = container.clientHeight || 290;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 4.4);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 5, 4);
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x0d9488, 0.7);
    backLight.position.set(-3, -2, -3);
    scene.add(backLight);

    // Root Core Group for Rotation
    const coreGroup = new THREE.Group();
    coreGroup.rotation.x = rotationRef.current.x;
    coreGroup.rotation.y = rotationRef.current.y;
    scene.add(coreGroup);
    coreGroupRef.current = coreGroup;

    // Helper: Build Core Geometries (Mantle + Stacked Depth Heatmap Discs + Active Disc)
    const buildCoreScene = () => {
      // Clear previous children
      while (coreGroup.children.length > 0) {
        const obj = coreGroup.children[0];
        coreGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose();
        }
      }

      const totalHeight = 3.0;

      // Handle Land / Out-of-Domain coordinates
      if (!hasValidOceanData) {
        let landGeo;
        if (shape === "cylinder") {
          landGeo = new THREE.CylinderGeometry(1.3, 1.3, totalHeight, 36);
        } else {
          landGeo = new THREE.BoxGeometry(2.3, totalHeight, 2.3);
        }
        const landMat = new THREE.MeshStandardMaterial({
          color: 0x334155, // slate-700
          roughness: 0.85,
          metalness: 0.1,
          transparent: true,
          opacity: 0.65,
        });
        const landMesh = new THREE.Mesh(landGeo, landMat);
        coreGroup.add(landMesh);

        const landWireMat = new THREE.LineBasicMaterial({
          color: 0xef4444, // red-500
          transparent: true,
          opacity: 0.6,
        });
        const landWire = new THREE.LineSegments(new THREE.WireframeGeometry(landGeo), landWireMat);
        coreGroup.add(landWire);
        return;
      }

      // A. Outer Mantle Wall with True Vertical Temperature Gradient
      const mantleCanvas = generateVerticalColumnMantleTexture(pointProfileData?.profile, variable);
      const mantleTexture = new THREE.CanvasTexture(mantleCanvas);
      mantleTexture.generateMipmaps = false;
      mantleTexture.minFilter = THREE.LinearFilter;

      let shellGeo;
      if (shape === "cylinder") {
        shellGeo = new THREE.CylinderGeometry(1.3, 1.3, totalHeight, 40, 1, true);
      } else {
        shellGeo = new THREE.BoxGeometry(2.3, totalHeight, 2.3);
      }

      const shellMat = new THREE.MeshBasicMaterial({
        map: mantleTexture,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const shellMesh = new THREE.Mesh(shellGeo, shellMat);
      coreGroup.add(shellMesh);

      // Wireframe cage contours
      const wireMat = new THREE.LineBasicMaterial({
        color: 0x0d9488,
        transparent: true,
        opacity: 0.45,
      });
      const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(shellGeo), wireMat);
      coreGroup.add(wireframe);

      // B. Stacked Volumetric Depth Heatmap Discs (Showing heatmaps at multiple depths)
      if (showStackedLayers) {
        stackedLevels.forEach((lvl) => {
          const depthRatio = Math.max(0, Math.min(1, lvl.depth / 1062));
          const yPos = 1.5 - depthRatio * totalHeight;

          let discGeo;
          if (shape === "cylinder") {
            discGeo = new THREE.CircleGeometry(1.27, 44);
          } else {
            discGeo = new THREE.PlaneGeometry(2.26, 2.26);
          }
          discGeo.rotateX(-Math.PI / 2);

          const discTextureCanvas = generateSyntheticLevelTexture(
            lvl.depth,
            lvl.temp,
            lvl.sal,
            shape === "cylinder" ? "circle" : "rectangle",
            variable
          ).canvas;

          const discTexture = new THREE.CanvasTexture(discTextureCanvas);
          discTexture.generateMipmaps = false;
          discTexture.minFilter = THREE.LinearFilter;

          const discMat = new THREE.MeshBasicMaterial({
            map: discTexture,
            transparent: true,
            opacity: 0.72,
            side: THREE.DoubleSide,
            depthWrite: false,
          });

          const discMesh = new THREE.Mesh(discGeo, discMat);
          discMesh.position.y = yPos;
          coreGroup.add(discMesh);

          // Subtle depth perimeter ring
          let rimGeo;
          if (shape === "cylinder") {
            rimGeo = new THREE.RingGeometry(1.26, 1.29, 36);
            rimGeo.rotateX(-Math.PI / 2);
          } else {
            rimGeo = new THREE.PlaneGeometry(2.27, 2.27);
            rimGeo.rotateX(-Math.PI / 2);
          }
          const rimMat = new THREE.MeshBasicMaterial({
            color: lvl.temp > 25 ? 0xf97316 : lvl.temp > 18 ? 0x10b981 : 0x0284c7,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.6,
          });
          const rimMesh = new THREE.Mesh(rimGeo, rimMat);
          rimMesh.position.y = yPos;
          coreGroup.add(rimMesh);
        });
      }

      // C. Active Depth Slicing Disc (Controlled by slider)
      let activeGeo;
      if (shape === "cylinder") {
        activeGeo = new THREE.CircleGeometry(1.29, 48);
      } else {
        activeGeo = new THREE.PlaneGeometry(2.28, 2.28);
      }
      activeGeo.rotateX(-Math.PI / 2);

      const activeCanvasTexture = new THREE.CanvasTexture(textureData.canvas);
      activeCanvasTexture.generateMipmaps = false;
      activeCanvasTexture.minFilter = THREE.LinearFilter;
      activeSliceTextureRef.current = activeCanvasTexture;

      const activeMat = new THREE.MeshBasicMaterial({
        map: activeCanvasTexture,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.96,
      });

      const activeMesh = new THREE.Mesh(activeGeo, activeMat);
      const initialY = 1.5 - (depthIndex / 35) * totalHeight;
      activeMesh.position.y = initialY;
      coreGroup.add(activeMesh);
      activeSliceMeshRef.current = activeMesh;

      // D. Glowing Active Depth Perimeter Ring
      let activeRingGeo;
      if (shape === "cylinder") {
        activeRingGeo = new THREE.RingGeometry(1.27, 1.34, 48);
      } else {
        const shapePath = new THREE.Shape();
        shapePath.moveTo(-1.17, -1.17);
        shapePath.lineTo(1.17, -1.17);
        shapePath.lineTo(1.17, 1.17);
        shapePath.lineTo(-1.17, 1.17);
        shapePath.closePath();
        activeRingGeo = new THREE.ShapeGeometry(shapePath);
      }
      activeRingGeo.rotateX(-Math.PI / 2);

      const activeRingMat = new THREE.MeshBasicMaterial({
        color: 0x14b8a6, // vibrant teal
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      const activeRingMesh = new THREE.Mesh(activeRingGeo, activeRingMat);
      activeRingMesh.position.y = initialY;
      coreGroup.add(activeRingMesh);
      activeRingMeshRef.current = activeRingMesh;

      // E. Thermocline Dashed Marker Ring
      const thermoclineRatio = Math.min(1, Math.max(0, thermoclineDepth / 1062));
      const thermoY = 1.5 - thermoclineRatio * totalHeight;

      let thermoRingGeo;
      if (shape === "cylinder") {
        thermoRingGeo = new THREE.RingGeometry(1.29, 1.33, 36);
        thermoRingGeo.rotateX(-Math.PI / 2);
      } else {
        thermoRingGeo = new THREE.PlaneGeometry(2.3, 2.3);
        thermoRingGeo.rotateX(-Math.PI / 2);
      }
      const thermoMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const thermoMesh = new THREE.Mesh(thermoRingGeo, thermoMat);
      thermoMesh.position.y = thermoY;
      coreGroup.add(thermoMesh);
    };

    buildCoreScene();

    // Mouse / Touch Drag Orbit Handlers
    const onPointerDown = (e) => {
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - prevMousePosRef.current.x;
      const dy = e.clientY - prevMousePosRef.current.y;

      rotationRef.current.y += dx * 0.012;
      rotationRef.current.x += dy * 0.012;
      rotationRef.current.x = Math.max(-0.95, Math.min(0.95, rotationRef.current.x));

      coreGroup.rotation.y = rotationRef.current.y;
      coreGroup.rotation.x = rotationRef.current.x;

      prevMousePosRef.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDraggingRef.current = false;
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    // Animation Loop
    const animate = () => {
      if (!isDraggingRef.current) {
        rotationRef.current.y += 0.002;
        coreGroup.rotation.y = rotationRef.current.y;
      }
      renderer.render(scene, camera);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || 310;
      const h = container.clientHeight || 290;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
      domEl.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape, showStackedLayers, pointProfileData, variable, hasValidOceanData]);

  // 3. Smoothly animate slicing disc Y position when depthIndex changes
  useEffect(() => {
    const totalHeight = 3.0;
    const targetY = 1.5 - (depthIndex / 35) * totalHeight;

    if (activeSliceMeshRef.current) {
      activeSliceMeshRef.current.position.y = targetY;
    }
    if (activeRingMeshRef.current) {
      activeRingMeshRef.current.position.y = targetY;
    }
  }, [depthIndex]);

  // 4. Update active slicing texture when slice data / variable changes
  useEffect(() => {
    if (activeSliceTextureRef.current && textureData?.canvas) {
      activeSliceTextureRef.current.image = textureData.canvas;
      activeSliceTextureRef.current.needsUpdate = true;
    }
  }, [textureData]);

  const unit = variable === "thetao" ? "°C" : variable === "so" ? "PSU" : "m/s";

  return (
    <div className="flex flex-col gap-2">
      {/* 3D WebGL Canvas Container */}
      <div className="relative w-full h-[290px] bg-slate-950 rounded-xl overflow-hidden border border-gray-200 shadow-inner">
        {/* Three.js DOM Canvas Mount */}
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Top Floating Header with Clean 2-Line Layout (Prevents Overlap) */}
        <div className="absolute top-2 left-2 right-2 flex flex-col gap-1 pointer-events-none">
          {/* Row 1: Shape Title + Controls */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/75 backdrop-blur-sm border border-white/10 text-[10px] text-white">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
              <span className="font-bold tracking-wide">
                {shape === "cylinder" ? `3D CYLINDER (${radiusKm}km)` : `3D CUBOID (${radiusKm * 2}km)`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowStackedLayers(!showStackedLayers)}
                title={showStackedLayers ? "Hide multi-depth slices" : "Show all depth heatmap slices"}
                className={`p-1 rounded text-[10px] border transition-colors ${
                  showStackedLayers
                    ? "bg-teal-700/80 text-white border-teal-400/40"
                    : "bg-black/60 text-gray-400 border-white/10 hover:text-white"
                }`}
              >
                <FaLayerGroup />
              </button>

              <button
                type="button"
                onClick={handleResetView}
                title="Reset 3D Core View Orientation"
                className="p-1 rounded bg-black/60 hover:bg-black/80 text-gray-300 hover:text-teal-300 text-[10px] border border-white/10 transition-colors"
              >
                <FaSyncAlt />
              </button>
            </div>
          </div>

          {/* Row 2: Z-Exaggeration & Mode */}
          <div className="flex items-center justify-between">
            <div className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-teal-300 font-mono border border-teal-500/30">
              Z-Exaggeration: 150x
            </div>
            <div className="px-1.5 py-0.5 rounded bg-black/60 text-[9px] text-amber-300 font-mono border border-amber-500/30">
              {showStackedLayers ? "Stacked Heatmaps: ON" : "Active Slice Only"}
            </div>
          </div>
        </div>

        {/* Land / Out-of-Domain Red Alert Overlay */}
        {!hasValidOceanData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-black/75 backdrop-blur-xs text-center z-10 pointer-events-none">
            <span className="px-2.5 py-1 rounded-md bg-red-600 text-white font-bold text-xs uppercase tracking-wider mb-1.5 shadow-md">
              No Ocean Model Data
            </span>
            <span className="text-[11px] text-red-200 max-w-[220px] font-mono leading-tight">
              Coordinate on continental land or outside numerical model domain.
            </span>
            <span className="text-[10px] text-red-300 font-mono mt-1 font-bold">
              Profile Values = -1
            </span>
          </div>
        )}

        {/* Left Depth Scale with Real Depth Temperatures */}
        <div className="absolute left-2 top-14 bottom-11 flex flex-col justify-between text-[9px] font-mono text-slate-300 pointer-events-none select-none drop-shadow-md">
          <span className={hasValidOceanData ? "text-orange-300" : "text-red-400 font-bold"}>
            0m ({hasValidOceanData ? "29.9°C" : "-1"})
          </span>
          <span className={hasValidOceanData ? "text-amber-200" : "text-red-400 font-bold"}>
            34m ({hasValidOceanData ? "29.8°C" : "-1"})
          </span>
          <span className={`font-bold ${hasValidOceanData ? "text-emerald-300" : "text-red-400"}`}>
            ~{thermoclineDepth.toFixed(0)}m ({hasValidOceanData ? "Thermo" : "-1"})
          </span>
          <span className={hasValidOceanData ? "text-cyan-300" : "text-red-400 font-bold"}>
            380m ({hasValidOceanData ? "11.0°C" : "-1"})
          </span>
          <span className={hasValidOceanData ? "text-indigo-300" : "text-red-400 font-bold"}>
            1062m ({hasValidOceanData ? "6.6°C" : "-1"})
          </span>
        </div>

        {/* Bottom Current Slice Telemetry */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm border border-white/10 text-xs text-white">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 text-[11px]">Active Slice:</span>
            <strong className={`font-mono ${hasValidOceanData ? "text-teal-400" : "text-red-400 font-bold"}`}>
              {hasValidOceanData ? `${depthMeters.toFixed(1)}m` : "-1 m (N/A)"}
            </strong>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-300 text-[11px]">Core Mean:</span>
            <strong className={`font-mono ${hasValidOceanData ? "text-amber-400" : "text-red-400 font-bold"}`}>
              {hasValidOceanData ? `${coreStats.meanVal} ${unit}` : `-1 ${unit}`}
            </strong>
          </div>
        </div>
      </div>

      {/* Statistics Card matching Dashboard.jsx */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 text-center">
          <span className="text-[10px] font-semibold text-gray-500 uppercase block">Min Core</span>
          <strong className={`text-xs font-mono ${hasValidOceanData ? "text-gray-800" : "text-red-600 font-bold"}`}>
            {coreStats.minVal} {unit}
          </strong>
        </div>
        <div className="p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-center">
          <span className="text-[10px] font-semibold text-teal-700 uppercase block">Mean Core</span>
          <strong className={`text-xs font-mono font-bold ${hasValidOceanData ? "text-teal-900" : "text-red-600"}`}>
            {coreStats.meanVal} {unit}
          </strong>
        </div>
        <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-200 text-center">
          <span className="text-[10px] font-semibold text-gray-500 uppercase block">Max Core</span>
          <strong className={`text-xs font-mono ${hasValidOceanData ? "text-gray-800" : "text-red-600 font-bold"}`}>
            {coreStats.maxVal} {unit}
          </strong>
        </div>
      </div>

      {/* Land / Ocean Ratio & Footprint */}
      <div className="flex items-center justify-between px-2.5 py-1 rounded bg-gray-50 border border-gray-200 text-[11px] text-gray-600">
        <span>Ocean Coverage:</span>
        <strong className={`font-mono ${hasValidOceanData ? "text-emerald-700" : "text-red-600 font-bold"}`}>
          {coreStats.oceanPct}% {hasValidOceanData ? "Marine Water" : "Continental Land (No Data)"}
        </strong>
      </div>
    </div>
  );
}

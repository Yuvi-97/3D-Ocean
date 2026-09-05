import React, { useRef, useEffect, useState } from "react";
import {
  OCEAN_LABELS,
  CONTINENT_LABELS,
  COUNTRY_LABELS,
  CAMERA_PRESETS,
} from "../../constants/oceanData";
import {
  renderSliceToCanvas,
  createVectorArrowCanvas,
} from "../../utils/colormaps";

const CESIUM_ION_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IkNHamxQZS1JZGF2TWoxTEMiLCJqdGkiOiJiOTgyYTdiMy05ODk2LTRiOTAtYjRjMi1mZTVkMjY1M2JjOWQiLCJpZCI6NDgwMDc4LCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODg0NTE0NzN9.oRVqs_bx2Vuhbr5YyK1rL0_9mZLuPVJQx-j99kQYoAk";

// Scientific typography & styling for geographic labels
const getOceanLabelStyle = (Cesium) => ({
  font: "600 16px 'Outfit', 'Segoe UI', sans-serif",
  fillColor: Cesium.Color.fromCssColorString("#7dd3fc"),
  outlineColor: Cesium.Color.fromCssColorString("#032b43"),
  outlineWidth: 4,
  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
  verticalOrigin: Cesium.VerticalOrigin.CENTER,
  horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
  scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.2, 1.5e8, 0.35),
  translucencyByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 1.5e8, 0.0),
});

const getContinentLabelStyle = (Cesium) => ({
  font: "bold 13px 'Outfit', 'Segoe UI', sans-serif",
  fillColor: Cesium.Color.fromCssColorString("#d1fae5"),
  outlineColor: Cesium.Color.fromCssColorString("#064e3b"),
  outlineWidth: 3,
  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
  verticalOrigin: Cesium.VerticalOrigin.CENTER,
  horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
  scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.0, 1.5e8, 0.25),
  translucencyByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 1.5e8, 0.0),
});

const getCountryLabelStyle = (Cesium) => ({
  font: "500 12px 'Segoe UI', sans-serif",
  fillColor: Cesium.Color.fromCssColorString("#f1f5f9"),
  outlineColor: Cesium.Color.fromCssColorString("#0f172a"),
  outlineWidth: 2,
  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
  verticalOrigin: Cesium.VerticalOrigin.CENTER,
  horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
  scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.0, 1.5e8, 0.2),
  translucencyByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 1.5e8, 0.0),
});

export default function GlobeViewer({
  onCameraChange,
  onGlobeClick,
  onCursorMove,
  onPlatformSelect,
  depthMeters = 0,
  isUnderwater = false,
  showLabels = true,
  presetTrigger = null,
  sliceData = null,
  sliceVariable = "thetao",
  showModelSlice = true,
  vectorData = null,
  showCurrentVectors = true,
  argoFloats = null,
  showArgoFleet = true,
  gliders = null,
  gliderTrack = null,
  showGliders = true,
  clickedPoint = null,
  probeMode = "point",
  selectionRadiusKm = 100,
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Primitive Layer References
  const sliceLayerRef = useRef(null);
  const vectorCollectionRef = useRef(null);
  const argoCollectionRef = useRef(null);
  const gliderCollectionRef = useRef(null);
  const gliderTrackRef = useRef(null);
  const probeMarkerRef = useRef(null);

  // Callbacks in refs
  const onCameraChangeRef = useRef(onCameraChange);
  const onGlobeClickRef = useRef(onGlobeClick);
  const onCursorMoveRef = useRef(onCursorMove);
  const onPlatformSelectRef = useRef(onPlatformSelect);

  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);

  useEffect(() => {
    onGlobeClickRef.current = onGlobeClick;
  }, [onGlobeClick]);

  useEffect(() => {
    onCursorMoveRef.current = onCursorMove;
  }, [onCursorMove]);

  useEffect(() => {
    onPlatformSelectRef.current = onPlatformSelect;
  }, [onPlatformSelect]);

  // 1. Camera Preset Navigation
  useEffect(() => {
    if (!presetTrigger?.preset || !viewerRef.current || viewerRef.current.isDestroyed()) return;
    const Cesium = window.Cesium;
    if (!Cesium) return;

    const { preset } = presetTrigger;
    const viewer = viewerRef.current;

    if (preset.bbox) {
      const [west, south, east, north] = preset.bbox;
      viewer.camera.flyTo({
        destination: Cesium.Rectangle.fromDegrees(west, south, east, north),
        duration: 2.0,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      });
    } else if (preset.center) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          preset.center.lon,
          preset.center.lat,
          preset.height || 3500000
        ),
        duration: 2.0,
        easingFunction: Cesium.EasingFunction.QUADRATIC_IN_OUT,
      });
    }
  }, [presetTrigger]);

  // 2. 2D Numerical Model Heatmap Layer (GPU Canvas Texture)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !window.Cesium) return;
    const Cesium = window.Cesium;

    // Remove previous slice layer
    if (sliceLayerRef.current) {
      viewer.imageryLayers.remove(sliceLayerRef.current, true);
      sliceLayerRef.current = null;
    }

    if (!showModelSlice || !sliceData || !sliceData.values || !sliceData.grid_shape) return;

    try {
      const canvas = renderSliceToCanvas(sliceData, sliceVariable, null, null, 215);
      if (!canvas) return;

      const lons = sliceData.longitudes;
      const lats = sliceData.latitudes;
      const west = lons[0];
      const east = lons[lons.length - 1];
      const south = lats[0];
      const north = lats[lats.length - 1];

      const provider = new Cesium.SingleTileImageryProvider({
        url: canvas.toDataURL("image/png"),
        rectangle: Cesium.Rectangle.fromDegrees(west, south, east, north),
      });

      const layer = viewer.imageryLayers.addImageryProvider(provider);
      layer.alpha = 0.85;
      sliceLayerRef.current = layer;
    } catch (e) {
      console.warn("Failed to render model slice texture:", e);
    }
  }, [sliceData, sliceVariable, showModelSlice]);

  // 3. Current Velocity Vectors Layer (Billboards)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !window.Cesium) return;
    const Cesium = window.Cesium;

    if (vectorCollectionRef.current) {
      viewer.scene.primitives.remove(vectorCollectionRef.current);
      vectorCollectionRef.current = null;
    }

    if (!showCurrentVectors || !vectorData || !vectorData.length) return;

    try {
      const arrowCanvas = createVectorArrowCanvas("#38bdf8");
      const collection = viewer.scene.primitives.add(new Cesium.BillboardCollection());

      vectorData.forEach((vec) => {
        if (!vec || vec.speed < 0.05) return;
        const scale = Math.min(1.1, Math.max(0.4, vec.speed * 0.7));
        const rotationRad = Cesium.Math.toRadians(360 - (vec.direction_deg || 0));

        collection.add({
          position: Cesium.Cartesian3.fromDegrees(vec.lon, vec.lat, 2000),
          image: arrowCanvas,
          rotation: rotationRad,
          alignedAxis: Cesium.Cartesian3.UNIT_Z,
          scale: scale,
          color: Cesium.Color.fromAlpha(Cesium.Color.CYAN, 0.8),
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(100000, 10000000),
        });
      });

      vectorCollectionRef.current = collection;
    } catch (e) {
      console.warn("Failed to render current vectors:", e);
    }
  }, [vectorData, showCurrentVectors]);

  // 4. In-Situ Argo Float Fleet (Pulsing Emerald Beacons)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !window.Cesium) return;
    const Cesium = window.Cesium;

    if (argoCollectionRef.current) {
      viewer.scene.primitives.remove(argoCollectionRef.current);
      argoCollectionRef.current = null;
    }

    if (!showArgoFleet || !argoFloats || !argoFloats.length) return;

    try {
      const collection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());

      argoFloats.forEach((f) => {
        const pos = f.latest_position;
        if (!pos || pos.lat === undefined || pos.lon === undefined) return;

        collection.add({
          position: Cesium.Cartesian3.fromDegrees(pos.lon, pos.lat, 5000),
          pixelSize: 8,
          color: Cesium.Color.fromCssColorString("#10b981"),
          outlineColor: Cesium.Color.fromCssColorString("#064e3b"),
          outlineWidth: 2,
          id: { type: "argo", data: f },
          distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 18000000),
        });
      });

      argoCollectionRef.current = collection;
    } catch (e) {
      console.warn("Failed to render Argo fleet:", e);
    }
  }, [argoFloats, showArgoFleet]);

  // 5. Autonomous Gliders & 3D Sawtooth Dive Track
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !window.Cesium) return;
    const Cesium = window.Cesium;

    if (gliderCollectionRef.current) {
      viewer.scene.primitives.remove(gliderCollectionRef.current);
      gliderCollectionRef.current = null;
    }
    if (gliderTrackRef.current) {
      viewer.entities.remove(gliderTrackRef.current);
      gliderTrackRef.current = null;
    }

    if (!showGliders || !gliders || !gliders.length) return;

    try {
      const collection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());

      gliders.forEach((g) => {
        const centerLon = (g.bbox.min_lon + g.bbox.max_lon) / 2;
        const centerLat = (g.bbox.min_lat + g.bbox.max_lat) / 2;

        collection.add({
          position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, 8000),
          pixelSize: 12,
          color: Cesium.Color.fromCssColorString("#f59e0b"),
          outlineColor: Cesium.Color.fromCssColorString("#78350f"),
          outlineWidth: 3,
          id: { type: "glider", data: g },
        });
      });

      gliderCollectionRef.current = collection;

      // Add 3D dive sawtooth trajectory
      if (gliderTrack && gliderTrack.length > 1) {
        const positions = [];
        gliderTrack.forEach((pt) => {
          const depthAltitude = -Math.abs(pt.max_pres || 100);
          positions.push(Cesium.Cartesian3.fromDegrees(pt.lon, pt.lat, depthAltitude));
        });

        gliderTrackRef.current = viewer.entities.add({
          polyline: {
            positions: positions,
            width: 3,
            material: new Cesium.PolylineGlowMaterialProperty({
              glowPower: 0.3,
              color: Cesium.Color.fromCssColorString("#fbbf24"),
            }),
          },
        });
      }
    } catch (e) {
      console.warn("Failed to render gliders:", e);
    }
  }, [gliders, gliderTrack, showGliders]);

  // 6. Probed Ocean Location Marker (Target reticle, Cylinder Circle, or Cuboid Box)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !window.Cesium) return;
    const Cesium = window.Cesium;

    if (probeMarkerRef.current) {
      viewer.entities.remove(probeMarkerRef.current);
      probeMarkerRef.current = null;
    }

    if (!clickedPoint || clickedPoint.lat === undefined || clickedPoint.lon === undefined) return;

    try {
      const latNum = Number(clickedPoint.lat);
      const lonNum = Number(clickedPoint.lon);
      if (isNaN(latNum) || isNaN(lonNum)) return;

      const radiusMeters = (selectionRadiusKm || 100) * 1000;

      if (probeMode === "cylinder") {
        probeMarkerRef.current = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lonNum, latNum, 1000),
          ellipse: {
            semiMajorAxis: radiusMeters,
            semiMinorAxis: radiusMeters,
            material: Cesium.Color.fromCssColorString("#0d9488").withAlpha(0.35),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString("#14b8a6"),
            outlineWidth: 3,
          },
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString("#0d9488"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2.5,
          },
          label: {
            text: `⭕ 3D Cylinder Core (${selectionRadiusKm}km Radius)`,
            font: "bold 12px Roboto, sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#115e59"),
            showBackground: true,
            backgroundColor: Cesium.Color.fromAlpha(Cesium.Color.WHITE, 0.92),
            backgroundPadding: new Cesium.Cartesian2(7, 4),
            pixelOffset: new Cesium.Cartesian2(0, -25),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000000),
          },
        });
      } else if (probeMode === "cuboid") {
        const latDelta = (selectionRadiusKm || 100) / 111.0;
        const lonDelta =
          (selectionRadiusKm || 100) /
          (111.0 * Math.max(0.1, Math.cos((latNum * Math.PI) / 180)));

        probeMarkerRef.current = viewer.entities.add({
          rectangle: {
            coordinates: Cesium.Rectangle.fromDegrees(
              lonNum - lonDelta,
              latNum - latDelta,
              lonNum + lonDelta,
              latNum + latDelta
            ),
            material: Cesium.Color.fromCssColorString("#0d9488").withAlpha(0.35),
            outline: true,
            outlineColor: Cesium.Color.fromCssColorString("#14b8a6"),
            outlineWidth: 3,
          },
          point: {
            pixelSize: 10,
            color: Cesium.Color.fromCssColorString("#0d9488"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 2.5,
          },
          label: {
            text: `📦 3D Cuboid Volume (${selectionRadiusKm * 2}x${selectionRadiusKm * 2}km)`,
            font: "bold 12px Roboto, sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#115e59"),
            showBackground: true,
            backgroundColor: Cesium.Color.fromAlpha(Cesium.Color.WHITE, 0.92),
            backgroundPadding: new Cesium.Cartesian2(7, 4),
            pixelOffset: new Cesium.Cartesian2(0, -25),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000000),
          },
        });
      } else {
        // Point Reticle
        probeMarkerRef.current = viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(lonNum, latNum, 1000),
          point: {
            pixelSize: 12,
            color: Cesium.Color.fromCssColorString("#0d9488"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 3,
          },
          label: {
            text: `📍 Sounding Station (${latNum.toFixed(2)}°N, ${lonNum.toFixed(2)}°E)`,
            font: "bold 11px Roboto, sans-serif",
            fillColor: Cesium.Color.fromCssColorString("#115e59"),
            showBackground: true,
            backgroundColor: Cesium.Color.fromAlpha(Cesium.Color.WHITE, 0.92),
            backgroundPadding: new Cesium.Cartesian2(6, 4),
            pixelOffset: new Cesium.Cartesian2(0, -22),
            horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 10000000),
          },
        });
      }
    } catch (e) {
      console.warn("Failed to render probe marker:", e);
    }
  }, [clickedPoint, probeMode, selectionRadiusKm]);

  // Set Cesium canvas cursor style based on probeMode
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    const canvas = viewer.scene.canvas;
    if (canvas) {
      canvas.style.cursor = probeMode === "point" ? "default" : "crosshair";
    }
  }, [probeMode]);

  // 7. Cesium Script Loader & Scene Initialization
  useEffect(() => {
    let isMounted = true;

    const loadCesiumScript = () => {
      return new Promise((resolve, reject) => {
        if (window.Cesium) {
          resolve(window.Cesium);
          return;
        }

        const existingScript = document.querySelector('script[src*="Cesium.js"]');
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(window.Cesium));
          existingScript.addEventListener("error", reject);
          return;
        }

        window.CESIUM_BASE_URL =
          window.CESIUM_BASE_URL ||
          "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/";

        if (!document.querySelector('link[href*="widgets.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href =
            "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Widgets/widgets.css";
          document.head.appendChild(link);
        }

        const script = document.createElement("script");
        script.src =
          "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Cesium.js";
        script.async = true;
        script.onload = () => resolve(window.Cesium);
        script.onerror = (e) => reject(e);
        document.head.appendChild(script);
      });
    };

    loadCesiumScript()
      .then((Cesium) => {
        if (!isMounted || !containerRef.current) return;
        if (viewerRef.current && !viewerRef.current.isDestroyed()) return;

        Cesium.Ion.defaultAccessToken = CESIUM_ION_TOKEN;

        const viewer = new Cesium.Viewer(containerRef.current, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          navigationHelpButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          requestRenderMode: false,
          orderIndependentTranslucency: true,
          contextOptions: {
            webgl: {
              alpha: false,
              antialias: true,
              preserveDrawingBuffer: false,
              powerPreference: "high-performance",
            },
          },
        });

        viewerRef.current = viewer;

        // Oceanographic Basemap (ArcGIS World Ocean Base with bathymetry)
        const oceanBase = new Cesium.UrlTemplateImageryProvider({
          url: "https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
          credit: "Esri Ocean Basemap, GEBCO, NOAA, National Geographic",
          maximumLevel: 13,
        });

        const oceanReference = new Cesium.UrlTemplateImageryProvider({
          url: "https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}",
          credit: "Esri Ocean Reference Overlay",
          maximumLevel: 13,
        });

        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(oceanBase);
        viewer.imageryLayers.addImageryProvider(oceanReference);

        // Terrain with bathymetry
        Cesium.createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true,
        })
          .then((tp) => {
            if (!viewer.isDestroyed()) viewer.terrainProvider = tp;
          })
          .catch(() => console.info("Global terrain provider loaded"));

        // Atmosphere & Scene styling
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#02070d");
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#030c14");
        viewer.scene.globe.showGroundAtmosphere = true;
        viewer.scene.globe.enableLighting = false;
        viewer.scene.globe.depthTestAgainstTerrain = false;
        viewer.scene.skyAtmosphere.show = true;
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 0.0002;

        if (viewer.scene.postProcessStages?.fxaa) {
          viewer.scene.postProcessStages.fxaa.enabled = true;
        }

        const cameraController = viewer.scene.screenSpaceCameraController;
        cameraController.enableInputs = true;
        cameraController.enableZoom = true;
        cameraController.enableRotate = true;
        cameraController.enableTranslate = true;
        cameraController.enableTilt = true;
        cameraController.enableLook = true;
        cameraController.enableCollisionDetection = false;
        cameraController.minimumZoomDistance = 50000;
        cameraController.maximumZoomDistance = 35000000;
        cameraController.inertiaSpin = 0.85;
        cameraController.inertiaTranslate = 0.85;
        cameraController.inertiaZoom = 0.8;

        if (viewer.cesiumWidget?.creditContainer) {
          viewer.cesiumWidget.creditContainer.style.display = "none";
        }

        // Initial camera view: Indian Ocean Basin
        const initialPreset = CAMERA_PRESETS[0];
        if (initialPreset?.bbox) {
          const [west, south, east, north] = initialPreset.bbox;
          viewer.camera.setView({
            destination: Cesium.Rectangle.fromDegrees(west, south, east, north),
          });
        }

        // Geographic Labels Collection
        const oceanStyle = getOceanLabelStyle(Cesium);
        OCEAN_LABELS.forEach((ocean) => {
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(ocean.lon, ocean.lat, 10000),
            label: { text: ocean.name, ...oceanStyle },
          });
        });

        const continentStyle = getContinentLabelStyle(Cesium);
        CONTINENT_LABELS.forEach((continent) => {
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(continent.lon, continent.lat, 10000),
            label: { text: continent.name, ...continentStyle },
          });
        });

        const countryStyle = getCountryLabelStyle(Cesium);
        COUNTRY_LABELS.forEach((country) => {
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(country.lon, country.lat, 10000),
            label: { text: country.name, ...countryStyle },
          });
        });

        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

        const handleInteraction = (screenPosition, isClick = false) => {
          if (!viewer || viewer.isDestroyed()) return;

          if (isClick) {
            const picked = viewer.scene.pick(screenPosition);
            if (picked && picked.id && picked.id.type) {
              onPlatformSelectRef.current?.(picked.id);
              return;
            }
          }

          let cartesian = null;
          const ray = viewer.camera.getPickRay(screenPosition);
          if (ray) {
            cartesian = viewer.scene.globe.pick(ray, viewer.scene);
          }
          if (!cartesian) {
            cartesian = viewer.camera.pickEllipsoid(screenPosition, viewer.scene.globe.ellipsoid);
          }

          if (cartesian) {
            const carto = Cesium.Cartographic.fromCartesian(cartesian);
            const lat = Number(Cesium.Math.toDegrees(carto.latitude).toFixed(4));
            const lon = Number(Cesium.Math.toDegrees(carto.longitude).toFixed(4));
            const elevation = Math.round(carto.height);

            if (isClick) {
              onGlobeClickRef.current?.({ lat, lon, elevation });
            } else {
              onCursorMoveRef.current?.({ lat, lon, elevation });
            }
          }
        };

        // Click / Touch Tap Handler (Probe Location or Platform Selection)
        handler.setInputAction((click) => {
          handleInteraction(click.position, true);
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Mouse Move / Hover Handler (Cursor Telemetry)
        handler.setInputAction((movement) => {
          handleInteraction(movement.endPosition, false);
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        viewer.camera.changed.addEventListener(() => {
          onCameraChangeRef.current?.(viewer);
        });

        setLoading(false);
      })
      .catch((err) => {
        console.error("Cesium initialization error:", err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-gray-700 font-semibold text-xs tracking-wide">
            Loading 3D Ocean Simulation Canvas...
          </span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full cursor-crosshair" />
    </div>
  );
}

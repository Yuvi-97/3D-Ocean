import React, { useRef, useEffect, useState } from "react";
import {
  OCEAN_LABELS,
  CONTINENT_LABELS,
  COUNTRY_LABELS,
} from "../../constants/oceanData";

const CESIUM_ION_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IkNHamxQZS1JZGF2TWoxTEMiLCJqdGkiOiJiOTgyYTdiMy05ODk2LTRiOTAtYjRjMi1mZTVkMjY1M2JjOWQiLCJpZCI6NDgwMDc4LCJpc3MiOiJodHRwczovL2FwaS5jZXNpdW0uY29tIiwiYXVkIjoidW5kZWZpbmVkX2RlZmF1bHQiLCJpYXQiOjE3ODg0NTE0NzN9.oRVqs_bx2Vuhbr5YyK1rL0_9mZLuPVJQx-j99kQYoAk";

// Label styles matching Frontend 1 OceanLabels.jsx
const getOceanLabelStyle = (Cesium) => ({
  font: "bold 18px 'Segoe UI', sans-serif",
  fillColor: Cesium.Color.fromCssColorString("#93c5fd"), // blue-300
  outlineColor: Cesium.Color.fromCssColorString("#1e3a5f"),
  outlineWidth: 3,
  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
  verticalOrigin: Cesium.VerticalOrigin.CENTER,
  horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
  scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.2, 1.5e8, 0.3),
  translucencyByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 1.5e8, 0.0),
});

const getContinentLabelStyle = (Cesium) => ({
  font: "bold 14px 'Segoe UI', sans-serif",
  fillColor: Cesium.Color.fromCssColorString("#d1fae5"), // emerald-100
  outlineColor: Cesium.Color.fromCssColorString("#065f46"),
  outlineWidth: 2,
  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
  verticalOrigin: Cesium.VerticalOrigin.CENTER,
  horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
  scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.0, 1.5e8, 0.2),
  translucencyByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 1.5e8, 0.0),
});

const getCountryLabelStyle = (Cesium) => ({
  font: "13px 'Segoe UI', sans-serif",
  fillColor: Cesium.Color.WHITE,
  outlineColor: Cesium.Color.BLACK,
  outlineWidth: 2,
  style: Cesium.LabelStyle.FILL_AND_OUTLINE,
  verticalOrigin: Cesium.VerticalOrigin.CENTER,
  horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
  disableDepthTestDistance: Number.POSITIVE_INFINITY,
  scaleByDistance: new Cesium.NearFarScalar(1.5e6, 1.0, 1.5e8, 0.25),
  translucencyByDistance: new Cesium.NearFarScalar(1.5e7, 1.0, 1.5e8, 0.0),
});

export default function GlobeViewer({
  onCameraChange,
  onGlobeClick,
  isUnderwater,
  depthMeters,
}) {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [loading, setLoading] = useState(true);

  // Store callbacks in refs to avoid re-initializing Cesium
  const onCameraChangeRef = useRef(onCameraChange);
  const onGlobeClickRef = useRef(onGlobeClick);
  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);
  useEffect(() => {
    onGlobeClickRef.current = onGlobeClick;
  }, [onGlobeClick]);

  // Load Cesium script if not already present on window
  useEffect(() => {
    let isMounted = true;

    const loadCesiumScript = () => {
      return new Promise((resolve, reject) => {
        if (window.Cesium) {
          resolve(window.Cesium);
          return;
        }

        // Check if script is already in DOM
        const existingScript = document.querySelector('script[src*="Cesium.js"]');
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve(window.Cesium));
          existingScript.addEventListener("error", reject);
          return;
        }

        // Set base url before script execution
        window.CESIUM_BASE_URL =
          window.CESIUM_BASE_URL ||
          "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/";

        // Inject CSS if missing
        if (!document.querySelector('link[href*="widgets.css"]')) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href =
            "https://cesium.com/downloads/cesiumjs/releases/1.114/Build/Cesium/Widgets/widgets.css";
          document.head.appendChild(link);
        }

        // Inject script
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

        // Initialize Cesium Viewer with the exact configuration from frontend1
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
        });

        viewerRef.current = viewer;

        // Use the reference globe's ArcGIS street-map base with World Boundaries & Places overlay
        const imageryProvider = new Cesium.UrlTemplateImageryProvider({
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
          credit:
            "Esri, HERE, Garmin, USGS, Intermap, INCREMENT P, NRCan, METI, NASA, EPA, USDA",
          maximumLevel: 19,
        });
        viewer.imageryLayers.removeAll();
        viewer.imageryLayers.addImageryProvider(imageryProvider);
        viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            credit: "Esri World Boundaries and Places",
            maximumLevel: 19,
          })
        );

        // World terrain with bathymetry
        Cesium.createWorldTerrainAsync({
          requestWaterMask: true,
          requestVertexNormals: true,
        })
          .then((tp) => {
            if (!viewer.isDestroyed()) viewer.terrainProvider = tp;
          })
          .catch(() => console.warn("Terrain unavailable — using flat globe"));

        // Reference globe palette and atmosphere matching Frontend 1
        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#02070b");
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#061923");
        viewer.scene.globe.showGroundAtmosphere = true;
        viewer.scene.globe.enableLighting = true;
        viewer.scene.globe.showWaterEffect = false;
        viewer.scene.skyAtmosphere.show = true;
        viewer.scene.fog.enabled = true;
        viewer.scene.sun.show = true;
        viewer.scene.moon.show = true;

        // Keep all globe navigation inputs enabled
        const cameraController = viewer.scene.screenSpaceCameraController;
        cameraController.enableInputs = true;
        cameraController.enableZoom = true;
        cameraController.enableRotate = true;
        cameraController.enableTranslate = true;
        cameraController.enableTilt = true;
        cameraController.enableLook = true;
        cameraController.enableCollisionDetection = false;
        cameraController.minimumZoomDistance = 80000;
        cameraController.maximumZoomDistance = 45000000;
        cameraController.inertiaSpin = 0.9;
        cameraController.inertiaTranslate = 0.9;
        cameraController.inertiaZoom = 0.8;

        // Hide credit banner
        if (viewer.cesiumWidget?.creditContainer) {
          viewer.cesiumWidget.creditContainer.style.display = "none";
        }

        // Camera move → altitude tracking
        viewer.camera.changed.addEventListener(() => {
          onCameraChangeRef.current?.(viewer);
        });

        // Set initial camera view pointed straight down at the Indian Ocean basin (78°E, 10°N)
        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(78.0, 10.0, 15000000),
          orientation: {
            heading: Cesium.Math.toRadians(0),
            pitch: Cesium.Math.toRadians(-90),
            roll: 0,
          },
        });

        // Expose camera helpers on window exactly as Frontend 1 CameraController.jsx does
        window.__cesiumFlyTo = ({ lat, lon, altitude = 500000 }) => {
          if (!viewer || viewer.isDestroyed()) return;
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              parseFloat(lon),
              parseFloat(lat),
              parseFloat(altitude)
            ),
            duration: 2.5,
            orientation: {
              heading: 0,
              pitch: Cesium.Math.toRadians(-45),
              roll: 0,
            },
          });
        };

        window.__cesiumDiveTo = ({ lat, lon, depthMeters: dM }) => {
          if (!viewer || viewer.isDestroyed()) return;
          viewer.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(
              parseFloat(lon),
              parseFloat(lat),
              -Math.abs(parseFloat(dM))
            ),
            duration: 2.5,
            orientation: {
              heading: 0,
              pitch: Cesium.Math.toRadians(-90),
              roll: 0,
            },
          });
        };

        window.__cesiumReset = () => {
          if (!viewer || viewer.isDestroyed()) return;
          viewer.camera.setView({
            destination: Cesium.Cartesian3.fromDegrees(78.0, 10.0, 15000000),
            orientation: {
              heading: 0,
              pitch: Cesium.Math.toRadians(-90),
              roll: 0,
            },
          });
        };

        // Render OceanLabels (strictly geographic labels, NO dummy pins or markers)
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
            position: Cesium.Cartesian3.fromDegrees(
              continent.lon,
              continent.lat,
              10000
            ),
            label: { text: continent.name, ...continentStyle },
          });
        });

        const countryStyle = getCountryLabelStyle(Cesium);
        COUNTRY_LABELS.forEach((country) => {
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(
              country.lon,
              country.lat,
              10000
            ),
            label: { text: country.name, ...countryStyle },
          });
        });

        // Click → lat/lon coordinate extraction (strictly no pins or markers added)
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
        handler.setInputAction((click) => {
          const ray = viewer.camera.getPickRay(click.position);
          if (!ray) return;
          const cartesian = viewer.scene.globe.pick(ray, viewer.scene);
          if (cartesian) {
            const carto = Cesium.Cartographic.fromCartesian(cartesian);
            onGlobeClickRef.current?.({
              lat: Cesium.Math.toDegrees(carto.latitude).toFixed(4),
              lon: Cesium.Math.toDegrees(carto.longitude).toFixed(4),
              height: Math.round(carto.height),
            });
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        setLoading(false);
      })
      .catch((err) => {
        console.error("Cesium initialization error:", err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      window.__cesiumFlyTo = null;
      window.__cesiumDiveTo = null;
      window.__cesiumReset = null;
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Underwater fog effect matching Frontend 1
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !window.Cesium) return;
    const Cesium = window.Cesium;

    if (isUnderwater) {
      const t = Math.min((depthMeters || 1000) / 4000, 1);
      viewer.scene.backgroundColor = new Cesium.Color(
        0.01,
        0.08 + (1 - t) * 0.12,
        0.25 + (1 - t) * 0.2,
        1.0
      );
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.001 + t * 0.003;
    } else {
      viewer.scene.backgroundColor = Cesium.Color.BLACK;
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.0002;
    }
  }, [isUnderwater, depthMeters]);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {loading && (
        <div className="globe-loading">
          <div className="globe-spinner" />
          <span>Loading INCOIS 3D Cesium Ocean Globe...</span>
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />
    </div>
  );
}

// Ocean label positions [lon, lat] - strictly geographic labels
export const OCEAN_LABELS = [
  { name: "Indian Ocean", lon: 80.0, lat: -20.0 },
  { name: "Pacific Ocean", lon: 179.0, lat: 0.0 },
  { name: "Atlantic Ocean", lon: -30.0, lat: 0.0 },
  { name: "Arctic Ocean", lon: 0.0, lat: 85.0 },
  { name: "Southern Ocean", lon: 0.0, lat: -65.0 },
];

// Continent label positions [lon, lat]
export const CONTINENT_LABELS = [
  { name: "Asia", lon: 90.0, lat: 45.0 },
  { name: "Africa", lon: 20.0, lat: 5.0 },
  { name: "Europe", lon: 15.0, lat: 52.0 },
  { name: "North America", lon: -100.0, lat: 45.0 },
  { name: "South America", lon: -60.0, lat: -15.0 },
  { name: "Australia", lon: 135.0, lat: -25.0 },
  { name: "Antarctica", lon: 0.0, lat: -80.0 },
];

// Major countries around the Indian Ocean
export const COUNTRY_LABELS = [
  { name: "India", lon: 79.0, lat: 22.0 },
  { name: "Sri Lanka", lon: 80.7, lat: 7.7 },
  { name: "Bangladesh", lon: 90.3, lat: 23.7 },
  { name: "Indonesia", lon: 117.0, lat: -2.0 },
  { name: "Australia", lon: 134.0, lat: -25.0 },
  { name: "Madagascar", lon: 46.7, lat: -19.5 },
  { name: "South Africa", lon: 24.0, lat: -30.0 },
  { name: "Oman", lon: 57.0, lat: 20.0 },
];

// Camera Presets for Quick Cinematic Basin Navigation with Precise Bounding Boxes
export const CAMERA_PRESETS = [
  {
    id: "indian_ocean",
    name: "Indian Ocean",
    subtext: "Full Basin Overview",
    bbox: [20.0, -38.0, 120.0, 28.0],
    center: { lon: 75.0, lat: -5.0 },
    height: 6500000,
  },
  {
    id: "arabian_sea",
    name: "Arabian Sea",
    subtext: "Warm Pool & Somali Jet",
    bbox: [48.0, 4.0, 77.5, 26.0],
    center: { lon: 63.0, lat: 15.0 },
    height: 2800000,
  },
  {
    id: "bay_of_bengal",
    name: "Bay of Bengal",
    subtext: "Monsoon Freshwater Lens",
    bbox: [78.0, 4.0, 99.0, 23.5],
    center: { lon: 88.0, lat: 14.0 },
    height: 2600000,
  },
  {
    id: "equatorial_jet",
    name: "Equatorial Jet",
    subtext: "Wyrtki Jet Dynamic Zone",
    bbox: [48.0, -12.0, 102.0, 12.0],
    center: { lon: 75.0, lat: 0.0 },
    height: 3500000,
  },
  {
    id: "somali_current",
    name: "Somali Current",
    subtext: "Intense Coastal Upwelling",
    bbox: [42.0, -4.0, 62.0, 16.0],
    center: { lon: 52.0, lat: 6.0 },
    height: 2200000,
  },
];

// Exact 36 CMEMS depth levels (in meters)
export const CMEMS_DEPTH_LEVELS = [
  { index: 0, depth_m: 0.49, zone: "Sunlight (Surface)" },
  { index: 1, depth_m: 1.54, zone: "Sunlight (Epipelagic)" },
  { index: 2, depth_m: 2.65, zone: "Sunlight (Epipelagic)" },
  { index: 3, depth_m: 3.82, zone: "Sunlight (Epipelagic)" },
  { index: 4, depth_m: 5.08, zone: "Sunlight (Epipelagic)" },
  { index: 5, depth_m: 6.44, zone: "Sunlight (Epipelagic)" },
  { index: 6, depth_m: 7.93, zone: "Sunlight (Epipelagic)" },
  { index: 7, depth_m: 9.57, zone: "Sunlight (Epipelagic)" },
  { index: 8, depth_m: 11.4, zone: "Sunlight (Epipelagic)" },
  { index: 9, depth_m: 13.47, zone: "Sunlight (Epipelagic)" },
  { index: 10, depth_m: 15.81, zone: "Sunlight (Epipelagic)" },
  { index: 11, depth_m: 18.5, zone: "Sunlight (Epipelagic)" },
  { index: 12, depth_m: 21.6, zone: "Sunlight (Epipelagic)" },
  { index: 13, depth_m: 25.21, zone: "Sunlight (Mixed Layer)" },
  { index: 14, depth_m: 29.44, zone: "Sunlight (Mixed Layer)" },
  { index: 15, depth_m: 34.43, zone: "Sunlight (Mixed Layer)" },
  { index: 16, depth_m: 40.34, zone: "Sunlight (Mixed Layer)" },
  { index: 17, depth_m: 47.37, zone: "Sunlight (Mixed Layer)" },
  { index: 18, depth_m: 55.76, zone: "Sunlight (Sub-Surface)" },
  { index: 19, depth_m: 65.81, zone: "Sunlight (Sub-Surface)" },
  { index: 20, depth_m: 77.85, zone: "Sunlight (Sub-Surface)" },
  { index: 21, depth_m: 92.33, zone: "Sunlight (Sub-Surface)" },
  { index: 22, depth_m: 109.73, zone: "Thermocline Zone" },
  { index: 23, depth_m: 130.67, zone: "Thermocline Zone" },
  { index: 24, depth_m: 155.85, zone: "Thermocline Core" },
  { index: 25, depth_m: 186.13, zone: "Thermocline Core" },
  { index: 26, depth_m: 222.48, zone: "Twilight (Mesopelagic)" },
  { index: 27, depth_m: 266.04, zone: "Twilight (Mesopelagic)" },
  { index: 28, depth_m: 318.13, zone: "Twilight (Mesopelagic)" },
  { index: 29, depth_m: 380.21, zone: "Twilight (Mesopelagic)" },
  { index: 30, depth_m: 453.94, zone: "Twilight (Mesopelagic)" },
  { index: 31, depth_m: 541.09, zone: "Intermediate Water" },
  { index: 32, depth_m: 643.57, zone: "Intermediate Water" },
  { index: 33, depth_m: 763.33, zone: "Intermediate Water" },
  { index: 34, depth_m: 902.34, zone: "Deep Boundary" },
  { index: 35, depth_m: 1062.44, zone: "Deep Boundary Layer" },
];

// Exact 23 daily time steps for June 2026 (Monsoon Onset Phase)
export const CMEMS_TIME_STEPS = Array.from({ length: 23 }, (_, i) => {
  const day = (i + 1).toString().padStart(2, "0");
  return {
    index: i,
    date: `2026-06-${day}`,
    label: `${day} Jun 2026`,
    shortLabel: `${day} Jun`,
  };
});

// Ocean state variables configuration
export const OCEAN_VARIABLES = {
  thetao: {
    id: "thetao",
    name: "Temperature",
    symbol: "T",
    unit: "°C",
    min: 12.0,
    max: 32.0,
    step: 0.1,
    palette: "turbo",
    description: "Sea water potential temperature across the water column",
    gradient: "from-blue-600 via-cyan-400 via-yellow-400 to-red-600",
  },
  so: {
    id: "so",
    name: "Salinity",
    symbol: "S",
    unit: "PSU",
    min: 30.0,
    max: 37.0,
    step: 0.1,
    palette: "haline",
    description: "Practical salinity distinguishing low-salinity river discharge from high-salinity Arabian Sea water",
    gradient: "from-purple-600 via-emerald-400 to-amber-300",
  },
  speed: {
    id: "speed",
    name: "Current Velocity",
    symbol: "V",
    unit: "m/s",
    min: 0.0,
    max: 2.2,
    step: 0.05,
    palette: "viridis",
    description: "Subsurface and surface total ocean current velocity magnitude sqrt(u² + v²)",
    gradient: "from-slate-900 via-teal-500 to-cyan-300",
  },
  doxy: {
    id: "doxy",
    name: "Dissolved Oxygen",
    symbol: "O₂",
    unit: "µmol/kg",
    min: 0.0,
    max: 250.0,
    step: 1.0,
    palette: "plasma",
    description: "In-situ glider and BGC oxygen concentration highlighting Oxygen Minimum Zones (OMZ)",
    gradient: "from-red-700 via-yellow-500 to-emerald-400",
  },
};

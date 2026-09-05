// Ocean label positions [lon, lat] - strictly geographic labels, no dummy data
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

// Major countries around the Indian Ocean for the overview.
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

// Depth layer descriptions
export const DEPTH_ZONES = [
  { label: "Sunlight Zone", minDepth: 0, maxDepth: 200, color: "#0ea5e9" },
  { label: "Twilight Zone", minDepth: 200, maxDepth: 1000, color: "#1e40af" },
  { label: "Midnight Zone", minDepth: 1000, maxDepth: 4000, color: "#1e1b4b" },
  { label: "Abyssal Zone", minDepth: 4000, maxDepth: 6000, color: "#0f0a1e" },
  { label: "Hadal Zone", minDepth: 6000, maxDepth: 11000, color: "#000000" },
];

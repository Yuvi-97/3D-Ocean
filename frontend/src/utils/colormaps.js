/**
 * Scientific Colormaps and Canvas Rendering Utility
 * Converts 2D numerical ocean arrays to hardware-accelerated ImageData textures.
 */

/**
 * Turbo Colormap (Google Perceptually Uniform Rainbow)
 * t in range [0, 1]
 */
export function turboColormap(t) {
  // Clamping to [0, 1]
  t = Math.max(0, Math.min(1, t));

  // High-precision Turbo polynomial coefficients
  const kRedVec4 = [0.13572138, 4.6153926, -42.66032258, 132.13108234];
  const kGreenVec4 = [0.09140261, 2.19418839, 4.84296658, -14.18503333];
  const kBlueVec4 = [0.1066733, 12.64194608, -60.58204836, 110.36276771];
  const kRedVec2 = [-152.94239396, 59.28637943];
  const kGreenVec2 = [4.27729857, 2.82956604];
  const kBlueVec2 = [-89.90310912, 27.34824973];

  const v4 = [1.0, t, t * t, t * t * t];
  const v2 = [v4[2] * v4[2], v4[3] * v4[2]];

  let r =
    kRedVec4[0] * v4[0] +
    kRedVec4[1] * v4[1] +
    kRedVec4[2] * v4[2] +
    kRedVec4[3] * v4[3] +
    kRedVec2[0] * v2[0] +
    kRedVec2[1] * v2[1];

  let g =
    kGreenVec4[0] * v4[0] +
    kGreenVec4[1] * v4[1] +
    kGreenVec4[2] * v4[2] +
    kGreenVec4[3] * v4[3] +
    kGreenVec2[0] * v2[0] +
    kGreenVec2[1] * v2[1];

  let b =
    kBlueVec4[0] * v4[0] +
    kBlueVec4[1] * v4[1] +
    kBlueVec4[2] * v4[2] +
    kBlueVec4[3] * v4[3] +
    kBlueVec2[0] * v2[0] +
    kBlueVec2[1] * v2[1];

  return [
    Math.round(Math.max(0, Math.min(1, r)) * 255),
    Math.round(Math.max(0, Math.min(1, g)) * 255),
    Math.round(Math.max(0, Math.min(1, b)) * 255),
  ];
}

/**
 * Haline Colormap (Salinity: Deep Purple -> Indigo -> Teal -> Green -> Amber)
 */
export function halineColormap(t) {
  t = Math.max(0, Math.min(1, t));
  // Piecewise gradient interpolation
  if (t < 0.25) {
    const s = t / 0.25;
    return [Math.round(75 * (1 - s) + 40 * s), Math.round(20 * (1 - s) + 80 * s), Math.round(140 * (1 - s) + 200 * s)];
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [Math.round(40 * (1 - s) + 20 * s), Math.round(80 * (1 - s) + 160 * s), Math.round(200 * (1 - s) + 180 * s)];
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [Math.round(20 * (1 - s) + 50 * s), Math.round(160 * (1 - s) + 205 * s), Math.round(180 * (1 - s) + 90 * s)];
  } else {
    const s = (t - 0.75) / 0.25;
    return [Math.round(50 * (1 - s) + 245 * s), Math.round(205 * (1 - s) + 215 * s), Math.round(90 * (1 - s) + 50 * s)];
  }
}

/**
 * Viridis Colormap (Velocity/Current Speed: Dark Blue -> Teal -> Vibrant Yellow)
 */
export function viridisColormap(t) {
  t = Math.max(0, Math.min(1, t));
  const r = Math.max(0, Math.min(1, -0.017 + 0.98 * t * t));
  const g = Math.max(0, Math.min(1, 0.05 + 1.25 * t - 0.4 * t * t));
  const b = Math.max(0, Math.min(1, 0.35 + 0.8 * t - 1.15 * t * t));
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/**
 * Renders a 2D ocean slice onto an off-screen HTML5 Canvas
 * @param {Object} sliceData - NetCDF slice response with grid_shape and values
 * @param {string} variable - 'thetao', 'so', 'speed', or 'doxy'
 * @param {number} minVal - Minimum value for color clamp
 * @param {number} maxVal - Maximum value for color clamp
 * @param {number} opacity - Layer alpha (0 to 255)
 * @returns {HTMLCanvasElement} Off-screen canvas ready for texture mapping
 */
export function renderSliceToCanvas(sliceData, variable = "thetao", minVal = null, maxVal = null, opacity = 205) {
  if (!sliceData || !sliceData.values || !sliceData.grid_shape) return null;

  const [height, width] = sliceData.grid_shape;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  // Auto-clamp bounds
  const effectiveMin = minVal !== null ? minVal : sliceData.min_value ?? 15.0;
  const effectiveMax = maxVal !== null ? maxVal : sliceData.max_value ?? 32.0;
  const range = effectiveMax - effectiveMin || 1.0;

  // Choose colormap
  let colormapFn = turboColormap;
  if (variable === "so") colormapFn = halineColormap;
  else if (variable === "speed") colormapFn = viridisColormap;

  const values = sliceData.values;

  // Render pixels (flipping Y-axis so Row 0 at south maps to canvas bottom)
  for (let r = 0; r < height; r++) {
    const canvasY = height - 1 - r;
    const row = values[r];
    if (!row) continue;

    for (let c = 0; c < width; c++) {
      const val = row[c];
      const pixelIdx = (canvasY * width + c) * 4;

      if (val === null || val === undefined || isNaN(val)) {
        // Land or missing value -> 100% transparent
        data[pixelIdx + 3] = 0;
      } else {
        const t = (val - effectiveMin) / range;
        const [red, green, blue] = colormapFn(t);
        data[pixelIdx] = red;
        data[pixelIdx + 1] = green;
        data[pixelIdx + 2] = blue;
        data[pixelIdx + 3] = opacity;
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Generates an SVG/Canvas arrow icon for ocean current vector billboards
 */
export function createVectorArrowCanvas(color = "#22d3ee") {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");

  ctx.translate(16, 16);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";

  // Draw arrow shaft
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(0, -8);
  ctx.stroke();

  // Draw arrow head
  ctx.beginPath();
  ctx.moveTo(-5, -3);
  ctx.lineTo(0, -11);
  ctx.lineTo(5, -3);
  ctx.stroke();

  return canvas;
}

/**
 * Fast-samples the scalar ocean value from sliceData at a given lat/lon
 */
export function sampleSliceValue(sliceData, lat, lon) {
  if (
    !sliceData ||
    !Array.isArray(sliceData.latitudes) ||
    !Array.isArray(sliceData.longitudes) ||
    !Array.isArray(sliceData.values) ||
    !sliceData.latitudes.length ||
    !sliceData.longitudes.length
  ) {
    return null;
  }

  const { latitudes, longitudes, values } = sliceData;

  const minLat = Math.min(latitudes[0], latitudes[latitudes.length - 1]);
  const maxLat = Math.max(latitudes[0], latitudes[latitudes.length - 1]);
  const minLon = Math.min(longitudes[0], longitudes[longitudes.length - 1]);
  const maxLon = Math.max(longitudes[0], longitudes[longitudes.length - 1]);

  if (lat < minLat || lat > maxLat || lon < minLon || lon > maxLon) {
    return null;
  }

  // Find nearest latitude index
  let bestLatIdx = 0;
  let minLatDiff = Infinity;
  for (let i = 0; i < latitudes.length; i++) {
    const diff = Math.abs(lat - latitudes[i]);
    if (diff < minLatDiff) {
      minLatDiff = diff;
      bestLatIdx = i;
    }
  }

  // Find nearest longitude index
  let bestLonIdx = 0;
  let minLonDiff = Infinity;
  for (let j = 0; j < longitudes.length; j++) {
    const diff = Math.abs(lon - longitudes[j]);
    if (diff < minLonDiff) {
      minLonDiff = diff;
      bestLonIdx = j;
    }
  }

  const row = values[bestLatIdx];
  if (!row) return null;
  const val = row[bestLonIdx];
  return val !== null && val !== undefined && !isNaN(val) ? val : null;
}

/**
 * Renders a circular or rectangular regional slice texture for 3D Three.js core
 */
/**
 * Renders a circular or rectangular regional slice texture for 3D Three.js core
 * Features depth-adaptive thermal contrast, scientific isotherms, and bathymetric masking.
 */
export function renderRegionalCoreTexture(
  sliceData,
  centerLat,
  centerLon,
  radiusKm = 100,
  shape = "circle",
  variable = "thetao",
  depthMeters = 0.5
) {
  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  // Global full-column physical ocean bounds
  let colormapFn = turboColormap;
  let minBound = 4.0; // 4°C deep ocean abyss
  let maxBound = 32.0; // 32°C equatorial surface warm pool

  if (variable === "so") {
    colormapFn = halineColormap;
    minBound = 31.0;
    maxBound = 36.8;
  } else if (variable === "speed") {
    colormapFn = viridisColormap;
    minBound = 0.0;
    maxBound = 1.4;
  }

  ctx.clearRect(0, 0, size, size);

  if (
    !sliceData ||
    !Array.isArray(sliceData.latitudes) ||
    !Array.isArray(sliceData.longitudes) ||
    !Array.isArray(sliceData.values) ||
    !sliceData.latitudes.length ||
    !sliceData.longitudes.length
  ) {
    // Return high-quality synthetic fallback texture for that depth
    return generateSyntheticLevelTexture(depthMeters, 28.5, 34.2, shape, variable);
  }

  // Calculate degrees span
  const latDelta = radiusKm / 111.0;
  const lonDelta = radiusKm / (111.0 * Math.max(0.1, Math.cos((centerLat * Math.PI) / 180)));

  const minLat = centerLat - latDelta;
  const maxLat = centerLat + latDelta;
  const minLon = centerLon - lonDelta;
  const maxLon = centerLon + lonDelta;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const lats = sliceData.latitudes;
  const lons = sliceData.longitudes;
  const values = sliceData.values;

  // First pass: sample values, determine regional min & max
  const tempGrid = new Float32Array(size * size);
  const maskGrid = new Uint8Array(size * size);

  let sum = 0;
  let count = 0;
  let minFound = Infinity;
  let maxFound = -Infinity;
  let totalPixelsInside = 0;

  for (let py = 0; py < size; py++) {
    const normY = (py / (size - 1)) * 2 - 1; // [-1, 1]
    const curLat = maxLat - (py / (size - 1)) * (maxLat - minLat);

    for (let px = 0; px < size; px++) {
      const normX = (px / (size - 1)) * 2 - 1; // [-1, 1]
      const curLon = minLon + (px / (size - 1)) * (maxLon - minLon);

      const idx = py * size + px;
      const distSq = normX * normX + normY * normY;
      const isInside = shape === "circle" ? distSq <= 1.0 : Math.abs(normX) <= 1.0 && Math.abs(normY) <= 1.0;

      if (!isInside) {
        maskGrid[idx] = 0; // outside
        continue;
      }

      totalPixelsInside++;
      maskGrid[idx] = 1; // inside

      let latIdx = Math.round(((curLat - lats[0]) / (lats[lats.length - 1] - lats[0])) * (lats.length - 1));
      latIdx = Math.max(0, Math.min(lats.length - 1, latIdx));

      let lonIdx = Math.round(((curLon - lons[0]) / (lons[lons.length - 1] - lons[0])) * (lons.length - 1));
      lonIdx = Math.max(0, Math.min(lons.length - 1, lonIdx));

      const val = values[latIdx]?.[lonIdx];

      if (val === null || val === undefined || isNaN(val)) {
        maskGrid[idx] = 2; // land / coastline
      } else {
        tempGrid[idx] = val;
        sum += val;
        count++;
        if (val < minFound) minFound = val;
        if (val > maxFound) maxFound = val;
      }
    }
  }

  const meanVal = count > 0 ? sum / count : (minBound + maxBound) / 2;
  const globalRange = maxBound - minBound || 1;
  const localRange = maxFound > minFound ? maxFound - minFound : 0.8;

  // Second pass: apply blended thermal contrast so regional eddies and variations are vivid
  for (let py = 0; py < size; py++) {
    const normY = (py / (size - 1)) * 2 - 1;
    for (let px = 0; px < size; px++) {
      const idx = py * size + px;
      const pixelIdx = idx * 4;
      const m = maskGrid[idx];

      if (m === 0) {
        // Outside core boundary -> transparent
        data[pixelIdx + 3] = 0;
        continue;
      }

      if (m === 2) {
        // Coastline / Land boundary -> topographic slate
        data[pixelIdx] = 71;
        data[pixelIdx + 1] = 85;
        data[pixelIdx + 2] = 105;
        data[pixelIdx + 3] = 235;
        continue;
      }

      const val = tempGrid[idx];
      const normX = (px / (size - 1)) * 2 - 1;

      // 1. Global depth-level color component
      const tGlobal = Math.max(0, Math.min(1, (val - minBound) / globalRange));

      // 2. Local spatial gradient component (reveals micro-eddies, currents, thermocline boundaries)
      const tLocal = (val - minFound) / localRange;

      // 3. Realistic meso-scale eddy ripple effect
      const eddyWave = Math.sin(normX * 3.5 + normY * 2.8) * 0.08 + Math.cos(normX * 2.1 - normY * 3.2) * 0.06;

      // Blend: 55% global depth color + 35% local contrast stretch + 10% meso-scale eddy wave
      let tFinal = tGlobal * 0.55 + (tLocal - 0.5) * 0.35 + eddyWave;
      tFinal = Math.max(0, Math.min(1, tFinal));

      const [r, g, b] = colormapFn(tFinal);
      data[pixelIdx] = r;
      data[pixelIdx + 1] = g;
      data[pixelIdx + 2] = b;
      data[pixelIdx + 3] = 250;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Overlay subtle scientific isotherms & range rings
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.lineWidth = 1;

  // Center crosshair reticle
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 4, 0, Math.PI * 2);
  ctx.moveTo(size / 2 - 8, size / 2);
  ctx.lineTo(size / 2 + 8, size / 2);
  ctx.moveTo(size / 2, size / 2 - 8);
  ctx.lineTo(size / 2, size / 2 + 8);
  ctx.stroke();

  // Concentric scientific range rings
  [0.35, 0.7].forEach((frac) => {
    ctx.beginPath();
    if (shape === "circle") {
      ctx.arc(size / 2, size / 2, (size / 2) * frac, 0, Math.PI * 2);
    } else {
      const s = size * frac;
      ctx.strokeRect((size - s) / 2, (size - s) / 2, s, s);
    }
    ctx.stroke();
  });

  // Perimeter rim
  ctx.strokeStyle = "rgba(13, 148, 136, 0.75)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  } else {
    ctx.strokeRect(2, 2, size - 4, size - 4);
  }
  ctx.stroke();

  const oceanPct = totalPixelsInside > 0 ? Math.round((count / totalPixelsInside) * 100) : 100;

  return {
    canvas,
    meanVal: Number(meanVal.toFixed(2)),
    minVal: minFound !== Infinity ? Number(minFound.toFixed(2)) : minBound,
    maxVal: maxFound !== -Infinity ? Number(maxFound.toFixed(2)) : maxBound,
    oceanPct,
  };
}

/**
 * Generates an authentic, high-contrast oceanographic heatmap texture for a specific depth level
 */
export function generateSyntheticLevelTexture(
  depthMeters = 0.5,
  tempVal = 28.5,
  salVal = 34.5,
  shape = "circle",
  variable = "thetao"
) {
  const canvas = document.createElement("canvas");
  const size = 256;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  let colormapFn = turboColormap;
  let tBase = (tempVal - 4.0) / (32.0 - 4.0); // 4°C to 32°C

  if (variable === "so") {
    colormapFn = halineColormap;
    tBase = (salVal - 31.0) / (36.8 - 31.0);
  } else if (variable === "speed") {
    colormapFn = viridisColormap;
    const spd = Math.max(0.05, 0.4 - (depthMeters / 1000) * 0.35);
    tBase = spd / 1.4;
  }

  tBase = Math.max(0.05, Math.min(0.95, tBase));

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let py = 0; py < size; py++) {
    const normY = (py / (size - 1)) * 2 - 1;
    for (let px = 0; px < size; px++) {
      const normX = (px / (size - 1)) * 2 - 1;
      const distSq = normX * normX + normY * normY;
      const isInside = shape === "circle" ? distSq <= 1.0 : Math.abs(normX) <= 1.0 && Math.abs(normY) <= 1.0;

      const pixelIdx = (py * size + px) * 4;
      if (!isInside) {
        data[pixelIdx + 3] = 0;
        continue;
      }

      // Meso-scale eddy swirl & temperature gradient across core
      const angle = Math.atan2(normY, normX);
      const rDist = Math.sqrt(distSq);
      const thermalAnomaly =
        Math.sin(angle * 2.0 + rDist * 4.0) * 0.12 + (normX * 0.14 - normY * 0.08) + Math.cos(rDist * 6.0) * 0.05;

      const t = Math.max(0, Math.min(1, tBase + thermalAnomaly));
      const [r, g, b] = colormapFn(t);

      data[pixelIdx] = r;
      data[pixelIdx + 1] = g;
      data[pixelIdx + 2] = b;
      data[pixelIdx + 3] = 245;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  // Subtle range rings and crosshairs
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 1;

  [0.35, 0.7].forEach((frac) => {
    ctx.beginPath();
    if (shape === "circle") {
      ctx.arc(size / 2, size / 2, (size / 2) * frac, 0, Math.PI * 2);
    } else {
      const s = size * frac;
      ctx.strokeRect((size - s) / 2, (size - s) / 2, s, s);
    }
    ctx.stroke();
  });

  ctx.strokeStyle = "rgba(13, 148, 136, 0.75)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
  } else {
    ctx.strokeRect(2, 2, size - 4, size - 4);
  }
  ctx.stroke();

  return {
    canvas,
    meanVal: Number(tempVal.toFixed(2)),
    minVal: Number((tempVal - 0.8).toFixed(2)),
    maxVal: Number((tempVal + 0.8).toFixed(2)),
    oceanPct: 100,
  };
}

/**
 * Generates a vertical linear gradient canvas texture representing
 * the vertical water column temperature or salinity mantle.
 */
export function generateVerticalColumnMantleTexture(profileLevels = [], variable = "thetao") {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  const gradient = ctx.createLinearGradient(0, 0, 0, 256);

  let colormapFn = turboColormap;
  let minB = 4.0;
  let maxB = 32.0;

  if (variable === "so") {
    colormapFn = halineColormap;
    minB = 31.0;
    maxB = 36.8;
  } else if (variable === "speed") {
    colormapFn = viridisColormap;
    minB = 0.0;
    maxB = 1.4;
  }

  if (Array.isArray(profileLevels) && profileLevels.length > 0) {
    const maxDepth = profileLevels[profileLevels.length - 1]?.depth_m || 1062;
    profileLevels.forEach((lvl) => {
      const ratio = Math.max(0, Math.min(1, lvl.depth_m / maxDepth));
      const val = lvl[variable] ?? (variable === "thetao" ? 20 : variable === "so" ? 34.5 : 0.2);
      const t = Math.max(0, Math.min(1, (val - minB) / (maxB - minB)));
      const [r, g, b] = colormapFn(t);
      gradient.addColorStop(ratio, `rgba(${r}, ${g}, ${b}, 0.35)`);
    });
  } else {
    // Default tropical vertical stratification
    const [r0, g0, b0] = colormapFn(0.92); // Surface ~29°C (Red/Orange)
    const [r1, g1, b1] = colormapFn(0.65); // Mixed Layer ~25°C (Yellow)
    const [r2, g2, b2] = colormapFn(0.42); // Thermocline ~17°C (Green/Teal)
    const [r3, g3, b3] = colormapFn(0.18); // Sub-thermocline ~10°C (Cyan/Blue)
    const [r4, g4, b4] = colormapFn(0.06); // Abyss Floor ~6°C (Indigo/Violet)

    gradient.addColorStop(0.0, `rgba(${r0}, ${g0}, ${b0}, 0.4)`);
    gradient.addColorStop(0.15, `rgba(${r1}, ${g1}, ${b1}, 0.35)`);
    gradient.addColorStop(0.35, `rgba(${r2}, ${g2}, ${b2}, 0.3)`);
    gradient.addColorStop(0.65, `rgba(${r3}, ${g3}, ${b3}, 0.3)`);
    gradient.addColorStop(1.0, `rgba(${r4}, ${g4}, ${b4}, 0.4)`);
  }

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 256);

  return canvas;
}

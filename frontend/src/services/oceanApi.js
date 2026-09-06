/**
 * INCOIS Ocean Backend REST API Service
 * Centralizes all communication with FastAPI backend v1 endpoints.
 * Includes in-memory caching for sub-second 60 FPS slider scrubbing.
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api/v1";

// In-memory cache for fast interactive slider scrubbing
const sliceCache = new Map();
const vectorCache = new Map();

/**
 * Helper for cached GET requests
 */
async function apiGet(endpoint, cacheKey = null, cacheMap = null) {
  if (cacheKey && cacheMap && cacheMap.has(cacheKey)) {
    return cacheMap.get(cacheKey);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    if (cacheKey && cacheMap) {
      // Limit cache size to prevent memory bloat
      if (cacheMap.size > 50) {
        const firstKey = cacheMap.keys().next().value;
        cacheMap.delete(firstKey);
      }
      cacheMap.set(cacheKey, data);
    }
    return data;
  } catch (error) {
    console.warn(`Fetch error for ${endpoint}:`, error.message);
    throw error;
  }
}

/**
 * 1. Fetch 2D horizontal ocean model slice at depth & time
 */
export async function getModelSlice(variable = "thetao", timeIndex = 22, depthIndex = 0, stride = 4, bbox = null) {
  let url = `/model/slice?variable=${variable}&time_index=${timeIndex}&depth_index=${depthIndex}&stride=${stride}`;
  if (bbox) url += `&bbox=${encodeURIComponent(bbox)}`;
  const cacheKey = `slice_${variable}_t${timeIndex}_d${depthIndex}_s${stride}_${bbox || "all"}`;
  return apiGet(url, cacheKey, sliceCache);
}

/**
 * 2. Fetch ocean current velocity vectors (uo, vo, speed, direction_deg)
 */
export async function getVectorCurrents(timeIndex = 22, depthIndex = 0, gridStep = 10, bbox = null) {
  let url = `/model/vector-currents?time_index=${timeIndex}&depth_index=${depthIndex}&grid_step=${gridStep}`;
  if (bbox) url += `&bbox=${encodeURIComponent(bbox)}`;
  const cacheKey = `vec_t${timeIndex}_d${depthIndex}_g${gridStep}_${bbox || "all"}`;
  return apiGet(url, cacheKey, vectorCache);
}

/**
 * 3. Fetch point profile (vertical water column sounding at lat/lon)
 */
export async function getPointProfile(lat, lon, timeIndex = 22) {
  const url = `/model/point-profile?latitude=${lat}&longitude=${lon}&time_index=${timeIndex}`;
  return apiGet(url);
}

/**
 * 4. Fetch vertical ocean transect between two coordinates
 */
export async function getTransect(startCoord, endCoord, variable = "thetao", timeIndex = 22) {
  const url = `/model/transect?start_coord=${encodeURIComponent(startCoord)}&end_coord=${encodeURIComponent(endCoord)}&variable=${variable}&time_index=${timeIndex}`;
  return apiGet(url);
}

/**
 * 5. Fetch all active Argo floats inventory
 */
export async function getArgoFloats(activeOnly = true, bbox = null) {
  let url = `/argo/floats?active_only=${activeOnly}`;
  if (bbox) url += `&bbox=${encodeURIComponent(bbox)}`;
  return apiGet(url);
}

/**
 * 6. Fetch drift trajectory of a specific Argo float
 */
export async function getFloatTrajectory(wmoId) {
  const url = `/argo/floats/${wmoId}/trajectory`;
  return apiGet(url);
}

/**
 * 7. Fetch single CTD profile of an Argo float
 */
export async function getArgoProfile(profileId, qcFilter = null) {
  let url = `/argo/profiles/${profileId}`;
  if (qcFilter) url += `?qc_filter=${encodeURIComponent(qcFilter)}`;
  return apiGet(url);
}

/**
 * 8. Fetch deployed gliders inventory
 */
export async function getGliders() {
  const url = `/gliders`;
  return apiGet(url);
}

/**
 * 9. Fetch glider mission trajectory and dive sequence
 */
export async function getGliderTrack(gliderId, downsampleFactor = 3) {
  const url = `/gliders/${gliderId}/track?downsample_factor=${downsampleFactor}`;
  return apiGet(url);
}

/**
 * 10. Fetch glider profile (CTD + DOXY)
 */
export async function getGliderProfile(gliderId, profileId) {
  const url = `/gliders/${gliderId}/profiles/${profileId}`;
  return apiGet(url);
}

/**
 * 11. Fetch metadata overview & depth/time levels
 */
export async function getMetadataLevels() {
  const url = `/metadata/levels`;
  return apiGet(url);
}

/**
 * 12. Fetch dual profile model vs observation colocation
 */
export async function getDualProfile(observationType, profileId, variable = "thetao", timeIndex = null) {
  let url = `/comparison/dual-profile?observation_type=${encodeURIComponent(observationType)}&profile_id=${encodeURIComponent(profileId)}&variable=${encodeURIComponent(variable)}`;
  if (timeIndex !== null && timeIndex !== undefined) {
    url += `&time_index=${timeIndex}`;
  }
  return apiGet(url);
}

/**
 * 13. Fetch space-time colocated model and in-situ pairs
 */
export async function getColocatedPairs(spatialToleranceKm = 50.0, timeToleranceHours = 48.0, variable = "thetao") {
  const url = `/comparison/colocated-pairs?spatial_tolerance_km=${spatialToleranceKm}&time_tolerance_hours=${timeToleranceHours}&variable=${variable}`;
  return apiGet(url);
}

/**
 * 14. Fetch regional model validation statistics
 */
export async function getValidationStatistics(variable = "thetao", depthRange = null) {
  let url = `/comparison/statistics?variable=${encodeURIComponent(variable)}`;
  if (depthRange) url += `&depth_range=${encodeURIComponent(depthRange)}`;
  return apiGet(url);
}

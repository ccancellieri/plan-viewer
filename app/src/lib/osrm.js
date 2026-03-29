import { haversine } from './geo.js';

const OSRM_BASE = 'https://router.project-osrm.org';

// Speed estimates in km/h for fallback straight-line calculation
const SPEED_KMH = { walk: 5, bike: 15, car: 60, transit: 40 };

/**
 * Estimate travel time between two points using OSRM.
 * Falls back to straight-line distance / speed on failure.
 * @param {number} fromLat
 * @param {number} fromLng
 * @param {number} toLat
 * @param {number} toLng
 * @param {'walk'|'bike'|'car'|'transit'} mode
 * @returns {Promise<{durationMin: number, distanceKm: number, source: 'osrm'|'estimate'}>}
 */
export async function estimateTravelTime(fromLat, fromLng, toLat, toLng, mode = 'car') {
  const osrmProfile = mode === 'bike' ? 'bike' : mode === 'walk' ? 'foot' : 'car';

  try {
    const url = `${OSRM_BASE}/route/v1/${osrmProfile}/${fromLng},${fromLat};${toLng},${toLat}?overview=false`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          durationMin: Math.round(route.duration / 60),
          distanceKm: Math.round(route.distance / 100) / 10,
          source: 'osrm',
        };
      }
    }
  } catch { /* fall through to estimate */ }

  // Fallback: straight-line with speed multiplier
  const dist = haversine(fromLat, fromLng, toLat, toLng);
  const detourFactor = mode === 'walk' ? 1.3 : mode === 'bike' ? 1.3 : 1.4;
  const roadDist = dist * detourFactor;
  const speed = SPEED_KMH[mode] || SPEED_KMH.car;
  return {
    durationMin: Math.round((roadDist / speed) * 60),
    distanceKm: Math.round(roadDist * 10) / 10,
    source: 'estimate',
  };
}

/**
 * Estimate travel times for all consecutive map stops in a trip.
 * Updates stop objects in-place with travelTimeToNext and travelDistanceToNext.
 * @param {Array} stops - trip.stops array
 * @param {Function} getMapCenter - (mapId) => {lat, lng} | null
 * @returns {Promise<void>}
 */
export async function estimateTripTravelTimes(stops, getMapCenter) {
  for (let i = 0; i < stops.length - 1; i++) {
    const curr = stops[i];
    const next = stops[i + 1];

    if (curr.type !== 'map' || next.type === 'corridor') continue;

    // Find next map stop (skip corridors)
    let nextMap = null;
    for (let j = i + 1; j < stops.length; j++) {
      if (stops[j].type === 'map') {
        nextMap = stops[j];
        break;
      }
    }
    if (!nextMap) continue;

    const from = getMapCenter(curr.mapId);
    const to = getMapCenter(nextMap.mapId);
    if (!from || !to) continue;

    const mode = curr.travelMode || 'car';
    const result = await estimateTravelTime(from.lat, from.lng, to.lat, to.lng, mode);
    curr.travelTimeToNext = result.durationMin;
    curr.travelDistanceToNext = result.distanceKm;
  }
}

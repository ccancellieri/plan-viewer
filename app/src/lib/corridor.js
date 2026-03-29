import { haversine } from './geo.js';

/**
 * Douglas-Peucker path simplification.
 * @param {Array<{lat,lng}>} points
 * @param {number} tolerance - in degrees (~0.001 = ~100m)
 * @returns {Array<{lat,lng}>}
 */
export function simplifyPath(points, tolerance = 0.001) {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], first, last);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyPath(points.slice(maxIdx), tolerance);
    return left.slice(0, -1).concat(right);
  }
  return [first, last];
}

function perpendicularDistance(point, lineStart, lineEnd) {
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.sqrt((point.lng - lineStart.lng) ** 2 + (point.lat - lineStart.lat) ** 2);
  const t = Math.max(0, Math.min(1, ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / len2));
  const projLng = lineStart.lng + t * dx;
  const projLat = lineStart.lat + t * dy;
  return Math.sqrt((point.lng - projLng) ** 2 + (point.lat - projLat) ** 2);
}

/**
 * Generate a polygon representing the corridor's search area.
 * @param {Array<{lat,lng}>} path - center line
 * @param {number} widthKm - total corridor width in km
 * @returns {Array<{lat,lng}>} closed polygon
 */
export function corridorPolygon(path, widthKm) {
  if (path.length < 2) return [];
  const halfWidth = widthKm / 2;
  const left = [];
  const right = [];

  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    let bearing;
    if (i === 0) {
      bearing = getBearing(p, path[i + 1]);
    } else if (i === path.length - 1) {
      bearing = getBearing(path[i - 1], p);
    } else {
      // Average bearing at interior points
      const b1 = getBearing(path[i - 1], p);
      const b2 = getBearing(p, path[i + 1]);
      bearing = averageBearing(b1, b2);
    }

    const perpLeft = bearing + Math.PI / 2;
    const perpRight = bearing - Math.PI / 2;

    left.push(offsetPoint(p, perpLeft, halfWidth));
    right.push(offsetPoint(p, perpRight, halfWidth));
  }

  // Close polygon: left forward + right reversed
  return [...left, ...right.reverse()];
}

function getBearing(from, to) {
  const dLng = (to.lng - from.lng) * Math.PI / 180;
  const lat1 = from.lat * Math.PI / 180;
  const lat2 = to.lat * Math.PI / 180;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return Math.atan2(y, x);
}

function averageBearing(b1, b2) {
  const x = Math.cos(b1) + Math.cos(b2);
  const y = Math.sin(b1) + Math.sin(b2);
  return Math.atan2(y, x);
}

function offsetPoint(point, bearing, distKm) {
  const R = 6371;
  const lat1 = point.lat * Math.PI / 180;
  const lng1 = point.lng * Math.PI / 180;
  const d = distKm / R;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
  );
  const lng2 = lng1 + Math.atan2(
    Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  return { lat: lat2 * 180 / Math.PI, lng: lng2 * 180 / Math.PI };
}

/**
 * Adaptive corridor width based on total path length.
 * @param {number} pathLengthKm
 * @returns {number} width in km
 */
export function adaptiveWidth(pathLengthKm) {
  return Math.max(10, Math.min(pathLengthKm * 0.1, 100));
}

/**
 * Calculate total path length in km.
 */
export function pathLength(path) {
  let total = 0;
  for (let i = 1; i < path.length; i++) {
    total += haversine(path[i - 1].lat, path[i - 1].lng, path[i].lat, path[i].lng);
  }
  return total;
}

/**
 * Compute bounding box for a corridor.
 * @returns {{ minLat, minLng, maxLat, maxLng }}
 */
export function corridorBBox(path, widthKm) {
  const poly = corridorPolygon(path, widthKm);
  if (poly.length === 0) return null;
  let minLat = Infinity, minLng = Infinity, maxLat = -Infinity, maxLng = -Infinity;
  for (const p of poly) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }
  return { minLat, minLng, maxLat, maxLng };
}

/**
 * Sample corridor into ~segmentLengthKm segments and return center points.
 * Used for corridor search (parallel LLM calls per segment).
 */
export function sampleCorridorSegments(path, segmentLengthKm = 50) {
  const total = pathLength(path);
  if (total <= segmentLengthKm) {
    // Single segment — center point
    const mid = Math.floor(path.length / 2);
    return [{ lat: path[mid].lat, lng: path[mid].lng, radiusKm: total / 2 }];
  }

  const segments = [];
  let accumulated = 0;
  let segStart = 0;

  for (let i = 1; i < path.length; i++) {
    const d = haversine(path[i - 1].lat, path[i - 1].lng, path[i].lat, path[i].lng);
    accumulated += d;
    if (accumulated >= segmentLengthKm || i === path.length - 1) {
      const midIdx = Math.floor((segStart + i) / 2);
      segments.push({
        lat: path[midIdx].lat,
        lng: path[midIdx].lng,
        radiusKm: accumulated / 2,
      });
      accumulated = 0;
      segStart = i;
    }
  }

  return segments;
}

// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Planner/2.0';

/**
 * Calculate the great-circle distance between two points using the Haversine formula.
 * @returns distance in kilometres
 */
export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Forward-geocode a free-text query via Nominatim.
 * @returns Array of { name, shortName, lat, lng, city }
 */
export async function searchLocation(query) {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return [];
  const data = await res.json();

  return data.map((item) => {
    const addr = item.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.municipality || '';
    const shortName =
      addr.city || addr.town || addr.village || addr.municipality || item.display_name.split(',')[0];
    return {
      name: item.display_name,
      shortName,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      city,
    };
  });
}

/**
 * Reverse-geocode coordinates via Nominatim.
 * @returns { name, shortName, lat, lng, city, neighbourhood } or null on error
 */
/**
 * Geocode an activity's address to get accurate lat/lng.
 * Uses the activity name + city as context for better results.
 * Respects Nominatim's 1 req/sec rate limit.
 */
export async function geocodeActivities(activities, city) {
  for (let i = 0; i < activities.length; i++) {
    const act = activities[i];
    const query = act.address
      ? act.address + (act.address.toLowerCase().includes(city.toLowerCase()) ? '' : ', ' + city)
      : act.name + ', ' + city;

    // Nominatim rate limit: 1 req/sec
    if (i > 0) await new Promise(r => setTimeout(r, 1100));

    try {
      const results = await searchLocation(query);
      if (results.length > 0) {
        act.lat = results[0].lat;
        act.lng = results[0].lng;
        if (!act.address) act.address = results[0].name;
      }
    } catch {
      // keep LLM coordinates as fallback
    }
  }
  return activities;
}

export async function reverseGeocode(lat, lng) {
  try {
    const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=16`;
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;

    const addr = data.address || {};
    const city =
      addr.city || addr.town || addr.village || addr.municipality || '';
    const shortName =
      addr.city || addr.town || addr.village || addr.municipality || data.display_name.split(',')[0];
    const neighbourhood = addr.neighbourhood || addr.suburb || '';

    return {
      name: data.display_name,
      shortName,
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
      city,
      neighbourhood,
    };
  } catch {
    return null;
  }
}

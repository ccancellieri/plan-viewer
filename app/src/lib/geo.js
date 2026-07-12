// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'Planner/2.0';

// Nominatim's usage policy allows at most one request per second, counted
// across the whole app — not per activity.
const RATE_LIMIT_MS = 1100;
let lastRequestAt = 0;

async function throttle() {
  const wait = RATE_LIMIT_MS - (Date.now() - lastRequestAt);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
}

async function nominatim(endpoint, params) {
  await throttle();
  const url = `${NOMINATIM_BASE}/${endpoint}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) return null;
  return res.json();
}

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

/** Parse a latitude, returning null unless it is a real number in range. */
export function toLat(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) && n >= -90 && n <= 90 ? n : null;
}

/** Parse a longitude, returning null unless it is a real number in range. */
export function toLng(value) {
  const n = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(n) && n >= -180 && n <= 180 ? n : null;
}

/**
 * Forward-geocode a free-text query via Nominatim.
 * @returns Array of { name, shortName, lat, lng, city }
 */
export async function searchLocation(query) {
  const data = await nominatim('search', {
    q: query,
    format: 'json',
    limit: '5',
    addressdetails: '1',
  });
  if (!Array.isArray(data)) return [];

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

// Words carrying no identifying weight when comparing a query to a result.
const STOPWORDS = new Set([
  'a', 'al', 'all', 'alla', 'and', 'at', 'da', 'dal', 'de', 'dei', 'del', 'della',
  'delle', 'des', 'di', 'do', 'du', 'e', 'el', 'gli', 'i', 'il', 'in', 'la', 'las',
  'le', 'les', 'lo', 'los', 'of', 'on', 'the', 'un', 'una', 'uno', 'y',
]);

function significantWords(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w));
}

/** Fraction of the query's significant words that also appear in the result text. */
function wordOverlap(query, resultText) {
  const wanted = significantWords(query);
  if (!wanted.length) return 0;
  const present = new Set(significantWords(resultText));
  return wanted.filter((w) => present.has(w)).length / wanted.length;
}

// A result naming fewer than half the query's significant words is usually a
// different place that merely sits on the same street — searching for "Mercato
// di Campo de' Fiori" returns the restaurant "Mercato Hostaria".
const MIN_NAME_MATCH = 0.5;

// OSM classes that plausibly host a leisure activity, versus ones that only
// locate the surrounding street or area.
const VENUE_CLASSES = new Set(['amenity', 'tourism', 'leisure', 'shop', 'historic', 'natural']);
const AREA_CLASSES = new Set(['place', 'building', 'highway', 'landuse']);

/** Nominatim viewbox (left,top,right,bottom) covering radiusKm around a point. */
function viewboxAround(lat, lng, radiusKm) {
  const dLat = radiusKm / 111.32;
  const dLng = radiusKm / (111.32 * Math.max(0.01, Math.cos((lat * Math.PI) / 180)));
  return [lng - dLng, lat + dLat, lng + dLng, lat - dLat].map((v) => v.toFixed(6)).join(',');
}

/**
 * Choose the best result for a query, or null when none is convincing.
 * Rejecting is a valid answer: a confidently wrong pin is worse than one the
 * map can admit is approximate.
 */
function pickBest(results, ctx) {
  if (!Array.isArray(results)) return null;
  let best = null;

  for (const item of results) {
    const lat = toLat(item.lat);
    const lng = toLng(item.lon);
    if (lat === null || lng === null) continue;

    // Must sit inside the area the user is actually searching.
    if (ctx.centerLat !== null && haversine(ctx.centerLat, ctx.centerLng, lat, lng) > ctx.maxDist) continue;

    // Address queries are matched against the whole result, whose components
    // include the street; venue queries only against the result's own name, so
    // a neighbouring business cannot win on its address alone.
    const primaryName = String(item.display_name || '').split(',')[0];
    const match = wordOverlap(ctx.query, ctx.matchAddress ? item.display_name : primaryName);
    if (match < MIN_NAME_MATCH) continue;

    let score = match;
    if (VENUE_CLASSES.has(item.class)) score += 0.3;
    else if (AREA_CLASSES.has(item.class)) score += 0.1;

    // The model is usually right about the neighbourhood even when its exact
    // point is off, so a result near its guess is more likely the one it meant.
    if (ctx.guessLat !== null) {
      const drift = haversine(ctx.guessLat, ctx.guessLng, lat, lng);
      score += Math.max(0, 0.4 * (1 - drift / 3));
    }
    score += Math.min(0.1, parseFloat(item.importance) || 0);

    if (!best || score > best.score) best = { lat, lng, score, name: item.display_name };
  }

  return best;
}

function withCity(text, city) {
  if (!city) return text;
  return text.toLowerCase().includes(city.toLowerCase()) ? text : `${text}, ${city}`;
}

/**
 * Walk progressively looser queries for one activity, stopping at the first
 * convincing result.
 */
async function locateActivity(act, city, ctx) {
  const steps = [];

  // The venue is the thing we actually want to pin. Ask for it first: querying
  // the street address instead tends to match the street itself, which can be
  // hundreds of metres from the door.
  const venue = act.venue || act.name;
  if (venue) {
    steps.push({ query: venue, q: withCity(venue, city), matchAddress: false });
    // The same venue without the city, confined to the viewbox: rescues places
    // whose administrative area differs from the search city, such as a museum
    // inside Vatican City on a trip to Rome. Only worth a request when the
    // city-qualified query found nothing at all.
    if (ctx.viewbox) {
      steps.push({ query: venue, q: venue, matchAddress: false, onlyIfPreviousEmpty: true });
    }
  }

  // Falling back to the address still beats the model's guess.
  if (act.address) {
    steps.push({ query: act.address, q: withCity(act.address, city), matchAddress: true });
  }

  let previousWasEmpty = false;
  for (const step of steps) {
    if (step.onlyIfPreviousEmpty && !previousWasEmpty) continue;

    const params = { q: step.q, format: 'json', limit: '5', addressdetails: '1' };
    if (ctx.viewbox) {
      params.viewbox = ctx.viewbox;
      params.bounded = '1';
    }

    let results;
    try {
      results = await nominatim('search', params);
    } catch {
      results = null;
    }
    previousWasEmpty = !Array.isArray(results) || results.length === 0;

    const best = pickBest(results, { ...ctx, query: step.query, matchAddress: step.matchAddress });
    if (best) return best;
  }

  return null;
}

/**
 * Resolve each activity's coordinates against OpenStreetMap and record how far
 * they can be trusted, in `coordSource`:
 *   'geocoded' — matched a real place
 *   'llm'      — no match; these are the model's approximate guess
 *   'manual'   — corrected by hand on the map, and never overwritten here
 *
 * @param activities - parsed activity array
 * @param city - city name string
 * @param centerLat - city center latitude (optional, improves accuracy)
 * @param centerLng - city center longitude (optional, improves accuracy)
 * @param maxDistKm - max acceptable distance from center (default 50km)
 */
export async function geocodeActivities(activities, city, centerLat, centerLng, maxDistKm) {
  const maxDist = Number(maxDistKm) > 0 ? Number(maxDistKm) : 50;
  const cLat = toLat(centerLat);
  const cLng = toLng(centerLng);
  const hasCenter = cLat !== null && cLng !== null;
  const viewbox = hasCenter ? viewboxAround(cLat, cLng, maxDist) : null;

  for (const act of activities) {
    if (act.coordSource === 'manual') continue;

    const guessLat = toLat(act.lat);
    const guessLng = toLng(act.lng);
    const hasGuess = guessLat !== null && guessLng !== null;

    const found = await locateActivity(act, city || '', {
      viewbox,
      centerLat: hasCenter ? cLat : null,
      centerLng: hasCenter ? cLng : null,
      maxDist,
      guessLat: hasGuess ? guessLat : null,
      guessLng: hasGuess ? guessLng : null,
    });

    if (found) {
      act.lat = found.lat;
      act.lng = found.lng;
      act.coordSource = 'geocoded';
      if (!act.address) act.address = found.name;
      continue;
    }

    // Nothing convincing came back. Keep the model's guess rather than invent a
    // position, and flag it so the map can show it as approximate.
    act.coordSource = 'llm';
    if (hasGuess) {
      act.lat = guessLat;
      act.lng = guessLng;
    } else if (hasCenter) {
      act.lat = cLat;
      act.lng = cLng;
    }
  }

  return activities;
}

/**
 * Reverse-geocode coordinates via Nominatim.
 * @returns { name, shortName, lat, lng, city, neighbourhood } or null on error
 */
export async function reverseGeocode(lat, lng) {
  try {
    const data = await nominatim('reverse', {
      lat,
      lon: lng,
      format: 'json',
      addressdetails: '1',
      zoom: '16',
    });
    if (!data || data.error) return null;

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

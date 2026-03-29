// Copyright 2026 Carlo Cancellieri
// SPDX-License-Identifier: GPL-3.0-only WITH additional terms

import { db } from '../storage/index.js';

/**
 * Bundled fallback — minimal set so the app works offline / if fetch fails.
 */
const FALLBACK_SOURCES = [
  { id: 'facebook', label: 'Facebook Events', group: 'global', prompt: 'Facebook Events (facebook.com/events) for local community events and gatherings' },
  { id: 'eventbrite', label: 'Eventbrite', group: 'global', prompt: 'Eventbrite (eventbrite.com) for ticketed events, workshops, and festivals' },
  { id: 'tripadvisor', label: 'TripAdvisor', group: 'global', prompt: 'TripAdvisor (tripadvisor.com) for top-rated attractions, restaurants, and tours' },
];

// Runtime cache
let _cachedSources = null;

/** Default bundled sources URL (relative to app root) */
const DEFAULT_SOURCES_URL = 'sources.json';

/** Get the configured sources file URL (or default) */
export function getSourcesUrl() {
  return db.readJSON('sources_file_url', '') || DEFAULT_SOURCES_URL;
}

/** Set a custom sources file URL (empty string = use default) */
export function setSourcesUrl(url) {
  db.writeJSON('sources_file_url', url || '');
  _cachedSources = null; // invalidate cache
}

/**
 * Load sources from the configured URL (or bundled default).
 * Returns the cached array if already loaded.
 * Call `reloadSources()` to force a refetch.
 */
export async function loadSources() {
  if (_cachedSources) return _cachedSources;

  const url = getSourcesUrl();
  try {
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(resp.status);
    const data = await resp.json();
    _cachedSources = Array.isArray(data) ? data : (data.sources || FALLBACK_SOURCES);
    // persist a copy so it works offline next time
    db.writeJSON('sources_cache', _cachedSources);
  } catch {
    // Try offline cache, then fallback
    _cachedSources = db.readJSON('sources_cache', null) || FALLBACK_SOURCES;
  }
  return _cachedSources;
}

/** Force reload from the configured URL */
export async function reloadSources() {
  _cachedSources = null;
  return loadSources();
}

/**
 * Synchronous getter — returns cached sources or offline cache.
 * Use after `loadSources()` has been awaited at boot time.
 */
export function getKnownSources() {
  if (_cachedSources) return _cachedSources;
  _cachedSources = db.readJSON('sources_cache', null) || FALLBACK_SOURCES;
  return _cachedSources;
}

// Keep KNOWN_SOURCES as a getter for backward compatibility
export const KNOWN_SOURCES = new Proxy([], {
  get(target, prop) {
    const data = getKnownSources();
    if (prop === Symbol.iterator) return data[Symbol.iterator].bind(data);
    if (prop === 'length') return data.length;
    if (prop === 'forEach') return data.forEach.bind(data);
    if (prop === 'filter') return data.filter.bind(data);
    if (prop === 'map') return data.map.bind(data);
    if (prop === 'find') return data.find.bind(data);
    if (prop === 'some') return data.some.bind(data);
    if (prop === 'every') return data.every.bind(data);
    if (prop === 'reduce') return data.reduce.bind(data);
    if (prop === 'indexOf') return data.indexOf.bind(data);
    if (prop === 'includes') return data.includes.bind(data);
    if (typeof prop === 'string' && !isNaN(prop)) return data[Number(prop)];
    return Reflect.get(data, prop);
  },
});

// Default enabled sources for new users
const DEFAULT_ENABLED = ['facebook', 'eventbrite', 'tripadvisor'];

/** Get enabled global source IDs */
export function getEnabledSources() {
  return db.readJSON('data_sources_enabled', DEFAULT_ENABLED);
}

/** Set enabled global source IDs */
export function setEnabledSources(ids) {
  db.writeJSON('data_sources_enabled', ids);
}

/** Get custom global URLs */
export function getCustomSources() {
  return db.readJSON('data_sources_custom', []);
}

/** Set custom global URLs */
export function setCustomSources(urls) {
  db.writeJSON('data_sources_custom', urls);
}

/** Get local sources for a specific map */
export function getMapLocalSources(mapId) {
  const mapData = db.readJSON('map_data_' + mapId);
  return (mapData && mapData.localSources) || [];
}

/** Set local sources for a specific map */
export function setMapLocalSources(mapId, urls) {
  const mapData = db.readJSON('map_data_' + mapId);
  if (mapData) {
    mapData.localSources = urls;
    db.writeJSON('map_data_' + mapId, mapData);
  }
}

/**
 * Build the sources prompt fragment for LLM injection.
 * Combines enabled global known sources + custom global URLs + map-local URLs.
 */
export function buildSourcesPrompt(mapId) {
  const lines = [];

  // Known enabled sources
  const enabled = getEnabledSources();
  const sources = getKnownSources();
  const knownLines = sources
    .filter((s) => enabled.includes(s.id))
    .map((s) => s.prompt);

  // Custom global URLs
  const custom = getCustomSources();
  const customLines = custom.map((url) => url);

  // Map-local sources
  let localLines = [];
  if (mapId) {
    const local = getMapLocalSources(mapId);
    localLines = local.map((url) => url);
  }

  if (knownLines.length > 0) {
    lines.push('Use these well-known platforms as reference sources for finding real, current activities:');
    knownLines.forEach((l) => lines.push('- ' + l));
  }

  if (customLines.length > 0) {
    lines.push('');
    lines.push('Also check these additional websites:');
    customLines.forEach((l) => lines.push('- ' + l));
  }

  if (localLines.length > 0) {
    lines.push('');
    lines.push('For this specific location, prioritize these local sources:');
    localLines.forEach((l) => lines.push('- ' + l));
  }

  if (lines.length > 0) {
    lines.push('');
    lines.push('Cross-reference multiple sources to find the most accurate, up-to-date events. Prefer activities you can verify exist on these platforms. Include source_url when available.');
  }

  return lines.join('\n');
}

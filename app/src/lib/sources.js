// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { db } from '../storage/index.js';

/**
 * Well-known global event/activity sources.
 * `prompt` is the text injected into the LLM prompt when enabled.
 */
// Global platforms
export const KNOWN_SOURCES = [
  { id: 'facebook', label: 'Facebook Events', group: 'global', prompt: 'Facebook Events (facebook.com/events) for local community events and gatherings' },
  { id: 'eventbrite', label: 'Eventbrite', group: 'global', prompt: 'Eventbrite (eventbrite.com) for ticketed events, workshops, and festivals' },
  { id: 'meetup', label: 'Meetup', group: 'global', prompt: 'Meetup (meetup.com) for group activities, social events, and hobby meetups' },
  { id: 'tripadvisor', label: 'TripAdvisor', group: 'global', prompt: 'TripAdvisor (tripadvisor.com) for top-rated attractions, restaurants, and tours' },
  { id: 'viator', label: 'Viator', group: 'global', prompt: 'Viator (viator.com) for guided tours, excursions, and experience bookings' },
  { id: 'getyourguide', label: 'GetYourGuide', group: 'global', prompt: 'GetYourGuide (getyourguide.com) for tours, skip-the-line tickets, and local experiences' },
  { id: 'timeout', label: 'Time Out', group: 'global', prompt: 'Time Out (timeout.com) for curated city guides, restaurant picks, and nightlife' },
  { id: 'yelp', label: 'Yelp', group: 'global', prompt: 'Yelp (yelp.com) for highly-rated local restaurants, bars, and services' },
  { id: 'google_events', label: 'Google Events', group: 'global', prompt: 'Google Events search for upcoming local events and happenings' },
  // Italy
  { id: 'italia_it', label: '🇮🇹 Italia.it', group: 'IT', prompt: 'Italia.it (italia.it) — official Italian tourism portal for events and attractions' },
  { id: 'zerodue', label: '🇮🇹 02Blog/Today', group: 'IT', prompt: 'Network of Italian city blogs (romatoday.it, milanotoday.it, etc.) for local news and events' },
  { id: 'doveviaggi', label: '🇮🇹 Dove Viaggi', group: 'IT', prompt: 'Dove Viaggi (viaggi.corriere.it) for Italian travel guides and event calendars' },
  // Spain
  { id: 'spain_info', label: '🇪🇸 Spain.info', group: 'ES', prompt: 'Spain.info (spain.info) — official Spanish tourism portal for fiestas, events, and cultural activities' },
  { id: 'guiarepsol', label: '🇪🇸 Guía Repsol', group: 'ES', prompt: 'Guía Repsol (guiarepsol.com) for Spanish restaurants, routes, and local festivals' },
  { id: 'timeout_es', label: '🇪🇸 Time Out España', group: 'ES', prompt: 'Time Out Barcelona/Madrid (timeout.es) for urban events, nightlife, and food' },
  // France
  { id: 'france_fr', label: '🇫🇷 France.fr', group: 'FR', prompt: 'France.fr (france.fr) — official French tourism portal for events and cultural highlights' },
  { id: 'sortiraparis', label: '🇫🇷 Sortir à Paris', group: 'FR', prompt: 'Sortir à Paris (sortiraparis.com) for Paris events, exhibitions, and outings' },
  { id: 'lofficielvoyages', label: '🇫🇷 L\'Officiel', group: 'FR', prompt: 'L\'Officiel des Spectacles for French entertainment, theatre, and cinema listings' },
  // Germany
  { id: 'germany_travel', label: '🇩🇪 Germany Travel', group: 'DE', prompt: 'Germany Travel (germany.travel) — official German tourism portal for events and festivals' },
  { id: 'berlin_de', label: '🇩🇪 Berlin.de', group: 'DE', prompt: 'Berlin.de events calendar for concerts, festivals, and cultural events in Germany' },
  // UK
  { id: 'visitbritain', label: '🇬🇧 Visit Britain', group: 'GB', prompt: 'Visit Britain (visitbritain.com) for UK events, attractions, and experiences' },
  { id: 'londonist', label: '🇬🇧 Londonist', group: 'GB', prompt: 'Londonist (londonist.com) for London events, hidden gems, and things to do' },
  // US
  { id: 'eventful', label: '🇺🇸 Eventful', group: 'US', prompt: 'Eventful/Bandsintown for US concerts, shows, and local entertainment' },
  // Japan
  { id: 'jnto', label: '🇯🇵 JNTO', group: 'JP', prompt: 'Japan National Tourism Organization (japan.travel) for festivals, seasonal events, and cultural experiences' },
  // Portugal
  { id: 'visitportugal', label: '🇵🇹 Visit Portugal', group: 'PT', prompt: 'Visit Portugal (visitportugal.com) for Portuguese events, festivals, and cultural activities' },
  // Netherlands
  { id: 'holland', label: '🇳🇱 Holland.com', group: 'NL', prompt: 'Holland.com for Dutch events, King\'s Day, festivals, and museum exhibitions' },
  // Greece
  { id: 'visitgreece', label: '🇬🇷 Visit Greece', group: 'GR', prompt: 'Visit Greece (visitgreece.gr) for Greek festivals, island events, and cultural happenings' },
];

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
  const knownLines = KNOWN_SOURCES
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

// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { getLang } from '../i18n/index.js';
import { buildSourcesPrompt } from './sources.js';

const LANG_NAMES = {
  en: 'English',
  it: 'Italian',
  es: 'Spanish',
};

const ACTIVITY_FIELDS = [
  'name', 'category', 'description', 'date', 'time_start', 'time_end',
  'cost', 'address', 'lat', 'lng', 'contact', 'source_url',
];

const SYSTEM_PROMPT_BASE = `You are a local leisure-activity planner. Return ONLY a valid JSON array (no markdown, no explanation, no wrapping object).

Each element must have exactly these fields:
${ACTIVITY_FIELDS.map((f) => `- ${f}`).join('\n')}

Rules:
- "date" must be YYYY-MM-DD
- "time_start" and "time_end" must be HH:MM (24 h)
- "cost" is a string like "Free", "€5", "€10-15"
- "lat" and "lng" are numeric (float) with at least 4 decimal places for accuracy
- IMPORTANT: Coordinates must point to the ACTUAL location on land, not in water. For coastal/promontory towns, double-check that lat/lng fall on the correct side of the coastline. Prefer coordinates of the specific venue, street, or landmark rather than approximate area centers.
- "category" must be one of: music, games, outdoor, culture, food, sport, market, festival, other
- Do NOT include any text outside the JSON array
- IMPORTANT: Write ALL text fields (name, description, cost) in {LANG}. Only date/time/lat/lng/category stay in their fixed format.`;

function buildUserPromptBody(city, dateStart, dateEnd, centerName, interests, prefs) {
  const lines = [];
  lines.push(`Find fun leisure activities in and around ${city}.`);
  if (centerName) {
    lines.push(`The user is staying near "${centerName}".`);
  }
  lines.push(`Date range: ${dateStart} to ${dateEnd}.`);

  if (interests && interests.length > 0) {
    lines.push(`Interests: ${interests.join(', ')}.`);
  }

  if (prefs) {
    if (prefs.budget) lines.push(`Budget preference: ${prefs.budget}.`);
    if (prefs.transport) lines.push(`Transport: ${prefs.transport}.`);
    if (prefs.avoid) lines.push(`Avoid: ${prefs.avoid}.`);
  }

  return lines.join('\n');
}

/**
 * Build system + user prompts for initial activity discovery.
 */
function getSystemPrompt() {
  const lang = LANG_NAMES[getLang()] || 'English';
  return SYSTEM_PROMPT_BASE.replace('{LANG}', lang);
}

/**
 * Build system + user prompts for activity discovery.
 * First call (no excludeNames): asks for 20 activities.
 * Follow-up calls: asks for 10 more, excluding already-found names.
 */
export function buildPaginatedPrompt(city, dateStart, dateEnd, centerName, interests, prefs, excludeNames, webSearchContext, mapId) {
  const systemPrompt = getSystemPrompt();
  let userPrompt = buildUserPromptBody(city, dateStart, dateEnd, centerName, interests, prefs);

  // Inject data sources (global + map-local)
  const sourcesBlock = buildSourcesPrompt(mapId);
  if (sourcesBlock) {
    userPrompt += '\n\n' + sourcesBlock;
  }

  if (excludeNames && excludeNames.length > 0) {
    userPrompt += '\n\nReturn EXACTLY 10 new activities.';
    userPrompt += `\n\nDo NOT include any of these already found:\n${excludeNames.map((n) => `- ${n}`).join('\n')}`;
  } else {
    userPrompt += '\n\nReturn at least 20 activities. The more the better.';
  }

  if (webSearchContext) {
    userPrompt += `\n\nHere is additional context from a web search that may help you find real, current events:\n${webSearchContext}`;
  }

  return { systemPrompt, userPrompt };
}

/**
 * Build system + user prompts for corridor (route-based) activity search.
 * Searches for activities near a specific area along a route.
 */
export function buildCorridorPrompt(areaName, lat, lng, radiusKm, dateStart, dateEnd, excludeNames) {
  const systemPrompt = getSystemPrompt();

  const lines = [];
  lines.push(`Find fun leisure activities in and around ${areaName} (${lat.toFixed(4)}, ${lng.toFixed(4)}).`);
  lines.push(`Search within approximately ${Math.round(radiusKm)} km of this point.`);
  lines.push(`This is part of a road trip route — include things to do, visit, or eat along the way.`);
  lines.push(`Include natural attractions, restaurants, viewpoints, hot springs, local markets, festivals, wineries, and hidden gems.`);

  if (dateStart && dateEnd) {
    lines.push(`Date range: ${dateStart} to ${dateEnd}.`);
  }

  lines.push('Return at least 10 activities. The more the better.');

  if (excludeNames && excludeNames.length > 0) {
    lines.push(`\nDo NOT include any of these already found:\n${excludeNames.map(n => `- ${n}`).join('\n')}`);
  }

  return { systemPrompt, userPrompt: lines.join('\n') };
}

/**
 * Build prompt for a focus zone (drill-down search at a specific point).
 */
export function buildFocusZonePrompt(areaName, lat, lng, radiusKm, keyword, dateStart, dateEnd) {
  const systemPrompt = getSystemPrompt();

  const lines = [];
  lines.push(`Find activities related to "${keyword}" near ${areaName} (${lat.toFixed(4)}, ${lng.toFixed(4)}).`);
  lines.push(`Search within approximately ${Math.round(radiusKm)} km.`);

  if (dateStart && dateEnd) {
    lines.push(`Date range: ${dateStart} to ${dateEnd}.`);
  }

  lines.push('Return at least 10 activities. The more the better.');

  return { systemPrompt, userPrompt: lines.join('\n') };
}

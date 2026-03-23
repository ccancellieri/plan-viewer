// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

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
- "lat" and "lng" are numeric (float)
- "category" must be one of: music, games, outdoor, culture, food, sport, market, festival, other
- Do NOT include any text outside the JSON array`;

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
export function buildPrompt(city, dateStart, dateEnd, centerName, interests, prefs, webSearchContext) {
  const systemPrompt = SYSTEM_PROMPT_BASE;
  let userPrompt = buildUserPromptBody(city, dateStart, dateEnd, centerName, interests, prefs);

  if (webSearchContext) {
    userPrompt += `\n\nHere is additional context from a web search that may help you find real, current events:\n${webSearchContext}`;
  }

  return { systemPrompt, userPrompt };
}

/**
 * Build system + user prompts for paginated (follow-up) requests.
 * Asks for EXACTLY 4 activities and excludes already-found names.
 */
export function buildPaginatedPrompt(city, dateStart, dateEnd, centerName, interests, prefs, excludeNames, webSearchContext) {
  const systemPrompt = SYSTEM_PROMPT_BASE;

  let userPrompt = buildUserPromptBody(city, dateStart, dateEnd, centerName, interests, prefs);
  userPrompt += '\n\nReturn EXACTLY 4 activities.';

  if (excludeNames && excludeNames.length > 0) {
    userPrompt += `\n\nDo NOT include any of these already found:\n${excludeNames.map((n) => `- ${n}`).join('\n')}`;
  }

  if (webSearchContext) {
    userPrompt += `\n\nHere is additional context from a web search that may help you find real, current events:\n${webSearchContext}`;
  }

  return { systemPrompt, userPrompt };
}

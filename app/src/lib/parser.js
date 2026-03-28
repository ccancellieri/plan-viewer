// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

/**
 * Attempt to repair a truncated JSON string (e.g. from a cut-off LLM response).
 * Walks the string tracking brace/bracket depth, string state and escapes,
 * then finds the last complete object closing brace at depth 0 and wraps it.
 */
export function repairTruncatedJSON(jsonStr) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let lastCompleteObj = -1;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{' || ch === '[') {
      depth++;
    } else if (ch === '}' || ch === ']') {
      depth--;
      if (ch === '}' && depth === 0) {
        lastCompleteObj = i;
      }
    }
  }

  if (lastCompleteObj === -1) return null;

  // Find the opening bracket or first '{' before the objects
  let start = jsonStr.indexOf('[');
  if (start === -1) start = jsonStr.indexOf('{');
  if (start === -1) return null;

  const inner = jsonStr.substring(start, lastCompleteObj + 1);

  // If it already starts with '[', close it; otherwise wrap in array
  if (inner.trimStart().startsWith('[')) {
    return inner + ']';
  }
  return '[' + inner + ']';
}

/**
 * Parse LLM text output into an array of activity objects.
 * Handles code fences, wrapper objects, trailing commas, JS comments, etc.
 */
export function parseActivities(text, dateStart, dateEnd) {
  if (!text || typeof text !== 'string') return [];

  // Strip markdown code fences
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '');

  // Try to isolate a JSON array or object
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);

  let jsonStr;
  if (arrayMatch) {
    jsonStr = arrayMatch[0];
  } else if (objectMatch) {
    jsonStr = '[' + objectMatch[0] + ']';
  } else {
    return [];
  }

  // Remove single-line JS comments (only outside strings — match // at line start, not inside values like URLs)
  jsonStr = jsonStr.replace(/^(\s*)\/\/[^\n]*/gm, '');
  // Remove multi-line JS comments (only outside strings — simple heuristic, not preceded by ":")
  jsonStr = jsonStr.replace(/(?<!")\/\*[\s\S]*?\*\//g, '');

  // Fix trailing commas before } or ]
  jsonStr = jsonStr.replace(/,\s*([}\]])/g, '$1');

  // Remove control characters (except newline, tab, carriage return)
  jsonStr = jsonStr.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '');

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Attempt repair for truncated responses
    try {
      const repaired = repairTruncatedJSON(jsonStr);
      if (repaired) {
        parsed = JSON.parse(repaired);
      } else {
        return [];
      }
    } catch {
      return [];
    }
  }

  // Handle { activities: [...] } wrapper
  if (parsed && !Array.isArray(parsed)) {
    if (Array.isArray(parsed.activities)) {
      parsed = parsed.activities;
    } else {
      parsed = [parsed];
    }
  }

  if (!Array.isArray(parsed)) return [];

  // Filter by date range if provided
  if (dateStart && dateEnd) {
    const start = new Date(dateStart + 'T00:00:00');
    const end = new Date(dateEnd + 'T23:59:59');

    parsed = parsed.filter((a) => {
      if (!a.date) return true; // keep activities without a date
      const d = new Date(a.date + 'T12:00:00');
      return d >= start && d <= end;
    });
  }

  return parsed;
}

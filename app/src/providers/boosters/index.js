// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { searchTavily } from './tavily.js';
import { searchSerper } from './serper.js';

export async function webSearchBoost(tavilyKey, serperKey, city, dateStart, dateEnd, interests) {
  const queries = [
    `${city} events ${dateStart} ${dateEnd}`,
    `${city} ${interests.join(' ')} things to do ${dateStart}`,
  ];

  const results = [];

  const tasks = queries.flatMap((query) => {
    const t = [];
    if (tavilyKey) t.push(searchTavily(tavilyKey, query).catch(() => []));
    if (serperKey) t.push(searchSerper(serperKey, query).catch(() => []));
    return t;
  });

  const allResults = await Promise.all(tasks);
  for (const batch of allResults) {
    results.push(...batch);
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  if (unique.length === 0) return '';

  const lines = unique.map((r) => `- ${r.title}: ${r.snippet} (${r.url})`);
  return `\n\n--- WEB SEARCH CONTEXT ---\nRecent search results for ${city} (${dateStart} to ${dateEnd}):\n${lines.join('\n')}\n--- END WEB SEARCH CONTEXT ---\n`;
}

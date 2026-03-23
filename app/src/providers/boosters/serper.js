// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

export async function searchSerper(apiKey, query) {
  const resp = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
    body: JSON.stringify({
      q: query,
      num: 10,
      gl: 'it',
      hl: 'it',
      tbs: 'qdr:w',
    }),
  });
  const data = await resp.json();
  if (data.error) throw new Error('Serper: ' + (data.error.message || JSON.stringify(data.error)));
  const organic = (data.organic || []).map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
  }));
  const news = (data.news || []).map((r) => ({
    title: r.title,
    url: r.link,
    snippet: r.snippet,
  }));
  return [...organic, ...news];
}

// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

export async function searchTavily(apiKey, query) {
  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
    body: JSON.stringify({
      query,
      search_depth: 'basic',
      topic: 'news',
      max_results: 8,
      time_range: 'week',
      include_answer: false,
    }),
  });
  const data = await resp.json();
  if (data.error) throw new Error('Tavily: ' + (data.error.message || JSON.stringify(data.error)));
  return (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.content,
  }));
}

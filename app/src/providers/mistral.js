// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

export default {
  id: 'mistral',
  label: 'Mistral AI',
  model: 'mistral-small-latest',
  free: true,
  webSearch: true,
  signupUrl: 'https://console.mistral.ai/api-keys',
  async call(apiKey, systemPrompt, userPrompt) {
    const resp = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 8192,
        temperature: 0.7,
        tools: [{ type: 'function', function: { name: 'web_search', description: 'Search the web', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } } }],
      }),
    });
    const data = await resp.json();
    if (data.error) throw new Error('Mistral: ' + (data.error.message || JSON.stringify(data.error)));
    return data.choices[0].message.content;
  },
};

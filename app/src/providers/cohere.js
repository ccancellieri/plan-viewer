// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

export default {
  id: 'cohere',
  label: 'Cohere',
  model: 'command-r-plus',
  free: true,
  webSearch: true,
  signupUrl: 'https://dashboard.cohere.com/api-keys',
  async call(apiKey, systemPrompt, userPrompt) {
    const resp = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 8192,
        temperature: 0.7,
        connectors: [{ id: 'web-search' }],
      }),
    });
    const data = await resp.json();
    if (data.error) throw new Error('Cohere: ' + (data.error.message || JSON.stringify(data.error)));
    return data.message.content
      .filter((part) => part.type === 'text')
      .map((part) => part.text)
      .join('');
  },
};

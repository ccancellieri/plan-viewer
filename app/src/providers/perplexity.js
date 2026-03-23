// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

export default {
  id: 'perplexity',
  label: 'Perplexity',
  model: 'sonar',
  free: false,
  webSearch: true,
  signupUrl: 'https://www.perplexity.ai/settings/api',
  async call(apiKey, systemPrompt, userPrompt) {
    const resp = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        max_tokens: 8192,
        temperature: 0.7,
      }),
    });
    const data = await resp.json();
    if (data.error) throw new Error('Perplexity: ' + (data.error.message || JSON.stringify(data.error)));
    return data.choices[0].message.content;
  },
};

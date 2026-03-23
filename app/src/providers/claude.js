// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

export default {
  id: 'claude',
  label: 'Claude (Anthropic)',
  model: 'claude-sonnet-4-20250514',
  free: false,
  webSearch: false,
  signupUrl: 'https://console.anthropic.com/settings/keys',
  async call(apiKey, systemPrompt, userPrompt) {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: this.model, max_tokens: 8192, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    });
    const data = await resp.json();
    if (data.error) throw new Error('Claude: ' + data.error.message);
    return data.content[0].text;
  },
};

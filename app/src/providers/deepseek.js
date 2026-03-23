// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

export default {
  id: 'deepseek',
  label: 'DeepSeek',
  model: 'deepseek-chat',
  free: true,
  webSearch: false,
  signupUrl: 'https://platform.deepseek.com/',
  async call(apiKey, systemPrompt, userPrompt) {
    const resp = await fetch('https://api.deepseek.com/chat/completions', {
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
    if (data.error) throw new Error('DeepSeek: ' + (data.error.message || JSON.stringify(data.error)));
    return data.choices[0].message.content;
  },
};

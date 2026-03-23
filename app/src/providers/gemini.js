// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

export default {
  id: 'gemini',
  label: 'Gemini (Google)',
  model: 'gemini-2.5-flash',
  free: true,
  webSearch: true,
  signupUrl: 'https://aistudio.google.com/apikey',
  async call(apiKey, systemPrompt, userPrompt) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${apiKey}`;
    const payload = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: { maxOutputTokens: 8192 },
    };

    // First attempt with google_search tool
    let resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, tools: [{ google_search: {} }] }),
    });

    // Retry without tools on 400/403
    if (resp.status === 400 || resp.status === 403) {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    const data = await resp.json();
    if (data.error) throw new Error('Gemini: ' + data.error.message);

    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('Gemini: no candidates returned');
    if (candidate.finishReason === 'SAFETY') throw new Error('Gemini: response blocked by safety filters');

    return candidate.content.parts
      .filter((p) => p.text)
      .map((p) => p.text)
      .join('');
  },
};

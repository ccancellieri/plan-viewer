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
      generationConfig: { maxOutputTokens: 8192, responseMimeType: 'application/json' },
    };

    const doFetch = async (body) => {
      let resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      // Auto-retry on 429 (rate limit) — up to 2 retries
      for (let attempt = 0; attempt < 2 && resp.status === 429; attempt++) {
        const retryMatch = (await resp.text()).match(/retry in ([\d.]+)s/i);
        const wait = retryMatch ? Math.min(parseFloat(retryMatch[1]) * 1000, 15000) : 5000;
        await new Promise((r) => setTimeout(r, wait));
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      return resp;
    };

    // First attempt with google_search tool
    let resp = await doFetch({ ...payload, tools: [{ google_search: {} }] });

    // Retry without tools on 400/403
    if (resp.status === 400 || resp.status === 403) {
      resp = await doFetch(payload);
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

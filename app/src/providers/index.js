// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import claude from './claude.js';
import gemini from './gemini.js';
import groq from './groq.js';
import grok from './grok.js';
import deepseek from './deepseek.js';
import mistral from './mistral.js';
import cohere from './cohere.js';
import perplexity from './perplexity.js';
import manual from './manual.js';

export const providers = [claude, gemini, groq, grok, deepseek, mistral, cohere, perplexity, manual];

export function getProvider(id) {
  const p = providers.find((p) => p.id === id);
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

export async function callLLM(providerId, apiKey, systemPrompt, userPrompt) {
  const provider = getProvider(providerId);
  return provider.call(apiKey, systemPrompt, userPrompt);
}

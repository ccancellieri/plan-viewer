// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { navigate } from '../router.js';
import { providers, callLLM } from '../providers/index.js';
import { showLoader } from '../ui/loader.js';
import { alert as modalAlert, actionSheet, prompt as modalPrompt, errorReport } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { searchLocation } from '../lib/geo.js';

export default {
  mount(el) {
    const content = el.querySelector('#voice-plan-content');
    content.textContent = '';

    // Description
    const desc = document.createElement('p');
    desc.className = 'text-secondary';
    desc.textContent = t('voicePlanMsg');
    desc.style.whiteSpace = 'pre-line';
    content.appendChild(desc);

    // Text area
    const textarea = document.createElement('textarea');
    textarea.placeholder = t('voicePlaceholder');
    textarea.rows = 4;
    content.appendChild(textarea);

    // Provider selector
    const provLabel = document.createElement('label');
    provLabel.className = 'text-secondary';
    provLabel.textContent = t('provider');
    content.appendChild(provLabel);

    const provSelect = document.createElement('select');
    providers.forEach(p => {
      if (p.id === 'manual') return;
      if (!db.readJSON('apikey_' + p.id)) return;
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.label + (p.free ? ' (FREE)' : '');
      provSelect.appendChild(opt);
    });
    content.appendChild(provSelect);

    // Go button
    const goBtn = document.createElement('button');
    goBtn.className = 'btn btn-primary btn-block btn-large mt-16';
    goBtn.textContent = t('qSearch');
    content.appendChild(goBtn);

    goBtn.addEventListener('click', async () => {
      const text = textarea.value.trim();
      if (!text) {
        await modalAlert(t('error'), t('voicePlaceholder'));
        return;
      }

      const providerId = provSelect.value;
      const provider = providers.find((p) => p.id === providerId);
      const apiKey = db.readJSON('apikey_' + providerId, null);
      if (!apiKey) {
        const key = await modalPrompt(t('apiKeyNeeded'), t('apiKeyMsg'), '',
          provider?.signupUrl ? { linkUrl: provider.signupUrl, linkText: t('getKey') || 'Get a free key' } : undefined
        );
        if (!key) return;
        db.writeJSON('apikey_' + providerId, key);
      }

      const dismiss = showLoader(t('voiceParsing'));

      try {
        const parsePrompt = 'Parse this natural language trip description into a JSON object with these fields:\n' +
          '{ "city": "string", "dateStart": "YYYY-MM-DD", "dateEnd": "YYYY-MM-DD", ' +
          '"mood": ["string"], "budget": "free|cheap|medium|any", "group": "solo|couple|friends|family|large_group", ' +
          '"max_distance_km": number, "specific": ["string"], "time_slots": ["morning"|"afternoon"|"evening"|"night"] }\n\n' +
          'If dates are relative (e.g., "this weekend"), calculate from today: ' + new Date().toISOString().slice(0, 10) + '.\n' +
          'Respond with ONLY valid JSON, no markdown.';

        const key = db.readJSON('apikey_' + providerId, null);
        const response = await callLLM(providerId, key, parsePrompt, text);

        dismiss();

        // Parse the response
        let parsed;
        try {
          const cleaned = response.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          parsed = JSON.parse(cleaned);
        } catch {
          await modalAlert(t('error'), t('voiceFailed'));
          return;
        }

        // Show confirmation
        const summary = [
          t('city') + ': ' + (parsed.city || '?'),
          t('dates') + ': ' + (parsed.dateStart || '?') + ' - ' + (parsed.dateEnd || '?'),
          t('qMood') + ': ' + (parsed.mood || []).join(', '),
          t('qBudget') + ': ' + (parsed.budget || 'any'),
          t('qGroup') + ': ' + (parsed.group || 'friends'),
        ].join('\n');

        const choice = await actionSheet(t('voiceConfirm') + '\n\n' + summary, [
          t('qSearch'),
          t('cancel'),
        ]);

        if (choice === 0 && parsed.city) {
          // Geocode the city
          const locations = await searchLocation(parsed.city);
          if (locations.length > 0) {
            const loc = locations[0];
            navigate('search', {
              city: loc.city,
              centerLat: loc.lat,
              centerLng: loc.lng,
              centerName: loc.shortName || loc.name,
              dateStart: parsed.dateStart || new Date().toISOString().slice(0, 10),
              dateEnd: parsed.dateEnd || new Date().toISOString().slice(0, 10),
              providerId,
              profile: {
                mood: parsed.mood || [],
                time_slots: parsed.time_slots || ['all_day'],
                budget: parsed.budget || 'any',
                group: parsed.group || 'friends',
                max_distance_km: parsed.max_distance_km || 5,
                specific: parsed.specific || [],
                avoid: [],
              },
            });
          } else {
            await modalAlert(t('error'), t('noResults'));
          }
        }
      } catch (e) {
        dismiss();
        const lines = [
          '--- ' + (t('searchError') || 'Search Error') + ' ---',
          '',
          'Provider: ' + providerId,
          'Input: ' + text.slice(0, 200),
          'Time: ' + new Date().toISOString(),
          '',
          'Error: ' + (e.message || String(e)),
        ];
        if (e.status) lines.push('HTTP Status: ' + e.status);
        if (e.stack) lines.push('', 'Stack:', e.stack);
        errorReport(t('searchError') || 'Search failed', lines.join('\n'));
      }
    });
  },
};

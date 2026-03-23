// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t, getLang, loadLocale, getAvailableLocales } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { providers } from '../providers/index.js';
import { prompt, actionSheet } from '../ui/modal.js';

function createSection(title) {
  const section = document.createElement('div');
  section.className = 'settings-section mt-16';
  const h3 = document.createElement('h3');
  h3.textContent = title;
  section.appendChild(h3);
  return section;
}

function createProviderCard(provider, container, el) {
  const card = document.createElement('div');
  card.className = 'card mb-8';

  const header = document.createElement('div');
  header.className = 'flex-row justify-between align-center';

  const label = document.createElement('span');
  label.className = 'font-bold';
  label.textContent = provider.label;
  header.appendChild(label);

  if (provider.free) {
    const badge = document.createElement('span');
    badge.className = 'badge badge-success';
    badge.textContent = t('free') || 'Free';
    header.appendChild(badge);
  }

  card.appendChild(header);

  const storedKey = db.readJSON(`apikey_${provider.id}`, null);

  const status = document.createElement('p');
  status.className = 'text-secondary text-sm mt-4';
  status.textContent = storedKey ? t('keySet') || 'Key set' : t('noKey') || 'No key set';
  card.appendChild(status);

  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary btn-block mt-8';
  btn.textContent = storedKey ? t('updateKey') || 'Update Key' : t('setKey') || 'Set Key';
  btn.addEventListener('click', async () => {
    const value = await prompt(
      provider.label + ' API Key',
      'Enter API key...',
      storedKey || ''
    );
    if (value !== null) {
      db.writeJSON(`apikey_${provider.id}`, value || null);
      screenObj.mount(el);
    }
  });
  card.appendChild(btn);

  container.appendChild(card);
}

function createSearchKeyCard(id, label, container, el) {
  const card = document.createElement('div');
  card.className = 'card mb-8';

  const title = document.createElement('span');
  title.className = 'font-bold';
  title.textContent = label;
  card.appendChild(title);

  const storedKey = db.readJSON(`apikey_${id}`, null);

  const status = document.createElement('p');
  status.className = 'text-secondary text-sm mt-4';
  status.textContent = storedKey ? t('keySet') || 'Key set' : t('noKey') || 'No key set';
  card.appendChild(status);

  const btn = document.createElement('button');
  btn.className = 'btn btn-secondary btn-block mt-8';
  btn.textContent = storedKey ? t('updateKey') || 'Update Key' : t('setKey') || 'Set Key';
  btn.addEventListener('click', async () => {
    const value = await prompt(
      label + ' API Key',
      'Enter API key...',
      storedKey || ''
    );
    if (value !== null) {
      db.writeJSON(`apikey_${id}`, value || null);
      screenObj.mount(el);
    }
  });
  card.appendChild(btn);

  container.appendChild(card);
}

const screenObj = {
  mount(el) {
    const content = el.querySelector('#settings-content') || el;
    content.textContent = '';

    // --- Language picker ---
    const langSection = createSection(t('language') || 'Language');
    const langBtn = document.createElement('button');
    langBtn.className = 'btn btn-secondary btn-block mt-8';
    langBtn.textContent = (t('currentLang') || 'Current') + ': ' + getLang().toUpperCase();
    langBtn.addEventListener('click', async () => {
      const locales = getAvailableLocales();
      const labels = locales.map((l) => l.toUpperCase());
      const idx = await actionSheet(t('language') || 'Select Language', labels);
      if (idx >= 0) {
        const chosen = locales[idx];
        db.writeJSON('app_lang', chosen);
        await loadLocale(chosen);
        screenObj.mount(el);
      }
    });
    langSection.appendChild(langBtn);
    content.appendChild(langSection);

    // --- LLM API Keys ---
    const apiSection = createSection(t('apiKeys') || 'API Keys');
    for (const provider of providers) {
      if (provider.id === 'manual') continue;
      createProviderCard(provider, apiSection, el);
    }
    content.appendChild(apiSection);

    // --- Search API Keys ---
    const searchSection = createSection(t('searchApiKeys') || 'Search API Keys');
    createSearchKeyCard('tavily', 'Tavily', searchSection, el);
    createSearchKeyCard('serper', 'Serper', searchSection, el);
    content.appendChild(searchSection);

    // --- Storage info ---
    const storageSection = createSection(t('storage') || 'Storage');
    const maps = db.readJSON('maps_registry', []);
    const info = document.createElement('p');
    info.className = 'text-secondary mt-4';
    info.textContent = (t('mapsStored') || 'Maps stored') + ': ' + maps.length;
    storageSection.appendChild(info);
    content.appendChild(storageSection);
  },
};

export default screenObj;

// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t, getLang, loadLocale, getAvailableLocales } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { providers } from '../providers/index.js';
import { prompt, actionSheet } from '../ui/modal.js';
import { KNOWN_SOURCES, getEnabledSources, setEnabledSources, getCustomSources, setCustomSources } from '../lib/sources.js';

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

  if (provider.signupUrl) {
    const link = document.createElement('a');
    link.href = provider.signupUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'text-sm mt-4';
    link.style.cssText = 'display:block;color:var(--accent,#667eea)';
    link.textContent = (t('getKey') || 'Get a free key') + ' →';
    card.appendChild(link);
  }

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

    // --- Data Sources (global) ---
    const srcSection = createSection(t('dataSources') || 'Data Sources');
    const srcDesc = document.createElement('p');
    srcDesc.className = 'text-secondary text-sm mt-4';
    srcDesc.textContent = t('dataSourcesDesc') || 'Enable platforms the AI should reference when searching for activities. These are included in the prompt to improve results.';
    srcSection.appendChild(srcDesc);

    // Group sources by category
    const enabled = getEnabledSources();
    const groups = {};
    KNOWN_SOURCES.forEach((src) => {
      const g = src.group || 'global';
      if (!groups[g]) groups[g] = [];
      groups[g].push(src);
    });

    const groupLabels = {
      global: '🌍 ' + (t('globalSources') || 'Global Platforms'),
      IT: '🇮🇹 Italia', ES: '🇪🇸 España', FR: '🇫🇷 France', DE: '🇩🇪 Deutschland',
      GB: '🇬🇧 United Kingdom', US: '🇺🇸 United States', JP: '🇯🇵 Japan',
      PT: '🇵🇹 Portugal', NL: '🇳🇱 Netherlands', GR: '🇬🇷 Greece',
    };

    function renderSourceRow(src) {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:6px 0;padding-left:4px;cursor:pointer';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = enabled.includes(src.id);
      cb.style.cssText = 'width:18px;height:18px;flex-shrink:0';
      cb.addEventListener('change', () => {
        const current = getEnabledSources();
        if (cb.checked) {
          if (!current.includes(src.id)) current.push(src.id);
        } else {
          const idx = current.indexOf(src.id);
          if (idx >= 0) current.splice(idx, 1);
        }
        setEnabledSources(current);
      });
      row.appendChild(cb);
      const lbl = document.createElement('span');
      lbl.style.cssText = 'font-size:13px';
      lbl.textContent = src.label.replace(/^🇮🇹 |^🇪🇸 |^🇫🇷 |^🇩🇪 |^🇬🇧 |^🇺🇸 |^🇯🇵 |^🇵🇹 |^🇳🇱 |^🇬🇷 /g, '');
      row.appendChild(lbl);
      return row;
    }

    Object.keys(groups).forEach((groupKey) => {
      const groupHeader = document.createElement('div');
      groupHeader.style.cssText = 'font-size:13px;font-weight:600;margin-top:12px;padding:4px 0;border-bottom:1px solid var(--border);color:var(--text)';
      groupHeader.textContent = groupLabels[groupKey] || groupKey;
      srcSection.appendChild(groupHeader);
      groups[groupKey].forEach((src) => {
        srcSection.appendChild(renderSourceRow(src));
      });
    });

    // Custom global URLs
    const customLabel = document.createElement('p');
    customLabel.className = 'text-secondary text-sm mt-12';
    customLabel.style.fontWeight = '600';
    customLabel.textContent = t('customSources') || 'Custom websites (global)';
    srcSection.appendChild(customLabel);

    const customList = document.createElement('div');
    const customUrls = getCustomSources();

    function renderCustomList() {
      customList.textContent = '';
      const urls = getCustomSources();
      urls.forEach((url, i) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)';
        const urlText = document.createElement('span');
        urlText.style.cssText = 'flex:1;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
        urlText.textContent = url;
        row.appendChild(urlText);
        const delBtn = document.createElement('button');
        delBtn.className = 'btn btn-small btn-secondary';
        delBtn.style.cssText = 'color:#e74c3c;padding:2px 8px;font-size:12px';
        delBtn.textContent = '✕';
        delBtn.addEventListener('click', () => {
          const current = getCustomSources();
          current.splice(i, 1);
          setCustomSources(current);
          renderCustomList();
        });
        row.appendChild(delBtn);
        customList.appendChild(row);
      });
      if (urls.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-secondary text-sm';
        empty.textContent = t('noCustomSources') || 'No custom sources added';
        customList.appendChild(empty);
      }
    }
    renderCustomList();
    srcSection.appendChild(customList);

    const addCustomBtn = document.createElement('button');
    addCustomBtn.className = 'btn btn-secondary btn-block mt-8';
    addCustomBtn.textContent = '+ ' + (t('addSource') || 'Add website');
    addCustomBtn.addEventListener('click', async () => {
      const url = await prompt(
        t('addSource') || 'Add website',
        t('addSourceMsg') || 'Enter a website URL or name (e.g. romatoday.it)',
        ''
      );
      if (url && url.trim()) {
        const current = getCustomSources();
        current.push(url.trim());
        setCustomSources(current);
        renderCustomList();
      }
    });
    srcSection.appendChild(addCustomBtn);

    content.appendChild(srcSection);

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

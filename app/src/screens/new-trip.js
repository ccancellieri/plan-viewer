// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { navigate } from '../router.js';
import { actionSheet, prompt as modalPrompt } from '../ui/modal.js';
import { showLoader } from '../ui/loader.js';
import { searchLocation, reverseGeocode } from '../lib/geo.js';
import { getCurrentPosition } from '../lib/native.js';
import { providers } from '../providers/index.js';

let state = {};

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function renderLocationStep(container) {
  clearContainer(container);

  const heading = document.createElement('h3');
  heading.textContent = t('city') || 'Where are you going?';
  container.appendChild(heading);

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = t('cityPlaceholder') || 'Search city or place...';
  input.className = 'input';
  container.appendChild(input);

  const btnRow = document.createElement('div');
  btnRow.className = 'flex-row gap-8 mt-8';

  const searchBtn = document.createElement('button');
  searchBtn.className = 'btn btn-primary';
  searchBtn.textContent = t('searchBtn') || 'Search';
  searchBtn.addEventListener('click', async () => {
    const query = input.value.trim();
    if (!query) return;
    const dismiss = showLoader(t('searching') || 'Searching...');
    try {
      const results = await searchLocation(query);
      dismiss();
      if (!results || results.length === 0) return;
      const labels = results.map((r) => r.shortName || r.name);
      const idx = await actionSheet(t('city') || 'Select location', labels);
      if (idx < 0) return;
      const loc = results[idx];
      state.city = loc.city || loc.shortName;
      state.centerLat = loc.lat;
      state.centerLng = loc.lng;
      state.centerName = loc.name;
      renderDatesStep(container);
    } catch (err) {
      dismiss();
    }
  });
  btnRow.appendChild(searchBtn);

  const gpsBtn = document.createElement('button');
  gpsBtn.className = 'btn btn-secondary';
  gpsBtn.textContent = t('useGPS') || 'Use GPS';
  gpsBtn.addEventListener('click', async () => {
    const dismiss = showLoader(t('locating') || 'Locating...');
    try {
      const pos = await getCurrentPosition();
      const loc = await reverseGeocode(pos.lat, pos.lng);
      dismiss();
      if (!loc) return;
      state.city = loc.city || loc.shortName;
      state.centerLat = loc.lat;
      state.centerLng = loc.lng;
      state.centerName = loc.name;
      renderDatesStep(container);
    } catch {
      dismiss();
    }
  });
  btnRow.appendChild(gpsBtn);

  container.appendChild(btnRow);
}

function renderDatesStep(container) {
  clearContainer(container);

  const heading = document.createElement('h3');
  heading.textContent = t('dates') || 'When?';
  container.appendChild(heading);

  const locInfo = document.createElement('p');
  locInfo.className = 'text-secondary';
  locInfo.textContent = state.city || state.centerName || '';
  container.appendChild(locInfo);

  const startLabel = document.createElement('label');
  startLabel.textContent = t('startDate') || 'Start date';
  container.appendChild(startLabel);

  const startInput = document.createElement('input');
  startInput.type = 'date';
  startInput.className = 'input';
  container.appendChild(startInput);

  const endLabel = document.createElement('label');
  endLabel.textContent = t('endDate') || 'End date';
  container.appendChild(endLabel);

  const endInput = document.createElement('input');
  endInput.type = 'date';
  endInput.className = 'input';
  container.appendChild(endInput);

  const btnRow = document.createElement('div');
  btnRow.className = 'flex-row gap-8 mt-8';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-secondary';
  backBtn.textContent = t('back') || 'Back';
  backBtn.addEventListener('click', () => renderLocationStep(container));
  btnRow.appendChild(backBtn);

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-primary';
  nextBtn.textContent = t('next') || 'Next';
  nextBtn.addEventListener('click', () => {
    state.dateStart = startInput.value;
    state.dateEnd = endInput.value;
    if (!state.dateStart || !state.dateEnd) return;
    renderProviderStep(container);
  });
  btnRow.appendChild(nextBtn);

  container.appendChild(btnRow);
}

async function renderProviderStep(container) {
  clearContainer(container);

  const labels = providers.map((p) => p.label);
  const idx = await actionSheet(t('provider') || 'Select AI provider', labels);
  if (idx < 0) {
    renderDatesStep(container);
    return;
  }

  const provider = providers[idx];
  const providerId = provider.id;

  if (!provider.free) {
    const storedKey = db.readJSON('apikey_' + providerId);
    if (!storedKey) {
      const key = await modalPrompt(
        t('apiKeyNeeded') || 'Enter API Key',
        provider.label + ' API Key',
        ''
      );
      if (!key) {
        renderDatesStep(container);
        return;
      }
      db.writeJSON('apikey_' + providerId, key);
    }
  }

  navigate('questionnaire', {
    city: state.city,
    centerLat: state.centerLat,
    centerLng: state.centerLng,
    centerName: state.centerName,
    dateStart: state.dateStart,
    dateEnd: state.dateEnd,
    providerId,
  });
}

export default {
  mount(el, params) {
    state = {};
    const content = el.querySelector('#new-trip-content') || el;
    clearContainer(content);
    renderLocationStep(content);
  },
};

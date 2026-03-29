// Copyright 2026 Carlo Cancellieri
// SPDX-License-Identifier: GPL-3.0-only WITH additional terms

import './app.css';
import './map/map.css';
import { loadLocale, t } from './i18n/index.js';
import { initStorage, db } from './storage/index.js';
import webBackend from './storage/web.js';
import { registerScreen, initRouter, navigate } from './router.js';
import { loadSources } from './lib/sources.js';
import { initSpatialDB } from './lib/spatial-db.js';
import { loadQuestionnaire } from './lib/questionnaire-loader.js';

// Screen modules
import homeScreen from './screens/home.js';
import newTripScreen from './screens/new-trip.js';
import questionnaireScreen from './screens/questionnaire.js';
import voicePlanScreen from './screens/voice-plan.js';
import searchScreen from './screens/search.js';
import myMapsScreen from './screens/my-maps.js';
import mapViewScreen from './screens/map-view.js';
import settingsScreen from './screens/settings.js';
import myTripsScreen from './screens/my-trips.js';
import tripBuilderScreen from './screens/trip-builder.js';

// Init storage with web backend (swap to capacitor.js for native)
initStorage(webBackend);

// Detect preferred language
function detectLang() {
  const saved = db.readJSON('language', null) || db.readJSON('app_lang', null);
  if (saved) return saved;
  const nav = navigator.language?.slice(0, 2);
  if (['it', 'es'].includes(nav)) return nav;
  return 'en';
}

// Apply translations to [data-t] elements
function applyTranslations() {
  document.querySelectorAll('[data-t]').forEach(el => {
    const key = el.getAttribute('data-t');
    el.textContent = t(key);
  });
}

// Back button handler
function initBackButtons() {
  document.querySelectorAll('[data-back]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.history.back();
    });
  });
}

// Home button handler
function initHomeButtons() {
  document.querySelectorAll('[data-home]').forEach(btn => {
    btn.addEventListener('click', () => {
      navigate('home');
    });
  });
}

// Register all screens
registerScreen('home', homeScreen);
registerScreen('new-trip', newTripScreen);
registerScreen('questionnaire', questionnaireScreen);
registerScreen('voice-plan', voicePlanScreen);
registerScreen('search', searchScreen);
registerScreen('my-maps', myMapsScreen);
registerScreen('map-view', mapViewScreen);
registerScreen('settings', settingsScreen);
registerScreen('my-trips', myTripsScreen);
registerScreen('trip-builder', tripBuilderScreen);

// License acceptance gate
function showLicenseGate() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'license-gate';
    Object.assign(overlay.style, {
      position: 'fixed', inset: '0', zIndex: '99999',
      background: 'var(--bg)', color: 'var(--text)',
      display: 'flex', flexDirection: 'column', padding: '16px',
      fontFamily: 'var(--font)',
    });

    const heading = document.createElement('h2');
    heading.textContent = 'License Agreement';
    Object.assign(heading.style, { marginBottom: '12px', textAlign: 'center' });

    const textBox = document.createElement('div');
    Object.assign(textBox.style, {
      flex: '1', overflowY: 'auto', background: 'var(--bg-secondary)',
      border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
      padding: '14px', fontSize: '13px', lineHeight: '1.5',
      whiteSpace: 'pre-wrap', marginBottom: '14px',
    });
    textBox.textContent = `This software is licensed under the GNU General Public License v3.0 with Additional Terms.

NON-COMMERCIAL USE
Personal, educational, and research use is free under GPL-3.0, including the right to modify and redistribute under the same terms.

COMMERCIAL USE
Commercial use requires a per-Search fee paid to the copyright holder under a separate commercial license. "Search" means any invocation of an AI/LLM provider through this Software. Commercial Use without a valid commercial license is a violation.

"Commercial Use" includes: offering as SaaS, embedding in a product for sale, using to generate revenue (directly or indirectly), or use by any for-profit entity.

FULL LICENSE
The complete license text is available at:
https://github.com/ccancellieri/plan-viewer/blob/master/LICENSE

By clicking "I Accept" you agree to both the GPL-3.0 terms and the Additional Terms above.`;

    const btnRow = document.createElement('div');
    Object.assign(btnRow.style, { display: 'flex', gap: '12px', justifyContent: 'center' });

    const declineBtn = document.createElement('button');
    declineBtn.textContent = 'Decline';
    Object.assign(declineBtn.style, {
      padding: '12px 28px', borderRadius: 'var(--radius-sm)',
      border: '1px solid var(--border)', background: 'var(--bg-secondary)',
      color: 'var(--text-secondary)', fontSize: '15px', cursor: 'pointer',
    });

    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = 'I Accept';
    Object.assign(acceptBtn.style, {
      padding: '12px 28px', borderRadius: 'var(--radius-sm)', border: 'none',
      background: 'var(--accent)', color: '#fff', fontSize: '15px',
      fontWeight: '600', cursor: 'pointer',
    });

    acceptBtn.addEventListener('click', () => {
      db.writeJSON('license_accepted', true);
      overlay.remove();
      resolve(true);
    });

    declineBtn.addEventListener('click', () => {
      declineBtn.textContent = 'App requires license acceptance';
      declineBtn.disabled = true;
    });

    btnRow.append(declineBtn, acceptBtn);
    overlay.append(heading, textBox, btnRow);
    document.body.appendChild(overlay);
  });
}

// Boot
async function boot() {
  const lang = detectLang();
  await loadLocale(lang);
  applyTranslations();
  initBackButtons();
  initHomeButtons();

  // Check license acceptance before starting
  if (!db.readJSON('license_accepted', false)) {
    await showLicenseGate();
  }

  // Init spatial DB (non-blocking on failure)
  try { await initSpatialDB(); } catch { /* IDB unavailable — app still works */ }

  // Load external catalogs (non-blocking on failure)
  loadSources().catch(() => {});
  loadQuestionnaire().catch(() => {});

  initRouter('home');

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();

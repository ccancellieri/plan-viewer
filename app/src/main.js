// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import './app.css';
import './map/map.css';
import { loadLocale, t } from './i18n/index.js';
import { initStorage, db } from './storage/index.js';
import webBackend from './storage/web.js';
import { registerScreen, initRouter } from './router.js';

// Screen modules
import homeScreen from './screens/home.js';
import newTripScreen from './screens/new-trip.js';
import questionnaireScreen from './screens/questionnaire.js';
import voicePlanScreen from './screens/voice-plan.js';
import searchScreen from './screens/search.js';
import myMapsScreen from './screens/my-maps.js';
import mapViewScreen from './screens/map-view.js';
import settingsScreen from './screens/settings.js';

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

// Register all screens
registerScreen('home', homeScreen);
registerScreen('new-trip', newTripScreen);
registerScreen('questionnaire', questionnaireScreen);
registerScreen('voice-plan', voicePlanScreen);
registerScreen('search', searchScreen);
registerScreen('my-maps', myMapsScreen);
registerScreen('map-view', mapViewScreen);
registerScreen('settings', settingsScreen);

// Boot
async function boot() {
  const lang = detectLang();
  await loadLocale(lang);
  applyTranslations();
  initBackButtons();
  initRouter('home');

  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

boot();

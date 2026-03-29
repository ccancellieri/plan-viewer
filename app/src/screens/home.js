// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t, getLang } from '../i18n/index.js';
import { navigate } from '../router.js';

const APP_VERSION = '1.5.0';

const MENU_ITEMS = [
  { icon: '🗺️', key: 'newTrip',   screen: 'new-trip'   },
  { icon: '🎙️', key: 'voicePlan', screen: 'voice-plan' },
  { icon: '📚', key: 'myMaps',    screen: 'my-maps'    },
  { icon: '🛤️', key: 'myTrips',   screen: 'my-trips'   },
  { icon: '⚙️', key: 'settings',  screen: 'settings'   },
];

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function getInstallHint() {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isIOSChrome = isIOS && /crios|chrome/i.test(ua);
  const isIOSSafari = isIOS && !isIOSChrome && /safari/i.test(ua);

  if (isIOSChrome) {
    return {
      icon: '⚠️',
      en: 'To install: open this page in Safari (not Chrome), then tap 📤 → "Add to Home Screen".',
      it: 'Per installare: apri questa pagina in Safari (non Chrome), poi tocca 📤 → "Aggiungi alla schermata Home".',
      es: 'Para instalar: abre esta página en Safari (no Chrome), luego toca 📤 → "Agregar a pantalla de inicio".',
    };
  }
  if (isIOSSafari) {
    return {
      icon: '📲',
      en: 'Install: tap 📤 then "Add to Home Screen".',
      it: 'Installa: tocca 📤 poi "Aggiungi alla schermata Home".',
      es: 'Instalar: toca 📤 y luego "Agregar a pantalla de inicio".',
    };
  }
  if (isAndroid) {
    return {
      icon: '📲',
      en: 'Install: tap ⋮ then "Add to Home Screen".',
      it: 'Installa: tocca ⋮ poi "Aggiungi alla schermata Home".',
      es: 'Instalar: toca ⋮ y luego "Agregar a pantalla de inicio".',
    };
  }
  // Fallback for iOS unknown browser or desktop
  if (isIOS) {
    return {
      icon: '📲',
      en: 'Install: open in Safari, tap 📤 → "Add to Home Screen".',
      it: 'Installa: apri in Safari, tocca 📤 → "Aggiungi alla schermata Home".',
      es: 'Instalar: abre en Safari, toca 📤 → "Agregar a pantalla de inicio".',
    };
  }
  return null;
}

export default {
  mount(el) {
    const content = el.querySelector('#home-content');
    content.textContent = '';
    content.className = 'home-content';

    // Greeting
    const msg = document.createElement('p');
    msg.className = 'home-greeting';
    msg.textContent = t('mainMsg') || 'What would you like to do?';
    content.appendChild(msg);

    // Menu buttons
    const menu = document.createElement('div');
    menu.className = 'flex-col gap-12';
    MENU_ITEMS.forEach(({ icon, key, screen }) => {
      const btn = document.createElement('button');
      btn.className = 'menu-btn';
      const iconSpan = document.createElement('span');
      iconSpan.className = 'icon';
      iconSpan.textContent = icon;
      btn.appendChild(iconSpan);
      btn.appendChild(document.createTextNode(t(key)));
      btn.addEventListener('click', () => navigate(screen));
      menu.appendChild(btn);
    });
    content.appendChild(menu);

    // Version
    const ver = document.createElement('p');
    ver.className = 'text-secondary text-sm text-center mt-16';
    ver.textContent = 'v' + APP_VERSION;
    ver.style.opacity = '0.5';
    content.appendChild(ver);

    // Install hint (only shown in browser, not when installed)
    if (!isStandalone()) {
      const hint = getInstallHint();
      if (hint) {
        const lang = getLang().slice(0, 2);
        const text = hint[lang] || hint.en;
        const banner = document.createElement('div');
        banner.className = 'install-hint mt-16';
        const ic = document.createElement('span');
        ic.className = 'icon';
        ic.textContent = hint.icon;
        banner.appendChild(ic);
        const txt = document.createElement('span');
        txt.textContent = text;
        banner.appendChild(txt);
        content.appendChild(banner);
      }
    }
  },
};

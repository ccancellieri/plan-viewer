// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t } from '../i18n/index.js';
import { navigate } from '../router.js';

const MENU_ITEMS = [
  { icon: '🗺️', key: 'newTrip',   screen: 'new-trip'   },
  { icon: '🎙️', key: 'voicePlan', screen: 'voice-plan' },
  { icon: '📚', key: 'myMaps',    screen: 'my-maps'    },
  { icon: '⚙️', key: 'settings',  screen: 'settings'   },
];

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
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

    // Install hint (only shown in browser, not when installed)
    if (!isStandalone()) {
      const lang = document.documentElement.lang || 'en';
      const hints = {
        it: { text: 'Installa questa app: in Safari tocca 📤 poi "Aggiungi alla schermata Home".', icon: '📲' },
        es: { text: 'Instala esta app: en Safari toca 📤 y luego "Agregar a pantalla de inicio".', icon: '📲' },
        en: { text: 'Install this app: in Safari tap 📤 then "Add to Home Screen".', icon: '📲' },
      };
      const h = hints[lang] || hints.en;
      const banner = document.createElement('div');
      banner.className = 'install-hint mt-16';
      const ic = document.createElement('span');
      ic.className = 'icon';
      ic.textContent = h.icon;
      banner.appendChild(ic);
      const txt = document.createElement('span');
      txt.textContent = h.text;
      banner.appendChild(txt);
      content.appendChild(banner);
    }
  },
};

// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t } from '../i18n/index.js';
import { navigate } from '../router.js';

function createMenuBtn(icon, labelKey, screen) {
  const btn = document.createElement('button');
  btn.className = 'menu-btn';
  const iconSpan = document.createElement('span');
  iconSpan.className = 'icon';
  iconSpan.textContent = icon;
  btn.appendChild(iconSpan);
  btn.appendChild(document.createTextNode(' ' + t(labelKey)));
  btn.addEventListener('click', () => navigate(screen));
  return btn;
}

export default {
  mount(el) {
    const content = el.querySelector('#home-content');
    content.textContent = '';

    const msg = document.createElement('p');
    msg.className = 'text-secondary text-center mt-16';
    msg.textContent = t('mainMsg');
    content.appendChild(msg);

    const menu = document.createElement('div');
    menu.className = 'flex-col gap-12 mt-16';
    menu.appendChild(createMenuBtn('+', 'newTrip', 'new-trip'));
    menu.appendChild(createMenuBtn('\u266A', 'voicePlan', 'voice-plan'));
    menu.appendChild(createMenuBtn('\u2637', 'myMaps', 'my-maps'));
    menu.appendChild(createMenuBtn('\u2699', 'settings', 'settings'));
    content.appendChild(menu);
  },
};

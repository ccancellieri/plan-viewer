// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

const screens = {};
const lastParams = {};

export function registerScreen(name, handler) {
  screens[name] = handler;
}

export function navigate(screen, params) {
  if (params != null) lastParams[screen] = params;
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.querySelector(`[data-screen="${screen}"]`);
  if (el) {
    el.classList.add('active');
    screens[screen]?.mount(el, lastParams[screen] || {});
  }
  window.location.hash = screen;
}

export function getCurrentScreen() {
  return window.location.hash.slice(1) || 'home';
}

export function initRouter(defaultScreen = 'home') {
  window.addEventListener('hashchange', () => {
    const screen = getCurrentScreen();
    if (screens[screen]) navigate(screen);
  });
  navigate(window.location.hash.slice(1) || defaultScreen);
}

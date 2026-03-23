// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

let strings = {};
let currentLang = 'en';

const modules = {
  en: () => import('./en.json'),
  it: () => import('./it.json'),
  es: () => import('./es.json'),
};

export async function loadLocale(lang) {
  if (!modules[lang]) lang = 'en';
  strings = (await modules[lang]()).default;
  currentLang = lang;
}

export function t(key) {
  return strings[key] || key;
}

export function getLang() {
  return currentLang;
}

export function getAvailableLocales() {
  return Object.keys(modules);
}

// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { db } from '../storage/index.js';

/**
 * Bundled fallback questionnaire structure.
 * Matches the existing hardcoded questionnaire sections.
 */
const FALLBACK_QUESTIONNAIRE = {
  sections: [
    {
      key: 'mood',
      labelKey: 'qMood',
      type: 'chips',
      multi: true,
      options: [
        { value: 'relax', labelKey: 'qMoodRelax' },
        { value: 'adventure', labelKey: 'qMoodAdventure' },
        { value: 'culture', labelKey: 'qMoodCulture' },
        { value: 'nightlife', labelKey: 'qMoodNightlife' },
        { value: 'family', labelKey: 'qMoodFamily' },
        { value: 'romantic', labelKey: 'qMoodRomantic' },
        { value: 'foodie', labelKey: 'qMoodFoodie' },
        { value: 'sport', labelKey: 'qMoodSport' },
      ],
    },
    {
      key: 'time',
      labelKey: 'qTime',
      type: 'chips',
      multi: true,
      options: [
        { value: 'morning', labelKey: 'qTimeMorning' },
        { value: 'afternoon', labelKey: 'qTimeAfternoon' },
        { value: 'evening', labelKey: 'qTimeEvening' },
        { value: 'night', labelKey: 'qTimeNight' },
        { value: 'all_day', labelKey: 'qTimeAllDay' },
      ],
    },
    {
      key: 'budget',
      labelKey: 'qBudget',
      type: 'chips',
      multi: false,
      options: [
        { value: 'free', labelKey: 'qBudgetFree' },
        { value: 'cheap', labelKey: 'qBudgetCheap' },
        { value: 'medium', labelKey: 'qBudgetMedium' },
        { value: 'any', labelKey: 'qBudgetAny' },
      ],
    },
    {
      key: 'group',
      labelKey: 'qGroup',
      type: 'chips',
      multi: false,
      options: [
        { value: 'solo', labelKey: 'qGroupSolo' },
        { value: 'couple', labelKey: 'qGroupCouple' },
        { value: 'friends', labelKey: 'qGroupFriends' },
        { value: 'family', labelKey: 'qGroupFamily' },
        { value: 'large', labelKey: 'qGroupLarge' },
      ],
    },
    {
      key: 'distance',
      labelKey: 'qDistance',
      type: 'chips',
      multi: false,
      options: [
        { value: '1km', labelKey: 'qDist1' },
        { value: '3km', labelKey: 'qDist3' },
        { value: '5km', labelKey: 'qDist5' },
        { value: '10km', labelKey: 'qDist10' },
        { value: '20km', labelKey: 'qDist20' },
      ],
    },
    {
      key: 'interests',
      labelKey: 'qSpecific',
      type: 'text',
      placeholderKey: 'qSpecificPlaceholder',
    },
    {
      key: 'avoid',
      labelKey: 'qAvoid',
      type: 'text',
      placeholderKey: 'qAvoidPlaceholder',
    },
  ],
};

let _cached = null;

const DEFAULT_URL = 'questionnaire.json';

/** Get the configured questionnaire URL (or default) */
export function getQuestionnaireUrl() {
  return db.readJSON('questionnaire_file_url', '') || DEFAULT_URL;
}

/** Set a custom questionnaire URL (empty = use default) */
export function setQuestionnaireUrl(url) {
  db.writeJSON('questionnaire_file_url', url || '');
  _cached = null;
}

/** Load questionnaire structure from URL, fallback to bundled. */
export async function loadQuestionnaire() {
  if (_cached) return _cached;

  const url = getQuestionnaireUrl();
  try {
    const resp = await fetch(url, { cache: 'no-cache' });
    if (!resp.ok) throw new Error(resp.status);
    const data = await resp.json();
    _cached = data && data.sections ? data : FALLBACK_QUESTIONNAIRE;
    db.writeJSON('questionnaire_cache', _cached);
  } catch {
    _cached = db.readJSON('questionnaire_cache', null) || FALLBACK_QUESTIONNAIRE;
  }
  return _cached;
}

/** Force reload from URL */
export async function reloadQuestionnaire() {
  _cached = null;
  return loadQuestionnaire();
}

/** Synchronous getter — use after loadQuestionnaire() at boot. */
export function getQuestionnaire() {
  if (_cached) return _cached;
  _cached = db.readJSON('questionnaire_cache', null) || FALLBACK_QUESTIONNAIRE;
  return _cached;
}

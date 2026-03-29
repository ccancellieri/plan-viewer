// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { navigate } from '../router.js';
import { createChipSelect } from '../ui/chip-select.js';

const STEPS = ['mood', 'time', 'budget', 'group', 'distance', 'interests', 'avoid', 'summary'];

function getMoodOptions() {
  return [
    { value: 'relax', label: t('qMoodRelax') || 'Relax' },
    { value: 'adventure', label: t('qMoodAdventure') || 'Adventure' },
    { value: 'culture', label: t('qMoodCulture') || 'Culture' },
    { value: 'nightlife', label: t('qMoodNightlife') || 'Nightlife' },
    { value: 'family', label: t('qMoodFamily') || 'Family' },
    { value: 'romantic', label: t('qMoodRomantic') || 'Romantic' },
    { value: 'foodie', label: t('qMoodFoodie') || 'Foodie' },
    { value: 'sport', label: t('qMoodSport') || 'Sport' },
  ];
}

function getTimeOptions() {
  return [
    { value: 'morning', label: t('qTimeMorning') || 'Morning' },
    { value: 'afternoon', label: t('qTimeAfternoon') || 'Afternoon' },
    { value: 'evening', label: t('qTimeEvening') || 'Evening' },
    { value: 'night', label: t('qTimeNight') || 'Night' },
    { value: 'all_day', label: t('qTimeAllDay') || 'All Day' },
  ];
}

function getBudgetOptions() {
  return [
    { value: 'free', label: t('qBudgetFree') || 'Free' },
    { value: 'cheap', label: t('qBudgetCheap') || 'Cheap' },
    { value: 'medium', label: t('qBudgetMedium') || 'Medium' },
    { value: 'any', label: t('qBudgetAny') || 'Any' },
  ];
}

function getGroupOptions() {
  return [
    { value: 'solo', label: t('qGroupSolo') || 'Solo' },
    { value: 'couple', label: t('qGroupCouple') || 'Couple' },
    { value: 'friends', label: t('qGroupFriends') || 'Friends' },
    { value: 'family', label: t('qGroupFamily') || 'Family' },
    { value: 'large', label: t('qGroupLarge') || 'Large Group' },
  ];
}

function getDistanceOptions() {
  return [
    { value: '1km', label: t('qDist1') || '1 km' },
    { value: '3km', label: t('qDist3') || '3 km' },
    { value: '5km', label: t('qDist5') || '5 km' },
    { value: '10km', label: t('qDist10') || '10 km' },
    { value: '20km', label: t('qDist20') || '20+ km' },
  ];
}

let profile = {};
let currentStep = 0;
let tripParams = {};

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function createNavButtons(container, onBack, onNext, nextLabel) {
  const btnRow = document.createElement('div');
  btnRow.className = 'nav-btns';

  if (onBack) {
    const backBtn = document.createElement('button');
    backBtn.className = 'btn btn-secondary';
    backBtn.textContent = t('back') || 'Back';
    backBtn.addEventListener('click', onBack);
    btnRow.appendChild(backBtn);
  }

  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn btn-primary';
  nextBtn.textContent = nextLabel || t('next') || 'Next';
  nextBtn.addEventListener('click', onNext);
  btnRow.appendChild(nextBtn);

  container.appendChild(btnRow);
}

function renderStep(container) {
  clearContainer(container);
  const step = STEPS[currentStep];

  const heading = document.createElement('h3');

  const goBack = currentStep > 0
    ? () => { currentStep--; renderStep(container); }
    : null;
  const goNext = () => { currentStep++; renderStep(container); };

  function addDesc(text) {
    const p = document.createElement('p');
    p.className = 'text-secondary text-sm mb-8';
    p.textContent = text;
    container.appendChild(p);
  }

  switch (step) {
    case 'mood': {
      heading.textContent = t('qMood') || 'What mood?';
      container.appendChild(heading);
      addDesc(t('qMoodMsg') || 'What kind of experience are you looking for?');
      const chips = createChipSelect(getMoodOptions(), profile.mood || [], (val) => { profile.mood = val; });
      container.appendChild(chips);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'time': {
      heading.textContent = t('qTime') || 'Preferred times?';
      container.appendChild(heading);
      addDesc(t('qTimeMsg') || 'When do you want activities?');
      const chips = createChipSelect(getTimeOptions(), profile.time || [], (val) => { profile.time = val; });
      container.appendChild(chips);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'budget': {
      heading.textContent = t('qBudget') || 'Budget?';
      container.appendChild(heading);
      addDesc(t('qBudgetMsg') || 'How much do you want to spend?');
      const chips = createChipSelect(getBudgetOptions(), profile.budget ? [profile.budget] : [], (val) => { profile.budget = val[val.length - 1] || null; });
      container.appendChild(chips);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'group': {
      heading.textContent = t('qGroup') || 'Group type?';
      container.appendChild(heading);
      addDesc(t('qGroupMsg') || 'Who are you going with?');
      const chips = createChipSelect(getGroupOptions(), profile.group ? [profile.group] : [], (val) => { profile.group = val[val.length - 1] || null; });
      container.appendChild(chips);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'distance': {
      heading.textContent = t('qDistance') || 'Max distance?';
      container.appendChild(heading);
      addDesc(t('qDistanceMsg') || 'How far do you want to go?');
      const chips = createChipSelect(getDistanceOptions(), profile.distance ? [profile.distance] : [], (val) => { profile.distance = val[val.length - 1] || null; });
      container.appendChild(chips);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'interests': {
      heading.textContent = t('qSpecific') || 'Specific interests?';
      container.appendChild(heading);
      addDesc(t('qSpecificMsg') || 'Anything specific you want to find?');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input';
      input.placeholder = t('qSpecificPlaceholder') || 'e.g. live music, seafood, hiking...';
      input.value = profile.interests || '';
      input.addEventListener('input', () => { profile.interests = input.value; });
      container.appendChild(input);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'avoid': {
      heading.textContent = t('qAvoid') || 'Anything to avoid?';
      container.appendChild(heading);
      addDesc(t('qAvoidMsg') || 'Anything you want to avoid?');
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'input';
      input.placeholder = t('qAvoidPlaceholder') || 'e.g. crowded places, expensive restaurants...';
      input.value = profile.avoid || '';
      input.addEventListener('input', () => { profile.avoid = input.value; });
      container.appendChild(input);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'summary': {
      renderSummary(container);
      break;
    }
  }
}

function renderSummary(container) {
  const heading = document.createElement('h3');
  heading.textContent = t('qSummary') || 'Summary';
  container.appendChild(heading);

  function translateValues(values, optionsFn) {
    if (!values || !values.length) return '';
    const opts = optionsFn();
    return values.map((v) => {
      const opt = opts.find((o) => o.value === v);
      return opt ? opt.label : v;
    }).join(', ');
  }

  function translateValue(value, optionsFn) {
    if (!value) return '';
    const opt = optionsFn().find((o) => o.value === value);
    return opt ? opt.label : value;
  }

  const fields = [
    { key: 'mood', label: t('qMood') || 'Mood', value: translateValues(profile.mood, getMoodOptions) },
    { key: 'time', label: t('qTime') || 'Time', value: translateValues(profile.time, getTimeOptions) },
    { key: 'budget', label: t('qBudget') || 'Budget', value: translateValue(profile.budget, getBudgetOptions) },
    { key: 'group', label: t('qGroup') || 'Group', value: translateValue(profile.group, getGroupOptions) },
    { key: 'distance', label: t('qDistance') || 'Distance', value: translateValue(profile.distance, getDistanceOptions) },
    { key: 'interests', label: t('qSpecific') || 'Interests', value: profile.interests || '' },
    { key: 'avoid', label: t('qAvoid') || 'Avoid', value: profile.avoid || '' },
  ];

  fields.forEach((f, i) => {
    const row = document.createElement('div');
    row.className = 'summary-row flex-row gap-8 mt-4';

    const label = document.createElement('strong');
    label.textContent = f.label + ': ';
    row.appendChild(label);

    const val = document.createElement('span');
    val.textContent = f.value || '-';
    row.appendChild(val);

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn-small btn-secondary';
    editBtn.textContent = t('qEdit') || 'Edit';
    editBtn.addEventListener('click', () => {
      currentStep = i;
      renderStep(container);
    });
    row.appendChild(editBtn);

    container.appendChild(row);
  });

  function doSearch(loadAll) {
    // Save profile for reuse in future searches
    db.writeJSON('search_profile', profile);
    navigate('search', {
      ...tripParams,
      mood: profile.mood || [],
      time: profile.time || [],
      budget: profile.budget || null,
      group: profile.group || null,
      distance: profile.distance || null,
      interests: profile.interests || '',
      avoid: profile.avoid || '',
      loadAll: loadAll || false,
    });
  }

  const hint = document.createElement('p');
  hint.className = 'text-secondary text-sm text-center mt-8';
  hint.textContent = t('qEditOrSearch') || 'Tap Search to go, or tap any field to edit it';
  container.appendChild(hint);

  const btnRow = document.createElement('div');
  btnRow.className = 'nav-btns';

  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-secondary';
  backBtn.textContent = t('back') || 'Back';
  backBtn.addEventListener('click', () => {
    currentStep = STEPS.length - 2;
    renderStep(container);
  });
  btnRow.appendChild(backBtn);

  const searchBtn = document.createElement('button');
  searchBtn.className = 'btn btn-primary';
  searchBtn.textContent = (t('qSearch') || 'Search') + ' (~20)';
  searchBtn.addEventListener('click', () => doSearch(false));
  btnRow.appendChild(searchBtn);

  container.appendChild(btnRow);

  const searchAllBtn = document.createElement('button');
  searchAllBtn.className = 'btn btn-primary btn-block mt-8';
  searchAllBtn.style.cssText = 'background:#667eea;border-color:#667eea';
  searchAllBtn.textContent = t('loadAll') || 'Search All';
  searchAllBtn.addEventListener('click', () => doSearch(true));
  container.appendChild(searchAllBtn);
}

function renderProfileChoice(container) {
  clearContainer(container);

  const heading = document.createElement('h3');
  heading.textContent = t('qTitle') || 'Trip Profile';
  container.appendChild(heading);

  const msg = document.createElement('p');
  msg.className = 'text-secondary';
  msg.textContent = t('qMsg') || 'You have a saved profile from a previous search.';
  container.appendChild(msg);

  // Show saved profile summary
  const saved = db.readJSON('search_profile', {});
  const summaryDiv = document.createElement('div');
  summaryDiv.className = 'mt-8 mb-8';
  summaryDiv.style.cssText = 'padding:12px;background:var(--bg-card);border-radius:8px;border:1px solid var(--border)';
  const fields = [
    { label: t('qMood') || 'Mood', value: (saved.mood || []).join(', ') },
    { label: t('qTime') || 'Time', value: (saved.time || []).join(', ') },
    { label: t('qBudget') || 'Budget', value: saved.budget || '' },
    { label: t('qGroup') || 'Group', value: saved.group || '' },
    { label: t('qDistance') || 'Distance', value: saved.distance || '' },
    { label: t('qSpecific') || 'Interests', value: saved.interests || '' },
    { label: t('qAvoid') || 'Avoid', value: saved.avoid || '' },
  ];
  fields.forEach((f) => {
    if (!f.value) return;
    const row = document.createElement('div');
    row.style.cssText = 'font-size:13px;margin:2px 0';
    const b = document.createElement('strong');
    b.textContent = f.label + ': ';
    row.appendChild(b);
    row.appendChild(document.createTextNode(f.value));
    summaryDiv.appendChild(row);
  });
  container.appendChild(summaryDiv);

  const reuseBtn = document.createElement('button');
  reuseBtn.className = 'btn btn-primary btn-block';
  reuseBtn.textContent = t('qUseGlobal') || 'Use saved profile';
  reuseBtn.addEventListener('click', () => {
    profile = { ...saved };
    currentStep = STEPS.indexOf('summary');
    renderStep(container);
  });
  container.appendChild(reuseBtn);

  const editBtn = document.createElement('button');
  editBtn.className = 'btn btn-secondary btn-block mt-8';
  editBtn.textContent = t('qEdit') || 'Edit profile';
  editBtn.addEventListener('click', () => {
    profile = { ...saved };
    currentStep = 0;
    renderStep(container);
  });
  container.appendChild(editBtn);

  const freshBtn = document.createElement('button');
  freshBtn.className = 'btn btn-secondary btn-block mt-8';
  freshBtn.textContent = t('qFromScratch') || 'Start fresh';
  freshBtn.addEventListener('click', () => {
    profile = {};
    currentStep = 0;
    renderStep(container);
  });
  container.appendChild(freshBtn);
}

export default {
  mount(el, params) {
    tripParams = params || {};
    profile = {};
    currentStep = 0;
    const content = el.querySelector('#questionnaire-content') || el;
    clearContainer(content);

    // If a saved profile exists, offer to reuse it
    const savedProfile = db.readJSON('search_profile', null);
    if (savedProfile && Object.keys(savedProfile).some((k) => savedProfile[k] && (Array.isArray(savedProfile[k]) ? savedProfile[k].length > 0 : true))) {
      renderProfileChoice(content);
    } else {
      renderStep(content);
    }
  },
};

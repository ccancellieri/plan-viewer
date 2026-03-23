// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t } from '../i18n/index.js';
import { navigate } from '../router.js';
import { createChipSelect } from '../ui/chip-select.js';

const STEPS = ['mood', 'time', 'budget', 'group', 'distance', 'interests', 'avoid', 'summary'];

const MOOD_OPTIONS = [
  { value: 'relax', label: 'Relax' },
  { value: 'adventure', label: 'Adventure' },
  { value: 'culture', label: 'Culture' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'family', label: 'Family' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'foodie', label: 'Foodie' },
  { value: 'sport', label: 'Sport' },
];

const TIME_OPTIONS = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
  { value: 'night', label: 'Night' },
  { value: 'all_day', label: 'All Day' },
];

const BUDGET_OPTIONS = [
  { value: 'free', label: 'Free' },
  { value: 'cheap', label: 'Cheap' },
  { value: 'medium', label: 'Medium' },
  { value: 'any', label: 'Any' },
];

const GROUP_OPTIONS = [
  { value: 'solo', label: 'Solo' },
  { value: 'couple', label: 'Couple' },
  { value: 'friends', label: 'Friends' },
  { value: 'family', label: 'Family' },
  { value: 'large', label: 'Large Group' },
];

const DISTANCE_OPTIONS = [
  { value: '1km', label: '1 km' },
  { value: '3km', label: '3 km' },
  { value: '5km', label: '5 km' },
  { value: '10km', label: '10 km' },
  { value: '20km', label: '20 km' },
];

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
  btnRow.className = 'flex-row gap-8 mt-8';

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

  switch (step) {
    case 'mood': {
      heading.textContent = t('qMood') || 'What mood?';
      container.appendChild(heading);
      const chips = createChipSelect(MOOD_OPTIONS, profile.mood || [], (val) => { profile.mood = val; });
      container.appendChild(chips);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'time': {
      heading.textContent = t('qTime') || 'Preferred times?';
      container.appendChild(heading);
      const chips = createChipSelect(TIME_OPTIONS, profile.time || [], (val) => { profile.time = val; });
      container.appendChild(chips);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'budget': {
      heading.textContent = t('qBudget') || 'Budget?';
      container.appendChild(heading);
      const chips = createChipSelect(BUDGET_OPTIONS, profile.budget ? [profile.budget] : [], (val) => { profile.budget = val[val.length - 1] || null; });
      container.appendChild(chips);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'group': {
      heading.textContent = t('qGroup') || 'Group type?';
      container.appendChild(heading);
      const chips = createChipSelect(GROUP_OPTIONS, profile.group ? [profile.group] : [], (val) => { profile.group = val[val.length - 1] || null; });
      container.appendChild(chips);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'distance': {
      heading.textContent = t('qDistance') || 'Max distance?';
      container.appendChild(heading);
      const chips = createChipSelect(DISTANCE_OPTIONS, profile.distance ? [profile.distance] : [], (val) => { profile.distance = val[val.length - 1] || null; });
      container.appendChild(chips);
      createNavButtons(container, goBack, goNext);
      break;
    }
    case 'interests': {
      heading.textContent = t('qSpecific') || 'Specific interests?';
      container.appendChild(heading);
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

  const fields = [
    { key: 'mood', label: t('qMood') || 'Mood', value: (profile.mood || []).join(', ') },
    { key: 'time', label: t('qTime') || 'Time', value: (profile.time || []).join(', ') },
    { key: 'budget', label: t('qBudget') || 'Budget', value: profile.budget || '' },
    { key: 'group', label: t('qGroup') || 'Group', value: profile.group || '' },
    { key: 'distance', label: t('qDistance') || 'Distance', value: profile.distance || '' },
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

  const btnRow = document.createElement('div');
  btnRow.className = 'flex-row gap-8 mt-16';

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
  searchBtn.textContent = t('qSearch') || 'Search!';
  searchBtn.addEventListener('click', () => {
    navigate('search', {
      ...tripParams,
      mood: profile.mood || [],
      time: profile.time || [],
      budget: profile.budget || null,
      group: profile.group || null,
      distance: profile.distance || null,
      interests: profile.interests || '',
      avoid: profile.avoid || '',
    });
  });
  btnRow.appendChild(searchBtn);

  container.appendChild(btnRow);
}

export default {
  mount(el, params) {
    tripParams = params || {};
    profile = {};
    currentStep = 0;
    const content = el.querySelector('#questionnaire-content') || el;
    clearContainer(content);
    renderStep(content);
  },
};

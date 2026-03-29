// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { navigate } from '../router.js';
import { createChipSelect } from '../ui/chip-select.js';
import { getQuestionnaire } from '../lib/questionnaire-loader.js';

let profile = {};
let tripParams = {};

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

/** Resolve options from a section definition, applying i18n via t(). */
function resolveOptions(section) {
  if (!section.options) return [];
  return section.options.map(opt => ({
    value: opt.value,
    label: t(opt.labelKey) || opt.label || opt.value,
  }));
}

function translateValues(values, section) {
  if (!values || !values.length) return '';
  const opts = resolveOptions(section);
  return values.map(v => {
    const opt = opts.find(o => o.value === v);
    return opt ? opt.label : v;
  }).join(', ');
}

function translateValue(value, section) {
  if (!value) return '';
  const opts = resolveOptions(section);
  const opt = opts.find(o => o.value === value);
  return opt ? opt.label : value;
}

// Inline editor for chip-select fields (multi or single)
function renderChipEditor(detailEl, field, section) {
  if (detailEl._open) {
    detailEl.textContent = field.displayValue() || '-';
    detailEl._open = false;
    return;
  }
  detailEl._open = true;
  detailEl.textContent = '';

  const multi = section.multi;
  const selected = multi
    ? (profile[field.key] || [])
    : (profile[field.key] ? [profile[field.key]] : []);

  const chips = createChipSelect(resolveOptions(section), selected, (val) => {
    if (multi) {
      profile[field.key] = val;
    } else {
      profile[field.key] = val[val.length - 1] || null;
    }
  });
  detailEl.appendChild(chips);
}

// Inline editor for text input fields
function renderTextEditor(detailEl, field) {
  if (detailEl._open) {
    detailEl.textContent = field.displayValue() || '-';
    detailEl._open = false;
    return;
  }
  detailEl._open = true;
  detailEl.textContent = '';

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input';
  input.style.cssText = 'margin:4px 0;font-size:13px';
  input.placeholder = field.placeholder || '';
  input.value = profile[field.key] || '';
  input.addEventListener('input', () => { profile[field.key] = input.value; });
  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (detailEl._open) {
        detailEl._open = false;
        detailEl.textContent = '';
        detailEl.textContent = field.displayValue() || '-';
      }
    }, 150);
  });
  detailEl.appendChild(input);
  input.focus();
}

function doSearch(loadAll) {
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

function renderReview(container) {
  clearContainer(container);

  const q = getQuestionnaire();

  // Compact header with trip info
  const header = document.createElement('div');
  header.style.cssText = 'margin-bottom:12px';
  const title = document.createElement('h3');
  title.style.cssText = 'margin:0 0 4px 0';
  title.textContent = t('qSummary') || 'Search Profile';
  header.appendChild(title);

  if (tripParams.city) {
    const sub = document.createElement('p');
    sub.className = 'text-secondary text-sm';
    sub.style.margin = '0';
    const parts = [tripParams.city];
    if (tripParams.dateStart) parts.push(tripParams.dateStart + (tripParams.dateEnd ? ' → ' + tripParams.dateEnd : ''));
    sub.textContent = parts.join(' | ');
    header.appendChild(sub);
  }
  container.appendChild(header);

  // Build field definitions dynamically from questionnaire JSON
  const fields = q.sections.map(section => {
    if (section.type === 'chips') {
      return {
        key: section.key,
        label: t(section.labelKey) || section.key,
        type: 'chips',
        multi: !!section.multi,
        section,
        displayValue: () => section.multi
          ? translateValues(profile[section.key], section)
          : translateValue(profile[section.key], section),
      };
    }
    // text
    return {
      key: section.key,
      label: t(section.labelKey) || section.key,
      type: 'text',
      placeholder: t(section.placeholderKey) || section.placeholder || '',
      section,
      displayValue: () => profile[section.key] || '',
    };
  });

  // Render each field as a compact expandable row
  fields.forEach((field) => {
    const row = document.createElement('div');
    row.style.cssText = 'padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer';

    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:flex;align-items:center;gap:8px';

    const label = document.createElement('strong');
    label.style.cssText = 'font-size:13px;min-width:70px;flex-shrink:0';
    label.textContent = field.label;
    headerRow.appendChild(label);

    const valueSpan = document.createElement('span');
    valueSpan.style.cssText = 'font-size:13px;color:var(--text-secondary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
    valueSpan.textContent = field.displayValue() || '-';
    headerRow.appendChild(valueSpan);

    const arrow = document.createElement('span');
    arrow.style.cssText = 'font-size:11px;color:var(--text-secondary);flex-shrink:0';
    arrow.textContent = '▼';
    headerRow.appendChild(arrow);

    row.appendChild(headerRow);

    const detailEl = document.createElement('div');
    detailEl.style.cssText = 'margin-top:4px';
    detailEl._open = false;
    row.appendChild(detailEl);

    headerRow.addEventListener('click', () => {
      if (field.type === 'chips') {
        renderChipEditor(detailEl, field, field.section);
      } else {
        renderTextEditor(detailEl, field);
      }
      arrow.textContent = detailEl._open ? '▲' : '▼';
      if (!detailEl._open) {
        valueSpan.textContent = field.displayValue() || '-';
      }
    });

    container.appendChild(row);
  });

  // Search buttons
  const btnArea = document.createElement('div');
  btnArea.style.cssText = 'margin-top:16px;display:flex;flex-direction:column;gap:8px';

  const searchBtn = document.createElement('button');
  searchBtn.className = 'btn btn-primary btn-block';
  searchBtn.style.cssText = 'font-size:16px;padding:14px';
  searchBtn.textContent = (t('qSearch') || 'Search') + ' (~20)';
  searchBtn.addEventListener('click', () => doSearch(false));
  btnArea.appendChild(searchBtn);

  const searchAllBtn = document.createElement('button');
  searchAllBtn.className = 'btn btn-secondary btn-block';
  searchAllBtn.style.cssText = 'background:#667eea;color:white;border-color:#667eea';
  searchAllBtn.textContent = t('loadAll') || 'Search All';
  searchAllBtn.addEventListener('click', () => doSearch(true));
  btnArea.appendChild(searchAllBtn);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'btn btn-secondary btn-block';
  resetBtn.style.cssText = 'font-size:12px;opacity:0.7';
  resetBtn.textContent = t('qFromScratch') || 'Reset profile';
  resetBtn.addEventListener('click', () => {
    profile = {};
    db.writeJSON('search_profile', {});
    renderReview(container);
  });
  btnArea.appendChild(resetBtn);

  container.appendChild(btnArea);
}

export default {
  mount(el, params) {
    tripParams = params || {};
    const content = el.querySelector('#questionnaire-content') || el;
    clearContainer(content);

    const savedProfile = db.readJSON('search_profile', null);
    profile = savedProfile && typeof savedProfile === 'object' ? { ...savedProfile } : {};

    renderReview(content);
  },
};

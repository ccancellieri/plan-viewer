// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { navigate } from '../router.js';
import { showLoader } from '../ui/loader.js';
import { showToast } from '../ui/toast.js';
import { prompt as modalPrompt, errorReport } from '../ui/modal.js';
import { callLLM } from '../providers/index.js';
import { buildPaginatedPrompt } from '../lib/prompt.js';
import { parseActivities } from '../lib/parser.js';
import { getCategoryColor, getCategoryIcon } from '../lib/categories.js';
import { haversine, geocodeActivities } from '../lib/geo.js';

let allActivities = [];
let searchParams = {};

function clearContainer(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}

function createActivityCard(activity, centerLat, centerLng) {
  const card = document.createElement('div');
  card.className = 'activity-card';

  const header = document.createElement('div');
  header.className = 'activity-card-header flex-row gap-8';

  const cat = activity.category || 'other';
  const icon = document.createElement('span');
  icon.className = 'activity-icon';
  icon.textContent = getCategoryIcon(cat);
  icon.style.fontSize = '1.4em';
  header.appendChild(icon);

  const name = document.createElement('strong');
  name.className = 'activity-name';
  name.textContent = activity.name || '';
  header.appendChild(name);

  card.appendChild(header);

  if (activity.description) {
    const desc = document.createElement('p');
    desc.className = 'activity-desc text-secondary';
    desc.textContent = activity.description;
    card.appendChild(desc);
  }

  const meta = document.createElement('div');
  meta.className = 'activity-meta flex-row gap-8';

  if (activity.date) {
    const dateSpan = document.createElement('span');
    dateSpan.textContent = activity.date;
    if (activity.time_start) {
      dateSpan.textContent += ' ' + activity.time_start;
      if (activity.time_end) {
        dateSpan.textContent += '-' + activity.time_end;
      }
    }
    meta.appendChild(dateSpan);
  }

  if (activity.cost) {
    const costSpan = document.createElement('span');
    costSpan.textContent = activity.cost;
    meta.appendChild(costSpan);
  }

  if (activity.lat != null && activity.lng != null && centerLat != null && centerLng != null) {
    const dist = haversine(centerLat, centerLng, activity.lat, activity.lng);
    const distSpan = document.createElement('span');
    distSpan.textContent = dist.toFixed(1) + ' km';
    meta.appendChild(distSpan);
  }

  card.appendChild(meta);

  // Color stripe
  card.style.borderLeft = '4px solid ' + getCategoryColor(cat);

  return card;
}

async function doSearch(container, params, excludeNames) {
  const dismiss = showLoader(t('searching') || 'Searching...');

  try {
    const prefs = {};
    if (params.budget) prefs.budget = params.budget;
    if (params.avoid) prefs.avoid = params.avoid;
    if (params.distance) prefs.transport = 'within ' + params.distance;

    const interests = [];
    if (params.mood && params.mood.length) interests.push(...params.mood);
    if (params.time && params.time.length) interests.push('preferred times: ' + params.time.join(', '));
    if (params.group) interests.push('group: ' + params.group);
    if (params.interests) interests.push(params.interests);

    const { systemPrompt, userPrompt } = buildPaginatedPrompt(
      params.city,
      params.dateStart,
      params.dateEnd,
      params.centerName,
      interests,
      prefs,
      excludeNames || [],
      null
    );

    const apiKey = db.readJSON('apikey_' + params.providerId, '');
    if (!apiKey) {
      dismiss();
      const lines = [
        '--- ' + (t('searchError') || 'Search Error') + ' ---',
        '',
        'Provider: ' + (params.providerId || 'unknown'),
        'Time: ' + new Date().toISOString(),
        '',
        'Error: No API key configured for ' + params.providerId,
        'Go to Settings to set your API key.',
      ];
      errorReport(t('searchError') || 'Search failed', lines.join('\n'));
      return [];
    }
    const responseText = await callLLM(params.providerId, apiKey, systemPrompt, userPrompt);
    const activities = parseActivities(responseText, params.dateStart, params.dateEnd);

    dismiss();

    if (activities.length === 0 && responseText) {
      const preview = responseText.length > 500 ? responseText.slice(0, 500) + '...' : responseText;
      const lines = [
        '--- ' + (t('noResults') || 'No results') + ' ---',
        '',
        'Provider: ' + (params.providerId || 'unknown'),
        'City: ' + (params.city || 'N/A'),
        'Dates: ' + (params.dateStart || '?') + ' - ' + (params.dateEnd || '?'),
        'Time: ' + new Date().toISOString(),
        '',
        'The AI responded but no activities could be parsed.',
        '',
        'Raw response:',
        preview,
      ];
      errorReport(t('noResults') || 'No results', lines.join('\n'));
    }

    // Geocode each activity's address for accurate coordinates
    if (activities.length > 0) {
      const geoDismiss = showLoader('Geocoding addresses...');
      await geocodeActivities(activities, params.city || '');
      geoDismiss();
    }

    return activities;
  } catch (err) {
    dismiss();
    const lines = [
      '--- ' + (t('searchError') || 'Search Error') + ' ---',
      '',
      'Provider: ' + (params.providerId || 'unknown'),
      'City: ' + (params.city || 'N/A'),
      'Dates: ' + (params.dateStart || '?') + ' - ' + (params.dateEnd || '?'),
      'Time: ' + new Date().toISOString(),
      '',
      'Error: ' + (err.message || String(err)),
    ];
    if (err.status) lines.push('HTTP Status: ' + err.status);
    if (err.stack) lines.push('', 'Stack:', err.stack);
    const report = lines.join('\n');
    errorReport(t('searchError') || 'Search failed', report);
    return [];
  }
}

function renderResults(container, params) {
  clearContainer(container);

  const heading = document.createElement('h3');
  heading.textContent = t('searchResults') || 'Results';
  container.appendChild(heading);

  const info = document.createElement('p');
  info.className = 'text-secondary';
  const infoParts = [];
  if (params.city) infoParts.push(params.city);
  if (params.dateStart || params.dateEnd) infoParts.push((params.dateStart || '') + ' - ' + (params.dateEnd || ''));
  info.textContent = infoParts.join(' | ');
  container.appendChild(info);

  const listContainer = document.createElement('div');
  listContainer.className = 'activity-list';
  container.appendChild(listContainer);

  allActivities.forEach((activity) => {
    const card = createActivityCard(activity, params.centerLat, params.centerLng);
    listContainer.appendChild(card);
  });

  if (allActivities.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-secondary text-center mt-16';
    empty.textContent = t('noResults') || 'No activities found.';
    listContainer.appendChild(empty);
  }

  const btnRow = document.createElement('div');
  btnRow.className = 'flex-col gap-8 mt-16';

  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.className = 'btn btn-secondary';
  loadMoreBtn.textContent = t('loadMore') || 'Load More';
  loadMoreBtn.addEventListener('click', async () => {
    const excludeNames = allActivities.map((a) => a.name);
    const newActivities = await doSearch(container, params, excludeNames);
    if (newActivities.length > 0) {
      allActivities = allActivities.concat(newActivities);
      renderResults(container, params);
    } else {
      showToast(t('noMoreResults') || 'No more results.');
    }
  });
  btnRow.appendChild(loadMoreBtn);

  if (params.mergeMapId) {
    // Merge into existing map
    const mergeBtn = document.createElement('button');
    mergeBtn.className = 'btn btn-primary';
    mergeBtn.textContent = t('addToMap') || 'Add Events';
    mergeBtn.addEventListener('click', () => {
      const existing = db.readJSON('map_data_' + params.mergeMapId);
      if (!existing) return;
      const existingNames = new Set((existing.activities || []).map((a) => a.name));
      const newOnes = allActivities.filter((a) => !existingNames.has(a.name));
      existing.activities = (existing.activities || []).concat(newOnes);
      db.writeJSON('map_data_' + params.mergeMapId, existing);
      showToast(newOnes.length + ' ' + (t('addToMapDone') || 'events added to map'));
      navigate('map-view', { mapId: params.mergeMapId });
    });
    btnRow.appendChild(mergeBtn);
  } else {
    const createMapBtn = document.createElement('button');
    createMapBtn.className = 'btn btn-primary';
    createMapBtn.textContent = t('createMap') || 'Create Map';
    createMapBtn.addEventListener('click', async () => {
      const mapName = await modalPrompt(
        t('mapName') || 'Map name',
        t('mapNamePlaceholder') || 'Enter a name for this map',
        params.city + ' ' + params.dateStart
      );
      if (!mapName) return;

      const mapId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const registry = db.readJSON('maps_registry', []);
      registry.push({
        id: mapId,
        title: mapName,
        city: params.city,
        dateStart: params.dateStart,
        dateEnd: params.dateEnd,
        createdAt: new Date().toISOString(),
      });
      db.writeJSON('maps_registry', registry);

      db.writeJSON('map_data_' + mapId, {
        title: mapName,
        city: params.city,
        centerLat: params.centerLat,
        centerLng: params.centerLng,
        dateStart: params.dateStart,
        dateEnd: params.dateEnd,
        activities: allActivities,
      });

      showToast(t('mapSaved') || 'Map saved!');
      navigate('map-view', { mapId });
    });
    btnRow.appendChild(createMapBtn);
  }

  container.appendChild(btnRow);
}

export default {
  async mount(el, params) {
    searchParams = params || {};
    allActivities = [];
    const content = el.querySelector('#search-content') || el;
    clearContainer(content);

    // Don't attempt search without required params
    if (!searchParams.providerId || !searchParams.city) {
      const empty = document.createElement('p');
      empty.className = 'text-secondary text-center mt-16';
      empty.textContent = t('noResults') || 'No results found.';
      content.appendChild(empty);
      return;
    }

    const activities = await doSearch(content, searchParams, []);
    allActivities = activities;
    renderResults(content, searchParams);
  },
};

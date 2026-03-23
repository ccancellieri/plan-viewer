// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { navigate } from '../router.js';
import { actionSheet, confirm, prompt } from '../ui/modal.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return dateStr;
}

function createMapCard(map, container, el) {
  const card = document.createElement('div');
  card.className = 'card mb-8 map-card';

  const title = document.createElement('h4');
  title.className = 'map-card-title';
  title.textContent = map.title || t('untitled') || 'Untitled';
  card.appendChild(title);

  const city = document.createElement('p');
  city.className = 'text-secondary text-sm';
  city.textContent = map.city || '';
  card.appendChild(city);

  if (map.dateStart || map.dateEnd) {
    const dates = document.createElement('p');
    dates.className = 'text-secondary text-sm';
    dates.textContent = formatDate(map.dateStart) + ' \u2014 ' + formatDate(map.dateEnd);
    card.appendChild(dates);
  }

  const activities = document.createElement('p');
  activities.className = 'text-secondary text-sm';
  activities.textContent =
    (t('activities') || 'Activities') + ': ' + (map.activitiesCount || 0);
  card.appendChild(activities);

  // Click to view map
  card.addEventListener('click', () => {
    navigate('map-view', { mapId: map.id });
  });

  // More button
  const moreBtn = document.createElement('button');
  moreBtn.className = 'btn-icon map-card-more';
  moreBtn.textContent = '\u2026';
  moreBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const options = [
      t('view') || 'View',
      t('rename') || 'Rename',
      t('exportKml') || 'Export KML',
      t('delete') || 'Delete',
    ];
    const idx = await actionSheet(map.title || t('untitled') || 'Untitled', options);
    if (idx === 0) {
      navigate('map-view', { mapId: map.id });
    } else if (idx === 1) {
      const newName = await prompt(
        t('rename') || 'Rename',
        t('enterNewName') || 'Enter new name',
        map.title || ''
      );
      if (newName !== null && newName.trim() !== '') {
        const registry = db.readJSON('maps_registry', []);
        const entry = registry.find((m) => m.id === map.id);
        if (entry) {
          entry.title = newName.trim();
          db.writeJSON('maps_registry', registry);
        }
        screenObj.mount(el);
      }
    } else if (idx === 2) {
      // Export KML — delegate to export utility if available
      try {
        const { exportKml } = await import('../lib/export.js');
        const mapData = db.readJSON(`map_${map.id}`, null);
        if (mapData) {
          exportKml(mapData, map.title || 'map');
        }
      } catch {
        // export module may not support KML yet
      }
    } else if (idx === 3) {
      const yes = await confirm(
        t('delete') || 'Delete',
        (t('confirmDelete') || 'Delete') + ' "' + (map.title || '') + '"?'
      );
      if (yes) {
        let registry = db.readJSON('maps_registry', []);
        registry = registry.filter((m) => m.id !== map.id);
        db.writeJSON('maps_registry', registry);
        db.remove(`map_${map.id}`);
        screenObj.mount(el);
      }
    }
  });
  card.appendChild(moreBtn);

  container.appendChild(card);
}

const screenObj = {
  mount(el) {
    const content = el.querySelector('#my-maps-content') || el;
    content.textContent = '';

    const maps = db.readJSON('maps_registry', []);

    if (!maps || maps.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-secondary text-center mt-16';
      empty.textContent = t('noMaps') || 'No maps yet!';
      content.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'flex-col gap-8 mt-8';

    for (const map of maps) {
      createMapCard(map, list, el);
    }

    content.appendChild(list);
  },
};

export default screenObj;

// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { CATEGORIES } from '../lib/categories.js';

export function renderTimeline(container, activities, activeFilters) {
  container.textContent = '';
  const filtered = activeFilters && activeFilters.size > 0
    ? activities.filter(a => activeFilters.has(a.category))
    : activities;

  const byDate = {};
  filtered.forEach(act => {
    const d = act.date || 'TBD';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(act);
  });

  const sortedDates = Object.keys(byDate).sort();

  sortedDates.forEach(date => {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'timeline-day';
    dayDiv.style.marginBottom = '20px';

    // Day header
    const h2 = document.createElement('h2');
    h2.style.cssText = 'font-size:15px;color:#667eea;margin-bottom:8px;padding-bottom:4px;border-bottom:2px solid #667eea';
    if (date !== 'TBD') {
      const dateObj = new Date(date + 'T00:00:00');
      h2.textContent = dateObj.toLocaleDateString(undefined, {
        weekday: 'long', day: 'numeric', month: 'long'
      });
    } else {
      h2.textContent = 'TBD';
    }
    dayDiv.appendChild(h2);

    // Sort activities by time_start within the day
    byDate[date].sort((a, b) => (a.time_start || '').localeCompare(b.time_start || ''));

    byDate[date].forEach(act => {
      const cat = CATEGORIES[act.category] || CATEGORIES.other;

      const slot = document.createElement('div');
      slot.className = 'timeline-slot';
      slot.style.cssText = 'display:flex;gap:12px;margin-bottom:8px';

      // Time column
      const timeDiv = document.createElement('div');
      timeDiv.className = 'timeline-time';
      timeDiv.style.cssText = 'width:50px;text-align:right;font-size:13px;font-weight:600;color:#444;padding-top:2px;flex-shrink:0';
      timeDiv.textContent = act.time_start || '?';
      slot.appendChild(timeDiv);

      // Content column
      const content = document.createElement('div');
      content.className = 'timeline-content';
      content.style.cssText = 'flex:1;background:var(--bg-card, white);border-radius:8px;padding:10px 14px;box-shadow:0 1px 3px rgba(0,0,0,0.08);border-left:3px solid ' + cat.color;

      const h4 = document.createElement('h4');
      h4.style.cssText = 'font-size:14px;margin-bottom:2px';
      h4.textContent = cat.icon + ' ' + act.name;
      content.appendChild(h4);

      const tlMeta = document.createElement('div');
      tlMeta.className = 'tl-meta';
      tlMeta.style.cssText = 'font-size:12px;color:#888';
      const metaParts = [];
      if (act.cost) metaParts.push(act.cost);
      if (act.distance_km != null) metaParts.push(act.distance_km + 'km');
      if (act.address) metaParts.push(act.address);
      tlMeta.textContent = metaParts.join(' | ');
      content.appendChild(tlMeta);

      slot.appendChild(content);
      dayDiv.appendChild(slot);
    });

    container.appendChild(dayDiv);
  });
}

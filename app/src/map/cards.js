// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { CATEGORIES } from '../lib/categories.js';
import { nativeShare } from '../lib/native.js';

function buildEventShareText(act) {
  let text = act.name || '';
  if (act.date) text += '\n' + act.date;
  if (act.time_start) text += ' ' + act.time_start + (act.time_end ? '-' + act.time_end : '');
  if (act.cost) text += '\n' + act.cost;
  if (act.address) text += '\n' + act.address;
  if (act.lat != null && act.lng != null) {
    text += '\nhttps://maps.google.com/?q=' + act.lat + ',' + act.lng;
  }
  if (act.source_url && /^https?:\/\//.test(act.source_url)) {
    text += '\n' + act.source_url;
  }
  return text;
}

export function renderCards(container, activities, center, activeFilters) {
  container.textContent = '';
  const filtered = activeFilters && activeFilters.size > 0
    ? activities.filter(a => activeFilters.has(a.category))
    : activities;

  filtered.forEach(act => {
    const cat = CATEGORIES[act.category] || CATEGORIES.other;
    const card = document.createElement('div');
    card.className = 'map-card';

    // Category badge
    const catBadge = document.createElement('div');
    catBadge.className = 'map-card-cat';
    catBadge.style.background = cat.color;
    catBadge.textContent = cat.icon + ' ' + cat.label;
    card.appendChild(catBadge);

    // Name
    const h3 = document.createElement('h3');
    h3.textContent = act.name;
    card.appendChild(h3);

    // Meta line
    const meta = document.createElement('div');
    meta.className = 'meta';
    const timeStr = (act.time_start || '?') + (act.time_end ? '-' + act.time_end : '');
    const parts = [];
    if (act.date) parts.push(act.date);
    parts.push(timeStr);
    if (act.cost) parts.push(act.cost);
    if (act.distance_km != null) parts.push(act.distance_km + 'km');
    meta.textContent = parts.join(' | ');
    card.appendChild(meta);

    // Address
    if (act.address) {
      const addr = document.createElement('div');
      addr.className = 'meta';
      addr.style.marginTop = '4px';
      addr.textContent = act.address;
      card.appendChild(addr);
    }

    // Description
    if (act.description) {
      const desc = document.createElement('div');
      desc.className = 'description';
      desc.textContent = act.description;
      card.appendChild(desc);
    }

    // Source URL (shown as visible link)
    if (act.source_url && /^https?:\/\//.test(act.source_url)) {
      const srcDiv = document.createElement('div');
      srcDiv.style.cssText = 'font-size:12px;margin:4px 0';
      const srcLink = document.createElement('a');
      srcLink.href = act.source_url;
      srcLink.target = '_blank';
      srcLink.rel = 'noopener';
      srcLink.style.cssText = 'color:var(--accent);text-decoration:underline;word-break:break-all';
      // Show shortened URL
      try {
        const u = new URL(act.source_url);
        srcLink.textContent = u.hostname + u.pathname.slice(0, 30) + (u.pathname.length > 30 ? '...' : '');
      } catch {
        srcLink.textContent = act.source_url.slice(0, 50);
      }
      srcDiv.appendChild(srcLink);
      card.appendChild(srcDiv);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'actions';

    // Navigate button
    if (act.lat != null && act.lng != null) {
      const navLink = document.createElement('a');
      navLink.href = 'https://www.google.com/maps/search/?api=1&query=' + act.lat + ',' + act.lng;
      navLink.target = '_blank';
      navLink.rel = 'noopener';
      navLink.className = 'btn-navigate';
      navLink.textContent = 'Navigate';
      actions.appendChild(navLink);
    }

    // Contact button — only if valid URL or phone
    if (act.contact) {
      let contactUrl = null;
      let contactLabel = '';
      if (/^https?:\/\//.test(act.contact)) {
        contactUrl = act.contact;
        contactLabel = 'Website';
      } else if (/^\+?[0-9\s-]+$/.test(act.contact)) {
        contactUrl = 'tel:' + act.contact.replace(/\s/g, '');
        contactLabel = 'Call';
      }
      if (contactUrl) {
        const contactLink = document.createElement('a');
        contactLink.href = contactUrl;
        contactLink.target = '_blank';
        contactLink.rel = 'noopener';
        contactLink.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:#27ae60;color:white;padding:8px 14px;border-radius:8px;font-size:13px;text-decoration:none;font-weight:500';
        contactLink.textContent = contactLabel;
        actions.appendChild(contactLink);
      }
    }

    // Share single event button
    const shareBtn = document.createElement('button');
    shareBtn.className = 'btn-info';
    shareBtn.textContent = 'Share';
    shareBtn.addEventListener('click', () => {
      const text = buildEventShareText(act);
      nativeShare({ title: act.name, text }).catch(() => {});
    });
    actions.appendChild(shareBtn);

    card.appendChild(actions);
    container.appendChild(card);
  });
}

// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { t } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { getCategoryColor, getCategoryIcon, CATEGORIES } from '../lib/categories.js';
import { haversine } from '../lib/geo.js';
import { actionSheet, prompt as modalPrompt } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { renderCards } from '../map/cards.js';
import { nativeShare } from '../lib/native.js';
import { renderTimeline } from '../map/timeline.js';
import { navigate } from '../router.js';
import { providers } from '../providers/index.js';
import { getMapLocalSources, setMapLocalSources } from '../lib/sources.js';

async function loadLeaflet() {
  if (window.L) return window.L;
  const base = import.meta.env.BASE_URL;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = base + 'leaflet/leaflet.css';
  document.head.appendChild(link);
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = base + 'leaflet/leaflet.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
  return window.L;
}

function buildShareText(mapData, activities) {
  const center = { lat: mapData.centerLat, lng: mapData.centerLng, name: mapData.centerName || '' };
  let text = (mapData.title || 'Map') + '\nFrom: ' + center.name + '\n\n';

  const byDate = {};
  activities.forEach(act => {
    const d = act.date || 'TBD';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(act);
  });

  Object.keys(byDate).sort().forEach(date => {
    const dateObj = new Date(date + 'T00:00:00');
    const dayLabel = date !== 'TBD'
      ? dateObj.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })
      : 'TBD';
    text += dayLabel + '\n';
    byDate[date].forEach(act => {
      const cat = CATEGORIES[act.category] || CATEGORIES.other;
      text += cat.icon + ' ' + act.name + (act.time_start ? ' (' + act.time_start + ')' : '') + '\n';
      if (act.cost) text += '   ' + act.cost + '\n';
      if (act.address) text += '   ' + act.address + '\n';
      if (act.lat != null && act.lng != null) {
        text += '   https://maps.google.com/?q=' + act.lat + ',' + act.lng + '\n';
      }
      text += '\n';
    });
  });

  return text;
}

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

function buildPopupContent(activity, center) {
  const cat = CATEGORIES[activity.category] || CATEGORIES.other;
  const container = document.createElement('div');
  container.style.cssText = 'min-width:200px;max-width:280px';

  // Category header
  const hdr = document.createElement('div');
  hdr.style.cssText = 'background:' + cat.color + ';color:white;padding:4px 8px;border-radius:6px 6px 0 0;margin:-8px -18px 8px -18px;font-size:11px';
  hdr.textContent = cat.icon + ' ' + cat.label;
  container.appendChild(hdr);

  // Name
  const name = document.createElement('strong');
  name.style.fontSize = '14px';
  name.textContent = activity.name || '';
  container.appendChild(name);

  // Info line
  const info = document.createElement('div');
  info.style.cssText = 'font-size:12px;color:#666;margin:6px 0;line-height:1.5';
  const timeStr = (activity.time_start || '?') + (activity.time_end ? '-' + activity.time_end : '');
  const parts = [];
  if (activity.date) parts.push(activity.date);
  parts.push(timeStr);
  if (activity.cost) parts.push(activity.cost);
  if (activity.distance_km != null) parts.push(activity.distance_km + 'km');
  info.textContent = parts.join(' | ');
  container.appendChild(info);

  // Address
  if (activity.address) {
    const addr = document.createElement('div');
    addr.style.cssText = 'font-size:12px;color:#666';
    addr.textContent = activity.address;
    container.appendChild(addr);
  }

  // Description
  if (activity.description) {
    const desc = document.createElement('div');
    desc.style.cssText = 'font-size:12px;color:#444;margin:6px 0';
    desc.textContent = activity.description;
    container.appendChild(desc);
  }

  // Source URL (shown as visible link, only if valid)
  if (activity.source_url && /^https?:\/\//.test(activity.source_url)) {
    const srcDiv = document.createElement('div');
    srcDiv.style.cssText = 'font-size:11px;margin:4px 0';
    const srcLink = document.createElement('a');
    srcLink.href = activity.source_url;
    srcLink.target = '_blank';
    srcLink.rel = 'noopener';
    srcLink.style.cssText = 'color:#667eea;text-decoration:underline;word-break:break-all';
    try {
      const u = new URL(activity.source_url);
      srcLink.textContent = u.hostname + u.pathname.slice(0, 25) + (u.pathname.length > 25 ? '...' : '');
    } catch {
      srcLink.textContent = activity.source_url.slice(0, 40);
    }
    srcDiv.appendChild(srcLink);
    container.appendChild(srcDiv);
  }

  // Actions
  const acts = document.createElement('div');
  acts.style.cssText = 'margin-top:8px;display:flex;gap:6px;flex-wrap:wrap';

  // Navigate
  if (center && activity.lat != null && activity.lng != null) {
    const gmUrl = 'https://www.google.com/maps/search/?api=1&query=' + activity.lat + ',' + activity.lng;
    const navA = document.createElement('a');
    navA.href = gmUrl;
    navA.target = '_blank';
    navA.rel = 'noopener';
    navA.style.cssText = 'background:#4285f4;color:white;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none';
    navA.textContent = 'Navigate';
    acts.appendChild(navA);
  }

  // Contact — only if valid URL or phone
  if (activity.contact) {
    let contactUrl = null;
    let contactLabel = '';
    if (/^https?:\/\//.test(activity.contact)) {
      contactUrl = activity.contact;
      contactLabel = 'Website';
    } else if (/^\+?[0-9\s-]+$/.test(activity.contact)) {
      contactUrl = 'tel:' + activity.contact.replace(/\s/g, '');
      contactLabel = 'Call';
    }
    if (contactUrl) {
      const cA = document.createElement('a');
      cA.href = contactUrl;
      cA.target = '_blank';
      cA.rel = 'noopener';
      cA.style.cssText = 'background:#27ae60;color:white;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none';
      cA.textContent = contactLabel;
      acts.appendChild(cA);
    }
  }

  // Share single event
  const shareBtn = document.createElement('button');
  shareBtn.style.cssText = 'background:#f0f0f0;color:#333;padding:6px 12px;border-radius:6px;font-size:12px;border:none;cursor:pointer';
  shareBtn.textContent = 'Share';
  shareBtn.addEventListener('click', () => {
    const text = buildEventShareText(activity);
    nativeShare({ title: activity.name, text }).catch(() => {});
  });
  acts.appendChild(shareBtn);

  container.appendChild(acts);
  return container;
}

export default {
  async mount(el, params) {
    const mapData = db.readJSON('map_data_' + params.mapId);
    if (!mapData) return;

    const center = {
      lat: mapData.centerLat || 0,
      lng: mapData.centerLng || 0,
      name: mapData.centerName || ''
    };
    const maxDistance = mapData.maxDistance || 10;
    const activities = mapData.activities || [];

    // Compute distance_km for each activity
    activities.forEach(act => {
      if (act.lat != null && act.lng != null) {
        act.distance_km = Math.round(haversine(center.lat, center.lng, act.lat, act.lng) * 10) / 10;
      }
    });

    // Sort by date then time
    activities.sort((a, b) => {
      const d = (a.date || '').localeCompare(b.date || '');
      return d !== 0 ? d : (a.time_start || '').localeCompare(b.time_start || '');
    });

    // Active filters
    const activeFilters = new Set();

    // Set header title (editable)
    const titleEl = document.querySelector('#header-title');
    if (titleEl) {
      titleEl.textContent = mapData.title || t('mapView') || 'Map';
      titleEl.style.cursor = 'pointer';
      titleEl.addEventListener('click', async () => {
        const newTitle = await modalPrompt('Map name', 'Enter a new name', titleEl.textContent);
        if (newTitle && newTitle.trim() && newTitle.trim() !== titleEl.textContent) {
          titleEl.textContent = newTitle.trim();
          mapData.title = newTitle.trim();
          db.writeJSON('map_data_' + params.mapId, mapData);
        }
      });
    }

    // Clear the container
    const mapContainer = el.querySelector('#map-view-container') || el;
    mapContainer.textContent = '';
    mapContainer.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;overflow-y:auto';

    // --- Tabs ---
    const tabsBar = document.createElement('div');
    tabsBar.style.cssText = 'display:flex;background:var(--bg-secondary);border-bottom:2px solid var(--border);position:sticky;top:0;z-index:999;flex-shrink:0';

    const tabNames = ['Map', 'List', 'Timeline'];
    const tabViews = [];
    const tabButtons = [];

    tabNames.forEach((name, i) => {
      const tab = document.createElement('button');
      tab.style.cssText = 'flex:1;text-align:center;padding:12px;cursor:pointer;font-size:14px;font-weight:500;color:var(--text-secondary);transition:all 0.2s;border:none;border-bottom:3px solid transparent;background:inherit';
      tab.textContent = name;
      if (i === 0) {
        tab.style.color = '#667eea';
        tab.style.borderBottomColor = '#667eea';
      }
      tab.addEventListener('click', () => switchTab(i));
      tabButtons.push(tab);
      tabsBar.appendChild(tab);
    });

    mapContainer.appendChild(tabsBar);

    // --- Share bar ---
    const shareBar = document.createElement('div');
    shareBar.style.cssText = 'padding:10px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;flex-shrink:0';

    const waBtn = document.createElement('button');
    waBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:500;border:none;cursor:pointer;color:white;background:#25D366';
    waBtn.textContent = 'WhatsApp';
    waBtn.addEventListener('click', () => {
      const text = buildShareText(mapData, activities);
      window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
    });
    shareBar.appendChild(waBtn);

    const shareBtn = document.createElement('button');
    shareBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:500;border:none;cursor:pointer;color:white;background:#667eea';
    shareBtn.textContent = 'Share';
    shareBtn.addEventListener('click', async () => {
      const text = buildShareText(mapData, activities);
      const shared = await nativeShare({ title: mapData.title || 'Map', text }).catch(() => false);
      if (shared === false) showToast('Copied to clipboard');
    });
    shareBar.appendChild(shareBtn);

    // Download button — export all activities as JSON
    const dlBtn = document.createElement('button');
    dlBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:500;border:none;cursor:pointer;color:white;background:#27ae60';
    dlBtn.textContent = t('download') || 'Download';
    dlBtn.addEventListener('click', () => {
      const exportData = {
        title: mapData.title,
        city: mapData.city,
        center: { lat: center.lat, lng: center.lng, name: center.name },
        dateStart: mapData.dateStart,
        dateEnd: mapData.dateEnd,
        activities,
      };
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = (mapData.title || mapData.city || 'map') + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    shareBar.appendChild(dlBtn);

    // Add Events button — enrich map with more activities from another AI
    const addEventsBtn = document.createElement('button');
    addEventsBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:500;border:none;cursor:pointer;color:white;background:#f59e0b';
    addEventsBtn.textContent = '+ ' + (t('addToMap') || 'Add Events');
    addEventsBtn.addEventListener('click', async () => {
      // Show only providers with a configured key
      const available = providers.filter((p) => {
        if (p.id === 'manual') return true;
        return !!db.readJSON('apikey_' + p.id);
      });
      if (available.length === 0) {
        showToast(t('apiKeyNeeded') || 'Configure an API key in Settings first');
        return;
      }
      const labels = available.map((p) => p.label);
      const idx = await actionSheet(t('provider') || 'Select AI provider', labels);
      if (idx < 0) return;

      const provider = available[idx];
      navigate('questionnaire', {
        city: mapData.city,
        centerLat: mapData.centerLat,
        centerLng: mapData.centerLng,
        centerName: mapData.centerName || '',
        dateStart: mapData.dateStart,
        dateEnd: mapData.dateEnd,
        providerId: provider.id,
        mergeMapId: params.mapId,
      });
    });
    shareBar.appendChild(addEventsBtn);

    // Local Sources button — manage location-specific websites
    const srcBtn = document.createElement('button');
    srcBtn.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:500;border:none;cursor:pointer;color:white;background:#8b5cf6';
    const localCount = getMapLocalSources(params.mapId).length;
    srcBtn.textContent = '🔗 ' + (t('localSources') || 'Sources') + (localCount > 0 ? ' (' + localCount + ')' : '');
    srcBtn.addEventListener('click', async () => {
      const sources = getMapLocalSources(params.mapId);
      const options = sources.map((s) => '✕ ' + s);
      options.push('+ ' + (t('addSource') || 'Add local website'));
      const idx = await actionSheet(
        (t('localSources') || 'Local Sources') + ' — ' + (mapData.city || ''),
        options
      );
      if (idx < 0) return;
      if (idx < sources.length) {
        // Remove source
        sources.splice(idx, 1);
        setMapLocalSources(params.mapId, sources);
        srcBtn.textContent = '🔗 ' + (t('localSources') || 'Sources') + (sources.length > 0 ? ' (' + sources.length + ')' : '');
        showToast(t('sourceRemoved') || 'Source removed');
      } else {
        // Add source
        const url = await modalPrompt(
          t('addSource') || 'Add local website',
          (t('addSourceMsg') || 'Enter a website for') + ' ' + (mapData.city || 'this location') + ' (e.g. romatoday.it)',
          ''
        );
        if (url && url.trim()) {
          sources.push(url.trim());
          setMapLocalSources(params.mapId, sources);
          srcBtn.textContent = '🔗 ' + (t('localSources') || 'Sources') + ' (' + sources.length + ')';
          showToast(url.trim() + ' ' + (t('sourceAdded') || 'added'));
        }
      }
    });
    shareBar.appendChild(srcBtn);

    mapContainer.appendChild(shareBar);

    // --- Filter chips ---
    const filtersRow = document.createElement('div');
    filtersRow.style.cssText = 'padding:10px 16px;background:var(--bg-secondary);border-bottom:1px solid var(--border);display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;flex-shrink:0';

    const usedCats = [];
    activities.forEach(a => {
      if (usedCats.indexOf(a.category) === -1) usedCats.push(a.category);
    });

    const allChip = document.createElement('div');
    allChip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:20px;font-size:12px;border:1.5px solid #667eea;background:#667eea;color:white;cursor:pointer;white-space:nowrap;transition:all 0.2s';
    allChip.textContent = 'All';
    allChip.addEventListener('click', () => {
      activeFilters.clear();
      updateChipStyles();
      rebuildContent();
    });
    filtersRow.appendChild(allChip);

    const catChips = [];
    usedCats.forEach(catKey => {
      const cfg = CATEGORIES[catKey] || CATEGORIES.other;
      const chip = document.createElement('div');
      chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:20px;font-size:12px;border:1.5px solid var(--border);background:var(--bg-card);color:var(--text);cursor:pointer;white-space:nowrap;transition:all 0.2s';

      const dot = document.createElement('span');
      dot.style.cssText = 'width:8px;height:8px;border-radius:50%;display:inline-block;background:' + cfg.color;
      chip.appendChild(dot);
      chip.appendChild(document.createTextNode(' ' + cfg.icon + ' ' + cfg.label));

      chip.addEventListener('click', () => {
        if (activeFilters.has(catKey)) {
          activeFilters.delete(catKey);
        } else {
          activeFilters.add(catKey);
        }
        updateChipStyles();
        rebuildContent();
      });

      catChips.push({ el: chip, key: catKey });
      filtersRow.appendChild(chip);
    });

    mapContainer.appendChild(filtersRow);

    function updateChipStyles() {
      if (activeFilters.size === 0) {
        allChip.style.borderColor = '#667eea';
        allChip.style.background = '#667eea';
        allChip.style.color = 'white';
      } else {
        allChip.style.borderColor = 'var(--border)';
        allChip.style.background = 'var(--bg-card)';
        allChip.style.color = 'var(--text)';
      }
      catChips.forEach(({ el, key }) => {
        if (activeFilters.has(key)) {
          el.style.borderColor = '#667eea';
          el.style.background = '#667eea';
          el.style.color = 'white';
        } else {
          el.style.borderColor = 'var(--border)';
          el.style.background = 'var(--bg-card)';
          el.style.color = 'var(--text)';
        }
      });
    }

    // --- Map view ---
    const mapViewDiv = document.createElement('div');
    mapViewDiv.style.cssText = 'flex:1;min-height:300px';
    tabViews.push(mapViewDiv);
    mapContainer.appendChild(mapViewDiv);

    // --- Cards view ---
    const cardsDiv = document.createElement('div');
    cardsDiv.style.cssText = 'padding:12px;display:none';
    tabViews.push(cardsDiv);
    mapContainer.appendChild(cardsDiv);

    // --- Timeline view ---
    const timelineDiv = document.createElement('div');
    timelineDiv.style.cssText = 'padding:12px 16px;display:none';
    tabViews.push(timelineDiv);
    mapContainer.appendChild(timelineDiv);

    // --- Switch tab ---
    function switchTab(index) {
      tabButtons.forEach((btn, i) => {
        if (i === index) {
          btn.style.color = '#667eea';
          btn.style.borderBottomColor = '#667eea';
        } else {
          btn.style.color = 'var(--text-secondary)';
          btn.style.borderBottomColor = 'transparent';
        }
      });
      tabViews.forEach((view, i) => {
        view.style.display = i === index ? (i === 0 ? '' : 'block') : 'none';
      });
      if (index === 0 && leafletMap) {
        setTimeout(() => leafletMap.invalidateSize(), 100);
      }
      if (index === 1) {
        renderCards(cardsDiv, activities, center, activeFilters);
      }
      if (index === 2) {
        renderTimeline(timelineDiv, activities, activeFilters);
      }
    }

    // --- Rebuild content after filter change ---
    let leafletMap = null;
    let leafletMarkers = [];

    function rebuildContent() {
      rebuildMarkers();
      // Re-render the currently visible tab
      if (cardsDiv.style.display !== 'none') {
        renderCards(cardsDiv, activities, center, activeFilters);
      }
      if (timelineDiv.style.display !== 'none') {
        renderTimeline(timelineDiv, activities, activeFilters);
      }
    }

    function rebuildMarkers() {
      if (!leafletMap) return;
      const L = window.L;
      leafletMarkers.forEach(m => leafletMap.removeLayer(m));
      leafletMarkers = [];

      activities.forEach(activity => {
        if (activity.lat == null || activity.lng == null) return;
        if (activeFilters.size > 0 && !activeFilters.has(activity.category)) return;

        const cat = activity.category || 'other';
        const marker = L.circleMarker([activity.lat, activity.lng], {
          radius: 10,
          fillColor: getCategoryColor(cat),
          color: '#fff',
          weight: 2,
          fillOpacity: 0.9,
        }).addTo(leafletMap);

        const popupEl = buildPopupContent(activity, center);
        marker.bindPopup(popupEl, { autoClose: true, closeOnClick: true });
        leafletMarkers.push(marker);
      });

      if (leafletMarkers.length > 0) {
        const group = L.featureGroup(leafletMarkers);
        const bounds = group.getBounds();
        bounds.extend([center.lat, center.lng]);
        leafletMap.fitBounds(bounds.pad(0.1));
      }
    }

    // --- Initialize Leaflet ---
    const L = await loadLeaflet();

    leafletMap = L.map(mapViewDiv).setView([center.lat, center.lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '\u00a9 OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(leafletMap);

    // Start point marker — visible house pin
    const startIcon = L.divIcon({
      className: '',
      html: '<div style="width:36px;height:36px;background:#667eea;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:18px">🏠</div>',
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -20],
    });
    const startMarker = L.marker([center.lat, center.lng], { icon: startIcon, zIndexOffset: 1000 }).addTo(leafletMap);
    const startPopup = document.createElement('div');
    const startStrong = document.createElement('strong');
    startStrong.textContent = center.name || (t('startPoint') || 'Start point');
    startPopup.appendChild(startStrong);
    if (center.name) {
      startPopup.appendChild(document.createElement('br'));
      const startEm = document.createElement('em');
      startEm.style.cssText = 'font-size:11px;color:#666';
      startEm.textContent = t('startPoint') || 'Start point';
      startPopup.appendChild(startEm);
    }
    startMarker.bindPopup(startPopup);

    // Radius circle
    L.circle([center.lat, center.lng], {
      radius: maxDistance * 1000,
      color: '#667eea',
      fillColor: '#667eea',
      fillOpacity: 0.05,
      weight: 1.5,
      dashArray: '5,5',
    }).addTo(leafletMap);

    // Recenter button control
    const RecenterControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd() {
        const btn = L.DomUtil.create('button', '');
        btn.style.cssText = 'width:44px;height:44px;border-radius:50%;background:white;border:none;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:20px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1';
        btn.title = t('recenter') || 'Center on start';
        btn.textContent = '🏠';
        L.DomEvent.on(btn, 'click', (e) => {
          L.DomEvent.stopPropagation(e);
          leafletMap.setView([center.lat, center.lng], 14, { animate: true });
          startMarker.openPopup();
        });
        return btn;
      },
    });
    new RecenterControl().addTo(leafletMap);

    leafletMap.on('click', () => leafletMap.closePopup());

    // Build initial markers
    rebuildMarkers();
  },
};

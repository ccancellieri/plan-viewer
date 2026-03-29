import { t } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { navigate } from '../router.js';
import { createTrip, getTrip, updateTrip, addStopToTrip, removeStop, reorderStops, splitCorridor } from '../lib/trip.js';
import { actionSheet, prompt as modalPrompt, confirm } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { corridorPolygon, pathLength } from '../lib/corridor.js';
import { estimateTravelTime } from '../lib/osrm.js';
import { buildCorridorPrompt } from '../lib/prompt.js';
import { callLLM, providers } from '../providers/index.js';
import { parseActivities } from '../lib/parser.js';
import { sampleCorridorSegments } from '../lib/corridor.js';
import { reverseGeocode } from '../lib/geo.js';
import { CATEGORIES } from '../lib/categories.js';

const TRAVEL_MODES = [
  { id: 'walk', icon: '\uD83D\uDEB6', key: 'walkMode' },
  { id: 'bike', icon: '\uD83D\uDEB2', key: 'bikeMode' },
  { id: 'car', icon: '\uD83D\uDE97', key: 'carMode' },
  { id: 'transit', icon: '\uD83D\uDE8C', key: 'transitMode' },
];

let leafletMap = null;
let mapLayers = { stops: [], corridors: [] };
let currentTrip = null;
let activeTab = 'map'; // 'map' | 'timeline'

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

function getMapCenter(mapId) {
  const d = db.readJSON('map_data_' + mapId, null);
  return d && d.centerLat != null ? { lat: d.centerLat, lng: d.centerLng } : null;
}

function clearMapLayers() {
  mapLayers.stops.forEach(l => l.remove());
  mapLayers.corridors.forEach(l => l.remove());
  mapLayers.stops = [];
  mapLayers.corridors = [];
}

function renderTripOnMap(trip, L) {
  clearMapLayers();
  const bounds = [];
  let mapStopNum = 0;

  trip.stops.forEach((stop) => {
    if (stop.type === 'map') {
      mapStopNum++;
      const mapData = db.readJSON('map_data_' + stop.mapId, null);
      if (mapData && mapData.centerLat != null) {
        const pos = [mapData.centerLat, mapData.centerLng];
        bounds.push(pos);
        const marker = L.marker(pos, {
          icon: L.divIcon({
            className: 'trip-stop-marker',
            html: '<div class="trip-stop-num">' + mapStopNum + '</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16],
          }),
        }).addTo(leafletMap);
        marker.bindPopup('<strong>' + (mapData.title || stop.mapId) + '</strong>');
        mapLayers.stops.push(marker);
      }
    } else if (stop.type === 'corridor' && stop.path && stop.path.length > 1) {
      const latlngs = stop.path.map(p => [p.lat, p.lng]);
      bounds.push(...latlngs);

      if (stop.width) {
        const poly = corridorPolygon(stop.path, stop.width);
        const polygon = L.polygon(poly.map(p => [p.lat, p.lng]), {
          color: '#667eea',
          fillColor: '#667eea',
          fillOpacity: 0.12,
          weight: 1,
          dashArray: '4 4',
        }).addTo(leafletMap);
        mapLayers.corridors.push(polygon);
      }

      const line = L.polyline(latlngs, {
        color: '#667eea',
        weight: 3,
        dashArray: '8 6',
        opacity: 0.8,
      }).addTo(leafletMap);
      mapLayers.corridors.push(line);

      // Render corridor activities as markers
      if (stop.activities && stop.activities.length > 0) {
        for (const act of stop.activities) {
          if (act.lat != null && act.lng != null) {
            const m = L.circleMarker([act.lat, act.lng], {
              radius: 6, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.8, weight: 1,
            }).addTo(leafletMap);
            m.bindPopup('<strong>' + (act.name || '') + '</strong><br>' + (act.description || ''));
            mapLayers.corridors.push(m);
          }
        }
      }
    }
  });

  if (bounds.length > 0) {
    leafletMap.fitBounds(bounds, { padding: [30, 30] });
  }
}

async function computeTravelTime(stop, nextMapStop) {
  if (!stop || stop.type !== 'map' || !nextMapStop) return null;
  const from = getMapCenter(stop.mapId);
  const to = getMapCenter(nextMapStop.mapId);
  if (!from || !to) return null;
  const mode = stop.travelMode || 'car';
  return estimateTravelTime(from.lat, from.lng, to.lat, to.lng, mode);
}

function renderStopList(trip, sheet, el) {
  sheet.textContent = '';

  // Title bar
  const titleBar = document.createElement('div');
  titleBar.className = 'trip-title-bar';
  const titleEl = document.createElement('h3');
  titleEl.className = 'trip-title';
  titleEl.textContent = trip.title || t('untitled') || 'Untitled';
  titleEl.addEventListener('click', async () => {
    const name = await modalPrompt(
      t('rename') || 'Rename',
      t('enterNewName') || 'Enter new name',
      trip.title || ''
    );
    if (name !== null && name.trim()) {
      currentTrip = await updateTrip(trip.id, { title: name.trim() });
      titleEl.textContent = name.trim();
    }
  });
  titleBar.appendChild(titleEl);
  sheet.appendChild(titleBar);

  // Stops list
  const list = document.createElement('div');
  list.className = 'trip-stops-list';

  if (trip.stops.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-secondary text-center mt-8';
    empty.textContent = t('noStops') || 'No stops yet. Add a stop to begin!';
    list.appendChild(empty);
  }

  trip.stops.forEach((stop, idx) => {
    const item = document.createElement('div');
    item.className = 'trip-stop-item';

    const icon = document.createElement('span');
    icon.className = 'trip-stop-icon';

    if (stop.type === 'map') {
      const mapData = db.readJSON('map_data_' + stop.mapId, null);
      icon.textContent = '\uD83D\uDCCD';
      const info = document.createElement('div');
      info.className = 'trip-stop-info';
      const name = document.createElement('span');
      name.className = 'trip-stop-name';
      name.textContent = (mapData && mapData.title) || stop.mapId || (t('stops') || 'Stop');
      info.appendChild(name);

      // Activity count
      if (mapData && mapData.activities) {
        const count = document.createElement('span');
        count.className = 'text-secondary text-sm';
        count.textContent = mapData.activities.length + ' ' + (t('activities') || 'activities');
        info.appendChild(count);
      }

      if (stop.stayDuration) {
        const dur = document.createElement('span');
        dur.className = 'text-secondary text-sm';
        dur.textContent = (t('stayDuration') || 'Stay') + ': ' + stop.stayDuration + 'h';
        info.appendChild(dur);
      }

      item.appendChild(icon);
      item.appendChild(info);
    } else if (stop.type === 'corridor') {
      icon.textContent = '\uD83D\uDEE4\uFE0F';
      const info = document.createElement('div');
      info.className = 'trip-stop-info';
      const name = document.createElement('span');
      name.className = 'trip-stop-name';
      const len = stop.path ? pathLength(stop.path) : 0;
      name.textContent = (t('drawCorridor') || 'Route') + (len > 0 ? ' (' + Math.round(len) + ' km)' : '');
      info.appendChild(name);

      if (stop.width) {
        const w = document.createElement('span');
        w.className = 'text-secondary text-sm';
        w.textContent = stop.width.toFixed(0) + ' km ' + (t('corridorWidth') || 'wide');
        info.appendChild(w);
      }

      if (stop.activities && stop.activities.length > 0) {
        const actCount = document.createElement('span');
        actCount.className = 'text-secondary text-sm';
        actCount.textContent = stop.activities.length + ' ' + (t('activities') || 'activities');
        info.appendChild(actCount);
      }

      item.appendChild(icon);
      item.appendChild(info);

      // Search corridor button
      const searchBtn = document.createElement('button');
      searchBtn.className = 'btn-icon trip-search-btn';
      searchBtn.textContent = '\uD83D\uDD0D';
      searchBtn.title = t('searchCorridor') || 'Search Along Route';
      searchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startCorridorSearch(trip, idx, sheet, el);
      });
      item.appendChild(searchBtn);

      // Split corridor button
      const splitBtn = document.createElement('button');
      splitBtn.className = 'btn-icon trip-split-btn';
      splitBtn.textContent = '\u2702\uFE0F';
      splitBtn.title = t('splitHere') || 'Split Here';
      splitBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await doSplitCorridor(trip, idx, sheet, el);
      });
      item.appendChild(splitBtn);
    }

    // Travel mode selector (for map stops, not the last stop)
    if (stop.type === 'map' && idx < trip.stops.length - 1) {
      const modeBtn = document.createElement('button');
      modeBtn.className = 'btn-icon trip-mode-btn';
      const currentMode = TRAVEL_MODES.find(m => m.id === stop.travelMode) || TRAVEL_MODES[2];
      modeBtn.textContent = currentMode.icon;
      modeBtn.title = t(currentMode.key) || currentMode.id;
      modeBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const options = TRAVEL_MODES.map(m => m.icon + ' ' + (t(m.key) || m.id));
        const chosen = await actionSheet(t('travelMode') || 'Travel Mode', options);
        if (chosen !== null && chosen >= 0) {
          stop.travelMode = TRAVEL_MODES[chosen].id;
          currentTrip = await updateTrip(trip.id, { stops: trip.stops });
          renderStopList(currentTrip, sheet, el);
        }
      });
      item.appendChild(modeBtn);
    }

    // Delete button
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon trip-del-btn';
    delBtn.textContent = '\u00D7';
    delBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      currentTrip = await removeStop(trip.id, idx);
      renderStopList(currentTrip, sheet, el);
      if (leafletMap) renderTripOnMap(currentTrip, window.L);
    });
    item.appendChild(delBtn);

    list.appendChild(item);

    // Travel time indicator between map stops
    if (stop.type === 'map' && idx < trip.stops.length - 1) {
      const travelDiv = document.createElement('div');
      travelDiv.className = 'trip-travel-info';
      const nextMapStop = findNextMapStop(trip.stops, idx);
      if (nextMapStop) {
        if (stop.travelTimeToNext) {
          travelDiv.textContent = formatDuration(stop.travelTimeToNext) + ' \u2022 ' + (stop.travelDistanceToNext || '?') + ' km';
        } else {
          travelDiv.textContent = '\u23F3'; // hourglass
          // Async compute
          computeTravelTime(stop, nextMapStop).then(result => {
            if (result) {
              stop.travelTimeToNext = result.durationMin;
              stop.travelDistanceToNext = result.distanceKm;
              travelDiv.textContent = formatDuration(result.durationMin) + ' \u2022 ' + result.distanceKm + ' km';
              if (result.source === 'estimate') travelDiv.textContent += ' ~';
              // Persist
              updateTrip(trip.id, { stops: trip.stops });
            }
          });
        }
      }
      list.appendChild(travelDiv);
    }

    // Add button between stops
    if (idx < trip.stops.length - 1) {
      const addBetween = document.createElement('button');
      addBetween.className = 'trip-add-between';
      addBetween.textContent = '+';
      addBetween.addEventListener('click', () => showAddStopMenu(trip, idx + 1, sheet, el));
      list.appendChild(addBetween);
    }
  });

  sheet.appendChild(list);

  // Bottom action bar
  const actions = document.createElement('div');
  actions.className = 'trip-actions';

  const addBtn = document.createElement('button');
  addBtn.className = 'btn btn-accent';
  addBtn.textContent = '+ ' + (t('addStop') || 'Add Stop');
  addBtn.addEventListener('click', () => showAddStopMenu(trip, trip.stops.length, sheet, el));
  actions.appendChild(addBtn);

  const drawBtn = document.createElement('button');
  drawBtn.className = 'btn btn-outline';
  drawBtn.textContent = '\u270D\uFE0F ' + (t('drawCorridor') || 'Draw Route');
  drawBtn.addEventListener('click', () => startDrawingMode(trip, sheet, el));
  actions.appendChild(drawBtn);

  const quickBtn = document.createElement('button');
  quickBtn.className = 'btn btn-outline';
  quickBtn.textContent = '\uD83D\uDCCD ' + (t('quickCorridor') || 'Quick Corridor');
  quickBtn.addEventListener('click', () => startQuickCorridorMode(trip, sheet, el));
  actions.appendChild(quickBtn);

  // Refresh (re-run) button
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'btn btn-outline';
  refreshBtn.textContent = '\uD83D\uDD04 ' + (t('refreshActivities') || 'Refresh');
  refreshBtn.addEventListener('click', () => rerunTripSearches(trip, sheet, el));
  actions.appendChild(refreshBtn);

  // Layer indicator
  if (trip.layers && trip.layers.length > 0) {
    const layerInfo = document.createElement('div');
    layerInfo.className = 'trip-layer-info';
    layerInfo.textContent = (t('layers') || 'Layers') + ': ' + trip.layers.length;
    layerInfo.title = trip.layers.map(l => l.label || l.date).join(', ');
    actions.appendChild(layerInfo);
  }

  sheet.appendChild(actions);
}

function findNextMapStop(stops, fromIdx) {
  for (let j = fromIdx + 1; j < stops.length; j++) {
    if (stops[j].type === 'map') return stops[j];
  }
  return null;
}

function formatDuration(minutes) {
  if (minutes < 60) return minutes + ' min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h + 'h' + (m > 0 ? ' ' + m + 'm' : '');
}

async function showAddStopMenu(trip, insertAt, sheet, el) {
  const maps = db.readJSON('maps_registry', []);
  const options = maps.map(m => '\uD83D\uDCCD ' + (m.title || m.city || m.id));
  if (options.length === 0) {
    showToast(t('noMaps') || 'No maps yet');
    return;
  }
  const idx = await actionSheet(t('addStop') || 'Add Stop', options);
  if (idx !== null && idx >= 0) {
    const map = maps[idx];
    const newStop = {
      type: 'map',
      mapId: map.id,
      stayDuration: null,
      arrivalDate: null,
      departureDate: null,
      travelMode: 'car',
    };
    trip.stops.splice(insertAt, 0, newStop);
    trip.stops.forEach((s, i) => { s.order = i; });
    currentTrip = await updateTrip(trip.id, { stops: trip.stops });
    renderStopList(currentTrip, sheet, el);
    if (leafletMap) renderTripOnMap(currentTrip, window.L);
  }
}

async function startDrawingMode(trip, sheet, el) {
  if (!leafletMap || !window.L) return;
  try {
    const { enableDrawingMode } = await import('../map/drawing.js');
    const mapDiv = leafletMap.getContainer();
    mapDiv.classList.add('drawing-mode');

    showToast(t('drawCorridorHint') || 'Draw a route on the map');

    enableDrawingMode(leafletMap, window.L, async (path, width) => {
      mapDiv.classList.remove('drawing-mode');
      const corridorStop = {
        type: 'corridor',
        path,
        width,
        focusZones: [],
        activities: [],
      };
      currentTrip = await addStopToTrip(trip.id, corridorStop);
      renderStopList(currentTrip, sheet, el);
      renderTripOnMap(currentTrip, window.L);
    });
  } catch {
    showToast('Drawing module not available');
  }
}

async function startQuickCorridorMode(trip, sheet, el) {
  if (!leafletMap || !window.L) return;
  try {
    const { enableQuickCorridorMode } = await import('../map/drawing.js');
    const mapDiv = leafletMap.getContainer();
    mapDiv.classList.add('drawing-mode');

    showToast(t('quickCorridorHint') || 'Tap two points on the map');

    enableQuickCorridorMode(leafletMap, window.L, async (path, width) => {
      mapDiv.classList.remove('drawing-mode');
      const corridorStop = {
        type: 'corridor',
        path,
        width,
        focusZones: [],
        activities: [],
      };
      currentTrip = await addStopToTrip(trip.id, corridorStop);
      renderStopList(currentTrip, sheet, el);
      renderTripOnMap(currentTrip, window.L);
    });
  } catch {
    showToast('Drawing module not available');
  }
}

async function doSplitCorridor(trip, corridorIdx, sheet, el) {
  const maps = db.readJSON('maps_registry', []);
  if (maps.length === 0) {
    showToast(t('noMaps') || 'No maps to insert as stop');
    return;
  }
  const options = maps.map(m => '\uD83D\uDCCD ' + (m.title || m.city || m.id));
  const idx = await actionSheet(t('splitHere') || 'Insert stop to split corridor', options);
  if (idx === null || idx < 0) return;

  const map = maps[idx];
  const newMapStop = {
    type: 'map',
    mapId: map.id,
    stayDuration: null,
    travelMode: 'car',
  };
  currentTrip = await splitCorridor(trip.id, corridorIdx, newMapStop);
  if (currentTrip) {
    renderStopList(currentTrip, sheet, el);
    if (leafletMap) renderTripOnMap(currentTrip, window.L);
    showToast(t('corridorSplit') || 'Corridor split');
  }
}

async function startCorridorSearch(trip, corridorIdx, sheet, el) {
  const corridor = trip.stops[corridorIdx];
  if (!corridor || !corridor.path || corridor.path.length < 2) return;

  try {
    const available = providers.filter(p => p.id === 'manual' || !!db.readJSON('apikey_' + p.id));
    if (available.length === 0) {
      showToast(t('apiKeyNeeded') || 'Configure an API key first');
      return;
    }
    const providerNames = available.map(p => p.label);
    const provIdx = await actionSheet(t('provider') || 'AI Provider', providerNames);
    if (provIdx === null || provIdx < 0) return;
    const provider = available[provIdx];
    const apiKey = db.readJSON('apikey_' + provider.id, '');

    // Segment the corridor
    const segments = sampleCorridorSegments(corridor.path);

    // Show progress
    const progressDiv = document.createElement('div');
    progressDiv.className = 'corridor-search-progress';
    progressDiv.textContent = (t('searching') || 'Searching...') + ' 0/' + segments.length;
    sheet.appendChild(progressDiv);

    const allActivities = [];
    const existingNames = new Set((corridor.activities || []).map(a => a.name));

    for (let i = 0; i < segments.length; i++) {
      progressDiv.textContent = (t('searching') || 'Searching...') + ' ' + (i + 1) + '/' + segments.length;

      const seg = segments[i];
      // Reverse geocode to get area name
      let areaName = 'area';
      try {
        const geo = await reverseGeocode(seg.lat, seg.lng);
        if (geo) areaName = geo.shortName || geo.city || 'area';
      } catch { /* use default */ }

      const { systemPrompt, userPrompt } = buildCorridorPrompt(
        areaName, seg.lat, seg.lng, seg.radiusKm,
        trip.dateStart, trip.dateEnd,
        [...existingNames],
      );

      try {
        const response = await callLLM(provider.id, apiKey, systemPrompt, userPrompt);
        const activities = parseActivities(response, trip.dateStart, trip.dateEnd);
        for (const act of activities) {
          if (!existingNames.has(act.name)) {
            existingNames.add(act.name);
            allActivities.push(act);
          }
        }
      } catch (err) {
        console.warn('Corridor search segment failed:', err);
      }
    }

    progressDiv.remove();

    if (allActivities.length > 0) {
      corridor.activities = [...(corridor.activities || []), ...allActivities];
      currentTrip = await updateTrip(trip.id, { stops: trip.stops });
      renderStopList(currentTrip, sheet, el);
      if (leafletMap) renderTripOnMap(currentTrip, window.L);
      showToast(allActivities.length + ' ' + (t('activities') || 'activities') + ' ' + (t('found') || 'found'));
    } else {
      showToast(t('noResults') || 'No results found');
    }
  } catch (err) {
    showToast((t('searchError') || 'Search failed') + ': ' + err.message);
  }
}

// ── Timeline computation ─────────────────────────────────────────────

function computeTripTimeline(trip) {
  if (!trip || !trip.stops || trip.stops.length === 0) return { days: [], anytime: [] };

  const dateStart = trip.dateStart || null;
  const dateEnd = trip.dateEnd || null;

  // Collect all activities across map stops and corridor stops
  const allActivities = [];
  const anytime = [];

  trip.stops.forEach((stop, idx) => {
    if (stop.type === 'map') {
      const mapData = db.readJSON('map_data_' + stop.mapId, null);
      if (mapData && mapData.activities) {
        for (const act of mapData.activities) {
          const entry = { ...act, _stopIdx: idx, _stopType: 'map', _stopName: mapData.title || mapData.city || stop.mapId };
          if (act.date) {
            allActivities.push(entry);
          } else {
            anytime.push(entry);
          }
        }
      }
    } else if (stop.type === 'corridor' && stop.activities) {
      for (const act of stop.activities) {
        const entry = { ...act, _stopIdx: idx, _stopType: 'corridor', _stopName: t('drawCorridor') || 'Route' };
        if (act.date) {
          allActivities.push(entry);
        } else {
          anytime.push(entry);
        }
      }
    }
  });

  // Group by date
  const byDate = {};
  allActivities.forEach(act => {
    const d = act.date;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(act);
  });

  // Build day range from trip dates
  const dayKeys = Object.keys(byDate).sort();

  // If trip has date range, ensure all days in range exist
  if (dateStart && dateEnd) {
    const start = new Date(dateStart + 'T00:00:00');
    const end = new Date(dateEnd + 'T00:00:00');
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      if (!byDate[key]) byDate[key] = [];
      if (!dayKeys.includes(key)) dayKeys.push(key);
    }
    dayKeys.sort();
  }

  // Compute travel segments between map stops
  const travelSegments = [];
  trip.stops.forEach((stop, idx) => {
    if (stop.type === 'map' && stop.travelTimeToNext) {
      const nextMap = findNextMapStop(trip.stops, idx);
      if (nextMap) {
        const fromData = db.readJSON('map_data_' + stop.mapId, null);
        const toData = db.readJSON('map_data_' + nextMap.mapId, null);
        const mode = TRAVEL_MODES.find(m => m.id === stop.travelMode) || TRAVEL_MODES[2];
        travelSegments.push({
          fromName: (fromData && fromData.title) || stop.mapId,
          toName: (toData && toData.title) || nextMap.mapId,
          durationMin: stop.travelTimeToNext,
          distanceKm: stop.travelDistanceToNext,
          modeIcon: mode.icon,
          modeId: mode.id,
          afterStopIdx: idx,
        });
      }
    }
  });

  // Build days array
  const days = dayKeys.map(date => {
    const acts = (byDate[date] || []).sort((a, b) => (a.time_start || '').localeCompare(b.time_start || ''));
    // Compute total scheduled hours for this day
    let totalMinutes = 0;
    acts.forEach(act => {
      if (act.duration_hours) totalMinutes += act.duration_hours * 60;
      else totalMinutes += 90; // default 1.5h per activity
    });
    return { date, activities: acts, totalMinutes, budget: totalMinutes > 14 * 60 ? 'over' : totalMinutes > 10 * 60 ? 'warn' : 'ok' };
  });

  return { days, anytime, travelSegments };
}

function renderTripTimeline(container, trip) {
  container.textContent = '';

  const { days, anytime, travelSegments } = computeTripTimeline(trip);

  if (days.length === 0 && anytime.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'text-secondary text-center mt-8';
    empty.textContent = t('noActivities') || 'No activities yet. Search maps or corridors to fill your timeline.';
    container.appendChild(empty);
    return;
  }

  // Render each day
  days.forEach(day => {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'trip-timeline-day';

    // Day header
    const h2 = document.createElement('h2');
    h2.className = 'trip-timeline-day-header';
    const dateObj = new Date(day.date + 'T00:00:00');
    h2.textContent = dateObj.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

    // Time budget badge
    if (day.budget !== 'ok') {
      const badge = document.createElement('span');
      badge.className = 'trip-time-budget ' + (day.budget === 'over' ? 'budget-over' : 'budget-warn');
      const hrs = Math.round(day.totalMinutes / 60 * 10) / 10;
      badge.textContent = hrs + 'h';
      badge.title = day.budget === 'over'
        ? (t('overScheduled') || 'Over-scheduled!')
        : (t('busyDay') || 'Busy day');
      h2.appendChild(badge);
    }
    dayDiv.appendChild(h2);

    // Check for travel segments that might occur on this day
    travelSegments.forEach(seg => {
      const travelEl = document.createElement('div');
      travelEl.className = 'trip-timeline-travel';
      travelEl.textContent = seg.modeIcon + ' ' + seg.fromName + ' → ' + seg.toName +
        ' (' + formatDuration(seg.durationMin) + (seg.distanceKm ? ', ' + seg.distanceKm + ' km' : '') + ')';
      dayDiv.appendChild(travelEl);
    });

    if (day.activities.length === 0) {
      const noAct = document.createElement('p');
      noAct.className = 'trip-timeline-empty';
      noAct.textContent = t('freeDay') || 'Free day — no activities scheduled';
      dayDiv.appendChild(noAct);
    }

    day.activities.forEach(act => {
      const cat = CATEGORIES[act.category] || CATEGORIES.other;
      const slot = document.createElement('div');
      slot.className = 'trip-timeline-slot';

      // Time column
      const timeDiv = document.createElement('div');
      timeDiv.className = 'trip-timeline-time';
      timeDiv.textContent = act.time_start || '?';
      slot.appendChild(timeDiv);

      // Content column
      const content = document.createElement('div');
      content.className = 'trip-timeline-content';
      content.style.borderLeftColor = cat.color;

      const h4 = document.createElement('h4');
      h4.textContent = cat.icon + ' ' + (act.name || '');
      content.appendChild(h4);

      const meta = document.createElement('div');
      meta.className = 'trip-timeline-meta';
      const parts = [];
      if (act._stopName) parts.push(act._stopType === 'corridor' ? '🛤️ ' + act._stopName : '📍 ' + act._stopName);
      if (act.cost) parts.push(act.cost);
      if (act.address) parts.push(act.address);
      meta.textContent = parts.join(' · ');
      content.appendChild(meta);

      if (act.description) {
        const desc = document.createElement('div');
        desc.className = 'trip-timeline-desc';
        desc.textContent = act.description;
        content.appendChild(desc);
      }

      slot.appendChild(content);
      dayDiv.appendChild(slot);
    });

    container.appendChild(dayDiv);
  });

  // Anytime / permanent activities
  if (anytime.length > 0) {
    const anyDiv = document.createElement('div');
    anyDiv.className = 'trip-timeline-day';

    const h2 = document.createElement('h2');
    h2.className = 'trip-timeline-day-header anytime-header';
    h2.textContent = t('anytime') || 'Anytime';
    anyDiv.appendChild(h2);

    anytime.forEach(act => {
      const cat = CATEGORIES[act.category] || CATEGORIES.other;
      const slot = document.createElement('div');
      slot.className = 'trip-timeline-slot';

      const timeDiv = document.createElement('div');
      timeDiv.className = 'trip-timeline-time';
      timeDiv.textContent = '∞';
      slot.appendChild(timeDiv);

      const content = document.createElement('div');
      content.className = 'trip-timeline-content';
      content.style.borderLeftColor = cat.color;

      const h4 = document.createElement('h4');
      h4.textContent = cat.icon + ' ' + (act.name || '');
      content.appendChild(h4);

      const meta = document.createElement('div');
      meta.className = 'trip-timeline-meta';
      const parts = [];
      if (act._stopName) parts.push(act._stopType === 'corridor' ? '🛤️ ' + act._stopName : '📍 ' + act._stopName);
      if (act.cost) parts.push(act.cost);
      meta.textContent = parts.join(' · ');
      content.appendChild(meta);

      slot.appendChild(content);
      anyDiv.appendChild(slot);
    });

    container.appendChild(anyDiv);
  }
}

// ── Re-run (Phase 7) ────────────────────────────────────────────────

async function rerunTripSearches(trip, sheet, el) {
  const available = providers.filter(p => p.id === 'manual' || !!db.readJSON('apikey_' + p.id));
  if (available.length === 0) {
    showToast(t('apiKeyNeeded') || 'Configure an API key first');
    return;
  }
  const providerNames = available.map(p => p.label);
  const provIdx = await actionSheet(t('provider') || 'AI Provider', providerNames);
  if (provIdx === null || provIdx < 0) return;
  const provider = available[provIdx];
  const apiKey = db.readJSON('apikey_' + provider.id, '');

  // Create a new layer
  const layerDate = new Date().toISOString().slice(0, 10);
  const layerId = 'layer_' + Date.now();
  const newLayer = { id: layerId, date: layerDate, label: layerDate };
  if (!trip.layers) trip.layers = [];
  trip.layers.push(newLayer);

  // Progress
  const progressDiv = document.createElement('div');
  progressDiv.className = 'corridor-search-progress';
  progressDiv.textContent = t('refreshing') || 'Refreshing activities...';
  sheet.appendChild(progressDiv);

  let totalNew = 0;

  for (let i = 0; i < trip.stops.length; i++) {
    const stop = trip.stops[i];

    if (stop.type === 'corridor' && stop.path && stop.path.length >= 2) {
      progressDiv.textContent = (t('searchAlongRoute') || 'Searching along route...') + ' (' + (i + 1) + '/' + trip.stops.length + ')';

      const segments = sampleCorridorSegments(stop.path);
      const existingNames = new Set((stop.activities || []).map(a => a.name));
      const newActivities = [];

      for (const seg of segments) {
        let areaName = 'area';
        try {
          const geo = await reverseGeocode(seg.lat, seg.lng);
          if (geo) areaName = geo.shortName || geo.city || 'area';
        } catch { /* use default */ }

        const { systemPrompt, userPrompt } = buildCorridorPrompt(
          areaName, seg.lat, seg.lng, seg.radiusKm,
          trip.dateStart, trip.dateEnd, [...existingNames],
        );

        try {
          const response = await callLLM(provider.id, apiKey, systemPrompt, userPrompt);
          const activities = parseActivities(response, trip.dateStart, trip.dateEnd);
          for (const act of activities) {
            if (!existingNames.has(act.name)) {
              existingNames.add(act.name);
              act._layerId = layerId;
              newActivities.push(act);
            }
          }
        } catch (err) {
          console.warn('Re-run corridor segment failed:', err);
        }
      }

      if (newActivities.length > 0) {
        stop.activities = [...(stop.activities || []), ...newActivities];
        totalNew += newActivities.length;
      }
    }
  }

  progressDiv.remove();

  currentTrip = await updateTrip(trip.id, { stops: trip.stops, layers: trip.layers });
  renderStopList(currentTrip, sheet, el);
  if (leafletMap) renderTripOnMap(currentTrip, window.L);
  showToast((totalNew > 0 ? totalNew + ' ' + (t('newActivities') || 'new activities') : t('noResults') || 'No new results') + ' — ' + (t('layerCreated') || 'Layer') + ': ' + layerDate);
}

const screenObj = {
  async mount(el) {
    const container = el.querySelector('#trip-builder-container') || el;
    container.textContent = '';
    Object.assign(container.style, {
      display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden',
    });

    const params = arguments[1] || {};
    activeTab = 'map';

    if (params.tripId) {
      currentTrip = await getTrip(params.tripId);
    } else if (params.newTrip) {
      const name = await modalPrompt(
        t('newTripRoute') || 'New Trip',
        t('mapNameMsg') || 'Choose a name',
        ''
      );
      if (!name || !name.trim()) {
        navigate('my-trips');
        return;
      }
      currentTrip = await createTrip({ title: name.trim() });
    }

    if (!currentTrip) {
      navigate('my-trips');
      return;
    }

    // Tab bar (Map | Timeline)
    const tabBar = document.createElement('div');
    tabBar.className = 'trip-tab-bar';

    const mapTab = document.createElement('button');
    mapTab.className = 'trip-tab active';
    mapTab.textContent = t('mapView') || 'Map';
    mapTab.dataset.tab = 'map';

    const timelineTab = document.createElement('button');
    timelineTab.className = 'trip-tab';
    timelineTab.textContent = t('timeline') || 'Timeline';
    timelineTab.dataset.tab = 'timeline';

    tabBar.appendChild(mapTab);
    tabBar.appendChild(timelineTab);
    container.appendChild(tabBar);

    // Map pane (top half when active)
    const mapPane = document.createElement('div');
    mapPane.className = 'trip-map-pane';
    container.appendChild(mapPane);

    // Bottom sheet (stop list, under map)
    const sheet = document.createElement('div');
    sheet.className = 'trip-bottom-sheet';
    container.appendChild(sheet);

    // Timeline pane (hidden by default)
    const timelinePane = document.createElement('div');
    timelinePane.className = 'trip-timeline-pane';
    timelinePane.style.display = 'none';
    container.appendChild(timelinePane);

    // Tab switching
    function switchTab(tab) {
      activeTab = tab;
      mapTab.classList.toggle('active', tab === 'map');
      timelineTab.classList.toggle('active', tab === 'timeline');
      mapPane.style.display = tab === 'map' ? '' : 'none';
      sheet.style.display = tab === 'map' ? '' : 'none';
      timelinePane.style.display = tab === 'timeline' ? '' : 'none';
      if (tab === 'map' && leafletMap) {
        setTimeout(() => leafletMap.invalidateSize(), 50);
      }
      if (tab === 'timeline') {
        renderTripTimeline(timelinePane, currentTrip);
      }
    }

    mapTab.addEventListener('click', () => switchTab('map'));
    timelineTab.addEventListener('click', () => switchTab('timeline'));

    // Init Leaflet
    const L = await loadLeaflet();
    leafletMap = L.map(mapPane, { zoomControl: true }).setView([42.5, 12.5], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(leafletMap);

    renderTripOnMap(currentTrip, L);
    renderStopList(currentTrip, sheet, el);

    setTimeout(() => { leafletMap.invalidateSize(); }, 100);
  },
};

export default screenObj;

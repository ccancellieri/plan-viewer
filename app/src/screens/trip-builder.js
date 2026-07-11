import { t } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { navigate } from '../router.js';
import { createTrip, getTrip, updateTrip, addStopToTrip, removeStop, reorderStops, splitCorridor } from '../lib/trip.js';
import { actionSheet, prompt as modalPrompt, confirm, alert as modalAlert, textareaPrompt } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { corridorPolygon, pathLength, simplifyPath, adaptiveWidth } from '../lib/corridor.js';
import { estimateTravelTime } from '../lib/osrm.js';
import { buildCorridorPrompt, buildFocusZonePrompt } from '../lib/prompt.js';
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
// View-only visibility state for temporal layers ('base' = activities
// found before the first re-run). Reset on every mount.
let hiddenLayerIds = new Set();

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

function renderTripOnMap(trip, L, hideCorridorIdx = -1) {
  clearMapLayers();
  const bounds = [];
  let mapStopNum = 0;

  trip.stops.forEach((stop, idx) => {
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
        const popupEl = document.createElement('strong');
        popupEl.textContent = mapData.title || stop.mapId;
        marker.bindPopup(popupEl);
        mapLayers.stops.push(marker);
      }
    } else if (stop.type === 'corridor' && stop.path && stop.path.length > 1) {
      const latlngs = stop.path.map(p => [p.lat, p.lng]);
      bounds.push(...latlngs);

      // Skip the corridor's own polygon/line while it's being reshaped in
      // waypoint-edit mode, so the live preview isn't drawn twice.
      if (idx !== hideCorridorIdx) {
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
      }

      // Render corridor activities as markers (visible layers only)
      if (stop.activities && stop.activities.length > 0) {
        for (const act of stop.activities) {
          if (act.lat != null && act.lng != null && isLayerVisible(act)) {
            const m = L.circleMarker([act.lat, act.lng], {
              radius: 6, color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.8, weight: 1,
            }).addTo(leafletMap);
            const popupEl = document.createElement('div');
            const popupName = document.createElement('strong');
            popupName.textContent = act.name || '';
            popupEl.appendChild(popupName);
            popupEl.appendChild(document.createElement('br'));
            popupEl.appendChild(document.createTextNode(act.description || ''));
            m.bindPopup(popupEl);
            mapLayers.corridors.push(m);
          }
        }
      }

      // Render focus zones as circles
      if (stop.focusZones && stop.focusZones.length > 0) {
        for (const zone of stop.focusZones) {
          const circle = L.circle([zone.lat, zone.lng], {
            radius: (zone.radius || 10) * 1000,
            color: '#ec4899', fillColor: '#ec4899', fillOpacity: 0.08, weight: 2, dashArray: '2 6',
          }).addTo(leafletMap);
          const popupEl = document.createElement('strong');
          popupEl.textContent = zone.keyword || '';
          circle.bindPopup(popupEl);
          mapLayers.corridors.push(circle);
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

      if (stop.arrivalDate || stop.departureDate) {
        const dates = document.createElement('span');
        dates.className = 'text-secondary text-sm';
        dates.textContent = (stop.arrivalDate || '?') + ' → ' + (stop.departureDate || '?');
        info.appendChild(dates);
      }

      // Tap the stop info to edit stay duration and dates
      info.addEventListener('click', (e) => {
        e.stopPropagation();
        editStopDetails(trip, idx, sheet, el);
      });

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

      if (stop.focusZones && stop.focusZones.length > 0) {
        const fzCount = document.createElement('span');
        fzCount.className = 'text-secondary text-sm';
        fzCount.textContent = '🎯 ' + stop.focusZones.length + ' ' + (t('focusZones') || 'focus zones');
        info.appendChild(fzCount);
      }

      // Tap the corridor info to adjust width or manage focus zones
      info.addEventListener('click', (e) => {
        e.stopPropagation();
        editCorridor(trip, idx, sheet, el);
      });

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

    // Reorder buttons (\u25B2\u25BC)
    if (trip.stops.length > 1) {
      const reorder = document.createElement('div');
      reorder.className = 'trip-reorder';
      const upBtn = document.createElement('button');
      upBtn.className = 'btn-icon trip-reorder-btn';
      upBtn.textContent = '\u25B2';
      upBtn.disabled = idx === 0;
      upBtn.title = t('moveUp') || 'Move up';
      upBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveStop(trip, idx, -1, sheet, el);
      });
      const downBtn = document.createElement('button');
      downBtn.className = 'btn-icon trip-reorder-btn';
      downBtn.textContent = '\u25BC';
      downBtn.disabled = idx === trip.stops.length - 1;
      downBtn.title = t('moveDown') || 'Move down';
      downBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        moveStop(trip, idx, 1, sheet, el);
      });
      reorder.appendChild(upBtn);
      reorder.appendChild(downBtn);
      item.appendChild(reorder);
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
          computeTravelTime(stop, nextMapStop).then(async result => {
            if (!result) return;
            // Re-read the trip fresh so we don't clobber concurrent edits
            // (e.g. a stop deleted while this request was in flight) with
            // this render's stale stops snapshot.
            const fresh = await getTrip(trip.id);
            if (!fresh) return;
            let target = fresh.stops[idx];
            if (!target || target.type !== 'map' || target.mapId !== stop.mapId) {
              target = fresh.stops.find(s => s.type === 'map' && s.mapId === stop.mapId);
            }
            if (!target) return; // stop no longer exists \u2014 do nothing
            target.travelTimeToNext = result.durationMin;
            target.travelDistanceToNext = result.distanceKm;
            travelDiv.textContent = formatDuration(result.durationMin) + ' \u2022 ' + result.distanceKm + ' km';
            if (result.source === 'estimate') travelDiv.textContent += ' ~';
            currentTrip = await updateTrip(fresh.id, { stops: fresh.stops });
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

  // Layer indicator — tap to toggle layer visibility
  if (trip.layers && trip.layers.length > 0) {
    const layerInfo = document.createElement('button');
    layerInfo.className = 'trip-layer-info';
    const hiddenCount = hiddenLayerIds.size;
    layerInfo.textContent = '👁 ' + (t('layers') || 'Layers') + ': ' + trip.layers.length +
      (hiddenCount > 0 ? ' (' + hiddenCount + ' ' + (t('hidden') || 'hidden') + ')' : '');
    layerInfo.title = trip.layers.map(l => l.label || l.date).join(', ');
    layerInfo.addEventListener('click', () => showLayerToggle(trip, sheet, el));
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

/**
 * Invoke a provider, handling manual mode in the UI (same flow as the city
 * search screen): copy the prompt, let the user paste the AI's JSON reply.
 * Returns null when the user cancels the manual paste.
 */
async function callProvider(provider, apiKey, systemPrompt, userPrompt) {
  if (provider.id !== 'manual') {
    return callLLM(provider.id, apiKey, systemPrompt, userPrompt);
  }
  const fullPrompt = systemPrompt + '\n\n' + userPrompt;
  try { await navigator.clipboard.writeText(fullPrompt); } catch { /* clipboard unavailable */ }
  await modalAlert(
    t('manualTitle') || 'Manual Mode',
    t('manualMsg') || 'The prompt has been copied to your clipboard.\n\n1. Open any AI chat\n2. Paste the prompt\n3. Copy the JSON response\n4. Come back and paste it'
  );
  const response = await textareaPrompt(
    t('manualPaste') || 'Paste Response',
    t('manualPasteMsg') || 'Paste the JSON response from the AI:',
    '[{"name": "...", "category": "...", ...}]'
  );
  return response || null;
}

// ── Stop & corridor editing ─────────────────────────────────────────

function isLayerVisible(act) {
  return !hiddenLayerIds.has(act._layerId || 'base');
}

// Questionnaire profile for this trip: the snapshot stored on the trip,
// falling back to the profile last saved by the questionnaire screen.
function getTripProfile(trip) {
  return trip.profile || db.readJSON('search_profile', null) || null;
}

/**
 * Prompt for a date. Returns 'YYYY-MM-DD', null when cleared,
 * or undefined when cancelled / invalid (caller should abort).
 */
async function promptDate(title, current) {
  const val = await modalPrompt(title, 'YYYY-MM-DD', current || '');
  if (val === null) return undefined;
  const s = val.trim();
  if (s === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || isNaN(new Date(s + 'T00:00:00').getTime())) {
    showToast(t('invalidDate') || 'Invalid date — use YYYY-MM-DD');
    return undefined;
  }
  return s;
}

async function editStopDetails(trip, idx, sheet, el) {
  const stop = trip.stops[idx];
  if (!stop || stop.type !== 'map') return;
  const options = [
    '🕐 ' + (t('stayDuration') || 'Stay Duration') + ': ' + (stop.stayDuration ? stop.stayDuration + 'h' : '—'),
    '📅 ' + (t('arrivalDate') || 'Arrival') + ': ' + (stop.arrivalDate || '—'),
    '📅 ' + (t('departureDate') || 'Departure') + ': ' + (stop.departureDate || '—'),
  ];
  const choice = await actionSheet(t('editStop') || 'Edit Stop', options);
  if (choice === null || choice < 0) return;

  if (choice === 0) {
    const val = await modalPrompt(
      t('stayDuration') || 'Stay Duration',
      t('stayDurationMsg') || 'Hours at this stop (e.g. 24)',
      stop.stayDuration != null ? String(stop.stayDuration) : ''
    );
    if (val === null) return;
    const num = parseFloat(val);
    stop.stayDuration = val.trim() === '' || isNaN(num) || num <= 0 ? null : num;
  } else if (choice === 1) {
    const d = await promptDate(t('arrivalDate') || 'Arrival date', stop.arrivalDate);
    if (d === undefined) return;
    stop.arrivalDate = d;
  } else if (choice === 2) {
    const d = await promptDate(t('departureDate') || 'Departure date', stop.departureDate);
    if (d === undefined) return;
    stop.departureDate = d;
  }

  currentTrip = await updateTrip(trip.id, { stops: trip.stops });
  renderStopList(currentTrip, sheet, el);
}

async function editCorridor(trip, idx, sheet, el) {
  const stop = trip.stops[idx];
  if (!stop || stop.type !== 'corridor') return;
  const options = [
    '↔️ ' + (t('adjustWidth') || 'Adjust width') + ' (' + (stop.width ? stop.width.toFixed(0) : '?') + ' km)',
    '✏️ ' + (t('editPath') || 'Edit path'),
    '🎯 ' + (t('addFocusZone') || 'Add focus zone'),
  ];
  const zones = stop.focusZones || [];
  zones.forEach(z => {
    options.push('✕ 🎯 ' + (z.keyword || '') + ' (' + (z.radius || 10) + ' km)');
  });
  const choice = await actionSheet(t('drawCorridor') || 'Route', options);
  if (choice === null || choice < 0) return;

  if (choice === 0) {
    const val = await modalPrompt(
      t('adjustWidth') || 'Adjust width',
      t('widthMsg') || 'Corridor width in km (10-100)',
      stop.width ? String(Math.round(stop.width)) : ''
    );
    if (val === null) return;
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      showToast(t('invalidWidth') || 'Invalid width');
      return;
    }
    stop.width = Math.max(5, Math.min(num, 200));
    // Remember this was a manual choice so a later path edit doesn't
    // silently overwrite it with the adaptive-width recompute.
    stop.widthUserSet = true;
    currentTrip = await updateTrip(trip.id, { stops: trip.stops });
    renderStopList(currentTrip, sheet, el);
    if (leafletMap) renderTripOnMap(currentTrip, window.L);
  } else if (choice === 1) {
    editCorridorPath(trip, idx, sheet, el);
  } else if (choice === 2) {
    addFocusZone(trip, idx, sheet, el);
  } else {
    // Remove the selected focus zone
    const zoneIdx = choice - 3;
    zones.splice(zoneIdx, 1);
    stop.focusZones = zones;
    currentTrip = await updateTrip(trip.id, { stops: trip.stops });
    renderStopList(currentTrip, sheet, el);
    if (leafletMap) renderTripOnMap(currentTrip, window.L);
  }
}

/**
 * Enter waypoint-edit mode for a corridor: renders the path as draggable
 * markers on the map (see enableCorridorPathEdit in map/drawing.js).
 * Confirm persists the reshaped path (and recomputes the adaptive width,
 * unless the user explicitly set one via "Adjust width"); Cancel leaves
 * the stored corridor untouched.
 */
async function editCorridorPath(trip, corridorIdx, sheet, el) {
  if (!leafletMap || !window.L) return;
  const stop = trip.stops[corridorIdx];
  if (!stop || stop.type !== 'corridor' || !stop.path || stop.path.length < 2) return;

  try {
    const { enableCorridorPathEdit } = await import('../map/drawing.js');
    const L = window.L;

    showToast(t('editPathHint') || 'Drag the waypoints to reshape the route');

    // Hide this corridor's own polygon/line while the live edit preview
    // covers the same area, so the two don't overlap.
    renderTripOnMap(trip, L, corridorIdx);

    enableCorridorPathEdit(leafletMap, L, stop.path, stop.width, async (newPath) => {
      // Re-read the trip fresh so we don't clobber concurrent edits with
      // this render's stale stops snapshot.
      const fresh = await getTrip(trip.id);
      if (!fresh) return;
      const freshStop = fresh.stops[corridorIdx];
      if (!freshStop || freshStop.type !== 'corridor') {
        renderTripOnMap(currentTrip || trip, L);
        return;
      }

      const simplified = simplifyPath(newPath, 0.001);
      freshStop.path = simplified;
      if (!freshStop.widthUserSet) {
        freshStop.width = adaptiveWidth(pathLength(simplified));
      }

      currentTrip = await updateTrip(fresh.id, { stops: fresh.stops });
      renderStopList(currentTrip, sheet, el);
      renderTripOnMap(currentTrip, L);
      showToast(t('pathUpdated') || 'Route updated');
    }, () => {
      // Cancel — nothing was persisted, just restore the normal view.
      renderTripOnMap(currentTrip || trip, L);
    });
  } catch {
    showToast('Drawing module not available');
  }
}

async function addFocusZone(trip, corridorIdx, sheet, el) {
  if (!leafletMap) return;
  showToast(t('focusZoneHint') || 'Tap a point on the map');
  const mapDiv = leafletMap.getContainer();
  mapDiv.classList.add('drawing-mode');

  leafletMap.once('click', async (e) => {
    mapDiv.classList.remove('drawing-mode');
    const { lat, lng } = e.latlng;

    const keyword = await modalPrompt(
      t('addFocusZone') || 'Add focus zone',
      t('focusKeywordMsg') || 'What to look for (e.g. thermal baths)',
      ''
    );
    if (keyword === null || !keyword.trim()) return;

    const radiusVal = await modalPrompt(
      t('focusRadiusMsg') || 'Search radius in km',
      t('focusRadiusMsg') || 'Search radius in km',
      '10'
    );
    if (radiusVal === null) return;
    const radius = Math.max(1, Math.min(parseFloat(radiusVal) || 10, 100));

    const stop = trip.stops[corridorIdx];
    if (!stop.focusZones) stop.focusZones = [];
    const zone = { lat, lng, radius, keyword: keyword.trim() };
    stop.focusZones.push(zone);
    currentTrip = await updateTrip(trip.id, { stops: trip.stops });
    renderStopList(currentTrip, sheet, el);
    renderTripOnMap(currentTrip, window.L);

    const runNow = await confirm(
      t('addFocusZone') || 'Focus zone',
      t('runSearchNow') || 'Search this zone now?'
    );
    if (runNow) {
      runFocusZoneSearch(currentTrip, corridorIdx, zone, sheet, el);
    }
  });
}

async function runFocusZoneSearch(trip, corridorIdx, zone, sheet, el) {
  const corridor = trip.stops[corridorIdx];
  if (!corridor) return;

  const available = providers.filter(p => p.id === 'manual' || !!db.readJSON('apikey_' + p.id));
  if (available.length === 0) {
    showToast(t('apiKeyNeeded') || 'Configure an API key first');
    return;
  }
  const provIdx = await actionSheet(t('provider') || 'AI Provider', available.map(p => p.label));
  if (provIdx === null || provIdx < 0) return;
  const provider = available[provIdx];
  const apiKey = db.readJSON('apikey_' + provider.id, '');

  const progressDiv = document.createElement('div');
  progressDiv.className = 'corridor-search-progress';
  progressDiv.textContent = (t('searching') || 'Searching...') + ' 🎯 ' + zone.keyword;
  sheet.appendChild(progressDiv);

  try {
    let areaName = 'area';
    try {
      const geo = await reverseGeocode(zone.lat, zone.lng);
      if (geo) areaName = geo.shortName || geo.city || 'area';
    } catch { /* use default */ }

    const { systemPrompt, userPrompt } = buildFocusZonePrompt(
      areaName, zone.lat, zone.lng, zone.radius, zone.keyword,
      trip.dateStart, trip.dateEnd, getTripProfile(trip),
    );

    const response = await callProvider(provider, apiKey, systemPrompt, userPrompt);
    if (response == null) return; // manual mode cancelled
    const activities = parseActivities(response, trip.dateStart, trip.dateEnd);
    const existingNames = new Set((corridor.activities || []).map(a => a.name));
    const fresh = activities.filter(a => !existingNames.has(a.name));

    if (fresh.length > 0) {
      corridor.activities = [...(corridor.activities || []), ...fresh];
      currentTrip = await updateTrip(trip.id, { stops: trip.stops });
      renderStopList(currentTrip, sheet, el);
      if (leafletMap) renderTripOnMap(currentTrip, window.L);
      showToast(fresh.length + ' ' + (t('activities') || 'activities') + ' ' + (t('found') || 'found'));
    } else {
      showToast(t('noResults') || 'No results found');
    }
  } catch (err) {
    showToast((t('searchError') || 'Search failed') + ': ' + err.message);
  } finally {
    progressDiv.remove();
  }
}

async function showLayerToggle(trip, sheet, el) {
  const entries = [{ id: 'base', label: t('originalLayer') || 'Original' }];
  trip.layers.forEach(l => entries.push({ id: l.id, label: l.label || l.date }));

  const options = entries.map(e =>
    (hiddenLayerIds.has(e.id) ? '🚫 ' : '👁 ') + e.label
  );
  const choice = await actionSheet(t('layers') || 'Layers', options);
  if (choice === null || choice < 0) return;

  const id = entries[choice].id;
  if (hiddenLayerIds.has(id)) hiddenLayerIds.delete(id);
  else hiddenLayerIds.add(id);

  renderStopList(trip, sheet, el);
  if (leafletMap) renderTripOnMap(trip, window.L);
}

async function moveStop(trip, idx, delta, sheet, el) {
  const toIdx = idx + delta;
  if (toIdx < 0 || toIdx >= trip.stops.length) return;
  currentTrip = await reorderStops(trip.id, idx, toIdx);
  if (!currentTrip) return;
  // Cached travel times are stale after reordering — recompute lazily.
  currentTrip.stops.forEach(s => {
    if (s.type === 'map') {
      s.travelTimeToNext = null;
      s.travelDistanceToNext = null;
    }
  });
  currentTrip = await updateTrip(currentTrip.id, { stops: currentTrip.stops });
  renderStopList(currentTrip, sheet, el);
  if (leafletMap) renderTripOnMap(currentTrip, window.L);
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
        getTripProfile(trip),
      );

      try {
        const response = await callProvider(provider, apiKey, systemPrompt, userPrompt);
        if (response == null) break; // manual mode cancelled
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

// Local-date key (YYYY-MM-DD) for a Date built from local-midnight values.
// toISOString() converts to UTC first, which shifts the day backwards in
// any timezone ahead of UTC — this keeps the key aligned with the local
// calendar day the Date object represents.
function localDateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

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
        if (!isLayerVisible(act)) continue;
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
      const key = localDateKey(d);
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
          // Which day this segment is rendered under — the departing
          // stop's own dates, falling back to the trip's first day.
          date: stop.departureDate || stop.arrivalDate || dayKeys[0] || null,
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

/**
 * Locate the stored record behind a timeline entry so edits persist to the
 * right place: corridor activities live on the trip, map-stop activities in
 * the map's own data. Activities are deduplicated by name at search time,
 * so name is the lookup key.
 */
function resolveActivityRecord(trip, entry) {
  const stop = trip.stops[entry._stopIdx];
  if (!stop) return null;
  if (entry._stopType === 'corridor') {
    const rec = (stop.activities || []).find(a => a.name === entry.name);
    if (!rec) return null;
    return {
      rec,
      save: async () => { currentTrip = await updateTrip(trip.id, { stops: trip.stops }); },
    };
  }
  const key = 'map_data_' + stop.mapId;
  const mapData = db.readJSON(key, null);
  if (!mapData || !mapData.activities) return null;
  const rec = mapData.activities.find(a => a.name === entry.name);
  if (!rec) return null;
  return { rec, save: async () => db.writeJSON(key, mapData) };
}

async function editTimelineActivity(trip, entry, container) {
  const found = resolveActivityRecord(trip, entry);
  if (!found) return;
  const { rec, save } = found;

  const options = [
    '🕐 ' + (t('setTime') || 'Set time') + (rec.time_start ? ' (' + rec.time_start + ')' : ''),
    '📅 ' + (t('setDate') || 'Set date') + (rec.date ? ' (' + rec.date + ')' : ''),
  ];
  if (rec.date) options.push('∞ ' + (t('moveToAnytime') || 'Move to Anytime'));

  const choice = await actionSheet(rec.name || (t('activities') || 'Activity'), options);
  if (choice === null || choice < 0) return;

  if (choice === 0) {
    const val = await modalPrompt(t('setTime') || 'Set time', 'HH:MM', rec.time_start || '');
    if (val === null) return;
    const s = val.trim();
    if (s !== '' && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(s)) {
      showToast(t('invalidTime') || 'Invalid time — use HH:MM');
      return;
    }
    rec.time_start = s === '' ? null : s;
  } else if (choice === 1) {
    const d = await promptDate(t('setDate') || 'Set date', rec.date);
    if (d === undefined) return;
    rec.date = d;
  } else {
    rec.date = null;
  }

  const saved = await save();
  if (saved === false) {
    showToast(t('storageSaveError') || 'Could not save — storage may be full');
  }
  renderTripTimeline(container, currentTrip || trip);
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

    // Render each travel segment under the single day it belongs to
    travelSegments.filter(seg => seg.date === day.date).forEach(seg => {
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
      // Tap to reschedule (set time / date / move to anytime)
      slot.addEventListener('click', () => editTimelineActivity(trip, act, container));
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
      // Tap to schedule (assign a date/time)
      slot.addEventListener('click', () => editTimelineActivity(trip, act, container));
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

  // Trips are reusable templates: offer new dates before re-running
  const dateLabel = (trip.dateStart || '?') + ' — ' + (trip.dateEnd || '?');
  const dateChoice = await actionSheet(t('refreshActivities') || 'Refresh', [
    '📅 ' + (t('keepDates') || 'Keep dates') + ' (' + dateLabel + ')',
    '🗓 ' + (t('changeDates') || 'Change dates'),
  ]);
  if (dateChoice === null || dateChoice < 0) return;
  if (dateChoice === 1) {
    const ds = await promptDate(t('startDate') || 'Start date', trip.dateStart);
    if (ds === undefined) return;
    const de = await promptDate(t('endDate') || 'End date', trip.dateEnd);
    if (de === undefined) return;
    if (ds && de && ds > de) {
      showToast(t('invalidDateRange') || 'End date is before start date');
      return;
    }
    trip.dateStart = ds;
    trip.dateEnd = de;
  }

  // Snapshot the questionnaire profile on first re-run so the trip
  // keeps its own search preferences from now on
  if (!trip.profile) {
    const saved = db.readJSON('search_profile', null);
    if (saved && Object.keys(saved).length > 0) trip.profile = saved;
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

  // Persist dates/profile/layer up front so they survive an interrupted run
  currentTrip = await updateTrip(trip.id, {
    dateStart: trip.dateStart, dateEnd: trip.dateEnd,
    profile: trip.profile, layers: trip.layers,
  });

  // Progress
  const progressDiv = document.createElement('div');
  progressDiv.className = 'corridor-search-progress';
  progressDiv.textContent = t('refreshing') || 'Refreshing activities...';
  sheet.appendChild(progressDiv);

  let totalNew = 0;
  let cancelled = false;

  for (let i = 0; i < trip.stops.length && !cancelled; i++) {
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
          getTripProfile(trip),
        );

        try {
          const response = await callProvider(provider, apiKey, systemPrompt, userPrompt);
          if (response == null) { cancelled = true; break; } // manual mode cancelled
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
    hiddenLayerIds = new Set();

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
    if (leafletMap) leafletMap.remove();
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

import { t } from '../i18n/index.js';
import { db } from '../storage/index.js';
import { navigate } from '../router.js';
import { listTrips, deleteTrip, updateTrip, createTrip } from '../lib/trip.js';
import { actionSheet, confirm, prompt } from '../ui/modal.js';
import { showToast } from '../ui/toast.js';
import { adaptiveWidth } from '../lib/corridor.js';
import { haversine } from '../lib/geo.js';

function formatDate(d) { return d || ''; }

function getMapCenter(mapId) {
  const d = db.readJSON('map_data_' + mapId, null);
  return d && d.centerLat != null ? { lat: d.centerLat, lng: d.centerLng } : null;
}

/**
 * Entry point 2 from the trip design: pick existing maps in visit order,
 * connect consecutive maps with suggested straight-line corridors.
 */
async function createTripFromMaps() {
  const maps = db.readJSON('maps_registry', []);
  if (!maps || maps.length < 2) {
    showToast(t('needTwoMaps') || 'You need at least 2 saved maps');
    return;
  }

  const selected = [];
  while (true) {
    const remaining = maps.filter(m => !selected.includes(m));
    const options = remaining.map(m => '📍 ' + (m.title || m.name || m.city || m.id));
    if (selected.length >= 2) options.push('✅ ' + (t('done') || 'Done'));
    const idx = await actionSheet(
      (t('selectMaps') || 'Select maps in visit order') + ' (' + selected.length + ')',
      options
    );
    if (idx === null || idx < 0) {
      if (selected.length >= 2) break; // treat cancel as done once viable
      return;
    }
    if (idx >= remaining.length) break; // Done
    selected.push(remaining[idx]);
    if (selected.length === maps.length) break;
  }

  const name = await prompt(
    t('newTripRoute') || 'New Trip',
    t('enterNewName') || 'Enter a name',
    selected.map(m => m.title || m.name || m.city || '').filter(Boolean).join(' → ')
  );
  if (name === null || !name.trim()) return;

  const trip = await createTrip({ title: name.trim() });
  const stops = [];
  let prevCenter = null;

  for (const m of selected) {
    const center = getMapCenter(m.id);
    if (prevCenter && center) {
      const dist = haversine(prevCenter.lat, prevCenter.lng, center.lat, center.lng);
      if (dist > 1) {
        stops.push({
          type: 'corridor',
          path: [{ ...prevCenter }, { ...center }],
          width: adaptiveWidth(dist),
          focusZones: [],
          activities: [],
        });
      }
    }
    stops.push({
      type: 'map',
      mapId: m.id,
      stayDuration: null,
      arrivalDate: null,
      departureDate: null,
      travelMode: 'car',
    });
    if (center) prevCenter = center;
  }

  stops.forEach((s, i) => { s.order = i; });
  await updateTrip(trip.id, { stops });
  navigate('trip-builder', { tripId: trip.id });
}

/** Clone a trip's structure (stops, corridors, profile) without results. */
async function duplicateTrip(trip) {
  const copy = await createTrip({
    title: (trip.title || 'Trip') + ' (' + (t('copySuffix') || 'copy') + ')',
    dateStart: trip.dateStart,
    dateEnd: trip.dateEnd,
    profile: trip.profile,
  });
  const stops = (trip.stops || []).map(s =>
    s.type === 'corridor'
      ? {
          ...s,
          path: (s.path || []).map(p => ({ ...p })),
          focusZones: (s.focusZones || []).map(z => ({ ...z })),
          activities: [],
        }
      : { ...s, travelTimeToNext: null, travelDistanceToNext: null }
  );
  await updateTrip(copy.id, { stops });
  return copy;
}

function createTripCard(trip, container, refreshFn) {
  const card = document.createElement('div');
  card.className = 'card mb-8 map-card';

  const title = document.createElement('h4');
  title.className = 'map-card-title';
  title.textContent = trip.title || t('untitled') || 'Untitled';
  card.appendChild(title);

  if (trip.dateStart || trip.dateEnd) {
    const dates = document.createElement('p');
    dates.className = 'text-secondary text-sm';
    dates.textContent = formatDate(trip.dateStart) + ' \u2014 ' + formatDate(trip.dateEnd);
    card.appendChild(dates);
  }

  const stops = document.createElement('p');
  stops.className = 'text-secondary text-sm';
  const mapCount = trip.stops.filter(s => s.type === 'map').length;
  const corrCount = trip.stops.filter(s => s.type === 'corridor').length;
  stops.textContent = mapCount + ' ' + (t('stops') || 'stops') + ', ' + corrCount + ' ' + (t('corridors') || 'corridors');
  card.appendChild(stops);

  card.addEventListener('click', () => {
    navigate('trip-builder', { tripId: trip.id });
  });

  const moreBtn = document.createElement('button');
  moreBtn.className = 'btn-icon map-card-more';
  moreBtn.textContent = '\u2026';
  moreBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const options = [
      t('view') || 'View',
      t('rename') || 'Rename',
      t('duplicate') || 'Duplicate',
      t('delete') || 'Delete',
    ];
    const idx = await actionSheet(trip.title || t('untitled') || 'Untitled', options);
    if (idx === 0) {
      navigate('trip-builder', { tripId: trip.id });
    } else if (idx === 1) {
      const newName = await prompt(
        t('rename') || 'Rename',
        t('enterNewName') || 'Enter new name',
        trip.title || ''
      );
      if (newName !== null && newName.trim() !== '') {
        await updateTrip(trip.id, { title: newName.trim() });
        refreshFn();
      }
    } else if (idx === 2) {
      await duplicateTrip(trip);
      showToast(t('tripDuplicated') || 'Trip duplicated');
      refreshFn();
    } else if (idx === 3) {
      const yes = await confirm(
        t('delete') || 'Delete',
        (t('confirmDelete') || 'Delete') + ' "' + (trip.title || '') + '"?'
      );
      if (yes) {
        await deleteTrip(trip.id);
        refreshFn();
      }
    }
  });
  card.appendChild(moreBtn);

  container.appendChild(card);
}

const screenObj = {
  async mount(el) {
    const content = el.querySelector('#my-trips-content') || el;
    content.textContent = '';

    const trips = await listTrips();

    // New Trip button
    const newBtn = document.createElement('button');
    newBtn.className = 'btn btn-accent mt-8';
    newBtn.textContent = '+ ' + (t('newTripRoute') || 'New Trip');
    newBtn.addEventListener('click', () => {
      navigate('trip-builder', { newTrip: true });
    });
    content.appendChild(newBtn);

    // From existing maps — suggested corridors between them
    const fromMapsBtn = document.createElement('button');
    fromMapsBtn.className = 'btn btn-outline mt-8';
    fromMapsBtn.style.marginLeft = '8px';
    fromMapsBtn.textContent = '📍 ' + (t('fromMaps') || 'From My Maps');
    fromMapsBtn.addEventListener('click', () => createTripFromMaps());
    content.appendChild(fromMapsBtn);

    if (!trips || trips.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'text-secondary text-center mt-16';
      empty.textContent = t('noTrips') || 'No trips yet! Create your first trip.';
      content.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'flex-col gap-8 mt-8';

    for (const trip of trips) {
      createTripCard(trip, list, () => screenObj.mount(el));
    }

    content.appendChild(list);
  },
};

export default screenObj;

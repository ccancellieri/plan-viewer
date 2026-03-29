import { t } from '../i18n/index.js';
import { navigate } from '../router.js';
import { listTrips, deleteTrip, updateTrip } from '../lib/trip.js';
import { actionSheet, confirm, prompt } from '../ui/modal.js';

function formatDate(d) { return d || ''; }

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

import { putTrip, getTrip as dbGetTrip, deleteTrip as dbDeleteTrip, listTrips as dbListTrips } from './spatial-db.js';

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function createTrip({ title, dateStart, dateEnd, profile } = {}) {
  const trip = {
    id: uuid(),
    title: title || '',
    dateStart: dateStart || null,
    dateEnd: dateEnd || null,
    profile: profile || null,
    stops: [],
    layers: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await putTrip(trip);
  return trip;
}

export async function getTrip(id) {
  return dbGetTrip(id);
}

export async function updateTrip(id, changes) {
  const trip = await dbGetTrip(id);
  if (!trip) return null;
  Object.assign(trip, changes, { updatedAt: new Date().toISOString() });
  await putTrip(trip);
  return trip;
}

export async function deleteTrip(id) {
  return dbDeleteTrip(id);
}

export async function listTrips() {
  return dbListTrips();
}

export async function addStopToTrip(tripId, stop) {
  const trip = await dbGetTrip(tripId);
  if (!trip) return null;
  stop.order = trip.stops.length;
  trip.stops.push(stop);
  trip.updatedAt = new Date().toISOString();
  await putTrip(trip);
  return trip;
}

export async function removeStop(tripId, stopIndex) {
  const trip = await dbGetTrip(tripId);
  if (!trip) return null;
  trip.stops.splice(stopIndex, 1);
  trip.stops.forEach((s, i) => { s.order = i; });
  trip.updatedAt = new Date().toISOString();
  await putTrip(trip);
  return trip;
}

export async function reorderStops(tripId, fromIdx, toIdx) {
  const trip = await dbGetTrip(tripId);
  if (!trip) return null;
  const [moved] = trip.stops.splice(fromIdx, 1);
  trip.stops.splice(toIdx, 0, moved);
  trip.stops.forEach((s, i) => { s.order = i; });
  trip.updatedAt = new Date().toISOString();
  await putTrip(trip);
  return trip;
}

export async function splitCorridor(tripId, corridorIdx, newMapStop) {
  const trip = await dbGetTrip(tripId);
  if (!trip) return null;
  const corridor = trip.stops[corridorIdx];
  if (!corridor || corridor.type !== 'corridor') return null;

  const path = corridor.path || [];
  const mid = Math.floor(path.length / 2);

  // First half corridor
  const c1 = { ...corridor, path: path.slice(0, mid + 1), id: uuid() };
  // Second half corridor
  const c2 = { ...corridor, path: path.slice(mid), id: uuid(), activities: [] };

  // Replace original corridor with: c1, newMapStop, c2
  trip.stops.splice(corridorIdx, 1, c1, newMapStop, c2);
  trip.stops.forEach((s, i) => { s.order = i; });
  trip.updatedAt = new Date().toISOString();
  await putTrip(trip);
  return trip;
}

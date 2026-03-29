import Flatbush from 'flatbush';

const DB_NAME = 'planner-spatial';
const DB_VERSION = 1;

let idb = null;
let spatialIndex = null;
let activityList = []; // parallel array for Flatbush lookups

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('trips')) {
        const trips = db.createObjectStore('trips', { keyPath: 'id' });
        trips.createIndex('title', 'title', { unique: false });
      }
      if (!db.objectStoreNames.contains('corridors')) {
        const corridors = db.createObjectStore('corridors', { keyPath: 'id' });
        corridors.createIndex('tripId', 'tripId', { unique: false });
      }
      if (!db.objectStoreNames.contains('activities')) {
        const activities = db.createObjectStore('activities', { keyPath: 'id' });
        activities.createIndex('mapId', 'mapId', { unique: false });
        activities.createIndex('tripId', 'tripId', { unique: false });
        activities.createIndex('date', 'date', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode = 'readonly') {
  const transaction = idb.transaction(storeName, mode);
  return transaction.objectStore(storeName);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- Trips ---

export async function putTrip(trip) {
  return reqToPromise(tx('trips', 'readwrite').put(trip));
}

export async function getTrip(id) {
  return reqToPromise(tx('trips').get(id));
}

export async function deleteTrip(id) {
  return reqToPromise(tx('trips', 'readwrite').delete(id));
}

export async function listTrips() {
  return reqToPromise(tx('trips').getAll());
}

// --- Corridors ---

export async function putCorridor(corridor) {
  return reqToPromise(tx('corridors', 'readwrite').put(corridor));
}

export async function getCorridor(id) {
  return reqToPromise(tx('corridors').get(id));
}

export async function listCorridors(tripId) {
  if (tripId) {
    return reqToPromise(tx('corridors').index('tripId').getAll(tripId));
  }
  return reqToPromise(tx('corridors').getAll());
}

export async function deleteCorridorsByTrip(tripId) {
  const store = tx('corridors', 'readwrite');
  const idx = store.index('tripId');
  const keys = await reqToPromise(idx.getAllKeys(tripId));
  for (const key of keys) {
    store.delete(key);
  }
}

// --- Activities ---

export async function putActivities(activities) {
  const store = tx('activities', 'readwrite');
  for (const act of activities) {
    store.put(act);
  }
  return new Promise((resolve, reject) => {
    store.transaction.oncomplete = () => resolve();
    store.transaction.onerror = () => reject(store.transaction.error);
  });
}

export async function getActivitiesByTrip(tripId) {
  return reqToPromise(tx('activities').index('tripId').getAll(tripId));
}

export async function getActivitiesByMap(mapId) {
  return reqToPromise(tx('activities').index('mapId').getAll(mapId));
}

export async function getAllActivities() {
  return reqToPromise(tx('activities').getAll());
}

// --- Spatial Index (Flatbush) ---

export async function buildSpatialIndex() {
  const all = await getAllActivities();
  activityList = all.filter(a => a.lat != null && a.lng != null);
  if (activityList.length === 0) {
    spatialIndex = null;
    return;
  }
  const index = new Flatbush(activityList.length);
  for (const a of activityList) {
    index.add(a.lng, a.lat, a.lng, a.lat); // point as degenerate bbox
  }
  index.finish();
  spatialIndex = index;
}

export function queryBBox(minLat, minLng, maxLat, maxLng) {
  if (!spatialIndex) return [];
  const ids = spatialIndex.search(minLng, minLat, maxLng, maxLat);
  return ids.map(i => activityList[i]);
}

// --- Init ---

export async function initSpatialDB() {
  idb = await openDB();
  await buildSpatialIndex();
}

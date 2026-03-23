// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { db } from './index.js';

const KEY_PREFIX = 'apikey_';
const SEARCH_KEY_PREFIX = 'searchkey_';

export function getApiKey(providerId) {
  return db.readJSON(KEY_PREFIX + providerId, null);
}

export function setApiKey(providerId, key) {
  db.writeJSON(KEY_PREFIX + providerId, key);
}

export function removeApiKey(providerId) {
  db.remove(KEY_PREFIX + providerId);
}

export function getSearchApiKey(apiId) {
  return db.readJSON(SEARCH_KEY_PREFIX + apiId, null);
}

export function setSearchApiKey(apiId, key) {
  db.writeJSON(SEARCH_KEY_PREFIX + apiId, key);
}

export function removeSearchApiKey(apiId) {
  db.remove(SEARCH_KEY_PREFIX + apiId);
}

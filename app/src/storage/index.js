// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

let backend;

export function initStorage(b) {
  backend = b;
}

export const db = {
  readJSON(key, fallback) {
    return backend.readJSON(key, fallback);
  },
  writeJSON(key, data) {
    return backend.writeJSON(key, data);
  },
  remove(key) {
    return backend.remove(key);
  },
  list(prefix) {
    return backend.list(prefix);
  },
};

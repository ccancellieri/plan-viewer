// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

const PREFIX = 'planner_';

export default {
  readJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  writeJSON(key, data) {
    localStorage.setItem(PREFIX + key, JSON.stringify(data));
  },

  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },

  list(prefix = '') {
    const results = [];
    const fullPrefix = PREFIX + prefix;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k.startsWith(fullPrefix)) {
        results.push(k.slice(PREFIX.length));
      }
    }
    return results;
  },
};

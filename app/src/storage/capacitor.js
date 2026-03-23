// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

const BASE_DIR = 'planner';

async function ensureDir() {
  try {
    await Filesystem.mkdir({
      path: BASE_DIR,
      directory: Directory.Documents,
      recursive: true,
    });
  } catch {
    // already exists
  }
}

function filePath(key) {
  return BASE_DIR + '/' + key + '.json';
}

export default {
  async readJSON(key, fallback = null) {
    try {
      const result = await Filesystem.readFile({
        path: filePath(key),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      return JSON.parse(result.data);
    } catch {
      return fallback;
    }
  },

  async writeJSON(key, data) {
    await ensureDir();
    await Filesystem.writeFile({
      path: filePath(key),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
      data: JSON.stringify(data, null, 2),
    });
  },

  async remove(key) {
    try {
      await Filesystem.deleteFile({
        path: filePath(key),
        directory: Directory.Documents,
      });
    } catch {
      // file didn't exist
    }
  },

  async list(prefix = '') {
    try {
      await ensureDir();
      const result = await Filesystem.readdir({
        path: BASE_DIR,
        directory: Directory.Documents,
      });
      return result.files
        .map(f => f.name.replace(/\.json$/, ''))
        .filter(name => name.startsWith(prefix));
    } catch {
      return [];
    }
  },
};

// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { Capacitor } from '@capacitor/core';

/**
 * Whether we're running inside a native Capacitor shell (iOS/Android).
 */
export function isNative() {
  return Capacitor.isNativePlatform();
}

/**
 * Get the user's current GPS position.
 * Uses @capacitor/geolocation on native (proper permissions dialog),
 * falls back to navigator.geolocation on web.
 * @returns Promise<{lat: number, lng: number}>
 */
export async function getCurrentPosition() {
  if (isNative()) {
    const { Geolocation } = await import('@capacitor/geolocation');
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }
  // Web fallback
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not available'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err)
    );
  });
}

/**
 * Share text/URL natively or via Web Share API.
 * @param {object} opts - { title, text, url }
 */
export async function nativeShare(opts) {
  if (isNative()) {
    const { Share } = await import('@capacitor/share');
    await Share.share({
      title: opts.title || '',
      text: opts.text || '',
      url: opts.url || '',
      dialogTitle: opts.title || 'Share',
    });
    return true;
  }
  // Web fallback
  if (navigator.share) {
    await navigator.share(opts);
    return true;
  }
  // Clipboard fallback
  const text = opts.text || opts.url || '';
  await navigator.clipboard.writeText(text);
  return false; // indicates clipboard was used, not share dialog
}

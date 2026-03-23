// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

// loader.js — Full-screen loading overlay with spinner
// Uses only safe DOM methods (no innerHTML)

export function showLoader(message) {
  const overlay = document.createElement('div');
  overlay.className = 'loader-overlay';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  overlay.appendChild(spinner);

  const text = document.createElement('div');
  text.className = 'loader-text';
  text.textContent = message || '';
  overlay.appendChild(text);

  document.body.appendChild(overlay);

  // Return a dismiss function
  return function dismiss() {
    if (overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  };
}

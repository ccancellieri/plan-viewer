// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

// toast.js — Temporary toast notification
// Uses only safe DOM methods (no innerHTML)

export function showToast(message, duration = 2000) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;

  document.body.appendChild(toast);

  // Trigger the visible class on the next frame so CSS transitions work
  requestAnimationFrame(() => {
    toast.classList.add('visible');
  });

  setTimeout(() => {
    toast.classList.remove('visible');
    // Wait for any CSS transition to finish before removing from DOM
    const onEnd = () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    };
    toast.addEventListener('transitionend', onEnd, { once: true });
    // Fallback removal if no transition is defined
    setTimeout(onEnd, 400);
  }, duration);
}

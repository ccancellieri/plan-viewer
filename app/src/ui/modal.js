// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

// modal.js — Overlay modal dialogs returning Promises
// Uses only safe DOM methods (no innerHTML)

import { t } from '../i18n/index.js';

function createOverlay() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  return overlay;
}

function createBox() {
  const box = document.createElement('div');
  box.className = 'modal-box';
  return box;
}

function createTitle(text) {
  const h2 = document.createElement('h2');
  h2.textContent = text;
  return h2;
}

function createMessage(text) {
  const p = document.createElement('p');
  p.textContent = text;
  return p;
}

function createActions() {
  const div = document.createElement('div');
  div.className = 'modal-actions';
  return div;
}

function createButton(label, className, onClick) {
  const btn = document.createElement('button');
  btn.className = className;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function removeOverlay(overlay) {
  if (overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}

export function alert(title, message) {
  return new Promise((resolve) => {
    const overlay = createOverlay();
    const box = createBox();
    const actions = createActions();

    box.appendChild(createTitle(title));
    box.appendChild(createMessage(message));

    actions.appendChild(createButton(t('ok') || 'OK', 'btn btn-primary', () => {
      removeOverlay(overlay);
      resolve();
    }));

    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

export function confirm(title, message) {
  return new Promise((resolve) => {
    const overlay = createOverlay();
    const box = createBox();
    const actions = createActions();

    box.appendChild(createTitle(title));
    box.appendChild(createMessage(message));

    actions.appendChild(createButton(t('cancel') || 'Cancel', 'btn btn-secondary', () => {
      removeOverlay(overlay);
      resolve(false);
    }));

    actions.appendChild(createButton(t('ok') || 'OK', 'btn btn-primary', () => {
      removeOverlay(overlay);
      resolve(true);
    }));

    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

export function prompt(title, placeholder, defaultVal, opts) {
  return new Promise((resolve) => {
    const overlay = createOverlay();
    const box = createBox();
    const actions = createActions();

    box.appendChild(createTitle(title));

    if (opts && opts.linkUrl) {
      const link = document.createElement('a');
      link.href = opts.linkUrl;
      link.target = '_blank';
      link.rel = 'noopener';
      link.style.cssText = 'display:block;margin-bottom:12px;color:var(--accent,#667eea);font-size:14px';
      link.textContent = (opts.linkText || opts.linkUrl) + ' →';
      box.appendChild(link);
    }

    const input = document.createElement('input');
    input.type = 'text';
    if (placeholder) input.placeholder = placeholder;
    if (defaultVal != null) input.value = defaultVal;
    box.appendChild(input);

    actions.appendChild(createButton(t('cancel') || 'Cancel', 'btn btn-secondary', () => {
      removeOverlay(overlay);
      resolve(null);
    }));

    actions.appendChild(createButton(t('ok') || 'OK', 'btn btn-primary', () => {
      const value = input.value;
      removeOverlay(overlay);
      resolve(value);
    }));

    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    // Focus the input after it's in the DOM
    requestAnimationFrame(() => input.focus());
  });
}

export function errorReport(title, reportText) {
  return new Promise((resolve) => {
    const overlay = createOverlay();
    const box = createBox();

    box.appendChild(createTitle(title));

    const pre = document.createElement('pre');
    pre.style.cssText = 'white-space:pre-wrap;word-break:break-word;font-size:12px;background:var(--bg-secondary,#f3f4f6);padding:12px;border-radius:8px;max-height:40vh;overflow:auto;margin-bottom:16px;user-select:text';
    pre.textContent = reportText;
    box.appendChild(pre);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn btn-secondary';
    copyBtn.textContent = t('copyReport') || 'Copy';
    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(reportText);
        copyBtn.textContent = t('copied') || 'Copied!';
        setTimeout(() => { copyBtn.textContent = t('copyReport') || 'Copy'; }, 1500);
      } catch (_) { /* clipboard not available */ }
    });
    btnRow.appendChild(copyBtn);

    const waBtn = document.createElement('button');
    waBtn.className = 'btn btn-secondary';
    waBtn.style.cssText = 'background:#25D366;color:#fff;border-color:#25D366';
    waBtn.textContent = 'WhatsApp';
    waBtn.addEventListener('click', () => {
      window.open('https://wa.me/?text=' + encodeURIComponent(reportText), '_blank');
    });
    btnRow.appendChild(waBtn);

    if (navigator.share) {
      const shareBtn = document.createElement('button');
      shareBtn.className = 'btn btn-secondary';
      shareBtn.textContent = t('shareReport') || 'Share';
      shareBtn.addEventListener('click', () => {
        navigator.share({ title, text: reportText }).catch(() => {});
      });
      btnRow.appendChild(shareBtn);
    }

    box.appendChild(btnRow);

    const actions = createActions();
    actions.appendChild(createButton(t('ok') || 'OK', 'btn btn-primary', () => {
      removeOverlay(overlay);
      resolve();
    }));
    box.appendChild(actions);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

export function actionSheet(title, options) {
  return new Promise((resolve) => {
    const overlay = createOverlay();
    const box = createBox();

    box.appendChild(createTitle(title));

    const list = document.createElement('div');
    list.className = 'modal-list';

    options.forEach((optionLabel, index) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary btn-block';
      btn.textContent = optionLabel;
      btn.addEventListener('click', () => {
        removeOverlay(overlay);
        resolve(index);
      });
      list.appendChild(btn);
    });

    box.appendChild(list);

    const cancelActions = createActions();
    cancelActions.appendChild(createButton(t('cancel') || 'Cancel', 'btn btn-secondary', () => {
      removeOverlay(overlay);
      resolve(-1);
    }));
    box.appendChild(cancelActions);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

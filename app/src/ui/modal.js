// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

// modal.js — Overlay modal dialogs returning Promises
// Uses only safe DOM methods (no innerHTML)

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

    actions.appendChild(createButton('OK', 'btn btn-primary', () => {
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

    actions.appendChild(createButton('Cancel', 'btn btn-secondary', () => {
      removeOverlay(overlay);
      resolve(false);
    }));

    actions.appendChild(createButton('OK', 'btn btn-primary', () => {
      removeOverlay(overlay);
      resolve(true);
    }));

    box.appendChild(actions);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

export function prompt(title, placeholder, defaultVal) {
  return new Promise((resolve) => {
    const overlay = createOverlay();
    const box = createBox();
    const actions = createActions();

    box.appendChild(createTitle(title));

    const input = document.createElement('input');
    input.type = 'text';
    if (placeholder) input.placeholder = placeholder;
    if (defaultVal != null) input.value = defaultVal;
    box.appendChild(input);

    actions.appendChild(createButton('Cancel', 'btn btn-secondary', () => {
      removeOverlay(overlay);
      resolve(null);
    }));

    actions.appendChild(createButton('OK', 'btn btn-primary', () => {
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

export function actionSheet(title, options) {
  return new Promise((resolve) => {
    const overlay = createOverlay();
    const box = createBox();

    box.appendChild(createTitle(title));

    const list = document.createElement('div');
    list.className = 'modal-actions';

    options.forEach((optionLabel, index) => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary';
      btn.textContent = optionLabel;
      btn.addEventListener('click', () => {
        removeOverlay(overlay);
        resolve(index);
      });
      list.appendChild(btn);
    });

    box.appendChild(list);

    const cancelActions = createActions();
    cancelActions.appendChild(createButton('Cancel', 'btn btn-secondary', () => {
      removeOverlay(overlay);
      resolve(-1);
    }));
    box.appendChild(cancelActions);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

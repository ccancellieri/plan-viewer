// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

// chip-select.js — Clickable chip group for multi-selection
// Uses only safe DOM methods (no innerHTML)

export function createChipSelect(options, selected, onChange) {
  const container = document.createElement('div');
  container.className = 'chip-group';

  const selectedSet = new Set(selected);

  function renderChips() {
    // Remove existing children
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    options.forEach((option) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      if (selectedSet.has(option.value)) {
        chip.classList.add('selected');
      }
      chip.textContent = option.label;

      chip.addEventListener('click', () => {
        if (selectedSet.has(option.value)) {
          selectedSet.delete(option.value);
        } else {
          selectedSet.add(option.value);
        }
        renderChips();
        onChange(Array.from(selectedSet));
      });

      container.appendChild(chip);
    });
  }

  renderChips();
  return container;
}

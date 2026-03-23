// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

// step-wizard.js — Multi-step form wizard with progress indicator
// Uses only safe DOM methods (no innerHTML)

export function createStepWizard(steps, onComplete) {
  const wrapper = document.createElement('div');
  wrapper.className = 'step-wizard';

  const data = {};
  let currentStep = 0;

  // Progress indicator
  const progress = document.createElement('div');
  progress.className = 'step-progress';
  wrapper.appendChild(progress);

  // Step content area
  const content = document.createElement('div');
  content.className = 'step-content';
  wrapper.appendChild(content);

  function updateProgress() {
    while (progress.firstChild) {
      progress.removeChild(progress.firstChild);
    }

    steps.forEach((step, i) => {
      const dot = document.createElement('span');
      dot.className = 'step-dot';
      if (i === currentStep) dot.classList.add('active');
      if (i < currentStep) dot.classList.add('done');
      dot.textContent = i + 1;
      progress.appendChild(dot);

      // Add connector line between dots (except after the last)
      if (i < steps.length - 1) {
        const line = document.createElement('span');
        line.className = 'step-line';
        if (i < currentStep) line.classList.add('done');
        progress.appendChild(line);
      }
    });
  }

  function renderStep() {
    while (content.firstChild) {
      content.removeChild(content.firstChild);
    }
    updateProgress();

    const step = steps[currentStep];

    const title = document.createElement('h3');
    title.textContent = step.title;
    content.appendChild(title);

    const body = document.createElement('div');
    body.className = 'step-body';
    content.appendChild(body);

    function next() {
      if (currentStep < steps.length - 1) {
        currentStep++;
        renderStep();
      } else {
        onComplete(data);
      }
    }

    function back() {
      if (currentStep > 0) {
        currentStep--;
        renderStep();
      }
    }

    step.render(body, data, next, back);
  }

  renderStep();
  return wrapper;
}

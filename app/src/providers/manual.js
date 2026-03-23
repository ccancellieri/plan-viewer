// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

export default {
  id: 'manual',
  label: 'Manual (paste JSON)',
  model: null,
  free: true,
  webSearch: false,
  signupUrl: null,
  async call() {
    throw new Error('Manual mode is handled by the UI layer.');
  },
};

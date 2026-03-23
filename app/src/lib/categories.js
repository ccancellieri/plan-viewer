// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

export const CATEGORIES = {
  music:    { color: '#e74c3c', icon: '🎵', label: 'Music' },
  games:    { color: '#9b59b6', icon: '🎲', label: 'Games' },
  outdoor:  { color: '#27ae60', icon: '🌳', label: 'Outdoor' },
  culture:  { color: '#3498db', icon: '🎨', label: 'Culture' },
  food:     { color: '#f39c12', icon: '🍕', label: 'Food' },
  sport:    { color: '#1abc9c', icon: '⚽', label: 'Sport' },
  market:   { color: '#e67e22', icon: '🛍️', label: 'Market' },
  festival: { color: '#e91e63', icon: '🎉', label: 'Festival' },
  other:    { color: '#95a5a6', icon: '📍', label: 'Other' },
};

export function getCategoryColor(cat) {
  return (CATEGORIES[cat] || CATEGORIES.other).color;
}

export function getCategoryIcon(cat) {
  return (CATEGORIES[cat] || CATEGORIES.other).icon;
}

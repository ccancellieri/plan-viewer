#!/usr/bin/env python3
"""
Leisure Planner Map Generator

Generates a standalone interactive HTML map with activities marked,
filterable by category/time/cost, with Google Maps navigation links.

Usage:
    python3 generate_map.py \
        --data activities.json \
        --output map.html \
        --center-lat 41.8808 \
        --center-lng 12.5088 \
        --center-name "Piazza dei Re di Roma" \
        --title "Weekend a Roma - 21-22 Marzo 2026" \
        --max-distance 4
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime


def haversine(lat1, lon1, lat2, lon2):
    """Calculate distance in km between two coordinates."""
    R = 6371
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlam/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))


# Category configuration: color, icon, label
CATEGORIES = {
    "music": {"color": "#e74c3c", "icon": "🎵", "label": "Musica / Music"},
    "games": {"color": "#9b59b6", "icon": "🎲", "label": "Giochi / Games"},
    "outdoor": {"color": "#27ae60", "icon": "🌳", "label": "Outdoor"},
    "culture": {"color": "#3498db", "icon": "🎨", "label": "Cultura / Culture"},
    "food": {"color": "#f39c12", "icon": "🍕", "label": "Cibo / Food"},
    "sport": {"color": "#1abc9c", "icon": "⚽", "label": "Sport"},
    "market": {"color": "#e67e22", "icon": "🛍️", "label": "Mercato / Market"},
    "festival": {"color": "#e91e63", "icon": "🎉", "label": "Festival"},
    "other": {"color": "#95a5a6", "icon": "📍", "label": "Altro / Other"},
}


def generate_html(activities, center_lat, center_lng, center_name, title, max_distance):
    """Generate the full HTML map page."""

    # Calculate distances and filter
    for act in activities:
        act["distance_km"] = round(haversine(
            center_lat, center_lng,
            act.get("lat", center_lat),
            act.get("lng", center_lng)
        ), 1)

    # Sort by date then time
    activities.sort(key=lambda a: (a.get("date", ""), a.get("time_start", "")))

    # Collect unique categories present
    cats_present = sorted(set(a.get("category", "other") for a in activities))

    # Build activities JSON for JS
    activities_json = json.dumps(activities, ensure_ascii=False, indent=2)

    # Build category config JSON
    cats_json = json.dumps(CATEGORIES, ensure_ascii=False)

    html = f"""<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#667eea">
<link rel="manifest" href="../manifest.json">
<title>{title}</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; }}

/* Header */
.header {{
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white; padding: 16px 20px; position: sticky; top: 0; z-index: 1000;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
}}
.header h1 {{ font-size: 18px; font-weight: 600; }}
.header .subtitle {{ font-size: 13px; opacity: 0.85; margin-top: 2px; }}

/* Tab bar */
.tabs {{
  display: flex; background: white; border-bottom: 2px solid #eee;
  position: sticky; top: 60px; z-index: 999;
}}
.tab {{
  flex: 1; text-align: center; padding: 12px; cursor: pointer;
  font-size: 14px; font-weight: 500; color: #666; transition: all 0.2s;
  border-bottom: 3px solid transparent;
}}
.tab.active {{ color: #667eea; border-bottom-color: #667eea; }}

/* Map */
#map {{ height: 55vh; min-height: 300px; }}

/* Filters */
.filters {{
  padding: 10px 16px; background: white; border-bottom: 1px solid #eee;
  display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch;
}}
.filter-chip {{
  display: inline-flex; align-items: center; gap: 4px;
  padding: 6px 12px; border-radius: 20px; font-size: 12px;
  border: 1.5px solid #ddd; background: white; cursor: pointer;
  white-space: nowrap; transition: all 0.2s;
}}
.filter-chip.active {{ border-color: #667eea; background: #667eea; color: white; }}
.filter-chip .dot {{
  width: 8px; height: 8px; border-radius: 50%; display: inline-block;
}}

/* Cards */
.cards {{ padding: 12px; display: none; }}
.card {{
  background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1); position: relative;
}}
.card-cat {{
  position: absolute; top: 12px; right: 12px;
  padding: 3px 8px; border-radius: 12px; font-size: 11px; color: white;
}}
.card h3 {{ font-size: 16px; margin-bottom: 6px; padding-right: 80px; }}
.card .meta {{ font-size: 13px; color: #666; line-height: 1.6; }}
.card .meta span {{ display: inline-block; margin-right: 12px; }}
.card .description {{ font-size: 13px; color: #444; margin: 8px 0; }}
.card .actions {{ display: flex; gap: 8px; margin-top: 10px; }}
.btn {{
  display: inline-flex; align-items: center; gap: 4px;
  padding: 8px 14px; border-radius: 8px; font-size: 13px;
  text-decoration: none; font-weight: 500; border: none; cursor: pointer;
}}
.btn-navigate {{ background: #4285f4; color: white; }}
.btn-info {{ background: #f0f0f0; color: #333; }}
.btn-visited {{ background: #27ae60; color: white; }}

/* Timeline */
.timeline {{ padding: 12px 16px; display: none; }}
.timeline-day {{ margin-bottom: 20px; }}
.timeline-day h2 {{ font-size: 15px; color: #667eea; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #667eea; }}
.timeline-slot {{ display: flex; gap: 12px; margin-bottom: 8px; }}
.timeline-time {{ width: 50px; text-align: right; font-size: 13px; font-weight: 600; color: #444; padding-top: 2px; flex-shrink: 0; }}
.timeline-content {{
  flex: 1; background: white; border-radius: 8px; padding: 10px 14px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 3px solid #667eea;
}}
.timeline-content h4 {{ font-size: 14px; margin-bottom: 2px; }}
.timeline-content .tl-meta {{ font-size: 12px; color: #888; }}

/* Starting point info */
.start-info {{
  background: #fff3cd; padding: 10px 16px; font-size: 13px;
  border-bottom: 1px solid #ffc107; display: flex; align-items: center; gap: 8px;
}}
.start-info .pin {{ font-size: 18px; }}

/* Visited badge */
.visited-badge {{
  position: absolute; top: 12px; right: 12px;
  background: #27ae60; color: white; padding: 2px 8px;
  border-radius: 12px; font-size: 11px;
}}

/* Share button */
.share-bar {{
  padding: 10px 16px; background: white; border-bottom: 1px solid #eee;
  display: flex; gap: 8px; justify-content: flex-end;
}}
.btn-share {{
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; border-radius: 20px; font-size: 13px;
  font-weight: 500; border: none; cursor: pointer;
  text-decoration: none; color: white;
}}
.btn-whatsapp {{ background: #25D366; }}
.btn-share-native {{ background: #667eea; }}

/* Mobile responsive */
@media (max-width: 600px) {{
  .header h1 {{ font-size: 16px; }}
  #map {{ height: 45vh; }}
}}
</style>
</head>
<body>

<div class="header">
  <h1>{title}</h1>
  <div class="subtitle">📍 Da: {center_name} &bull; 🚲 Max: {max_distance}km</div>
</div>

<div class="tabs">
  <div class="tab active" onclick="showView('map-view')">🗺️ Mappa</div>
  <div class="tab" onclick="showView('cards')">📋 Lista</div>
  <div class="tab" onclick="showView('timeline')">🕐 Timeline</div>
</div>

<div class="share-bar">
  <button class="btn-share btn-whatsapp" onclick="shareWhatsApp()">💬 WhatsApp</button>
  <button class="btn-share btn-share-native" onclick="shareNative()">📤 Condividi</button>
</div>

<div class="start-info">
  <span class="pin">📌</span>
  Punto di partenza: <strong>{center_name}</strong>
</div>

<div id="map-view">
  <div class="filters" id="filters"></div>
  <div id="map"></div>
</div>

<div class="cards" id="cards"></div>
<div class="timeline" id="timeline"></div>

<script>
const ACTIVITIES = {activities_json};
const CATEGORIES = {cats_json};
const CENTER = {{ lat: {center_lat}, lng: {center_lng}, name: "{center_name}" }};
const MAX_DIST = {max_distance};

let map, markers = [], activeFilters = new Set();

// Initialize map
function initMap() {{
  map = L.map('map').setView([CENTER.lat, CENTER.lng], 14);
  L.tileLayer('https://{{s}}.tile.openstreetmap.org/{{z}}/{{x}}/{{y}}.png', {{
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }}).addTo(map);

  // Starting point marker
  const startIcon = L.divIcon({{
    html: '<div style="font-size:28px;text-shadow:0 2px 4px rgba(0,0,0,0.3)">📌</div>',
    iconSize: [28, 28], iconAnchor: [14, 28], className: ''
  }});
  L.marker([CENTER.lat, CENTER.lng], {{ icon: startIcon }})
    .addTo(map)
    .bindPopup('<strong>' + CENTER.name + '</strong><br><em>Punto di partenza</em>');

  // Draw max distance circle
  L.circle([CENTER.lat, CENTER.lng], {{
    radius: MAX_DIST * 1000, color: '#667eea', fillColor: '#667eea',
    fillOpacity: 0.05, weight: 1.5, dashArray: '5,5'
  }}).addTo(map);

  addActivityMarkers();
  buildFilters();
}}

function addActivityMarkers() {{
  markers.forEach(m => map.removeLayer(m.marker));
  markers = [];

  ACTIVITIES.forEach((act, i) => {{
    if (activeFilters.size > 0 && !activeFilters.has(act.category)) return;

    const cat = CATEGORIES[act.category] || CATEGORIES.other;
    const icon = L.divIcon({{
      html: '<div style="font-size:22px;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))">' + cat.icon + '</div>',
      iconSize: [22, 22], iconAnchor: [11, 22], className: ''
    }});

    const gmapsUrl = 'https://www.google.com/maps/dir/?api=1'
      + '&origin=' + CENTER.lat + ',' + CENTER.lng
      + '&destination=' + act.lat + ',' + act.lng
      + '&travelmode=bicycling';

    const popup = `
      <div style="min-width:200px;max-width:280px">
        <div style="background:${{cat.color}};color:white;padding:4px 8px;border-radius:6px 6px 0 0;margin:-8px -18px 8px -18px;font-size:11px">
          ${{cat.icon}} ${{cat.label}}
        </div>
        <strong style="font-size:14px">${{act.name}}</strong>
        <div style="font-size:12px;color:#666;margin:6px 0;line-height:1.5">
          📅 ${{act.date || 'N/D'}}<br>
          🕐 ${{act.time_start || '?'}}${{act.time_end ? ' - ' + act.time_end : ''}}<br>
          💰 ${{act.cost || 'N/D'}}<br>
          📏 ${{act.distance_km}} km da ${{CENTER.name}}<br>
          ${{act.contact ? '📞 ' + act.contact + '<br>' : ''}}
          ${{act.address ? '📍 ' + act.address + '<br>' : ''}}
        </div>
        ${{act.description ? '<div style="font-size:12px;color:#444;margin:6px 0">' + act.description + '</div>' : ''}}
        <div style="margin-top:8px;display:flex;gap:6px">
          <a href="${{gmapsUrl}}" target="_blank"
            style="background:#4285f4;color:white;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none;display:inline-flex;align-items:center;gap:4px">
            🧭 Naviga con Google Maps
          </a>
          ${{act.source_url ? '<a href="' + act.source_url + '" target="_blank" style="background:#f0f0f0;color:#333;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none">ℹ️ Info</a>' : ''}}
        </div>
      </div>`;

    const marker = L.marker([act.lat, act.lng], {{ icon }}).addTo(map).bindPopup(popup);
    markers.push({{ marker, activity: act }});
  }});

  // Fit bounds
  if (markers.length > 0) {{
    const bounds = L.latLngBounds(
      markers.map(m => m.marker.getLatLng())
    );
    bounds.extend([CENTER.lat, CENTER.lng]);
    map.fitBounds(bounds, {{ padding: [30, 30] }});
  }}
}}

function buildFilters() {{
  const container = document.getElementById('filters');
  const cats = [...new Set(ACTIVITIES.map(a => a.category))];

  // "All" chip
  const allChip = document.createElement('div');
  allChip.className = 'filter-chip active';
  allChip.textContent = 'Tutti';
  allChip.onclick = () => {{
    activeFilters.clear();
    document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    allChip.classList.add('active');
    addActivityMarkers();
    renderCards();
  }};
  container.appendChild(allChip);

  cats.forEach(cat => {{
    const cfg = CATEGORIES[cat] || CATEGORIES.other;
    const chip = document.createElement('div');
    chip.className = 'filter-chip';
    chip.innerHTML = '<span class="dot" style="background:' + cfg.color + '"></span>' + cfg.icon + ' ' + cfg.label;
    chip.onclick = () => {{
      if (activeFilters.has(cat)) {{
        activeFilters.delete(cat);
        chip.classList.remove('active');
      }} else {{
        activeFilters.add(cat);
        chip.classList.add('active');
      }}
      document.querySelector('.filter-chip:first-child').classList.toggle('active', activeFilters.size === 0);
      addActivityMarkers();
      renderCards();
    }};
    container.appendChild(chip);
  }});
}}

// Cards view
function renderCards() {{
  const container = document.getElementById('cards');
  container.innerHTML = '';

  const filtered = activeFilters.size > 0
    ? ACTIVITIES.filter(a => activeFilters.has(a.category))
    : ACTIVITIES;

  filtered.forEach(act => {{
    const cat = CATEGORIES[act.category] || CATEGORIES.other;
    const gmapsUrl = 'https://www.google.com/maps/dir/?api=1'
      + '&origin=' + CENTER.lat + ',' + CENTER.lng
      + '&destination=' + act.lat + ',' + act.lng
      + '&travelmode=bicycling';

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-cat" style="background:${{cat.color}}">${{cat.icon}} ${{cat.label}}</div>
      <h3>${{act.name}}</h3>
      <div class="meta">
        <span>📅 ${{act.date || 'N/D'}}</span>
        <span>🕐 ${{act.time_start || '?'}}${{act.time_end ? '-' + act.time_end : ''}}</span><br>
        <span>💰 ${{act.cost || 'N/D'}}</span>
        <span>📏 ${{act.distance_km}}km</span>
        ${{act.contact ? '<br><span>📞 ' + act.contact + '</span>' : ''}}
        ${{act.address ? '<br><span>📍 ' + act.address + '</span>' : ''}}
      </div>
      ${{act.description ? '<div class="description">' + act.description + '</div>' : ''}}
      <div class="actions">
        <a href="${{gmapsUrl}}" target="_blank" class="btn btn-navigate">🧭 Naviga</a>
        ${{act.source_url ? '<a href="' + act.source_url + '" target="_blank" class="btn btn-info">ℹ️ Dettagli</a>' : ''}}
      </div>`;
    container.appendChild(card);
  }});
}}

// Timeline view
function renderTimeline() {{
  const container = document.getElementById('timeline');
  container.innerHTML = '';

  const byDate = {{}};
  ACTIVITIES.forEach(act => {{
    const date = act.date || 'Data non specificata';
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(act);
  }});

  Object.keys(byDate).sort().forEach(date => {{
    const dayDiv = document.createElement('div');
    dayDiv.className = 'timeline-day';

    const dateObj = new Date(date + 'T00:00:00');
    const dayName = date !== 'Data non specificata'
      ? dateObj.toLocaleDateString('it-IT', {{ weekday: 'long', day: 'numeric', month: 'long' }})
      : date;

    dayDiv.innerHTML = '<h2>' + dayName + '</h2>';

    byDate[date].sort((a, b) => (a.time_start || '').localeCompare(b.time_start || ''));

    byDate[date].forEach(act => {{
      const cat = CATEGORIES[act.category] || CATEGORIES.other;
      const slot = document.createElement('div');
      slot.className = 'timeline-slot';
      slot.innerHTML = `
        <div class="timeline-time">${{act.time_start || '?'}}</div>
        <div class="timeline-content" style="border-left-color:${{cat.color}}">
          <h4>${{cat.icon}} ${{act.name}}</h4>
          <div class="tl-meta">
            💰 ${{act.cost || 'N/D'}} &bull;
            📏 ${{act.distance_km}}km &bull;
            📍 ${{act.address || 'N/D'}}
          </div>
        </div>`;
      dayDiv.appendChild(slot);
    }});

    container.appendChild(dayDiv);
  }});
}}

// View switching
function showView(viewId) {{
  document.querySelectorAll('.tab').forEach((t, i) => {{
    t.classList.toggle('active',
      (viewId === 'map-view' && i === 0) ||
      (viewId === 'cards' && i === 1) ||
      (viewId === 'timeline' && i === 2)
    );
  }});

  document.getElementById('map-view').style.display = viewId === 'map-view' ? 'block' : 'none';
  document.getElementById('cards').style.display = viewId === 'cards' ? 'block' : 'none';
  document.getElementById('timeline').style.display = viewId === 'timeline' ? 'block' : 'none';

  if (viewId === 'map-view') setTimeout(() => map.invalidateSize(), 100);
  if (viewId === 'cards') renderCards();
  if (viewId === 'timeline') renderTimeline();
}}

// Share: build text message with all activities
function buildShareText() {{
  const title = document.querySelector('.header h1').textContent;
  let text = '🗺️ ' + title + '\\n';
  text += '📌 Da: ' + CENTER.name + '\\n\\n';

  // Group by date
  const byDate = {{}};
  ACTIVITIES.forEach(act => {{
    const d = act.date || 'TBD';
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(act);
  }});

  Object.keys(byDate).sort().forEach(date => {{
    const dateObj = new Date(date + 'T00:00:00');
    const dayLabel = date !== 'TBD'
      ? dateObj.toLocaleDateString('it-IT', {{ weekday: 'long', day: 'numeric', month: 'long' }})
      : 'Data da definire';
    text += '📅 ' + dayLabel + '\\n';

    byDate[date].sort((a, b) => (a.time_start || '').localeCompare(b.time_start || ''));
    byDate[date].forEach(act => {{
      const cat = CATEGORIES[act.category] || CATEGORIES.other;
      text += cat.icon + ' ' + act.name;
      if (act.time_start) text += ' (' + act.time_start + (act.time_end ? '-' + act.time_end : '') + ')';
      text += '\\n';
      if (act.cost) text += '   💰 ' + act.cost + '\\n';
      if (act.address) text += '   📍 ' + act.address + '\\n';
      if (act.distance_km != null) text += '   📏 ' + act.distance_km + 'km\\n';
      // Google Maps link for this activity
      const gmUrl = 'https://maps.google.com/?q=' + act.lat + ',' + act.lng;
      text += '   🧭 ' + gmUrl + '\\n';
      text += '\\n';
    }});
  }});

  // Add link to the full interactive map if we're hosted online
  if (window.location.hostname && window.location.hostname !== '') {{
    text += '🔗 Mappa completa: ' + window.location.href + '\\n';
  }}

  return text;
}}

function shareWhatsApp() {{
  const text = buildShareText();
  const url = 'https://wa.me/?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
}}

function shareNative() {{
  const text = buildShareText();
  if (navigator.share) {{
    navigator.share({{
      title: document.querySelector('.header h1').textContent,
      text: text
    }}).catch(() => {{}});
  }} else {{
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(text).then(() => {{
      const btn = document.querySelector('.btn-share-native');
      const orig = btn.innerHTML;
      btn.innerHTML = '✅ Copiato!';
      setTimeout(() => btn.innerHTML = orig, 2000);
    }}).catch(() => {{
      // Last resort fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      alert('Testo copiato!');
    }});
  }}
}}

// Init
document.addEventListener('DOMContentLoaded', () => {{
  initMap();
  renderCards();
  renderTimeline();
}});
</script>
</body>
</html>"""
    return html


def generate_kml(activities, center_lat, center_lng, center_name, title):
    """Generate a KML file importable into Google My Maps."""
    from xml.sax.saxutils import escape

    # KML color format is aaBBGGRR (alpha, blue, green, red)
    KML_COLORS = {
        "music": "ff0000e7",      # red
        "games": "ffb6599b",      # purple
        "outdoor": "ff60ae27",    # green
        "culture": "ffdb9834",    # blue
        "food": "ff129cf3",       # orange
        "sport": "ff9cbc1a",      # teal
        "market": "ff227ee6",     # dark orange
        "festival": "ff3c1ee9",   # pink
        "other": "ffa6a595",      # gray
    }

    placemarks = []

    # Starting point
    placemarks.append(f"""    <Placemark>
      <name>📌 {escape(center_name)} (Partenza)</name>
      <description>Punto di partenza</description>
      <Style>
        <IconStyle>
          <color>ff0000ff</color>
          <scale>1.2</scale>
          <Icon><href>https://maps.google.com/mapfiles/kml/paddle/red-stars.png</href></Icon>
        </IconStyle>
      </Style>
      <Point><coordinates>{center_lng},{center_lat},0</coordinates></Point>
    </Placemark>""")

    # Activities
    for act in activities:
        cat = act.get("category", "other")
        color = KML_COLORS.get(cat, KML_COLORS["other"])
        cat_cfg = CATEGORIES.get(cat, CATEGORIES["other"])

        desc_parts = []
        if act.get("date"): desc_parts.append(f"📅 {act['date']}")
        if act.get("time_start"): desc_parts.append(f"🕐 {act['time_start']}{'-' + act['time_end'] if act.get('time_end') else ''}")
        if act.get("cost"): desc_parts.append(f"💰 {act['cost']}")
        if act.get("distance_km") is not None: desc_parts.append(f"📏 {act['distance_km']}km da {center_name}")
        if act.get("contact"): desc_parts.append(f"📞 {act['contact']}")
        if act.get("address"): desc_parts.append(f"📍 {act['address']}")
        if act.get("description"): desc_parts.append(f"\n{act['description']}")
        if act.get("source_url"): desc_parts.append(f"\nInfo: {act['source_url']}")

        desc = escape("\n".join(desc_parts))
        name = escape(f"{cat_cfg['icon']} {act['name']}")

        # Choose icon based on category
        icon_map = {
            "music": "https://maps.google.com/mapfiles/kml/paddle/red-circle.png",
            "games": "https://maps.google.com/mapfiles/kml/paddle/purple-circle.png",
            "outdoor": "https://maps.google.com/mapfiles/kml/paddle/grn-circle.png",
            "culture": "https://maps.google.com/mapfiles/kml/paddle/blu-circle.png",
            "food": "https://maps.google.com/mapfiles/kml/paddle/ylw-circle.png",
            "sport": "https://maps.google.com/mapfiles/kml/paddle/ltblu-circle.png",
            "market": "https://maps.google.com/mapfiles/kml/paddle/orange-circle.png",
            "festival": "https://maps.google.com/mapfiles/kml/paddle/pink-circle.png",
            "other": "https://maps.google.com/mapfiles/kml/paddle/wht-circle.png",
        }
        icon = icon_map.get(cat, icon_map["other"])

        placemarks.append(f"""    <Placemark>
      <name>{name}</name>
      <description><![CDATA[{desc}]]></description>
      <Style>
        <IconStyle>
          <scale>1.0</scale>
          <Icon><href>{icon}</href></Icon>
        </IconStyle>
      </Style>
      <Point><coordinates>{act.get('lng', center_lng)},{act.get('lat', center_lat)},0</coordinates></Point>
    </Placemark>""")

    kml = f"""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>{escape(title)}</name>
    <description>Generato da Leisure Planner</description>
{chr(10).join(placemarks)}
  </Document>
</kml>"""
    return kml


def update_registry(registry_path, map_entry):
    """Append a new map entry to maps/registry.json (avoids duplicates by id).

    map_entry should be a dict with: id, title, file, city, location,
    date_start, date_end, date_label, activities, categories, created
    """
    # Load existing registry or start fresh
    if os.path.exists(registry_path):
        with open(registry_path, 'r', encoding='utf-8') as f:
            registry = json.load(f)
    else:
        registry = []

    # Avoid duplicates: if same id exists, replace it
    registry = [m for m in registry if m.get('id') != map_entry['id']]
    registry.append(map_entry)

    # Sort newest first
    registry.sort(key=lambda m: m.get('date_start', ''), reverse=True)

    with open(registry_path, 'w', encoding='utf-8') as f:
        json.dump(registry, f, ensure_ascii=False, indent=2)

    print(f"Registry updated: {map_entry['id']} ({len(registry)} maps total)")


def main():
    parser = argparse.ArgumentParser(description='Generate leisure activity map')
    parser.add_argument('--data', required=True, help='Path to activities JSON file')
    parser.add_argument('--output', required=True, help='Output HTML file path')
    parser.add_argument('--center-lat', type=float, required=True, help='Starting point latitude')
    parser.add_argument('--center-lng', type=float, required=True, help='Starting point longitude')
    parser.add_argument('--center-name', default='Punto di partenza', help='Starting point name')
    parser.add_argument('--title', default='Leisure Planner', help='Map title')
    parser.add_argument('--max-distance', type=float, default=5, help='Max distance in km')
    parser.add_argument('--kml', help='Also generate a KML file for Google My Maps import')
    parser.add_argument('--registry', help='Path to maps/registry.json to auto-register the new map')
    parser.add_argument('--map-id', default='', help='Unique map ID (e.g. "roma-weekend-mar-2026")')
    parser.add_argument('--city', default='', help='City name for filtering (e.g. "Roma")')
    parser.add_argument('--location-label', default='', help='Location label (e.g. "Roma, San Giovanni")')
    parser.add_argument('--date-start', default='', help='Start date YYYY-MM-DD')
    parser.add_argument('--date-end', default='', help='End date YYYY-MM-DD')
    parser.add_argument('--date-label', default='', help='Date label for display (e.g. "21-22 Marzo 2026")')
    args = parser.parse_args()

    # Load activities
    with open(args.data, 'r', encoding='utf-8') as f:
        activities = json.load(f)

    # Calculate distances
    for act in activities:
        act['distance_km'] = round(haversine(
            args.center_lat, args.center_lng,
            act.get('lat', args.center_lat),
            act.get('lng', args.center_lng)
        ), 1)

    # Generate HTML
    html = generate_html(
        activities,
        args.center_lat, args.center_lng,
        args.center_name, args.title,
        args.max_distance
    )

    # Write HTML output
    os.makedirs(os.path.dirname(os.path.abspath(args.output)), exist_ok=True)
    with open(args.output, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"HTML map generated: {args.output}")

    # Generate KML if requested
    if args.kml:
        kml = generate_kml(
            activities,
            args.center_lat, args.center_lng,
            args.center_name, args.title
        )
        os.makedirs(os.path.dirname(os.path.abspath(args.kml)), exist_ok=True)
        with open(args.kml, 'w', encoding='utf-8') as f:
            f.write(kml)
        print(f"KML file generated: {args.kml}")

    # Update registry if requested
    if args.registry:
        from datetime import date as date_type
        filename = os.path.basename(args.output)
        map_id = args.map_id or os.path.splitext(filename)[0]

        cats = sorted(set(a.get("category", "other") for a in activities))
        cat_labels = [CATEGORIES.get(c, CATEGORIES["other"])["label"].split(" / ")[0] for c in cats]

        map_entry = {
            "id": map_id,
            "title": args.title,
            "file": filename,
            "city": args.city or args.center_name.split(",")[0].strip(),
            "location": args.location_label or args.center_name,
            "date_start": args.date_start or "",
            "date_end": args.date_end or args.date_start or "",
            "date_label": args.date_label or "",
            "activities": len(activities),
            "categories": cat_labels,
            "created": str(date_type.today())
        }
        update_registry(args.registry, map_entry)

    print(f"Activities: {len(activities)}")
    print(f"Center: {args.center_name} ({args.center_lat}, {args.center_lng})")


if __name__ == '__main__':
    main()

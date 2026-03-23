// Copyright 2026 Carlo Cancellieri
// All rights reserved. Proprietary license.

import { CATEGORIES } from '../lib/categories.js';

export function generateStandaloneHTML(activities, centerLat, centerLng, centerName, title, maxDistance, categories) {
  const cats = categories || CATEGORIES;
  const activitiesJSON = JSON.stringify(activities, null, 2);
  const catsJSON = JSON.stringify(cats);
  const escapedCenterName = (centerName || '').replace(/"/g, '\\"');
  const escapedTitle = (title || 'Map').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return '<!DOCTYPE html>\n' +
    '<html lang="en">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n' +
    '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
    '<meta name="theme-color" content="#667eea">\n' +
    '<title>' + escapedTitle + '</title>\n' +
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />\n' +
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>\n' +
    '<style>\n' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }\n' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; }\n' +
    '@media (prefers-color-scheme: dark) {\n' +
    '  body { background: #1a1a2e; color: #e0e0e0; }\n' +
    '  .card, .timeline-content, .filters, .tabs, .share-bar { background: #1f2b47 !important; }\n' +
    '  .card h3, .timeline-content h4 { color: #e0e0e0; }\n' +
    '  .card .meta, .card .description, .tl-meta, .timeline-time { color: #a0a0a0 !important; }\n' +
    '  .filter-chip { background: #1f2b47 !important; color: #e0e0e0 !important; border-color: #2c3e5a !important; }\n' +
    '  .filter-chip.active { background: #667eea !important; color: white !important; border-color: #667eea !important; }\n' +
    '  .btn-info { background: #2c3e5a !important; color: #e0e0e0 !important; }\n' +
    '  .start-info { background: #2c3e5a !important; border-color: #3c4e6a !important; color: #e0e0e0; }\n' +
    '}\n' +
    '.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 20px; position: sticky; top: 0; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }\n' +
    '.header h1 { font-size: 18px; font-weight: 600; cursor: pointer; }\n' +
    '.header .subtitle { font-size: 13px; opacity: 0.85; margin-top: 2px; }\n' +
    '.tabs { display: flex; background: white; border-bottom: 2px solid #eee; position: sticky; top: 60px; z-index: 999; }\n' +
    '.tab { flex: 1; text-align: center; padding: 12px; cursor: pointer; font-size: 14px; font-weight: 500; color: #666; transition: all 0.2s; border-bottom: 3px solid transparent; border: none; background: inherit; }\n' +
    '.tab.active { color: #667eea; border-bottom-color: #667eea; }\n' +
    '#map { height: 55vh; min-height: 300px; }\n' +
    '.filters { padding: 10px 16px; background: white; border-bottom: 1px solid #eee; display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; }\n' +
    '.filter-chip { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 20px; font-size: 12px; border: 1.5px solid #ddd; background: white; cursor: pointer; white-space: nowrap; transition: all 0.2s; }\n' +
    '.filter-chip.active { border-color: #667eea; background: #667eea; color: white; }\n' +
    '.filter-chip .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }\n' +
    '.cards { padding: 12px; display: none; }\n' +
    '.card { background: white; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.1); position: relative; }\n' +
    '.card-cat { position: absolute; top: 12px; right: 12px; padding: 3px 8px; border-radius: 12px; font-size: 11px; color: white; }\n' +
    '.card h3 { font-size: 16px; margin-bottom: 6px; padding-right: 80px; }\n' +
    '.card .meta { font-size: 13px; color: #666; line-height: 1.6; }\n' +
    '.card .description { font-size: 13px; color: #444; margin: 8px 0; }\n' +
    '.card .actions { display: flex; gap: 8px; margin-top: 10px; flex-wrap: wrap; }\n' +
    '.btn { display: inline-flex; align-items: center; gap: 4px; padding: 8px 14px; border-radius: 8px; font-size: 13px; text-decoration: none; font-weight: 500; border: none; cursor: pointer; }\n' +
    '.btn-navigate { background: #4285f4; color: white; }\n' +
    '.btn-info { background: #f0f0f0; color: #333; }\n' +
    '.timeline { padding: 12px 16px; display: none; }\n' +
    '.timeline-day { margin-bottom: 20px; }\n' +
    '.timeline-day h2 { font-size: 15px; color: #667eea; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 2px solid #667eea; }\n' +
    '.timeline-slot { display: flex; gap: 12px; margin-bottom: 8px; }\n' +
    '.timeline-time { width: 50px; text-align: right; font-size: 13px; font-weight: 600; color: #444; padding-top: 2px; flex-shrink: 0; }\n' +
    '.timeline-content { flex: 1; background: white; border-radius: 8px; padding: 10px 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); border-left: 3px solid #667eea; }\n' +
    '.timeline-content h4 { font-size: 14px; margin-bottom: 2px; }\n' +
    '.timeline-content .tl-meta { font-size: 12px; color: #888; }\n' +
    '.start-info { background: #fff3cd; padding: 10px 16px; font-size: 13px; border-bottom: 1px solid #ffc107; display: flex; align-items: center; gap: 8px; }\n' +
    '.share-bar { padding: 10px 16px; background: white; border-bottom: 1px solid #eee; display: flex; gap: 8px; justify-content: flex-end; }\n' +
    '.btn-share { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; text-decoration: none; color: white; }\n' +
    '.btn-whatsapp { background: #25D366; }\n' +
    '.btn-share-native { background: #667eea; }\n' +
    '@media (max-width: 600px) { .header h1 { font-size: 16px; } #map { height: 45vh; } }\n' +
    '</style>\n</head>\n<body>\n\n' +
    '<div class="header">\n  <h1 id="map-title">' + escapedTitle + '</h1>\n' +
    '  <div class="subtitle">From: ' + (centerName || '').replace(/</g, '&lt;').replace(/>/g, '&gt;') + ' | Max: ' + (maxDistance || '?') + 'km</div>\n</div>\n\n' +
    '<div class="tabs" id="tabs-bar"></div>\n\n' +
    '<div class="share-bar" id="share-bar"></div>\n\n' +
    '<div class="start-info" id="start-info"></div>\n\n' +
    '<div id="map-view">\n  <div class="filters" id="filters"></div>\n  <div id="map"></div>\n</div>\n\n' +
    '<div class="cards" id="cards"></div>\n' +
    '<div class="timeline" id="timeline"></div>\n\n' +
    '<script>\n' +
    'var ACTIVITIES = ' + activitiesJSON + ';\n' +
    'var CATEGORIES = ' + catsJSON + ';\n' +
    'var CENTER = { lat: ' + centerLat + ', lng: ' + centerLng + ', name: "' + escapedCenterName + '" };\n' +
    'var MAX_DIST = ' + (maxDistance || 10) + ';\n' +
    'var map, markers = [], activeFilters = new Set();\n' +
    'window._newTitle = null;\n\n' +

    // editTitle
    'function editTitle() {\n' +
    '  var h1 = document.getElementById("map-title");\n' +
    '  var current = h1.textContent;\n' +
    '  var newT = prompt("Map name:", current);\n' +
    '  if (newT && newT.trim() && newT.trim() !== current) {\n' +
    '    h1.textContent = newT.trim();\n' +
    '    window._newTitle = newT.trim();\n' +
    '  }\n' +
    '}\n\n' +

    // initMap
    'function initMap() {\n' +
    '  map = L.map("map", { closePopupOnClick: true }).setView([CENTER.lat, CENTER.lng], 14);\n' +
    '  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {\n' +
    '    attribution: "\\u00a9 OpenStreetMap contributors", maxZoom: 19\n' +
    '  }).addTo(map);\n' +
    '  var startIcon = L.divIcon({ className: "", iconSize: [28,28], iconAnchor: [14,28] });\n' +
    '  var pinEl = document.createElement("div");\n' +
    '  pinEl.style.cssText = "font-size:28px;text-shadow:0 2px 4px rgba(0,0,0,0.3)";\n' +
    '  pinEl.textContent = "\\uD83D\\uDCCD";\n' +
    '  startIcon.options.html = "";\n' +
    '  var startMarker = L.marker([CENTER.lat, CENTER.lng], { icon: startIcon }).addTo(map);\n' +
    '  var startPopup = document.createElement("div");\n' +
    '  var startStrong = document.createElement("strong"); startStrong.textContent = CENTER.name; startPopup.appendChild(startStrong);\n' +
    '  var startEm = document.createElement("em"); startEm.textContent = " (Start)"; startPopup.appendChild(document.createElement("br")); startPopup.appendChild(startEm);\n' +
    '  startMarker.bindPopup(startPopup);\n' +
    '  L.circle([CENTER.lat, CENTER.lng], { radius: MAX_DIST*1000, color: "#667eea", fillColor: "#667eea", fillOpacity: 0.05, weight: 1.5, dashArray: "5,5" }).addTo(map);\n' +
    '  map.on("click", function() { map.closePopup(); });\n' +
    '  addMarkers(); buildFilters();\n' +
    '}\n\n' +

    // addMarkers
    'function addMarkers() {\n' +
    '  markers.forEach(function(m) { map.removeLayer(m.marker); }); markers = [];\n' +
    '  ACTIVITIES.forEach(function(act) {\n' +
    '    if (act.lat == null || act.lng == null) return;\n' +
    '    if (activeFilters.size > 0 && !activeFilters.has(act.category)) return;\n' +
    '    var cat = CATEGORIES[act.category] || CATEGORIES.other;\n' +
    '    var marker = L.circleMarker([act.lat, act.lng], {\n' +
    '      radius: 10, fillColor: cat.color, color: "#fff", weight: 2, fillOpacity: 0.9\n' +
    '    }).addTo(map);\n' +
    '    var p = document.createElement("div"); p.style.cssText = "min-width:200px;max-width:280px";\n' +
    '    var hdr = document.createElement("div"); hdr.style.cssText = "background:" + cat.color + ";color:white;padding:4px 8px;border-radius:6px 6px 0 0;margin:-8px -18px 8px -18px;font-size:11px"; hdr.textContent = cat.icon + " " + cat.label; p.appendChild(hdr);\n' +
    '    var nm = document.createElement("strong"); nm.style.fontSize = "14px"; nm.textContent = act.name; p.appendChild(nm);\n' +
    '    var info = document.createElement("div"); info.style.cssText = "font-size:12px;color:#666;margin:6px 0;line-height:1.5";\n' +
    '    var timeStr = (act.time_start||"?") + (act.time_end ? "-" + act.time_end : "");\n' +
    '    info.textContent = (act.date||"") + " " + timeStr + " " + (act.cost||"") + " " + (act.distance_km != null ? act.distance_km + "km" : ""); p.appendChild(info);\n' +
    '    if (act.address) { var ad = document.createElement("div"); ad.style.cssText = "font-size:12px;color:#666"; ad.textContent = act.address; p.appendChild(ad); }\n' +
    '    if (act.description) { var ds = document.createElement("div"); ds.style.cssText = "font-size:12px;color:#444;margin:6px 0"; ds.textContent = act.description; p.appendChild(ds); }\n' +
    '    var acts = document.createElement("div"); acts.style.cssText = "margin-top:8px;display:flex;gap:6px;flex-wrap:wrap";\n' +
    '    var gmUrl = "https://www.google.com/maps/search/?api=1&query=" + act.lat + "," + act.lng;\n' +
    '    var navA = document.createElement("a"); navA.href = gmUrl; navA.target = "_blank"; navA.rel = "noopener"; navA.style.cssText = "background:#4285f4;color:white;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none"; navA.textContent = "Navigate"; acts.appendChild(navA);\n' +
    '    if (act.contact) {\n' +
    '      var cUrl = null;\n' +
    '      if (/^https?:\\/\\//.test(act.contact)) cUrl = act.contact;\n' +
    '      else if (/^\\+?[0-9\\s-]+$/.test(act.contact)) cUrl = "tel:" + act.contact.replace(/\\s/g,"");\n' +
    '      if (cUrl) { var cA = document.createElement("a"); cA.href = cUrl; cA.target = "_blank"; cA.rel = "noopener"; cA.style.cssText = "background:#27ae60;color:white;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none"; cA.textContent = cUrl.indexOf("tel:") === 0 ? "Call" : "Website"; acts.appendChild(cA); }\n' +
    '    }\n' +
    '    if (act.source_url && /^https?:\\/\\//.test(act.source_url)) {\n' +
    '      var srcDiv = document.createElement("div"); srcDiv.style.cssText = "font-size:11px;margin:4px 0";\n' +
    '      var srcA = document.createElement("a"); srcA.href = act.source_url; srcA.target = "_blank"; srcA.rel = "noopener"; srcA.style.cssText = "color:#667eea;text-decoration:underline;word-break:break-all";\n' +
    '      try { var u = new URL(act.source_url); srcA.textContent = u.hostname + u.pathname.slice(0,25); } catch(e) { srcA.textContent = act.source_url.slice(0,40); }\n' +
    '      srcDiv.appendChild(srcA); p.appendChild(srcDiv);\n' +
    '    }\n' +
    '    var shBtn = document.createElement("button"); shBtn.style.cssText = "background:#f0f0f0;color:#333;padding:6px 12px;border-radius:6px;font-size:12px;border:none;cursor:pointer"; shBtn.textContent = "Share";\n' +
    '    shBtn.addEventListener("click", function() { shareEvent(act); }); acts.appendChild(shBtn);\n' +
    '    p.appendChild(acts);\n' +
    '    marker.bindPopup(p, { autoClose: true, closeOnClick: true });\n' +
    '    markers.push({ marker: marker, activity: act });\n' +
    '  });\n' +
    '  if (markers.length > 0) {\n' +
    '    var bounds = L.latLngBounds(markers.map(function(m) { return m.marker.getLatLng(); }));\n' +
    '    bounds.extend([CENTER.lat, CENTER.lng]); map.fitBounds(bounds, { padding: [30, 30] });\n' +
    '  }\n' +
    '}\n\n' +

    // buildFilters
    'function buildFilters() {\n' +
    '  var container = document.getElementById("filters");\n' +
    '  container.textContent = "";\n' +
    '  var cats = []; ACTIVITIES.forEach(function(a) { if (cats.indexOf(a.category)===-1) cats.push(a.category); });\n' +
    '  var allChip = document.createElement("div"); allChip.className = "filter-chip active"; allChip.textContent = "All";\n' +
    '  allChip.addEventListener("click", function() { activeFilters.clear(); document.querySelectorAll(".filter-chip").forEach(function(c) { c.classList.remove("active"); }); allChip.classList.add("active"); addMarkers(); renderCards(); });\n' +
    '  container.appendChild(allChip);\n' +
    '  cats.forEach(function(cat) {\n' +
    '    var cfg = CATEGORIES[cat] || CATEGORIES.other;\n' +
    '    var chip = document.createElement("div"); chip.className = "filter-chip";\n' +
    '    var dot = document.createElement("span"); dot.className = "dot"; dot.style.background = cfg.color; chip.appendChild(dot);\n' +
    '    chip.appendChild(document.createTextNode(" " + cfg.icon + " " + cfg.label));\n' +
    '    chip.addEventListener("click", function() {\n' +
    '      if (activeFilters.has(cat)) { activeFilters.delete(cat); chip.classList.remove("active"); } else { activeFilters.add(cat); chip.classList.add("active"); }\n' +
    '      document.querySelector(".filter-chip:first-child").classList.toggle("active", activeFilters.size===0); addMarkers(); renderCards();\n' +
    '    }); container.appendChild(chip);\n' +
    '  });\n' +
    '}\n\n' +

    // renderCards
    'function renderCards() {\n' +
    '  var container = document.getElementById("cards"); container.textContent = "";\n' +
    '  var filtered = activeFilters.size > 0 ? ACTIVITIES.filter(function(a) { return activeFilters.has(a.category); }) : ACTIVITIES;\n' +
    '  filtered.forEach(function(act) {\n' +
    '    var cat = CATEGORIES[act.category] || CATEGORIES.other;\n' +
    '    var gmUrl = "https://www.google.com/maps/search/?api=1&query=" + act.lat + "," + act.lng;\n' +
    '    var card = document.createElement("div"); card.className = "card";\n' +
    '    var catBadge = document.createElement("div"); catBadge.className = "card-cat"; catBadge.style.background = cat.color; catBadge.textContent = cat.icon + " " + cat.label; card.appendChild(catBadge);\n' +
    '    var h3 = document.createElement("h3"); h3.textContent = act.name; card.appendChild(h3);\n' +
    '    var cardTimeStr = (act.time_start||"?") + (act.time_end ? "-" + act.time_end : "");\n' +
    '    var meta = document.createElement("div"); meta.className = "meta";\n' +
    '    var metaParts = [];\n' +
    '    if (act.date) metaParts.push(act.date);\n' +
    '    metaParts.push(cardTimeStr);\n' +
    '    if (act.cost) metaParts.push(act.cost);\n' +
    '    if (act.distance_km != null) metaParts.push(act.distance_km + "km");\n' +
    '    meta.textContent = metaParts.join(" | "); card.appendChild(meta);\n' +
    '    if (act.address) { var addr = document.createElement("div"); addr.className = "meta"; addr.textContent = act.address; card.appendChild(addr); }\n' +
    '    if (act.description) { var desc = document.createElement("div"); desc.className = "description"; desc.textContent = act.description; card.appendChild(desc); }\n' +
    '    var actions = document.createElement("div"); actions.className = "actions";\n' +
    '    var navBtn = document.createElement("a"); navBtn.href = gmUrl; navBtn.target = "_blank"; navBtn.rel = "noopener"; navBtn.className = "btn btn-navigate"; navBtn.textContent = "Navigate"; actions.appendChild(navBtn);\n' +
    '    if (act.contact) {\n' +
    '      var cUrl2 = null;\n' +
    '      if (/^https?:\\/\\//.test(act.contact)) cUrl2 = act.contact;\n' +
    '      else if (/^\\+?[0-9\\s-]+$/.test(act.contact)) cUrl2 = "tel:" + act.contact.replace(/\\s/g,"");\n' +
    '      if (cUrl2) { var cBtn = document.createElement("a"); cBtn.href = cUrl2; cBtn.target = "_blank"; cBtn.rel = "noopener"; cBtn.className = "btn"; cBtn.style.cssText = "background:#27ae60;color:white"; cBtn.textContent = cUrl2.indexOf("tel:") === 0 ? "Call" : "Website"; actions.appendChild(cBtn); }\n' +
    '    }\n' +
    '    var shBtn2 = document.createElement("button"); shBtn2.className = "btn btn-info"; shBtn2.textContent = "Share";\n' +
    '    shBtn2.addEventListener("click", function() { shareEvent(act); }); actions.appendChild(shBtn2);\n' +
    '    if (act.source_url && /^https?:\\/\\//.test(act.source_url)) {\n' +
    '      var srcDiv2 = document.createElement("div"); srcDiv2.style.cssText = "font-size:12px;margin:6px 0";\n' +
    '      var srcA2 = document.createElement("a"); srcA2.href = act.source_url; srcA2.target = "_blank"; srcA2.rel = "noopener"; srcA2.style.cssText = "color:#667eea;text-decoration:underline;word-break:break-all";\n' +
    '      try { var u2 = new URL(act.source_url); srcA2.textContent = u2.hostname + u2.pathname.slice(0,30); } catch(e2) { srcA2.textContent = act.source_url.slice(0,50); }\n' +
    '      srcDiv2.appendChild(srcA2); card.appendChild(srcDiv2);\n' +
    '    }\n' +
    '    card.appendChild(actions); container.appendChild(card);\n' +
    '  });\n' +
    '}\n\n' +

    // renderTimeline
    'function renderTimeline() {\n' +
    '  var container = document.getElementById("timeline"); container.textContent = "";\n' +
    '  var filtered = activeFilters.size > 0 ? ACTIVITIES.filter(function(a) { return activeFilters.has(a.category); }) : ACTIVITIES;\n' +
    '  var byDate = {}; filtered.forEach(function(act) { var d = act.date||"TBD"; if (!byDate[d]) byDate[d]=[]; byDate[d].push(act); });\n' +
    '  Object.keys(byDate).sort().forEach(function(date) {\n' +
    '    var dayDiv = document.createElement("div"); dayDiv.className = "timeline-day";\n' +
    '    var dateObj = new Date(date + "T00:00:00");\n' +
    '    var dayName = date !== "TBD" ? dateObj.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) : "TBD";\n' +
    '    var h2 = document.createElement("h2"); h2.textContent = dayName; dayDiv.appendChild(h2);\n' +
    '    byDate[date].sort(function(a,b) { return (a.time_start||"").localeCompare(b.time_start||""); });\n' +
    '    byDate[date].forEach(function(act) {\n' +
    '      var cat = CATEGORIES[act.category] || CATEGORIES.other;\n' +
    '      var slot = document.createElement("div"); slot.className = "timeline-slot";\n' +
    '      var timeDiv = document.createElement("div"); timeDiv.className = "timeline-time"; timeDiv.textContent = act.time_start || "?"; slot.appendChild(timeDiv);\n' +
    '      var content = document.createElement("div"); content.className = "timeline-content"; content.style.borderLeftColor = cat.color;\n' +
    '      var h4 = document.createElement("h4"); h4.textContent = cat.icon + " " + act.name; content.appendChild(h4);\n' +
    '      var tlMeta = document.createElement("div"); tlMeta.className = "tl-meta";\n' +
    '      var tlParts = [];\n' +
    '      if (act.cost) tlParts.push(act.cost);\n' +
    '      if (act.distance_km != null) tlParts.push(act.distance_km + "km");\n' +
    '      if (act.address) tlParts.push(act.address);\n' +
    '      tlMeta.textContent = tlParts.join(" | "); content.appendChild(tlMeta);\n' +
    '      slot.appendChild(content); dayDiv.appendChild(slot);\n' +
    '    });\n' +
    '    container.appendChild(dayDiv);\n' +
    '  });\n' +
    '}\n\n' +

    // showView
    'function showView(viewId) {\n' +
    '  var tabBtns = document.querySelectorAll(".tab");\n' +
    '  tabBtns.forEach(function(t, i) {\n' +
    '    t.classList.toggle("active", (viewId==="map-view"&&i===0)||(viewId==="cards"&&i===1)||(viewId==="timeline"&&i===2));\n' +
    '  });\n' +
    '  document.getElementById("map-view").style.display = viewId==="map-view" ? "block" : "none";\n' +
    '  document.getElementById("cards").style.display = viewId==="cards" ? "block" : "none";\n' +
    '  document.getElementById("timeline").style.display = viewId==="timeline" ? "block" : "none";\n' +
    '  if (viewId==="map-view") setTimeout(function() { map.invalidateSize(); }, 100);\n' +
    '  if (viewId==="cards") renderCards();\n' +
    '  if (viewId==="timeline") renderTimeline();\n' +
    '}\n\n' +

    // buildShareText
    'function buildShareText() {\n' +
    '  var title = document.getElementById("map-title").textContent;\n' +
    '  var t = title + "\\nFrom: " + CENTER.name + "\\n\\n";\n' +
    '  var byDate = {}; ACTIVITIES.forEach(function(act) { var d=act.date||"TBD"; if(!byDate[d]) byDate[d]=[]; byDate[d].push(act); });\n' +
    '  Object.keys(byDate).sort().forEach(function(date) {\n' +
    '    var dateObj = new Date(date+"T00:00:00");\n' +
    '    var dl = date!=="TBD" ? dateObj.toLocaleDateString(undefined,{weekday:"long",day:"numeric",month:"long"}) : "TBD";\n' +
    '    t += dl + "\\n";\n' +
    '    byDate[date].forEach(function(act) {\n' +
    '      var cat = CATEGORIES[act.category] || CATEGORIES.other;\n' +
    '      t += cat.icon + " " + act.name + (act.time_start ? " ("+act.time_start+")" : "") + "\\n";\n' +
    '      if (act.cost) t += "   " + act.cost + "\\n";\n' +
    '      if (act.address) t += "   " + act.address + "\\n";\n' +
    '      t += "   https://maps.google.com/?q=" + act.lat + "," + act.lng + "\\n\\n";\n' +
    '    });\n' +
    '  }); return t;\n' +
    '}\n\n' +

    // share single event
    'function shareEvent(act) {\n' +
    '  var t = act.name;\n' +
    '  if (act.date) t += "\\n" + act.date;\n' +
    '  if (act.time_start) t += " " + act.time_start + (act.time_end ? "-" + act.time_end : "");\n' +
    '  if (act.cost) t += "\\n" + act.cost;\n' +
    '  if (act.address) t += "\\n" + act.address;\n' +
    '  if (act.lat != null && act.lng != null) t += "\\nhttps://maps.google.com/?q=" + act.lat + "," + act.lng;\n' +
    '  if (act.source_url && /^https?:\\/\\//.test(act.source_url)) t += "\\n" + act.source_url;\n' +
    '  if (navigator.share) { navigator.share({ title: act.name, text: t }).catch(function(){}); }\n' +
    '  else { navigator.clipboard.writeText(t).then(function() {\n' +
    '    var toast = document.createElement("div"); toast.textContent = "Copied!"; toast.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:24px;font-size:14px;z-index:2000"; document.body.appendChild(toast); setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 2000);\n' +
    '  }).catch(function() {}); }\n' +
    '}\n\n' +

    // share functions
    'function shareWhatsApp() { window.open("https://wa.me/?text=" + encodeURIComponent(buildShareText()), "_blank"); }\n' +
    'function shareNative() {\n' +
    '  var t = buildShareText();\n' +
    '  if (navigator.share) { navigator.share({ title: document.getElementById("map-title").textContent, text: t }).catch(function(){}); }\n' +
    '  else { navigator.clipboard.writeText(t).then(function() { var toast = document.createElement("div"); toast.textContent = "Copied!"; toast.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#333;color:#fff;padding:12px 24px;border-radius:24px;font-size:14px;z-index:2000"; document.body.appendChild(toast); setTimeout(function() { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 2000); }).catch(function() {}); }\n' +
    '}\n\n' +

    // DOMContentLoaded — build tabs, share bar, start info
    'document.addEventListener("DOMContentLoaded", function() {\n' +
    '  var titleEl = document.getElementById("map-title");\n' +
    '  titleEl.addEventListener("click", editTitle);\n\n' +

    '  var tabsBar = document.getElementById("tabs-bar");\n' +
    '  var tabNames = ["Map", "List", "Timeline"];\n' +
    '  var tabViews = ["map-view", "cards", "timeline"];\n' +
    '  tabNames.forEach(function(name, i) {\n' +
    '    var tab = document.createElement("button"); tab.className = "tab" + (i === 0 ? " active" : ""); tab.textContent = name;\n' +
    '    tab.addEventListener("click", function() { showView(tabViews[i]); });\n' +
    '    tabsBar.appendChild(tab);\n' +
    '  });\n\n' +

    '  var shareBar = document.getElementById("share-bar");\n' +
    '  var waBtn = document.createElement("button"); waBtn.className = "btn-share btn-whatsapp"; waBtn.textContent = "WhatsApp";\n' +
    '  waBtn.addEventListener("click", shareWhatsApp); shareBar.appendChild(waBtn);\n' +
    '  var shBtn = document.createElement("button"); shBtn.className = "btn-share btn-share-native"; shBtn.textContent = "Share";\n' +
    '  shBtn.addEventListener("click", shareNative); shareBar.appendChild(shBtn);\n\n' +

    '  var startInfo = document.getElementById("start-info");\n' +
    '  var pin = document.createElement("span"); pin.style.fontSize = "18px"; pin.textContent = "\\uD83D\\uDCCC"; startInfo.appendChild(pin);\n' +
    '  startInfo.appendChild(document.createTextNode(" Start: "));\n' +
    '  var startStrong = document.createElement("strong"); startStrong.textContent = CENTER.name; startInfo.appendChild(startStrong);\n\n' +

    '  initMap(); renderCards(); renderTimeline();\n' +
    '});\n' +
    '<\/script>\n</body>\n</html>';
}

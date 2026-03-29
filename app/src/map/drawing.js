import { simplifyPath, corridorPolygon, adaptiveWidth, pathLength } from '../lib/corridor.js';

let drawingState = null;

/**
 * Enable freehand drawing mode on a Leaflet map.
 * User draws a polyline by touch/mouse drag. On release, path is simplified
 * and corridor polygon is rendered. Calls onComplete(path, widthKm).
 */
export function enableDrawingMode(map, L, onComplete) {
  disableDrawingMode(map);

  const container = map.getContainer();
  const rawPoints = [];
  let tempLine = null;
  let drawing = false;

  // Disable map dragging during draw
  map.dragging.disable();
  map.touchZoom.disable();

  function onPointerDown(e) {
    drawing = true;
    rawPoints.length = 0;
    const latlng = map.containerPointToLatLng(L.point(e.offsetX, e.offsetY));
    rawPoints.push({ lat: latlng.lat, lng: latlng.lng });
    tempLine = L.polyline([], { color: '#667eea', weight: 3, opacity: 0.8 }).addTo(map);
  }

  function onPointerMove(e) {
    if (!drawing) return;
    const latlng = map.containerPointToLatLng(L.point(e.offsetX, e.offsetY));
    rawPoints.push({ lat: latlng.lat, lng: latlng.lng });
    tempLine.addLatLng([latlng.lat, latlng.lng]);
  }

  function onPointerUp() {
    if (!drawing) return;
    drawing = false;

    // Re-enable map interaction
    map.dragging.enable();
    map.touchZoom.enable();

    // Clean up temp line
    if (tempLine) {
      tempLine.remove();
      tempLine = null;
    }

    if (rawPoints.length < 2) {
      cleanup();
      return;
    }

    // Simplify path
    const simplified = simplifyPath(rawPoints, 0.001);
    const totalLen = pathLength(simplified);
    const width = adaptiveWidth(totalLen);

    // Render corridor preview
    const poly = corridorPolygon(simplified, width);
    const corridorLayer = L.polygon(
      poly.map(p => [p.lat, p.lng]),
      { color: '#667eea', fillColor: '#667eea', fillOpacity: 0.15, weight: 2, dashArray: '6 4' }
    ).addTo(map);

    const centerLine = L.polyline(
      simplified.map(p => [p.lat, p.lng]),
      { color: '#667eea', weight: 3, opacity: 0.6 }
    ).addTo(map);

    // Waypoint markers for editing
    const waypointMarkers = simplified.map((p, i) => {
      const marker = L.circleMarker([p.lat, p.lng], {
        radius: 6,
        color: '#667eea',
        fillColor: '#fff',
        fillOpacity: 1,
        weight: 2,
        className: 'corridor-waypoint',
      }).addTo(map);
      return marker;
    });

    // Confirm/cancel buttons via Leaflet control
    const controlDiv = L.DomUtil.create('div', 'corridor-confirm-control');
    controlDiv.style.cssText = 'display:flex;gap:8px;padding:8px;background:var(--bg-card,#fff);border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.15)';

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = '\u2714';
    confirmBtn.style.cssText = 'padding:8px 16px;border-radius:8px;border:none;background:#667eea;color:white;font-size:16px;cursor:pointer';
    confirmBtn.addEventListener('click', () => {
      // Clean up preview layers
      corridorLayer.remove();
      centerLine.remove();
      waypointMarkers.forEach(m => m.remove());
      map.removeControl(confirmControl);
      cleanup();
      onComplete(simplified, width);
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = '\u2718';
    cancelBtn.style.cssText = 'padding:8px 16px;border-radius:8px;border:none;background:var(--bg-secondary,#f0f0f0);color:var(--text,#333);font-size:16px;cursor:pointer';
    cancelBtn.addEventListener('click', () => {
      corridorLayer.remove();
      centerLine.remove();
      waypointMarkers.forEach(m => m.remove());
      map.removeControl(confirmControl);
      cleanup();
    });

    controlDiv.appendChild(confirmBtn);
    controlDiv.appendChild(cancelBtn);

    const ConfirmControl = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd() { return controlDiv; },
    });
    const confirmControl = new ConfirmControl();
    map.addControl(confirmControl);
  }

  function cleanup() {
    container.removeEventListener('pointerdown', onPointerDown);
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerup', onPointerUp);
    container.classList.remove('drawing-mode');
    map.dragging.enable();
    map.touchZoom.enable();
    drawingState = null;
  }

  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerup', onPointerUp);

  drawingState = { cleanup };
}

/**
 * Disable drawing mode and clean up.
 */
export function disableDrawingMode(map) {
  if (drawingState) {
    drawingState.cleanup();
  }
}

/**
 * Render a corridor on the map (for display, not editing).
 * @returns {{ centerLine, polygon, waypoints }} - Leaflet layers
 */
export function renderCorridor(map, L, path, widthKm, options = {}) {
  const poly = corridorPolygon(path, widthKm);
  const color = options.color || '#667eea';

  const polygon = L.polygon(
    poly.map(p => [p.lat, p.lng]),
    { color, fillColor: color, fillOpacity: 0.12, weight: 1, dashArray: '4 4' }
  ).addTo(map);

  const centerLine = L.polyline(
    path.map(p => [p.lat, p.lng]),
    { color, weight: 3, dashArray: '8 6', opacity: 0.8 }
  ).addTo(map);

  const waypoints = path.map(p => {
    return L.circleMarker([p.lat, p.lng], {
      radius: 4, color, fillColor: '#fff', fillOpacity: 1, weight: 2,
    }).addTo(map);
  });

  return { centerLine, polygon, waypoints };
}

/**
 * Enable two-point quick corridor mode.
 * User clicks two points, corridor is created between them.
 */
export function enableQuickCorridorMode(map, L, onComplete) {
  disableDrawingMode(map);

  const container = map.getContainer();
  const points = [];
  let tempMarkers = [];

  function onClick(e) {
    const latlng = map.containerPointToLatLng(L.point(e.offsetX, e.offsetY));
    points.push({ lat: latlng.lat, lng: latlng.lng });

    const marker = L.circleMarker([latlng.lat, latlng.lng], {
      radius: 8, color: '#667eea', fillColor: '#fff', fillOpacity: 1, weight: 3,
    }).addTo(map);
    tempMarkers.push(marker);

    if (points.length === 2) {
      container.removeEventListener('click', onClick);
      container.classList.remove('drawing-mode');
      tempMarkers.forEach(m => m.remove());

      const totalLen = pathLength(points);
      const width = adaptiveWidth(totalLen);
      onComplete(points, width);
    }
  }

  container.addEventListener('click', onClick);
  container.classList.add('drawing-mode');

  drawingState = {
    cleanup() {
      container.removeEventListener('click', onClick);
      container.classList.remove('drawing-mode');
      tempMarkers.forEach(m => m.remove());
      drawingState = null;
    },
  };
}

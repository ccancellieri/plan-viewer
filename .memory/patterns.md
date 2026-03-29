# Reusable Patterns

## Hash router with expectedHash guard
```js
let expectedHash = null;
function navigate(screen, params) {
  // ... mount screen ...
  expectedHash = screen;
  window.location.hash = screen;
}
window.addEventListener('hashchange', () => {
  const screen = getCurrentScreen();
  if (screen === expectedHash) { expectedHash = null; return; }
  expectedHash = null;
  if (screens[screen]) navigate(screen);
});
```

## Leaflet custom control
```js
const MyControl = L.Control.extend({
  options: { position: 'bottomright' },
  onAdd() {
    const btn = L.DomUtil.create('button', '');
    // style and event...
    L.DomEvent.on(btn, 'click', (e) => {
      L.DomEvent.stopPropagation(e);
      // action...
    });
    return btn;
  },
});
new MyControl().addTo(map);
```

## Visible divIcon with emoji
```js
L.divIcon({
  className: '',
  html: '<div style="width:36px;height:36px;background:#667eea;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:18px">🏠</div>',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -20],
});
```

## Provider filtering (only configured keys)
```js
providers.filter(p => p.id === 'manual' || !!db.readJSON('apikey_' + p.id));
```

## Load All async loop with stop flag
```js
let stopRequested = false;
loadAllBtn.addEventListener('click', async () => {
  stopRequested = false;
  while (!exhausted && !stopRequested) {
    await loadMore();
  }
});
stopBtn.addEventListener('click', () => { stopRequested = true; });
```

## Blob download (no server)
```js
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = filename + '.json';
a.click();
URL.revokeObjectURL(url);
```

## Manual provider: clipboard prompt + textarea paste
```js
if (providerId === 'manual') {
  await navigator.clipboard.writeText(fullPrompt);
  await modalAlert(title, instructions);
  const response = await textareaPrompt(title, msg, placeholder);
  return parseActivities(response, dateStart, dateEnd);
}
```

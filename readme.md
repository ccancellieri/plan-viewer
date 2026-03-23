# Planner

A multi-LLM leisure activity planner with interactive maps. Search for activities, events, and things to do in any city using AI providers, then visualize results on interactive maps with filtering, sharing, and export.

## Features

- **Multi-LLM support** — 9 AI providers: Claude, Gemini, Groq, Grok, DeepSeek, Mistral, Cohere, Perplexity, and manual input
- **Web search boosters** — Tavily and Serper integration for real-time event data
- **Interactive maps** — Leaflet-based maps with category filtering, timeline view, and card list
- **Geocoding** — Nominatim-powered address resolution for accurate marker placement
- **Shareable maps** — Export as standalone HTML or share individual events via WhatsApp/native share
- **KML export** — Open in Google Earth, Maps, or any GIS tool
- **Multi-language** — English, Italian, Spanish
- **Dark mode** — Automatic via system preference
- **Cross-platform** — Web (Vite), iOS and Android (Capacitor)
- **Offline maps** — Saved maps work without network

## Project Structure

```
plan-viewer/
  scriptable/               # Legacy Scriptable.app version (preserved)
    Planner.js
  app/                      # v2 — modular rewrite
    src/
      main.js               # Entry point
      router.js             # Hash-based SPA router
      app.css               # Global styles + dark mode
      i18n/                 # Translations (en, it, es)
      providers/            # LLM provider plugins
        boosters/           # Web search APIs (Tavily, Serper)
      storage/              # Swappable backends (web/capacitor)
      lib/                  # Pure logic (geo, parser, prompt, categories)
      map/                  # Map rendering (cards, timeline, standalone export)
      ui/                   # Reusable components (modal, chips, wizard, toast)
      screens/              # App screens (home, new-trip, search, map-view, etc.)
    ios/                    # Capacitor iOS project
    android/                # Capacitor Android project
```

## Getting Started

### Development (browser)

```bash
cd app
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build

```bash
npm run build
```

### iOS

Requires Xcode.

```bash
npm run cap:ios
```

### Android

Requires Android Studio.

```bash
npm run cap:android
```

### Sync native projects

After code changes:

```bash
npm run cap:sync
```

## Adding a Provider

Create a new file in `app/src/providers/` with this interface:

```js
export default {
  id: 'my-provider',
  label: 'My Provider',
  model: 'model-name',
  free: false,
  webSearch: false,
  signupUrl: 'https://...',

  async call(apiKey, systemPrompt, userPrompt) {
    // Call the API and return the response text
  }
};
```

Then add it to the `providers` array in `app/src/providers/index.js`.

## Tech Stack

| Component | Choice |
|---|---|
| Language | Vanilla JS (ES2020) |
| Build | Vite 8 |
| Maps | Leaflet (bundled locally) |
| Geocoding | Nominatim (OpenStreetMap) |
| Native | Capacitor 8 (iOS + Android) |
| Styling | CSS Variables + dark mode |

## Author

**Carlo Cancellieri**
ccancellieri@gmail.com
github.com/ccancellieri


## Privacy Policy

See [privacy-policy.html](app/public/privacy-policy.html).

## License

Copyright 2026 Carlo Cancellieri. All rights reserved. Proprietary software — see [LICENSE](LICENSE) for details.

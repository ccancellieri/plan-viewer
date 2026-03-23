# Planner

**[EN]** A multi-LLM leisure activity planner with interactive maps. Search for activities, events, and things to do in any city using AI providers, then visualize results on interactive maps with filtering, sharing, and export.

**[IT]** Un pianificatore di attivita per il tempo libero basato su multi-LLM con mappe interattive. Cerca attivita, eventi e cose da fare in qualsiasi citta utilizzando provider AI, poi visualizza i risultati su mappe interattive con filtri, condivisione ed esportazione.

**[ES]** Un planificador de actividades de ocio basado en multi-LLM con mapas interactivos. Busca actividades, eventos y cosas que hacer en cualquier ciudad usando proveedores de IA, luego visualiza los resultados en mapas interactivos con filtros, compartir y exportar.

---

## Features / Funzionalita / Funcionalidades

- **Multi-LLM** — 9 AI providers: Claude, Gemini, Groq, Grok, DeepSeek, Mistral, Cohere, Perplexity + manual input
- **Web search boosters** — Tavily, Serper
- **Interactive maps / Mappe interattive / Mapas interactivos** — Leaflet + category filters, timeline, cards
- **Geocoding** — Nominatim (OpenStreetMap)
- **Share / Condividi / Compartir** — Standalone HTML, WhatsApp, native share
- **KML export** — Google Earth, Maps, GIS
- **i18n** — English, Italiano, Espanol
- **Dark mode**
- **PWA** — installable on iOS, Android, desktop
- **Offline maps / Mappe offline / Mapas sin conexion**

---

## Install on Your Phone / Installa sul Telefono / Instalar en tu Telefono

Planner is a Progressive Web App (PWA) — install it directly from the browser, no app store needed.

Planner e una Progressive Web App (PWA) — installala direttamente dal browser, senza app store.

Planner es una Progressive Web App (PWA) — instalala directamente desde el navegador, sin tienda de apps.

### iPhone / iPad

**[EN]**
1. Open **Safari** and go to [ccancellieri.github.io/plan-viewer/app/](https://ccancellieri.github.io/plan-viewer/app/)
2. Tap the **Share** button (square with arrow, bottom of screen)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add**

> You must use Safari. Chrome and Firefox on iOS do not support PWA install.

**[IT]**
1. Apri **Safari** e vai su [ccancellieri.github.io/plan-viewer/app/](https://ccancellieri.github.io/plan-viewer/app/)
2. Tocca il pulsante **Condividi** (quadrato con freccia, in basso)
3. Scorri e tocca **Aggiungi alla schermata Home**
4. Tocca **Aggiungi**

> Devi usare Safari. Chrome e Firefox su iOS non supportano l'installazione PWA.

**[ES]**
1. Abre **Safari** y ve a [ccancellieri.github.io/plan-viewer/app/](https://ccancellieri.github.io/plan-viewer/app/)
2. Toca el boton **Compartir** (cuadrado con flecha, abajo)
3. Desplazate y toca **Agregar a pantalla de inicio**
4. Toca **Agregar**

> Debes usar Safari. Chrome y Firefox en iOS no soportan instalacion PWA.

### Android

**[EN]**
1. Open **Chrome** and go to [ccancellieri.github.io/plan-viewer/app/](https://ccancellieri.github.io/plan-viewer/app/)
2. Tap the **three-dot menu** (top-right)
3. Tap **Install app** (or **Add to Home screen**)
4. Tap **Install**

> If a banner appears at the bottom saying "Add Planner to Home screen", tap it directly.

**[IT]**
1. Apri **Chrome** e vai su [ccancellieri.github.io/plan-viewer/app/](https://ccancellieri.github.io/plan-viewer/app/)
2. Tocca il **menu tre puntini** (in alto a destra)
3. Tocca **Installa app** (o **Aggiungi alla schermata Home**)
4. Tocca **Installa**

> Se appare un banner in basso con "Aggiungi Planner alla schermata Home", toccalo direttamente.

**[ES]**
1. Abre **Chrome** y ve a [ccancellieri.github.io/plan-viewer/app/](https://ccancellieri.github.io/plan-viewer/app/)
2. Toca el **menu de tres puntos** (arriba a la derecha)
3. Toca **Instalar app** (o **Agregar a pantalla de inicio**)
4. Toca **Instalar**

> Si aparece un banner abajo diciendo "Agregar Planner a pantalla de inicio", tocalo directamente.

### Desktop (Chrome, Edge)

**[EN]** Click the install icon in the address bar, or Menu > Install Planner.

**[IT]** Clicca l'icona di installazione nella barra indirizzi, oppure Menu > Installa Planner.

**[ES]** Haz clic en el icono de instalacion en la barra de direcciones, o Menu > Instalar Planner.

---

## How to Use / Come Usare / Como Usar

### [EN] Getting Started

1. Open the app and tap **Plan New Trip**
2. Enter a city name or use GPS to detect your location
3. Select dates for your trip
4. Choose an AI provider (Groq and Gemini are free)
5. Fill in the questionnaire: mood, budget, preferred times, categories
6. The AI generates a list of activities — view them on an interactive map
7. Save maps for offline use, share via WhatsApp, or export as KML

### [IT] Per Iniziare

1. Apri l'app e tocca **Nuovo Viaggio**
2. Inserisci il nome di una citta o usa il GPS per rilevare la tua posizione
3. Seleziona le date del viaggio
4. Scegli un provider AI (Groq e Gemini sono gratuiti)
5. Compila il questionario: umore, budget, orari preferiti, categorie
6. L'AI genera una lista di attivita — visualizzale su una mappa interattiva
7. Salva le mappe per uso offline, condividi via WhatsApp o esporta in KML

### [ES] Para Empezar

1. Abre la app y toca **Nuevo Viaje**
2. Ingresa el nombre de una ciudad o usa el GPS para detectar tu ubicacion
3. Selecciona las fechas del viaje
4. Elige un proveedor de IA (Groq y Gemini son gratuitos)
5. Completa el cuestionario: estado de animo, presupuesto, horarios, categorias
6. La IA genera una lista de actividades — visualizalas en un mapa interactivo
7. Guarda mapas para uso sin conexion, comparte por WhatsApp o exporta como KML

### API Keys / Chiavi API / Claves API

**[EN]** Most providers require an API key. Go to **Settings** to add your keys. Groq and Gemini offer free tiers. All keys are stored locally on your device — never sent to us.

**[IT]** La maggior parte dei provider richiede una chiave API. Vai in **Impostazioni** per aggiungere le tue chiavi. Groq e Gemini offrono piani gratuiti. Tutte le chiavi sono salvate localmente sul tuo dispositivo — mai inviate a noi.

**[ES]** La mayoria de los proveedores requieren una clave API. Ve a **Configuracion** para agregar tus claves. Groq y Gemini ofrecen planes gratuitos. Todas las claves se guardan localmente en tu dispositivo — nunca se envian a nosotros.

---

## Project Structure

```
plan-viewer/
  scriptable/               # Legacy Scriptable.app version
    Planner.js
  app/                      # v2 — modular PWA
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
```

## Development

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm run build      # Production build
```

## Adding a Provider

Create a file in `app/src/providers/`:

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

Add it to the `providers` array in `app/src/providers/index.js`.

## Tech Stack

| Component | Choice |
|---|---|
| Language | Vanilla JS (ES2020) |
| Build | Vite |
| Maps | Leaflet (bundled) |
| Geocoding | Nominatim (OpenStreetMap) |
| Native | Capacitor (iOS + Android) |
| Styling | CSS Variables + dark mode |

## Author

**Carlo Cancellieri**
ccancellieri@gmail.com
[github.com/ccancellieri](https://github.com/ccancellieri)

## Privacy Policy

See [privacy-policy.html](app/public/privacy-policy.html) — also available at [ccancellieri.github.io/privacy-policy.html](https://ccancellieri.github.io/privacy-policy.html).

## License

Copyright 2026 Carlo Cancellieri. All rights reserved. See [LICENSE](LICENSE).

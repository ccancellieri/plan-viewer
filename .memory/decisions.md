# Architecture Decisions

## 2026-03-29 Router double-mount fix: expectedHash pattern
**Context**: Programmatic `navigate()` sets `window.location.hash`, which fires `hashchange` asynchronously. A synchronous `navigating` boolean flag was always false by the time the event fired, causing every screen to mount twice.
**Decision**: Replace boolean with `expectedHash` string. `navigate()` stores the target hash before setting it. `hashchange` handler compares current hash to `expectedHash` and skips if they match.
**Rationale**: Works with async event model. No timers, no race conditions. Manual browser back/forward still works because the hash won't match `expectedHash`.

## 2026-03-29 Visible start marker with recenter button
**Context**: The Leaflet `divIcon` for the start point had no `html` property, rendering it invisible. Users couldn't tell where the map was centered.
**Decision**: Use a styled 🏠 emoji inside a blue circular `divIcon` with drop-shadow. Add a Leaflet custom control (bottomright) that pans/zooms back to the start location.
**Rationale**: Users need a clear visual anchor for their starting point, especially on GPS-centered maps. The recenter button avoids confusion when panning away from the origin.

## 2026-03-29 LLM response language via system prompt
**Context**: AI search results always returned in English regardless of the app's selected language.
**Decision**: Inject language instruction into LLM system prompt: `LANG_NAMES[getLang()]` maps to full language name, inserted via `{LANG}` placeholder.
**Rationale**: Simpler than post-processing translation. Works across all providers.

## 2026-03-29 Provider list filtered by configured API keys
**Context**: Provider picker showed all providers even if the user hadn't configured their API key, leading to confusing errors.
**Decision**: Filter `providers.filter(p => p.id === 'manual' || !!db.readJSON('apikey_' + p.id))` in new-trip, voice-plan, and map-view add-events.
**Rationale**: Only show options that can actually work. Manual entry always available.

## 2026-03-29 Load All / Stop controls replace infinite scroll
**Context**: IntersectionObserver-based infinite scroll was unreliable (double-trigger on error, sentinel not always visible). Users wanted to bulk-load all results without manual clicks.
**Decision**: Replaced infinite scroll with explicit controls: "Load More" (single page), "Load All" (auto-loop until exhausted or stopped), and "Stop" (red button to interrupt). Counter and action buttons update live.
**Rationale**: Gives users full control. "Load All" runs `while (!exhausted && !stopRequested) await loadMore()` — simple async loop. Stop flag checked between pages, not mid-request.

## 2026-03-29 Manual chat mode for users without API keys
**Context**: Chat Pro subscriptions (Claude, ChatGPT, Gemini) don't expose API access. Users shouldn't need separate API keys to use the app.
**Decision**: The `manual` provider copies the full prompt (system + user) to clipboard, shows instructions to paste into any AI chat, then presents a textarea to paste back the JSON response. Parsed and geocoded identically to API results.
**Rationale**: Bridges the gap between chat subscriptions and API access. Zero setup — works with any AI that accepts text input. Tradeoff is manual copy-paste vs automated.

## 2026-03-29 JSON export/download for activities
**Context**: Users wanted to save/export discovered activities.
**Decision**: Download button in both search results and map view. Search exports activities array as JSON. Map view exports full map data (title, center, dates, activities). Uses Blob URL + programmatic `<a>` click.
**Rationale**: JSON preserves all fields (coords, times, categories) for re-import or external use. No server needed.

## 2026-03-29 GPL-3.0 license + acceptance gate
**Context**: App needed formal licensing with commercial per-Search fee and in-app acceptance.
**Decision**: GPL-3.0 with Section 7 additional terms (commercial fee). Fullscreen license gate blocks app until accepted, persisted in localStorage.
**Rationale**: Protects open-source while enabling commercial licensing. Gate ensures legal compliance.

## 2026-03-29 External sources catalog (sources.json)
**Context**: KNOWN_SOURCES was hardcoded in JS, hard to customize.
**Decision**: Move sources to `sources.json` (public file), load at boot via fetch, cache in localStorage for offline, configurable URL in settings.
**Rationale**: Same flexibility pattern needed for questionnaire later. Users can point to their own curated sources file.

## 2026-03-29 Trip & Corridor feature design approved
**Context**: Users need route-based exploration, not just city-based search. See DESIGN-trips.md.
**Decision**: Trips as first-class entity (graph of Maps + Corridors). Freehand drawing, auto-segmented LLM search, temporal layers, IndexedDB + Flatbush storage. 8-phase implementation.
**Rationale**: Full design document at DESIGN-trips.md with 14-item decision log.

## 2026-03-29 Trip & Corridor Phases 4-5 implemented
**Context**: Trip builder needed travel time estimation, corridor splitting, and route-based LLM search.
**Decision**: Added OSRM travel time estimation (with straight-line fallback), split corridor UI, corridor search using auto-segmented parallel LLM calls (reuses existing provider/parser pipeline), focus zone prompt builder. Travel times display between stops and auto-compute via OSRM public API.
**Rationale**: OSRM is free/open-source (no API key), matches GPL alignment. Corridor search reuses 95% of existing LLM pipeline — just different prompt. Segments sampled at ~50km intervals for quality results.

## 2026-03-29 Trip & Corridor Phases 1-3 implemented
**Context**: Trip & Corridor design was approved. Needed foundation: storage, data model, screens, drawing.
**Decision**: Implemented IndexedDB + Flatbush via spatial-db.js, Trip CRUD via trip.js, my-trips + trip-builder screens, corridor.js geometry (Douglas-Peucker, corridor polygon, adaptive width), and Leaflet freehand drawing mode. All data persists in IndexedDB. Existing localStorage maps untouched.
**Rationale**: Incremental approach — new Trip feature uses new storage while existing Map feature continues working via localStorage. Drawing module lazy-loaded to avoid bloating initial bundle.

## 2026-03-30 Trip & Corridor Phase 6 — Timeline / Stay Planner
**Context**: Users need a day-by-day view of their trip to see all activities across stops and corridors, check time budgets, and spot scheduling conflicts.
**Decision**: Added Map|Timeline dual toggle tabs to trip-builder. Timeline is always computed (never stored) from stop activities + corridor activities + travel segments. Groups by date, sorts by time_start, shows travel segments between stops. Time budget warnings: orange (>10h), red (>14h). Permanent (undated) activities shown in "Anytime" section. Uses CATEGORIES from categories.js for activity icons/colors.
**Rationale**: Computed view avoids sync issues — always consistent with current data. Budget thresholds generous to avoid false alarms.

## 2026-03-30 Trip & Corridor Phase 7 — Re-run & Layers
**Context**: Users want to refresh trip activities for new dates/seasons without losing previous results.
**Decision**: "Refresh" button on trip-builder re-runs corridor searches with current dates/interests via selected provider. Each re-run creates a new layer entry `{ id, date, label }` on the trip. New activities tagged with `_layerId`. Layer count shown as badge in stop list.
**Rationale**: Lightweight layer model — layers are metadata, not full copies. Activities from different layers coexist in the same stop.activities array. Full layer toggling/comparison deferred to when there's user demand.

## 2026-03-30 Trip & Corridor Phase 8 — Externalized Questionnaire
**Context**: Questionnaire sections/options were hardcoded in questionnaire.js. Users and operators need to customize the search profile (add moods, change budget tiers, etc.) without modifying code.
**Decision**: Created `questionnaire-loader.js` following exact same pattern as `sources.js`: `questionnaire.json` (public file), fetched at boot, cached in localStorage for offline, configurable URL in Settings. Refactored `questionnaire.js` to render dynamically from JSON — each section has `key`, `labelKey`, `type` (chips/text), `multi`, and `options[{value, labelKey}]`. Falls back to bundled FALLBACK_QUESTIONNAIRE on fetch failure.
**Rationale**: Same proven externalization pattern as sources.json. i18n handled via labelKey → t() mapping, so questionnaire structure is language-independent.

## 2026-03-29 Service worker cache versioning
**Context**: PWA users get stale code from service worker cache after deploys.
**Decision**: Manual `CACHE_NAME = 'planner-vN'` bump on every deploy. Activate handler deletes old caches.
**Rationale**: Simple and reliable. No hashing infrastructure needed for this project size.

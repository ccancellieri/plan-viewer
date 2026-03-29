# Trip & Corridor Feature — Design Document

> Status: **Approved for implementation**
> Date: 2026-03-29
> Author: Carlo Cancellieri + Claude design session

---

## 1. Problem Statement

Planner currently supports single-city searches — pick a location, set dates, find activities nearby. But travelers on road trips need to discover things to do **across a region**, not just at one point. Example: driving through middle Italy and wanting to find thermal baths, wineries, or festivals within reach of the route.

The app is an **exploration tool**, not a navigation planner. The route is a rough sketch to define an area of interest, not a GPS path.

## 2. Core Concepts

### Trip
An ordered graph of **Stops** — alternating between Maps (point-of-interest nodes) and Corridors (exploration edges).

```
[Rome MAP] --corridor--> [Orvieto MAP] --corridor--> [Florence MAP]
```

- Trips are **reusable templates**: change dates/interests, re-run searches to discover fresh activities
- Trips contain **temporal layers**: each re-run produces a new layer ("March 2026", "June 2026"). Permanent activities (waterfalls, thermal baths) persist across layers. Dated events (concerts) are layer-specific.

### Map (Stop)
A point of interest with a center, radius, and activities. Existing Maps are reusable — the same Rome map can appear in multiple Trips.

- `stayDuration`: how many hours/days at this stop
- `arrivalDate`, `departureDate`: time budget
- `travelMode`: walk | bike | car | transit (for travel to next stop)

### Corridor
A drawn path between two Maps, with an adaptive-width search area.

- `path[]`: simplified lat/lng polyline
- `width`: search corridor width in km
- `focusZones[]`: optional drill-down points with custom radius + keyword
- `activities[]`: things discovered along this segment

### Timeline (Computed View)
A day-by-day itinerary derived from activities + stop durations + travel times. Not stored — always computed.

## 3. Data Model

```
Trip
  id, title, dateStart, dateEnd
  profile          → questionnaire snapshot (reusable)
  layers[]         → temporal versions
  stops[]          → ordered list of:
    Stop
      type: "map" | "corridor"
      order: number
      arrivalDate, departureDate
      travelMode: "walk" | "bike" | "car" | "transit"
      travelTimeToNext: minutes (estimated via OSRM)
      travelDistanceToNext: km

      [if map]
        mapId → links to Map entity
        stayDuration: hours

      [if corridor]
        path[]: {lat, lng}[]
        width: km
        focusZones[]: {lat, lng, radius, keyword}[]
        activities[]

Timeline (computed)
  Day { date, segments[] }
    Segment { type: "stay" | "travel", stop, duration, activities[] }
```

## 4. UX Flows

### 4.1 Entry Points

1. **"New Trip"** button on home screen → empty trip, add stops
2. **From existing maps** → select maps, app suggests corridors between them
3. **From map view** → "Add to Trip" → pick or create a trip

### 4.2 Trip Builder Screen

Split view: map on top, draggable bottom sheet with stop list.

- **Map**: shows all stops as pins, corridors as shaded paths
- **Bottom sheet**: ordered stop list with travel times between them
- **Tap stop** → expand to see activities, edit stay duration, travel mode
- **Tap corridor** → see "along the way" activities, add focus zone
- **Long-press corridor** → "Split here" → new stop inserted, corridor splits in two
- **Drag stops** to reorder
- **Swipe stop** to remove (adjacent corridors auto-merge)
- **Draw on map** → new corridor between stops or extending the trip

### 4.3 Corridor Drawing

**Freehand mode:**
1. Tap "Draw route" button (or long-press map between two stops)
2. Map enters drawing mode — finger draws freely
3. Thin blue line follows finger in real-time
4. On lift: Douglas-Peucker simplification → Bezier curve → shaded corridor appears
5. Pinch corridor edges to adjust width
6. Tap/drag waypoints to reshape

**Quick mode (two-point):**
- Tap point A, then point B → straight corridor with adaptive width

**Adaptive width:** `clamp(totalLength * 0.1, 10km, 100km)`

**Editing:** Corridors are fully editable after creation — change route, direction, width, waypoints.

### 4.4 Timeline / Stay Planner

Dual view toggle: Map | Timeline

**Timeline layout:**
- Grouped by day
- Each day shows: travel segments + stay segments
- Activities with `time_start` are placed in time slots
- Activities without times go to "unscheduled" pool — user can drag into slots
- Corridor activities shown as "Along the way" under travel segments
- Time budget warnings: orange if overscheduled, red if travel overlaps scheduled activity

**Permanent vs. Dated:**
- Permanent activities (no date): shown as "anytime" suggestions, persist across re-runs
- Dated events: pinned to their date, refreshed on re-run

### 4.5 Trip Re-run

1. Open existing trip → "Refresh activities" button
2. Optionally update dates and/or questionnaire profile
3. App re-runs all searches (maps + corridors) with new parameters
4. New layer created — old layer preserved
5. User can toggle between layers to compare

## 5. Search Strategy

### 5.1 Corridor Search (Segmented but Seamless)

User draws a 270km corridor. Behind the scenes:

1. Sample the corridor polyline every ~50km → get segment centers
2. Reverse-geocode each center to identify the nearest notable area
3. Build one prompt per segment, scoped to that area + user interests
4. Run all segment prompts **in parallel**
5. Merge results, deduplicate by name + location proximity (<500m)
6. Display as unified result on the corridor map

User sees: "Searching along your route..." → progress bar → all results appear.

### 5.2 Full Trip Search

```
Trip: Rome → corridor → Orvieto → corridor → Florence

Auto-generated search plan:
1. Rome MAP search (city search, uses questionnaire)
2. Rome→Orvieto CORRIDOR search (auto-segmented)
3. Orvieto MAP search
4. Orvieto→Florence CORRIDOR search (auto-segmented)
5. Florence MAP search

All run in parallel. Progress: "Searching 5 areas... 3/5 done"
```

### 5.3 Focus Zones

User taps a point on a corridor → "Find more here" → additional prompt scoped to that point + radius + optional keyword ("thermal baths near Saturnia").

## 6. Storage Architecture

### Phase 1 (Current): localStorage only
All existing functionality unchanged.

### Phase 2 (Trip feature): IndexedDB + Flatbush
New Trip/Corridor/Activity data goes to IndexedDB.

**Why IndexedDB + Flatbush:**
- Universal support (iOS Safari, Android, all desktops)
- No size limit (vs. 5-10MB localStorage)
- Flatbush: 4KB gzipped, sub-ms bounding-box queries on 100K+ points
- No WASM overhead (vs. SQLite)

**IndexedDB stores:**
- `activities` → { id, mapId, tripId, lat, lng, date, ... } — indexed on date, mapId, tripId
- `maps` → { id, title, center, radius, ... }
- `trips` → { id, title, stops[], ... }
- `corridors` → { id, tripId, path[], width, ... }

**Spatial index:** Flatbush rebuilt on app boot from activities store (~10ms for 10K points).

**Query patterns:**
- Bounding box → Flatbush
- By date → IndexedDB index
- By map/trip → IndexedDB index
- Permanent (no date) → IndexedDB index where date is null

### Phase 3 (Migration): Move existing data
On first boot after update, copy `map_data_*` from localStorage to IndexedDB, keep localStorage copy until verified.

## 7. External Configuration

### 7.1 Sources Catalog (Done)
`sources.json` — loadable from configurable URL. Already implemented.

### 7.2 Questionnaire Structure (New)
`questionnaire.json` — same pattern as sources. Defines sections, options, and prompt mappings. Configurable URL in Settings. Allows user customization.

## 8. Technology Choices

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Spatial index | Flatbush | 4KB, universal, sub-ms queries |
| Storage | IndexedDB | No size limit, cross-platform |
| Travel time | OSRM (public/self-hosted) | Free, open-source, no API key |
| Path simplification | Douglas-Peucker | Standard, ~30 lines of code |
| Corridor rendering | Leaflet L.Polyline + L.Polygon | No plugin needed |
| Drawing | Touch/mouse events + simplification | Lightweight, no heavy plugin |

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| LLM hallucinations in remote corridor areas | source_url verification, cross-reference prompt |
| IndexedDB migration data loss | Keep localStorage copy until verified |
| Freehand drawing imprecise on small screens | Two-point quick mode as fallback |
| OSRM public instance unreliable | Straight-line with speed multiplier as fallback |
| Corridor search quality varies by region | Focus zones for drill-down; user can add local sources |

## 10. Implementation Plan

### Phase 1: Foundation
- [ ] IndexedDB storage abstraction (`spatial-db.js`)
- [ ] Flatbush integration for spatial queries
- [ ] Migration logic (localStorage → IndexedDB)

### Phase 2: Trip Data Model
- [ ] Trip CRUD (create, read, update, delete)
- [ ] Stop ordering and management
- [ ] Corridor data structure

### Phase 3: Corridor Drawing
- [ ] Freehand drawing on Leaflet (touch + mouse events)
- [ ] Douglas-Peucker path simplification
- [ ] Corridor polygon rendering (shaded area)
- [ ] Adaptive width calculation
- [ ] Two-point quick mode
- [ ] Corridor editing (drag waypoints, adjust width)

### Phase 4: Trip Builder Screen
- [ ] Map + bottom sheet layout
- [ ] Stop list with travel times
- [ ] Add/remove/reorder stops
- [ ] Split corridor (add stop in the middle)
- [ ] Travel mode selector per segment
- [ ] OSRM travel time estimation

### Phase 5: Corridor Search
- [ ] Auto-segmentation of corridor into ~50km segments
- [ ] Parallel LLM search per segment
- [ ] Result merging and deduplication
- [ ] Focus zone UI and search
- [ ] Progress indicator

### Phase 6: Timeline / Stay Planner
- [ ] Day-by-day computed timeline view
- [ ] Dual toggle (Map | Timeline)
- [ ] Activity scheduling (drag to time slots)
- [ ] Time budget warnings
- [ ] Permanent vs. dated activity handling

### Phase 7: Trip Re-run & Layers
- [ ] Temporal layer system
- [ ] Re-run with new dates/interests
- [ ] Layer toggling and comparison
- [ ] Permanent activity persistence

### Phase 8: Externalize Questionnaire
- [ ] `questionnaire.json` file structure
- [ ] Configurable URL in Settings
- [ ] Dynamic questionnaire rendering from JSON

## 11. Decision Log

| # | Decision | Alternatives Considered | Rationale |
|---|----------|------------------------|-----------|
| 1 | Trip = ordered graph of Maps + Corridors | Flat stop list; single corridor | Matches mental model of real road trips |
| 2 | Freehand corridor drawing + two-point quick mode | Tap waypoints only; routing API | Exploration over navigation — sketch is faster |
| 3 | Adaptive corridor width (10-100km) with visual adjustment | Fixed width; user slider only | Smart default reduces friction; drag gives control |
| 4 | Auto-segmented LLM search (~50km segments, parallel) | Single prompt; manual segments | Quality (segmented) + UX (seamless) |
| 5 | Focus zones as optional drill-down | Always segment; no drill-down | YAGNI but valuable for power users |
| 6 | Temporal layers for trip re-runs | Replace old; archive versions | Permanent activities persist, dated events refresh |
| 7 | Timeline = computed view, not stored | Stored timeline | Avoids sync issues, always consistent |
| 8 | IndexedDB + Flatbush | localStorage; SQLite WASM | Universal cross-platform, no size limit, 4KB lib |
| 9 | Incremental migration (not big bang) | Full migration on update | Zero risk of data loss |
| 10 | OSRM for travel time (free, open-source) | Google Directions; manual input | No API key, GPL-aligned |
| 11 | Questionnaire externalized to JSON | Hardcoded (current) | Same proven pattern as sources.json |
| 12 | Trips reusable as templates | One-time; clone manually | Explicitly requested |
| 13 | Split corridors by adding stops | Fixed structure | Explicitly requested |
| 14 | Travel mode per stop segment | Global mode | Different legs use different transport |

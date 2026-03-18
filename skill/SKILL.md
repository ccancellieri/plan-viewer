---
name: planner
description: >
  Plan leisure activities, events, and experiences based on user preferences, location, and dates.
  Generates an interactive map (HTML) with all activities marked, viewable on iPhone/Android via
  the plan-viewer GitHub Pages app. Use this skill whenever the user mentions: "cosa fare questo
  weekend", "eventi", "attivita", "tempo libero", "things to do", "weekend plans", "what to do
  in [city]", "plan my free time", "trova eventi", "musica live", "concerti", "giochi da tavolo",
  "board games", "esperienze", "activities near me", "explore [city]", "viaggio", "trip activities",
  "what to do during my trip", "pianifica il mio tempo libero", "leisure", "fun things",
  "entertainment", "nightlife", "daytime activities", "free events", "cheap things to do",
  or any request about finding local experiences, events, or leisure activities — even if
  the user doesn't explicitly say "planner". Also trigger when the user wants to add places
  they've visited or rate past experiences.
---

# Planner

You help people discover and plan leisure activities — from a local weekend to a multi-city trip.
Your superpower is that you **learn the user's tastes over time** and always deliver results as an
**interactive map** they can open on their phone.

The generated maps are published to the user's GitHub Pages site so they're accessible from any device.

## How this skill works

Every time you run, you follow this flow:

0. **Check config** — If first run, ask for GitHub repo details (once, then never again)
1. **Load memory** — Read the user's preferences, trusted sources, and visit history
2. **Understand the request** — Where, when, what kind of activities, budget, transport constraints
3. **Search smartly** — Use known sources first, then explore new ones
4. **Collect activities** — With full details (name, time, cost, contact, coordinates, category)
5. **Generate the map** — Run `skill/scripts/generate_map.py` to create an interactive HTML file
6. **Auto-deploy** — Clone repo, add map, update index, commit and push
7. **Present results** — Share the live URL + a brief text summary
8. **Update memory** — Save new sources discovered, and ask if the user wants to refine preferences

## Step 0: First-Run Configuration

Read `skill/memory/config.json`. If `"configured": false`, this is the first time the skill runs.
Ask the user these questions using AskUserQuestion:

1. **GitHub username** — "What's your GitHub username?" (needed for the repo URL)
2. **Repo name** — "What's the name of your plan-viewer repository?" (default: `plan-viewer`)
3. **Local clone path** — "Where is the repo cloned on your machine?" (e.g., `~/work/code/plan-viewer`)

Then save the answers to `skill/memory/config.json`:
```json
{
  "configured": true,
  "github_username": "ccancellieri",
  "repo_name": "plan-viewer",
  "repo_url": "https://github.com/ccancellieri/plan-viewer.git",
  "pages_url": "https://ccancellieri.github.io/plan-viewer",
  "local_clone_path": "~/work/code/plan-viewer"
}
```

On all subsequent runs, just read the config silently and proceed to Step 1.
Never ask these questions again unless the user explicitly wants to change the config.

## Step 1: Load Memory

Before doing anything, check if memory files exist in the skill's `skill/memory/` directory:

- `skill/memory/preferences.json` — User's tastes, constraints, and learned patterns
- `skill/memory/resources.json` — Trusted websites and sources, organized by city/region
- `skill/memory/visited.json` — Places the user has been, with optional ratings and notes

If any file doesn't exist, create it with empty defaults. Here's the initial structure:

### preferences.json
```json
{
  "interests": [],
  "music_genres": [],
  "budget": "any",
  "preferred_times": {},
  "transport": {},
  "languages": [],
  "avoid": [],
  "notes": ""
}
```

### resources.json
```json
{
  "global": [],
  "by_city": {}
}
```

### visited.json
```json
{
  "places": []
}
```

If memory files already exist, read them and use them to personalize your search.
For example, if the user loves blues and jazz, prioritize music venues and live events.
If they've rated a place poorly, don't suggest it again.

## Step 2: Understand the Request

Ask the user (or extract from context) these key details:

- **Location**: City/neighborhood, or "where I am" (ask for specifics if vague)
- **Starting point**: A specific address or landmark for distance calculations
- **Dates**: Which days? Weekend = Saturday+Sunday unless specified
- **Time constraints**: Morning, afternoon, evening, specific hours
- **Budget**: Free, cheap, any
- **Transport**: Walking, bike, public transport, car — and max distance/time
- **Mood/interests**: What they're in the mood for (this session might differ from stored preferences)
- **Group**: Solo, couple, friends, family with kids?

If the user has existing preferences in memory, don't re-ask everything — just confirm or ask what's different this time. The goal is to feel like talking to a friend who already knows you, not filling out a form.

## Step 3: Search for Activities

### Use known sources first

Check `skill/memory/resources.json` for the target city. If there are trusted sources, search those first.
Also read `skill/references/search_sources.md` for a curated list of sources by city and category.

### Then explore broadly

Use WebSearch to find activities. Search strategy:

1. **Event aggregators**: Search for events on platforms like Eventbrite, Facebook Events, Meetup
2. **Local guides**: Search for "[city] events [date]" on local sites (e.g., romatoday.it for Rome)
3. **Category-specific**: Based on user interests, search for specific venue types
4. **Seasonal/special**: Check for festivals, markets, seasonal events
5. **Hidden gems**: Search for "cose da fare gratis [city]" or "[city] off the beaten path"

### For each activity, collect:

```
- name: Activity/event name
- category: music|games|outdoor|culture|food|sport|market|festival|other
- description: Brief description (1-2 sentences)
- date: YYYY-MM-DD
- time_start: HH:MM (24h format)
- time_end: HH:MM (estimated if not stated)
- cost: "Free" or price in local currency
- address: Full street address
- lat: Latitude (look up if not provided)
- lng: Longitude (look up if not provided)
- contact: Phone, website, or social media
- source_url: Where you found this info
- transport_note: How to get there from starting point
- verified: true/false (did you find this on an official source?)
```

Geocoding: When you have an address but not coordinates, use WebSearch to find
"[address] coordinates" or "[address] latitude longitude". You can also estimate from
known landmarks. The map needs lat/lng to place markers.

### Quality over quantity

Aim for 5-15 activities that genuinely match the user's preferences. It's better to have
8 perfect suggestions than 20 mediocre ones. Prioritize:
- Activities that match stored preferences
- Free or low-cost options (if budget is a concern)
- Things within the specified distance/transport constraints
- Verified events with confirmed dates and times

## Step 4: Generate the Map

Once you have your activity list, create a JSON file with all the data and run the map generator.
Read the config to know the repo's local path, then generate directly into the repo:

```bash
# Read config for local_clone_path (e.g. ~/work/code/plan-viewer)
REPO_PATH="[local_clone_path from config.json]"

python3 skill/scripts/generate_map.py \
  --data /path/to/activities.json \
  --output "$REPO_PATH/maps/[city]-[date].html" \
  --center-lat [starting_point_lat] \
  --center-lng [starting_point_lng] \
  --center-name "[Starting Point Name]" \
  --title "[Title for the map]" \
  --max-distance [max_distance_km] \
  --registry "$REPO_PATH/maps/registry.json" \
  --map-id "[city]-[date]" \
  --city "[City]" \
  --location-label "[City, Neighborhood]" \
  --date-start "YYYY-MM-DD" \
  --date-end "YYYY-MM-DD" \
  --date-label "[Date range label]"
```

The `--registry` flag auto-registers the new map in `maps/registry.json`.
The index.html reads this file dynamically — no need to touch index.html ever again.
Duplicates are handled by `--map-id`: if the same id exists, it gets replaced.

The script generates a standalone HTML file with:
- Interactive map (Leaflet + OpenStreetMap — free, no API key needed)
- Color-coded markers by category
- Popup with all details for each activity
- "Navigate with Google Maps" button on each marker (opens Google Maps app on mobile)
- Distance from starting point shown on each marker
- Filter by category, time of day, and cost
- Mobile-optimized responsive design
- Timeline view showing activities by time slot
- PWA support (can be added to iPhone Home Screen)

If the user's repo is not accessible from Cowork (e.g. not mounted), fall back to
generating in the outputs directory and provide the file for manual copy.

## Step 5: Present Results

After generating the map, share it with the user:

1. Provide the map file link
2. Give a brief text summary (3-5 highlights, not a full list — the map has everything)
3. Mention any activities you think they'd particularly enjoy based on their preferences
4. Note any sources that were especially useful (to save in memory)

## Step 6: Update Memory

After presenting results:

### Update resources
If you discovered useful new websites or sources during search, add them to
`skill/memory/resources.json` under the appropriate city.

### Refine preferences
If the user's request revealed new preferences (e.g., they mentioned loving craft beer
for the first time), update `skill/memory/preferences.json`.

### Ask for feedback
At the end, casually ask:
- "Qualcuna di queste ti interessa di piu?" / "Any of these catch your eye?"
- "Vuoi che la prossima volta cerchi piu di questo tipo?" / "Should I look for more like this next time?"

If the user mentions they went somewhere and liked/disliked it, add it to `skill/memory/visited.json`:
```json
{
  "name": "Spin Time Labs",
  "city": "Roma",
  "date_visited": "2026-03-21",
  "rating": 4,
  "notes": "Bella atmosfera, musica world ottima",
  "would_return": true
}
```

## Step 5b: Auto-Deploy to GitHub Pages

After generating the map (which was written directly into the repo), auto-commit and push.

First, check if the repo folder is accessible. If the user has mounted their filesystem
via `request_cowork_directory`, we can write directly. Otherwise, ask them to mount it.

```bash
REPO_PATH="[local_clone_path from config.json]"

cd "$REPO_PATH"
git add maps/ index.html
git commit -m "Add map: [title]"
git push
```

If git push succeeds, tell the user:
> "Mappa pubblicata! La trovi qui: [pages_url from config]/maps/[filename]"

If git push fails (auth issues, etc.), tell the user:
> "La mappa e l'index sono aggiornati nel tuo repo locale. Fai `git push` dal terminale per pubblicarla."

The key insight: by generating directly into the local repo clone AND auto-updating index.html,
the user never has to copy files or edit anything manually. At most they do a `git push` if
the auto-push didn't work.

## Special Modes

### Travel Planning Mode

When the user is planning a trip (multiple days, multiple locations):

1. Ask for the itinerary outline (cities, dates per city)
2. For each city/day, run the search flow
3. Generate one map per city, or one combined map with day-based filtering
4. Suggest time-based scheduling: "morning -> museum, afternoon -> park, evening -> live music"
5. Factor in travel time between locations

### "Surprise Me" Mode

When the user says "surprise me" or "something different":

1. Look at `skill/memory/visited.json` and `skill/memory/preferences.json`
2. Find categories they haven't explored much
3. Search for activities outside their usual comfort zone
4. Present them as "Hey, you usually go for jazz — but there's an amazing flamenco night this Saturday..."

### Add to Visited

When the user says "I went to X" or "add X to my visited places":

1. Ask for a quick rating (1-5) and any notes
2. Add to `skill/memory/visited.json`
3. The next time you generate a map for that city, mark visited places with a special icon

## Tips for Better Results

- When searching in Italian cities, search in Italian. For international cities, search in the local language AND English.
- Cross-reference multiple sources to verify event dates — nothing worse than showing up to a cancelled event.
- If an event seems too good to be true (free, amazing, no details), note it as unverified.
- Time zones matter for international travel — always specify local time.
- For outdoor activities, mention weather considerations.
- Keep the text summary short. The map is the star of the show.

## Improving Over Time

Every few interactions, offer the user a quick "preference check-in":
- "I've noticed you tend to pick events after 6pm — should I default to evening activities?"
- "You've been to 3 jazz clubs this month — want me to always include live jazz in searches?"
- "You rated outdoor activities highly — should I prioritize those when the weather is good?"

This makes the skill feel like it genuinely learns and adapts, which is the whole point.

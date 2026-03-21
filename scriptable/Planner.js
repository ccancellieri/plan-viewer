// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: purple; icon-glyph: map-marked-alt;

/*
 * Copyright 2026 Carlo Cancellieri <ccancellieri@hotmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Planner for Scriptable (iOS)
 *
 * A self-contained leisure activity planner that:
 * - Calls LLM APIs (Claude, Gemini, Perplexity, DeepSeek, etc.) to find activities
 * - Generates interactive Leaflet maps viewable in-app
 * - Stores everything locally in iCloud Drive
 * - No server, no App Store, no GitHub needed
 *
 * Note: The generated HTML map uses DOM manipulation for rendering
 * activity data. All data originates from the user's own LLM API
 * calls on their personal device — there is no untrusted input.
 */

// ─── FILE MANAGER SETUP ─────────────────────────────────────────────────────

const fm = FileManager.iCloud();
const baseDir = fm.joinPath(fm.documentsDirectory(), "Planner");
const mapsDir = fm.joinPath(baseDir, "maps");

if (!fm.fileExists(baseDir)) fm.createDirectory(baseDir, true);
if (!fm.fileExists(mapsDir)) fm.createDirectory(mapsDir, true);

// ─── i18n ────────────────────────────────────────────────────────────────────

const STRINGS = {
  en: {
    mainTitle: "Planner", mainMsg: "What would you like to do?",
    newTrip: "Plan New Trip", myMaps: "My Maps", settings: "Settings", exit: "Exit",
    city: "Location", cityMsg: "Search for a place (city, address, landmark)",
    cityPlaceholder: "e.g. Roma, Central Park, Via Appia",
    searchBtn: "Search", useGPS: "Use GPS", cancel: "Cancel", next: "Next",
    dates: "Dates", datesMsg: "Choose date range",
    pickStart: "Pick start date", pickEnd: "Pick end date", typeDates: "Type dates manually",
    startDate: "Start date", endDate: "End date",
    startPoint: "Starting Point", useThis: "Use this?",
    provider: "AI Provider", providerMsg: "Which AI to search for activities?",
    apiKeyNeeded: "API Key Needed", apiKeyMsg: "Enter your API key:",
    saveAndContinue: "Save & Continue",
    searching: "Searching...", searchingMsg: "Finding activities in",
    searchWait: "This may take 10-30 seconds.",
    mapCreated: "Map Created!", found: "Found", activitiesIn: "activities in",
    mapsCollection: "maps in your collection", openNow: "Open the map now?",
    viewMap: "View Map", exportKml: "Export KML", done: "Done",
    error: "Error", noMaps: "No maps yet! Create your first trip.",
    back: "Back", delete: "Delete", deleteMap: "Delete Map?",
    activities: "activities",
    apiKeys: "API Keys", preferences: "Preferences", storage: "Storage Info",
    language: "Language", editInterests: "Edit Interests",
    editDistance: "Edit Max Distance", interests: "Interests",
    musicGenres: "Music genres", save: "Save",
    maxDistKm: "Max Distance (km)",
    mapsCount: "Maps", storageLoc: "Storage: iCloud Drive/Scriptable/Planner/",
    providersSet: "Providers configured",
    noResults: "No results found. Try a different search.",
    manualTitle: "Manual Mode",
    manualMsg: "The prompt has been copied to your clipboard.\n\n1. Open any AI chat (ChatGPT, Gemini, Perplexity...)\n2. Paste the prompt\n3. Copy the JSON response\n4. Come back here and paste it",
    manualOpen: "Open AI Chat", manualPaste: "Paste Response",
    manualPasteMsg: "Paste the JSON response from the AI:",
    searchResults: "Search Results", pickLocation: "Pick a location:",
    // Questionnaire
    qTitle: "Trip Profile", qMsg: "Let's customize your search!",
    qUseGlobal: "Start from my preferences", qUseMap: "Use this map's profile", qFromScratch: "Start fresh",
    qMood: "Mood / Vibe", qMoodMsg: "What are you in the mood for?",
    qMoodRelax: "Relaxing", qMoodAdventure: "Adventure", qMoodCulture: "Culture & Art",
    qMoodNightlife: "Nightlife & Music", qMoodFamily: "Family friendly", qMoodRomantic: "Romantic",
    qMoodFoodie: "Food & Drinks", qMoodSport: "Sport & Active",
    qTime: "Time of Day", qTimeMsg: "When do you want activities?",
    qTimeMorning: "Morning (before 12)", qTimeAfternoon: "Afternoon (12-18)",
    qTimeEvening: "Evening (18-22)", qTimeNight: "Night (after 22)", qTimeAllDay: "All day",
    qBudget: "Budget", qBudgetMsg: "How much do you want to spend?",
    qBudgetFree: "Free only", qBudgetCheap: "Cheap (< 15€)", qBudgetMedium: "Medium (15-50€)",
    qBudgetAny: "Any budget",
    qGroup: "Group", qGroupMsg: "Who are you going with?",
    qGroupSolo: "Solo", qGroupCouple: "Couple", qGroupFriends: "Friends",
    qGroupFamily: "Family with kids", qGroupLarge: "Large group",
    qDistance: "Max Distance", qDistanceMsg: "How far are you willing to go?",
    qDist1: "1 km (walking)", qDist3: "3 km (short walk)", qDist5: "5 km (bike)",
    qDist10: "10 km (bus/car)", qDist20: "20+ km (day trip)",
    qSpecific: "Specific Interests", qSpecificMsg: "Anything specific you want to find?\n(comma separated, leave empty to skip)",
    qSpecificPlaceholder: "e.g. jazz, craft beer, vintage market",
    qAvoid: "Avoid", qAvoidMsg: "Anything you want to avoid?\n(comma separated, leave empty to skip)",
    qAvoidPlaceholder: "e.g. crowded places, expensive restaurants",
    qSummary: "Search Profile", qConfirm: "Search with this profile?",
    qEditOrSearch: "Tap Search to go, or tap any field to edit it",
    qEdit: "Edit", qSearch: "Search!",
    // Add to map
    addToMap: "Add Events", addToMapMsg: "Search for more activities to add to this map",
    addToMapDone: "events added to the map", mergeConfirm: "Add these to the map?",
    addNew: "Add new events", existingEvents: "existing events",
    // Voice Plan
    voicePlan: "Voice Plan", voicePlanMsg: "Describe your trip in your own words.\nTap the microphone 🎤 on the keyboard to dictate!\n\nExample: \"Weekend in Rome with friends, live music and street food, evening, cheap, max 5km\"",
    voicePlaceholder: "Describe what you want to do...",
    voiceParsing: "Understanding your request...",
    voiceConfirm: "Here's what I understood:",
    voiceFailed: "Could not parse your request. Please try again or use the questionnaire.",
    quickAdd: "Quick Add (same profile)", addMoreModels: "Search with another AI too?",
    addAnotherModel: "Add another AI", multiModelMsg: "Pick one or more AIs to search with",
    searchApiInfo: "Search APIs boost results by feeding real web search data to the AI. Optional but recommended!",
  },
  it: {
    mainTitle: "Planner", mainMsg: "Cosa vuoi fare?",
    newTrip: "Nuovo Viaggio", myMaps: "Le Mie Mappe", settings: "Impostazioni", exit: "Esci",
    city: "Luogo", cityMsg: "Cerca un luogo (citta, indirizzo, punto di interesse)",
    cityPlaceholder: "es. Roma, Colosseo, Via Appia",
    searchBtn: "Cerca", useGPS: "Usa GPS", cancel: "Annulla", next: "Avanti",
    dates: "Date", datesMsg: "Scegli le date",
    pickStart: "Scegli data inizio", pickEnd: "Scegli data fine", typeDates: "Scrivi le date",
    startDate: "Data inizio", endDate: "Data fine",
    startPoint: "Punto di Partenza", useThis: "Usare questo?",
    provider: "Provider AI", providerMsg: "Quale AI usare per cercare attivita?",
    apiKeyNeeded: "Chiave API Necessaria", apiKeyMsg: "Inserisci la tua chiave API:",
    saveAndContinue: "Salva e Continua",
    searching: "Ricerca...", searchingMsg: "Cerco attivita a",
    searchWait: "Potrebbe richiedere 10-30 secondi.",
    mapCreated: "Mappa Creata!", found: "Trovate", activitiesIn: "attivita a",
    mapsCollection: "mappe nella collezione", openNow: "Aprire la mappa?",
    viewMap: "Vedi Mappa", exportKml: "Esporta KML", done: "Fatto",
    error: "Errore", noMaps: "Nessuna mappa! Crea il tuo primo viaggio.",
    back: "Indietro", delete: "Elimina", deleteMap: "Eliminare la mappa?",
    activities: "attivita",
    apiKeys: "Chiavi API", preferences: "Preferenze", storage: "Info Archivio",
    language: "Lingua", editInterests: "Modifica Interessi",
    editDistance: "Modifica Distanza Max", interests: "Interessi",
    musicGenres: "Generi musicali", save: "Salva",
    maxDistKm: "Distanza Massima (km)",
    mapsCount: "Mappe", storageLoc: "Archivio: iCloud Drive/Scriptable/Planner/",
    providersSet: "Provider configurati",
    noResults: "Nessun risultato. Prova un'altra ricerca.",
    manualTitle: "Modalita Manuale",
    manualMsg: "Il prompt e stato copiato negli appunti.\n\n1. Apri una chat AI (ChatGPT, Gemini, Perplexity...)\n2. Incolla il prompt\n3. Copia la risposta JSON\n4. Torna qui e incollala",
    manualOpen: "Apri Chat AI", manualPaste: "Incolla Risposta",
    manualPasteMsg: "Incolla la risposta JSON dalla AI:",
    searchResults: "Risultati Ricerca", pickLocation: "Scegli un luogo:",
    // Questionnaire
    qTitle: "Profilo Viaggio", qMsg: "Personalizziamo la ricerca!",
    qUseGlobal: "Parti dalle mie preferenze", qUseMap: "Usa il profilo di questa mappa", qFromScratch: "Parti da zero",
    qMood: "Mood / Atmosfera", qMoodMsg: "Che tipo di esperienza cerchi?",
    qMoodRelax: "Relax", qMoodAdventure: "Avventura", qMoodCulture: "Cultura & Arte",
    qMoodNightlife: "Vita notturna & Musica", qMoodFamily: "Per famiglie", qMoodRomantic: "Romantico",
    qMoodFoodie: "Cibo & Bevande", qMoodSport: "Sport & Attivita",
    qTime: "Orario", qTimeMsg: "Quando vuoi le attivita?",
    qTimeMorning: "Mattina (prima delle 12)", qTimeAfternoon: "Pomeriggio (12-18)",
    qTimeEvening: "Sera (18-22)", qTimeNight: "Notte (dopo le 22)", qTimeAllDay: "Tutto il giorno",
    qBudget: "Budget", qBudgetMsg: "Quanto vuoi spendere?",
    qBudgetFree: "Solo gratis", qBudgetCheap: "Economico (< 15€)", qBudgetMedium: "Medio (15-50€)",
    qBudgetAny: "Qualsiasi budget",
    qGroup: "Compagnia", qGroupMsg: "Con chi vai?",
    qGroupSolo: "Da solo/a", qGroupCouple: "In coppia", qGroupFriends: "Amici",
    qGroupFamily: "Famiglia con bambini", qGroupLarge: "Gruppo grande",
    qDistance: "Distanza Max", qDistanceMsg: "Quanto lontano vuoi andare?",
    qDist1: "1 km (a piedi)", qDist3: "3 km (passeggiata)", qDist5: "5 km (bici)",
    qDist10: "10 km (bus/auto)", qDist20: "20+ km (gita)",
    qSpecific: "Interessi Specifici", qSpecificMsg: "Qualcosa di specifico che vuoi trovare?\n(separati da virgola, lascia vuoto per saltare)",
    qSpecificPlaceholder: "es. jazz, birra artigianale, mercatino vintage",
    qAvoid: "Evitare", qAvoidMsg: "Qualcosa che vuoi evitare?\n(separati da virgola, lascia vuoto per saltare)",
    qAvoidPlaceholder: "es. posti affollati, ristoranti costosi",
    qSummary: "Profilo Ricerca", qConfirm: "Cercare con questo profilo?",
    qEditOrSearch: "Tocca Cerca per partire, o tocca un campo per modificarlo",
    qEdit: "Modifica", qSearch: "Cerca!",
    // Add to map
    addToMap: "Aggiungi Eventi", addToMapMsg: "Cerca altre attivita da aggiungere a questa mappa",
    addToMapDone: "eventi aggiunti alla mappa", mergeConfirm: "Aggiungere questi alla mappa?",
    addNew: "Aggiungi nuovi eventi", existingEvents: "eventi esistenti",
    // Voice Plan
    voicePlan: "Pianifica a Voce", voicePlanMsg: "Descrivi il tuo viaggio con parole tue.\nTocca il microfono 🎤 sulla tastiera per dettare!\n\nEsempio: \"Weekend a Roma con amici, musica live e street food, sera, economico, max 5km\"",
    voicePlaceholder: "Descrivi cosa vuoi fare...",
    voiceParsing: "Sto capendo la tua richiesta...",
    voiceConfirm: "Ecco cosa ho capito:",
    voiceFailed: "Non sono riuscito a interpretare la richiesta. Riprova o usa il questionario.",
    quickAdd: "Aggiungi Rapido (stesso profilo)", addMoreModels: "Cercare anche con un'altra AI?",
    addAnotherModel: "Aggiungi un'altra AI", multiModelMsg: "Scegli una o piu AI per cercare",
    searchApiInfo: "Le API di ricerca migliorano i risultati fornendo dati web reali alla AI. Opzionale ma consigliato!",
  },
  es: {
    mainTitle: "Planner", mainMsg: "Que quieres hacer?",
    newTrip: "Nuevo Viaje", myMaps: "Mis Mapas", settings: "Ajustes", exit: "Salir",
    city: "Lugar", cityMsg: "Buscar un lugar (ciudad, direccion, punto de interes)",
    cityPlaceholder: "ej. Roma, Coliseo, Via Appia",
    searchBtn: "Buscar", useGPS: "Usar GPS", cancel: "Cancelar", next: "Siguiente",
    dates: "Fechas", datesMsg: "Elige las fechas",
    pickStart: "Elegir fecha inicio", pickEnd: "Elegir fecha fin", typeDates: "Escribir fechas",
    startDate: "Fecha inicio", endDate: "Fecha fin",
    startPoint: "Punto de Partida", useThis: "Usar este?",
    provider: "Proveedor AI", providerMsg: "Que AI usar para buscar actividades?",
    apiKeyNeeded: "Clave API Necesaria", apiKeyMsg: "Introduce tu clave API:",
    saveAndContinue: "Guardar y Continuar",
    searching: "Buscando...", searchingMsg: "Buscando actividades en",
    searchWait: "Puede tardar 10-30 segundos.",
    mapCreated: "Mapa Creado!", found: "Encontradas", activitiesIn: "actividades en",
    mapsCollection: "mapas en tu coleccion", openNow: "Abrir el mapa?",
    viewMap: "Ver Mapa", exportKml: "Exportar KML", done: "Hecho",
    error: "Error", noMaps: "Sin mapas! Crea tu primer viaje.",
    back: "Atras", delete: "Eliminar", deleteMap: "Eliminar mapa?",
    activities: "actividades",
    apiKeys: "Claves API", preferences: "Preferencias", storage: "Info Almacenamiento",
    language: "Idioma", editInterests: "Editar Intereses",
    editDistance: "Editar Distancia Max", interests: "Intereses",
    musicGenres: "Generos musicales", save: "Guardar",
    maxDistKm: "Distancia Maxima (km)",
    mapsCount: "Mapas", storageLoc: "Almacenamiento: iCloud Drive/Scriptable/Planner/",
    providersSet: "Proveedores configurados",
    noResults: "Sin resultados. Prueba otra busqueda.",
    manualTitle: "Modo Manual",
    manualMsg: "El prompt se ha copiado al portapapeles.\n\n1. Abre un chat AI (ChatGPT, Gemini, Perplexity...)\n2. Pega el prompt\n3. Copia la respuesta JSON\n4. Vuelve aqui y pegala",
    manualOpen: "Abrir Chat AI", manualPaste: "Pegar Respuesta",
    manualPasteMsg: "Pega la respuesta JSON del AI:",
    searchResults: "Resultados", pickLocation: "Elige un lugar:",
    // Questionnaire
    qTitle: "Perfil de Viaje", qMsg: "Personalicemos tu busqueda!",
    qUseGlobal: "Partir de mis preferencias", qUseMap: "Usar el perfil de este mapa", qFromScratch: "Empezar de cero",
    qMood: "Mood / Ambiente", qMoodMsg: "Que tipo de experiencia buscas?",
    qMoodRelax: "Relax", qMoodAdventure: "Aventura", qMoodCulture: "Cultura & Arte",
    qMoodNightlife: "Vida nocturna & Musica", qMoodFamily: "Para familias", qMoodRomantic: "Romantico",
    qMoodFoodie: "Comida & Bebida", qMoodSport: "Deporte & Actividad",
    qTime: "Horario", qTimeMsg: "Cuando quieres actividades?",
    qTimeMorning: "Manana (antes de 12)", qTimeAfternoon: "Tarde (12-18)",
    qTimeEvening: "Noche (18-22)", qTimeNight: "Noche (despues de 22)", qTimeAllDay: "Todo el dia",
    qBudget: "Presupuesto", qBudgetMsg: "Cuanto quieres gastar?",
    qBudgetFree: "Solo gratis", qBudgetCheap: "Barato (< 15€)", qBudgetMedium: "Medio (15-50€)",
    qBudgetAny: "Cualquier presupuesto",
    qGroup: "Compania", qGroupMsg: "Con quien vas?",
    qGroupSolo: "Solo/a", qGroupCouple: "En pareja", qGroupFriends: "Amigos",
    qGroupFamily: "Familia con ninos", qGroupLarge: "Grupo grande",
    qDistance: "Distancia Max", qDistanceMsg: "Que tan lejos quieres ir?",
    qDist1: "1 km (caminando)", qDist3: "3 km (paseo corto)", qDist5: "5 km (bici)",
    qDist10: "10 km (bus/coche)", qDist20: "20+ km (excursion)",
    qSpecific: "Intereses Especificos", qSpecificMsg: "Algo especifico que quieras encontrar?\n(separados por coma, deja vacio para saltar)",
    qSpecificPlaceholder: "ej. jazz, cerveza artesanal, mercadillo vintage",
    qAvoid: "Evitar", qAvoidMsg: "Algo que quieras evitar?\n(separados por coma, deja vacio para saltar)",
    qAvoidPlaceholder: "ej. sitios llenos, restaurantes caros",
    qSummary: "Perfil de Busqueda", qConfirm: "Buscar con este perfil?",
    qEditOrSearch: "Toca Buscar para empezar, o toca un campo para editarlo",
    qEdit: "Editar", qSearch: "Buscar!",
    // Add to map
    addToMap: "Anadir Eventos", addToMapMsg: "Buscar mas actividades para anadir a este mapa",
    addToMapDone: "eventos anadidos al mapa", mergeConfirm: "Anadir estos al mapa?",
    addNew: "Anadir nuevos eventos", existingEvents: "eventos existentes",
    // Voice Plan
    voicePlan: "Planificar con Voz", voicePlanMsg: "Describe tu viaje con tus palabras.\nToca el microfono 🎤 en el teclado para dictar!\n\nEjemplo: \"Fin de semana en Roma con amigos, musica en vivo y comida callejera, noche, barato, max 5km\"",
    voicePlaceholder: "Describe lo que quieres hacer...",
    voiceParsing: "Entendiendo tu solicitud...",
    voiceConfirm: "Esto es lo que entendi:",
    voiceFailed: "No pude interpretar la solicitud. Intenta de nuevo o usa el cuestionario.",
    quickAdd: "Agregar Rapido (mismo perfil)", addMoreModels: "Buscar tambien con otra IA?",
    addAnotherModel: "Agregar otra IA", multiModelMsg: "Elige una o mas IAs para buscar",
    searchApiInfo: "Las APIs de busqueda mejoran los resultados proporcionando datos web reales a la IA. Opcional pero recomendado!",
  },
};

const langPath = fm.joinPath(baseDir, "language.txt");
function getLang() {
  if (fm.fileExists(langPath)) {
    if (!fm.isFileDownloaded(langPath)) fm.downloadFileFromiCloud(langPath);
    var l = fm.readString(langPath).trim();
    if (STRINGS[l]) return l;
  }
  return "en";
}
function setLang(l) { fm.writeString(langPath, l); }
function t(key) { return (STRINGS[getLang()] || STRINGS.en)[key] || key; }

// ─── CATEGORIES ──────────────────────────────────────────────────────────────

const CATEGORIES = {
  music:    { color: "#e74c3c", icon: "🎵", label: "Musica" },
  games:    { color: "#9b59b6", icon: "🎲", label: "Giochi" },
  outdoor:  { color: "#27ae60", icon: "🌳", label: "Outdoor" },
  culture:  { color: "#3498db", icon: "🎨", label: "Cultura" },
  food:     { color: "#f39c12", icon: "🍕", label: "Cibo" },
  sport:    { color: "#1abc9c", icon: "⚽", label: "Sport" },
  market:   { color: "#e67e22", icon: "🛍️", label: "Mercato" },
  festival: { color: "#e91e63", icon: "🎉", label: "Festival" },
  other:    { color: "#95a5a6", icon: "📍", label: "Altro" },
};

// ─── HAVERSINE ───────────────────────────────────────────────────────────────

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── JSON FILE HELPERS ───────────────────────────────────────────────────────

function readJSON(path, fallback) {
  if (fm.fileExists(path)) {
    if (!fm.isFileDownloaded(path)) fm.downloadFileFromiCloud(path);
    return JSON.parse(fm.readString(path));
  }
  return fallback;
}

function writeJSON(path, data) {
  fm.writeString(path, JSON.stringify(data, null, 2));
}

// ─── PREFERENCES & REGISTRY ─────────────────────────────────────────────────

const prefsPath = fm.joinPath(baseDir, "preferences.json");
const resourcesPath = fm.joinPath(baseDir, "resources.json");
const registryPath = fm.joinPath(mapsDir, "registry.json");

function loadPreferences() {
  return readJSON(prefsPath, {
    interests: ["musica live", "giochi da tavolo", "cultura", "festival", "eventi gratuiti"],
    music_genres: ["blues", "taranta", "jazz", "rock"],
    budget: "gratis o low-cost",
    transport: { mode: ["bicicletta", "a piedi"], max_distance_km: 4 },
    languages: ["italiano", "english"],
    avoid: [],
    notes: "",
  });
}

function loadResources() {
  return readJSON(resourcesPath, { global: [], by_city: {} });
}

function loadRegistry() {
  return readJSON(registryPath, []);
}

function saveRegistry(registry) {
  writeJSON(registryPath, registry);
}

// ─── NOMINATIM GEOCODING (OpenStreetMap, free) ──────────────────────────────

async function searchLocation(query) {
  var url = "https://nominatim.openstreetmap.org/search?q=" +
    encodeURIComponent(query) +
    "&format=json&limit=5&addressdetails=1";
  var req = new Request(url);
  req.headers = { "User-Agent": "Planner-Scriptable/1.0" };
  var results = await req.loadJSON();
  return results.map(function(r) {
    return {
      name: r.display_name,
      shortName: [r.address.city || r.address.town || r.address.village || r.name,
                   r.address.state, r.address.country].filter(Boolean).join(", "),
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      city: r.address.city || r.address.town || r.address.village || r.name || query,
    };
  });
}

async function reverseGeocode(lat, lng) {
  var url = "https://nominatim.openstreetmap.org/reverse?lat=" + lat + "&lon=" + lng +
    "&format=json&addressdetails=1&zoom=16";
  var req = new Request(url);
  req.headers = { "User-Agent": "Planner-Scriptable/1.0" };
  var r = await req.loadJSON();
  if (!r || r.error) return null;
  var addr = r.address || {};
  return {
    name: r.display_name,
    shortName: [addr.road, addr.suburb || addr.neighbourhood, addr.city || addr.town || addr.village].filter(Boolean).join(", "),
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    city: addr.city || addr.town || addr.village || addr.county || "Unknown",
    neighbourhood: addr.suburb || addr.neighbourhood || addr.quarter || "",
  };
}

// ─── API KEY MANAGEMENT (Keychain) ──────────────────────────────────────────

const PROVIDERS = {
  gemini: {
    label: "Gemini + Google Search - FREE",
    keyName: "lp_google_ai_key",
    model: "gemini-2.5-flash",
    free: true,
    webSearch: true,
    signupUrl: "https://aistudio.google.com/apikey",
  },
  groq: {
    label: "Groq + Web Search - FREE",
    keyName: "lp_groq_key",
    model: "llama-3.3-70b-versatile",
    free: true,
    webSearch: true,
    signupUrl: "https://console.groq.com/keys",
  },
  mistral: {
    label: "Mistral + Web Search - FREE",
    keyName: "lp_mistral_key",
    model: "mistral-small-latest",
    free: true,
    webSearch: true,
    signupUrl: "https://console.mistral.ai/api-keys",
  },
  cohere: {
    label: "Cohere Command R+ - FREE",
    keyName: "lp_cohere_key",
    model: "command-r-plus",
    free: true,
    webSearch: true,
    signupUrl: "https://dashboard.cohere.com/api-keys",
  },
  deepseek: {
    label: "DeepSeek V3 - FREE credits",
    keyName: "lp_deepseek_key",
    model: "deepseek-chat",
    free: true,
    webSearch: false,
    signupUrl: "https://platform.deepseek.com/",
  },
  grok: {
    label: "Grok (xAI) - FREE credits",
    keyName: "lp_grok_key",
    model: "grok-3-mini-fast",
    free: true,
    webSearch: false,
    signupUrl: "https://console.x.ai/",
  },
  claude: {
    label: "Claude (Anthropic)",
    keyName: "lp_anthropic_key",
    model: "claude-sonnet-4-20250514",
    free: false,
    webSearch: false,
    signupUrl: "https://console.anthropic.com/settings/keys",
  },
  perplexity: {
    label: "Perplexity (web search)",
    keyName: "lp_perplexity_key",
    model: "sonar",
    free: false,
    webSearch: true,
    signupUrl: "https://www.perplexity.ai/settings/api",
  },
  manual: {
    label: "Manual (copy prompt to any AI)",
    keyName: null,
    model: null,
    free: true,
    webSearch: false,
    signupUrl: null,
  },
};

// Web search APIs (used to boost LLM prompts with real search results)
const SEARCH_APIS = {
  tavily: {
    label: "Tavily - FREE 1000/month",
    keyName: "lp_tavily_key",
    signupUrl: "https://app.tavily.com/home",
  },
  serper: {
    label: "Serper (Google) - FREE 2500",
    keyName: "lp_serper_key",
    signupUrl: "https://serper.dev/api-key",
  },
};

function getSearchApiKey(api) {
  var keyName = SEARCH_APIS[api].keyName;
  if (Keychain.contains(keyName)) return Keychain.get(keyName);
  return null;
}

function setSearchApiKey(api, key) {
  Keychain.set(SEARCH_APIS[api].keyName, key);
}

function getApiKey(provider) {
  if (provider === "manual") return "manual";
  const keyName = PROVIDERS[provider].keyName;
  if (Keychain.contains(keyName)) return Keychain.get(keyName);
  return null;
}

function setApiKey(provider, key) {
  Keychain.set(PROVIDERS[provider].keyName, key);
}

// ─── LLM API CALLS ──────────────────────────────────────────────────────────

async function callClaude(apiKey, systemPrompt, userPrompt) {
  const req = new Request("https://api.anthropic.com/v1/messages");
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  req.body = JSON.stringify({
    model: PROVIDERS.claude.model,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });
  const resp = await req.loadJSON();
  if (resp.error) throw new Error("Claude: " + resp.error.message);
  return resp.content[0].text;
}

async function callGemini(apiKey, systemPrompt, userPrompt) {
  var baseUrl = "https://generativelanguage.googleapis.com/v1beta/models/";
  var body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 4096 },
    tools: [{ google_search: {} }],
  };

  // Try with google_search first, fallback without it if it fails
  var resp;
  for (var attempt = 0; attempt < 2; attempt++) {
    if (attempt === 1) {
      delete body.tools; // retry without google_search
    }
    var url = baseUrl + PROVIDERS.gemini.model + ":generateContent?key=" + apiKey;
    var req = new Request(url);
    req.method = "POST";
    req.headers = { "Content-Type": "application/json" };
    req.body = JSON.stringify(body);
    resp = await req.loadJSON();

    if (resp.error) {
      // If google_search caused the error, retry without it
      if (attempt === 0 && (resp.error.code === 400 || resp.error.code === 403)) continue;
      throw new Error("Gemini: " + (resp.error.message || JSON.stringify(resp.error)));
    }
    break;
  }

  // Handle grounding response — may have multiple parts
  var candidate = resp.candidates && resp.candidates[0];
  if (!candidate || !candidate.content || !candidate.content.parts) {
    // Check for blocked response
    if (candidate && candidate.finishReason === "SAFETY") {
      throw new Error("Gemini: risposta bloccata dal filtro di sicurezza");
    }
    throw new Error("Gemini: risposta vuota o formato inatteso");
  }
  // Concatenate all text parts (grounding may split across multiple parts)
  var textParts = candidate.content.parts
    .filter(function(p) { return p.text; })
    .map(function(p) { return p.text; });
  if (textParts.length === 0) {
    throw new Error("Gemini: nessun testo nella risposta");
  }
  return textParts.join("");
}

async function callPerplexity(apiKey, systemPrompt, userPrompt) {
  const req = new Request("https://api.perplexity.ai/chat/completions");
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  };
  req.body = JSON.stringify({
    model: PROVIDERS.perplexity.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
  });
  const resp = await req.loadJSON();
  if (resp.error) throw new Error("Perplexity: " + (resp.error.message || JSON.stringify(resp.error)));
  return resp.choices[0].message.content;
}

async function callGroq(apiKey, systemPrompt, userPrompt) {
  const req = new Request("https://api.groq.com/openai/v1/chat/completions");
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  };
  req.body = JSON.stringify({
    model: PROVIDERS.groq.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.7,
  });
  const resp = await req.loadJSON();
  if (resp.error) throw new Error("Groq: " + resp.error.message);
  return resp.choices[0].message.content;
}

async function callGrok(apiKey, systemPrompt, userPrompt) {
  const req = new Request("https://api.x.ai/v1/chat/completions");
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  };
  req.body = JSON.stringify({
    model: PROVIDERS.grok.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.7,
  });
  const resp = await req.loadJSON();
  if (resp.error) throw new Error("Grok: " + (resp.error.message || JSON.stringify(resp.error)));
  return resp.choices[0].message.content;
}

async function callDeepSeek(apiKey, systemPrompt, userPrompt) {
  const req = new Request("https://api.deepseek.com/chat/completions");
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  };
  req.body = JSON.stringify({
    model: PROVIDERS.deepseek.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.7,
  });
  const resp = await req.loadJSON();
  if (resp.error) throw new Error("DeepSeek: " + (resp.error.message || JSON.stringify(resp.error)));
  return resp.choices[0].message.content;
}

async function callMistral(apiKey, systemPrompt, userPrompt) {
  const req = new Request("https://api.mistral.ai/v1/chat/completions");
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  };
  req.body = JSON.stringify({
    model: PROVIDERS.mistral.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.7,
    tool_choice: "auto",
    tools: [{ type: "function", function: { name: "web_search", description: "Search the web for current information", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } }],
  });
  const resp = await req.loadJSON();
  if (resp.error) throw new Error("Mistral: " + (resp.error.message || JSON.stringify(resp.error)));
  // Mistral may return tool calls first, then a final text response
  var lastMsg = resp.choices[0].message;
  if (lastMsg.content) return lastMsg.content;
  // If tool_calls returned, the content with search results is in the response
  throw new Error("Mistral: no text response received. Try again.");
}

async function callCohere(apiKey, systemPrompt, userPrompt) {
  const req = new Request("https://api.cohere.com/v2/chat");
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  };
  req.body = JSON.stringify({
    model: PROVIDERS.cohere.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 4096,
    temperature: 0.7,
    connectors: [{ id: "web-search" }],
  });
  const resp = await req.loadJSON();
  if (resp.error) throw new Error("Cohere: " + (resp.error.message || JSON.stringify(resp.error)));
  // Cohere v2 response format
  if (resp.message && resp.message.content) {
    var textParts = resp.message.content.filter(function(p) { return p.type === "text"; });
    if (textParts.length > 0) return textParts[0].text;
  }
  throw new Error("Cohere: no text response received");
}

// ─── WEB SEARCH APIs (Tavily, Serper) ─────────────────────────────────────

async function searchTavily(query) {
  var apiKey = getSearchApiKey("tavily");
  if (!apiKey) return null;
  var req = new Request("https://api.tavily.com/search");
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apiKey,
  };
  req.body = JSON.stringify({
    query: query,
    search_depth: "basic",
    topic: "news",
    max_results: 8,
    time_range: "week",
    include_answer: false,
  });
  var resp = await req.loadJSON();
  if (resp.error) return null;
  return (resp.results || []).map(function(r) {
    return { title: r.title, url: r.url, snippet: r.content };
  });
}

async function searchSerper(query) {
  var apiKey = getSearchApiKey("serper");
  if (!apiKey) return null;
  var req = new Request("https://google.serper.dev/search");
  req.method = "POST";
  req.headers = {
    "Content-Type": "application/json",
    "X-API-KEY": apiKey,
  };
  req.body = JSON.stringify({
    q: query,
    num: 10,
    gl: "it",
    hl: "it",
    tbs: "qdr:w",
  });
  var resp = await req.loadJSON();
  if (resp.error) return null;
  var results = [];
  (resp.organic || []).forEach(function(r) {
    results.push({ title: r.title, url: r.link, snippet: r.snippet });
  });
  (resp.news || []).forEach(function(r) {
    results.push({ title: r.title, url: r.link, snippet: r.snippet });
  });
  return results.slice(0, 10);
}

async function webSearchBoost(city, dateStart, dateEnd, interests) {
  var queries = [
    "eventi " + city + " " + dateStart + " " + dateEnd,
    city + " things to do " + dateStart,
    city + " " + (interests || []).slice(0, 3).join(" ") + " events",
  ];
  var allResults = [];
  for (var qi = 0; qi < queries.length; qi++) {
    var results = await searchTavily(queries[qi]);
    if (!results) results = await searchSerper(queries[qi]);
    if (results) {
      results.forEach(function(r) { allResults.push(r); });
    }
    if (allResults.length >= 15) break;
  }
  if (allResults.length === 0) return "";
  // Format as context for the LLM prompt
  var ctx = "\n\n=== WEB SEARCH RESULTS (use these as sources) ===\n";
  allResults.forEach(function(r, i) {
    ctx += (i + 1) + ". " + r.title + "\n   " + r.url + "\n   " + (r.snippet || "") + "\n\n";
  });
  ctx += "Use the above search results to find REAL events with accurate details.\n";
  return ctx;
}

async function callManual(systemPrompt, userPrompt) {
  var fullPrompt = systemPrompt + "\n\n" + userPrompt;
  Pasteboard.copy(fullPrompt);

  var a = new Alert();
  a.title = "📋 " + t("manualTitle");
  a.message = t("manualMsg");
  a.addAction(t("manualOpen"));
  a.addAction(t("manualPaste"));
  a.addCancelAction(t("cancel"));
  var choice = await a.presentAlert();

  if (choice === 0) {
    Safari.open("https://chatgpt.com");
    // After user returns, ask for paste
    var p = new Alert();
    p.title = t("manualPaste");
    p.message = t("manualPasteMsg");
    p.addTextField("JSON", "");
    p.addAction("OK");
    p.addCancelAction(t("cancel"));
    if (await p.presentAlert() === -1) throw new Error("Cancelled");
    return p.textFieldValue(0);
  } else if (choice === 1) {
    var p2 = new Alert();
    p2.title = t("manualPaste");
    p2.message = t("manualPasteMsg");
    p2.addTextField("JSON", Pasteboard.paste() || "");
    p2.addAction("OK");
    p2.addCancelAction(t("cancel"));
    if (await p2.presentAlert() === -1) throw new Error("Cancelled");
    return p2.textFieldValue(0);
  }
  throw new Error("Cancelled");
}

async function callLLM(provider, systemPrompt, userPrompt) {
  if (provider === "manual") return callManual(systemPrompt, userPrompt);

  const apiKey = getApiKey(provider);
  if (!apiKey) throw new Error("No API key set for " + PROVIDERS[provider].label + ". Go to Settings.");

  switch (provider) {
    case "claude":
      return callClaude(apiKey, systemPrompt, userPrompt);
    case "gemini":
      return callGemini(apiKey, systemPrompt, userPrompt);
    case "perplexity":
      return callPerplexity(apiKey, systemPrompt, userPrompt);
    case "groq":
      return callGroq(apiKey, systemPrompt, userPrompt);
    case "grok":
      return callGrok(apiKey, systemPrompt, userPrompt);
    case "deepseek":
      return callDeepSeek(apiKey, systemPrompt, userPrompt);
    case "mistral":
      return callMistral(apiKey, systemPrompt, userPrompt);
    case "cohere":
      return callCohere(apiKey, systemPrompt, userPrompt);
    default:
      throw new Error("Unknown provider: " + provider);
  }
}

// ─── PROMPT BUILDER ──────────────────────────────────────────────────────────

function buildPrompt(city, dateStart, dateEnd, centerName, interests, prefs, resources) {
  const citySources = resources.by_city?.[city] || [];
  const sourceList = citySources.map(function(s) { return "- " + s.url + " (" + s.type + ")"; }).join("\n");

  const systemPrompt = "You are a leisure activity researcher. You search for real, current events and activities.\n" +
    "You MUST respond with ONLY a valid JSON array — no markdown, no explanation, no code fences.\n" +
    "Each element must have exactly these fields:\n" +
    '{\n  "name": "Activity name",\n  "category": "music|games|outdoor|culture|food|sport|market|festival|other",\n' +
    '  "description": "Brief description (1-2 sentences)",\n  "date": "YYYY-MM-DD",\n' +
    '  "time_start": "HH:MM",\n  "time_end": "HH:MM",\n  "cost": "Free or price",\n' +
    '  "address": "Full street address",\n  "lat": 0.0,\n  "lng": 0.0,\n' +
    '  "contact": "Phone, website, or social",\n  "source_url": "URL where you found this"\n}\n\n' +
    "Return 5-12 activities. Quality over quantity. Prefer verified events with confirmed dates.\n" +
    "ALL coordinates must be real and accurate for the given addresses.";

  const userPrompt = "Find leisure activities in " + city + ' near "' + centerName + '" from ' + dateStart + " to " + dateEnd + ".\n\n" +
    "User preferences:\n" +
    "- Interests: " + (interests || prefs.interests || []).join(", ") + "\n" +
    "- Music genres: " + (prefs.music_genres || []).join(", ") + "\n" +
    "- Budget: " + (prefs.budget || "any") + "\n" +
    "- Transport: " + (prefs.transport?.mode?.join(", ") || "any") + ", max " + (prefs.transport?.max_distance_km || 5) + "km\n" +
    "- Avoid: " + ((prefs.avoid || []).length > 0 ? prefs.avoid.join(", ") : "nothing specific") + "\n" +
    (prefs.notes ? "- Notes: " + prefs.notes + "\n" : "") + "\n" +
    (sourceList ? "Known good sources for " + city + ":\n" + sourceList + "\n\n" : "") +
    "Search for real events happening on these dates. Include a mix of categories matching the user's interests.\n" +
    "Remember: respond with ONLY a JSON array, nothing else.";

  return { systemPrompt: systemPrompt, userPrompt: userPrompt };
}

// ─── PARSE LLM RESPONSE ─────────────────────────────────────────────────────

function parseActivities(text, dateStart, dateEnd) {
  var cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  cleaned = cleaned.trim();

  var start = cleaned.indexOf("[");
  var end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array found in LLM response");

  var jsonStr = cleaned.substring(start, end + 1);
  var activities = JSON.parse(jsonStr);

  if (!Array.isArray(activities)) throw new Error("Response is not an array");
  if (activities.length === 0) throw new Error("No activities found");

  // Filter out activities outside the requested date range
  if (dateStart && dateEnd) {
    activities = activities.filter(function(a) {
      if (!a.date) return true; // keep undated
      return a.date >= dateStart && a.date <= dateEnd;
    });
    if (activities.length === 0) throw new Error("No activities found within the requested dates");
  }

  return activities;
}

// ─── HTML MAP GENERATOR ─────────────────────────────────────────────────────

function generateMapHTML(activities, centerLat, centerLng, centerName, title, maxDistance) {
  for (var i = 0; i < activities.length; i++) {
    activities[i].distance_km = Math.round(
      haversine(centerLat, centerLng, activities[i].lat || centerLat, activities[i].lng || centerLng) * 10
    ) / 10;
  }

  activities.sort(function(a, b) {
    var d = (a.date || "").localeCompare(b.date || "");
    return d !== 0 ? d : (a.time_start || "").localeCompare(b.time_start || "");
  });

  var activitiesJSON = JSON.stringify(activities, null, 2);
  var catsJSON = JSON.stringify(CATEGORIES);
  var escapedCenterName = centerName.replace(/"/g, '\\"');

  return '<!DOCTYPE html>\n<html lang="it">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">\n' +
    '<meta name="apple-mobile-web-app-capable" content="yes">\n' +
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n' +
    '<meta name="theme-color" content="#667eea">\n' +
    '<title>' + title + '</title>\n' +
    '<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />\n' +
    '<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>\n' +
    '<style>\n' +
    '* { margin: 0; padding: 0; box-sizing: border-box; }\n' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; }\n' +
    '.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 20px; position: sticky; top: 0; z-index: 1000; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }\n' +
    '.header h1 { font-size: 18px; font-weight: 600; }\n' +
    '.header .subtitle { font-size: 13px; opacity: 0.85; margin-top: 2px; }\n' +
    '.tabs { display: flex; background: white; border-bottom: 2px solid #eee; position: sticky; top: 60px; z-index: 999; }\n' +
    '.tab { flex: 1; text-align: center; padding: 12px; cursor: pointer; font-size: 14px; font-weight: 500; color: #666; transition: all 0.2s; border-bottom: 3px solid transparent; }\n' +
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
    '.card .meta span { display: inline-block; margin-right: 12px; }\n' +
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
    '.start-info .pin { font-size: 18px; }\n' +
    '.share-bar { padding: 10px 16px; background: white; border-bottom: 1px solid #eee; display: flex; gap: 8px; justify-content: flex-end; }\n' +
    '.btn-share { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 20px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; text-decoration: none; color: white; }\n' +
    '.btn-whatsapp { background: #25D366; }\n' +
    '.btn-share-native { background: #667eea; }\n' +
    '@media (max-width: 600px) { .header h1 { font-size: 16px; } #map { height: 45vh; } }\n' +
    '</style>\n</head>\n<body>\n\n' +
    '<div class="header">\n  <h1>' + title + '</h1>\n' +
    '  <div class="subtitle">📍 Da: ' + centerName + ' &bull; 🚲 Max: ' + maxDistance + 'km</div>\n</div>\n\n' +
    '<div class="tabs">\n' +
    '  <div class="tab active" onclick="showView(\'map-view\')">🗺️ Mappa</div>\n' +
    '  <div class="tab" onclick="showView(\'cards\')">📋 Lista</div>\n' +
    '  <div class="tab" onclick="showView(\'timeline\')">🕐 Timeline</div>\n</div>\n\n' +
    '<div class="share-bar">\n' +
    '  <button class="btn-share btn-whatsapp" onclick="shareWhatsApp()">💬 WhatsApp</button>\n' +
    '  <button class="btn-share btn-share-native" onclick="shareNative()">📤 Condividi</button>\n</div>\n\n' +
    '<div class="start-info">\n  <span class="pin">📌</span>\n  Punto di partenza: <strong>' + centerName + '</strong>\n</div>\n\n' +
    '<div id="map-view">\n  <div class="filters" id="filters"></div>\n  <div id="map"></div>\n</div>\n\n' +
    '<div class="cards" id="cards"></div>\n' +
    '<div class="timeline" id="timeline"></div>\n\n' +
    '<script>\n' +
    'var ACTIVITIES = ' + activitiesJSON + ';\n' +
    'var CATEGORIES = ' + catsJSON + ';\n' +
    'var CENTER = { lat: ' + centerLat + ', lng: ' + centerLng + ', name: "' + escapedCenterName + '" };\n' +
    'var MAX_DIST = ' + maxDistance + ';\n' +
    'var map, markers = [], activeFilters = new Set();\n\n' +
    'function initMap() {\n' +
    '  map = L.map("map", { closePopupOnClick: true }).setView([CENTER.lat, CENTER.lng], 14);\n' +
    '  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {\n' +
    '    attribution: "&copy; OpenStreetMap contributors", maxZoom: 19\n' +
    '  }).addTo(map);\n' +
    '  var startIcon = L.divIcon({ html: \'<div style="font-size:28px;text-shadow:0 2px 4px rgba(0,0,0,0.3)">📌</div>\', iconSize: [28,28], iconAnchor: [14,28], className: "" });\n' +
    '  L.marker([CENTER.lat, CENTER.lng], { icon: startIcon }).addTo(map).bindPopup("<strong>" + CENTER.name + "</strong><br><em>Punto di partenza</em>");\n' +
    '  L.circle([CENTER.lat, CENTER.lng], { radius: MAX_DIST*1000, color: "#667eea", fillColor: "#667eea", fillOpacity: 0.05, weight: 1.5, dashArray: "5,5" }).addTo(map);\n' +
    '  map.on("click", function() { map.closePopup(); });\n' +
    '  addMarkers(); buildFilters();\n}\n\n' +
    'function addMarkers() {\n' +
    '  markers.forEach(function(m) { map.removeLayer(m.marker); }); markers = [];\n' +
    '  ACTIVITIES.forEach(function(act) {\n' +
    '    if (activeFilters.size > 0 && !activeFilters.has(act.category)) return;\n' +
    '    var cat = CATEGORIES[act.category] || CATEGORIES.other;\n' +
    '    var icon = L.divIcon({ html: \'<div style="width:36px;height:36px;border-radius:50%;background:\' + cat.color + \';border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:18px">\' + cat.icon + "</div>", iconSize: [36,36], iconAnchor: [18,36], className: "" });\n' +
    '    var gmUrl = "https://www.google.com/maps/dir/?api=1&origin=" + CENTER.lat + "," + CENTER.lng + "&destination=" + act.lat + "," + act.lng + "&travelmode=bicycling";\n' +
    '    var p = document.createElement("div"); p.style.cssText = "min-width:200px;max-width:280px";\n' +
    '    var hdr = document.createElement("div"); hdr.style.cssText = "background:" + cat.color + ";color:white;padding:4px 8px;border-radius:6px 6px 0 0;margin:-8px -18px 8px -18px;font-size:11px"; hdr.textContent = cat.icon + " " + cat.label; p.appendChild(hdr);\n' +
    '    var nm = document.createElement("strong"); nm.style.fontSize = "14px"; nm.textContent = act.name; p.appendChild(nm);\n' +
    '    var info = document.createElement("div"); info.style.cssText = "font-size:12px;color:#666;margin:6px 0;line-height:1.5";\n' +
    '    var timeStr = (act.time_start||"?") + (act.time_end ? "-" + act.time_end : "");\n' +
    '    info.textContent = "📅 " + (act.date||"N/D") + " 🕐 " + timeStr + " 💰 " + (act.cost||"N/D") + " 📏 " + act.distance_km + "km"; p.appendChild(info);\n' +
    '    if (act.address) { var ad = document.createElement("div"); ad.style.cssText = "font-size:12px;color:#666"; ad.textContent = "📍 " + act.address; p.appendChild(ad); }\n' +
    '    if (act.description) { var ds = document.createElement("div"); ds.style.cssText = "font-size:12px;color:#444;margin:6px 0"; ds.textContent = act.description; p.appendChild(ds); }\n' +
    '    if (act.contact && !act.contact.match(/https?:\\/\\//) && !act.contact.match(/^\\+?[0-9\\s-]+$/)) { var ct = document.createElement("div"); ct.style.cssText = "font-size:11px;color:#888;margin:4px 0"; ct.textContent = "📇 " + act.contact; p.appendChild(ct); }\n' +
    '    var acts = document.createElement("div"); acts.style.cssText = "margin-top:8px;display:flex;gap:6px;flex-wrap:wrap";\n' +
    '    var navA = document.createElement("a"); navA.href = gmUrl; navA.target = "_blank"; navA.style.cssText = "background:#4285f4;color:white;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none"; navA.textContent = "🧭 Naviga"; acts.appendChild(navA);\n' +
    '    if (act.source_url) { var srcA = document.createElement("a"); srcA.href = act.source_url; srcA.target = "_blank"; srcA.style.cssText = "background:#f0f0f0;color:#333;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none"; srcA.textContent = "🔗 Info"; acts.appendChild(srcA); }\n' +
    '    if (act.contact) { var cUrl = act.contact.match(/https?:\\/\\//) ? act.contact : (act.contact.match(/^\\+?[0-9\\s-]+$/) ? "tel:" + act.contact.replace(/\\s/g,"") : null); if (cUrl) { var cA = document.createElement("a"); cA.href = cUrl; cA.target = "_blank"; cA.style.cssText = "background:#27ae60;color:white;padding:6px 12px;border-radius:6px;font-size:12px;text-decoration:none"; cA.textContent = cUrl.startsWith("tel:") ? "📞 Chiama" : "🌐 Sito"; acts.appendChild(cA); } }\n' +
    '    p.appendChild(acts);\n' +
    '    var marker = L.marker([act.lat, act.lng], { icon: icon }).addTo(map).bindPopup(p, { autoClose: true, closeOnClick: true });\n' +
    '    markers.push({ marker: marker, activity: act });\n' +
    '  });\n' +
    '  if (markers.length > 0) {\n' +
    '    var bounds = L.latLngBounds(markers.map(function(m) { return m.marker.getLatLng(); }));\n' +
    '    bounds.extend([CENTER.lat, CENTER.lng]); map.fitBounds(bounds, { padding: [30, 30] });\n  }\n}\n\n' +
    'function buildFilters() {\n' +
    '  var container = document.getElementById("filters");\n' +
    '  var cats = []; ACTIVITIES.forEach(function(a) { if (cats.indexOf(a.category)===-1) cats.push(a.category); });\n' +
    '  var allChip = document.createElement("div"); allChip.className = "filter-chip active"; allChip.textContent = "Tutti";\n' +
    '  allChip.onclick = function() { activeFilters.clear(); document.querySelectorAll(".filter-chip").forEach(function(c) { c.classList.remove("active"); }); allChip.classList.add("active"); addMarkers(); renderCards(); };\n' +
    '  container.appendChild(allChip);\n' +
    '  cats.forEach(function(cat) {\n' +
    '    var cfg = CATEGORIES[cat] || CATEGORIES.other;\n' +
    '    var chip = document.createElement("div"); chip.className = "filter-chip";\n' +
    '    var dot = document.createElement("span"); dot.className = "dot"; dot.style.background = cfg.color; chip.appendChild(dot);\n' +
    '    chip.appendChild(document.createTextNode(" " + cfg.icon + " " + cfg.label));\n' +
    '    chip.onclick = function() {\n' +
    '      if (activeFilters.has(cat)) { activeFilters.delete(cat); chip.classList.remove("active"); } else { activeFilters.add(cat); chip.classList.add("active"); }\n' +
    '      document.querySelector(".filter-chip:first-child").classList.toggle("active", activeFilters.size===0); addMarkers(); renderCards();\n' +
    '    }; container.appendChild(chip);\n  });\n}\n\n' +
    'function renderCards() {\n' +
    '  var container = document.getElementById("cards"); container.textContent = "";\n' +
    '  var filtered = activeFilters.size > 0 ? ACTIVITIES.filter(function(a) { return activeFilters.has(a.category); }) : ACTIVITIES;\n' +
    '  filtered.forEach(function(act) {\n' +
    '    var cat = CATEGORIES[act.category] || CATEGORIES.other;\n' +
    '    var gmUrl = "https://www.google.com/maps/dir/?api=1&origin=" + CENTER.lat + "," + CENTER.lng + "&destination=" + act.lat + "," + act.lng + "&travelmode=bicycling";\n' +
    '    var card = document.createElement("div"); card.className = "card";\n' +
    '    var catBadge = document.createElement("div"); catBadge.className = "card-cat"; catBadge.style.background = cat.color; catBadge.textContent = cat.icon + " " + cat.label; card.appendChild(catBadge);\n' +
    '    var h3 = document.createElement("h3"); h3.textContent = act.name; card.appendChild(h3);\n' +
    '    var cardTimeStr = (act.time_start||"?") + (act.time_end ? "-" + act.time_end : "");\n' +
    '    var meta = document.createElement("div"); meta.className = "meta"; meta.textContent = "📅 " + (act.date||"N/D") + " 🕐 " + cardTimeStr + " 💰 " + (act.cost||"N/D") + " 📏 " + act.distance_km + "km"; card.appendChild(meta);\n' +
    '    if (act.address) { var addr = document.createElement("div"); addr.className = "meta"; addr.textContent = "📍 " + act.address; card.appendChild(addr); }\n' +
    '    if (act.description) { var desc = document.createElement("div"); desc.className = "description"; desc.textContent = act.description; card.appendChild(desc); }\n' +
    '    if (act.contact && !act.contact.match(/https?:\\/\\//) && !act.contact.match(/^\\+?[0-9\\s-]+$/)) { var ctxt = document.createElement("div"); ctxt.className = "meta"; ctxt.style.color = "#888"; ctxt.textContent = "📇 " + act.contact; card.appendChild(ctxt); }\n' +
    '    var actions = document.createElement("div"); actions.className = "actions";\n' +
    '    var navBtn = document.createElement("a"); navBtn.href = gmUrl; navBtn.target = "_blank"; navBtn.className = "btn btn-navigate"; navBtn.textContent = "🧭 Naviga"; actions.appendChild(navBtn);\n' +
    '    if (act.source_url) { var srcBtn = document.createElement("a"); srcBtn.href = act.source_url; srcBtn.target = "_blank"; srcBtn.className = "btn btn-info"; srcBtn.textContent = "🔗 Info"; actions.appendChild(srcBtn); }\n' +
    '    if (act.contact) { var cUrl2 = act.contact.match(/https?:\\/\\//) ? act.contact : (act.contact.match(/^\\+?[0-9\\s-]+$/) ? "tel:" + act.contact.replace(/\\s/g,"") : null); if (cUrl2) { var cBtn = document.createElement("a"); cBtn.href = cUrl2; cBtn.target = "_blank"; cBtn.className = "btn"; cBtn.style.cssText = "background:#27ae60;color:white"; cBtn.textContent = cUrl2.startsWith("tel:") ? "📞 Chiama" : "🌐 Sito"; actions.appendChild(cBtn); } }\n' +
    '    card.appendChild(actions); container.appendChild(card);\n  });\n}\n\n' +
    'function renderTimeline() {\n' +
    '  var container = document.getElementById("timeline"); container.textContent = "";\n' +
    '  var byDate = {}; ACTIVITIES.forEach(function(act) { var d = act.date||"TBD"; if (!byDate[d]) byDate[d]=[]; byDate[d].push(act); });\n' +
    '  Object.keys(byDate).sort().forEach(function(date) {\n' +
    '    var dayDiv = document.createElement("div"); dayDiv.className = "timeline-day";\n' +
    '    var dateObj = new Date(date + "T00:00:00");\n' +
    '    var dayName = date !== "TBD" ? dateObj.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" }) : "Data da definire";\n' +
    '    var h2 = document.createElement("h2"); h2.textContent = dayName; dayDiv.appendChild(h2);\n' +
    '    byDate[date].sort(function(a,b) { return (a.time_start||"").localeCompare(b.time_start||""); });\n' +
    '    byDate[date].forEach(function(act) {\n' +
    '      var cat = CATEGORIES[act.category] || CATEGORIES.other;\n' +
    '      var slot = document.createElement("div"); slot.className = "timeline-slot";\n' +
    '      var timeDiv = document.createElement("div"); timeDiv.className = "timeline-time"; timeDiv.textContent = act.time_start || "?"; slot.appendChild(timeDiv);\n' +
    '      var content = document.createElement("div"); content.className = "timeline-content"; content.style.borderLeftColor = cat.color;\n' +
    '      var h4 = document.createElement("h4"); h4.textContent = cat.icon + " " + act.name; content.appendChild(h4);\n' +
    '      var tlMeta = document.createElement("div"); tlMeta.className = "tl-meta"; tlMeta.textContent = "💰 " + (act.cost||"N/D") + " | 📏 " + act.distance_km + "km | 📍 " + (act.address||"N/D"); content.appendChild(tlMeta);\n' +
    '      slot.appendChild(content); dayDiv.appendChild(slot);\n    });\n    container.appendChild(dayDiv);\n  });\n}\n\n' +
    'function showView(viewId) {\n' +
    '  document.querySelectorAll(".tab").forEach(function(t, i) {\n' +
    '    t.classList.toggle("active", (viewId==="map-view"&&i===0)||(viewId==="cards"&&i===1)||(viewId==="timeline"&&i===2));\n  });\n' +
    '  document.getElementById("map-view").style.display = viewId==="map-view" ? "block" : "none";\n' +
    '  document.getElementById("cards").style.display = viewId==="cards" ? "block" : "none";\n' +
    '  document.getElementById("timeline").style.display = viewId==="timeline" ? "block" : "none";\n' +
    '  if (viewId==="map-view") setTimeout(function() { map.invalidateSize(); }, 100);\n' +
    '  if (viewId==="cards") renderCards(); if (viewId==="timeline") renderTimeline();\n}\n\n' +
    'function buildShareText() {\n' +
    '  var t = "🗺️ " + document.querySelector(".header h1").textContent + "\\n📌 Da: " + CENTER.name + "\\n\\n";\n' +
    '  var byDate = {}; ACTIVITIES.forEach(function(act) { var d=act.date||"TBD"; if(!byDate[d]) byDate[d]=[]; byDate[d].push(act); });\n' +
    '  Object.keys(byDate).sort().forEach(function(date) {\n' +
    '    var dateObj = new Date(date+"T00:00:00");\n' +
    '    var dl = date!=="TBD" ? dateObj.toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"}) : "Data da definire";\n' +
    '    t += "📅 " + dl + "\\n";\n' +
    '    byDate[date].forEach(function(act) {\n' +
    '      var cat = CATEGORIES[act.category] || CATEGORIES.other;\n' +
    '      t += cat.icon + " " + act.name + (act.time_start ? " ("+act.time_start+")" : "") + "\\n";\n' +
    '      if (act.cost) t += "   💰 " + act.cost + "\\n";\n' +
    '      if (act.address) t += "   📍 " + act.address + "\\n";\n' +
    '      t += "   🧭 https://maps.google.com/?q=" + act.lat + "," + act.lng + "\\n\\n";\n    });\n  }); return t;\n}\n' +
    'function shareWhatsApp() { window.open("https://wa.me/?text=" + encodeURIComponent(buildShareText()), "_blank"); }\n' +
    'function shareNative() {\n' +
    '  var t = buildShareText();\n' +
    '  if (navigator.share) { navigator.share({ title: document.querySelector(".header h1").textContent, text: t }).catch(function(){}); }\n' +
    '  else { navigator.clipboard.writeText(t).then(function() { alert("Copiato!"); }).catch(function() { alert(t); }); }\n}\n\n' +
    'document.addEventListener("DOMContentLoaded", function() { initMap(); renderCards(); renderTimeline(); });\n' +
    '<\/script>\n</body>\n</html>';
}

// ─── KML GENERATOR ───────────────────────────────────────────────────────────

function generateKML(activities, centerLat, centerLng, centerName, title) {
  var escXml = function(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  };

  var iconMap = {
    music: "red-circle", games: "purple-circle", outdoor: "grn-circle",
    culture: "blu-circle", food: "ylw-circle", sport: "ltblu-circle",
    market: "orange-circle", festival: "pink-circle", other: "wht-circle",
  };

  var placemarks = '    <Placemark>\n' +
    '      <name>📌 ' + escXml(centerName) + ' (Partenza)</name>\n' +
    '      <description>Punto di partenza</description>\n' +
    '      <Style><IconStyle><scale>1.2</scale><Icon><href>https://maps.google.com/mapfiles/kml/paddle/red-stars.png</href></Icon></IconStyle></Style>\n' +
    '      <Point><coordinates>' + centerLng + ',' + centerLat + ',0</coordinates></Point>\n' +
    '    </Placemark>';

  for (var i = 0; i < activities.length; i++) {
    var act = activities[i];
    var cat = CATEGORIES[act.category] || CATEGORIES.other;
    var icon = iconMap[act.category] || iconMap.other;
    var descParts = [];
    if (act.date) descParts.push("📅 " + act.date);
    if (act.time_start) descParts.push("🕐 " + act.time_start + (act.time_end ? "-" + act.time_end : ""));
    if (act.cost) descParts.push("💰 " + act.cost);
    if (act.distance_km != null) descParts.push("📏 " + act.distance_km + "km");
    if (act.contact) descParts.push("📞 " + act.contact);
    if (act.address) descParts.push("📍 " + act.address);
    if (act.description) descParts.push("\n" + act.description);

    placemarks += '\n    <Placemark>\n' +
      '      <name>' + escXml(cat.icon + " " + act.name) + '</name>\n' +
      '      <description><![CDATA[' + escXml(descParts.join("\n")) + ']]></description>\n' +
      '      <Style><IconStyle><scale>1.0</scale><Icon><href>https://maps.google.com/mapfiles/kml/paddle/' + icon + '.png</href></Icon></IconStyle></Style>\n' +
      '      <Point><coordinates>' + (act.lng || centerLng) + ',' + (act.lat || centerLat) + ',0</coordinates></Point>\n' +
      '    </Placemark>';
  }

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<kml xmlns="http://www.opengis.net/kml/2.2">\n  <Document>\n' +
    '    <name>' + escXml(title) + '</name>\n' +
    '    <description>Generato da Planner</description>\n' +
    placemarks + '\n  </Document>\n</kml>';
}

// ─── REGISTRY MANAGEMENT ────────────────────────────────────────────────────

function updateRegistry(mapEntry) {
  var registry = loadRegistry();
  registry = registry.filter(function(m) { return m.id !== mapEntry.id; });
  registry.push(mapEntry);
  registry.sort(function(a, b) { return (b.date_start || "").localeCompare(a.date_start || ""); });
  saveRegistry(registry);
  return registry.length;
}

// ─── KNOWN CITIES ────────────────────────────────────────────────────────────

// ─── TRIP QUESTIONNAIRE ──────────────────────────────────────────────────────

async function runQuestionnaire(existingProfile) {
  var profile = {};

  var moods = [
    { key: "relax", label: "🧘 " + t("qMoodRelax") },
    { key: "adventure", label: "🏔️ " + t("qMoodAdventure") },
    { key: "culture", label: "🎨 " + t("qMoodCulture") },
    { key: "nightlife", label: "🎵 " + t("qMoodNightlife") },
    { key: "family", label: "👨‍👩‍👧 " + t("qMoodFamily") },
    { key: "romantic", label: "💕 " + t("qMoodRomantic") },
    { key: "foodie", label: "🍷 " + t("qMoodFoodie") },
    { key: "sport", label: "⚽ " + t("qMoodSport") },
  ];
  var times = [
    { key: "morning", label: "🌅 " + t("qTimeMorning") },
    { key: "afternoon", label: "☀️ " + t("qTimeAfternoon") },
    { key: "evening", label: "🌆 " + t("qTimeEvening") },
    { key: "night", label: "🌙 " + t("qTimeNight") },
  ];
  var budgetKeys = ["free", "cheap", "medium", "any"];
  var groupKeys = ["solo", "couple", "friends", "family", "large_group"];

  // Step 0: Ask whether to start from saved/global preferences or fresh
  var prefs = loadPreferences();
  var startAlert = new Alert();
  startAlert.title = "🎯 " + t("qTitle");
  startAlert.message = t("qMsg");
  if (existingProfile) {
    startAlert.addAction("📋 " + t("qUseMap"));
  }
  startAlert.addAction("📋 " + t("qUseGlobal"));
  startAlert.addAction("✨ " + t("qFromScratch"));
  startAlert.addCancelAction(t("cancel"));
  var startChoice = await startAlert.presentAlert();
  if (startChoice === -1) return null;

  var useMapProfile = existingProfile && startChoice === 0;
  var useGlobal = existingProfile ? startChoice === 1 : startChoice === 0;

  if (useMapProfile) {
    profile.interests = (existingProfile.interests || []).slice();
    profile.music_genres = (existingProfile.music_genres || []).slice();
    profile.budget = existingProfile.budget || "any";
    profile.max_distance_km = existingProfile.max_distance_km || 5;
    profile.avoid = (existingProfile.avoid || []).slice();
    profile.time_slots = (existingProfile.time_slots || ["all_day"]).slice();
    profile.mood = (existingProfile.mood || []).slice();
    profile.group = existingProfile.group || "friends";
    profile.specific = (existingProfile.specific || []).slice();
  } else if (useGlobal) {
    profile.interests = (prefs.interests || []).slice();
    profile.music_genres = (prefs.music_genres || []).slice();
    profile.budget = prefs.budget || "any";
    profile.max_distance_km = prefs.transport?.max_distance_km || 5;
    profile.avoid = (prefs.avoid || []).slice();
    profile.time_slots = ["all_day"];
    profile.mood = [];
    profile.group = "friends";
    profile.specific = [];
  } else {
    profile.interests = [];
    profile.music_genres = [];
    profile.budget = "any";
    profile.max_distance_km = 5;
    profile.avoid = [];
    profile.time_slots = ["all_day"];
    profile.mood = [];
    profile.group = "friends";
    profile.specific = [];
  }

  // If pre-filled (map profile or global prefs), skip straight to summary
  // Only "Start fresh" goes through all steps
  var step = (useMapProfile || useGlobal) ? 8 : 1;
  var fromSummary = (step === 8); // when editing a field from summary, return to summary after
  while (step >= 1 && step <= 8) {

    if (step === 1) {
      // MOOD — multi-select
      var selectedMoods = (profile.mood || []).slice();
      var moodDone = false;
      while (!moodDone) {
        var moodAlert = new Alert();
        moodAlert.title = "(1/7) ✨ " + t("qMood");
        moodAlert.message = t("qMoodMsg") + (selectedMoods.length > 0 ? "\n\nSelected: " + selectedMoods.join(", ") : "");
        for (var mi = 0; mi < moods.length; mi++) {
          var mCheck = selectedMoods.indexOf(moods[mi].key) !== -1 ? " ✅" : "";
          moodAlert.addAction(moods[mi].label + mCheck);
        }
        moodAlert.addAction("✅ " + t("next"));
        moodAlert.addCancelAction(t("cancel"));
        var mc = await moodAlert.presentSheet();
        if (mc === -1) return null;
        if (mc === moods.length) { moodDone = true; }
        else {
          var moodKey = moods[mc].key;
          var mIdx = selectedMoods.indexOf(moodKey);
          if (mIdx === -1) selectedMoods.push(moodKey);
          else selectedMoods.splice(mIdx, 1);
        }
      }
      profile.mood = selectedMoods;
      step = fromSummary ? 8 : 2;

    } else if (step === 2) {
      // TIME — multi-select
      var selectedTimes = (profile.time_slots || []).filter(function(ts) { return ts !== "all_day"; });
      var timeDone = false;
      var timeWentBack = false;
      while (!timeDone) {
        var timeAlert = new Alert();
        timeAlert.title = "(2/7) 🕐 " + t("qTime");
        timeAlert.message = t("qTimeMsg") + (selectedTimes.length > 0 ? "\n\nSelected: " + selectedTimes.join(", ") : "");
        for (var ti = 0; ti < times.length; ti++) {
          var tCheck = selectedTimes.indexOf(times[ti].key) !== -1 ? " ✅" : "";
          timeAlert.addAction(times[ti].label + tCheck);
        }
        timeAlert.addAction("📅 " + t("qTimeAllDay"));
        timeAlert.addAction("✅ " + t("next"));
        if (!fromSummary) timeAlert.addAction("◀️ " + t("back"));
        timeAlert.addCancelAction(t("cancel"));
        var tc = await timeAlert.presentSheet();
        if (tc === -1) return null;
        if (tc === times.length) { selectedTimes = []; timeDone = true; }
        else if (tc === times.length + 1) { timeDone = true; }
        else if (!fromSummary && tc === times.length + 2) { timeDone = true; timeWentBack = true; step = 1; }
        else {
          var timeKey = times[tc].key;
          var tIdx = selectedTimes.indexOf(timeKey);
          if (tIdx === -1) selectedTimes.push(timeKey);
          else selectedTimes.splice(tIdx, 1);
        }
      }
      profile.time_slots = selectedTimes.length > 0 ? selectedTimes : ["all_day"];
      if (!timeWentBack) step = fromSummary ? 8 : 3;

    } else if (step === 3) {
      // BUDGET
      var budgetAlert = new Alert();
      budgetAlert.title = "(3/7) 💰 " + t("qBudget");
      budgetAlert.message = t("qBudgetMsg");
      budgetAlert.addAction("🆓 " + t("qBudgetFree"));
      budgetAlert.addAction("💵 " + t("qBudgetCheap"));
      budgetAlert.addAction("💶 " + t("qBudgetMedium"));
      budgetAlert.addAction("💎 " + t("qBudgetAny"));
      if (!fromSummary) budgetAlert.addAction("◀️ " + t("back"));
      budgetAlert.addCancelAction(t("cancel"));
      var bc = await budgetAlert.presentAlert();
      if (bc === -1) return null;
      if (!fromSummary && bc === 4) { step = 2; }
      else { profile.budget = budgetKeys[bc]; step = fromSummary ? 8 : 4; }

    } else if (step === 4) {
      // GROUP
      var groupAlert = new Alert();
      groupAlert.title = "(4/7) 👥 " + t("qGroup");
      groupAlert.message = t("qGroupMsg");
      groupAlert.addAction("🧑 " + t("qGroupSolo"));
      groupAlert.addAction("💑 " + t("qGroupCouple"));
      groupAlert.addAction("👫 " + t("qGroupFriends"));
      groupAlert.addAction("👨‍👩‍👧 " + t("qGroupFamily"));
      groupAlert.addAction("👥 " + t("qGroupLarge"));
      if (!fromSummary) groupAlert.addAction("◀️ " + t("back"));
      groupAlert.addCancelAction(t("cancel"));
      var gc = await groupAlert.presentAlert();
      if (gc === -1) return null;
      if (!fromSummary && gc === 5) { step = 3; }
      else { profile.group = groupKeys[gc]; step = fromSummary ? 8 : 5; }

    } else if (step === 5) {
      // MAX DISTANCE
      var distAlert = new Alert();
      distAlert.title = "(5/7) 📏 " + t("qDistance");
      distAlert.message = t("qDistanceMsg");
      distAlert.addAction(t("qDist1"));
      distAlert.addAction(t("qDist3"));
      distAlert.addAction(t("qDist5"));
      distAlert.addAction(t("qDist10"));
      distAlert.addAction(t("qDist20"));
      if (!fromSummary) distAlert.addAction("◀️ " + t("back"));
      distAlert.addCancelAction(t("cancel"));
      var dc = await distAlert.presentAlert();
      if (dc === -1) return null;
      if (!fromSummary && dc === 5) { step = 4; }
      else { profile.max_distance_km = [1, 3, 5, 10, 20][dc]; step = fromSummary ? 8 : 6; }

    } else if (step === 6) {
      // SPECIFIC INTERESTS
      var specAlert = new Alert();
      specAlert.title = "(6/7) 🎯 " + t("qSpecific");
      specAlert.message = t("qSpecificMsg");
      specAlert.addTextField(t("qSpecificPlaceholder"), (profile.specific || []).join(", "));
      specAlert.addAction(t("next"));
      if (!fromSummary) specAlert.addAction("◀️ " + t("back"));
      specAlert.addCancelAction(t("cancel"));
      var sc = await specAlert.presentAlert();
      if (sc === -1) return null;
      if (!fromSummary && sc === 1) { step = 5; }
      else {
        var specText = specAlert.textFieldValue(0).trim();
        profile.specific = specText ? specText.split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [];
        step = fromSummary ? 8 : 7;
      }

    } else if (step === 7) {
      // AVOID
      var avoidAlert = new Alert();
      avoidAlert.title = "(7/7) 🚫 " + t("qAvoid");
      avoidAlert.message = t("qAvoidMsg");
      avoidAlert.addTextField(t("qAvoidPlaceholder"), (profile.avoid || []).join(", "));
      avoidAlert.addAction(t("next"));
      if (!fromSummary) avoidAlert.addAction("◀️ " + t("back"));
      avoidAlert.addCancelAction(t("cancel"));
      var ac = await avoidAlert.presentAlert();
      if (ac === -1) return null;
      if (!fromSummary && ac === 1) { step = 6; }
      else {
        var avoidText = avoidAlert.textFieldValue(0).trim();
        profile.avoid = avoidText ? avoidText.split(",").map(function(s) { return s.trim(); }).filter(Boolean) : [];
        step = 8;
      }

    } else if (step === 8) {
      // SUMMARY — confirm, or tap any line to edit just that field
      var budgetLabels = { free: t("qBudgetFree"), cheap: t("qBudgetCheap"), medium: t("qBudgetMedium"), any: t("qBudgetAny") };
      var groupLabels = { solo: t("qGroupSolo"), couple: t("qGroupCouple"), friends: t("qGroupFriends"), family: t("qGroupFamily"), large_group: t("qGroupLarge") };
      var moodLabels = profile.mood.map(function(m) {
        var found = moods.find(function(x) { return x.key === m; });
        return found ? found.label : m;
      }).join(", ") || "—";
      var timeLabels = profile.time_slots.map(function(ts) {
        var found = times.find(function(x) { return x.key === ts; });
        return found ? found.label : ts;
      }).join(", ");

      var summary = "✨ " + t("qMood") + ": " + moodLabels +
        "\n🕐 " + t("qTime") + ": " + timeLabels +
        "\n💰 " + t("qBudget") + ": " + (budgetLabels[profile.budget] || profile.budget) +
        "\n👥 " + t("qGroup") + ": " + (groupLabels[profile.group] || profile.group) +
        "\n📏 " + t("qDistance") + ": " + profile.max_distance_km + " km" +
        "\n🎯 " + t("qSpecific") + ": " + ((profile.specific || []).join(", ") || "—") +
        "\n🚫 " + t("qAvoid") + ": " + ((profile.avoid || []).join(", ") || "—");

      var confirmAlert = new Alert();
      confirmAlert.title = "📋 " + t("qSummary");
      confirmAlert.message = summary + "\n\n" + t("qEditOrSearch");
      confirmAlert.addAction("🚀 " + t("qSearch"));
      // Edit individual fields
      confirmAlert.addAction("✨ " + t("qMood"));
      confirmAlert.addAction("🕐 " + t("qTime"));
      confirmAlert.addAction("💰 " + t("qBudget"));
      confirmAlert.addAction("👥 " + t("qGroup"));
      confirmAlert.addAction("📏 " + t("qDistance"));
      confirmAlert.addAction("🎯 " + t("qSpecific"));
      confirmAlert.addAction("🚫 " + t("qAvoid"));
      confirmAlert.addCancelAction(t("cancel"));
      var cc = await confirmAlert.presentSheet();
      if (cc === -1) return null;
      if (cc === 0) { step = 9; } // Search!
      else { fromSummary = true; step = cc; } // 1=mood, 2=time, 3=budget, 4=group, 5=distance, 6=specific, 7=avoid
    }
  }

  return profile;
}

// ─── ENHANCED PROMPT BUILDER (uses questionnaire profile) ────────────────────

function buildPromptFromProfile(city, dateStart, dateEnd, centerName, profile, resources, centerLat, centerLng) {
  var citySources = (resources.by_city || {})[city] || [];
  var sourceList = citySources.map(function(s) { return "- " + s.url + " (" + s.type + ")"; }).join("\n");

  var moodMap = {
    relax: "relaxing activities, spas, parks, quiet cafes, yoga, meditation",
    adventure: "adventure sports, hiking, climbing, escape rooms, unusual experiences",
    culture: "museums, galleries, exhibitions, theater, historical sites, guided tours",
    nightlife: "live music, concerts, DJ sets, bars, clubs, late-night events",
    family: "family-friendly activities, playgrounds, kids workshops, zoos, interactive museums",
    romantic: "romantic spots, wine bars, scenic viewpoints, intimate restaurants, sunset walks",
    foodie: "food markets, cooking classes, wine tastings, street food, craft breweries, restaurants",
    sport: "sports events, outdoor activities, cycling, running events, fitness",
  };

  var timeMap = {
    morning: "morning activities (before 12:00)",
    afternoon: "afternoon activities (12:00-18:00)",
    evening: "evening activities (18:00-22:00)",
    night: "late night activities (after 22:00)",
    all_day: "activities at any time of day",
  };

  var budgetMap = {
    free: "FREE events only — no paid activities",
    cheap: "cheap activities under 15€ per person",
    medium: "activities up to 50€ per person",
    any: "any price range",
  };

  var groupMap = {
    solo: "solo activities — things one person can enjoy alone",
    couple: "couple-friendly activities — romantic or intimate settings",
    friends: "group-friendly activities — fun with friends",
    family: "family-friendly with kids — safe, educational, entertaining for children",
    large_group: "large group activities — suitable for 6+ people",
  };

  var moodDesc = (profile.mood || []).map(function(m) { return moodMap[m] || m; }).join("; ");
  var timeDesc = (profile.time_slots || ["all_day"]).map(function(ts) { return timeMap[ts] || ts; }).join(", ");

  var systemPrompt = "You are a Real-Time Leisure Activity Researcher. Search the live web for real, current events.\n" +
    "SEARCH GUIDELINES:\n" +
    "1. Break the search into 3+ sub-queries: event aggregators, local guides, category-specific venues.\n" +
    "2. Prioritize official event pages, local news sites, and social media event listings.\n" +
    "3. Today is " + new Date().toISOString().split("T")[0] + ". Focus on events confirmed for the requested dates.\n" +
    "4. Cross-reference multiple sources to verify dates and times.\n\n" +
    "You MUST respond with ONLY a valid JSON array — no markdown, no explanation, no code fences.\n" +
    "Each element must have exactly these fields:\n" +
    '{"name":"string","category":"music|games|outdoor|culture|food|sport|market|festival|other",' +
    '"description":"string","date":"YYYY-MM-DD","time_start":"HH:MM","time_end":"HH:MM",' +
    '"cost":"Free or price","address":"Full street address","lat":0.0,"lng":0.0,' +
    '"contact":"phone/website/social","source_url":"URL where you found this"}\n\n' +
    "Return 5-12 activities. Quality over quantity. Prefer verified events with confirmed dates.\n" +
    "ALL coordinates must be real and accurate for the given addresses — NOT the city center.\n" +
    "MANDATORY for EVERY activity:\n" +
    "- source_url: the actual URL where you found this event (NOT a generic homepage)\n" +
    "- contact: a real website URL, phone number, or social media handle\n" +
    "- address: the specific street address, not just the city name\n" +
    "- lat/lng: coordinates of the VENUE, not the city center\n" +
    "If you cannot find source_url or contact for an activity, set them to empty string, do NOT invent URLs.";

  var userPrompt = "Find leisure activities in " + city + " near \"" + centerName + "\" (center coordinates: " + (centerLat || "N/A") + ", " + (centerLng || "N/A") + ") from " + dateStart + " to " + dateEnd + ".\n" +
    "All activities must be within " + (profile.max_distance_km || 5) + " km of this exact center point.\n\n" +
    "=== SEARCH PROFILE ===\n" +
    "Mood: " + (moodDesc || "open to anything") + "\n" +
    "Time preference: " + timeDesc + "\n" +
    "Budget: " + (budgetMap[profile.budget] || "any") + "\n" +
    "Group type: " + (groupMap[profile.group] || "friends") + "\n" +
    "Max distance from center: " + (profile.max_distance_km || 5) + " km\n";

  if (profile.specific && profile.specific.length > 0) {
    userPrompt += "MUST INCLUDE these specific interests: " + profile.specific.join(", ") + "\n";
  }
  if (profile.interests && profile.interests.length > 0) {
    userPrompt += "General interests: " + profile.interests.join(", ") + "\n";
  }
  if (profile.music_genres && profile.music_genres.length > 0) {
    userPrompt += "Music preferences: " + profile.music_genres.join(", ") + "\n";
  }
  if (profile.avoid && profile.avoid.length > 0) {
    userPrompt += "AVOID: " + profile.avoid.join(", ") + "\n";
  }

  userPrompt += "\n";
  if (sourceList) userPrompt += "Known good sources for " + city + ":\n" + sourceList + "\n\n";
  userPrompt += "Search for real events happening on these specific dates. Match the mood, budget, and group type above.\n" +
    "Remember: respond with ONLY a JSON array, nothing else.";

  return { systemPrompt: systemPrompt, userPrompt: userPrompt };
}

// ─── VOICE PLAN (natural language → auto-fill everything) ────────────────────

async function voicePlan() {
  // 1. Pick LLM provider first (needed to parse the voice input)
  var providerAlert = new Alert();
  providerAlert.title = "🤖 " + t("provider");
  providerAlert.message = t("providerMsg");
  var providerKeys = Object.keys(PROVIDERS);
  for (var pk = 0; pk < providerKeys.length; pk++) {
    var k = providerKeys[pk];
    var hasKey = k === "manual" ? " 🆓" : (getApiKey(k) ? " ✅" : (PROVIDERS[k].free ? " 🆓" : ""));
    providerAlert.addAction(PROVIDERS[k].label + hasKey);
  }
  providerAlert.addCancelAction(t("cancel"));
  var pIdx = await providerAlert.presentSheet();
  if (pIdx === -1) return showMainMenu();
  var provider = providerKeys[pIdx];

  if (provider !== "manual" && !getApiKey(provider)) {
    var keyAlert = new Alert();
    keyAlert.title = "🔑 " + t("apiKeyNeeded");
    keyAlert.message = t("apiKeyMsg") + "\n\n" + PROVIDERS[provider].label;
    keyAlert.addTextField("API Key", "");
    keyAlert.addAction(t("saveAndContinue"));
    keyAlert.addCancelAction(t("cancel"));
    if (await keyAlert.presentAlert() === -1) return showMainMenu();
    var apiKeyInput = keyAlert.textFieldValue(0).trim();
    if (!apiKeyInput) return showMainMenu();
    setApiKey(provider, apiKeyInput);
  }

  // 2. Voice/text input — user describes what they want
  var voiceAlert = new Alert();
  voiceAlert.title = "🎤 " + t("voicePlan");
  voiceAlert.message = t("voicePlanMsg");
  voiceAlert.addTextField(t("voicePlaceholder"), "");
  voiceAlert.addAction("🚀 " + t("next"));
  voiceAlert.addCancelAction(t("cancel"));
  if (await voiceAlert.presentAlert() === -1) return showMainMenu();
  var voiceInput = voiceAlert.textFieldValue(0).trim();
  if (!voiceInput) return showMainMenu();

  // 3. Send to LLM to parse into structured profile + search
  var parseSystemPrompt = "You are a trip planning assistant. The user will describe what they want to do in natural language.\n" +
    "You must respond with ONLY a valid JSON object (no markdown, no explanation) with these fields:\n" +
    '{\n' +
    '  "city": "city name",\n' +
    '  "date_start": "YYYY-MM-DD",\n' +
    '  "date_end": "YYYY-MM-DD",\n' +
    '  "mood": ["relax"|"adventure"|"culture"|"nightlife"|"family"|"romantic"|"foodie"|"sport"],\n' +
    '  "time_slots": ["morning"|"afternoon"|"evening"|"night"|"all_day"],\n' +
    '  "budget": "free"|"cheap"|"medium"|"any",\n' +
    '  "group": "solo"|"couple"|"friends"|"family"|"large_group",\n' +
    '  "max_distance_km": number,\n' +
    '  "specific": ["specific interest 1", ...],\n' +
    '  "avoid": ["thing to avoid 1", ...],\n' +
    '  "activities": [\n' +
    '    {"name":"string","category":"music|games|outdoor|culture|food|sport|market|festival|other",\n' +
    '     "description":"string","date":"YYYY-MM-DD","time_start":"HH:MM","time_end":"HH:MM",\n' +
    '     "cost":"Free or price","address":"Full street address","lat":0.0,"lng":0.0,\n' +
    '     "contact":"string","source_url":"string"}\n' +
    '  ]\n' +
    '}\n\n' +
    "IMPORTANT:\n" +
    "- Extract city, dates, mood, budget, group from the user's description\n" +
    "- If dates are relative (\"this weekend\", \"tomorrow\"), calculate from today: " + new Date().toISOString().split("T")[0] + "\n" +
    "- If something is not mentioned, use sensible defaults (budget: any, group: friends, distance: 5km, time: all_day)\n" +
    "- Find 5-12 REAL activities matching the request. ALL coordinates must be accurate.\n" +
    "- Respond with ONLY the JSON object, nothing else.";

  var prefs = loadPreferences();
  var parseUserPrompt = voiceInput + "\n\n" +
    "My general preferences (use as background context):\n" +
    "- Interests: " + prefs.interests.join(", ") + "\n" +
    "- Music: " + prefs.music_genres.join(", ") + "\n" +
    "- Budget default: " + prefs.budget + "\n";

  var statusAlert = new Alert();
  statusAlert.title = "🎤 " + t("voiceParsing");
  statusAlert.message = '"' + voiceInput + '"';
  statusAlert.addAction("OK");
  await statusAlert.presentAlert();

  try {
    var response;
    if (provider === "manual") {
      response = await callManual(parseSystemPrompt, parseUserPrompt);
    } else {
      response = await callLLM(provider, parseSystemPrompt, parseUserPrompt);
    }

    // Parse the combined response (profile + activities)
    var cleaned = response.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    var start = cleaned.indexOf("{");
    var end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error(t("voiceFailed"));
    var parsed = JSON.parse(cleaned.substring(start, end + 1));

    if (!parsed.city || !parsed.activities || !Array.isArray(parsed.activities) || parsed.activities.length === 0) {
      throw new Error(t("voiceFailed"));
    }

    // Resolve location via geocoding
    var city = parsed.city;
    var centerLat, centerLng, centerName;
    var geoResults = await searchLocation(city);
    if (geoResults.length > 0) {
      centerLat = geoResults[0].lat;
      centerLng = geoResults[0].lng;
      centerName = geoResults[0].shortName;
      city = geoResults[0].city;
    } else {
      throw new Error("Could not find location: " + city);
    }

    var dateStart = parsed.date_start || new Date().toISOString().split("T")[0];
    var dateEnd = parsed.date_end || dateStart;
    var activities = parsed.activities.filter(function(a) {
      if (!a.date) return true;
      return a.date >= dateStart && a.date <= dateEnd;
    });
    if (activities.length === 0) throw new Error("No activities found within the requested dates");
    var profile = {
      mood: parsed.mood || [],
      time_slots: parsed.time_slots || ["all_day"],
      budget: parsed.budget || "any",
      group: parsed.group || "friends",
      max_distance_km: parsed.max_distance_km || 5,
      specific: parsed.specific || [],
      avoid: parsed.avoid || [],
      interests: prefs.interests,
      music_genres: prefs.music_genres,
    };
    var maxDistance = profile.max_distance_km;

    // Calculate distances
    for (var ai = 0; ai < activities.length; ai++) {
      activities[ai].distance_km = Math.round(
        haversine(centerLat, centerLng, activities[ai].lat || centerLat, activities[ai].lng || centerLng) * 10
      ) / 10;
    }

    // Build summary for confirmation
    var moodStr = (profile.mood || []).join(", ") || "—";
    var actNames = activities.map(function(a) { return "• " + a.name; }).join("\n");
    var summaryMsg = "📍 " + city + " (" + centerName + ")\n" +
      "📅 " + dateStart + " → " + dateEnd + "\n" +
      "✨ " + moodStr + "\n" +
      "💰 " + profile.budget + " | 👥 " + profile.group + " | 📏 " + maxDistance + "km\n\n" +
      t("found") + " " + activities.length + " " + t("activities") + ":\n" + actNames;

    var confirmAlert = new Alert();
    confirmAlert.title = "🎤 " + t("voiceConfirm");
    confirmAlert.message = summaryMsg;
    confirmAlert.addAction("🗺️ " + t("viewMap"));
    confirmAlert.addAction("📤 " + t("exportKml"));
    confirmAlert.addCancelAction(t("cancel"));
    var vc = await confirmAlert.presentAlert();
    if (vc === -1) return showMainMenu();

    // Generate map
    var mapTitle = city + " - " + (dateStart === dateEnd ? dateStart : dateStart + " / " + dateEnd);
    var mapId = city.toLowerCase().replace(/\s+/g, "-") + "-" + dateStart;
    var fileName = mapId + ".html";

    var html = generateMapHTML(activities, centerLat, centerLng, centerName, mapTitle, maxDistance);
    var mapPath = fm.joinPath(mapsDir, fileName);
    fm.writeString(mapPath, html);

    var dataPath = fm.joinPath(mapsDir, mapId + ".json");
    writeJSON(dataPath, { activities: activities, profile: profile, center: { lat: centerLat, lng: centerLng, name: centerName } });

    var cats = [];
    activities.forEach(function(a) { if (cats.indexOf(a.category) === -1) cats.push(a.category); });
    cats.sort();
    var catLabels = cats.map(function(c) { return (CATEGORIES[c] || CATEGORIES.other).label; });
    updateRegistry({
      id: mapId, title: mapTitle, file: fileName, city: city,
      location: city + ", " + centerName,
      date_start: dateStart, date_end: dateEnd,
      date_label: dateStart + " - " + dateEnd,
      activities: activities.length, categories: catLabels,
      created: new Date().toISOString().split("T")[0],
    });

    if (vc === 0) {
      await showMapInWebView(mapPath);
    } else if (vc === 1) {
      var kml = generateKML(activities, centerLat, centerLng, centerName, mapTitle);
      var kmlPath = fm.joinPath(mapsDir, mapId + ".kml");
      fm.writeString(kmlPath, kml);
      await ShareSheet.present([kmlPath]);
    }
  } catch (e) {
    var errAlert = new Alert();
    errAlert.title = "❌ " + t("error");
    errAlert.message = String(e.message || e);
    errAlert.addAction("OK");
    await errAlert.presentAlert();
  }

  return showMainMenu();
}

// ─── UI: MENUS ───────────────────────────────────────────────────────────────

async function showMainMenu() {
  var menu = new Alert();
  menu.title = "🗺️ " + t("mainTitle");
  menu.message = t("mainMsg");
  menu.addAction("🎤 " + t("voicePlan"));
  menu.addAction("🆕 " + t("newTrip"));
  menu.addAction("📂 " + t("myMaps"));
  menu.addAction("⚙️ " + t("settings"));
  menu.addCancelAction(t("exit"));

  var choice = await menu.presentSheet();
  switch (choice) {
    case 0: return voicePlan();
    case 1: return planNewTrip();
    case 2: return showMyMaps();
    case 3: return showSettings();
  }
}

async function planNewTrip() {
  // 1. Location — Nominatim search with autocomplete
  var city, centerLat, centerLng, centerName;

  var locMethod = new Alert();
  locMethod.title = "📍 " + t("city");
  locMethod.message = t("cityMsg");
  locMethod.addAction("🔍 " + t("searchBtn"));
  locMethod.addAction("📍 " + t("useGPS"));
  locMethod.addCancelAction(t("cancel"));
  var lm = await locMethod.presentAlert();
  if (lm === -1) return showMainMenu();

  if (lm === 1) {
    // GPS
    var loc = await Location.current();
    centerLat = loc.latitude;
    centerLng = loc.longitude;
    // Reverse-geocode to get city name and neighbourhood
    var revResult = await reverseGeocode(centerLat, centerLng);
    if (revResult) {
      city = revResult.city;
      centerName = revResult.shortName || revResult.city;
    } else {
      city = "Unknown";
      centerName = "My Location";
    }
  } else {
    // Search loop — user can refine until they find the right place
    var found = false;
    while (!found) {
      var searchAlert = new Alert();
      searchAlert.title = "🔍 " + t("city");
      searchAlert.message = t("cityMsg");
      searchAlert.addTextField(t("cityPlaceholder"), "");
      searchAlert.addAction(t("searchBtn"));
      searchAlert.addCancelAction(t("cancel"));
      if (await searchAlert.presentAlert() === -1) return showMainMenu();

      var query = searchAlert.textFieldValue(0).trim();
      if (!query) continue;

      // Always use Nominatim so user picks their actual position
      try {
        var results = await searchLocation(query);
        if (results.length === 0) {
          var noRes = new Alert();
          noRes.title = t("noResults");
          noRes.addAction(t("searchBtn") + " ↻");
          noRes.addCancelAction(t("cancel"));
          if (await noRes.presentAlert() === -1) return showMainMenu();
          continue;
        }

        var pickAlert = new Alert();
        pickAlert.title = t("searchResults");
        pickAlert.message = t("pickLocation");
        for (var ri = 0; ri < results.length; ri++) {
          pickAlert.addAction(results[ri].shortName);
        }
        pickAlert.addAction("🔍 " + t("searchBtn") + " ↻");
        pickAlert.addCancelAction(t("cancel"));
        var pick = await pickAlert.presentAlert();

        if (pick === -1) return showMainMenu();
        if (pick === results.length) continue; // search again

        var sel = results[pick];
        city = sel.city;
        centerLat = sel.lat;
        centerLng = sel.lng;
        centerName = sel.shortName;
        found = true;
      } catch (e) {
        var errSearch = new Alert();
        errSearch.title = t("error");
        errSearch.message = String(e.message || e);
        errSearch.addAction("OK");
        await errSearch.presentAlert();
        continue;
      }
    }
  }

  // 2. Dates — DatePicker or manual entry
  var dateStart, dateEnd;
  var today = new Date();
  var tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  var dateMethod = new Alert();
  dateMethod.title = "📅 " + t("dates");
  dateMethod.message = t("datesMsg");
  dateMethod.addAction("📅 " + t("pickStart") + " / " + t("pickEnd"));
  dateMethod.addAction("⌨️ " + t("typeDates"));
  dateMethod.addCancelAction(t("cancel"));
  var dm = await dateMethod.presentAlert();
  if (dm === -1) return showMainMenu();

  if (dm === 0) {
    // Native DatePicker
    var dpStart = new DatePicker();
    dpStart.initialDate = today;
    dpStart.minimumDate = today;
    var startD = await dpStart.pickDate();
    dateStart = startD.toISOString().split("T")[0];

    var dpEnd = new DatePicker();
    dpEnd.initialDate = tomorrow;
    dpEnd.minimumDate = startD;
    var endD = await dpEnd.pickDate();
    dateEnd = endD.toISOString().split("T")[0];
  } else {
    // Manual text entry
    var todayStr = today.toISOString().split("T")[0];
    var tomorrowStr = tomorrow.toISOString().split("T")[0];
    var dateAlert = new Alert();
    dateAlert.title = "📅 " + t("dates");
    dateAlert.message = "YYYY-MM-DD";
    dateAlert.addTextField(t("startDate"), todayStr);
    dateAlert.addTextField(t("endDate"), tomorrowStr);
    dateAlert.addAction(t("next"));
    dateAlert.addCancelAction(t("cancel"));
    if (await dateAlert.presentAlert() === -1) return showMainMenu();
    dateStart = dateAlert.textFieldValue(0).trim();
    dateEnd = dateAlert.textFieldValue(1).trim();
  }

  // 3. Starting point confirmation (if from search, confirm or adjust)
  var spAlert = new Alert();
  spAlert.title = "📌 " + t("startPoint");
  spAlert.message = t("useThis") + '\n\n"' + centerName + '"\n(' + centerLat.toFixed(4) + ', ' + centerLng.toFixed(4) + ')';
  spAlert.addAction("✅ OK");
  spAlert.addAction("📍 " + t("useGPS"));
  spAlert.addAction("🔍 " + t("searchBtn"));
  var sp = await spAlert.presentAlert();
  if (sp === 1) {
    var locGps = await Location.current();
    centerLat = locGps.latitude;
    centerLng = locGps.longitude;
    var revGps = await reverseGeocode(centerLat, centerLng);
    if (revGps) {
      centerName = revGps.shortName || revGps.city;
      city = revGps.city;
    } else {
      centerName = "My Location";
    }
  } else if (sp === 2) {
    var spSearch = new Alert();
    spSearch.title = "🔍 " + t("startPoint");
    spSearch.addTextField(t("cityPlaceholder"), "");
    spSearch.addAction(t("searchBtn"));
    spSearch.addCancelAction(t("cancel"));
    if (await spSearch.presentAlert() === 0) {
      var spQ = spSearch.textFieldValue(0).trim();
      if (spQ) {
        var spResults = await searchLocation(spQ);
        if (spResults.length > 0) {
          var spPick = new Alert();
          spPick.title = t("pickLocation");
          for (var spi = 0; spi < spResults.length; spi++) {
            spPick.addAction(spResults[spi].shortName);
          }
          spPick.addCancelAction(t("cancel"));
          var spIdx = await spPick.presentAlert();
          if (spIdx >= 0) {
            centerLat = spResults[spIdx].lat;
            centerLng = spResults[spIdx].lng;
            centerName = spResults[spIdx].shortName;
          }
        }
      }
    }
  }

  // 4. LLM Provider
  var providerAlert = new Alert();
  providerAlert.title = "🤖 " + t("provider");
  providerAlert.message = t("providerMsg");
  var providerKeys = Object.keys(PROVIDERS);
  for (var pk = 0; pk < providerKeys.length; pk++) {
    var k = providerKeys[pk];
    var hasKey = k === "manual" ? " 🆓" : (getApiKey(k) ? " ✅" : (PROVIDERS[k].free ? " 🆓" : ""));
    providerAlert.addAction(PROVIDERS[k].label + hasKey);
  }
  providerAlert.addCancelAction(t("cancel"));
  var pIdx = await providerAlert.presentSheet();
  if (pIdx === -1) return showMainMenu();
  var provider = providerKeys[pIdx];

  if (provider !== "manual" && !getApiKey(provider)) {
    var keyAlert = new Alert();
    keyAlert.title = "🔑 " + t("apiKeyNeeded");
    keyAlert.message = t("apiKeyMsg") + "\n\n" + PROVIDERS[provider].label;
    keyAlert.addTextField("API Key", "");
    keyAlert.addAction(t("saveAndContinue"));
    keyAlert.addCancelAction(t("cancel"));
    if (await keyAlert.presentAlert() === -1) return showMainMenu();
    var apiKeyInput = keyAlert.textFieldValue(0).trim();
    if (!apiKeyInput) return showMainMenu();
    setApiKey(provider, apiKeyInput);
  }

  // 5. Questionnaire — build trip profile
  var profile = await runQuestionnaire(null);
  if (!profile) return showMainMenu();
  var maxDistance = profile.max_distance_km || 4;

  // 6. Search
  var statusAlert = new Alert();
  statusAlert.title = "🔍 " + t("searching");
  statusAlert.message = t("searchingMsg") + " " + city + "...\n\n" + t("searchWait");
  statusAlert.addAction("OK");
  await statusAlert.presentAlert();

  try {
    var resources = loadResources();
    var prompts = buildPromptFromProfile(city, dateStart, dateEnd, centerName, profile, resources, centerLat, centerLng);
    // Boost with web search if Tavily/Serper keys are configured
    var searchCtx = await webSearchBoost(city, dateStart, dateEnd, profile.specific || profile.interests);
    if (searchCtx) prompts.userPrompt += searchCtx;
    var response = await callLLM(provider, prompts.systemPrompt, prompts.userPrompt);
    var activities = parseActivities(response, dateStart, dateEnd);

    for (var ai = 0; ai < activities.length; ai++) {
      activities[ai].distance_km = Math.round(
        haversine(centerLat, centerLng, activities[ai].lat || centerLat, activities[ai].lng || centerLng) * 10
      ) / 10;
    }

    var mapTitle = city + " - " + (dateStart === dateEnd ? dateStart : dateStart + " / " + dateEnd);
    var mapId = city.toLowerCase().replace(/\s+/g, "-") + "-" + dateStart;
    var fileName = mapId + ".html";

    var html = generateMapHTML(activities, centerLat, centerLng, centerName, mapTitle, maxDistance);
    var mapPath = fm.joinPath(mapsDir, fileName);
    fm.writeString(mapPath, html);

    var dataPath = fm.joinPath(mapsDir, mapId + ".json");
    writeJSON(dataPath, { activities: activities, profile: profile, center: { lat: centerLat, lng: centerLng, name: centerName } });

    var cats = [];
    activities.forEach(function(a) { if (cats.indexOf(a.category) === -1) cats.push(a.category); });
    cats.sort();
    var catLabels = cats.map(function(c) { return (CATEGORIES[c] || CATEGORIES.other).label; });
    var total = updateRegistry({
      id: mapId, title: mapTitle, file: fileName, city: city,
      location: city + ", " + centerName,
      date_start: dateStart, date_end: dateEnd,
      date_label: dateStart + " - " + dateEnd,
      activities: activities.length, categories: catLabels,
      created: new Date().toISOString().split("T")[0],
    });

    var resultAlert = new Alert();
    resultAlert.title = "✅ " + t("mapCreated");
    resultAlert.message = t("found") + " " + activities.length + " " + t("activitiesIn") + " " + city + ".\n" + total + " " + t("mapsCollection") + ".\n\n" + t("openNow");
    resultAlert.addAction("🗺️ " + t("viewMap"));
    resultAlert.addAction("📤 " + t("exportKml"));
    resultAlert.addAction(t("done"));
    var rChoice = await resultAlert.presentAlert();

    if (rChoice === 0) {
      await showMapInWebView(mapPath);
    } else if (rChoice === 1) {
      var kml = generateKML(activities, centerLat, centerLng, centerName, mapTitle);
      var kmlPath = fm.joinPath(mapsDir, mapId + ".kml");
      fm.writeString(kmlPath, kml);
      await ShareSheet.present([kmlPath]);
    }
  } catch (e) {
    var errAlert = new Alert();
    errAlert.title = "❌ " + t("error");
    errAlert.message = String(e.message || e);
    errAlert.addAction("OK");
    await errAlert.presentAlert();
  }

  return showMainMenu();
}

async function showMyMaps() {
  var registry = loadRegistry();
  if (registry.length === 0) {
    var empty = new Alert();
    empty.title = "📂 " + t("myMaps");
    empty.message = t("noMaps");
    empty.addAction("OK");
    await empty.presentAlert();
    return showMainMenu();
  }

  var menu = new Alert();
  menu.title = "📂 " + t("myMaps");
  menu.message = registry.length + " " + t("mapsCount").toLowerCase();
  for (var ri = 0; ri < registry.length; ri++) {
    var m = registry[ri];
    menu.addAction(m.city + " — " + (m.date_label || m.date_start) + " (" + m.activities + ")");
  }
  menu.addCancelAction(t("back"));
  var idx = await menu.presentSheet();
  if (idx === -1) return showMainMenu();

  var selected = registry[idx];
  var mapPath = fm.joinPath(mapsDir, selected.file);

  if (!fm.fileExists(mapPath)) {
    var errFile = new Alert();
    errFile.title = t("error");
    errFile.message = "Map file not found.";
    errFile.addAction("OK");
    await errFile.presentAlert();
    return showMyMaps();
  }

  // Load saved map data (handles both old array and new {activities, profile, center} format)
  var dataPath2 = fm.joinPath(mapsDir, selected.id + ".json");
  var mapData = fm.fileExists(dataPath2) ? readJSON(dataPath2, {}) : {};
  var savedActivities = Array.isArray(mapData) ? mapData : (mapData.activities || []);
  var savedProfile = mapData.profile || null;
  var savedCenter = mapData.center || null;

  var cLat = savedCenter ? savedCenter.lat : 0;
  var cLng = savedCenter ? savedCenter.lng : 0;
  var cName = savedCenter ? savedCenter.name : (selected.location || selected.city);

  var actionMenu = new Alert();
  actionMenu.title = selected.title;
  actionMenu.message = selected.activities + " " + t("activities") + " • " + selected.categories.join(", ");
  actionMenu.addAction("🗺️ " + t("viewMap"));
  actionMenu.addAction("➕ " + t("addToMap"));
  actionMenu.addAction("📤 " + t("exportKml"));
  actionMenu.addDestructiveAction("🗑️ " + t("delete"));
  actionMenu.addCancelAction(t("back"));
  var action = await actionMenu.presentSheet();

  if (action === 0) {
    // View map
    await showMapInWebView(mapPath);
    return showMyMaps();
  } else if (action === 1) {
    // Add events to existing map
    await addEventsToMap(selected, savedActivities, savedProfile, cLat, cLng, cName);
    return showMyMaps();
  } else if (action === 2) {
    // Export KML
    if (savedActivities.length > 0) {
      var kml2 = generateKML(savedActivities, cLat, cLng, cName, selected.title);
      var kmlPath2 = fm.joinPath(mapsDir, selected.id + ".kml");
      fm.writeString(kmlPath2, kml2);
      await ShareSheet.present([kmlPath2]);
    }
    return showMyMaps();
  } else if (action === 3) {
    // Delete
    var confirm = new Alert();
    confirm.title = t("deleteMap");
    confirm.message = '"' + selected.title + '"?';
    confirm.addDestructiveAction(t("delete"));
    confirm.addCancelAction(t("cancel"));
    if (await confirm.presentAlert() === 0) {
      if (fm.fileExists(mapPath)) fm.remove(mapPath);
      var dp = fm.joinPath(mapsDir, selected.id + ".json");
      if (fm.fileExists(dp)) fm.remove(dp);
      var kp = fm.joinPath(mapsDir, selected.id + ".kml");
      if (fm.fileExists(kp)) fm.remove(kp);
      var reg = loadRegistry();
      reg = reg.filter(function(rm) { return rm.id !== selected.id; });
      saveRegistry(reg);
    }
    return showMyMaps();
  }

  return showMyMaps();
}

// ─── ADD EVENTS TO EXISTING MAP ──────────────────────────────────────────────

async function addEventsToMap(mapEntry, existingActivities, existingProfile, centerLat, centerLng, centerName) {
  // Show what exists and offer quick-add or custom
  var infoAlert = new Alert();
  infoAlert.title = "➕ " + t("addToMap");
  infoAlert.message = mapEntry.title + "\n\n" + existingActivities.length + " " + t("existingEvents") + "\n\n" + t("addToMapMsg");
  infoAlert.addAction("⚡ " + t("quickAdd"));
  infoAlert.addAction("🎯 " + t("qTitle"));
  infoAlert.addCancelAction(t("cancel"));
  var modeChoice = await infoAlert.presentAlert();
  if (modeChoice === -1) return;

  var profile;
  if (modeChoice === 0 && existingProfile) {
    // Quick-add: reuse saved profile, just pick a model
    profile = JSON.parse(JSON.stringify(existingProfile));
  } else if (modeChoice === 0 && !existingProfile) {
    // No saved profile — fall back to questionnaire
    profile = await runQuestionnaire(null);
    if (!profile) return;
  } else {
    // Custom: run questionnaire with existing profile as starting point
    profile = await runQuestionnaire(existingProfile);
    if (!profile) return;
  }

  // Pick LLM provider(s) — allow selecting multiple
  var providerAlert = new Alert();
  providerAlert.title = "🤖 " + t("provider");
  providerAlert.message = t("providerMsg") + "\n\n" + t("multiModelMsg");
  var providerKeys = Object.keys(PROVIDERS);
  var selectedProviders = [];
  var providerDone = false;
  while (!providerDone) {
    providerAlert = new Alert();
    providerAlert.title = "🤖 " + t("provider");
    providerAlert.message = t("providerMsg") +
      (selectedProviders.length > 0 ? "\n\n✅ " + selectedProviders.map(function(p) { return PROVIDERS[p].label; }).join(", ") : "");
    for (var pk = 0; pk < providerKeys.length; pk++) {
      var k = providerKeys[pk];
      var hasKey = k === "manual" ? " 🆓" : (getApiKey(k) ? " ✅" : (PROVIDERS[k].free ? " 🆓" : ""));
      var selected = selectedProviders.indexOf(k) !== -1 ? " ☑️" : "";
      providerAlert.addAction(PROVIDERS[k].label + hasKey + selected);
    }
    if (selectedProviders.length > 0) providerAlert.addAction("🚀 " + t("qSearch") + " (" + selectedProviders.length + ")");
    providerAlert.addCancelAction(t("cancel"));
    var pIdx = await providerAlert.presentSheet();
    if (pIdx === -1) return;
    if (selectedProviders.length > 0 && pIdx === providerKeys.length) {
      providerDone = true;
    } else {
      var pk2 = providerKeys[pIdx];
      var spIdx = selectedProviders.indexOf(pk2);
      if (spIdx === -1) {
        selectedProviders.push(pk2);
        // If only one selected and user doesn't need multi, auto-proceed
        if (selectedProviders.length === 1) {
          // Show again to let them add more or proceed
        }
      } else {
        selectedProviders.splice(spIdx, 1);
      }
      // If first selection, also allow direct proceed
      if (selectedProviders.length === 1 && spIdx === -1) {
        var multiQ = new Alert();
        multiQ.title = "🤖 " + PROVIDERS[pk2].label;
        multiQ.message = t("addMoreModels");
        multiQ.addAction("🚀 " + t("qSearch"));
        multiQ.addAction("➕ " + t("addAnotherModel"));
        multiQ.addCancelAction(t("cancel"));
        var mq = await multiQ.presentAlert();
        if (mq === -1) return;
        if (mq === 0) providerDone = true;
      }
    }
  }

  // Ensure all selected providers have API keys
  for (var si = 0; si < selectedProviders.length; si++) {
    var prov = selectedProviders[si];
    if (prov !== "manual" && !getApiKey(prov)) {
      var keyAlert = new Alert();
      keyAlert.title = "🔑 " + t("apiKeyNeeded");
      keyAlert.message = t("apiKeyMsg") + "\n\n" + PROVIDERS[prov].label;
      keyAlert.addTextField("API Key", "");
      keyAlert.addAction(t("saveAndContinue"));
      keyAlert.addCancelAction(t("cancel"));
      if (await keyAlert.presentAlert() === -1) return;
      var apiKeyInput = keyAlert.textFieldValue(0).trim();
      if (!apiKeyInput) return;
      setApiKey(prov, apiKeyInput);
    }
  }

  // Build avoid list from existing activities
  var merged = existingActivities.slice();
  var existingNamesSet = {};
  existingActivities.forEach(function(a) { existingNamesSet[a.name.toLowerCase()] = true; });
  var totalAdded = 0;

  // Search with each selected provider
  for (var pi = 0; pi < selectedProviders.length; pi++) {
    var curProvider = selectedProviders[pi];
    var searchProfile = JSON.parse(JSON.stringify(profile));
    if (!searchProfile.avoid) searchProfile.avoid = [];
    // Include both original + already-merged names to avoid duplicates across providers
    var allNames = merged.map(function(a) { return a.name; });
    searchProfile.avoid.push("DO NOT repeat these already-listed activities: " + allNames.join(", "));

    var statusAlert = new Alert();
    statusAlert.title = "🔍 " + t("searching") + " (" + (pi + 1) + "/" + selectedProviders.length + ")";
    statusAlert.message = t("searchingMsg") + " " + mapEntry.city + "\n🤖 " + PROVIDERS[curProvider].label + "\n\n" + t("searchWait");
    statusAlert.addAction("OK");
    await statusAlert.presentAlert();

    try {
      var resources = loadResources();
      var prompts = buildPromptFromProfile(mapEntry.city, mapEntry.date_start, mapEntry.date_end, centerName, searchProfile, resources, centerLat, centerLng);
      var searchCtx2 = await webSearchBoost(mapEntry.city, mapEntry.date_start, mapEntry.date_end, searchProfile.specific || searchProfile.interests);
      if (searchCtx2) prompts.userPrompt += searchCtx2;
      var response = await callLLM(curProvider, prompts.systemPrompt, prompts.userPrompt);
      var newActivities = parseActivities(response, mapEntry.date_start, mapEntry.date_end);

      for (var ai = 0; ai < newActivities.length; ai++) {
        newActivities[ai].distance_km = Math.round(
          haversine(centerLat, centerLng, newActivities[ai].lat || centerLat, newActivities[ai].lng || centerLng) * 10
        ) / 10;
      }

      // Show what we found and confirm merge
      var newNames = newActivities.map(function(a) { return "• " + a.name; }).join("\n");
      var mergeAlert = new Alert();
      mergeAlert.title = "✅ " + PROVIDERS[curProvider].label + ": " + newActivities.length + " " + t("activities");
      mergeAlert.message = newNames + "\n\n" + t("mergeConfirm");
      mergeAlert.addAction("✅ " + t("addToMap"));
      mergeAlert.addCancelAction(t("cancel"));
      var mc2 = await mergeAlert.presentAlert();

      if (mc2 === 0) {
        // Deduplicate and merge
        newActivities.forEach(function(a) {
          if (!existingNamesSet[a.name.toLowerCase()]) {
            merged.push(a);
            existingNamesSet[a.name.toLowerCase()] = true;
            totalAdded++;
          }
        });
      }
    } catch (e) {
      var errAlert = new Alert();
      errAlert.title = "❌ " + PROVIDERS[curProvider].label;
      errAlert.message = String(e.message || e);
      errAlert.addAction("OK");
      await errAlert.presentAlert();
    }
  }

  if (totalAdded === 0) return;

  // Regenerate map HTML
  var maxDistance = profile.max_distance_km || 4;
  var html = generateMapHTML(merged, centerLat, centerLng, centerName, mapEntry.title, maxDistance);
  var mapPath = fm.joinPath(mapsDir, mapEntry.file);
  fm.writeString(mapPath, html);

  // Save updated data
  var dataPath = fm.joinPath(mapsDir, mapEntry.id + ".json");
  writeJSON(dataPath, { activities: merged, profile: profile, center: { lat: centerLat, lng: centerLng, name: centerName } });

  // Update registry
  var cats = [];
  merged.forEach(function(a) { if (cats.indexOf(a.category) === -1) cats.push(a.category); });
  cats.sort();
  mapEntry.activities = merged.length;
  mapEntry.categories = cats.map(function(c) { return (CATEGORIES[c] || CATEGORIES.other).label; });
  var reg = loadRegistry();
  reg = reg.map(function(r) { return r.id === mapEntry.id ? mapEntry : r; });
  saveRegistry(reg);

  var doneAlert = new Alert();
  doneAlert.title = "✅ " + totalAdded + " " + t("addToMapDone");
  doneAlert.message = merged.length + " " + t("activities") + " total";
  doneAlert.addAction("🗺️ " + t("viewMap"));
  doneAlert.addAction(t("done"));
  var doneChoice = await doneAlert.presentAlert();

  if (doneChoice === 0) {
    await showMapInWebView(mapPath);
  }
}

async function showMapInWebView(mapPath) {
  if (!fm.isFileDownloaded(mapPath)) fm.downloadFileFromiCloud(mapPath);
  var html = fm.readString(mapPath);
  var wv = new WebView();
  await wv.loadHTML(html);
  await wv.present(true);
}

async function showSettings() {
  var menu = new Alert();
  menu.title = "⚙️ " + t("settings");
  menu.addAction("🔑 " + t("apiKeys"));
  menu.addAction("❤️ " + t("preferences"));
  menu.addAction("🌐 " + t("language"));
  menu.addAction("📊 " + t("storage"));
  menu.addCancelAction(t("back"));

  var choice = await menu.presentSheet();

  if (choice === 0) {
    // API Keys — show LLM providers + search APIs
    var keyMenu = new Alert();
    keyMenu.title = "🔑 " + t("apiKeys");
    keyMenu.message = "🤖 AI Providers + 🔍 Search APIs";
    var keyProviders = Object.keys(PROVIDERS).filter(function(p) { return p !== "manual"; });
    var searchApiKeys = Object.keys(SEARCH_APIS);
    // LLM providers
    for (var pe = 0; pe < keyProviders.length; pe++) {
      var provId = keyProviders[pe];
      var provInfo = PROVIDERS[provId];
      var hasKey2 = getApiKey(provId);
      keyMenu.addAction("🤖 " + provInfo.label + ": " + (hasKey2 ? "✅" : "❌"));
    }
    // Search APIs
    for (var se = 0; se < searchApiKeys.length; se++) {
      var sId = searchApiKeys[se];
      var sInfo = SEARCH_APIS[sId];
      var hasSearchKey = getSearchApiKey(sId);
      keyMenu.addAction("🔍 " + sInfo.label + ": " + (hasSearchKey ? "✅" : "❌"));
    }
    keyMenu.addCancelAction(t("back"));
    var kIdx = await keyMenu.presentSheet();
    if (kIdx >= 0 && kIdx < keyProviders.length) {
      // LLM provider selected
      var selProvId = keyProviders[kIdx];
      var selProv = PROVIDERS[selProvId];
      var existing = getApiKey(selProvId);

      var keyAlert2 = new Alert();
      keyAlert2.title = selProv.label;
      keyAlert2.message = (existing
        ? "Key: " + existing.substring(0, 8) + "..." + existing.substring(existing.length - 4)
        : t("apiKeyMsg")) +
        (selProv.signupUrl ? "\n\n🔗 Get key: " + selProv.signupUrl : "");
      keyAlert2.addTextField("API Key", "");
      keyAlert2.addAction(t("save"));
      if (selProv.signupUrl) keyAlert2.addAction("🌐 Open Signup");
      if (existing) keyAlert2.addDestructiveAction(t("delete"));
      keyAlert2.addCancelAction(t("cancel"));
      var kChoice = await keyAlert2.presentAlert();
      if (kChoice === 0) {
        var newKey = keyAlert2.textFieldValue(0).trim();
        if (newKey) setApiKey(selProvId, newKey);
      } else if (kChoice === 1 && selProv.signupUrl) {
        Safari.open(selProv.signupUrl);
      } else if ((kChoice === 1 && !selProv.signupUrl && existing) || (kChoice === 2 && existing)) {
        Keychain.remove(selProv.keyName);
      }
    } else if (kIdx >= keyProviders.length) {
      // Search API selected
      var sIdx = kIdx - keyProviders.length;
      var selSearchId = searchApiKeys[sIdx];
      var selSearch = SEARCH_APIS[selSearchId];
      var existingSearch = getSearchApiKey(selSearchId);

      var searchKeyAlert = new Alert();
      searchKeyAlert.title = selSearch.label;
      searchKeyAlert.message = (existingSearch
        ? "Key: " + existingSearch.substring(0, 8) + "..." + existingSearch.substring(existingSearch.length - 4) + "\n\n" + t("searchApiInfo")
        : t("apiKeyMsg") + "\n\n" + t("searchApiInfo")) +
        "\n\n🔗 Get key: " + selSearch.signupUrl;
      searchKeyAlert.addTextField("API Key", "");
      searchKeyAlert.addAction(t("save"));
      searchKeyAlert.addAction("🌐 Open Signup");
      if (existingSearch) searchKeyAlert.addDestructiveAction(t("delete"));
      searchKeyAlert.addCancelAction(t("cancel"));
      var sChoice = await searchKeyAlert.presentAlert();
      if (sChoice === 0) {
        var newSKey = searchKeyAlert.textFieldValue(0).trim();
        if (newSKey) setSearchApiKey(selSearchId, newSKey);
      } else if (sChoice === 1) {
        Safari.open(selSearch.signupUrl);
      } else if (sChoice === 2 && existingSearch) {
        Keychain.remove(selSearch.keyName);
      }
    }
    return showSettings();
  } else if (choice === 1) {
    // Preferences
    var prefs2 = loadPreferences();
    var prefAlert = new Alert();
    prefAlert.title = "❤️ " + t("preferences");
    prefAlert.message = t("interests") + ": " + prefs2.interests.join(", ") +
      "\n" + t("musicGenres") + ": " + prefs2.music_genres.join(", ") +
      "\n" + t("maxDistKm") + ": " + (prefs2.transport?.max_distance_km || 4) + "km";
    prefAlert.addAction("✏️ " + t("editInterests"));
    prefAlert.addAction("📏 " + t("editDistance"));
    prefAlert.addCancelAction(t("back"));
    var pChoice = await prefAlert.presentAlert();

    if (pChoice === 0) {
      var editAlert = new Alert();
      editAlert.title = t("editInterests");
      editAlert.addTextField(t("interests"), prefs2.interests.join(", "));
      editAlert.addTextField(t("musicGenres"), prefs2.music_genres.join(", "));
      editAlert.addAction(t("save"));
      editAlert.addCancelAction(t("cancel"));
      if (await editAlert.presentAlert() === 0) {
        prefs2.interests = editAlert.textFieldValue(0).split(",").map(function(s) { return s.trim(); }).filter(Boolean);
        prefs2.music_genres = editAlert.textFieldValue(1).split(",").map(function(s) { return s.trim(); }).filter(Boolean);
        writeJSON(prefsPath, prefs2);
      }
    } else if (pChoice === 1) {
      var distAlert = new Alert();
      distAlert.title = t("maxDistKm");
      distAlert.addTextField("km", String(prefs2.transport?.max_distance_km || 4));
      distAlert.addAction(t("save"));
      distAlert.addCancelAction(t("cancel"));
      if (await distAlert.presentAlert() === 0) {
        if (!prefs2.transport) prefs2.transport = {};
        prefs2.transport.max_distance_km = parseFloat(distAlert.textFieldValue(0)) || 4;
        writeJSON(prefsPath, prefs2);
      }
    }
    return showSettings();
  } else if (choice === 2) {
    // Language selector
    var langMenu = new Alert();
    langMenu.title = "🌐 " + t("language");
    var currentLang = getLang();
    langMenu.addAction("🇬🇧 English" + (currentLang === "en" ? " ✅" : ""));
    langMenu.addAction("🇮🇹 Italiano" + (currentLang === "it" ? " ✅" : ""));
    langMenu.addAction("🇪🇸 Español" + (currentLang === "es" ? " ✅" : ""));
    langMenu.addCancelAction(t("back"));
    var langChoice = await langMenu.presentAlert();
    if (langChoice === 0) setLang("en");
    else if (langChoice === 1) setLang("it");
    else if (langChoice === 2) setLang("es");
    return showSettings();
  } else if (choice === 3) {
    // Storage info
    var registry2 = loadRegistry();
    var configuredProviders = Object.keys(PROVIDERS).filter(function(p) { return p !== "manual" && getApiKey(p); });
    var info = new Alert();
    info.title = "📊 " + t("storage");
    info.message = t("mapsCount") + ": " + registry2.length +
      "\n" + t("storageLoc") +
      "\n\n" + t("providersSet") + ": " + (configuredProviders.join(", ") || "—");
    info.addAction("OK");
    await info.presentAlert();
    return showSettings();
  }

  return showMainMenu();
}

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────

await showMainMenu();

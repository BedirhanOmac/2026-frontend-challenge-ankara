# Missing Podo: The Ankara Case

**Author:** Bedirhan Omac
**Challenge:** Jotform 2026 Frontend Challenge — Ankara
**Stack:** React 18 + Vite + Leaflet.js

---

## What it does

An investigation dashboard that aggregates data from 5 live Jotform API endpoints and presents it as a mystery-solving interface. The premise: Podo went missing at an event in Ankara. The user investigates using check-ins, messages, sightings, investigator notes, and anonymous tips to piece together what happened.

---

## Architecture

```
src/
├── api/
│   └── jotform.js          # All data fetching and normalization
├── hooks/
│   └── useInvestigationData.js   # React data layer (loading/error/retry)
├── components/
│   ├── Timeline.jsx         # Merged chronological event feed
│   ├── PersonList.jsx        # Sidebar: all persons extracted from data
│   ├── PersonDetail.jsx      # Panel: all records linked to one person
│   ├── SuspectPanel.jsx      # Ranked suspects from anonymous tips
│   ├── MapView.jsx           # Leaflet map with color-coded pins + route
│   └── SearchBar.jsx         # Search input
└── App.jsx                   # Root: tab state, open-person state, layout
```

---

## Data layer (`src/api/jotform.js`)

### The JotForm answer problem

JotForm API returns answers as a numbered map, not named keys:
```json
{
  "2": { "name": "personName", "type": "control_textbox", "answer": "Podo" },
  "3": { "name": "timestamp", "answer": "18-04-2026 19:05" }
}
```

`flattenAnswers()` converts this into `{ personName: "Podo", timestamp: "18-04-2026 19:05" }` by iterating the numeric keys and using each field's `name` property as the result key.

The critical edge case: optional fields that were left blank don't include an `answer` key at all — the field object only has `name` and `type`. A naive `field.answer ?? ''` still returns `''`, but `field.name` would return the string `"mentionedPeople"` as if it were data. The fix: `'answer' in field` check before reading.

### Timestamp parsing

JotForm timestamps come as `"18-04-2026 19:05"` (DD-MM-YYYY HH:mm) — not ISO 8601. `new Date("18-04-2026")` fails silently, returning an invalid Date. A manual regex extracts the parts and reconstructs as `"${year}-${month}-${day}T${hour}:${minute}:00"` for valid parsing.

### Fuzzy name matching (`getPersonKey`)

The same person appears across forms with slight variations: `"Kağan"`, `"Kagan"`, `"Kağan A."`. Two steps:

1. `normalizeName()` — strips all diacritics using Unicode NFD decomposition plus manual replacement for Turkish characters that don't decompose (`ğ→g`, `ş→s`, `ı→i`, `ö→o`, `ü→u`, `ç→c`). Result: `"kagan a."`

2. `getPersonKey()` — takes only the first word: `"kagan"`. All variants now map to the same key, so they're merged everywhere in the UI without losing data.

Display name preference: whenever a new record is seen for a key, the longer display name wins. `"Kağan A."` beats `"Kağan"` because it's more specific.

---

## Hooks (`src/hooks/useInvestigationData.js`)

`useInvestigationData` runs `fetchAllData()` via `Promise.all` across all 5 forms in parallel. State:

- `loading` — shows a full-screen spinner
- `error` — shows an error screen with a retry button
- `data` — the normalized event arrays
- `retryCount` — incrementing this is the retry mechanism (it's in the `useEffect` dependency array)

The `cancelled` flag prevents stale state updates if the component unmounts mid-fetch (React StrictMode runs effects twice in dev, which makes this pattern essential).

---

## Components

### Timeline (`Timeline.jsx`)

Merges all 5 event arrays, sorts by timestamp (nulls pushed to end), then filters by search query. Search is applied to: people names, event content text, and location — all normalized through `normalizeName()` so Turkish characters don't break substring matching.

Each event card has a left border colored by type (navy/purple/orange/green/red). Person names are rendered as `<button>` elements that call `onPersonClick`, which opens that person's detail panel. Location names call `onLocationClick`, which sets the search query to that location (cross-tab navigation).

### PersonList (`PersonList.jsx`)

Scans all 5 data sources and builds a `Map<personKey, {displayName, counts, total}>`. Handles bidirectional sighting tracking: if `Podo` was seen with `Kağan`, both get a `lastSeen` entry pointing to the other. Sorted by total record count descending so the most-referenced people surface first.

Renders a sidebar with color-coded mini-badges showing how many records of each type exist for each person. Selected persons (open panels) are highlighted.

### PersonDetail (`PersonDetail.jsx`)

Given a `personKey`, scans all 5 data sources for records where that person is involved in any role: `subject`, `sender`, `recipient`, `author`, `companion`, `mentioned`, `suspect`. Returns all matching records sorted by timestamp.

Multiple PersonDetail panels can be open simultaneously (max 3, enforced in App.jsx). The oldest panel is dropped when a 4th is opened — FIFO. Each panel is independently scrollable (`overflow-y: auto`, `max-height: 70vh`).

### SuspectPanel (`SuspectPanel.jsx`)

Reads only the tips data. Applies weighted scoring: high confidence = 3 points, medium = 2, low = 1. Suspects are merged by `getPersonKey` (same fuzzy matching as everywhere else) and sorted by score descending. The #1 suspect gets a "PRIME SUSPECT" label and highlighted card border.

### MapView (`MapView.jsx`)

Plain Leaflet (not react-leaflet) initialized inside a `useEffect`. The map instance is created fresh on every render (triggered when `allEvents` or `podoRoute` memo deps change), and the cleanup function calls `map.remove()` to tear it down.

**Marker layering**: event types are added in order — tips first (bottom), checkins last (top). At shared coordinates, Podo's check-in markers surface on top of anonymous tips. This matters because all check-ins happen to be at CerModern, where tips also exist.

**Podo's route**: filters checkins + sightings where `personName === 'podo'`, sorts by timestamp, draws a dashed orange polyline. The route line is only drawn if there are 2+ *distinct* coordinates — if all events are at the same location the polyline would be invisible, so the condition guards against that.

**Map↔person sync**: clicking "View profile →" in a map popup calls `onPersonClick(getPersonKey(name))`, which opens that person's detail panel and switches to the PERSONS tab. The callback is stored in a `useRef` so Leaflet's `popupopen` handler always calls the latest version without creating a stale closure.

---

## App state (`App.jsx`)

```
activeTab: 'timeline' | 'persons' | 'suspects' | 'map'
openPersons: string[]   // personKeys, max 3
searchQuery: string
```

**Search reset**: a `useEffect` watching `activeTab` clears `searchQuery` on every tab switch. This is more reliable than clearing in each button's `onClick` because it also fires when tabs are switched programmatically (e.g., when clicking a person name on the map switches to PERSONS).

**Person panel management**: `openPerson(key)` adds to the array; if already at 3, it drops the oldest first. `closePerson(key)` removes by key. `togglePerson(key)` is used by the PersonList sidebar (click-to-select behavior).

---

## Design system

Jotform design language: white base (`#ffffff`), section backgrounds (`#f3f3fe`), deep navy headings (`#0a1551`), muted blue-grey text (`#545e94`), orange accent (`#ff6100`). Font: Plus Jakarta Sans (Google Fonts).

Event type color coding (consistent across all views):
| Type | Color |
|---|---|
| Check-in | `#0a1551` navy |
| Message | `#7c3aed` purple |
| Sighting | `#ff6100` orange |
| Note | `#059669` green |
| Tip | `#e02020` red |

---

## Run

```bash
npm install
npm run dev
# Open http://localhost:5173
```

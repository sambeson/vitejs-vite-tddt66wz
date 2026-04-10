# Design Spec: Prospect Badges, Stat Leaders, and Records Tab
Date: 2026-04-09

## Overview

Three connected features:
1. **Prospect badges** in box score player names — small symbol indicating top-100 overall or top-30 org prospect
2. **Leaders tab** — current season batting and pitching stat leaders, paginated, links to player modals
3. **Records tab** — all-time career and single-season stat leaders, paginated, links to player modals

---

## 1. Prospect Badges

### Data Source
MLB Stats API prospect endpoint, fetched per team on demand:
```
GET /api/v1/teams/{teamId}/roster?rosterType=prospect
```
This returns a ranked list of prospects for a given org. A separate top-100 overall list will be fetched from:
```
GET /api/v1/draft/prospects?limit=100
```
**Endpoint verification required before implementation.** If this endpoint is unavailable or returns no usable rank data, the top-100 badge (`★`) is skipped entirely and only org top-30 badges (`◆`) are shown. Prospect fetches that fail are silently ignored — badges are a bonus, not critical.

### Caching
- localStorage key: `prospects_{teamId}` and `prospects_top100`
- TTL: 24 hours, date-stamped
- Cache-first: on box score load, check localStorage. If valid cache exists (within TTL), load from cache and skip fetch. Only fetch if missing or expired.

### State
```typescript
prospectTop100: Set<number>          // player IDs in top 100 overall
prospectByTeam: Record<number, Set<number>>  // teamId → Set of player IDs in that team's top 30
```
Each team's top-30 is fetched (or loaded from cache) when that team's box score is first loaded. Entries added to `prospectByTeam` incrementally.

### Top-100 Endpoint Note
`/api/v1/draft/prospects` is a draft endpoint — player IDs may not match active roster IDs. **Verify the correct MLB Pipeline top-100 endpoint before implementing.** If no suitable endpoint exists, drop the `★` badge entirely and only show `◆` for org top-30.

### Display
- Top 100 overall: `★` gold (`#FFD700`), font-size `0.65em`, superscript
- Top 30 org but NOT in top 100: `◆` blue (`#4A90D9`), font-size `0.65em`, superscript
- If player is in both: show `★` only
- Rendered inline after the full player display name string in box score batting and pitching lines, for ALL players (both teams)
- No tooltip

### Known Limitation
`prospectByTeam` is only populated when a team's box score has been loaded (or a valid cache entry exists). Players in the Leaders/Records tab whose team has never been box-score-loaded will show no badge at all (neither ★ nor ◆, regardless of prospect status). This is acceptable — badges in those lists are a bonus that appears naturally as the user browses games.

---

## 2. Leaders Tab

### Nav
New tab `leaders` added to the main nav alongside `games`, `standings`, `mentaculous`, `historical`, `records`.

### Sub-tabs
**Batting** and **Pitching**, toggled within the tab.

### Batting Categories
AVG, HR, RBI, R, H, SB, OBP, SLG, OPS, BB, SO, 2B, 3B
Note: XBH (extra-base hits) is excluded — it is a derived stat not natively available from the MLB Stats API leaders endpoint.

### Pitching Categories
ERA, W, SO, SV, WHIP, IP, HLD, CG, SHO, BB, H9, HR9, K9, K/BB

### Data Source
Start with `year = new Date().getFullYear()`. If API returns 0 results, retry once with `year - 1` (single fallback only — do not chain further). If `year - 1` also returns 0 results, show an error state. **Store the actual year used** in the cached payload (e.g., `{ year: 2025, leaders: [...] }`). On cache load, read `payload.year` and display "(YYYY season)" label if it differs from the current year. Cache key always uses the actual year returned, not the current year.
```
GET /api/v1/stats/leaders?leaderCategories={category}&season={year}&limit=25&statGroup=hitting
GET /api/v1/stats/leaders?leaderCategories={category}&season={year}&limit=25&statGroup=pitching
```
Fetched on first visit to the Leaders tab, then on category change if not yet cached.

### Caching
- `localStorage` key: `leaders_{category}_{actualYear}` (using the year the API actually returned data for)
- TTL: 24 hours
- **Never cache a 0-result response.** A 0-result response is treated as a miss — do not write to cache, so the fallback retry and eventual live data can populate it correctly.
- On cache hit within TTL, skip fetch
- `_all` keys (`leaders_{category}_{actualYear}_all`) are **not written to localStorage** — they are held in React state only for the duration of the session. This avoids unbounded localStorage growth and keeps the TTL logic simple.

### Default State
- Default sub-tab: Batting
- Default category: HR

### Pagination / Show All
- Default view: top 25 (loaded from top-25 cache entry on return visits)
- "Show all" fetches limit=999, held in React state only (not localStorage)
- `showAll` flag resets to `false` on any category switch, sub-tab switch, or data reload (including year-fallback completing)
- "Show all" button hidden if top-25 result has fewer than 26 entries
- Back button returns to top 25 view and resets `showAll` flag
- Switching categories always resets to top-25 view

### Layout
- Category selector: horizontally scrollable pill buttons at top
- Ranked list below: rank number, player name (tappable → PlayerProfile modal), team abbreviation, stat value
- Loading state ("Loading...") shown while fetching; error state ("Failed to load") shown on fetch failure

### Player Modal Link
Clicking a player name sets `selectedPlayerId` and opens the existing `PlayerProfile` component.

---

## 3. Records Tab

### Nav
New tab `records` in the main nav.

### Sub-tabs
**Career** (always present) and **Single Season** (conditional — implement only if API verification confirms `statType=season` without a `season` param returns all-time single-season bests, not current-season data. If verification fails, Records tab is Career-only).

### Categories (same for both sub-tabs)
**Batting:** HR, AVG, RBI, R, H, SB, OBP, SLG, OPS, BB, 2B, 3B
**Pitching:** SO, W, ERA, SV, WHIP, IP, K9, SHO

### Default State
- Default sub-tab: Career
- Default category: HR (batting)
- Separate batting/pitching toggle within each sub-tab, same as Leaders tab

### Data Source
Career sub-tab needs no `season` parameter.

Single Season sub-tab — the MLB Stats API's `statType=season` without a `season` param may default to the current season rather than all-time single-season bests. **Before implementing the Single Season sub-tab, the implementer must verify** whether omitting `season` returns all-time bests or current-season leaders. Decision tree:
- If omitting `season` returns all-time single-season bests → use as written below.
- If it returns current-season data → the endpoint doesn't support all-time single-season records in this way. In that case, **drop the Single Season sub-tab entirely** and make the Records tab Career-only. Do not show incorrect data.

```
Career:        GET /api/v1/stats/leaders?leaderCategories={category}&statType=career&limit=25&statGroup=hitting
Single Season: GET /api/v1/stats/leaders?leaderCategories={category}&statType=season&limit=25&statGroup=hitting
```
Replace `statGroup=hitting` with `statGroup=pitching` for pitching categories.

Pitching rate stats (ERA, WHIP, K9) require a minimum innings qualifier. Use the API's default qualifier behavior — the MLB Stats API applies qualifiers automatically for rate stats.

### Caching
- `localStorage` key: `records_career_{category}` and `records_season_{category}` (no year — all-time records)
- TTL: 7 days
- **Never cache a 0-result response** (same rule as Leaders tab)
- `_all` results held in React state only, not written to localStorage (same rule as Leaders tab)
- "Show all" button hidden if top-25 result has fewer than 26 entries

### Sub-tab / Category Navigation
- Switching between Career and Single Season resets the selected category to the default (HR for batting, SO for pitching) and resets `showAll` to false
- Switching the Batting/Pitching toggle resets category to its default and resets `showAll` to false
- Switching categories resets to top-25 view and resets `showAll` to false
- `showAll` also resets on any data reload

### Historical Players Without Modals
Each API response entry includes a `person` object with `id` and `fullName`. If `person` or `person.id` is absent, render the name as **plain non-interactive text** (no click handler, no `selectedPlayerId` trigger) using whatever name string is available in the response. If no name is available at all, skip the row entirely. Players who have a `person.id` but sparse profile data are rendered as tappable — the `PlayerProfile` component handles the empty-profile case gracefully.

### Pagination / Show All
Same as Leaders tab — default 25, "Show all" option, button hidden if < 26 results.

### Layout
Same as Leaders tab: category pills, ranked list with rank / name / team / stat value.

---

## 4. Data Flow Summary

| Feature | Source | Cache Key | TTL |
|---|---|---|---|
| Prospects top 100 | MLB Stats API | `prospects_top100` | 24h |
| Prospects by team | MLB Stats API | `prospects_{teamId}` | 24h |
| Season leaders | MLB Stats API | `leaders_{cat}_{year}` | 24h |
| All-time career records | MLB Stats API | `records_career_{cat}` | 7d |
| All-time single-season records | MLB Stats API | `records_season_{cat}` | 7d |

---

## 5. Tab Order

The existing tab order (`games`, `mentaculous`, `standings`, `historical`, `roster`, `backend`) must be modified to insert the two new tabs. The `leaders` and `records` tabs are inserted after `standings`:

Final nav tab order: `games` | `mentaculous` | `standings` | `leaders` | `records` | `historical` | `roster` | `backend`

## 6. Mobile Layout

- Category pill rows are `overflow-x: auto; white-space: nowrap` — horizontally scrollable on mobile
- Ranked list rows are single-column, full-width
- No horizontal scrolling needed for the list itself (rank / name / team / value all fit in one row)

## 7. Files Affected

- `src/App.tsx` — new tabs, new state, new render functions, box score badge injection
- `src/styles.css` — prospect badge styles, leaders/records tab layout styles, category pill styles
- No new files required (all logic stays in App.tsx)

---

## 8. Out of Scope

- Prospect rank numbers displayed on screen (just badge symbol)
- Postseason or minor league stats
- Filtering leaders by team
- Saving/bookmarking a leader or record

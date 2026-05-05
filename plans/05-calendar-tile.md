# P5 — Calendar tile

**Status:** in progress
**Decisions:** see `decisions.md` § "2026-05-05 — P5 Calendar tile" (D-P5-01 through D-P5-08)
**Phase boundary:** replace the `CalendarTile` placeholder in `apps/web/components/dashboard/tiles.tsx` with a live tile reading personal Google + voltlabs Google + utwente ICS, covering today + tomorrow, with the row interactions and refresh model locked in the discussion.

Reuses the FastAPI helper from P4. Same shape: server fetch on render → handed to a `'use client'` subcomponent that owns interactions.

---

## Build order

### 1. Extract reusable helpers in `tools/`

Goal: API endpoint imports clean Python functions; doesn't shell out, doesn't reach into argparse handlers.

- `tools/gcal.py` — add `get_upcoming(account: str, t_min: datetime, t_max: datetime) -> list[dict]`. Iterates `calendarList()`, calls `events().list()` per calendar with `singleEvents=True`, returns a flat normalized list with `source`, `id`, `title`, `start`, `end`, `all_day`, `status` (from `attendees[].self.responseStatus`, defaulting to `accepted` if no attendees), `link` (htmlLink), `description`, `location`, `organizer`. The CLI `list-events` / `list-pending` keep working — new function, not refactor.
- `tools/ics_cal.py` — add `get_upcoming(feed_name: str, t_min: datetime, t_max: datetime) -> list[dict]`. Same return shape (status always `accepted` for ICS — feed is read-only, no RSVP semantics). Surface `description` and `location` if present (graceful: `None` if missing).
- Both: `all_day` true if `start` is a date (not datetime); event end derived from `dtend` or `dtstart + duration`.

### 2. `/calendar/upcoming` endpoint

- `apps/api/main.py`:
  - Pydantic models: `CalendarEvent`, `PendingInvite`, `CalendarOut { window, all_day[], timed[], pending[] }`.
  - `GET /calendar/upcoming?window_hours=36` → `CalendarOut`.
  - Internal: compute `t_min = now (Europe/Bucharest)`, `t_max = end of (today + window_hours/24 days)`. Fan-out to `gcal.get_upcoming("personal", …)`, `gcal.get_upcoming("work", …)`, `ics_cal.get_upcoming("utwente", …)` — sequential is fine for v1, parallel-safe if we move to `asyncio.gather(run_in_threadpool(...))` later.
  - Filter: drop events where `status == "declined"`. Keep `tentative` (client renders dimmed).
  - Split: `all_day=True` → `all_day` block; events with `status == "needsAction"` → `pending` block; everything else → `timed`. (A pending event also shows in the timed/all-day block, dimmed — so Adrian sees "this is happening AND I haven't responded".)
  - Sort `timed` by start time; `all_day` by start date then title; `pending` by start time.
  - Per-source error isolation: if one source raises, return what we have plus a sub-error in the response (`errors: { uni: "..." }`) so the tile can render partial. Don't blank the whole tile.
- Health check: `curl localhost:8001/calendar/upcoming?window_hours=36` returns valid JSON.

### 3. `CalendarTile` server + client split

- `apps/web/components/dashboard/calendar-tile.tsx` (server component) — initial fetch from API, exports `CalendarTile` and `CalendarTileSkeleton`. Mirrors `tasks-tile.tsx` shape.
- `apps/web/components/dashboard/calendar-tile-client.tsx` (`'use client'`) — owns:
  - `data` state seeded from server-side initial fetch.
  - Refresh button + refresh-on-`visibilitychange` via `useTransition`.
  - Expanded-row state (`expandedId: string | null`).
  - Expanded pending mini-row state (`pendingExpanded: boolean`).
- Render structure (top → bottom):
  1. **Pending mini-row**: `if (pending.length > 0)` show "🛈 N awaiting response" (no emoji per repo conventions — use a quiet icon or just text + count in muted color). Tap toggles expand → list of pending invites with title, time, organizer.
  2. **All-day list**: `if (all_day.length > 0)` "All day" sub-header + each event with title, source label (`· uni` etc.), tap → expand inline (description, location). Button on row → opens `link`.
  3. **Timed list**: each row = time ("HH:MM" today, "Tmrw HH:MM" tomorrow) · title · source label. Tentative status → opacity-50. Tap row → expand. Button on row → external open.
  4. **Empty fallback**: if `all_day + timed + pending` all empty → "No events in the next 36 hours" + (later) skill button to open Google Calendar.
- Source label: small, muted (`text-muted-foreground text-[10px]` or similar) after the title.
- Time format: `Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" })`. "Tmrw " prefix when start date != today.

### 4. Refresh + error handling

- `useEffect` on `document.visibilitychange` → re-fetch (mirrors P4).
- Refresh button in tile header (icon-only, `useTransition` spinner during fetch).
- Error states:
  - Full failure (API down) → inline "Couldn't load calendar" + retry button. Tile keeps its shape.
  - Partial source failure (errors block in response non-empty) → render what we have + small footer note "uni events unavailable" (or whichever source failed).

### 5. Wire into bento-grid

- `apps/web/components/dashboard/bento-grid.tsx`: import `CalendarTile, CalendarTileSkeleton` from `./calendar-tile`. Replace placeholder `<CalendarTile />` from `./tiles` with `<Suspense fallback={<CalendarTileSkeleton />}><CalendarTile /></Suspense>`.
- `apps/web/components/dashboard/tiles.tsx`: remove placeholder `CalendarTile` + `CalendarIcon` (icon migrates into the new file).

### 6. Tests

- `apps/web/e2e/calendar-tile.spec.ts` — Playwright smoke suite. To stay deterministic without hitting real Google + Outlook on every test run:
  - Add `JARVIS_CALENDAR_FIXTURE` env override in `apps/api/main.py`: when set to a path, the `/calendar/upcoming` endpoint reads a fixture JSON instead of fanning out to live sources. (Same pattern as the P4 follow-up `JARVIS_TASKS_DIR`.)
  - Tests use a fixture covering: empty state, only timed events, only all-day, only pending, mix of all three, one tentative event (dimmed), one declined (must be hidden), partial source failure (errors block populated).
  - Smoke checks (4-5 tests): empty → "No events" copy renders; timed-only render with correct time format; all-day mini-list appears above timed; pending mini-row expands on click; row expand shows description; external-open button has `target="_blank"` and points at `link`.
- Playwright `webServer` already runs `make dev`. No new orchestration needed.

### 7. Verify

- Mac (`localhost:3000`): tile loads with real personal + work + uni data. Confirm all-day events from utwente bucket at the top. Confirm tentative events dim. Confirm declined ones absent. Refresh button reflows. Refresh-on-tab-focus works.
- Phone (S23 via Tailscale `http://lp-agw02.tail2877af.ts.net:3000`): tap-target on rows comfortable, expand-row works on touch, external-open button opens in new tab.
- Edge: stop `apps/api/` → "Couldn't load calendar" + retry. Restart api → retry succeeds.
- Edge: temporarily break ICS feed URL in `.local/ics-feeds.json` → tile still renders Google events + shows "uni events unavailable" footer.
- Edge: window with no events at all → empty state renders.
- Update `tracker.md`: P5 → ✓ + done line + flip "P5 next" to "P6 next".
- If anything deviated during build: append note to `decisions.md`.

---

## Atomic commits (one per logical step)

1. `P5: write build plan`
2. `P5: extract calendar upcoming helpers in tools/`
3. `P5: /calendar/upcoming endpoint (multi-source merge)`
4. `P5: CalendarTile renders timed + all-day + pending`
5. `P5: row expand + open-externally button`
6. `P5: refresh + loading/empty/error states`
7. `P5 ship: verified Mac + Tailscale`

Each commit asks Adrian first per the "Adrian owns the done call" rule in `CLAUDE.md`.

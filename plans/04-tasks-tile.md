# P4 — Tasks tile + apps/api/ helper program

**Status:** in progress
**Decisions:** see `decisions.md` § "2026-05-05 — P4 Tasks tile + apps/api/ helper program" (D-P4-01 through D-P4-10)
**Phase boundary:** wire `TasksTile` in `apps/web/components/dashboard/tiles.tsx` to read live from `tasks/<today>.jsonl` and let Adrian tick tasks off + open source emails. Stand up `apps/api/` as the helper program future tiles will share.

---

## Build order

### 1. apps/api/ scaffold

- `apps/api/main.py` — FastAPI app on port 8001
  - CORS allow: `http://localhost:3000`, `http://lp-agw02.tail2877af.ts.net:3000`
  - `GET /tasks/today` → reads `tasks/<today>.jsonl`, returns parsed list grouped by `source.account`, sorted by priority desc within
  - `POST /tasks/{id}/done` → toggles status, writes JSONL back, shells `tools/render_tasks.py` to keep .md in sync (mirrors `tools/today.py` mark-done semantics)
  - `GET /health` → `{ "ok": true }` for the dev script to wait on
- `apps/api/requirements.txt` — `fastapi`, `uvicorn[standard]` (reuses repo `.venv` so `tools/` modules are importable)
- `apps/api/AGENTS.md` — short note: importable from repo root, expects to run with repo `.venv` activated

### 2. Dev orchestration

- Root `Makefile` (or `package.json` script) — `make dev` boots both:
  - `cd apps/web && npm run dev` (Next 16 on :3000)
  - `.venv/bin/uvicorn apps.api.main:app --reload --port 8001`
- `apps/web/.env.local` — `NEXT_PUBLIC_API_URL=http://localhost:8001`
- README.md root — short "How to run" section

### 3. TasksTile component

- `apps/web/components/dashboard/tasks-tile.tsx` (split out from `tiles.tsx`)
- Server fetch on render: `fetch(${process.env.NEXT_PUBLIC_API_URL}/tasks/today, { cache: 'no-store' })`
- Render structure:
  - For each account section (e.g. "personal"): header line + tasks
  - Each row = checkbox + priority dot + title (anchor → `gmail_url`, `target="_blank"`) + due date pill if `due` present
  - Title truncates one line with `…`
- Client subcomponent for checkbox: optimistic toggle, POSTs to `/tasks/{id}/done`, rollback on error

### 4. Refresh + show-done toggle

- `useEffect` on `document.visibilitychange` → `router.refresh()` when `document.visibilityState === 'visible'`
- Refresh button in tile header (next to "P4" badge → swap badge for refresh icon button)
- "Show done" toggle: small icon in tile header, flips a local state that re-fetches with `?include_done=true`

### 5. States

- Loading skeleton: 3 placeholder rows during RSC streaming
- Empty state (no tasks today): "No tasks for today yet" line + button — opens existing skill-button modal with the `extract-tasks` command
- Error state: inline "Couldn't load tasks" + retry button (re-fires fetch). Tile keeps shape — no layout shift.

### 6. Verify

- Mac (localhost:3000): load, tick off, verify JSONL mutates + .md re-renders, refresh button works, refresh-on-focus works
- Phone (S23 via Tailscale): `http://lp-agw02.tail2877af.ts.net:3000` — checkbox tap target, focus-refresh
- Edge: delete `tasks/<today>.jsonl` → empty state shows
- Edge: stop `apps/api/` → error state shows + retry brings it back when api restarts
- Edge: tick off all tasks → all disappear; "show done" toggle reveals them struck-through
- Update `tracker.md`: P4 → ✓ + done line
- If anything deviated during build: append note to `decisions.md`

---

## Atomic commits (one per logical step)

1. `P4: scaffold apps/api/ FastAPI helper`
2. `P4: dev orchestration (make dev runs web + api)`
3. `P4: TasksTile fetches + renders grouped tasks`
4. `P4: checkbox tick-off + refresh-on-focus`
5. `P4: empty + error + loading states`
6. `P4 ship: verified Mac + Tailscale`

Each commit asks Adrian first per "Adrian owns the done call" rule.

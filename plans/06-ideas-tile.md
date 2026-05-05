# P6 — Ideas tile

**Status:** in progress
**Decisions:** see `decisions.md` § "2026-05-05 — P6 Ideas tile" (D-P6-01 through D-P6-07)
**Phase boundary:** replace the `IdeasTile` placeholder in `apps/web/components/dashboard/tiles.tsx` with a live tile reading `ideas/*.md` (YAML frontmatter + body). Read-only for v1. Reuses the FastAPI helper at `apps/api/`. Mirrors the P5 calendar tile patterns: server fetch → client component, fixture mode for tests, refresh-on-tab-focus + manual button, row tap-to-expand + external-open button.

---

## Build order

### 1. `tools/ideas.py`

Goal: small importable module the API endpoint calls; also runnable as a CLI for parity with other `tools/`.

- `get_ideas() -> list[dict]` — scans `ideas/*.md`, parses YAML frontmatter via `python-frontmatter`, returns normalized list. Each idea:
  - `id` — slug derived from filename (e.g. `jarvis-itself.md` → `jarvis-itself`)
  - `title` — H1 from body, or filename slug if missing
  - `type` — `project` or `exploration`; defaults to `project` if missing (D-P6-07)
  - `status` — `active`/`next-up`/`paused`/`shipped`; defaults to `active` if missing (D-P6-07)
  - `started` — ISO date string; defaults to file mtime date if missing
  - `last_touched` — ISO date string; defaults to file mtime date if missing
  - `next_action` — string or null
  - `description` — body up to the first `## ` heading (or whole body if no H2)
  - `status_notes` — content of the `## Status notes` section if present, else null
  - `filename` — basename so the API can build the GitHub link
- `python tools/ideas.py list` — small CLI for sanity check + parity (`python tools/ideas.py list` prints title + status + next_action one per line).

### 2. `python-frontmatter` dep

- `requirements.txt` — add `python-frontmatter>=1.0.0`. Small, MIT, well-maintained.

### 3. `/ideas/list` endpoint

- `apps/api/main.py`:
  - Pydantic models: `Idea`, `IdeasOut { ideas: [...] }`.
  - `GET /ideas/list` — returns ideas already sorted by `(status_rank, -last_touched, title)`, where `status_rank` = active(0) / next-up(1) / paused(2) / shipped(3) per D-P6-03.
  - Build GitHub link per idea: `https://github.com/PapiGonsalez/jarvis/blob/main/ideas/<filename>` — derived once from the git remote at module load (or hardcoded).
  - Fixture mode: `JARVIS_IDEAS_FIXTURE` env override pointing to a JSON file. When the file exists, the endpoint serves its content directly (mirrors the `JARVIS_CALENDAR_FIXTURE` pattern from P5).
  - Sanity check: `curl localhost:8001/ideas/list` returns valid JSON with the existing `jarvis-itself.md`.
- Update `Makefile` so `make api` sets `JARVIS_IDEAS_FIXTURE=/tmp/jarvis-ideas-active-fixture.json` (overridable). Same shape as the calendar fixture path.

### 4. `IdeasTile` component (server + client split)

- `apps/web/components/dashboard/ideas-tile.tsx` (server) — initial fetch from API, exports `IdeasTile` and `IdeasTileSkeleton`. Mirrors `calendar-tile.tsx`.
- `apps/web/components/dashboard/ideas-tile-client.tsx` (`'use client'`) — owns:
  - `data` state seeded from server initial fetch
  - Refresh button + `visibilitychange` listener
  - `expandedId: string | null` — at most one row expanded at a time
- Two-line row layout per idea:
  - **Line 1:** status badge · title · `· type` chip · external-open button
  - **Line 2:** "Next: " + truncated `next_action` (one line, ellipsis on overflow). If `next_action` missing, line 2 hidden.
- Status badge:
  - `active` → green-ish (`bg-emerald-500/15 text-emerald-300`)
  - `next-up` → blue (`bg-blue-500/15 text-blue-300`)
  - `paused` → muted gray (`bg-muted text-muted-foreground`)
  - `shipped` → faint (`bg-muted/50 text-muted-foreground line-through`-ish)
  - Each is a small text pill, `text-[10px] uppercase tracking-wide`, e.g. `active`.
- Type chip — small `· project` / `· exploration` after title in muted color, identical CSS shape to the calendar tile's source chip.
- External-open button — same `ExternalLinkIcon` used in calendar tile; could share the icon component but keep tiles independent for now (small SVG, not worth a shared module yet).
- Shipped rows render dimmed (opacity-60) — Claude's-discretion visual reinforcement of the sort-to-bottom rule.

### 5. Row expand + open-externally

- Tap the row (button) → toggle `expandedId`. When expanded, reveal:
  - `description` (body before first H2) rendered as plain text (no markdown renderer for v1; just `whitespace-pre-wrap`)
  - `status_notes` if present, also as plain text under a "Recent" sub-label
- Tap the external-open button (`<a target="_blank">`) → opens the GitHub web URL. `e.stopPropagation()` so the row doesn't toggle.

### 6. Refresh + states

- Refresh button in tile header (icon, `useTransition` spinner). Mirror `calendar-tile-client.tsx`.
- `useEffect` on `visibilitychange` → refetch.
- Empty state: "No ideas yet" + a one-line hint "Drop a markdown file in `ideas/`".
- Error state: inline "Couldn't load ideas" + retry button.
- Loading skeleton: 2-3 placeholder rows in the `IdeasTileSkeleton` export.

### 7. Wire into bento-grid + remove placeholder

- `apps/web/components/dashboard/bento-grid.tsx`:
  - Import `IdeasTile, IdeasTileSkeleton` from `./ideas-tile`.
  - Replace the placeholder `<IdeasTile />` from `./tiles` with `<Suspense fallback={<IdeasTileSkeleton />}>{...}</Suspense>`.
- `apps/web/components/dashboard/tiles.tsx`: remove placeholder `IdeasTile` + `IdeaIcon` (icon migrates into the new file).

### 8. Tests

- `apps/web/e2e/ideas-tile.spec.ts` — Playwright suite using fixture mode. Covers:
  - Empty state
  - Single active idea renders with status badge + type chip + next_action preview
  - Mixed statuses sorted correctly (active before next-up before paused before shipped)
  - Tap row expands inline (description + status_notes visible)
  - Tap row again collapses
  - External-open button has correct GitHub URL + `target="_blank"` + does not toggle expand
  - Refresh button refetches
  - Idea with missing frontmatter (just an H1 title) renders with sensible defaults

### 9. Verify

- Mac (`localhost:3000`): tile renders the existing `jarvis-itself.md` (active project, has next_action). Expand reveals description.
- Phone (S23 via Tailscale): tap-target on rows comfortable; expand-row works on touch; external-open button jumps to GitHub.
- Edge: stop `apps/api/` → "Couldn't load ideas" + retry.
- Edge: empty `ideas/` (rename file out temporarily) → empty state renders.
- Update `tracker.md`: P6 → ✓ + done line + flip "P6 next" to "P7 next".
- If anything deviated during build: append note to `decisions.md`.

---

## Atomic commits (one per logical step)

1. `P6: capture decisions`
2. `P6: write build plan`
3. `P6: tools/ideas.py reads + parses ideas/`
4. `P6: /ideas/list endpoint`
5. `P6: IdeasTile renders + bento wired`
6. `P6: row expand + open-in-GitHub button`
7. `P6: refresh + states + Playwright tests`
8. `P6 ship: verified Mac + Tailscale`

Each commit asks Adrian first per the "Adrian owns the done call" rule in `CLAUDE.md`.

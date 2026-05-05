# P7 — Tokens tile

**Status:** in progress
**Decisions:** see `decisions.md` § "2026-05-05 — P7 Tokens tile" (D-P7-01 through D-P7-08)
**Phase boundary:** replace the `TokensTile` placeholder in `apps/web/components/dashboard/tiles.tsx` with a live tile reading `~/.claude/projects/*.jsonl`, surfacing a 7-day rolling per-project breakdown plus a sparkline + delta trend. Reuses the FastAPI helper at `apps/api/`. Mirrors the established tile pattern (server fetch → client component, fixture mode for tests, refresh-on-tab-focus + manual button).

---

## Build order

### 1. `tools/tokens.py`

Goal: pure Python module the API endpoint imports; small CLI for sanity.

- `_project_label(folder_name: str) -> str` — normalize a `~/.claude/projects/<folder>` name into a readable project label. Rules:
  - `subagents` → `subagents`
  - Strip leading `-`, strip `--claude-worktrees-<slug>` suffix (D-P7-06), strip common prefixes (`Users-adrian-projects-`, `Users-adrian-am-laravel-`, `Users-adrian-am-`, `Users-adrian-`).
  - Folder `-Users-adrian` (Claude Code runs from `~`) → label `global`.
  - Print the resolved labels for all 14 folders + `subagents` during dev as a sanity check.
- `_tokens_in_message(usage: dict) -> int` — sum the four flavors per D-P7-07: `input_tokens + cache_creation_input_tokens + cache_read_input_tokens + output_tokens`. Default 0 for missing keys.
- `get_summary(days: int = 7) -> dict` — main entry. Returns:
  ```
  {
    "window": {"start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "days": 7},
    "total_tokens": int,
    "prior_total": int,         # the prior 7d window for delta
    "delta_pct": float | None,  # None if prior_total == 0
    "daily": [{"date": "YYYY-MM-DD", "tokens": int}, ...],   # length = days, today last
    "projects": [{"label": str, "tokens": int, "share": float}, ...]   # full sorted list
  }
  ```
  Endpoint will trim `projects` to top 5 + Other + subagents (D-P7-04 + D-P7-05).
- Iterates every `.jsonl` under `~/.claude/projects/`. For each line, parses JSON (skip malformed), checks `type == "assistant"`, extracts `message.usage`, sums tokens, buckets by `timestamp` converted to Europe/Bucharest calendar date.
- CLI: `python tools/tokens.py summary` prints daily + per-project breakdown. CLI: `python tools/tokens.py labels` prints the resolved label for every project folder (the sanity step).

### 2. `/tokens/summary` endpoint

- `apps/api/main.py`:
  - Pydantic models: `TokensProject`, `TokensDaily`, `TokensSummary`.
  - `GET /tokens/summary?days=7` → `TokensSummary`. Calls `tokens_tool.get_summary(days)`, then trims `projects` to **top 5 by tokens + Other (sum of the rest, excluding `subagents`) + `subagents` line**. The "subagents" line is appended even if it would not have made top 5 — D-P7-05.
  - Fixture mode: `JARVIS_TOKENS_FIXTURE` env override (mirror calendar/ideas pattern).
- Update `Makefile` so `make api` sets `JARVIS_TOKENS_FIXTURE=/tmp/jarvis-tokens-active-fixture.json` (overridable).

### 3. `TokensTile` component (server + client split)

- `apps/web/components/dashboard/tokens-tile.tsx` (server) — fetches from API, exports `TokensTile` and `TokensTileSkeleton`.
- `apps/web/components/dashboard/tokens-tile-client.tsx` (`'use client'`) — owns:
  - `data` state (initial from server)
  - `useTransition` for refresh state
  - `visibilitychange` listener
- Render structure (top → bottom, single 1-cell tile):
  1. **Header:** `[TokenIcon] Tokens` on left, count badge on right (e.g., `12.3M`), refresh button.
  2. **Headline strip:** big number `12.3M tokens` + tiny delta below (`▲ +12% vs prior 7d`, color-coded ↑ red-ish, ↓ green).
  3. **Sparkline:** mini bar chart, 7 bars (one per day in the window), height proportional to that day's total / window-max. Bars about 4-6px wide, max-height ~16-20px. CSS `<div>`s with computed heights — no chart library.
  4. **Per-project breakdown:** `<ul>` of rows. Each row = label (left) · horizontal bar (middle, width = share %) · token count compact (right). Top 5 + Other + subagents. Subagents always last.
- Number formatting helper: `Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })`.
- Empty state: `No tokens used in the last 7 days.` (Highly unlikely given usage, but for completeness.)

### 4. Sparkline + delta details

- Delta calculation: server-side, `(total - prior_total) / prior_total * 100` if `prior_total > 0`, else `null`.
- Delta rendering on tile:
  - `null` → omit the line entirely.
  - Positive → red-ish (`text-amber-400` or similar — burning more is not necessarily bad, but worth noticing).
  - Negative → muted (`text-muted-foreground`).
  - Format: `▲ +12% vs prior 7d` or `▼ -3% vs prior 7d`.
- Sparkline rendering: `<div className="flex items-end gap-0.5 h-5">` with 7 child bars, each `<div className="w-1 bg-muted-foreground/40" style={{ height: `${(t.tokens / max) * 100}%` }}>`. Tooltip on hover with day + count (Claude's discretion).

### 5. States

- Loading skeleton: header placeholder + headline-block placeholder + 4-5 row placeholders for the project list.
- Error state: inline `Couldn’t load tokens (<reason>)` + `Retry` button. Tile keeps shape.
- Refresh button mirrors P5/P6 pattern.

### 6. Wire into bento-grid + remove placeholder

- `apps/web/components/dashboard/bento-grid.tsx`: import `TokensTile, TokensTileSkeleton`, replace placeholder with `<Suspense fallback={<TokensTileSkeleton />}>{...}</Suspense>`.
- `apps/web/components/dashboard/tiles.tsx`: remove `TokensTile` placeholder + `TokenIcon` (icon migrates to new file).

### 7. Tests

- `apps/web/e2e/tokens-tile.spec.ts` — Playwright suite using `JARVIS_TOKENS_FIXTURE`. Covers:
  - Empty state (zero data)
  - Headline tokens count renders compact
  - Per-project list shows top 5 + Other + subagents (verified order)
  - Sparkline has 7 bar elements (count check)
  - Delta with positive value renders with `+` prefix; negative with `−` prefix
  - Delta omitted when prior_total = 0
  - Refresh button refetches without page reload

### 8. Verify

- Mac (`localhost:3000`): tile renders real 7d Claude Code usage. Eyeball: top 5 looks right (regicargo + jarvis + subagents likely on top given the file counts). Sparkline shows 7 bars with reasonable variance.
- Phone (S23 via Tailscale): tap-target on refresh button OK; per-project bars readable on small screen.
- Edge: stop `apps/api/` → `Couldn’t load tokens` + retry.
- Edge: window with no usage → empty state.
- Sanity: run `python tools/tokens.py labels` and review the resolved labels.
- Update `tracker.md`: P7 → ✓ + done line + flip "P7 next" to "P8 next".
- If anything deviated during build: append note to `decisions.md`.

---

## Atomic commits (one per logical step)

1. `P7: capture decisions`
2. `P7: write build plan`
3. `P7: tools/tokens.py reads + parses claude-code JSONL`
4. `P7: /tokens/summary endpoint`
5. `P7: TokensTile renders headline + per-project bars`
6. `P7: sparkline + delta trend`
7. `P7: refresh + states + Playwright tests`
8. `P7 ship: verified Mac + Tailscale`

Each commit asks Adrian first per the "Adrian owns the done call" rule in `CLAUDE.md`.

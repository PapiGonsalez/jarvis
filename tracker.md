# Jarvis Build Tracker

## Status

**Phase: P4 (wire tasks tile) shipped → P5 (wire calendar tile) next**

## Done

- 2026-05-05 — P0: repo scaffolded, CLAUDE.md, decisions log, folder tree, git init on `main`
- 2026-05-05 — P1: cleanup-inbox skill + tools/gmail.py + venv. Personal Gmail 22,981 → 4,494 inbox (-18,487, ~80% reduction). Unread in inbox 19,700 → 199 (~99% visual cleanup). **8 filters live**, **21 labels** organized + category-colored. 27 senders manually unsubscribed (queued for Adrian to click). Label management subcommands added (list/delete/rename/set-color). Rules captured to `references/email-rules-personal.md`.

## Done (2026-05-05, day 2)

- 2026-05-05 — P2: Calendar tooling (`tools/gcal.py` multi-account, `tools/outlook_cal.py` Microsoft Graph, `tools/ics_cal.py` ICS feeds). Personal Calendar cleaned (6 ENDED series deleted). voltlabs Calendar audited (empty by design). utwente Calendar read-only via ICS feed. agroworld Calendar dropped (admin-blocked). cleanup-calendar skill written.
- 2026-05-05 — Mid-P2 pivot: emails are the priority, not calendars. Phase plan revised — P2.1/P2.2/P2.3 inserted before dashboard skeleton.
- 2026-05-05 — P2.1: Multi-account email pipeline live. `tools/gmail.py` refactored with `--account {personal,work}` (mirrors gcal.py). voltlabs Gmail OAuth'd + audited (288 msgs, mostly dev tooling). utwente + agroworld Outlook forwarding rules set → personal Gmail. Gmail filters created (`to:` → `Forwarded/UTwente` purple, `Forwarded/Agroworld` teal). M365 POP/IMAP admin-blocked → no historical backlog migration; forward-from-now-on only.
- 2026-05-05 — P2.2: Email→task extraction shipped. `tools/gmail.py fetch-recent` (multi-account, JSONL output with bodies, state-file dedup) + `tools/render_tasks.py` (JSONL→markdown view) + `.claude/skills/extract-tasks/skill.md` (conversational classifier honoring task-vs-idea distinction). First run today: 4 emails scanned → 3 tasks extracted (lawyer police-report ask, agroworld internship docs ask, Marktplaats €250 offer decision). Marktplaats classification refined (explicit offer = task; generic reply = skip).
- 2026-05-05 — P2.3: Today's-tasks TUI shipped. `tools/today.py` (Textual-based) — interactive review of `tasks/<date>.jsonl`. Grouped by source account, ranked by priority within (▲ HIGH red · ● MED yellow · ▽ LOW blue). Keys: Enter expand, `d` mark done, `o` open Gmail link, `s` toggle done visibility, `r` refresh, `q` quit. JSONL is source of truth; mark-done writes back + re-renders the .md. Also exposes `today.py done <id>` and `today.py list` for non-TUI / piped use. Auto-falls-back to `list` when stdout isn't a tty.
- 2026-05-05 — P3: Dashboard skeleton shipped. Next.js 16 + React 19 + Tailwind 4 + shadcn/ui at `apps/web/`. Dark theme default, bento grid with 6 placeholder tiles (Tasks, Calendar, Ideas, Tokens, Scratchpad, Pinned Notes), live clock header, "Ask Jarvis…" chat bar (UI-only — LLM wiring is P10), and 4 skill quick-action buttons (Extract tasks, Today's tasks, Cleanup inbox, Cleanup calendar) that open a modal showing the terminal command to copy. PWA manifest + dynamically-generated icon and apple-icon. Verified at `localhost:3000` on Mac and `lp-agw02.tail2877af.ts.net:3000` on Android via Tailscale.
- 2026-05-05 — P4: Tasks tile wired live + FastAPI helper landed at `apps/api/`. New `apps/api/main.py` (FastAPI on :8001) wraps `tools/today.py` over HTTP — `GET /tasks/today?include_done=` and `POST /tasks/{id}/done` (toggle). Root `Makefile` (`make dev` runs Next + uvicorn together; trap kills both on Ctrl-C) + Next rewrite `/api/jarvis/* → :8001/*` so browser stays same-origin (no CORS for the tile, works on Tailscale unchanged). `TasksTile` split: server fetch handed to `TasksTileClient` ('use client') which owns checkbox tick-off (optimistic + refetch), refresh button, "Show done" toggle, and refresh-on-tab-focus. Loading skeleton via `<Suspense>` boundary. Empty state has a "Pull tasks from inbox" launcher that opens the same modal as the existing skill button. Error state has retry. Decisions captured in `decisions.md` § P4 (D-P4-01 through D-P4-10). Build plan in `plans/04-tasks-tile.md`. Playwright smoke suite at `apps/web/e2e/tasks-tile.spec.ts` (5 tests, all green): empty state, open task render, checkbox tick-off, show-done reveal, refresh button. Tailscale URL serves identical content (verified via curl).

## Next up

- **P2 follow-up (any time):** Adrian completes 27 manual unsubscribes in Gmail. Manual cleanup of utwente Outlook calendar if desired (Jarvis can't write there).
- **P2.3 follow-up (potential):** record Gmail labels (e.g., `Forwarded/UTwente`) on each task record so the TUI can split forwarded utwente/agroworld out of the `personal` bucket. Defer until it bites.
- **P3 follow-up (when worth it):** Tailscale Serve + `tailscale cert` to get real HTTPS on `lp-agw02.tail2877af.ts.net` (avoids `http://` typing + Chrome's HTTPS-First upgrade error, unlocks PWA install banner + browser web-push/mic APIs).
- **P4 follow-up (any time):** Phone UAT pass on the S23 — confirm checkbox tap target is comfortable, refresh-on-focus actually fires when returning to the tab, "Show done" toggle works, "Pull tasks from inbox" modal renders + Copy button works on the Tailscale URL.
- **P4 follow-up (test hygiene):** the Playwright suite mutates the real `tasks/<today>.jsonl` (it toggles status to set up each test). Once was enough to leak state into `git status` mid-session. Real fix: add a fixture mode to `apps/api/main.py` (e.g. `JARVIS_TASKS_DIR` env override) so tests point at a throwaway directory, or use a fixed test date with an isolated file. Until then, treat `npm run test:e2e` as a write to today's task data.
- **P5 (next):** Wire the Calendar tile against `tools/gcal.py` (personal Google Cal) + `tools/ics_cal.py` (utwente ICS). Reuses the FastAPI helper at `apps/api/` from P4. Decisions to make: time window (today only? next 24h? today + tomorrow?), how to handle all-day vs timed events, what to do with declined/tentative invites, whether to show source-account badges per event.

## Phase plan (revised after P2 pivot)

| #   | What                                                                              | Hours    |
| --- | --------------------------------------------------------------------------------- | -------- |
| P0  | Repo scaffold                                                                     | 1 ✓      |
| P1  | Email cleanup skill (personal Gmail)                                              | 3 ✓      |
| P2  | Calendar organization (personal cleaned; voltlabs empty; utwente ICS; agroworld dropped) | 2-3 ✓ |
| P2.1 | Multi-account email setup: voltlabs Gmail + M365 forwarding rules → Gmail        | 2        |
| P2.2 | Email → task extraction (LLM pass; output to tasks file or JSONL)                | 3        |
| P2.3 | Daily 'today's tasks' TUI (Textual; consumes extracted tasks)                    | 2 ✓      |
| P3  | Dashboard skeleton (Next.js + shadcn/ui at apps/web; Tailscale-accessible)        | 3 ✓      |
| P4  | Wire tasks tile (reads from P2.2/P2.3 output) + apps/api FastAPI helper           | 2 ✓      |
| P5  | Wire calendar tile (Google Cal direct + utwente ICS)                              | 3        |
| P6  | Wire ideas tile (manual entry, list + status)                                     | 3        |
| P7  | Token tracking tile (parse ~/.claude/projects/*.jsonl)                            | 2-3      |
| P8  | Slack/Teams + Jira integration                                                    | 3        |
| P9  | School LMS integration (separate from M365 email)                                 | 3        |
| P10 | "What should I work on right now" recommendation tile                             | 3        |
| ongoing | Tinker, polish, new skills as needed                                          | 2-3/wk   |

## Blockers

(none)

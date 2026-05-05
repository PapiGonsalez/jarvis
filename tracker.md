# Jarvis Build Tracker

## Status

**Phase: P2.3 (today's-tasks TUI) shipped → P3 (dashboard skeleton) next**

## Done

- 2026-05-05 — P0: repo scaffolded, CLAUDE.md, decisions log, folder tree, git init on `main`
- 2026-05-05 — P1: cleanup-inbox skill + tools/gmail.py + venv. Personal Gmail 22,981 → 4,494 inbox (-18,487, ~80% reduction). Unread in inbox 19,700 → 199 (~99% visual cleanup). **8 filters live**, **21 labels** organized + category-colored. 27 senders manually unsubscribed (queued for Adrian to click). Label management subcommands added (list/delete/rename/set-color). Rules captured to `references/email-rules-personal.md`.

## Done (2026-05-05, day 2)

- 2026-05-05 — P2: Calendar tooling (`tools/gcal.py` multi-account, `tools/outlook_cal.py` Microsoft Graph, `tools/ics_cal.py` ICS feeds). Personal Calendar cleaned (6 ENDED series deleted). voltlabs Calendar audited (empty by design). utwente Calendar read-only via ICS feed. agroworld Calendar dropped (admin-blocked). cleanup-calendar skill written.
- 2026-05-05 — Mid-P2 pivot: emails are the priority, not calendars. Phase plan revised — P2.1/P2.2/P2.3 inserted before dashboard skeleton.
- 2026-05-05 — P2.1: Multi-account email pipeline live. `tools/gmail.py` refactored with `--account {personal,work}` (mirrors gcal.py). voltlabs Gmail OAuth'd + audited (288 msgs, mostly dev tooling). utwente + agroworld Outlook forwarding rules set → personal Gmail. Gmail filters created (`to:` → `Forwarded/UTwente` purple, `Forwarded/Agroworld` teal). M365 POP/IMAP admin-blocked → no historical backlog migration; forward-from-now-on only.
- 2026-05-05 — P2.2: Email→task extraction shipped. `tools/gmail.py fetch-recent` (multi-account, JSONL output with bodies, state-file dedup) + `tools/render_tasks.py` (JSONL→markdown view) + `.claude/skills/extract-tasks/skill.md` (conversational classifier honoring task-vs-idea distinction). First run today: 4 emails scanned → 3 tasks extracted (lawyer police-report ask, agroworld internship docs ask, Marktplaats €250 offer decision). Marktplaats classification refined (explicit offer = task; generic reply = skip).
- 2026-05-05 — P2.3: Today's-tasks TUI shipped. `tools/today.py` (Textual-based) — interactive review of `tasks/<date>.jsonl`. Grouped by source account, ranked by priority within (▲ HIGH red · ● MED yellow · ▽ LOW blue). Keys: Enter expand, `d` mark done, `o` open Gmail link, `s` toggle done visibility, `r` refresh, `q` quit. JSONL is source of truth; mark-done writes back + re-renders the .md. Also exposes `today.py done <id>` and `today.py list` for non-TUI / piped use. Auto-falls-back to `list` when stdout isn't a tty.

## Next up

- **P2 follow-up (any time):** Adrian completes 27 manual unsubscribes in Gmail. Manual cleanup of utwente Outlook calendar if desired (Jarvis can't write there).
- **P2.3 follow-up (potential):** record Gmail labels (e.g., `Forwarded/UTwente`) on each task record so the TUI can split forwarded utwente/agroworld out of the `personal` bucket. Defer until it bites.
- **P3 (now):** Dashboard skeleton on localhost. Empty tiles for tasks / ideas / calendar / tokens / scratchpad / pinned notes, plus chat bar and skill buttons. Tasks tile (P4) reads from the same `tasks/<date>.jsonl` that today.py consumes.

## Phase plan (revised after P2 pivot)

| #   | What                                                                              | Hours    |
| --- | --------------------------------------------------------------------------------- | -------- |
| P0  | Repo scaffold                                                                     | 1 ✓      |
| P1  | Email cleanup skill (personal Gmail)                                              | 3 ✓      |
| P2  | Calendar organization (personal cleaned; voltlabs empty; utwente ICS; agroworld dropped) | 2-3 ✓ |
| P2.1 | Multi-account email setup: voltlabs Gmail + M365 forwarding rules → Gmail        | 2        |
| P2.2 | Email → task extraction (LLM pass; output to tasks file or JSONL)                | 3        |
| P2.3 | Daily 'today's tasks' TUI (Textual; consumes extracted tasks)                    | 2 ✓      |
| P3  | Dashboard skeleton (localhost: empty tiles + chat + buttons)                      | 3        |
| P4  | Wire tasks tile (reads from P2.2/P2.3 output)                                     | 2        |
| P5  | Wire calendar tile (Google Cal direct + utwente ICS)                              | 3        |
| P6  | Wire ideas tile (manual entry, list + status)                                     | 3        |
| P7  | Token tracking tile (parse ~/.claude/projects/*.jsonl)                            | 2-3      |
| P8  | Slack/Teams + Jira integration                                                    | 3        |
| P9  | School LMS integration (separate from M365 email)                                 | 3        |
| P10 | "What should I work on right now" recommendation tile                             | 3        |
| ongoing | Tinker, polish, new skills as needed                                          | 2-3/wk   |

## Blockers

(none)

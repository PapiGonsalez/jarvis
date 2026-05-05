# Jarvis Build Tracker

## Status

**Phase: P2 (calendars) wrapping → P2.1 (multi-account email + forwarding rules) next**

## Done

- 2026-05-05 — P0: repo scaffolded, CLAUDE.md, decisions log, folder tree, git init on `main`
- 2026-05-05 — P1: cleanup-inbox skill + tools/gmail.py + venv. Personal Gmail 22,981 → 4,494 inbox (-18,487, ~80% reduction). Unread in inbox 19,700 → 199 (~99% visual cleanup). **8 filters live**, **21 labels** organized + category-colored. 27 senders manually unsubscribed (queued for Adrian to click). Label management subcommands added (list/delete/rename/set-color). Rules captured to `references/email-rules-personal.md`.

## Done (2026-05-05, day 2)

- 2026-05-05 — P2: Calendar tooling (`tools/gcal.py` multi-account, `tools/outlook_cal.py` Microsoft Graph, `tools/ics_cal.py` ICS feeds). Personal Calendar cleaned (6 ENDED series deleted). voltlabs Calendar audited (empty by design). utwente Calendar read-only via ICS feed. agroworld Calendar dropped (admin-blocked). cleanup-calendar skill written.
- 2026-05-05 — Mid-P2 pivot: emails are the priority, not calendars. Phase plan revised — P2.1/P2.2/P2.3 inserted before dashboard skeleton.

## Next up

- **P2 follow-up (any time):** Adrian completes 27 manual unsubscribes in Gmail. Manual cleanup of utwente Outlook calendar if desired (Jarvis can't write there).
- **P2.1 (now):** Set up forwarding rules in utwente + agroworld Outlook → Gmail (workaround for M365 email block). Wire voltlabs Gmail via existing tools/gmail.py with new `--account work` flag.

## Phase plan (revised after P2 pivot)

| #   | What                                                                              | Hours    |
| --- | --------------------------------------------------------------------------------- | -------- |
| P0  | Repo scaffold                                                                     | 1 ✓      |
| P1  | Email cleanup skill (personal Gmail)                                              | 3 ✓      |
| P2  | Calendar organization (personal cleaned; voltlabs empty; utwente ICS; agroworld dropped) | 2-3 ✓ |
| P2.1 | Multi-account email setup: voltlabs Gmail + M365 forwarding rules → Gmail        | 2        |
| P2.2 | Email → task extraction (LLM pass; output to tasks file or JSONL)                | 3        |
| P2.3 | Daily 'today's tasks' CLI brief (consumes extracted tasks)                       | 2        |
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

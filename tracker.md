# Jarvis Build Tracker

## Status

**Phase: P1 (email cleanup) — initial pass shipped + ongoing triage live → P2 next**

## Done

- 2026-05-05 — P0: repo scaffolded, CLAUDE.md, decisions log, folder tree, git init on `main`
- 2026-05-05 — P1: cleanup-inbox skill + tools/gmail.py + venv. Personal Gmail 22,981 → 4,494 inbox (-18,487, ~80% reduction). Unread in inbox 19,700 → 199 (~99% visual cleanup). **8 filters live**, **21 labels** organized + category-colored. 27 senders manually unsubscribed (queued for Adrian to click). Label management subcommands added (list/delete/rename/set-color). Rules captured to `references/email-rules-personal.md`.

## Next up

- **P1 follow-up (any time):** Adrian completes 27 manual unsubscribes in Gmail (list in `references/email-rules-personal.md`). The skill is reusable for any future cleanup pass.
- **P2: Calendar organization** — audit + cleanup of personal Google Calendar, similar shape to P1 (~2-3 hrs).

## Phase plan

| #   | What                                                         | Hours    |
| --- | ------------------------------------------------------------ | -------- |
| P0  | Repo scaffold                                                | 1 ✓      |
| P1  | Email cleanup skill (personal Gmail)                         | 3 ✓      |
| P2  | Calendar organization                                        | 2-3      |
| P3  | Dashboard skeleton (localhost: empty tiles + chat + buttons) | 3        |
| P4  | Wire calendar tile (auto-pull from Google Calendar)          | 3        |
| P5  | Wire ideas tile (manual entry, list + status)                | 3        |
| P6  | Wire tasks tile (from email triage skill output)             | 3        |
| P7  | Token tracking tile (parse ~/.claude/projects/*.jsonl)       | 2-3      |
| P8  | Work calendar + work email integration                       | 3        |
| P9  | Slack/Teams + Jira integration                               | 3        |
| P10 | School LMS integration                                       | 3        |
| P11 | "What should I work on right now" recommendation tile        | 3        |
| ongoing | Tinker, polish, new skills as needed                     | 2-3/wk   |

## Blockers

(none)

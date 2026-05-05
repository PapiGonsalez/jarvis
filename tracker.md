# Jarvis Build Tracker

## Status

**Phase: P1 (email cleanup) — initial pass shipped + ongoing triage live → P2 next**

## Done

- 2026-05-05 — P0: repo scaffolded, CLAUDE.md, decisions log, folder tree, git init on `main`
- 2026-05-05 — P1: cleanup-inbox skill + tools/gmail.py + venv. Personal Gmail 22,981 → 5,071 inbox (-17,910). 5 filters live, 10 labels (incl. Banking/India for confirmed Indian banking accounts). 13 senders manually unsubscribed pending. Rules captured to `references/email-rules-personal.md`. Skill is reusable for ongoing triage.

## Next up

- **P1 follow-up (any time):** Adrian completes 11 manual unsubscribes in Gmail (list in `references/email-rules-personal.md`). Optional: re-run skill to handle remaining 5,114 inbox tail.
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

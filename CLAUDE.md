# Jarvis — Adrian's Personal AI OS

Daily ops + ideas tracker + dashboard. Knowledge graph emerges from daily use.

## What this is

Three jobs:
1. **Crush today's tasks** (external accountability)
2. **Make space for ideas** (self-directed: projects + explorations)
3. **Be smart about prioritization** (tokens, time, energy)

Adrian is a working student dev. Jarvis runs locally and grows with him.

## Definitions (load-bearing)

- **Task** = someone expects it as a deliverable. External accountability. Has a deadline.
- **Idea** = self-directed. A project I'm building OR a topic I'm exploring.

## Behavior in this repo

- **Adrian owns the "done" call.** Never declare a task or phase complete unilaterally. Before any `git commit`, `git push`, marking todos done, transitioning phases, or saving session notes — ASK Adrian explicitly: "are we done with X, or is there more?" Wait for an affirmative answer.
- Read `tracker.md` first to know the current build phase before suggesting next moves.
- Append to `decisions.md` when meaningful design choices land. Date them.
- Skills live in `.claude/skills/`. One job per skill. Max ~500 lines; split into `references/` if larger.
- Output is decision-ready, not exploratory. Brief, no fluff.
- Never invent meetings, deadlines, or commitments.
- Don't auto-send anything. Drafts only — Adrian confirms.

## Conventions

- Times Europe/Bucharest. Dates ISO 8601.
- Markdown-first. MCP-minimal (only daily-use tools earn an MCP slot).
- Tinker budget: 2-3 hrs/week. Each change fits in that box.

## Folder map

- `ideas/` — self-directed projects + explorations (one file per idea)
- `tasks/` — daily task journals (one file per day)
- `references/` — specs, API docs, email rules — only loaded when a skill reaches for them
- `.claude/skills/` — Claude Code skills, one job each
- `decisions.md` — append-only decision log
- `tracker.md` — build progress

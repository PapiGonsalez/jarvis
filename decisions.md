# Decisions

Append-only. Newest at the bottom.

## 2026-05-05 — Jarvis is daily-ops-first, not brain-first

Daily ops (tasks done, ideas tracked, dashboard) is the primary product. The knowledge graph emerges from daily use rather than being engineered separately.

**Why:** Settled during the grill-me round. The original AIOS blueprint drifted toward brain-first design (graph as the asset, daily ops as thin readers), which didn't match Adrian's actual situation. He's a working student wanting daily prioritization first; the brain compounds for free if capture is consistent.

## 2026-05-05 — Task vs Idea distinction

- **Task** = someone expects it as a deliverable (external accountability, has a deadline)
- **Idea** = self-directed (project I'm building OR topic I'm exploring)

**Why:** Dashboard sorts and colors by these two types. They have different priority models: tasks are must-do, ideas are if-time.

## 2026-05-05 — Build order: email cleanup skill first, dashboard later

P1 ships an email cleanup skill (Claude Code skill, conversational, cleans personal Gmail). Dashboard is P3+.

**Why:** Adrian picked the pragmatic MVP — solve a real pain in front of him before building infrastructure. The cleanup skill becomes reusable in later phases as ongoing triage.

## 2026-05-05 — Personal GitHub: PapiGonsalez account (fresh)

Old `AdrianGilbert25` returns 404 from GitHub API — likely suspended after Instagram messenger ToS violation. Existing `PapiGonsalez` account (created 2024-04-10) used as Jarvis home.

**Why:** Clean slate, no flag history, separated from work `voltlabs.eu` GitHub account.

## 2026-05-05 — Tinker budget: 2-3 hrs/week

Each change to Jarvis itself must fit in a 2-3 hour box. Bigger refactors get split.

**Why:** Realistic for a working student. Avoids the "tinker trap" — spending so much time evolving Jarvis that work and studies suffer.

## 2026-05-05 — Token tracking source: parse `~/.claude/projects/**/*.jsonl`

Verified schema. Each line has top-level `timestamp` (ISO 8601) and `message.usage` with `input_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens`, `output_tokens`. Sum entries with `timestamp > now - 5h` for current window.

**Why:** Most reliable source. Built-in `/usage` slash command exists for in-session checks; JSONL parsing for the dashboard tile (P7).

## 2026-05-05 — End-state dashboard tiles

Today's tasks (ranked), Ideas in progress (with status), Tokens used (5h window), Calendar (next few hrs), "What should I work on now" recommendation, What I did yesterday/this week, Scratchpad, Pinned notes, **Chat window**, **Skill buttons** (placeholders that get wired as skills mature).

**Why:** Adrian's vision combining daily ops + idea tracking + decision support + a control surface (chat + buttons) on the same page.

## 2026-05-05 — Sources to integrate (priority order)

1. Personal Gmail (P1)
2. Personal Google Calendar (P2)
3. Later: work email, work calendar, Slack/Teams, Jira/Linear, school LMS, Sentry, CodeRabbit

**Why:** Working student dev — has work + school + personal sources. Personal first because the immediate pain is personal email cleanup. Work and school land once the dashboard is up.

## 2026-05-05 — What we are NOT building

- Auto-send anything (drafts only, Adrian confirms)
- Personalization / "system learns me" (skipped during grilling)
- Capability accretion (skill count stays bounded around 10-12, not 30+)
- Mobile-native version (laptop dashboard first; phone is browser-only later if needed)
- Custom invoicing / freelance ops (Adrian is a student, not freelance — drop entirely)
- Vector DB / RAG / embeddings (until grep + Obsidian search stop working)

**Why:** Each is a tempting addition that costs more than it returns at this scale. Revisit only if needs change.

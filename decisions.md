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

## 2026-05-05 — P1 architecture: Python helpers + Claude Code skill

`tools/gmail.py` is a CLI with subcommands (auth/audit/preview/top-senders/archive/mark-read/apply-label/create-filter). `.claude/skills/cleanup-inbox/skill.md` is the conversational SOP that calls those subcommands. OAuth via Desktop client (Google Cloud project `gmail-inbox-clearer`), credentials in `.local/credentials.json` (gitignored), token in `.local/token.json` (gitignored).

**Why:** Keeps logic in Python (testable, reusable across skills) and policy in markdown (Claude reads, asks Adrian, executes). Skill stays under 500 lines per CLAUDE.md convention. Avoids the Gmail MCP cost (would always-load context tokens for a tool we run weekly, not constantly).

## 2026-05-05 — P1 cleanup approach: bankruptcy + per-sender walk + batch unsub

Phase 1 of cleanup: bulk archive `is:unread older_than:6m` (16,943 messages). Phase 2: walked top 12 senders one at a time (label-and-archive vs unsubscribe-and-archive vs keep). Phase 3: batched 6 fashion/marketing senders together for speed.

**Why:** Per-sender walks have diminishing returns past the top ~10. Batching the long-tail fashion newsletters (ASOS, JD Sports, Zalando, etc.) saved ~6 question rounds without losing meaningful control. The bankruptcy move was the highest leverage by an order of magnitude.

## 2026-05-05 — Don't auto-unsubscribe; user clicks Unsubscribe in Gmail

For senders Adrian wants to stop receiving, the skill archives existing messages but does NOT click Unsubscribe links automatically. Adrian completes the unsubscribe manually via Gmail's UI chip.

**Why:** Some "unsubscribe" links are tracking/malicious. Some confirm the email is valid (used for spam targeting). Better to let the user evaluate per sender. The cost is 11 manual clicks; the benefit is no risk of clicking a bad link.

## 2026-05-05 — Four accounts in scope

Jarvis will pull from four of Adrian's email/calendar accounts:

- **Personal:** `adriangilbert26@gmail.com` (Google Workspace personal — Gmail wired, Calendar wired)
- **Work 1 (voltlabs):** `adrian@voltlabs.eu` (Google Workspace — Calendar wired, empty)
- **Work 2 (agroworld):** `adrian@agroworld.nl` (M365 / Outlook — admin-blocked)
- **University (utwente):** `a.g.thereparambil@student.utwente.nl` (M365 / Outlook — admin-blocked for OAuth; ICS read-only feed wired for calendar)

**Why:** Working student dev with multiple work/study contexts. Earlier scope was three; agroworld surfaced as a fourth active work email mid-session.

## 2026-05-05 — M365 admin-consent wall (utwente + agroworld)

Both M365 tenants require admin consent for `Calendars.ReadWrite` (and likely `Mail.Read`). Adrian declines to request admin approval from work/uni IT for personal-use apps.

**Workarounds attempted:**
- utwente Calendar: ICS feed (Outlook web → Publish a calendar). Works — read-only access. Adrian does cleanup manually in Outlook UI.
- agroworld Calendar: Publish-calendar feature also disabled by IT. ICS path closed. **Skipped for now.**

**Implication:** For M365 emails (utwente + agroworld), the workaround is **forwarding rules** — set up auto-forward in Outlook to a Gmail address Jarvis already reads. Worth trying before assuming both M365 emails are inaccessible.

## 2026-05-05 — Pivot mid-P2: emails are the priority, not calendars

Adrian clarified mid-session: tasks come from emails, not calendars. His morning brief should be generated from emails across all 4 accounts, not from calendar events.

**Implication for phase plan:**
- Wrap P2 (calendar work) with what we have: personal Cal cleaned, voltlabs Cal audited, utwente Cal read-only via ICS, agroworld Cal dropped.
- New focus: **multi-account email pipeline + email→task extraction**. Replaces what was originally P6 (tasks tile from email triage) but elevated in priority — happens before the dashboard skeleton.
- Forwarding rules from M365 → Gmail bring utwente + agroworld emails into a Gmail-readable inbox.

**Why:** Adrian's actual workflow is email-driven. Calendar matters but isn't the hub. The original phase plan over-indexed on calendar; this corrects course.

## 2026-05-05 — Marktplaats messages stay in inbox

`*@mail.marktplaats.nl` (per-buyer hashed addresses) gets the `Marktplaats` label but stays in inbox.

**Why:** These are buyers asking about Adrian's listings — actual people wanting to give him money. Auto-archiving would lose visibility on revenue-relevant messages. Label gives a searchable bucket without removing inbox visibility.

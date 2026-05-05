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

## 2026-05-05 — P2.1: M365 email reaches Jarvis via Outlook forwarding rules, not API

utwente + agroworld both block API-based mail access (Mail.Read scope requires admin consent, declined). Instead, both Outlook tenants forward incoming mail to `adriangilbert26@gmail.com`. Personal Gmail filters apply `Forwarded/UTwente` (purple) and `Forwarded/Agroworld` (teal) labels based on the original `To:` header (M365 redirect preserves it). Mail lands in personal inbox + label.

**Why:** Adrian declines admin-consent requests (per global feedback rule). Forwarding is user-configurable in Outlook, requires no IT involvement, and preserves the original To header so Gmail filters work. The Forwarded/* prefix is kept distinct from Education/* to signal "this came in via the M365 redirect pipeline".

**Forward-going only:** M365 forwarding doesn't migrate historical mail. POP/IMAP fetcher in personal Gmail would have backfilled, but both tenants disable POP/IMAP at the admin level. Decision: live with the cutoff — P2.2 task extraction needs current mail, not archives.

## 2026-05-05 — voltlabs Gmail joins the multi-account pipeline

`tools/gmail.py` refactored with shared `--account` flag (`personal` default, `work=voltlabs`). Mirrors `gcal.py`'s pattern. Token files renamed: `.local/token.json` → `.local/gmail-token-personal.json`, plus new `.local/gmail-token-work.json`. The `cleanup-inbox` skill stays personal-by-default (omitting --account = personal); appended note covers the voltlabs case.

**Why:** Same OAuth Desktop client (`gmail-inbox-clearer`) works for voltlabs Gmail because adrian@voltlabs.eu is already a test user from P2 calendar setup. Workspace admin doesn't block the gmail.modify scope (verified by successful audit).

## 2026-05-05 — Account taxonomy at end of P2.1

Four accounts now reachable by Jarvis:

| Account                                            | Method                          | Read | Write |
| -------------------------------------------------- | ------------------------------- | ---- | ----- |
| adriangilbert26@gmail.com (personal Gmail)         | OAuth `gmail.modify`            | ✓    | ✓     |
| adrian@voltlabs.eu (voltlabs Gmail)                | OAuth `gmail.modify` --account work | ✓    | ✓     |
| a.g.thereparambil@student.utwente.nl (utwente M365)| Forward → personal Gmail label  | ✓ (new mail) | ✗ |
| adrian@agroworld.nl (agroworld M365)               | Forward → personal Gmail label  | ✓ (new mail) | ✗ |

**Why:** Two Gmail accounts directly auditable; two M365 accounts visible via forwarding into personal Gmail. P2.2 task extraction reads from personal + voltlabs (Gmail API) and gets utwente+agroworld content via the Forwarded/* labels in personal.

## 2026-05-05 — P2.2 architecture: skill-driven classification, no API key

Email→task extraction runs as a Claude Code skill (`extract-tasks`), not a cron job calling Claude API. `tools/gmail.py fetch-recent` dumps recent mail to JSONL; the skill reads it in-conversation, classifies, writes `tasks/<date>.jsonl`; `tools/render_tasks.py` produces `tasks/<date>.md`.

**Why:** No external API key, no separate billing, no cron infrastructure. Adrian triggers extraction when he wants the morning brief. Trade-off: not automatic — if Adrian forgets, no extraction happens. Acceptable because the trigger ("hey Jarvis, what's on my plate today") is itself a useful daily ritual.

**Storage:** Both JSONL (canonical) and markdown (rendered view) are written to `tasks/`. JSONL is source of truth; markdown is regenerable. P2.3 CLI brief and P4 dashboard tile both consume JSONL directly.

**Look-back:** `--days 1` on every run. Dedup via `.local/extracted-tasks-state.json` (Message-Id → ISO timestamp). State file tracks ALL Message-Ids in the working set per run, not just the ones that became tasks — prevents re-classifying skipped mail tomorrow.

## 2026-05-05 — Idea handling: hard skip from `tasks/`

The CLAUDE.md task-vs-idea distinction is enforced strictly by the extract-tasks classifier. Self-directed mail (project threads, exploratory subscriptions like Lovable updates, things Adrian is *building* not things others want from him) is classified as `idea` and dropped from the daily task pipeline entirely.

**Why:** Mixing ideas into `tasks/` would defeat the point of the distinction (tasks are deliverables for others; ideas are personal work). Ideas belong in `ideas/<topic>.md`, not the daily list. P6 will give them a separate dashboard tile.

## 2026-05-05 — Marktplaats classification refined for task extraction

Original P1 rule: Marktplaats messages stay in inbox (visibility, not auto-archived). That rule held — every Marktplaats message still lands in inbox and gets the `Marktplaats` label.

P2.2 refinement: not every Marktplaats message is task-shaped. Split:

- **Task** (low priority, due ≈ today): explicit price offer, pickup/delivery commitment, scheduling proposal. Buyer urgency expires same-day, so timeliness matters.
- **Skip** (`revenue` category in classifier): pleasantries, generic interest, photo requests, follow-ups on already-replied threads.

**Why:** First-pass classifier treated all Marktplaats messages identically (skip), but actual offers from buyers ARE actionable. The split rule extracts the high-signal subset without polluting `tasks/` with "is it still available?" pings. Captured to `references/email-rules-personal.md` under "Classification rules for extract-tasks skill (P2.2+)".

## 2026-05-05 — `tasks/` tracked in git (private repo trust boundary)

`tasks/<date>.{jsonl,md}` are committed alongside code. Repo is private (`PapiGonsalez/jarvis`); Adrian is the only reader. Trade-off accepted: legal/work correspondence summaries are now in git history. Mitigation: don't make the repo public.

**Alternative considered:** Gitignore `tasks/`. Rejected — loses cross-device history and turns the repo into "code only", undercutting the point of having one place for all of Jarvis's state.

**Alternative considered:** Redact subjects/bodies before write. Rejected — the context (sender, subject, snippet) is what makes the daily brief useful for picking up a task cold the next morning.

## 2026-05-05 — extract-tasks scope: include Updates, lean strict on classification

Initial fetch-recent default excluded Promotions+Social+Updates. After first smoke-test, realised Updates contains genuine signal: support-ticket replies asking for follow-up, bank statements with action notices, account-action prompts. Switched default to exclude only Promotions+Social.

But the classifier itself stays strict on what becomes a task. Specifically: support-ticket back-and-forth (GitHub support, zendesk-style threads) classifies as `fyi`/skip even when the support agent asks for info, because Adrian tracks active support threads in the source system. Surfacing them daily is noise.

**Why:** Two-stage filtering — wide net at fetch, tight rubric at classify — catches the rare action-required auto-mail without polluting `tasks/` with every "we received your ticket" reply. Captured to `.claude/skills/extract-tasks/skill.md` rubric section.

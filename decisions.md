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

## 2026-05-05 — P2.3 architecture: Textual TUI, JSONL-mutating mark-done

`tools/today.py` is an interactive Textual app. Default invocation (`python tools/today.py`) opens a full-screen TUI; the same script also exposes `done <id>` and `list` subcommands for scripting / pipes (and auto-falls-back to `list` when stdout isn't a tty).

**Why TUI over plain stdout:** Adrian asked for "compact at first, expands when clicked on." A static dump can't do per-row expansion; a TUI can. Textual was picked over `prompt_toolkit` / `urwid` because the `Tree` widget is exactly the 2-level (account → task → details) shape we need, and `rich` styling comes for free.

**Why mark-done mutates JSONL directly:** JSONL is source of truth (per P2.2 decision). Mark-done writes back immediately, then shells out to `tools/render_tasks.py` so the .md view stays in sync. CLI is one-way (`done` only) for safety; the TUI toggles open↔done.

**Grouping:** by `source.account` (currently `personal` and `work`/voltlabs). Priority desc within each section.

**Known limitation, deferred:** task records don't carry Gmail labels, so utwente/agroworld forwarded mail shows under `personal` (the receiving Gmail account) rather than as their own sections. To split them out, the extractor would need to record `labels` on each record. Out of scope for P2.3 — deferred to a later P2.2.x enhancement when it actually starts to bite.

**New dep:** `textual>=0.50`. Pulls in `rich`, `markdown-it-py`, `pygments`, `linkify-it-py`, `mdit-py-plugins`, `mdurl`, `platformdirs`, `typing-extensions`, `uc-micro-py`. ~10 small libs total, all pure-Python.

## 2026-05-05 — P3 stack: Next.js 16 + shadcn/ui + Tailwind 4 + Tailscale

**Vision shift surfaced this session:** Jarvis isn't a "lean Python tinker dashboard" — it's a long-term Tony-Stark-companion-shaped product (multimodal, polished, cutting-edge AI). Earlier prelim recommendation of FastAPI+HTMX was wrong for that. Stack chosen: **Next.js 16 (App Router, TypeScript) + React 19 + Tailwind 4 + shadcn/ui + Vercel AI SDK (later, for chat) + Framer Motion (later, for motion)**. Python tools stay where they are; future tile data comes from a FastAPI sidecar at `apps/api/` (deferred to P4 when first tile needs live data).

**Why Next.js over Streamlit/Reflex/NiceGUI/SvelteKit:**
- **Aesthetic ceiling = none** — full React ecosystem (shadcn primitives, Framer Motion, react-three-fiber later if Iron Man HUD vibes are wanted).
- **AI ecosystem is Next-first** — Vercel AI SDK, Anthropic's own examples, agent/tool/voice patterns all land here first.
- **Mobile = PWA** — install to homescreen, fullscreen, native-ish feel over Tailscale. No App Store, no native code.
- **Free** — runs on Mac via `next dev`, exposed via Tailscale's free tier (100 devices / 3 users). No Vercel hosting needed; no domain needed (Tailscale MagicDNS gives `lp-agw02.tail2877af.ts.net`).

**Why not the alternatives:**
- **Streamlit** — opinionated layout (script-rerun model) caps the aesthetic ceiling well below the JARVIS goal.
- **Reflex / NiceGUI** — Python wrappers over React/Vue. Bleeding-edge React libs become awkward through the abstraction; the whole point is to NOT be locked out of cutting-edge stuff.
- **SvelteKit** — leaner DX but the AI/agent ecosystem is Next-first; would be swimming against the current.
- **FastAPI + HTMX** — great for forms/CRUD, capped at form-shaped interactivity. Wrong for ambient AI assistant UI.

**Repo restructure:** Added `apps/` layer, with `apps/web/` for Next.js. Python tools in `tools/` are unchanged. `apps/api/` is reserved for the FastAPI sidecar (lands in P4).

**P3 ships chrome only:**
- 6 tile placeholders (Tasks, Calendar, Ideas, Tokens, Scratchpad, Pinned Notes) in a bento grid (Tasks largest, 2×2 on desktop)
- Live clock + "Jarvis · personal OS" wordmark in the header
- "Ask Jarvis…" chat input pinned bottom (UI-only, no LLM wiring — that's P10)
- 4 skill quick-action buttons in a row above the chat input (Extract tasks, Today's tasks, Cleanup inbox, Cleanup calendar). Click → modal with the terminal command + Copy button. Real invocation via FastAPI sidecar comes in P4+.
- PWA manifest at `app/manifest.ts`, icon and apple-icon generated dynamically via Next's `ImageResponse` (no static PNG files needed).
- Dark theme is default + only — no light mode for v1, no theme toggle. Matches the JARVIS aesthetic and ships less surface to maintain.

**Tailscale HTTP gotcha (worth knowing):** Chrome on Android (and increasingly all modern browsers) auto-upgrades bare hostnames to HTTPS, which fails on the dev server (HTTP-only) with `ERR_SSL_PROTOCOL_ERROR`. Workaround: type `http://` explicitly. Permanent fix (deferred to a P3 follow-up): `tailscale serve` + `tailscale cert` for a real Let's Encrypt cert on `lp-agw02.tail2877af.ts.net` — gets HTTPS and unlocks the PWA install banner + browser web-push/mic APIs.

**New deps via `apps/web/package.json`:** Next 16.2.4, React 19.2.4, Tailwind 4, TypeScript 5, ESLint 9, shadcn/ui (slate base, css-variables theming). All free, all open-source.

## 2026-05-05 — Free-only constraint locked in for the Jarvis stack

Adrian explicitly required: "this has to be free... only person using it is me, no plan to make it a product yet." Stack designed accordingly:

- **Software:** all open-source MIT/Apache (Next, React, Tailwind, shadcn/ui, FastAPI, etc.) — $0.
- **Hosting:** local on the Mac via `next dev` / `next start` — $0. No Vercel deploy.
- **Networking:** Tailscale free tier — fits 100 devices / 3 users; covers personal use for years.
- **Domain:** Tailscale MagicDNS hostname (`*.ts.net`) — $0. No domain registration needed.
- **LLM API (future, deferred to P10):** options when the time comes — Claude Code (already paying for it), Anthropic API direct (pay-per-use, typically $0–5/mo personal), local Ollama (free), local Whisper for voice (free). Decided per-feature when we wire chat/voice; not part of the stack itself.

**Trade-off accepted:** if Jarvis ever wants to reach beyond Adrian's tailnet (share with someone, public demo), we'd need to add a domain + hosting + auth — but that's a "if it ever ships externally" decision, deliberately out of scope.

## 2026-05-05 — P4 Tasks tile + apps/api/ helper program

Discussed and locked the gray areas for P4 before planning. Ten decisions across architecture, mark-done UX, freshness, and display.

**Architecture — D-P4-01: Stand up the FastAPI sidecar at `apps/api/` now.** Tile reads from it and writes to it; future tiles (P5 calendar, P6 ideas, P7 tokens) inherit the same pattern. Adrian explicitly picked the upfront infrastructure cost over the "hybrid: Node fs reads + Server Action shelling Python" option, in exchange for a single clean contract for every future tile. Pays off when calendar work lands (heavy Python: OAuth, ICS parsing, multi-account merging) — that work flows through the same helper, not another ad-hoc shape.

**Tick-off UX:**
- **D-P4-02:** Checkbox per row. Works the same on phone and laptop. Mirrors classic todo-list mental model + the TUI's `d` key.
- **D-P4-03:** Done tasks disappear by default; small "show done" toggle reveals them. Same default as the TUI's `s` key.
- **D-P4-04:** Tap the task title → opens the source email in a new tab. Mirrors the TUI's `o` key. Row is split-clickable: checkbox = tick off, title = open email.

**Freshness — D-P4-05:** Refresh on tab focus + small manual refresh button. No background polling, no push, no fs watcher. Adrian uses the dashboard alongside the TUI; coming back to the tab is the natural moment to re-pull. No battery drain on phone, no permanent open connection.

**Display:**
- **D-P4-06:** Group by source account (`personal`, `voltlabs`, …) with priority desc within each section. Matches the TUI grouping. Section headers eat space on small task counts but pay off on busier days.
- **D-P4-07:** Each row shows priority indicator + due date when present. Account badge skipped (redundant with grouping). Extracted-at time skipped (too noisy for a glance tile).
- **D-P4-08:** Long titles truncate to one line with `…`. Tap to open the email if you need the full context. Keeps every row the same height.

**States:**
- **D-P4-09:** Empty state — friendly "No tasks for today yet" line + a button that opens the existing skill-button modal for `extract-tasks` (terminal command + Copy). Same modal already used by the four skill buttons above the chat bar.
- **D-P4-10:** Error state — subtle inline message ("Couldn't load tasks") + retry button. Tile keeps its shape so the dashboard doesn't shift.

**Claude's discretion (not user-facing decisions):**
- Exact endpoint shape on `apps/api/` (likely `GET /tasks/today`, `POST /tasks/{id}/done`).
- Exact priority indicator visual (the TUI uses ▲ red / ● yellow / ▽ blue; tile will pick a coherent shadcn-friendly equivalent).
- Loading skeleton design.
- Port the helper program runs on (likely `:8001`, since web is `:3000`).
- How `apps/api/` is started/stopped alongside `next dev` (likely a small `make` target or a `concurrently` script in `package.json`).
- Whether the helper program reuses the existing `.venv` at the repo root, or gets its own.

**Deferred ideas (not P4):**
- Push-on-file-change refresh (option C in the freshness discussion). Considered, rejected for P4 — too much plumbing for a personal local-only tool. Revisit if the focus-refresh approach feels stale in practice.
- Mobile-specific gestures (swipe to tick off, etc.). Tile's checkbox is the universal interaction; gestures are not on the table for v1.
- TUI/web write coordination (what if both are mutating the JSONL at the same instant). Last-write-wins is acceptable for a single-user system; revisit only if it bites.

**Rule landed during this discussion (saved to global memory + this repo's CLAUDE.md):** when asking Adrian for an opinion on a technical choice, present each option as the outcome he'll experience — not the underlying mechanism. No "Server Component / sidecar / SSE" framing in questions. See `CLAUDE.md` and `~/.claude/projects/-Users-adrian/memory/feedback_outcomes_not_jargon.md`.

## 2026-05-05 — P5 Calendar tile

Discussed and locked the gray areas for P5 before planning. Eight decisions across window, sources, interaction, status filters, and refresh — all phrased as outcomes Adrian will see on the tile.

**Window — D-P5-01:** Tile shows **today + tomorrow** (~36 hour rolling window). Picked over today-only and 7-day. Won't go blank after dinner; tomorrow morning's stuff is visible the night before, useful for prep. Boundary: from "now" through end-of-tomorrow in Europe/Bucharest.

**Sources — D-P5-02:** All three calendars roll in.
- **personal** = personal Google (`adriangilbert26@gmail.com`) via `tools/gcal.py --account personal`.
- **work** = voltlabs Google (`adrian@voltlabs.eu`) via `tools/gcal.py --account work`. Empty by design today; included so it works the day Adrian schedules anything.
- **uni** = utwente via the registered ICS feed in `tools/ics_cal.py` (no Google token for the `uni` entry — it was decided in P2 to read utwente as ICS, not OAuth).

**Interaction — D-P5-03:** Row split-clickable, mirroring P4. **Tap the row → expands inline** to show description, attendees, location, link. **Button on the row → opens the event in Google Calendar / OWA in a new tab** (so source-of-truth is one click away). One row, two click targets.

**All-day events — D-P5-04:** Bucketed at the top in their own mini-list ("All day" header), then timed events below in chronological order. Matches Google Calendar's day view rendering. Critical for utwente exam weeks / school holiday blocks — would be lost if mixed in.

**Source identity — D-P5-05:** Small text label after each event title — quiet `· uni` / `· work` / `· personal` chip in muted color. Picked over color-dot (less intrusive) and no-marker (titles can be ambiguous). Same vocabulary as the gcal.py / ics_cal.py source naming so debugging stays consistent.

**Pending invites — D-P5-06:** Mini-row at the top of the tile: **"N awaiting response — tap to expand"**. Tap reveals the invite list inline. Pulls invites out of the timeline so they're glanceable as a queue. `gcal.py list-pending` already returns this shape (events with `attendees[].self.responseStatus = needsAction`).

**Response-status filter — D-P5-07:**
- **Declined** = hidden from view.
- **Tentative** = visible but dimmed (lower opacity / muted text).
- **Accepted / no-attendees** = full strength.
This applies to the timed event list, not to the pending mini-row.

**Refresh — D-P5-08:** Same shape as the Tasks tile from P4. **Refresh on tab focus** (`visibilitychange`) + small **manual refresh button** in the tile header. No background polling. Calendar changes less than tasks, but the symmetry is more valuable than the marginal optimization.

**Claude's discretion (not user-facing decisions):**
- Exact endpoint shape on `apps/api/` — likely `GET /calendar/upcoming` returning `{ window, all_day, timed, pending }` blocks (or a single sorted list with type tags; pick whichever keeps the client cleaner).
- Internal Pydantic model for an event — at minimum: `id`, `source` (personal/work/uni), `title`, `start`, `end`, `all_day`, `status` (accepted/tentative/declined/needsAction), `link`, optional `description`, `location`, `attendees[]`.
- Time format on the tile — 24-hour, Europe/Bucharest. Today's events use just `HH:MM`; tomorrow's prefixed with `Tmrw HH:MM`.
- Loading skeleton design (mirrors P4's `TasksTileSkeleton` structure).
- Error state copy — inline "Couldn't load calendar" + retry button per source if one fails (don't blank the whole tile if one source is down).
- Per-source error handling — if Google times out but ICS works (or vice versa), show what we have + a sub-message ("uni events unavailable").
- Whether the API endpoint fans out to all three sources sequentially or in parallel (parallel; we control all three callers).

**Deferred ideas (not P5):**
- Writing back to calendars from the tile (accept/decline invites, edit events). Read-only for v1.
- Push notifications for upcoming events. Tile is glance-only; phone calendar app already handles reminders.
- Conflict detection ("you have two things at 14:00"). Visible from the list but no special highlight in v1.
- Cross-account dedup (same event invited to two of your accounts). Real but rare; defer until it bites.
- Voltlabs Microsoft Calendar — `tools/outlook_cal.py` exists from P2 but voltlabs uses Google, not M365. If anything ever lives there, this stays a non-issue.

**Open follow-up to surface during execution:** when the API endpoint shape is concrete, sanity-check that ICS feed events expose enough metadata to render inline-expand details (description, location). If `icalendar` parser doesn't surface those reliably, tile gracefully degrades: title + time only for ICS events, full detail for Google events.

## 2026-05-05 — P6 Ideas tile

Discussed and locked the gray areas for P6 before planning. Seven decisions across status taxonomy, row content, sort, edit power, interaction, type display, and frontmatter resilience.

**Status taxonomy — D-P6-01:** Four lifecycle states: **active / next-up / paused / shipped**. Picked over the simpler 2- or 3-state variants because the "next-up" queue is a real distinction in Adrian's head (things he intends to do soon, but isn't actively doing yet). The current `ideas/jarvis-itself.md` will need its frontmatter checked — likely stays `active` for now. Tile renders one badge per state with a coherent dark-theme palette (active = green-ish, next-up = blue, paused = gray, shipped = muted).

**Row content — D-P6-02:** Each row shows **title + status badge + next_action preview**. Most actionable surface: you see what the project is, where it is in its lifecycle, and the literal next step without expanding. `next_action` is truncated to one line; full body comes via inline expand.

**Sort — D-P6-03:** Group by status (**active → next-up → paused → shipped**), `last_touched` descending within each group. Things being worked on float to the top; done stuff sinks. Cleanly mirrors how the Tasks tile groups by source.

**Edit power — D-P6-04:** **Read-only for v1.** Tile is a window into the `ideas/` folder. Source-of-truth lives in markdown; Adrian edits in his editor. Lighter to ship and respects the "ideas mature in writing, not in clicks" instinct. Status changes from the tile are deferred (potential P6.1 if it bites).

**Interaction — D-P6-05:** Row split-clickable, mirroring the calendar tile's pattern from P5. **Tap row → expands inline** to show the file's body (description, status notes). **Button on row → opens the file in GitHub web** (`https://github.com/PapiGonsalez/jarvis/blob/main/ideas/<file>.md`) in a new tab. GitHub's markdown rendering is the cleanest external view, especially on phone.

**Type display — D-P6-06:** Small `· project` or `· exploration` chip after each title in muted color — symmetric with the calendar tile's `· source` chip. Two type values match the global definition in `CLAUDE.md`: project = building it, exploration = researching it.

**Frontmatter resilience — D-P6-07:** Files with missing fields **render with sensible defaults**. Specifically: missing `status` → defaults to `active`. Missing `next_action` → row hides that line (just title + badges). Missing `last_touched` → falls back to file mtime. Missing `started` → falls back to file mtime. Missing `type` → defaults to `project`. A bare `ideas/<slug>.md` with just an H1 title still renders. Lowest friction to capture an idea fast and clean it up later.

**Claude's discretion (not user-facing decisions):**
- Exact endpoint shape on `apps/api/` — likely `GET /ideas/list` returning `{ groups: [{status, ideas[]}, ...] }` (groups already pre-sorted by the server). Or a flat list with the client doing the grouping; pick whichever keeps the tile cleanest.
- Internal Pydantic model: `id` (file slug, derived from filename), `title`, `type`, `status`, `started`, `last_touched`, `next_action`, `description` (body up to first H2), `status_notes` (the H2 "Status notes" section, raw markdown).
- Refresh strategy — mirrors Tasks/Calendar: refresh-on-tab-focus + manual refresh button. Adrian edits a file in editor, comes back to the tab, sees update.
- GitHub web URL — derived once from `git remote get-url origin` at build time (or hardcoded after verification). The remote is `PapiGonsalez/jarvis`.
- Loading skeleton, empty state copy ("No ideas yet" + how-to-add hint), error state with retry — mirror calendar tile.
- Status badge palette — picked to harmonize with the existing dark theme; not load-bearing.
- Frontmatter parser library — try `python-frontmatter` (small, well-maintained). Add to `requirements.txt`.

**Deferred ideas (not P6):**
- Status changes from the tile (D-P6-04 says read-only for v1). Revisit if Adrian finds himself opening files just to flip `status: active` to `status: shipped`.
- Add-new-idea button on the tile. Same — defer until the friction of "open editor, create file, write frontmatter" actually bites.
- Nested ideas (an idea linking to sub-ideas). Out of scope; flat folder.
- Search / filter / tag UI. The folder is one digit's worth of files for the foreseeable future.
- Ideas-graphify integration (the knowledge graph being built up by daily use). Visualization layer is far down the road.

## 2026-05-05 — P7 Tokens tile

Discussed and locked the gray areas for P7 before planning. Eight decisions across window, job-to-be-done, unit, aggregation, special-case projects, token math, and trend display.

**Window — D-P7-01:** **7 days rolling.** Calendar days, today + 6 prior, in Europe/Bucharest. Most actionable horizon — visible week-pace without daily noise. Each new day rolls one off the back.

**Job to be done — D-P7-02:** Tile answers **"where is my Claude Code time going?"** Per-project breakdown is the hero (not a single big number, not a sparkline, not cache efficiency). Aligns with `CLAUDE.md`'s third job: "be smart about prioritization (tokens, time, energy)".

**Unit — D-P7-03:** **Raw tokens** (e.g., "12.3M tokens this week"). Adrian uses Claude Code via Pro subscription (flat-rate), so an API-priced $ figure would be hypothetical. Tokens are model-agnostic and honest about volume.

**Aggregation — D-P7-04:** **Per-project breakdown, top 5 with horizontal bars; rest summed as "Other"**. Compact tile, captures the long tail without cluttering. Top 5 + "Other" + (potentially) "subagents" line.

**Subagents handling — D-P7-05 (revised mid-execution):** **Attribute subagent tokens to their parent project.** Original decision was "show as own line" based on the assumption that `subagents/` was a top-level folder under `~/.claude/projects/`. Recon during step 3 revealed it's actually **nested inside each session**: `~/.claude/projects/<project>/<session-uuid>/subagents/<sub-session>.jsonl`. Subagent runs are work spawned mid-session by a parent project (e.g., regicargo's main session delegating to a sub-agent), so they belong to that project's footprint. Measured share over the 7-day smoke window: ~194M of the ~2.5B total (7.7%), almost all from regicargo. Implementation: walk JSONL files recursively (`rglob`) under each project folder; the parent project's label captures everything beneath, including `/subagents/`. No virtual `subagents` bucket.

**Worktree handling — D-P7-06:** **Combine worktree folders into the parent project**. Regicargo has the main folder plus 7 `.claude/worktrees/<auto-name>/` worktree folders. From the project-priority view they're all "regicargo". The folder-name encoding `--claude-worktrees-<slug>` is the marker to strip.

**Token math — D-P7-07:** **All four flavors summed** — `input_tokens + cache_creation_input_tokens + cache_read_input_tokens + output_tokens`. Raw volume. Treats cache reads as "data that flowed" even though they're cheap; honest about the size of the context Claude is processing on Adrian's behalf.

**Trend signal — D-P7-08:** **Both** — sparkline (7 daily bars) AND a small delta vs prior 7d ("▲ +12% vs prior 7 days"). Adrian deviated from the recommendation (delta-only) — wants the visual + the number. More information density on the tile, slight risk of crowding the per-project breakdown which is supposed to be the hero. Mitigation: keep sparkline tiny (one row of mini bars under the headline number).

**Claude's discretion (not user-facing decisions):**
- Project label normalization: strip leading `-`, strip `--claude-worktrees-…` suffix, strip common prefixes (`Users-adrian-projects-`, `Users-adrian-am-laravel-`, `Users-adrian-`). The bare `-Users-adrian` folder (Claude Code runs from `~`) becomes `global`. Worth a small unit-style sanity check during execution.
- Endpoint shape: likely `GET /tokens/summary?days=7` returning `{ window, total_tokens, prior_total, delta_pct, daily: [...], projects: [{label, tokens, share}], errors }`. Per-day buckets in Europe/Bucharest TZ.
- Number formatting on the tile: compact (`12.3M`, `4.2K`). Helper function client-side, e.g., `Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })`.
- Sparkline rendering: tiny vertical bars (CSS, no chart library). 7 bars, height proportional to that day's total relative to the max in the window. Each bar ~3-4px wide, ~10-16px tall at peak. SVG or just `<div>`s.
- Per-project bar widths: proportional to share of the 7d total. Width animates only on initial load; not on subsequent refreshes (avoid jumpy behavior).
- Caching strategy: parse all 229 JSONL files on each request for v1 (~1-2s on M-series, acceptable). If it gets slow, add a `~/.local/jarvis-tokens-cache.json` keyed by file mtime. Defer until it bites.
- Refresh strategy: same as Tasks/Calendar/Ideas — refresh-on-tab-focus + manual button.
- Tile size: keeping at 1 cell wide (current bento grid layout). Vertical layout: header + headline + sparkline + 5–7 project bars. Tight but workable.

**Deferred ideas (not P7):**
- Window selector on the tile (toggle between 7d / 30d / today). Defer until "default 7d" feels wrong in practice.
- API-priced $ display (per-model rates). Defer indefinitely while Adrian's on Pro flat-rate.
- Per-project drill-down (tap a project bar → see day-by-day or session list). Defer until a real "where did this hour go" question shows up.
- Cache hit ratio surface (separate stat or chip). Real signal but niche.
- Alert thresholds (red when daily over X tokens). No budget pressure on Pro.
- Cross-machine token aggregation. Adrian uses one Mac for Claude Code. Skip.
- Real-time updates as JSONL grows. Manual refresh + on-focus is enough.

**Open follow-up to surface during execution:** confirm the project-label normalization actually produces clean labels for all 14 project folders + the `subagents` bucket. Worth a small print-the-labels sanity step before wiring the endpoint.

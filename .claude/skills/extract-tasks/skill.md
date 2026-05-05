---
name: extract-tasks
description: Conversational pull of recent mail across personal + voltlabs Gmail. Classifies each email as task / idea / skip. Writes task records to tasks/YYYY-MM-DD.jsonl and renders a markdown view. Honors the task vs idea distinction in CLAUDE.md. Invoke when Adrian asks to extract tasks, pull a morning brief, or generate today's task list.
---

# extract-tasks

Daily pipeline: recent mail → classifier → `tasks/YYYY-MM-DD.{jsonl,md}`. Run conversationally; the LLM (Claude in this session) does the classification. No external API.

## Definition of a task (load-bearing — from CLAUDE.md)

- **Task** = someone external expects a deliverable from Adrian. Has external accountability. Has a deadline (explicit or implicit).
- **Idea** = self-directed. A project Adrian is building OR a topic he's exploring. Even if a self-directed thread arrives via email, it's an idea, not a task. **Hard skip ideas — they don't go in `tasks/` at all.**

## Prerequisites

- `tools/gmail.py` working with multi-account (`--account {personal,work}`)
- `tools/render_tasks.py` exists
- venv at `.venv/`, OAuth tokens at `.local/gmail-token-{personal,work}.json`

## SOP

### Step 1 — Determine look-back window

Read `.local/extracted-tasks-state.json` (creates if missing).

```
{
  "<message-id-1>": "2026-05-05T16:00:00Z",
  "<message-id-2>": "2026-05-05T16:00:00Z"
}
```

The state file is a flat map of Message-Id → extraction timestamp. Used for dedup, not for window calculation.

**Window:** always use `--days 1` on every run. The state file prevents re-extraction of mail seen in earlier runs the same day. If Adrian says "I missed yesterday too", pass `--days 2`.

### Step 2 — Fetch recent mail

Run for both accounts, concatenate JSONL into one working file:

```bash
.venv/bin/python tools/gmail.py fetch-recent \
  --account personal \
  --days 1 \
  --state-file .local/extracted-tasks-state.json \
  --output /tmp/jarvis-recent-personal.jsonl

.venv/bin/python tools/gmail.py fetch-recent \
  --account work \
  --days 1 \
  --state-file .local/extracted-tasks-state.json \
  --output /tmp/jarvis-recent-work.jsonl
```

The default query excludes Promotions + Social tabs but **keeps Updates**. Updates contains real signal (support ticket replies, account-action requests, bank statements) alongside noise (shipping FYI, receipts) — let the classifier sort it. Custom labels like `Forwarded/UTwente` and `Forwarded/Agroworld` are included automatically because they're in inbox.

Read both JSONL files into context. Tell Adrian the counts before proceeding.

### Step 3 — Classify each email

For every email in the working set, decide one of:

- **task** — external accountability + deliverable + (explicit or implicit) deadline
- **idea** — self-directed work, project thread, or topic exploration
- **fyi** — informational only (digests, PR notifications, alerts not requiring action from Adrian)
- **promo** — marketing / newsletter (should already be filtered, but catch any that slipped through)
- **system** — automated (password resets, login alerts, calendar invites, receipts)
- **revenue** — Marktplaats buyer pleasantries / generic replies (kept for inbox visibility per P1 rule, not a task). **BUT:** messages with an **explicit price offer, commitment, or scheduling proposal** are tasks — classify as `task`, low priority, due ≈ today (buyer urgency typically expires same-day). Generic "okay good luck" / "is it still available?" / "can I see more pictures" remain `revenue`.
- **already-actioned** — Adrian has already replied to or handled this thread (look at thread length, recent labels, "Re:" patterns)

Only `task` produces a record in `tasks/YYYY-MM-DD.jsonl`. All others are dropped from this pipeline (but their Message-Ids still go into state to avoid re-classification).

#### Classification rubric for tasks

A clear task usually has:

- An action verb directed at Adrian: "send", "submit", "review", "respond", "approve", "fill out", "confirm"
- A specific deliverable: a document, a reply, a decision, a payment
- A timeline: explicit date, "by end of week", "ASAP", or implicit urgency from context

Edge cases:

- "Let me know if X" — task only if X is something Adrian needs to actively decide and respond to. Otherwise FYI.
- Calendar invites with `needsAction` — out of scope (Calendar pipeline is separate).
- Auto-generated reminders for recurring tasks (e.g., weekly timesheet) — task, but priority depends on deadline proximity.
- Mail you (Adrian) sent but is awaiting response from someone else — not a task; it's a follow-up tracker (different concept). Skip.
- **Support-ticket back-and-forth (zendesk/intercom style):** even when a support reply asks for info ("please provide your username + creation date"), classify as `fyi`/skip. Adrian tracks active support threads in the source system; daily-task surfacing of these is noise. Only escalate to `task` if there's a hard deadline ("respond within 5 days or your ticket closes") AND the deadline is approaching.

When unsure, prefer **lower confidence + include as low priority** over hard skip. Adrian reviews the markdown and prunes; missing a real task hurts more than including a false one.

### Step 4 — Build task records

For each `task`-classified email, generate one JSONL record. Schema:

```json
{
  "id":           "task_<8-char hash of message_id + task text>",
  "extracted_at": "<ISO timestamp, current run>",
  "source": {
    "account":       "personal" | "work",
    "account_email": "<from the source JSONL record>",
    "message_id":    "<from the source>",
    "from":          "<From header>",
    "subject":       "<Subject header>",
    "date":          "<Date header>",
    "gmail_url":     "<from the source>"
  },
  "task":       "<one-line, action-verb-led description>",
  "due":        "YYYY-MM-DD" | null,
  "priority":   "high" | "medium" | "low",
  "confidence": 0.0-1.0,
  "notes":      "<one-line rationale, only if conf < 0.8 or non-obvious>",
  "status":     "open"
}
```

**Hash the id** so re-runs that re-extract the same task don't create duplicate records. Use `python3 -c "import hashlib; print(hashlib.md5(b'<msg-id>::<task>').hexdigest()[:8])"` if needed.

**Priority hints:**

- `high` — explicit urgency, deadline ≤ 3 days, VIP sender (utwente professor, agroworld manager, voltlabs leadership)
- `medium` — clear ask, deadline 1-2 weeks, routine work
- `low` — optional / nice-to-have / interpretive

**Due date:**

- Parse explicit dates ("by Monday May 12", "before EOW") into ISO date. Use Europe/Bucharest (Adrian's TZ).
- "ASAP" / "urgent" → today's date
- No mention → `null`

### Step 5 — Write JSONL

Append to (or create) `tasks/YYYY-MM-DD.jsonl` (today's date in Adrian's TZ). One record per line, no trailing newline issues.

If today's file already exists from an earlier run, **deduplicate by `id`** before writing — load existing records, drop ones with matching IDs, append new ones, write back.

### Step 6 — Render markdown

```bash
.venv/bin/python tools/render_tasks.py tasks/<YYYY-MM-DD>.jsonl
```

Writes `tasks/YYYY-MM-DD.md` next to the JSONL.

### Step 7 — Update state file

For **every** Message-Id from the working set (not just the ones that became tasks), add to `.local/extracted-tasks-state.json` with the current ISO timestamp. This prevents re-classifying the same email tomorrow.

Optionally prune: drop entries older than 30 days (they fall out of the look-back window anyway).

### Step 8 — Report

Show Adrian:

- Total emails scanned (per account)
- Breakdown: N tasks / N ideas-skipped / N fyi-skipped / N promo / N system / N already-actioned / N revenue-marktplaats
- Path to the markdown view: `tasks/YYYY-MM-DD.md`
- Brief preview of the high-priority items

Ask: "Want to adjust any classifications, or are these tasks good?"

If Adrian flags any (e.g., "the Sentry one isn't a task; it's FYI"), update the JSONL: drop the misclassified record, re-render the markdown. Capture the rule for future runs in `references/email-rules-personal.md` (or `email-rules-work.md` for voltlabs senders).

### Step 9 — Optional: hand off to the TUI

After extraction, suggest:

```bash
.venv/bin/python tools/today.py
```

Opens the Textual TUI for interactive review (Enter expand, `d` mark done, `o` open Gmail, `s` show/hide done, `q` quit). Marking done writes back to the JSONL and re-renders the .md.

## Constraints

- **Never** auto-mark mail as read/archived — extract is read-only on Gmail
- **Never** include ideas or self-directed threads in `tasks/` (use `ideas/` for those, manually)
- **Always** include the Gmail deep-link in `source.gmail_url` so Adrian can jump to the source thread
- **Always** prefer including a borderline task at low confidence over silently dropping it
- **Never** assume a task is closed without checking — even if Adrian replied, the deliverable might still be pending

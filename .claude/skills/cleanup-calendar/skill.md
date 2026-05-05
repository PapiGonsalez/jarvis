---
name: cleanup-calendar
description: Conversational cleanup of Adrian's personal Google Calendar. Audits subscribed calendars, recurring series, and pending invites; proposes targeted cleanups; confirms each destructive action. Invoke when Adrian asks to clean up calendar, organize calendar, or deal with calendar cruft.
---

# cleanup-calendar

Personal Google Calendar cleanup for `adriangilbert26@gmail.com`. Conversational — every destructive action requires explicit confirmation. Operations go through `tools/gcal.py`.

## Prerequisites

- `.local/credentials.json` exists (Google OAuth Desktop app — same one Gmail uses)
- Google Calendar API enabled in the Cloud Console project (`gmail-inbox-clearer`)
- `.local/calendar-token.json` exists OR Adrian is at the laptop for first-time OAuth
- Python venv at `.venv/` already has dependencies (same as Gmail; no extra installs needed)

If `credentials.json` is missing → see `references/gmail-api.md` (same setup process).
If Calendar API isn't enabled → in Cloud Console, search "Google Calendar API" → Enable.

## Tool invocation

Always venv Python from repo root:

```bash
.venv/bin/python tools/gcal.py <subcommand>
```

Read-only subcommands: `auth`, `audit`, `list-calendars`, `list-events`, `list-recurring`, `list-pending`.

Destructive ops (added in second pass): delete-event, end-recurring, decline-event, unsubscribe-cal.

## SOP

### Step 0 — First-time auth (skip if `.local/calendar-token.json` exists)

Run `.venv/bin/python tools/gcal.py auth`. Browser opens; Adrian consents to calendar scopes (separate from the gmail consent earlier — different token file). Same "App not verified" warning → Advanced → "Go to Jarvis (unsafe)" → Allow.

### Step 1 — Audit

Run `audit`. Show Adrian:
- Number of subscribed calendars
- Per-calendar event counts (last 30 days, next 30 days, last year)
- Pending invite count
- Count of ended recurring series still in calendar

Identify the largest noise sources:
- Calendars with high event counts that he doesn't recognize → candidates to unsubscribe
- Many ended recurring series → candidates to clean up
- Many pending invites → candidates to bulk-decline

### Step 2 — Subscribed calendars walk

Run `list-calendars`. For each non-primary calendar:
- Show name + access role
- Ask: "Keep / Unsubscribe / Skip?"
- Capture decisions to `references/calendar-rules-personal.md`

### Step 3 — Recurring series cleanup

Run `list-recurring`. Show series flagged `[ENDED ...]` first.
For each ENDED series:
- "Delete the series? (you keep all past instances; future is already gone)"
- Confirm → run delete

For series with `[no end]`:
- Show summary + start date
- Ask: "Still active, set end date, or delete entire series?"
- If "set end date": prompt for date, run end-recurring

### Step 4 — Pending invites

Run `list-pending`. For each:
- Show date + title + organizer
- Ask: "Decline / Skip / Open in browser to handle later?"
- Decline → run decline-event

### Step 5 — Capture rules

Append decisions to `references/calendar-rules-personal.md` so future cleanup runs are informed.

### Step 6 — Final summary

Run `audit` again. Show before/after.

## Constraints

- **Never** delete an event without explicit confirmation per item
- **Never** unsubscribe from primary calendar (it's Adrian's main one)
- **Never** delete past events — they have value as history
- **Always** confirm at series-level when killing recurring (it removes ALL future instances)
- **Always** show what's being deleted before deleting

## Notes

Calendar cleanup is more conservative than email. Calendar UI is naturally time-bounded (the past scrolls off). The main wins are:
1. Reducing noise from old subscribed calendars (e.g. school calendar from 2024 still showing)
2. Killing recurring events that already ended but linger in the calendar's recurrence list
3. Cleaning up pending invites that are old enough to no longer matter

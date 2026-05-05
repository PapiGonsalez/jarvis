---
name: cleanup-inbox
description: Conversational personal Gmail cleanup. Audits inbox, proposes batch actions, executes only after confirmation. Captures rules for future triage. Invoke when Adrian asks to clean up email, organize inbox, or deal with email backlog.
---

# cleanup-inbox

Personal Gmail cleanup for `adriangilbert26@gmail.com`. Conversational — every bulk action requires explicit confirmation. All operations go through `tools/gmail.py` (see file for full CLI).

## Prerequisites

- `.local/credentials.json` exists (Google OAuth Desktop app credentials)
- `.local/token.json` exists OR Adrian is at the laptop for first-time OAuth (browser pops up)
- Python venv at `.venv/` with `google-api-python-client` + `google-auth-oauthlib` installed (`.venv/bin/pip install -r requirements.txt`)

If `credentials.json` is missing, halt and direct Adrian to `references/gmail-api.md` for OAuth setup.

## Tool invocation

Always use venv Python from repo root:

```bash
.venv/bin/python tools/gmail.py <subcommand>
```

Subcommands: `auth`, `audit`, `top-senders`, `archive`, `mark-read`, `apply-label`, `create-filter`.

**Always run `--dry-run` first** for any bulk archive / label / mark-read. Show Adrian the count, get explicit yes, then run for real.

## SOP

### Step 0 — First-time auth (skip if `.local/token.json` exists)

Run `.venv/bin/python tools/gmail.py auth`. Browser opens; Adrian logs in as `adriangilbert26@gmail.com` and clicks through the consent screen. He'll see "This app isn't verified" — that's expected (we're in Testing mode). He clicks Advanced → "Go to Jarvis (unsafe)" → Allow.

### Step 1 — Audit

Run `audit`. Show Adrian the output. Identify the largest piles. Note the top 10 senders.

### Step 2 — Bankruptcy on old unread

If "Unread > 6 months" is large (> 500): propose archiving them all.

```bash
.venv/bin/python tools/gmail.py archive --query "is:unread older_than:6m" --dry-run
```

Show count to Adrian. On confirmation, run without `--dry-run`. This is the highest-leverage move — gets thousands of messages out of unread state in one click.

### Step 3 — Top senders, one at a time

Run `top-senders --sample 500 --limit 15`. For each sender, ask Adrian:

> "X has Y messages. What's this? **[k]eep / [l]abel-and-archive / [u]nsubscribe-and-archive / [s]kip**"

Decisions:
- **keep** — note as "keep in inbox" rule, move on
- **label-and-archive** — ask for label name (e.g. `Newsletters/Stripe`, `Receipts/Amazon`); run `apply-label --archive`
- **unsubscribe-and-archive** — Adrian must click unsubscribe in Gmail himself (we don't auto-unsubscribe; some are malicious). After he confirms unsubscribed, run `apply-label --archive` to clean up existing
- **skip** — defer

For each label-and-archive, also ask: "Want to auto-archive future mail from this sender?" If yes, run `create-filter --from <sender> --label <name> --archive`.

Capture every rule into `references/email-rules-personal.md` (append, with date).

### Step 4 — Tab bulk-clear (Promotions / Social / Updates / Forums)

For each non-empty tab, propose:

```bash
.venv/bin/python tools/gmail.py apply-label --query "category:promotions" --label "Auto/Promotions" --archive --dry-run
```

Confirm count, run without dry-run. Repeat for social/updates/forums if non-trivial.

Note: Gmail's tab classifier handles incoming mail going forward; this only cleans the existing pile.

### Step 5 — Final unread bankruptcy

Ask: "Mark remaining unread > 1 month as read? (just marks read, doesn't archive)"

```bash
.venv/bin/python tools/gmail.py mark-read --query "is:unread older_than:1m" --dry-run
```

Confirm, run.

### Step 6 — Capture rules

Append every decision from Step 3-4 to `references/email-rules-personal.md` with today's date. Format:

```markdown
## YYYY-MM-DD — Personal Gmail cleanup pass

- `from:newsletter@stripe.com` → label `Newsletters/Stripe`, archive (filter created)
- `from:notifications@github.com` → keep in inbox
- `category:promotions` → label `Auto/Promotions`, archive (one-time bulk; tab classifier handles new mail)
- ...
```

These rules become the input to a future `triage-inbox` skill.

### Step 7 — Final summary

Run `audit` again. Show before/after. Output:

- Inbox total: was X → now Y
- Unread: was X → now Y
- Rules captured: N

## Constraints

- **Never** run a bulk modify without `--dry-run` first
- **Never** auto-unsubscribe (could be malicious; Adrian clicks himself)
- **Never** delete (we use archive — recoverable)
- **Never** send mail (scope `gmail.modify` doesn't permit it anyway)
- **Always** confirm per-sender during top-senders walk; don't batch

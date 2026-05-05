# Gmail API setup (personal account)

Quick-reference for getting OAuth set up so `tools/gmail.py` can talk to Gmail.

## When you need this

- First-time setup
- Credentials revoked/rotated
- Setting up Jarvis on a new machine

## Steps (Google Cloud Console)

1. Sign into [console.cloud.google.com](https://console.cloud.google.com/) as the Gmail account you want to clean (`adriangilbert26@gmail.com` for personal)
2. Top bar → New Project → name it `Jarvis` (or pick existing project `gmail-inbox-clearer`)
3. Top search → "Gmail API" → Enable
4. Left sidebar → APIs & Services → OAuth consent screen
   - User type: External → Create
   - App name: Jarvis · support email + dev contact: same Gmail
   - Skip scopes step (we declare them in code)
   - Test users: add the same Gmail
5. Left sidebar → Credentials → + Create Credentials → OAuth client ID
   - Application type: **Desktop app**
   - Name: Jarvis Desktop → Create
6. Download JSON. Move to `.local/credentials.json` in this repo (gitignored)

## Scopes used

`tools/gmail.py` requests these scopes (declared in `SCOPES` constant):

- `https://www.googleapis.com/auth/gmail.modify` — read, label, archive, mark read
- `https://www.googleapis.com/auth/gmail.settings.basic` — create filters

If you change scopes in code, delete `.local/token.json` to force re-consent.

## First-time auth flow

```bash
.venv/bin/python tools/gmail.py auth
```

Browser opens. Steps:
1. Sign in as the Gmail account (must match the test user added in step 4 above)
2. "This app isn't verified" — click Advanced → "Go to Jarvis (unsafe)" — expected, we're in Testing mode
3. Allow the requested scopes
4. Browser shows "The authentication flow has completed. You may close this window."
5. Token saved to `.local/token.json`

## Troubleshooting

- **`Missing OAuth credentials at .local/credentials.json`** — re-do step 6 above
- **`access_denied` after consent** — make sure your Gmail is added as a test user in OAuth consent screen
- **`invalid_grant`** — token expired and refresh failed; delete `.local/token.json` and re-run auth
- **`insufficient permission`** — scope mismatch; delete `.local/token.json` and re-run auth (forces re-consent with new scopes)

## Costs

Free for personal use. Gmail API daily quota is ~1B units; cleanup uses ~10K units. No billing required.

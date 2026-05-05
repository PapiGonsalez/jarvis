# Outlook / Microsoft Graph setup

Setup notes for Adrian's M365 accounts (`utwente.nl`, `agroworld.nl`) so `tools/outlook_cal.py` (and future `tools/outlook_mail.py`) can talk to Microsoft Graph.

## When you need this

- First-time M365 setup
- Setting up Jarvis on a new machine
- Re-issuing client ID after deletion

## Steps (Azure Portal)

1. Sign into [portal.azure.com](https://portal.azure.com) with **any Microsoft account** (personal recommended; one of the M365 work/uni accounts also works but the app gets registered under that tenant)
2. Top search → **App registrations** → click → **+ New registration**
3. Settings:
   - **Name:** `Jarvis`
   - **Supported account types:** `Accounts in any organizational directory (Multitenant) and personal Microsoft accounts` (critical for multi-account use)
   - **Redirect URI:** `Public client/native (mobile & desktop)` → `http://localhost`
4. Register
5. Copy the **Application (client) ID** (a GUID like `a1b2c3d4-...`)
6. Save it to `.local/outlook-credentials.json`:
   ```json
   {"client_id": "<the GUID>"}
   ```
7. Sidebar → **API permissions** → **+ Add a permission** → **Microsoft Graph** → **Delegated permissions**:
   - `Calendars.ReadWrite`
   - `User.Read`
   - `offline_access`
   Click **Add permissions** → Save.

No "grant admin consent" needed — delegated user consent works fine in Testing mode.

## Scopes used

`tools/outlook_cal.py` requests these (in `SCOPES` constant):

- `Calendars.ReadWrite` — read + create + modify + delete calendar events
- `User.Read` — basic profile (display name, email)

## First-time auth flow

```bash
.venv/bin/python tools/outlook_cal.py auth --account utwente
```

Browser opens. Steps:
1. Sign in **as the M365 account** (utwente or agroworld — match the `--account` flag)
2. Permission consent screen lists Calendars.ReadWrite + User.Read → Accept
3. Token saved to `.local/outlook-token-<account>.json`

Repeat for each `--account` (utwente, agroworld) on first auth.

## Troubleshooting

- **`AADSTS50020` / "User account from identity provider does not exist in tenant"** — you signed in with a different Microsoft account than the one matching `--account`. Sign out, sign in with the correct one, retry.
- **"Need admin approval"** — your M365 tenant blocks unverified apps. Workaround: ask org admin to consent on your behalf, OR use a different scope set, OR sign in with a personal MS account.
- **Token expired / refresh fails** — delete `.local/outlook-token-<account>.json` and re-run `auth --account <account>`.
- **`invalid_client`** — `outlook-credentials.json` has wrong client_id. Re-copy from Azure portal.

## Costs

Free for personal use within Microsoft Graph free tier. No subscription required.

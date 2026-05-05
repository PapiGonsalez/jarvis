#!/usr/bin/env python3
"""Outlook (Microsoft 365) calendar client for Jarvis. Auth + audit + cleanup.

Mirrors tools/gcal.py for Google Calendar but uses Microsoft Graph + MSAL.

Subcommands:
  auth            Run OAuth flow / refresh token (per --account).
  audit           Calendar state: counts, recurring series, pending invites.
  list-calendars  Calendars in this account.
  list-events     Events in a date range.
  list-recurring  Recurring series (flags ENDED ones).
  list-pending    Events awaiting your response.
  delete-event    Delete an event by ID (recurring → entire series).

Accounts (token files saved per-account):
  utwente    → a.g.thereparambil@student.utwente.nl
  agroworld  → adrian@agroworld.nl

Examples:
  .venv/bin/python tools/outlook_cal.py auth --account utwente
  .venv/bin/python tools/outlook_cal.py audit --account agroworld
  .venv/bin/python tools/outlook_cal.py list-recurring --account utwente
"""
import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import msal
import requests

ROOT = Path(__file__).resolve().parent.parent
CREDS_PATH = ROOT / ".local" / "outlook-credentials.json"

# Each M365 account gets its own token file. Add new accounts here.
ACCOUNTS = {
    "utwente":   "outlook-token-utwente.json",   # a.g.thereparambil@student.utwente.nl
    "agroworld": "outlook-token-agroworld.json", # adrian@agroworld.nl
}

# Scopes for Microsoft Graph delegated permissions
SCOPES = [
    "Calendars.ReadWrite",
    "User.Read",
]

GRAPH = "https://graph.microsoft.com/v1.0"
DEFAULT_AUTHORITY = "https://login.microsoftonline.com/common"


def load_creds() -> dict:
    if not CREDS_PATH.exists():
        sys.exit(
            f"Missing Outlook credentials at {CREDS_PATH}.\n"
            "After registering Azure app, save: {\"client_id\": \"<guid>\"} to that file.\n"
            "See references/outlook-api.md."
        )
    return json.loads(CREDS_PATH.read_text())


def token_path(account: str) -> Path:
    if account not in ACCOUNTS:
        sys.exit(f"Unknown account {account!r}. Choices: {list(ACCOUNTS)}")
    return ROOT / ".local" / ACCOUNTS[account]


def get_msal_app(account: str):
    creds = load_creds()
    cache = msal.SerializableTokenCache()
    tp = token_path(account)
    if tp.exists():
        cache.deserialize(tp.read_text())
    app = msal.PublicClientApplication(
        client_id=creds["client_id"],
        authority=creds.get("authority", DEFAULT_AUTHORITY),
        token_cache=cache,
    )
    return app, cache, tp


def get_token(account: str) -> str:
    app, cache, tp = get_msal_app(account)
    accounts = app.get_accounts()
    result = None
    if accounts:
        result = app.acquire_token_silent(SCOPES, account=accounts[0])
    if not result or "access_token" not in result:
        result = app.acquire_token_interactive(scopes=SCOPES)
    if not result or "access_token" not in result:
        err = result.get("error_description", result) if result else "unknown"
        sys.exit(f"Auth failed: {err}")
    if cache.has_state_changed:
        tp.parent.mkdir(parents=True, exist_ok=True)
        tp.write_text(cache.serialize())
    return result["access_token"]


def graph_get(path: str, token: str, params: dict | None = None) -> dict:
    url = path if path.startswith("http") else f"{GRAPH}{path}"
    r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=params or {})
    if not r.ok:
        sys.exit(f"Graph error {r.status_code} on {path}: {r.text[:300]}")
    return r.json()


def graph_get_all(path: str, token: str, params: dict | None = None) -> list:
    """Paginate through @odata.nextLink."""
    items: list = []
    url = path if path.startswith("http") else f"{GRAPH}{path}"
    p = (params or {}).copy()
    while url:
        if url.startswith(GRAPH):
            r = requests.get(url, headers={"Authorization": f"Bearer {token}"}, params=p)
        else:
            r = requests.get(url, headers={"Authorization": f"Bearer {token}"})
        if not r.ok:
            sys.exit(f"Graph error {r.status_code}: {r.text[:300]}")
        data = r.json()
        items.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
        p = {}  # next link contains its own params
    return items


def graph_delete(path: str, token: str):
    r = requests.delete(f"{GRAPH}{path}", headers={"Authorization": f"Bearer {token}"})
    if not r.ok:
        sys.exit(f"Graph delete failed {r.status_code}: {r.text[:300]}")


def cmd_auth(args):
    token = get_token(args.account)
    me = graph_get("/me", token)
    print(f"Account:          {args.account}")
    print(f"Authenticated as: {me.get('userPrincipalName', me.get('mail', '?'))}")
    print(f"Display name:     {me.get('displayName', '?')}")
    print(f"Token saved to    {token_path(args.account)}")


def cmd_list_calendars(args):
    token = get_token(args.account)
    cals = graph_get_all("/me/calendars", token)
    print(f"Calendars ({len(cals)}) in {args.account}:\n")
    for c in cals:
        owner = c.get("owner", {}).get("name", "?")
        print(f"  {c.get('name', '?'):<45}  owner={owner}")
        print(f"    id: {c.get('id', '')[:50]}...")
        print(f"    canEdit: {c.get('canEdit')}  canShare: {c.get('canShare')}")
        print()


def cmd_audit(args):
    token = get_token(args.account)
    me = graph_get("/me", token)
    print(f"=== Outlook calendar audit ({args.account}) ===\n")
    print(f"Authenticated as: {me.get('userPrincipalName', '?')}")

    cals = graph_get_all("/me/calendars", token)
    print(f"Calendars:        {len(cals)}\n")

    now = datetime.now(timezone.utc)
    time_min_30d = (now - timedelta(days=30)).isoformat()
    time_max_30d = (now + timedelta(days=30)).isoformat()
    time_min_1y = (now - timedelta(days=365)).isoformat()

    print(f"Per-calendar event counts:\n")
    print(f"  {'Calendar':<45}  {'last 30d':>10}  {'next 30d':>10}  {'last 1y':>10}")
    print(f"  {'-'*45}  {'-'*10}  {'-'*10}  {'-'*10}")
    for c in cals:
        cid = c["id"]
        try:
            def cnt(start, end, top=2000):
                resp = graph_get(
                    f"/me/calendars/{cid}/calendarView",
                    token,
                    params={"startDateTime": start, "endDateTime": end, "$top": top, "$count": "true"},
                )
                return len(resp.get("value", []))
            past = cnt(time_min_30d, now.isoformat())
            fut = cnt(now.isoformat(), time_max_30d)
            year = cnt(time_min_1y, now.isoformat())
            print(f"  {c.get('name', '?')[:45]:<45}  {past:>10}  {fut:>10}  {year:>10}")
        except SystemExit:
            print(f"  {c.get('name', '?'):<45}  (error)")
            raise

    # Pending invites
    print(f"\nPending invites (response = notResponded, future events):")
    try:
        events = graph_get_all(
            "/me/events", token,
            params={"$top": 100, "$select": "id,subject,start,responseStatus,organizer"},
        )
        pending = [
            e for e in events
            if e.get("responseStatus", {}).get("response") in ("notResponded", "none")
            and (e.get("start", {}).get("dateTime", "") >= now.isoformat()[:19])
        ]
        print(f"  {len(pending)} pending across primary")
    except Exception as e:
        print(f"  (error: {e})")

    # Recurring ended
    print(f"\nRecurring series ENDED (recurrence range.endDate < today):")
    try:
        events = graph_get_all(
            "/me/events", token,
            params={"$filter": "type eq 'seriesMaster'", "$top": 250, "$select": "id,subject,start,recurrence"},
        )
        ended = []
        today = now.isoformat()[:10]
        for e in events:
            rng = (e.get("recurrence") or {}).get("range", {})
            if rng.get("type") == "endDate":
                ed = rng.get("endDate", "")
                if ed and ed < today:
                    ended.append(e)
        print(f"  {len(ended)} recurring series ended (still in calendar)")
    except Exception as e:
        print(f"  (error: {e})")


def cmd_list_events(args):
    token = get_token(args.account)
    now = datetime.now(timezone.utc)
    start = args.from_date + "T00:00:00Z" if args.from_date else now.isoformat()
    end = args.to_date + "T23:59:59Z" if args.to_date else (now + timedelta(days=30)).isoformat()

    cal_id = args.calendar
    path = f"/me/calendars/{cal_id}/calendarView" if cal_id != "primary" else "/me/calendarView"
    events = graph_get_all(path, token, params={
        "startDateTime": start, "endDateTime": end, "$top": args.limit,
        "$select": "id,subject,start,end,type,recurrence",
    })
    print(f"{len(events)} events ({start[:10]} to {end[:10]}):\n")
    for e in events:
        s = e.get("start", {}).get("dateTime", "?")[:10]
        title = e.get("subject", "(no subject)")
        et = e.get("type", "")
        marker = " [recurring instance]" if et == "occurrence" else (" [recurring exception]" if et == "exception" else "")
        print(f"  {s}  {title[:55]:<55}{marker}")


def cmd_list_recurring(args):
    token = get_token(args.account)
    events = graph_get_all(
        "/me/events", token,
        params={"$filter": "type eq 'seriesMaster'", "$top": 250,
                "$select": "id,subject,start,recurrence"},
    )
    now_date = datetime.now(timezone.utc).isoformat()[:10]
    print(f"Recurring series ({len(events)} total):\n")
    for e in events:
        title = e.get("subject", "(no subject)")
        rng = (e.get("recurrence") or {}).get("range", {})
        rng_type = rng.get("type", "?")
        tag = ""
        if rng_type == "endDate":
            ed = rng.get("endDate", "?")
            tag = f"[ENDED {ed}]" if ed < now_date else f"[until {ed}]"
        elif rng_type == "noEnd":
            tag = "[no end]"
        elif rng_type == "numbered":
            tag = f"[{rng.get('numberOfOccurrences', '?')} occurrences]"
        else:
            tag = f"[{rng_type}]"
        start = e.get("start", {}).get("dateTime", "?")[:10]
        print(f"  {start}  {title[:55]:<55}  {tag}")
        print(f"      id: {e.get('id', '')[:60]}...")


def cmd_list_pending(args):
    token = get_token(args.account)
    now = datetime.now(timezone.utc).isoformat()
    events = graph_get_all(
        "/me/events", token,
        params={"$top": 200, "$select": "id,subject,start,responseStatus,organizer"},
    )
    pending = [
        e for e in events
        if e.get("responseStatus", {}).get("response") in ("notResponded", "none")
        and (e.get("start", {}).get("dateTime", "") >= now[:19])
    ]
    print(f"Pending invites ({len(pending)}):\n")
    for e in pending:
        s = e.get("start", {}).get("dateTime", "?")[:10]
        title = e.get("subject", "(no subject)")
        org = e.get("organizer", {}).get("emailAddress", {}).get("address", "?")
        print(f"  {s}  {title[:50]:<50}  from {org[:30]}")
        print(f"      id: {e.get('id', '')[:60]}...")


def cmd_delete_event(args):
    token = get_token(args.account)
    # Show what we're deleting
    try:
        e = graph_get(f"/me/events/{args.event_id}", token)
        title = e.get("subject", "(no subject)")
        et = e.get("type", "?")
        kind = "recurring SERIES" if et == "seriesMaster" else "event"
        print(f"Deleting {kind}: {title!r}")
        if args.dry_run:
            print("(dry-run; nothing deleted)")
            return
    except SystemExit:
        raise
    graph_delete(f"/me/events/{args.event_id}", token)
    print("Deleted.")


def main():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    shared = argparse.ArgumentParser(add_help=False)
    shared.add_argument("--account", choices=list(ACCOUNTS), required=True,
                        help="Which M365 account: utwente | agroworld")

    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("auth", parents=[shared], help="Run OAuth flow")
    sub.add_parser("audit", parents=[shared], help="Calendar state overview")
    sub.add_parser("list-calendars", parents=[shared], help="Calendars")
    sub.add_parser("list-recurring", parents=[shared], help="Recurring series (flags ENDED)")
    sub.add_parser("list-pending", parents=[shared], help="Pending invites")

    le = sub.add_parser("list-events", parents=[shared], help="Events in a date range")
    le.add_argument("--calendar", default="primary", help="Calendar ID (default: primary)")
    le.add_argument("--from", dest="from_date", help="YYYY-MM-DD")
    le.add_argument("--to", dest="to_date", help="YYYY-MM-DD")
    le.add_argument("--limit", type=int, default=100)

    de = sub.add_parser("delete-event", parents=[shared], help="Delete event by ID (recurring → series)")
    de.add_argument("--id", dest="event_id", required=True)
    de.add_argument("--dry-run", action="store_true")

    args = p.parse_args()
    handlers = {
        "auth":           cmd_auth,
        "audit":          cmd_audit,
        "list-calendars": cmd_list_calendars,
        "list-events":    cmd_list_events,
        "list-recurring": cmd_list_recurring,
        "list-pending":   cmd_list_pending,
        "delete-event":   cmd_delete_event,
    }
    handlers[args.cmd](args)


if __name__ == "__main__":
    main()

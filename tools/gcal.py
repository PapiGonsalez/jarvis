#!/usr/bin/env python3
"""Calendar client for Jarvis. Auth + audit + cleanup helpers.

Read-only subcommands:
  auth            Run OAuth flow / refresh token. First-time use opens browser.
  audit           Calendar state: subscribed calendars, recent event counts, pending invites.
  list-calendars  All subscribed calendars with IDs and access metadata.
  list-events     Events in a date range (--calendar, --from, --to).
  list-recurring  Recurring event series across all calendars (flags ENDED ones).
  list-pending    Events awaiting your response across all calendars.

Destructive (added once we've audited):
  delete-event       --id X
  end-recurring      --id X --end-date YYYY-MM-DD
  decline-event      --id X
  unsubscribe-cal    --id X  (remove a subscribed calendar)

Examples:
  .venv/bin/python tools/gcal.py audit
  .venv/bin/python tools/gcal.py list-calendars
  .venv/bin/python tools/gcal.py list-recurring
  .venv/bin/python tools/gcal.py list-events --calendar primary --from 2026-05-01 --to 2026-06-01
"""
import argparse
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

ROOT = Path(__file__).resolve().parent.parent
CREDS_PATH = ROOT / ".local" / "credentials.json"

SCOPES = [
    "https://www.googleapis.com/auth/calendar",
]

# Each account gets its own token file. Add new accounts here.
ACCOUNTS = {
    "personal": "calendar-token-personal.json",   # adriangilbert26@gmail.com
    "work":     "calendar-token-work.json",       # adrian@voltlabs.eu
    "uni":      "calendar-token-uni.json",        # a.g.thereparambil@student.utwente.nl
}


def token_path(account: str) -> Path:
    if account not in ACCOUNTS:
        sys.exit(f"Unknown account {account!r}. Choices: {list(ACCOUNTS)}")
    return ROOT / ".local" / ACCOUNTS[account]


def get_service(account: str = "personal"):
    """Authenticated Calendar service for given account. Runs OAuth flow if no token."""
    tp = token_path(account)
    creds = None
    if tp.exists():
        creds = Credentials.from_authorized_user_file(str(tp), SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not CREDS_PATH.exists():
                sys.exit(
                    f"Missing OAuth credentials at {CREDS_PATH}.\n"
                    "Download from Google Cloud Console (see references/gmail-api.md)."
                )
            flow = InstalledAppFlow.from_client_secrets_file(str(CREDS_PATH), SCOPES)
            creds = flow.run_local_server(port=0)
        tp.parent.mkdir(parents=True, exist_ok=True)
        tp.write_text(creds.to_json())
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _fmt_event_time(e: dict) -> str:
    s = e.get("start", {})
    return s.get("dateTime", s.get("date", "?"))[:10]


def cmd_auth(args):
    svc = get_service(args.account)
    cal = svc.calendars().get(calendarId="primary").execute()
    print(f"Account:          {args.account}")
    print(f"Authenticated as: {cal.get('summary', cal.get('id'))}")
    print(f"Time zone:        {cal.get('timeZone', '?')}")
    print(f"Token saved to    {token_path(args.account)}")


def cmd_list_calendars(args):
    svc = get_service(args.account)
    cals = svc.calendarList().list().execute().get("items", [])
    cals.sort(key=lambda c: (not c.get("primary", False), c.get("summary", "")))
    print(f"Subscribed calendars ({len(cals)}):\n")
    for c in cals:
        primary = "(primary)" if c.get("primary") else ""
        access = c.get("accessRole", "—")
        selected = "✓" if c.get("selected", True) else " "
        print(f"  [{selected}] {c.get('summary', '?'):<45} role={access:<10} {primary}")
        print(f"      id:      {c.get('id')}")
        if c.get("description"):
            print(f"      desc:    {c.get('description')[:80]}")
        print()


def cmd_audit(args):
    svc = get_service(args.account)
    cals = svc.calendarList().list().execute().get("items", [])

    print("=== Calendar audit ===\n")
    print(f"Subscribed calendars: {len(cals)}")
    print()

    now = datetime.now(timezone.utc)
    time_min_30d = (now - timedelta(days=30)).isoformat()
    time_max_30d = (now + timedelta(days=30)).isoformat()
    time_min_1y = (now - timedelta(days=365)).isoformat()

    print("Per-calendar event counts:\n")
    print(f"  {'Calendar':<45}  {'last 30d':>10}  {'next 30d':>10}  {'last 1y':>10}")
    print(f"  {'-'*45}  {'-'*10}  {'-'*10}  {'-'*10}")
    for c in cals:
        cid = c["id"]
        try:
            past = svc.events().list(
                calendarId=cid, timeMin=time_min_30d, timeMax=now.isoformat(),
                maxResults=2500, showDeleted=False
            ).execute().get("items", [])
            future = svc.events().list(
                calendarId=cid, timeMin=now.isoformat(), timeMax=time_max_30d,
                maxResults=2500, showDeleted=False
            ).execute().get("items", [])
            year = svc.events().list(
                calendarId=cid, timeMin=time_min_1y, timeMax=now.isoformat(),
                maxResults=2500, showDeleted=False
            ).execute().get("items", [])
            primary_marker = " (primary)" if c.get("primary") else ""
            name = c.get("summary", "?") + primary_marker
            print(f"  {name[:45]:<45}  {len(past):>10}  {len(future):>10}  {len(year):>10}")
        except HttpError as e:
            print(f"  {c.get('summary', '?'):<45}  (error: {e.status_code if hasattr(e, 'status_code') else '?'})")

    # Pending invites
    print("\nPending invites (your response = needsAction, future events):")
    pending_count = 0
    for c in cals:
        try:
            events = svc.events().list(
                calendarId=c["id"], timeMin=now.isoformat(), maxResults=100
            ).execute().get("items", [])
            for e in events:
                attendees = e.get("attendees", [])
                for a in attendees:
                    if a.get("self") and a.get("responseStatus") == "needsAction":
                        pending_count += 1
                        break
        except HttpError:
            pass
    print(f"  {pending_count} pending across all calendars")
    print(f"  (run 'list-pending' to see them)")

    # Recurring with ended dates
    print("\nRecurring series — count of ENDED ones (UNTIL date in past):")
    ended_count = 0
    for c in cals:
        try:
            events = svc.events().list(
                calendarId=c["id"], singleEvents=False, showDeleted=False, maxResults=500
            ).execute().get("items", [])
            for e in events:
                rec = e.get("recurrence", [])
                until = next((r for r in rec if "UNTIL=" in r), None)
                if until:
                    until_str = until.split("UNTIL=")[1][:8]
                    try:
                        until_dt = datetime.strptime(until_str, "%Y%m%d").replace(tzinfo=timezone.utc)
                        if until_dt < now:
                            ended_count += 1
                    except ValueError:
                        pass
        except HttpError:
            pass
    print(f"  {ended_count} recurring series ended (still listed in calendar)")
    print(f"  (run 'list-recurring' to see them)")


def cmd_list_events(args):
    svc = get_service(args.account)
    now = datetime.now(timezone.utc)
    time_min = args.from_date + "T00:00:00Z" if args.from_date else now.isoformat()
    time_max = args.to_date + "T23:59:59Z" if args.to_date else (now + timedelta(days=30)).isoformat()

    resp = svc.events().list(
        calendarId=args.calendar,
        timeMin=time_min,
        timeMax=time_max,
        maxResults=args.limit,
        singleEvents=not args.recurring_as_series,
        orderBy="startTime" if not args.recurring_as_series else None,
    ).execute()
    events = resp.get("items", [])
    print(f"{len(events)} events in calendar={args.calendar} ({time_min[:10]} to {time_max[:10]}):\n")
    for e in events:
        start = _fmt_event_time(e)
        rec = " [recurring]" if e.get("recurrence") else ""
        title = e.get("summary", "(no title)")
        print(f"  {start}  {title[:60]:<60}{rec}")


def cmd_list_recurring(args):
    svc = get_service(args.account)
    cals = svc.calendarList().list().execute().get("items", [])
    now = datetime.now(timezone.utc)

    print("Recurring event series across all calendars (flagged if ENDED):\n")
    total = 0
    for c in cals:
        try:
            events = svc.events().list(
                calendarId=c["id"], singleEvents=False, showDeleted=False, maxResults=500
            ).execute().get("items", [])
            recurring = [e for e in events if e.get("recurrence")]
            if not recurring:
                continue
            print(f"  -- {c.get('summary', '?')} ({len(recurring)} series) --")
            for e in recurring:
                summary = e.get("summary", "(no title)")
                rec = e.get("recurrence", [])
                until = next((r for r in rec if "UNTIL=" in r), None)
                tag = "[no end]"
                if until:
                    until_str = until.split("UNTIL=")[1][:8]
                    try:
                        until_dt = datetime.strptime(until_str, "%Y%m%d").replace(tzinfo=timezone.utc)
                        if until_dt < now:
                            tag = f"[ENDED {until_str[:4]}-{until_str[4:6]}-{until_str[6:8]}]"
                        else:
                            tag = f"[until {until_str[:4]}-{until_str[4:6]}-{until_str[6:8]}]"
                    except ValueError:
                        tag = "[bad date]"
                start = _fmt_event_time(e)
                print(f"    {start}  {summary[:55]:<55}  {tag}")
                print(f"        id: {e['id']}")
                total += 1
            print()
        except HttpError:
            pass
    print(f"Total: {total} recurring series.")


def cmd_list_pending(args):
    svc = get_service(args.account)
    cals = svc.calendarList().list().execute().get("items", [])
    now = datetime.now(timezone.utc)

    print("Events awaiting your response (future, status=needsAction):\n")
    total = 0
    for c in cals:
        try:
            events = svc.events().list(
                calendarId=c["id"], timeMin=now.isoformat(), maxResults=200
            ).execute().get("items", [])
            pending = []
            for e in events:
                for a in e.get("attendees", []):
                    if a.get("self") and a.get("responseStatus") == "needsAction":
                        pending.append(e)
                        break
            if not pending:
                continue
            print(f"  -- {c.get('summary', '?')} ({len(pending)} pending) --")
            for e in pending:
                start = _fmt_event_time(e)
                organizer = e.get("organizer", {}).get("email", "?")
                title = e.get("summary", "(no title)")
                print(f"    {start}  {title[:50]:<50}  from {organizer[:30]}")
                print(f"        id: {e['id']}")
                total += 1
            print()
        except HttpError:
            pass
    print(f"Total: {total} pending invites.")


def cmd_delete_event(args):
    """Delete an event by ID. For recurring, this deletes the entire series."""
    svc = get_service(args.account)
    cal_id = args.calendar
    event_id = args.event_id
    # Show what we're deleting
    try:
        evt = svc.events().get(calendarId=cal_id, eventId=event_id).execute()
        title = evt.get("summary", "(no title)")
        recurring = bool(evt.get("recurrence"))
        kind = "recurring SERIES" if recurring else "event"
        print(f"Deleting {kind}: {title!r}  (id={event_id})")
        if args.dry_run:
            print("(dry-run; nothing deleted)")
            return
    except HttpError as e:
        sys.exit(f"Event not found or inaccessible: {e}")
    svc.events().delete(calendarId=cal_id, eventId=event_id).execute()
    print(f"Deleted.")


def get_upcoming(account: str, t_min: datetime, t_max: datetime) -> list[dict]:
    """Return normalized upcoming events from a Google account in [t_min, t_max).

    Iterates all subscribed calendars; recurring events expanded to instances.
    Used by apps/api/ — keep this signature stable or update the API endpoint.
    """
    svc = get_service(account)
    cals = svc.calendarList().list().execute().get("items", [])
    events: list[dict] = []
    for c in cals:
        try:
            resp = svc.events().list(
                calendarId=c["id"],
                timeMin=t_min.isoformat(),
                timeMax=t_max.isoformat(),
                singleEvents=True,
                orderBy="startTime",
                maxResults=250,
            ).execute()
        except HttpError:
            continue
        for e in resp.get("items", []):
            events.append(_normalize_gcal_event(e, account))
    return events


def _normalize_gcal_event(e: dict, account: str) -> dict:
    s = e.get("start") or {}
    en = e.get("end") or {}
    all_day = "date" in s and "dateTime" not in s
    start = s.get("dateTime") or s.get("date")
    end = en.get("dateTime") or en.get("date")

    status = "accepted"
    for a in e.get("attendees") or []:
        if a.get("self"):
            status = a.get("responseStatus", "accepted")
            break

    org = e.get("organizer") or {}
    return {
        "source": account,
        "id": e.get("id", ""),
        "title": e.get("summary") or "(no title)",
        "start": start,
        "end": end,
        "all_day": all_day,
        "status": status,
        "link": e.get("htmlLink"),
        "description": e.get("description"),
        "location": e.get("location"),
        "organizer": (
            {"email": org.get("email"), "name": org.get("displayName")}
            if org else None
        ),
    }


def main():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    # Shared --account flag for all subcommands
    shared = argparse.ArgumentParser(add_help=False)
    shared.add_argument("--account", choices=list(ACCOUNTS), default="personal",
                        help="Which Google account to use (default: personal)")

    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("auth", parents=[shared], help="Run OAuth flow / refresh token")
    sub.add_parser("audit", parents=[shared], help="Calendar state overview")
    sub.add_parser("list-calendars", parents=[shared], help="Subscribed calendars")
    sub.add_parser("list-recurring", parents=[shared], help="Recurring event series (flags ENDED)")
    sub.add_parser("list-pending", parents=[shared], help="Pending invites")

    de = sub.add_parser("delete-event", parents=[shared], help="Delete an event (or entire recurring series) by ID")
    de.add_argument("--calendar", default="primary", help="Calendar ID (default: primary)")
    de.add_argument("--id", dest="event_id", required=True, help="Event ID")
    de.add_argument("--dry-run", action="store_true")

    le = sub.add_parser("list-events", parents=[shared], help="Events in a date range")
    le.add_argument("--calendar", default="primary", help="Calendar ID (default: primary)")
    le.add_argument("--from", dest="from_date", help="YYYY-MM-DD")
    le.add_argument("--to", dest="to_date", help="YYYY-MM-DD")
    le.add_argument("--limit", type=int, default=100)
    le.add_argument("--recurring-as-series", action="store_true",
                    help="Show recurring as the master series (default expands to instances)")

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

    try:
        handlers[args.cmd](args)
    except HttpError as e:
        print(f"Calendar API error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

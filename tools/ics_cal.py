#!/usr/bin/env python3
"""Read-only calendar reader via published ICS feeds.

Use when OAuth-based access (Google Calendar / Microsoft Graph) is blocked or
unavailable. Each ICS feed is a public/secret URL that returns iCalendar data.

Subcommands:
  add-feed     Register a feed: --name X --url Y
  remove-feed  Drop a feed by name
  list-feeds   Show registered feeds
  audit        Per-feed: event counts (last 30d, next 30d, last 1y), recurring count
  list-events  Events for one feed in a date range

Examples:
  .venv/bin/python tools/ics_cal.py add-feed --name utwente --url "https://outlook.office365.com/owa/calendar/.../calendar.ics"
  .venv/bin/python tools/ics_cal.py list-feeds
  .venv/bin/python tools/ics_cal.py audit --name utwente
  .venv/bin/python tools/ics_cal.py list-events --name agroworld --from 2026-05-01 --to 2026-06-01
"""
import argparse
import json
import sys
from datetime import datetime, timedelta, timezone, date
from pathlib import Path

import recurring_ical_events
import requests
from icalendar import Calendar

ROOT = Path(__file__).resolve().parent.parent
FEEDS_PATH = ROOT / ".local" / "ics-feeds.json"


def load_feeds() -> dict:
    if not FEEDS_PATH.exists():
        return {}
    return json.loads(FEEDS_PATH.read_text())


def save_feeds(feeds: dict) -> None:
    FEEDS_PATH.parent.mkdir(parents=True, exist_ok=True)
    FEEDS_PATH.write_text(json.dumps(feeds, indent=2))


def fetch_ics(url: str) -> Calendar:
    r = requests.get(url, timeout=30)
    if not r.ok:
        sys.exit(f"Failed to fetch ICS ({r.status_code}): {url}")
    return Calendar.from_ical(r.content)


def event_start(comp) -> datetime | date | None:
    s = comp.get("DTSTART")
    if s is None:
        return None
    return s.dt


def to_aware(d) -> datetime:
    if isinstance(d, datetime):
        return d if d.tzinfo else d.replace(tzinfo=timezone.utc)
    if isinstance(d, date):
        return datetime(d.year, d.month, d.day, tzinfo=timezone.utc)
    return datetime.now(timezone.utc)


def cmd_add_feed(args):
    feeds = load_feeds()
    if args.name in feeds and not args.overwrite:
        sys.exit(f"Feed {args.name!r} already exists. Use --overwrite to replace.")
    feeds[args.name] = args.url
    save_feeds(feeds)
    print(f"Saved feed {args.name!r} ({len(feeds)} total).")


def cmd_remove_feed(args):
    feeds = load_feeds()
    if args.name not in feeds:
        sys.exit(f"Feed {args.name!r} not found. Existing: {list(feeds)}")
    del feeds[args.name]
    save_feeds(feeds)
    print(f"Removed feed {args.name!r} ({len(feeds)} remaining).")


def cmd_list_feeds(args):
    feeds = load_feeds()
    if not feeds:
        print("(no feeds registered)")
        return
    print(f"Registered ICS feeds ({len(feeds)}):\n")
    for name, url in feeds.items():
        masked = url[:60] + "..." if len(url) > 60 else url
        print(f"  {name:<20}  {masked}")


def _events_in_range(cal: Calendar, t_min: datetime, t_max: datetime) -> list:
    """Return component events whose start falls in [t_min, t_max). Recurring
    masters counted once if their first occurrence is in range; recurring
    instances expansion is left to ICS readers in clients (we count master only)."""
    out = []
    for c in cal.walk("VEVENT"):
        s = event_start(c)
        if s is None:
            continue
        sd = to_aware(s)
        if t_min <= sd < t_max:
            out.append(c)
    return out


def cmd_audit(args):
    feeds = load_feeds()
    target = {args.name: feeds[args.name]} if args.name else feeds
    if not target:
        sys.exit("No feeds. Add one with: ics_cal.py add-feed --name X --url Y")

    now = datetime.now(timezone.utc)
    last_30 = now - timedelta(days=30)
    next_30 = now + timedelta(days=30)
    last_1y = now - timedelta(days=365)

    print(f"=== ICS audit ({len(target)} feed(s)) ===\n")
    print(f"  {'Feed':<20}  {'last 30d':>10}  {'next 30d':>10}  {'last 1y':>10}  {'recurring':>10}  {'total':>10}")
    print(f"  {'-'*20}  {'-'*10}  {'-'*10}  {'-'*10}  {'-'*10}  {'-'*10}")
    for name, url in target.items():
        try:
            cal = fetch_ics(url)
            past = len(_events_in_range(cal, last_30, now))
            fut = len(_events_in_range(cal, now, next_30))
            year = len(_events_in_range(cal, last_1y, now))
            recurring = sum(1 for c in cal.walk("VEVENT") if c.get("RRULE"))
            total = sum(1 for _ in cal.walk("VEVENT"))
            print(f"  {name:<20}  {past:>10}  {fut:>10}  {year:>10}  {recurring:>10}  {total:>10}")
        except Exception as e:
            print(f"  {name:<20}  (error: {type(e).__name__}: {e})")


def cmd_list_events(args):
    feeds = load_feeds()
    if args.name not in feeds:
        sys.exit(f"Feed {args.name!r} not found. Run 'list-feeds' to see options.")
    cal = fetch_ics(feeds[args.name])

    now = datetime.now(timezone.utc)
    t_min = datetime.fromisoformat(args.from_date + "T00:00:00+00:00") if args.from_date else now
    t_max = datetime.fromisoformat(args.to_date + "T23:59:59+00:00") if args.to_date else (now + timedelta(days=30))

    events = _events_in_range(cal, t_min, t_max)
    print(f"{len(events)} events in feed={args.name} ({t_min.date()} to {t_max.date()}):\n")
    events.sort(key=lambda c: to_aware(event_start(c)))
    for c in events[:args.limit]:
        s = to_aware(event_start(c))
        title = str(c.get("SUMMARY", "(no title)"))
        recurrence = " [recurring]" if c.get("RRULE") else ""
        print(f"  {s.strftime('%Y-%m-%d %H:%M')}  {title[:55]:<55}{recurrence}")


def get_upcoming(feed_name: str, t_min: datetime, t_max: datetime) -> list[dict]:
    """Return normalized upcoming events from a registered ICS feed in [t_min, t_max).

    Recurring series are expanded into actual instances within the window
    (uses recurring_ical_events). ICS feeds are read-only, so every event
    comes back with status="accepted". Used by apps/api/ — keep this
    signature stable or update the API endpoint.
    """
    feeds = load_feeds()
    if feed_name not in feeds:
        return []
    cal = fetch_ics(feeds[feed_name])
    out: list[dict] = []
    for c in recurring_ical_events.of(cal).between(t_min, t_max):
        s = c.get("DTSTART")
        if s is None:
            continue
        out.append(_normalize_ics_event(c, feed_name, s.dt))
    return out


def _normalize_ics_event(c, feed_name: str, sd_raw) -> dict:
    e = c.get("DTEND")
    ed_raw = e.dt if e is not None else sd_raw
    all_day = isinstance(sd_raw, date) and not isinstance(sd_raw, datetime)

    def _to_iso(d):
        if isinstance(d, datetime):
            return (d if d.tzinfo else d.replace(tzinfo=timezone.utc)).isoformat()
        if isinstance(d, date):
            return d.isoformat()
        return None

    def _str_or_none(prop: str):
        v = c.get(prop)
        return str(v) if v else None

    uid = _str_or_none("UID") or ""
    start_iso = _to_iso(sd_raw) or ""
    return {
        "source": feed_name,
        "id": f"{uid}@{start_iso}" if uid else start_iso,
        "title": _str_or_none("SUMMARY") or "(no title)",
        "start": start_iso or None,
        "end": _to_iso(ed_raw),
        "all_day": all_day,
        "status": "accepted",
        "link": _str_or_none("URL"),
        "description": _str_or_none("DESCRIPTION"),
        "location": _str_or_none("LOCATION"),
        "organizer": None,
    }


def main():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    af = sub.add_parser("add-feed", help="Register an ICS feed by name")
    af.add_argument("--name", required=True)
    af.add_argument("--url", required=True)
    af.add_argument("--overwrite", action="store_true")

    rf = sub.add_parser("remove-feed", help="Drop a feed by name")
    rf.add_argument("--name", required=True)

    sub.add_parser("list-feeds", help="List registered feeds")

    au = sub.add_parser("audit", help="Audit one or all feeds")
    au.add_argument("--name", help="Just this feed (default: all)")

    le = sub.add_parser("list-events", help="Events from a feed in a date range")
    le.add_argument("--name", required=True)
    le.add_argument("--from", dest="from_date", help="YYYY-MM-DD")
    le.add_argument("--to", dest="to_date", help="YYYY-MM-DD")
    le.add_argument("--limit", type=int, default=100)

    args = p.parse_args()
    handlers = {
        "add-feed":    cmd_add_feed,
        "remove-feed": cmd_remove_feed,
        "list-feeds":  cmd_list_feeds,
        "audit":       cmd_audit,
        "list-events": cmd_list_events,
    }
    handlers[args.cmd](args)


if __name__ == "__main__":
    main()

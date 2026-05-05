#!/usr/bin/env python3
"""Gmail client for Jarvis. Auth + cleanup ops.

Subcommands:
  auth          Run OAuth flow / refresh token. First-time use opens browser.
  audit         Inbox state: counts, buckets, top senders.
  top-senders   List top senders by recent inbox volume.
  archive       Archive messages matching a Gmail query.
  mark-read     Mark matching messages as read.
  apply-label   Apply label to matching, optionally also archive.
  create-filter Create a persistent Gmail filter (auto-applies on new mail).

Examples:
  .venv/bin/python tools/gmail.py audit
  .venv/bin/python tools/gmail.py archive --query "is:unread older_than:6m" --dry-run
  .venv/bin/python tools/gmail.py archive --query "is:unread older_than:6m"
  .venv/bin/python tools/gmail.py apply-label --query "from:newsletter@x.com" --label "Newsletters/X" --archive

Always run with --dry-run first for any bulk modify.
"""
import argparse
import sys
from collections import Counter
from pathlib import Path
from typing import Iterable

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

ROOT = Path(__file__).resolve().parent.parent
CREDS_PATH = ROOT / ".local" / "credentials.json"
TOKEN_PATH = ROOT / ".local" / "token.json"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.modify",
    "https://www.googleapis.com/auth/gmail.settings.basic",
]


def get_service():
    """Authenticated Gmail service. Runs OAuth flow if no token."""
    creds = None
    if TOKEN_PATH.exists():
        creds = Credentials.from_authorized_user_file(str(TOKEN_PATH), SCOPES)
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
        TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
        TOKEN_PATH.write_text(creds.to_json())
    return build("gmail", "v1", credentials=creds, cache_discovery=False)


def list_message_ids(svc, query: str, max_results: int | None = None) -> list[str]:
    """All message IDs matching query (paginated). max_results caps total."""
    ids: list[str] = []
    page_token = None
    while True:
        resp = svc.users().messages().list(
            userId="me", q=query, maxResults=500, pageToken=page_token
        ).execute()
        ids.extend(m["id"] for m in resp.get("messages", []))
        if max_results and len(ids) >= max_results:
            return ids[:max_results]
        page_token = resp.get("nextPageToken")
        if not page_token:
            return ids


def fetch_metadata_batch(svc, ids: Iterable[str], headers: list[str]) -> list[dict]:
    """Batch-fetch metadata for many IDs. Much faster than serial gets."""
    results: dict[str, dict] = {}

    def cb(req_id, response, exception):
        if exception is None:
            results[req_id] = response

    ids_list = list(ids)
    BATCH = 50
    for i in range(0, len(ids_list), BATCH):
        batch = svc.new_batch_http_request(callback=cb)
        for j, msg_id in enumerate(ids_list[i:i + BATCH]):
            batch.add(
                svc.users().messages().get(
                    userId="me", id=msg_id,
                    format="metadata", metadataHeaders=headers,
                ),
                request_id=str(i + j),
            )
        batch.execute()
    return [results[k] for k in sorted(results, key=int) if k in results]


def header(msg: dict, name: str) -> str:
    for h in msg.get("payload", {}).get("headers", []):
        if h["name"].lower() == name.lower():
            return h["value"]
    return ""


def estimate_count(svc, query: str) -> int:
    """Cheap (~one API call) estimated count. Caps at 201 for any > 200 — use exact_count for accuracy."""
    resp = svc.users().messages().list(userId="me", q=query, maxResults=1).execute()
    return resp.get("resultSizeEstimate", 0)


# Map common queries to system-label IDs for exact counts via labels.get
SYSTEM_LABEL_FOR_QUERY = {
    "in:inbox":             "INBOX",
    "is:unread":            "UNREAD",
    "is:starred":           "STARRED",
    "is:important":         "IMPORTANT",
    "in:sent":              "SENT",
    "in:trash":             "TRASH",
    "in:spam":              "SPAM",
    "category:promotions":  "CATEGORY_PROMOTIONS",
    "category:social":      "CATEGORY_SOCIAL",
    "category:updates":     "CATEGORY_UPDATES",
    "category:forums":      "CATEGORY_FORUMS",
    "category:personal":    "CATEGORY_PERSONAL",
}


def label_count(svc, label_id: str) -> tuple[int, int]:
    """Exact (total, unread) message counts for a system label."""
    info = svc.users().labels().get(userId="me", id=label_id).execute()
    return int(info.get("messagesTotal", 0)), int(info.get("messagesUnread", 0))


def exact_count(svc, query: str, cap: int = 50000) -> int:
    """Exact count by paginating. Returns cap if exceeded (sentinel)."""
    total = 0
    page_token = None
    while True:
        resp = svc.users().messages().list(
            userId="me", q=query, maxResults=500, pageToken=page_token
        ).execute()
        total += len(resp.get("messages", []))
        if total >= cap:
            return cap
        page_token = resp.get("nextPageToken")
        if not page_token:
            return total


def smart_count(svc, query: str) -> int:
    """Use label metadata if query maps; otherwise paginate."""
    label = SYSTEM_LABEL_FOR_QUERY.get(query)
    if label:
        total, _ = label_count(svc, label)
        return total
    return exact_count(svc, query)


def get_or_create_label(svc, name: str) -> str:
    labels = svc.users().labels().list(userId="me").execute().get("labels", [])
    for l in labels:
        if l["name"] == name:
            return l["id"]
    created = svc.users().labels().create(
        userId="me",
        body={
            "name": name,
            "labelListVisibility": "labelShow",
            "messageListVisibility": "show",
        },
    ).execute()
    return created["id"]


def cmd_auth(args):
    svc = get_service()
    profile = svc.users().getProfile(userId="me").execute()
    print(f"Authenticated as {profile['emailAddress']}")
    print(f"Token saved to {TOKEN_PATH}")


def cmd_audit(args):
    svc = get_service()
    profile = svc.users().getProfile(userId="me").execute()
    print(f"Email:           {profile['emailAddress']}")
    print(f"Total messages:  {profile.get('messagesTotal', 0):,}")
    print(f"Total threads:   {profile.get('threadsTotal', 0):,}")
    print()

    buckets = [
        ("Inbox total",          "in:inbox"),
        ("Unread",               "is:unread"),
        ("Unread > 6 months",    "is:unread older_than:6m"),
        ("Unread > 1 month",     "is:unread older_than:1m"),
        ("Promotions tab",       "category:promotions"),
        ("Social tab",           "category:social"),
        ("Updates tab",          "category:updates"),
        ("Forums tab",           "category:forums"),
    ]
    print("Buckets:")
    for label, q in buckets:
        n = smart_count(svc, q)
        marker = "+" if n >= 50000 else " "
        print(f"  {n:>8,}{marker} {label}")
    print()

    sample = args.sample
    print(f"Top 10 senders (sample of {sample} recent inbox messages):")
    ids = list_message_ids(svc, "in:inbox", max_results=sample)
    msgs = fetch_metadata_batch(svc, ids, ["From"])
    senders = Counter(header(m, "From") for m in msgs)
    for sender, count in senders.most_common(10):
        print(f"  {count:>4}  {sender}")


def cmd_preview(args):
    """Show recent messages matching a query: From, Subject, Date."""
    svc = get_service()
    ids = list_message_ids(svc, args.query, max_results=args.limit)
    if not ids:
        print("(no messages match)")
        return
    msgs = fetch_metadata_batch(svc, ids, ["From", "Subject", "Date"])
    for i, m in enumerate(msgs, 1):
        print(f"--- {i:>2}. {header(m, 'Date')}")
        print(f"     From: {header(m, 'From')}")
        print(f"     Subj: {header(m, 'Subject')}")


def cmd_top_senders(args):
    svc = get_service()
    ids = list_message_ids(svc, args.query, max_results=args.sample)
    msgs = fetch_metadata_batch(svc, ids, ["From"])
    senders = Counter(header(m, "From") for m in msgs)
    for sender, count in senders.most_common(args.limit):
        print(f"{count:>5}  {sender}")


def _bulk_modify(svc, ids: list[str], add: list[str], remove: list[str], action_label: str):
    if not ids:
        print("(no messages)")
        return
    BATCH = 1000
    for i in range(0, len(ids), BATCH):
        body = {"ids": ids[i:i + BATCH]}
        if add:
            body["addLabelIds"] = add
        if remove:
            body["removeLabelIds"] = remove
        svc.users().messages().batchModify(userId="me", body=body).execute()
        print(f"  {action_label} {min(i + BATCH, len(ids)):,}/{len(ids):,}")
    print("Done.")


def cmd_archive(args):
    svc = get_service()
    ids = list_message_ids(svc, args.query)
    print(f"Query:    {args.query}")
    print(f"Matching: {len(ids):,}")
    if args.dry_run:
        print("(dry-run; nothing modified)")
        return
    _bulk_modify(svc, ids, add=[], remove=["INBOX"], action_label="archived")


def cmd_mark_read(args):
    svc = get_service()
    ids = list_message_ids(svc, args.query)
    print(f"Query:    {args.query}")
    print(f"Matching: {len(ids):,}")
    if args.dry_run:
        print("(dry-run; nothing modified)")
        return
    _bulk_modify(svc, ids, add=[], remove=["UNREAD"], action_label="marked read")


def cmd_apply_label(args):
    svc = get_service()
    label_id = get_or_create_label(svc, args.label)
    ids = list_message_ids(svc, args.query)
    print(f"Query:    {args.query}")
    print(f"Label:    {args.label} (id={label_id})")
    print(f"Archive:  {args.archive}")
    print(f"Matching: {len(ids):,}")
    if args.dry_run:
        print("(dry-run; nothing modified)")
        return
    remove = ["INBOX"] if args.archive else []
    _bulk_modify(svc, ids, add=[label_id], remove=remove, action_label="labeled")


def _find_label(svc, name: str) -> dict:
    labels = svc.users().labels().list(userId="me").execute().get("labels", [])
    target = next((l for l in labels if l["name"] == name), None)
    if not target:
        sys.exit(f"Label not found: {name!r}")
    return target


def cmd_list_labels(args):
    """List all labels with counts and colors."""
    svc = get_service()
    labels = svc.users().labels().list(userId="me").execute().get("labels", [])
    full = [svc.users().labels().get(userId="me", id=l["id"]).execute() for l in labels]
    system = sorted([l for l in full if l.get("type") == "system"], key=lambda x: x["name"])
    user = sorted([l for l in full if l.get("type") == "user"], key=lambda x: x["name"])

    print(f"=== System ({len(system)}) ===")
    for l in system:
        t, u = l.get("messagesTotal", 0), l.get("messagesUnread", 0)
        print(f"  {l['name']:<30}  {t:>7,} total  {u:>7,} unread")
    print(f"\n=== User ({len(user)}) ===")
    for l in user:
        t, u = l.get("messagesTotal", 0), l.get("messagesUnread", 0)
        c = l.get("color", {})
        bg = c.get("backgroundColor", "—")
        print(f"  {l['name']:<40}  {t:>6,} total  {u:>6,} unread  bg={bg}")


def cmd_delete_label(args):
    svc = get_service()
    target = _find_label(svc, args.label)
    if not args.force:
        n = target.get("messagesTotal", 0)
        if n > 0:
            sys.exit(f"Label {args.label!r} has {n} messages. Use --force to delete anyway (messages stay; just lose the label).")
    svc.users().labels().delete(userId="me", id=target["id"]).execute()
    print(f"Deleted label: {args.label}")


def cmd_rename_label(args):
    svc = get_service()
    target = _find_label(svc, args.from_name)
    svc.users().labels().patch(
        userId="me", id=target["id"], body={"name": args.to_name}
    ).execute()
    print(f"Renamed: {args.from_name} -> {args.to_name}")


def cmd_set_label_color(args):
    svc = get_service()
    target = _find_label(svc, args.label)
    body = {"color": {"backgroundColor": args.bg, "textColor": args.text}}
    svc.users().labels().patch(userId="me", id=target["id"], body=body).execute()
    print(f"Color set on '{args.label}': bg={args.bg} text={args.text}")


def cmd_create_filter(args):
    svc = get_service()
    add_ids: list[str] = []
    remove_ids: list[str] = []
    if args.label:
        add_ids.append(get_or_create_label(svc, args.label))
    if args.archive:
        remove_ids.append("INBOX")
    if args.mark_read:
        remove_ids.append("UNREAD")
    body = {
        "criteria": {"from": args.sender_from},
        "action": {
            "addLabelIds": add_ids,
            "removeLabelIds": remove_ids,
        },
    }
    res = svc.users().settings().filters().create(userId="me", body=body).execute()
    print(f"Filter created: id={res.get('id')}")
    print(f"  from:       {args.sender_from}")
    if args.label:     print(f"  label:      {args.label}")
    if args.archive:   print(f"  archive:    yes")
    if args.mark_read: print(f"  mark read:  yes")


def main():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("auth", help="Run OAuth flow / refresh token")

    audit = sub.add_parser("audit", help="Inbox state + top senders")
    audit.add_argument("--sample", type=int, default=300,
                       help="Recent inbox messages to sample for top senders")

    pv = sub.add_parser("preview", help="Show From/Subject/Date for matching messages")
    pv.add_argument("--query", required=True)
    pv.add_argument("--limit", type=int, default=10)

    ts = sub.add_parser("top-senders", help="Top senders by recent inbox volume")
    ts.add_argument("--query", default="in:inbox")
    ts.add_argument("--sample", type=int, default=500)
    ts.add_argument("--limit", type=int, default=20)

    arc = sub.add_parser("archive", help="Archive messages matching query")
    arc.add_argument("--query", required=True)
    arc.add_argument("--dry-run", action="store_true")

    mr = sub.add_parser("mark-read", help="Mark matching as read")
    mr.add_argument("--query", required=True)
    mr.add_argument("--dry-run", action="store_true")

    al = sub.add_parser("apply-label", help="Apply label to matching")
    al.add_argument("--query", required=True)
    al.add_argument("--label", required=True)
    al.add_argument("--archive", action="store_true")
    al.add_argument("--dry-run", action="store_true")

    sub.add_parser("list-labels", help="List all labels with counts and colors")

    dl = sub.add_parser("delete-label", help="Delete a user label by name (messages stay)")
    dl.add_argument("--label", required=True)
    dl.add_argument("--force", action="store_true",
                    help="Delete even if label has messages")

    rn = sub.add_parser("rename-label", help="Rename a label by name")
    rn.add_argument("--from", dest="from_name", required=True)
    rn.add_argument("--to", dest="to_name", required=True)

    sc = sub.add_parser("set-label-color", help="Set background and text colors on a label")
    sc.add_argument("--label", required=True)
    sc.add_argument("--bg", required=True, help="Background hex (e.g. #16a766)")
    sc.add_argument("--text", required=True, help="Text hex (e.g. #ffffff)")

    cf = sub.add_parser("create-filter", help="Persistent Gmail filter")
    cf.add_argument("--from", dest="sender_from", required=True,
                    help="Match: --from 'x@y.com' or '*@y.com'")
    cf.add_argument("--label", default=None)
    cf.add_argument("--archive", action="store_true")
    cf.add_argument("--mark-read", action="store_true")

    args = p.parse_args()

    handlers = {
        "auth":          cmd_auth,
        "audit":         cmd_audit,
        "preview":       cmd_preview,
        "top-senders":   cmd_top_senders,
        "archive":       cmd_archive,
        "mark-read":     cmd_mark_read,
        "apply-label":   cmd_apply_label,
        "create-filter": cmd_create_filter,
        "list-labels":   cmd_list_labels,
        "delete-label":  cmd_delete_label,
        "rename-label":  cmd_rename_label,
        "set-label-color": cmd_set_label_color,
    }
    try:
        handlers[args.cmd](args)
    except HttpError as e:
        print(f"Gmail API error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Render extracted task JSONL into a daily markdown view.

Reads tasks/YYYY-MM-DD.jsonl, writes tasks/YYYY-MM-DD.md.
Idempotent — safe to re-render any time.

Expected JSONL record schema (one task per line):
{
  "id":           "task_<short hash>",
  "extracted_at": "ISO timestamp",
  "source": {
    "account":       "personal" | "work",
    "account_email": "...",
    "message_id":    "...",
    "from":          "...",
    "subject":       "...",
    "date":          "...",
    "gmail_url":     "..."
  },
  "task":       "<one-line task>",
  "due":        "YYYY-MM-DD" | null,
  "priority":   "high" | "medium" | "low",
  "confidence": 0.0-1.0,
  "notes":      "<optional rationale>" | null,
  "status":     "open" | "done" | "deferred"
}

Examples:
  .venv/bin/python tools/render_tasks.py tasks/2026-05-05.jsonl
  .venv/bin/python tools/render_tasks.py tasks/2026-05-05.jsonl --output /tmp/preview.md
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


PRIORITY_LABEL = {
    "high":   "High priority",
    "medium": "Medium priority",
    "low":    "Low / interpretive",
}


def render(records: list[dict], date_str: str) -> str:
    by_priority: dict[str, list[dict]] = {"high": [], "medium": [], "low": []}
    for r in records:
        prio = (r.get("priority") or "low").lower()
        if prio not in by_priority:
            prio = "low"
        by_priority[prio].append(r)

    accounts = sorted({r.get("source", {}).get("account", "?") for r in records})
    extracted_ats = [r.get("extracted_at") for r in records if r.get("extracted_at")]
    extracted_at = max(extracted_ats) if extracted_ats else datetime.now(timezone.utc).isoformat()

    out: list[str] = []
    out.append("---")
    out.append(f"date: {date_str}")
    out.append(f"extracted_at: {extracted_at}")
    out.append(f"total_tasks: {len(records)}")
    out.append(f"sources: {', '.join(accounts) if accounts else 'none'}")
    out.append("---")
    out.append("")
    out.append(f"# Tasks for {date_str}")
    out.append("")

    if not records:
        out.append("_No tasks extracted._")
        out.append("")
        return "\n".join(out)

    for prio in ("high", "medium", "low"):
        items = by_priority[prio]
        if not items:
            continue
        out.append(f"## {PRIORITY_LABEL[prio]}")
        out.append("")
        items.sort(key=lambda r: (r.get("due") or "9999-99-99",
                                   -(r.get("confidence") or 0)))
        for r in items:
            checkbox = "x" if r.get("status") == "done" else " "
            task = r.get("task", "(missing task)")
            due = r.get("due")
            conf = r.get("confidence")
            line = f"- [{checkbox}] **{task}**"
            tags = []
            if due:
                tags.append(f"due: {due}")
            if conf is not None:
                tags.append(f"conf: {conf:.2f}")
            if tags:
                line += " — " + ", ".join(tags)
            out.append(line)

            src = r.get("source", {})
            from_ = src.get("from", "?")
            subj = src.get("subject", "?")
            sdate = (src.get("date") or "")[:25]
            account = src.get("account", "?")
            out.append(f"  - From: {from_} ({account})")
            out.append(f"  - Subject: {subj}")
            if sdate:
                out.append(f"  - Sent: {sdate}")
            url = src.get("gmail_url")
            if url:
                out.append(f"  - [Open in Gmail]({url})")
            notes = r.get("notes")
            if notes:
                out.append(f"  - _{notes}_")
            out.append("")
    return "\n".join(out)


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("path", help="Path to tasks/YYYY-MM-DD.jsonl")
    p.add_argument("--output", default=None,
                   help="Output path (default: same dir, .md extension)")
    p.add_argument("--date", default=None,
                   help="Date string for header (default: derived from filename)")
    args = p.parse_args()

    src = Path(args.path)
    if not src.exists():
        sys.exit(f"Not found: {src}")

    records: list[dict] = []
    for i, line in enumerate(src.read_text().splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError as e:
            print(f"# {src}:{i} bad JSON, skipped: {e}", file=sys.stderr)

    date_str = args.date
    if not date_str:
        stem = src.stem
        if len(stem) >= 10 and stem[4] == "-" and stem[7] == "-":
            date_str = stem[:10]
        else:
            date_str = datetime.now(timezone.utc).date().isoformat()

    output = render(records, date_str)
    out_path = Path(args.output) if args.output else src.with_suffix(".md")
    out_path.write_text(output)
    print(f"Wrote {out_path} ({len(records)} task(s))", file=sys.stderr)


if __name__ == "__main__":
    main()

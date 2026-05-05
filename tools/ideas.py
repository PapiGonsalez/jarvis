#!/usr/bin/env python3
"""Read ideas from ideas/*.md (YAML frontmatter + markdown body).

Used by apps/api/ for the dashboard Ideas tile. Also exposes a small CLI for
sanity checks:

  python tools/ideas.py list  -> one line per idea: status, title, next_action

Frontmatter is resilient (D-P6-07): missing status defaults to 'active',
missing type defaults to 'project', missing started/last_touched fall back
to file mtime, missing next_action just hides the second line on the tile.
"""
from __future__ import annotations

import argparse
import re
from datetime import date, datetime, timezone
from pathlib import Path

import frontmatter

ROOT = Path(__file__).resolve().parent.parent
IDEAS_DIR = ROOT / "ideas"

VALID_STATUSES = {"active", "next-up", "paused", "shipped"}
VALID_TYPES = {"project", "exploration"}
STATUS_RANK = {"active": 0, "next-up": 1, "paused": 2, "shipped": 3}


def _file_mtime_date(path: Path) -> str:
    ts = path.stat().st_mtime
    return datetime.fromtimestamp(ts, tz=timezone.utc).date().isoformat()


def _coerce_iso_date(v) -> str | None:
    if v is None:
        return None
    if isinstance(v, datetime):
        return v.date().isoformat()
    if isinstance(v, date):
        return v.isoformat()
    if isinstance(v, str):
        return v.strip() or None
    return None


def _to_ts(iso: str | None) -> float:
    if not iso:
        return 0.0
    try:
        return datetime.fromisoformat(iso).timestamp()
    except ValueError:
        return 0.0


def _normalize(post, path: Path) -> dict:
    fm = post.metadata or {}
    body = (post.content or "").strip()

    title = None
    m = re.search(r"^#\s+(.+?)\s*$", body, re.MULTILINE)
    if m:
        title = m.group(1).strip()
    if not title:
        title = path.stem.replace("-", " ").title()

    lines = body.split("\n")
    if lines and lines[0].startswith("# "):
        lines = lines[1:]

    desc_lines: list[str] = []
    notes_lines: list[str] = []
    in_notes = False
    for ln in lines:
        if re.match(r"^##\s+", ln):
            section = ln.lstrip("#").strip().lower()
            in_notes = section.startswith("status notes")
            continue
        if in_notes:
            notes_lines.append(ln)
        else:
            desc_lines.append(ln)

    description = "\n".join(desc_lines).strip() or None
    status_notes = "\n".join(notes_lines).strip() or None

    status = fm.get("status", "active")
    if status not in VALID_STATUSES:
        status = "active"

    type_ = fm.get("type", "project")
    if type_ not in VALID_TYPES:
        type_ = "project"

    started = _coerce_iso_date(fm.get("started")) or _file_mtime_date(path)
    last_touched = _coerce_iso_date(fm.get("last_touched")) or _file_mtime_date(path)

    next_action = fm.get("next_action")
    if next_action is not None:
        next_action = str(next_action).strip() or None

    return {
        "id": path.stem,
        "title": title,
        "type": type_,
        "status": status,
        "started": started,
        "last_touched": last_touched,
        "next_action": next_action,
        "description": description,
        "status_notes": status_notes,
        "filename": path.name,
    }


def sort_ideas(ideas: list[dict]) -> list[dict]:
    """Sort: by status priority (active < next-up < paused < shipped), then last_touched desc, then title."""
    return sorted(
        ideas,
        key=lambda i: (
            STATUS_RANK.get(i.get("status", "active"), 99),
            -_to_ts(i.get("last_touched")),
            (i.get("title") or "").lower(),
        ),
    )


def get_ideas() -> list[dict]:
    """Return all ideas in IDEAS_DIR, sorted per sort_ideas."""
    if not IDEAS_DIR.exists():
        return []
    out: list[dict] = []
    for path in sorted(IDEAS_DIR.glob("*.md")):
        try:
            with open(path, encoding="utf-8") as f:
                post = frontmatter.load(f)
        except Exception:
            continue
        out.append(_normalize(post, path))
    return sort_ideas(out)


def cmd_list(_args):
    ideas = get_ideas()
    if not ideas:
        print("(no ideas)")
        return
    for i in ideas:
        nxt = i.get("next_action") or "-"
        title = i.get("title") or ""
        print(f"  [{i['status']:8}] {title[:35]:<35}  . {i['type']:11}  next: {nxt[:60]}")


def main():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = p.add_subparsers(dest="cmd", required=True)
    sub.add_parser("list", help="List all ideas with status + next_action")
    args = p.parse_args()
    handlers = {"list": cmd_list}
    handlers[args.cmd](args)


if __name__ == "__main__":
    main()

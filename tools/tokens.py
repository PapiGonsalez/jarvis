#!/usr/bin/env python3
"""Token usage summary across all Claude Code project JSONL files.

Walks ~/.claude/projects/*/<session>.jsonl, sums input/cache/output tokens
per day and per project, returns a structured summary the dashboard tile
consumes.

CLI:
  python tools/tokens.py summary           7-day default window
  python tools/tokens.py summary --days N  custom window
  python tools/tokens.py labels            sanity-check the project-label normalization

Project-label rules (D-P7-06):
- subagents        kept as-is
- worktree folders fold into the parent project (strip --claude-worktrees-... suffix)
- common prefixes  stripped (Users-adrian-projects-, Users-adrian-am-laravel-, ...)
- bare ~ folder    -> "global"
"""
from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

CLAUDE_PROJECTS_DIR = Path.home() / ".claude" / "projects"
LOCAL_TZ = ZoneInfo("Europe/Bucharest")

WORKTREE_MARKER = "--claude-worktrees-"
PROJECT_PREFIXES = (
    "Users-adrian-projects-am-laravel-",
    "Users-adrian-projects-",
    "Users-adrian-am-laravel-",
    "Users-adrian-",
)


def _project_label(folder_name: str) -> str:
    """Normalize a ~/.claude/projects/<folder> name to a readable label."""
    if folder_name == "subagents":
        return "subagents"
    name = folder_name.lstrip("-")
    if WORKTREE_MARKER in name:
        name = name.split(WORKTREE_MARKER)[0]
    for prefix in PROJECT_PREFIXES:
        if name.startswith(prefix):
            name = name[len(prefix):]
            break
    if name == "Users-adrian":
        return "global"
    return name or folder_name


def _tokens_in_message(usage: dict | None) -> int:
    """Sum all four flavors per D-P7-07."""
    if not usage:
        return 0
    return (
        int(usage.get("input_tokens", 0) or 0)
        + int(usage.get("cache_creation_input_tokens", 0) or 0)
        + int(usage.get("cache_read_input_tokens", 0) or 0)
        + int(usage.get("output_tokens", 0) or 0)
    )


def _bucket_date(timestamp_iso: str) -> date | None:
    """ISO 8601 UTC timestamp -> Europe/Bucharest calendar date."""
    if not timestamp_iso:
        return None
    try:
        ts = timestamp_iso.replace("Z", "+00:00")
        dt = datetime.fromisoformat(ts)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(LOCAL_TZ).date()
    except (ValueError, TypeError):
        return None


def _empty_summary(start: date, end: date, days: int) -> dict:
    daily = []
    cur = start
    while cur <= end:
        daily.append({"date": cur.isoformat(), "tokens": 0})
        cur += timedelta(days=1)
    return {
        "window": {"start": start.isoformat(), "end": end.isoformat(), "days": days},
        "total_tokens": 0,
        "prior_total": 0,
        "delta_pct": None,
        "daily": daily,
        "projects": [],
    }


def get_summary(days: int = 7) -> dict:
    """Compute token-usage summary across all Claude Code projects.

    Window = last `days` calendar days (Europe/Bucharest), today inclusive.
    Prior window = the `days` calendar days immediately before that.
    """
    today = datetime.now(LOCAL_TZ).date()
    window_end = today
    window_start = today - timedelta(days=days - 1)
    prior_end = window_start - timedelta(days=1)
    prior_start = prior_end - timedelta(days=days - 1)

    if not CLAUDE_PROJECTS_DIR.exists():
        return _empty_summary(window_start, window_end, days)

    daily: dict[date, int] = {}
    projects: dict[str, int] = {}
    prior_total = 0

    for project_dir in sorted(CLAUDE_PROJECTS_DIR.iterdir()):
        if not project_dir.is_dir():
            continue
        label = _project_label(project_dir.name)
        # Recurse so we pick up nested subagent JSONL files
        # (~/.claude/projects/<project>/<session-uuid>/subagents/<sub>.jsonl).
        # Per D-P7-05 (revised), they roll up to the parent project.
        for jsonl in project_dir.rglob("*.jsonl"):
            try:
                with open(jsonl, encoding="utf-8") as f:
                    for line in f:
                        try:
                            d = json.loads(line)
                        except json.JSONDecodeError:
                            continue
                        if d.get("type") != "assistant":
                            continue
                        usage = (d.get("message") or {}).get("usage")
                        tokens = _tokens_in_message(usage)
                        if tokens == 0:
                            continue
                        bucket = _bucket_date(d.get("timestamp"))
                        if bucket is None:
                            continue
                        if window_start <= bucket <= window_end:
                            daily[bucket] = daily.get(bucket, 0) + tokens
                            projects[label] = projects.get(label, 0) + tokens
                        elif prior_start <= bucket <= prior_end:
                            prior_total += tokens
            except (OSError, IOError):
                continue

    total = sum(projects.values())
    delta_pct = None
    if prior_total > 0:
        delta_pct = (total - prior_total) / prior_total * 100

    daily_list = []
    cur = window_start
    while cur <= window_end:
        daily_list.append({"date": cur.isoformat(), "tokens": daily.get(cur, 0)})
        cur += timedelta(days=1)

    project_list = [
        {"label": k, "tokens": v, "share": (v / total) if total > 0 else 0.0}
        for k, v in sorted(projects.items(), key=lambda kv: (-kv[1], kv[0]))
    ]

    return {
        "window": {
            "start": window_start.isoformat(),
            "end": window_end.isoformat(),
            "days": days,
        },
        "total_tokens": total,
        "prior_total": prior_total,
        "delta_pct": delta_pct,
        "daily": daily_list,
        "projects": project_list,
    }


def cmd_summary(args):
    s = get_summary(args.days)
    w = s["window"]
    print(f"Window: {w['start']} to {w['end']} ({w['days']} days)")
    print(f"Total tokens: {s['total_tokens']:,}")
    if s["delta_pct"] is not None:
        sign = "+" if s["delta_pct"] >= 0 else ""
        print(f"vs prior:     {sign}{s['delta_pct']:.1f}%  (prior_total={s['prior_total']:,})")
    else:
        print(f"vs prior:     n/a (prior window had no usage)")
    print()
    print("Daily:")
    for d in s["daily"]:
        print(f"  {d['date']}  {d['tokens']:>14,}")
    print()
    print("Projects (sorted by tokens, desc):")
    for p in s["projects"]:
        share_pct = p["share"] * 100
        print(f"  {p['label']:<35} {p['tokens']:>14,}  {share_pct:>5.1f}%")


def cmd_labels(_args):
    if not CLAUDE_PROJECTS_DIR.exists():
        print(f"(no Claude projects dir at {CLAUDE_PROJECTS_DIR})")
        return
    seen: dict[str, list[str]] = {}
    for project_dir in sorted(CLAUDE_PROJECTS_DIR.iterdir()):
        if not project_dir.is_dir():
            continue
        label = _project_label(project_dir.name)
        seen.setdefault(label, []).append(project_dir.name)
    total_folders = sum(len(v) for v in seen.values())
    total_labels = len(seen)
    print(f"Resolved {total_folders} project folders into {total_labels} unique labels:\n")
    for label in sorted(seen.keys()):
        folders = seen[label]
        if len(folders) == 1:
            print(f"  {label:<22}  <- {folders[0]}")
        else:
            print(f"  {label:<22}  <- {folders[0]}  (+{len(folders) - 1} more)")


def main():
    p = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    sm = sub.add_parser("summary", help="Print 7-day token-usage summary")
    sm.add_argument("--days", type=int, default=7)

    sub.add_parser("labels", help="Sanity-check project-label normalization")

    args = p.parse_args()
    handlers = {"summary": cmd_summary, "labels": cmd_labels}
    handlers[args.cmd](args)


if __name__ == "__main__":
    main()

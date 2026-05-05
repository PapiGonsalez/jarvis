#!/usr/bin/env python3
"""Today's tasks TUI — interactive review of tasks/<date>.jsonl.

Reads the JSONL written by `extract-tasks`, groups tasks by source account,
sorts each group by priority, and lets Adrian expand, mark done, and open
mail straight from the terminal. JSONL is the source of truth; mark-done
writes back and re-renders the markdown view via render_tasks.py.

Usage:
    .venv/bin/python tools/today.py                     # TUI for today
    .venv/bin/python tools/today.py --date 2026-05-04   # TUI for a specific day
    .venv/bin/python tools/today.py done <task_id>      # mark done (non-TUI)
    .venv/bin/python tools/today.py list                # plain stdout dump
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import webbrowser
from datetime import date as date_cls
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TASKS_DIR = REPO_ROOT / "tasks"
RENDER_SCRIPT = REPO_ROOT / "tools" / "render_tasks.py"


def _fixture_path() -> Path | None:
    """Return the active fixture file path if `JARVIS_TASKS_FIXTURE` is set
    and the file exists. Used by Playwright tests to isolate from real data.
    """
    env = os.environ.get("JARVIS_TASKS_FIXTURE")
    if env and Path(env).exists():
        return Path(env)
    return None

PRIORITY_RANK = {"high": 0, "medium": 1, "med": 1, "low": 2}
PRIORITY_GLYPH = {
    "high":   ("▲", "red",    "HIGH"),
    "medium": ("●", "yellow", "MED "),
    "med":    ("●", "yellow", "MED "),
    "low":    ("▽", "blue",   "LOW "),
}


def jsonl_path(d: date_cls) -> Path:
    fix = _fixture_path()
    if fix:
        return fix
    return TASKS_DIR / f"{d.isoformat()}.jsonl"


def load_tasks(d: date_cls) -> list[dict]:
    path = jsonl_path(d)
    if not path.exists():
        return []
    out: list[dict] = []
    for i, line in enumerate(path.read_text().splitlines(), 1):
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError as e:
            print(f"# {path}:{i} bad JSON, skipped: {e}", file=sys.stderr)
    return out


def save_tasks(d: date_cls, tasks: list[dict]) -> None:
    path = jsonl_path(d)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w") as f:
        for t in tasks:
            f.write(json.dumps(t, ensure_ascii=False) + "\n")


def re_render(d: date_cls) -> None:
    # Skip the .md re-render when running under fixture mode — tests don't
    # check the rendered markdown, and we don't want stray .md files in /tmp.
    if _fixture_path():
        return
    if not RENDER_SCRIPT.exists():
        return
    src = jsonl_path(d)
    if not src.exists():
        return
    subprocess.run(
        [sys.executable, str(RENDER_SCRIPT), str(src)],
        check=False,
        capture_output=True,
    )


def parse_date(s: str | None) -> date_cls:
    return date_cls.fromisoformat(s) if s else date_cls.today()


def normalize_priority(p: str | None) -> str:
    p = (p or "low").lower()
    return "medium" if p in ("med", "medium") else (p if p in ("high", "low") else "low")


def sort_tasks(tasks: list[dict]) -> list[dict]:
    def key(t: dict) -> tuple:
        prio = PRIORITY_RANK.get(normalize_priority(t.get("priority")), 3)
        due = t.get("due") or "9999-99-99"
        ts = t.get("extracted_at") or ""
        return (prio, due, ts)
    return sorted(tasks, key=key)


def group_by_account(tasks: list[dict]) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {}
    for t in tasks:
        acct = t.get("source", {}).get("account", "unknown")
        out.setdefault(acct, []).append(t)
    return {k: sort_tasks(v) for k, v in sorted(out.items())}


def count_summary(tasks: list[dict]) -> str:
    counts = {"high": 0, "medium": 0, "low": 0}
    for t in tasks:
        counts[normalize_priority(t.get("priority"))] += 1
    parts = []
    for k in ("high", "medium", "low"):
        if counts[k]:
            parts.append(f"{counts[k]} {k}")
    return " · ".join(parts) if parts else "0"


# ── non-TUI subcommands ─────────────────────────────────────────────────

def cmd_done(args: argparse.Namespace) -> int:
    d = parse_date(args.date)
    tasks = load_tasks(d)
    if not tasks:
        print(f"No tasks for {d.isoformat()}.", file=sys.stderr)
        return 1
    for t in tasks:
        if t.get("id") == args.task_id:
            t["status"] = "done"
            save_tasks(d, tasks)
            re_render(d)
            print(f"✓ Marked {args.task_id} done.")
            return 0
    print(f"Task id {args.task_id} not found in {d.isoformat()}.", file=sys.stderr)
    return 1


def cmd_list(args: argparse.Namespace) -> int:
    d = parse_date(args.date)
    tasks = load_tasks(d)
    if not tasks:
        print(f"No tasks for {d.isoformat()}.")
        return 0
    visible = tasks if args.show_done else [t for t in tasks if t.get("status") != "done"]
    print(f"Today: {d.isoformat()} · {len(visible)} tasks · {count_summary(visible)}")
    for acct, t_list in group_by_account(visible).items():
        print(f"\n— {acct} ({len(t_list)}) —")
        for t in t_list:
            prio = normalize_priority(t.get("priority"))
            glyph, _color, label = PRIORITY_GLYPH[prio]
            due = t.get("due") or "—"
            mark = "✓" if t.get("status") == "done" else " "
            print(f"  {mark} {glyph} {label} {t.get('task', '?')}  · due {due}  [{t.get('id', '?')}]")
    return 0


# ── TUI ──────────────────────────────────────────────────────────────────

def _render_task_label(t: dict) -> str:
    prio = normalize_priority(t.get("priority"))
    glyph, color, label = PRIORITY_GLYPH[prio]
    title = t.get("task", "(missing task)")
    if t.get("status") == "done":
        return f"[strike dim]{glyph} {label} {title}[/]"
    return f"[{color}]{glyph} {label}[/] {title}"


def _add_detail_children(node, t: dict) -> None:
    src = t.get("source", {})
    notes = t.get("notes") or "—"
    due = t.get("due") or "—"
    sender = src.get("from", "—")
    subject = src.get("subject", "—")
    url = src.get("gmail_url") or "—"
    conf = t.get("confidence")
    conf_str = f"{conf:.2f}" if isinstance(conf, (int, float)) else "—"
    node.add_leaf(f"[dim]Notes:    [/]{notes}")
    node.add_leaf(f"[dim]Due:      [/]{due}")
    node.add_leaf(f"[dim]From:     [/]{sender}")
    node.add_leaf(f"[dim]Subject:  [/]{subject}")
    node.add_leaf(f"[dim]Gmail:    [/]{url}  [dim](press o)[/]")
    node.add_leaf(f"[dim]Conf/ID:  [/]{conf_str}  ·  {t.get('id', '?')}")


def run_tui(args: argparse.Namespace) -> int:
    try:
        from textual.app import App, ComposeResult
        from textual.binding import Binding
        from textual.widgets import Footer, Header, Tree
    except ImportError:
        print("Textual not installed. Run: .venv/bin/pip install textual", file=sys.stderr)
        return 1

    target_date = parse_date(args.date)

    class TodayApp(App):
        CSS = """
        Tree { height: 1fr; padding: 1 1; }
        Header { height: 1; }
        Footer { height: 1; }
        """
        BINDINGS = [
            Binding("d", "mark_done", "Done"),
            Binding("o", "open_mail", "Open mail"),
            Binding("s", "toggle_done", "Show/hide done"),
            Binding("r", "refresh_tree", "Refresh"),
            Binding("q", "quit", "Quit"),
        ]
        TITLE = "Jarvis · today"

        def __init__(self) -> None:
            super().__init__()
            self.show_done = False
            self.task_tree = None  # set in compose

        def compose(self) -> ComposeResult:
            yield Header(show_clock=True)
            t: Tree[dict] = Tree(label="loading…", id="tasks")
            t.show_root = True
            t.guide_depth = 3
            self.task_tree = t
            yield t
            yield Footer()

        def on_mount(self) -> None:
            self._populate()

        def _populate(self) -> None:
            assert self.task_tree is not None
            tw = self.task_tree
            tasks_all = load_tasks(target_date)
            visible = tasks_all if self.show_done else [
                x for x in tasks_all if x.get("status") != "done"
            ]
            done_count = sum(1 for x in tasks_all if x.get("status") == "done")
            header = (
                f"Today: {target_date.isoformat()}  ·  "
                f"{len(visible)} open  ·  {count_summary(visible)}"
            )
            if done_count:
                header += f"  ·  {done_count} done {'(shown)' if self.show_done else '(hidden)'}"
            tw.reset(header)
            tw.root.expand()

            if not visible:
                empty = (
                    "Inbox zero today. Run extract-tasks to pull mail, or ship something."
                    if not tasks_all
                    else "All tasks done. Press s to view completed."
                )
                tw.root.add_leaf(f"[dim]{empty}[/]")
                return

            for acct, t_list in group_by_account(visible).items():
                acct_node = tw.root.add(
                    f"[bold]{acct}[/] [dim]({len(t_list)})[/]",
                    expand=True,
                )
                for t in t_list:
                    task_node = acct_node.add(_render_task_label(t), data=t, expand=False)
                    _add_detail_children(task_node, t)

        def _current_task(self) -> dict | None:
            assert self.task_tree is not None
            node = self.task_tree.cursor_node
            while node is not None:
                if isinstance(node.data, dict) and node.data.get("id"):
                    return node.data
                node = node.parent
            return None

        def action_mark_done(self) -> None:
            t = self._current_task()
            if not t:
                self.notify("No task selected.", severity="warning")
                return
            tasks = load_tasks(target_date)
            for tt in tasks:
                if tt.get("id") == t["id"]:
                    tt["status"] = "open" if tt.get("status") == "done" else "done"
                    new_status = tt["status"]
                    break
            else:
                self.notify("Task disappeared from JSONL.", severity="error")
                return
            save_tasks(target_date, tasks)
            re_render(target_date)
            self._populate()
            self.notify(f"{t['id']} → {new_status}")

        def action_open_mail(self) -> None:
            t = self._current_task()
            if not t:
                return
            url = t.get("source", {}).get("gmail_url")
            if not url:
                self.notify("No Gmail URL on this task.", severity="warning")
                return
            webbrowser.open(url)
            self.notify("Opened in browser.")

        def action_toggle_done(self) -> None:
            self.show_done = not self.show_done
            self._populate()

        def action_refresh_tree(self) -> None:
            self._populate()
            self.notify("Refreshed.")

    TodayApp().run()
    return 0


# ── argparse ────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__,
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--date", default=None, help="ISO date YYYY-MM-DD (default: today)")
    sub = parser.add_subparsers(dest="cmd")

    p_list = sub.add_parser("list", help="Plain stdout dump (no TUI)")
    p_list.add_argument("--date", default=None)
    p_list.add_argument("--show-done", action="store_true")

    p_done = sub.add_parser("done", help="Mark a task done by id")
    p_done.add_argument("task_id")
    p_done.add_argument("--date", default=None)

    args = parser.parse_args()

    # Auto-fallback to list mode when stdout isn't a tty (so pipes work).
    if args.cmd == "list":
        return cmd_list(args)
    if args.cmd == "done":
        return cmd_done(args)
    if not sys.stdout.isatty():
        args.show_done = False
        return cmd_list(args)
    return run_tui(args)


if __name__ == "__main__":
    sys.exit(main())

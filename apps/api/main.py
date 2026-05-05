"""apps/api — FastAPI helper for the Jarvis dashboard.

Wraps tools/today.py for the Tasks tile (P4) and is the future home for
all tile-side data (calendar P5, ideas P6, tokens P7).

Run from repo root:
    .venv/bin/uvicorn apps.api.main:app --reload --port 8001
"""
from __future__ import annotations

import json
import os
from datetime import date as date_cls, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from tools import gcal, ics_cal
from tools.today import (
    group_by_account,
    load_tasks,
    normalize_priority,
    re_render,
    save_tasks,
)

LOCAL_TZ = ZoneInfo("Europe/Bucharest")


class TaskOut(BaseModel):
    id: str
    task: str
    priority: str
    status: str
    due: str | None = None
    notes: str | None = None
    confidence: float | None = None
    extracted_at: str | None = None
    source: dict[str, Any]


class GroupOut(BaseModel):
    account: str
    tasks: list[TaskOut]


class TodayOut(BaseModel):
    date: str
    total: int
    summary: dict[str, int]
    groups: list[GroupOut]


class ToggleOut(BaseModel):
    id: str
    status: str


class CalendarEvent(BaseModel):
    source: str
    id: str
    title: str
    start: str | None = None
    end: str | None = None
    all_day: bool
    status: str
    link: str | None = None
    description: str | None = None
    location: str | None = None
    organizer: dict[str, Any] | None = None


class CalendarOut(BaseModel):
    window: dict[str, str]
    all_day: list[CalendarEvent]
    timed: list[CalendarEvent]
    pending: list[CalendarEvent]
    errors: dict[str, str] = {}


app = FastAPI(title="Jarvis API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://lp-agw02.tail2877af.ts.net:3000",
        "https://lp-agw02.tail2877af.ts.net",
    ],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict[str, bool]:
    return {"ok": True}


def _to_task_out(t: dict) -> TaskOut:
    return TaskOut(
        id=t.get("id", ""),
        task=t.get("task", ""),
        priority=normalize_priority(t.get("priority")),
        status=t.get("status", "open"),
        due=t.get("due"),
        notes=t.get("notes"),
        confidence=t.get("confidence"),
        extracted_at=t.get("extracted_at"),
        source=t.get("source", {}),
    )


def _summary(tasks: list[dict]) -> dict[str, int]:
    out = {"high": 0, "medium": 0, "low": 0}
    for t in tasks:
        out[normalize_priority(t.get("priority"))] += 1
    return out


@app.get("/tasks/today", response_model=TodayOut)
async def tasks_today(include_done: bool = False) -> TodayOut:
    today = date_cls.today()
    tasks = load_tasks(today)
    visible = tasks if include_done else [t for t in tasks if t.get("status") != "done"]
    grouped = group_by_account(visible)
    return TodayOut(
        date=today.isoformat(),
        total=len(visible),
        summary=_summary(visible),
        groups=[
            GroupOut(account=acct, tasks=[_to_task_out(t) for t in t_list])
            for acct, t_list in grouped.items()
        ],
    )


def _compute_calendar_window(window_hours: int) -> tuple[datetime, datetime]:
    """t_min = now (local TZ); t_max = end of (today + ceil(window_hours/24)) days.

    Default 36h means "from now through end of tomorrow", avoiding a sliding
    cliff where late-evening events drop off the tile mid-evening.
    """
    now = datetime.now(LOCAL_TZ)
    end_of_today = now.replace(hour=23, minute=59, second=59, microsecond=0)
    days_ahead = max(0, (window_hours - 1) // 24)
    return now, end_of_today + timedelta(days=days_ahead)


@app.get("/calendar/upcoming", response_model=CalendarOut)
async def calendar_upcoming(window_hours: int = 36) -> CalendarOut:
    fixture_path = os.environ.get("JARVIS_CALENDAR_FIXTURE")
    if fixture_path:
        with open(fixture_path) as f:
            return CalendarOut(**json.load(f))

    t_min, t_max = _compute_calendar_window(window_hours)

    sources: list[tuple[str, Any]] = [
        ("personal", lambda: gcal.get_upcoming("personal", t_min, t_max)),
        ("work",     lambda: gcal.get_upcoming("work", t_min, t_max)),
        ("uni",      lambda: ics_cal.get_upcoming("utwente", t_min, t_max)),
    ]

    all_events: list[dict] = []
    errors: dict[str, str] = {}
    for label, fetcher in sources:
        try:
            for e in fetcher():
                if label == "uni":
                    e["source"] = "uni"  # relabel utwente -> uni per D-P5-02 / D-P5-05
                all_events.append(e)
        except (Exception, SystemExit) as exc:
            errors[label] = f"{type(exc).__name__}: {exc}"

    visible = [e for e in all_events if e.get("status") != "declined"]
    pending = [e for e in visible if e.get("status") == "needsAction"]
    all_day = [e for e in visible if e.get("all_day")]
    timed   = [e for e in visible if not e.get("all_day")]

    all_day.sort(key=lambda e: (e.get("start") or "", e.get("title") or ""))
    timed.sort(key=lambda e: e.get("start") or "")
    pending.sort(key=lambda e: e.get("start") or "")

    return CalendarOut(
        window={"t_min": t_min.isoformat(), "t_max": t_max.isoformat()},
        all_day=[CalendarEvent(**e) for e in all_day],
        timed=[CalendarEvent(**e) for e in timed],
        pending=[CalendarEvent(**e) for e in pending],
        errors=errors,
    )


@app.post("/tasks/{task_id}/done", response_model=ToggleOut)
async def toggle_done(task_id: str) -> ToggleOut:
    today = date_cls.today()
    tasks = load_tasks(today)
    if not tasks:
        raise HTTPException(404, f"No tasks file for {today.isoformat()}")
    for t in tasks:
        if t.get("id") == task_id:
            cur = t.get("status", "open")
            t["status"] = "open" if cur == "done" else "done"
            save_tasks(today, tasks)
            re_render(today)
            return ToggleOut(id=task_id, status=t["status"])
    raise HTTPException(404, f"Task {task_id} not found in {today.isoformat()}")

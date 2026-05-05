"""apps/api — FastAPI helper for the Jarvis dashboard.

Wraps tools/today.py for the Tasks tile (P4) and is the future home for
all tile-side data (calendar P5, ideas P6, tokens P7).

Run from repo root:
    .venv/bin/uvicorn apps.api.main:app --reload --port 8001
"""
from __future__ import annotations

from datetime import date as date_cls
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from tools.today import (
    group_by_account,
    load_tasks,
    normalize_priority,
    re_render,
    save_tasks,
)


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

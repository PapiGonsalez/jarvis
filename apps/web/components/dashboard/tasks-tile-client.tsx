"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const EXTRACT_TASKS_COMMAND =
  "Open Claude Code in ~/projects/jarvis and say:\n\n  extract today's tasks";

export type Source = {
  account?: string;
  from?: string;
  subject?: string;
  gmail_url?: string;
};

export type Task = {
  id: string;
  task: string;
  priority: "high" | "medium" | "low";
  status: "open" | "done" | "deferred";
  due: string | null;
  notes: string | null;
  confidence: number | null;
  extracted_at: string | null;
  source: Source;
};

export type Group = { account: string; tasks: Task[] };

export type TodayResponse = {
  date: string;
  total: number;
  summary: { high: number; medium: number; low: number };
  groups: Group[];
};

export type Initial = TodayResponse | { error: string };

const PRIORITY_STYLE: Record<Task["priority"], { glyph: string; className: string }> = {
  high:   { glyph: "▲", className: "text-red-400" },
  medium: { glyph: "●", className: "text-yellow-400" },
  low:    { glyph: "▽", className: "text-blue-400" },
};

function PriorityGlyph({ p }: { p: Task["priority"] }) {
  const { glyph, className } = PRIORITY_STYLE[p];
  return (
    <span
      className={cn("w-3 shrink-0 text-center font-mono text-[11px] leading-none", className)}
      title={p}
      aria-label={`priority ${p}`}
    >
      {glyph}
    </span>
  );
}

function DuePill({ due }: { due: string }) {
  return (
    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
      {due}
    </span>
  );
}

function TaskRow({
  task,
  onToggle,
  busy,
}: {
  task: Task;
  onToggle: (id: string) => void;
  busy: boolean;
}) {
  const url = task.source?.gmail_url;
  const done = task.status === "done";
  return (
    <li className="flex items-center gap-3 py-1.5">
      <input
        type="checkbox"
        checked={done}
        disabled={busy}
        onChange={() => onToggle(task.id)}
        aria-label={done ? "mark open" : "mark done"}
        className="size-4 shrink-0 cursor-pointer rounded border-foreground/20 accent-foreground/50"
      />
      <PriorityGlyph p={task.priority} />
      <div className="min-w-0 flex-1">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "block truncate text-sm transition-colors hover:text-foreground",
              done && "line-through opacity-60"
            )}
          >
            {task.task}
          </a>
        ) : (
          <span className={cn("block truncate text-sm", done && "line-through opacity-60")}>
            {task.task}
          </span>
        )}
      </div>
      {task.due ? <DuePill due={task.due} /> : null}
    </li>
  );
}

function AccountSection({
  group,
  onToggle,
  busyIds,
}: {
  group: Group;
  onToggle: (id: string) => void;
  busyIds: Set<string>;
}) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {group.account} · {group.tasks.length}
      </h3>
      <ul className="flex flex-col divide-y divide-foreground/5">
        {group.tasks.map((t) => (
          <TaskRow key={t.id} task={t} onToggle={onToggle} busy={busyIds.has(t.id)} />
        ))}
      </ul>
    </section>
  );
}

export function TasksTileClient({ initial }: { initial: Initial }) {
  const [data, setData] = useState<Initial>(initial);
  const [showDone, setShowDone] = useState(false);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  async function fetchData(inc: boolean) {
    try {
      const r = await fetch(`/api/jarvis/tasks/today?include_done=${inc}`, {
        cache: "no-store",
      });
      if (!r.ok) {
        setData({ error: `HTTP ${r.status}` });
        return;
      }
      setData(await r.json());
    } catch (e) {
      setData({ error: e instanceof Error ? e.message : "fetch failed" });
    }
  }

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") {
        startTransition(() => fetchData(showDone));
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [showDone]);

  async function onToggle(id: string) {
    setBusyIds((s) => new Set(s).add(id));
    try {
      const r = await fetch(`/api/jarvis/tasks/${id}/done`, { method: "POST" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      console.error("toggle failed", e);
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      startTransition(() => fetchData(showDone));
    }
  }

  function onShowDone() {
    const next = !showDone;
    setShowDone(next);
    startTransition(() => fetchData(next));
  }

  function onRefresh() {
    startTransition(() => fetchData(showDone));
  }

  const isError = "error" in data;
  const total = isError ? 0 : data.total;

  return (
    <Card className="group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80 lg:min-h-[336px]">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground transition-colors group-hover/tile:text-foreground">
            <TaskIcon />
          </span>
          <CardTitle>Tasks</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {isError ? "—" : `${total} ${showDone ? "total" : "open"}`}
          </span>
          <button
            type="button"
            onClick={onShowDone}
            aria-pressed={showDone}
            title={showDone ? "Hide done" : "Show done"}
            className={cn(
              "rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              showDone && "bg-muted text-foreground"
            )}
          >
            <EyeIcon />
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={pending}
            aria-label="refresh"
            title="Refresh"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshIcon spinning={pending} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {isError ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-xs text-muted-foreground">
              Couldn’t load tasks ({data.error}).
            </p>
            <Button size="sm" variant="secondary" onClick={onRefresh} disabled={pending}>
              Retry
            </Button>
          </div>
        ) : data.total === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-4">
            {data.groups.map((g) => (
              <AccountSection
                key={g.account}
                group={g}
                onToggle={onToggle}
                busyIds={busyIds}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(EXTRACT_TASKS_COMMAND);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable on http; user can copy by hand
    }
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <p className="text-xs text-muted-foreground">No tasks for today yet.</p>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => {
          setCopied(false);
          setOpen(true);
        }}
      >
        Pull tasks from inbox
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extract tasks</DialogTitle>
            <DialogDescription>
              Pull recent mail across personal + voltlabs Gmail, classify, and write
              tasks/&lt;today&gt;.jsonl.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-foreground">
              {EXTRACT_TASKS_COMMAND}
            </pre>
          </div>

          <div className="flex items-center justify-end">
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(spinning && "animate-spin")}
    >
      <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.5-4M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.5 4" />
      <path d="M21 3v5h-5M3 21v-5h5" />
    </svg>
  );
}

"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Idea = {
  id: string;
  title: string;
  type: string;
  status: string;
  started: string;
  last_touched: string;
  next_action: string | null;
  description: string | null;
  status_notes: string | null;
  filename: string;
  link: string;
};

export type IdeasResponse = { ideas: Idea[] };

export type Initial = IdeasResponse | { error: string };

const STATUS_STYLE: Record<string, string> = {
  "active":   "bg-emerald-500/15 text-emerald-300",
  "next-up":  "bg-blue-500/15 text-blue-300",
  "paused":   "bg-muted text-muted-foreground",
  "shipped":  "bg-muted/50 text-muted-foreground/60",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLE[status] ?? STATUS_STYLE["active"];
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider tabular-nums",
        cls
      )}
    >
      {status}
    </span>
  );
}

function TypeChip({ type }: { type: string }) {
  return (
    <span className="shrink-0 text-[10px] text-muted-foreground/70">
      · {type}
    </span>
  );
}

function ExternalLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      title={label}
      className="shrink-0 rounded p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
    >
      <ExternalLinkIcon />
    </a>
  );
}

function ExpandedDetail({ idea }: { idea: Idea }) {
  if (!idea.description && !idea.status_notes) {
    return (
      <p className="px-1 pb-2 text-[11px] italic text-muted-foreground/70">
        No details yet.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-2 px-1 pb-2 text-[11px] text-muted-foreground">
      {idea.description ? (
        <p className="whitespace-pre-wrap leading-relaxed">{idea.description}</p>
      ) : null}
      {idea.status_notes ? (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
            Recent
          </p>
          <p className="whitespace-pre-wrap leading-relaxed">
            {idea.status_notes}
          </p>
        </div>
      ) : null}
    </div>
  );
}

type RowProps = {
  idea: Idea;
  expanded: boolean;
  onToggle: () => void;
};

function IdeaRow({ idea, expanded, onToggle }: RowProps) {
  const dimmed = idea.status === "shipped";
  return (
    <li className={cn(dimmed && "opacity-60")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${idea.title} — ${expanded ? "collapse" : "expand"}`}
        className="flex w-full flex-col gap-0.5 py-1.5 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex items-center gap-2">
          <StatusBadge status={idea.status} />
          <span className="min-w-0 flex-1 truncate text-sm">{idea.title}</span>
          <TypeChip type={idea.type} />
          {idea.link ? (
            <ExternalLinkButton
              href={idea.link}
              label={`Open ${idea.title} on GitHub`}
            />
          ) : null}
        </div>
        {idea.next_action ? (
          <p className="truncate text-[11px] text-muted-foreground">
            <span className="text-muted-foreground/60">Next:</span>{" "}
            {idea.next_action}
          </p>
        ) : null}
      </button>
      {expanded ? <ExpandedDetail idea={idea} /> : null}
    </li>
  );
}

export function IdeasTileClient({ initial }: { initial: Initial }) {
  const [data, setData] = useState<Initial>(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  async function fetchData() {
    try {
      const r = await fetch(`/api/jarvis/ideas/list`, { cache: "no-store" });
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
        startTransition(() => fetchData());
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  function onRefresh() {
    startTransition(() => fetchData());
  }

  function toggle(id: string) {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  if ("error" in data) {
    return (
      <Card
        data-testid="ideas-tile"
        className="group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80"
      >
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              <IdeaIcon />
            </span>
            <CardTitle>Ideas</CardTitle>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            aria-label="refresh"
            title="Refresh"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshIcon spinning={busy} />
          </button>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-2">
          <p className="text-xs text-muted-foreground">
            Couldn’t load ideas ({data.error}).
          </p>
          <Button size="sm" variant="secondary" onClick={onRefresh} disabled={busy}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const total = data.ideas.length;

  return (
    <Card
      data-testid="ideas-tile"
      className="group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80"
    >
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground transition-colors group-hover/tile:text-foreground">
            <IdeaIcon />
          </span>
          <CardTitle>Ideas</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {total}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={busy}
            aria-label="refresh"
            title="Refresh"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshIcon spinning={busy} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {total === 0 ? (
          <p className="text-xs text-muted-foreground">
            No ideas yet — drop a markdown file in <code>ideas/</code>.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-foreground/5">
            {data.ideas.map((i) => (
              <IdeaRow
                key={i.id}
                idea={i}
                expanded={expandedId === i.id}
                onToggle={() => toggle(i.id)}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function IdeaIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.73c.6.5 1 1.27 1 2.07V18h6v-1.2c0-.8.4-1.57 1-2.07A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
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

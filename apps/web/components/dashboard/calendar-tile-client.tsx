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

const TZ = "Europe/Bucharest";

export type CalendarEvent = {
  source: string;
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  all_day: boolean;
  status: string;
  link: string | null;
  description: string | null;
  location: string | null;
  organizer: { email?: string; name?: string } | null;
};

export type CalendarUpcoming = {
  window: { t_min: string; t_max: string };
  all_day: CalendarEvent[];
  timed: CalendarEvent[];
  pending: CalendarEvent[];
  errors: Record<string, string>;
};

export type Initial = CalendarUpcoming | { error: string };

function bucharestDay(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function todayBucharestDay(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
    hour12: false,
  }).format(new Date(iso));
}

function isTomorrow(iso: string): boolean {
  return bucharestDay(iso) > todayBucharestDay();
}

function SourceLabel({ source }: { source: string }) {
  return (
    <span className="shrink-0 text-[10px] text-muted-foreground/70">
      · {source}
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

function ExpandedDetail({ event }: { event: CalendarEvent }) {
  const hasAny = event.description || event.location || event.organizer?.name || event.organizer?.email;
  if (!hasAny) {
    return (
      <p className="pl-[3.75rem] pr-1 pb-2 text-[11px] italic text-muted-foreground/70">
        No additional details.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1 pl-[3.75rem] pr-1 pb-2 text-[11px] text-muted-foreground">
      {event.location ? (
        <p>
          <span className="text-muted-foreground/60">Location:</span> {event.location}
        </p>
      ) : null}
      {event.organizer && (event.organizer.name || event.organizer.email) ? (
        <p>
          <span className="text-muted-foreground/60">Organizer:</span>{" "}
          {event.organizer.name || event.organizer.email}
        </p>
      ) : null}
      {event.description ? (
        <p className="whitespace-pre-wrap">{event.description}</p>
      ) : null}
    </div>
  );
}

type RowProps = {
  event: CalendarEvent;
  expanded: boolean;
  onToggle: () => void;
};

function TimedRow({ event, expanded, onToggle }: RowProps) {
  const tentative = event.status === "tentative";
  const time = event.start ? formatTime(event.start) : "—";
  const tmrw = event.start ? isTomorrow(event.start) : false;
  return (
    <li className={cn(tentative && "opacity-50")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${event.title} — ${expanded ? "collapse" : "expand"}`}
        className="flex w-full items-center gap-3 py-1.5 text-left transition-colors hover:bg-muted/40"
      >
        <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
          {tmrw ? `Tmrw ${time}` : time}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{event.title}</span>
        <SourceLabel source={event.source} />
        {event.link ? (
          <ExternalLinkButton href={event.link} label={`Open ${event.title} in calendar`} />
        ) : null}
      </button>
      {expanded ? <ExpandedDetail event={event} /> : null}
    </li>
  );
}

function AllDayRow({ event, expanded, onToggle }: RowProps) {
  const tentative = event.status === "tentative";
  const tmrw = event.start ? isTomorrow(event.start) : false;
  return (
    <li className={cn(tentative && "opacity-50")}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={`${event.title} — ${expanded ? "collapse" : "expand"}`}
        className="flex w-full items-center gap-3 py-1.5 text-left transition-colors hover:bg-muted/40"
      >
        <span className="w-14 shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {tmrw ? "Tmrw" : "Today"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{event.title}</span>
        <SourceLabel source={event.source} />
        {event.link ? (
          <ExternalLinkButton href={event.link} label={`Open ${event.title} in calendar`} />
        ) : null}
      </button>
      {expanded ? <ExpandedDetail event={event} /> : null}
    </li>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

export function CalendarTileClient({ initial }: { initial: Initial }) {
  const [data, setData] = useState<Initial>(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingExpanded, setPendingExpanded] = useState(false);
  const [busy, startTransition] = useTransition();

  async function fetchData() {
    try {
      const r = await fetch(`/api/jarvis/calendar/upcoming?window_hours=36`, {
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
      data-testid="calendar-tile"
      className="group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80"
    >
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              <CalendarIcon />
            </span>
            <CardTitle>Calendar</CardTitle>
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
            Couldn’t load calendar ({data.error}).
          </p>
          <Button size="sm" variant="secondary" onClick={onRefresh} disabled={busy}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const total = data.all_day.length + data.timed.length;
  const errorSources = Object.keys(data.errors);

  return (
    <Card
      data-testid="calendar-tile"
      className="group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80"
    >
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground transition-colors group-hover/tile:text-foreground">
            <CalendarIcon />
          </span>
          <CardTitle>Calendar</CardTitle>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {total} {total === 1 ? "event" : "events"}
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
        {total === 0 && data.pending.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No events in the next 36 hours.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.pending.length > 0 ? (
              <section className="rounded-md border border-amber-500/20 bg-amber-500/5">
                <button
                  type="button"
                  onClick={() => setPendingExpanded((v) => !v)}
                  aria-expanded={pendingExpanded}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-amber-200/90 transition-colors hover:bg-amber-500/10"
                >
                  <span>{data.pending.length} awaiting response</span>
                  <ChevronIcon open={pendingExpanded} />
                </button>
                {pendingExpanded ? (
                  <ul className="flex flex-col divide-y divide-foreground/5 border-t border-amber-500/20 px-2 pb-1">
                    {data.pending.map((e) => {
                      const tmrw = e.start ? isTomorrow(e.start) : false;
                      const time = e.start && !e.all_day ? formatTime(e.start) : "";
                      const label = e.all_day
                        ? (tmrw ? "Tmrw" : "Today")
                        : (tmrw ? `Tmrw ${time}` : time);
                      return (
                        <li
                          key={`pending-${e.source}-${e.id}`}
                          className="flex items-center gap-3 py-1.5"
                        >
                          <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                            {label}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">
                            {e.title}
                          </span>
                          <SourceLabel source={e.source} />
                          {e.link ? (
                            <ExternalLinkButton
                              href={e.link}
                              label={`Open ${e.title} in calendar`}
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </section>
            ) : null}

            {data.all_day.length > 0 ? (
              <section className="flex flex-col gap-1">
                <SectionLabel>All day</SectionLabel>
                <ul className="flex flex-col divide-y divide-foreground/5">
                  {data.all_day.map((e) => {
                    const key = `${e.source}-${e.id}`;
                    return (
                      <AllDayRow
                        key={key}
                        event={e}
                        expanded={expandedId === key}
                        onToggle={() => toggle(key)}
                      />
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {data.timed.length > 0 ? (
              <section className="flex flex-col gap-1">
                <ul className="flex flex-col divide-y divide-foreground/5">
                  {data.timed.map((e) => {
                    const key = `${e.source}-${e.id}`;
                    return (
                      <TimedRow
                        key={key}
                        event={e}
                        expanded={expandedId === key}
                        onToggle={() => toggle(key)}
                      />
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>
        )}

        {errorSources.length > 0 ? (
          <p className="mt-3 text-[10px] text-muted-foreground/70">
            {errorSources.join(", ")} unavailable.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function CalendarIcon() {
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
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
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

function ChevronIcon({ open }: { open: boolean }) {
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
      className={cn("transition-transform", open && "rotate-180")}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

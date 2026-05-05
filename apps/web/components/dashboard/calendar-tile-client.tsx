"use client";

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

function TimedRow({ event }: { event: CalendarEvent }) {
  const tentative = event.status === "tentative";
  const time = event.start ? formatTime(event.start) : "—";
  const tmrw = event.start ? isTomorrow(event.start) : false;
  return (
    <li
      className={cn(
        "flex items-center gap-3 py-1.5",
        tentative && "opacity-50"
      )}
    >
      <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
        {tmrw ? `Tmrw ${time}` : time}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{event.title}</span>
      <SourceLabel source={event.source} />
    </li>
  );
}

function AllDayRow({ event }: { event: CalendarEvent }) {
  const tentative = event.status === "tentative";
  const tmrw = event.start ? isTomorrow(event.start) : false;
  return (
    <li
      className={cn(
        "flex items-center gap-3 py-1.5",
        tentative && "opacity-50"
      )}
    >
      <span className="w-14 shrink-0 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {tmrw ? "Tmrw" : "Today"}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm">{event.title}</span>
      <SourceLabel source={event.source} />
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
  if ("error" in initial) {
    return (
      <Card className="group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80">
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              <CalendarIcon />
            </span>
            <CardTitle>Calendar</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Couldn’t load calendar ({initial.error}).
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = initial;
  const total = data.all_day.length + data.timed.length;
  const errorSources = Object.keys(data.errors);

  return (
    <Card className="group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground transition-colors group-hover/tile:text-foreground">
            <CalendarIcon />
          </span>
          <CardTitle>Calendar</CardTitle>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {total} {total === 1 ? "event" : "events"}
        </span>
      </CardHeader>
      <CardContent className="flex-1">
        {total === 0 && data.pending.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No events in the next 36 hours.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {data.pending.length > 0 ? (
              <section className="rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <p className="text-xs text-amber-200/90">
                  {data.pending.length} awaiting response
                </p>
              </section>
            ) : null}

            {data.all_day.length > 0 ? (
              <section className="flex flex-col gap-1">
                <SectionLabel>All day</SectionLabel>
                <ul className="flex flex-col divide-y divide-foreground/5">
                  {data.all_day.map((e) => (
                    <AllDayRow key={`${e.source}-${e.id}`} event={e} />
                  ))}
                </ul>
              </section>
            ) : null}

            {data.timed.length > 0 ? (
              <section className="flex flex-col gap-1">
                <ul className="flex flex-col divide-y divide-foreground/5">
                  {data.timed.map((e) => (
                    <TimedRow key={`${e.source}-${e.id}`} event={e} />
                  ))}
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

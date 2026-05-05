import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Source = {
  account?: string;
  from?: string;
  subject?: string;
  gmail_url?: string;
};

type Task = {
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

type Group = { account: string; tasks: Task[] };

type TodayResponse = {
  date: string;
  total: number;
  summary: { high: number; medium: number; low: number };
  groups: Group[];
};

const JARVIS_API = process.env.JARVIS_API_URL ?? "http://localhost:8001";

async function fetchToday(): Promise<TodayResponse | { error: string }> {
  try {
    const r = await fetch(`${JARVIS_API}/tasks/today?include_done=false`, {
      cache: "no-store",
    });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    return (await r.json()) as TodayResponse;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" };
  }
}

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

function TaskRow({ task }: { task: Task }) {
  const url = task.source?.gmail_url;
  return (
    <li className="flex items-center gap-3 py-1.5">
      <input
        type="checkbox"
        disabled
        aria-label="mark done"
        className="size-4 shrink-0 rounded border-foreground/20 accent-foreground/50"
      />
      <PriorityGlyph p={task.priority} />
      <div className="min-w-0 flex-1">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block truncate text-sm transition-colors hover:text-foreground"
          >
            {task.task}
          </a>
        ) : (
          <span className="block truncate text-sm">{task.task}</span>
        )}
      </div>
      {task.due ? <DuePill due={task.due} /> : null}
    </li>
  );
}

function AccountSection({ group }: { group: Group }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {group.account} · {group.tasks.length}
      </h3>
      <ul className="flex flex-col divide-y divide-foreground/5">
        {group.tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </ul>
    </section>
  );
}

export async function TasksTile() {
  const data = await fetchToday();
  const isError = "error" in data;

  return (
    <Card className="group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80 lg:min-h-[336px]">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground transition-colors group-hover/tile:text-foreground">
            <TaskIcon />
          </span>
          <CardTitle>Tasks</CardTitle>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {isError ? "—" : `${data.total} open`}
        </span>
      </CardHeader>
      <CardContent className="flex-1">
        {isError ? (
          <p className="text-xs text-muted-foreground">
            Couldn’t load tasks ({data.error})
          </p>
        ) : data.total === 0 ? (
          <p className="text-xs text-muted-foreground">No tasks for today yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {data.groups.map((g) => (
              <AccountSection key={g.account} group={g} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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

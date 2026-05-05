"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type TokensProject = {
  label: string;
  tokens: number;
  share: number;
};

export type TokensDaily = {
  date: string;
  tokens: number;
};

export type TokensSummary = {
  window: { start: string; end: string; days: number };
  total_tokens: number;
  prior_total: number;
  delta_pct: number | null;
  daily: TokensDaily[];
  projects: TokensProject[];
};

export type Initial = TokensSummary | { error: string };

const COMPACT = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatTokens(n: number): string {
  return COMPACT.format(n);
}

function ProjectBar({
  project,
  max,
}: {
  project: TokensProject;
  max: number;
}) {
  const pct = max > 0 ? (project.tokens / max) * 100 : 0;
  return (
    <li className="flex items-center gap-2 py-0.5">
      <span className="w-16 shrink-0 truncate text-[11px] text-muted-foreground">
        {project.label}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
        <div
          className="h-full bg-foreground/40"
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground">
        {formatTokens(project.tokens)}
      </span>
    </li>
  );
}

export function TokensTileClient({ initial }: { initial: Initial }) {
  if ("error" in initial) {
    return (
      <Card
        data-testid="tokens-tile"
        className="group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80"
      >
        <CardHeader className="flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              <TokenIcon />
            </span>
            <CardTitle>Tokens</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Couldn’t load tokens ({initial.error}).
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = initial;
  const max = data.projects.reduce((m, p) => Math.max(m, p.tokens), 0);
  const empty = data.total_tokens === 0;

  return (
    <Card
      data-testid="tokens-tile"
      className="group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80"
    >
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground transition-colors group-hover/tile:text-foreground">
            <TokenIcon />
          </span>
          <CardTitle>Tokens</CardTitle>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
          {data.window.days}d
        </span>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {empty ? (
          <p className="text-xs text-muted-foreground">
            No tokens used in the last {data.window.days} days.
          </p>
        ) : (
          <>
            <p className="text-xl font-semibold tabular-nums">
              {formatTokens(data.total_tokens)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                tokens this week
              </span>
            </p>
            <ul className="flex flex-col">
              {data.projects.map((p) => (
                <ProjectBar key={p.label} project={p} max={max} />
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TokenIcon() {
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
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9 9.5h4.5a2.5 2.5 0 0 1 0 5H9" />
    </svg>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type TileShellProps = {
  title: string;
  badge?: string;
  icon: ReactNode;
  empty: string;
  className?: string;
};

function TileShell({ title, badge, icon, empty, className }: TileShellProps) {
  return (
    <Card
      className={cn(
        "group/tile relative h-full bg-card/60 backdrop-blur-sm transition-colors hover:bg-card/80",
        className
      )}
    >
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground transition-colors group-hover/tile:text-foreground">
            {icon}
          </span>
          <CardTitle>{title}</CardTitle>
        </div>
        {badge ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-1 items-center justify-center">
        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {empty}
        </p>
      </CardContent>
    </Card>
  );
}

export function TasksTile() {
  return (
    <TileShell
      title="Tasks"
      badge="P4"
      icon={<TaskIcon />}
      empty="Today's extracted tasks will land here. Wire-up comes in P4."
      className="lg:min-h-[336px]"
    />
  );
}

export function CalendarTile() {
  return (
    <TileShell
      title="Calendar"
      badge="P5"
      icon={<CalendarIcon />}
      empty="Upcoming events from Google Calendar + utwente ICS feed."
    />
  );
}

export function IdeasTile() {
  return (
    <TileShell
      title="Ideas"
      badge="P6"
      icon={<IdeaIcon />}
      empty="Self-directed projects + explorations."
    />
  );
}

export function TokensTile() {
  return (
    <TileShell
      title="Tokens"
      badge="P7"
      icon={<TokenIcon />}
      empty="Claude Code usage budget."
    />
  );
}

export function ScratchpadTile() {
  return (
    <TileShell
      title="Scratchpad"
      badge="—"
      icon={<ScratchIcon />}
      empty="Ephemeral notes for the day. Not persisted yet."
    />
  );
}

export function PinnedNotesTile() {
  return (
    <TileShell
      title="Pinned Notes"
      badge="—"
      icon={<PinIcon />}
      empty="Long-lived references kept within reach."
    />
  );
}

// ── Icons (inline SVG, 16px, currentColor) ───────────────────────────────

function TaskIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function IdeaIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.73c.6.5 1 1.27 1 2.07V18h6v-1.2c0-.8.4-1.57 1-2.07A7 7 0 0 0 12 2Z" />
    </svg>
  );
}

function TokenIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10M9 9.5h4.5a2.5 2.5 0 0 1 0 5H9" />
    </svg>
  );
}

function ScratchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 17v5M9 10.76V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4.76l3 4.24H6Z" />
    </svg>
  );
}

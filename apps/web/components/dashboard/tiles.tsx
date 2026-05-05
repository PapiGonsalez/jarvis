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

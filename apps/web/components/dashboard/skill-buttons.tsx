"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Skill = {
  id: string;
  label: string;
  description: string;
  command: string;
  icon: React.ReactNode;
};

const SKILLS: Skill[] = [
  {
    id: "extract-tasks",
    label: "Extract tasks",
    description:
      "Pull recent mail across personal + voltlabs Gmail, classify, and write tasks/<today>.jsonl.",
    command: "Open Claude Code in ~/projects/jarvis and say:\n\n  extract today's tasks",
    icon: <InboxIcon />,
  },
  {
    id: "today",
    label: "Today's tasks",
    description: "Open the interactive Textual TUI for today's tasks.",
    command: "cd ~/projects/jarvis && .venv/bin/python tools/today.py",
    icon: <ListIcon />,
  },
  {
    id: "cleanup-inbox",
    label: "Cleanup inbox",
    description:
      "Conversational personal Gmail cleanup. Audits inbox, proposes batches, executes after confirmation.",
    command: "Open Claude Code in ~/projects/jarvis and say:\n\n  cleanup my inbox",
    icon: <BroomIcon />,
  },
  {
    id: "cleanup-calendar",
    label: "Cleanup calendar",
    description:
      "Conversational personal Google Calendar cleanup. Audits subscriptions, recurring series, pending invites.",
    command: "Open Claude Code in ~/projects/jarvis and say:\n\n  cleanup my calendar",
    icon: <CalendarSlashIcon />,
  },
];

export function SkillButtons() {
  const [active, setActive] = useState<Skill | null>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard may be unavailable on http; user can copy by hand
    }
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {SKILLS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setCopied(false);
              setActive(s);
            }}
            className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
          >
            <span aria-hidden className="text-muted-foreground/80 group-hover:text-foreground">
              {s.icon}
            </span>
            {s.label}
          </button>
        ))}
      </div>

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.label}</DialogTitle>
            <DialogDescription>{active?.description}</DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-border bg-muted/40 p-3">
            <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-foreground">
              {active?.command}
            </pre>
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              Real invocation comes when the FastAPI sidecar lands (P4+).
            </span>
            <Button size="sm" variant="secondary" onClick={copy}>
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function InboxIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

function BroomIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m19.36 2.72 1.42 1.42-5.72 5.71M14.14 5.04 18 8.9M2 22l3-3 5-1 5-5-3-3-5 5-1 5-3 3Z" />
    </svg>
  );
}

function CalendarSlashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18M3 22 22 3" />
    </svg>
  );
}

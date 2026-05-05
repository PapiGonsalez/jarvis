"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ChatBar() {
  const [value, setValue] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    // P3 is UI-only; LLM wiring lands in P10.
    console.log("[chat]", trimmed);
    setValue("");
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/40 px-3 py-2 shadow-lg shadow-black/20 backdrop-blur-sm focus-within:border-border focus-within:ring-1 focus-within:ring-foreground/20"
    >
      <span aria-hidden className="pl-1 text-muted-foreground">
        <SparkleIcon />
      </span>
      <Input
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask Jarvis…"
        className="h-9 flex-1 border-none bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
      />
      <Button
        type="submit"
        size="sm"
        disabled={!value.trim()}
        className="h-9 rounded-xl px-3"
      >
        Send
        <kbd className="ml-2 hidden text-[10px] opacity-60 sm:inline">⏎</kbd>
      </Button>
    </form>
  );
}

function SparkleIcon() {
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
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
    </svg>
  );
}

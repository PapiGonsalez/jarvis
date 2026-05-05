"use client";

import { useEffect, useState } from "react";

export function Clock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!now) {
    return <span className="text-xs text-muted-foreground tabular-nums">—</span>;
  }

  const time = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const date = now.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="flex items-baseline gap-2 tabular-nums">
      <span className="text-sm font-medium">{time}</span>
      <span className="text-xs text-muted-foreground">{date}</span>
    </div>
  );
}

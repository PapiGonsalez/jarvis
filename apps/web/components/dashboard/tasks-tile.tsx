import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TasksTileClient, type Initial } from "./tasks-tile-client";

const JARVIS_API = process.env.JARVIS_API_URL ?? "http://localhost:8001";

async function fetchToday(): Promise<Initial> {
  try {
    const r = await fetch(`${JARVIS_API}/tasks/today?include_done=false`, {
      cache: "no-store",
    });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    return (await r.json()) as Initial;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" };
  }
}

export async function TasksTile() {
  const initial = await fetchToday();
  return <TasksTileClient initial={initial} />;
}

export function TasksTileSkeleton() {
  return (
    <Card className="relative h-full bg-card/60 backdrop-blur-sm lg:min-h-[336px]">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-muted/60" />
          <CardTitle>
            <span className="inline-block h-4 w-12 rounded bg-muted/60" />
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 py-1.5">
            <div className="size-4 shrink-0 rounded bg-muted/40" />
            <div className="size-3 shrink-0 rounded-full bg-muted/40" />
            <div
              className="h-3 flex-1 rounded bg-muted/40"
              style={{ maxWidth: `${[80, 65, 90][i]}%` }}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

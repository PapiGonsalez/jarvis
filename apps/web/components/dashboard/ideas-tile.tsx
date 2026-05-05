import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { IdeasTileClient, type Initial } from "./ideas-tile-client";

const JARVIS_API = process.env.JARVIS_API_URL ?? "http://localhost:8001";

async function fetchIdeas(): Promise<Initial> {
  try {
    const r = await fetch(`${JARVIS_API}/ideas/list`, { cache: "no-store" });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    return (await r.json()) as Initial;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" };
  }
}

export async function IdeasTile() {
  const initial = await fetchIdeas();
  return <IdeasTileClient initial={initial} />;
}

export function IdeasTileSkeleton() {
  return (
    <Card className="relative h-full bg-card/60 backdrop-blur-sm">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-muted/60" />
          <CardTitle>
            <span className="inline-block h-4 w-12 rounded bg-muted/60" />
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-1 py-1">
            <div className="flex items-center gap-2">
              <div className="h-3 w-12 shrink-0 rounded-full bg-muted/40" />
              <div
                className="h-3 flex-1 rounded bg-muted/40"
                style={{ maxWidth: `${[80, 65][i]}%` }}
              />
            </div>
            <div
              className="h-2.5 rounded bg-muted/30"
              style={{ maxWidth: `${[60, 50][i]}%` }}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

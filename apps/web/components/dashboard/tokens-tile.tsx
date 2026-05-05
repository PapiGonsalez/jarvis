import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TokensTileClient, type Initial } from "./tokens-tile-client";

const JARVIS_API = process.env.JARVIS_API_URL ?? "http://localhost:8001";

async function fetchTokens(): Promise<Initial> {
  try {
    const r = await fetch(`${JARVIS_API}/tokens/summary?days=7`, {
      cache: "no-store",
    });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    return (await r.json()) as Initial;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" };
  }
}

export async function TokensTile() {
  const initial = await fetchTokens();
  return <TokensTileClient initial={initial} />;
}

export function TokensTileSkeleton() {
  return (
    <Card className="relative h-full bg-card/60 backdrop-blur-sm">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-muted/60" />
          <CardTitle>
            <span className="inline-block h-4 w-14 rounded bg-muted/60" />
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="h-6 w-32 rounded bg-muted/40" />
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-14 shrink-0 rounded bg-muted/40" />
              <div
                className="h-2 flex-1 rounded-full bg-muted/40"
                style={{ maxWidth: `${[80, 50, 30][i]}%` }}
              />
              <div className="h-2 w-8 shrink-0 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

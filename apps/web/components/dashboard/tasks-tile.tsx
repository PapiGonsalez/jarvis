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

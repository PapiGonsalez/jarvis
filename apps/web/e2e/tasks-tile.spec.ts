import { test, expect } from "@playwright/test";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";

// Same fixture-file pattern as calendar/ideas/tokens tiles. The api server
// (started by `make api` via `make dev`) sets JARVIS_TASKS_FIXTURE to this
// path. When the file exists, /tasks/today reads it AND /tasks/{id}/done
// mutates it (in place of `tasks/<today>.jsonl`). Tests own the fixture
// content and clean up after themselves — no real data is touched.
const FIXTURE_PATH = "/tmp/jarvis-tasks-active-fixture.jsonl";
const API = "http://localhost:8001";

type Task = {
  id: string;
  task: string;
  priority: "high" | "medium" | "low";
  status: "open" | "done";
  due: string | null;
  notes: string | null;
  confidence: number | null;
  extracted_at: string;
  source: {
    account: string;
    from: string;
    subject: string;
    gmail_url?: string;
  };
};

function task(overrides: Partial<Task>): Task {
  return {
    id: "t1",
    task: "Default task",
    priority: "low",
    status: "open",
    due: null,
    notes: null,
    confidence: 0.9,
    extracted_at: "2026-05-05T08:00:00",
    source: {
      account: "personal",
      from: "test@example.com",
      subject: "Test",
      gmail_url: "https://mail.example.com/abc",
    },
    ...overrides,
  };
}

function writeTasks(tasks: Task[]): void {
  const content =
    tasks.map((t) => JSON.stringify(t)).join("\n") +
    (tasks.length > 0 ? "\n" : "");
  writeFileSync(FIXTURE_PATH, content);
}

type ApiTask = { id: string; status: string };
type ApiGroup = { tasks: ApiTask[] };
type ApiToday = { groups: ApiGroup[] };

test.describe("TasksTile", () => {
  test.afterEach(() => {
    if (existsSync(FIXTURE_PATH)) unlinkSync(FIXTURE_PATH);
  });

  test("empty state renders with extract-tasks launcher", async ({ page }) => {
    writeTasks([]);
    await page.goto("/");
    await expect(page.getByText(/no tasks for today yet/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /pull tasks from inbox/i })
    ).toBeVisible();
  });

  test("open task renders with priority indicator + due pill", async ({
    page,
  }) => {
    writeTasks([
      task({
        id: "t1",
        task: "Reply to landlord about heater",
        priority: "low",
        due: "2026-05-05",
      }),
    ]);
    await page.goto("/");
    await expect(page.getByText("Reply to landlord about heater")).toBeVisible();
    await expect(page.getByText("2026-05-05")).toBeVisible();
    await expect(page.locator("[aria-label='priority low']")).toBeVisible();
  });

  test("checkbox marks task done and removes it from the default view", async ({
    page,
  }) => {
    writeTasks([task({ id: "t1", task: "Reply to landlord about heater" })]);
    await page.goto("/");
    await expect(page.getByText("Reply to landlord about heater")).toBeVisible();

    const row = page
      .locator("li")
      .filter({ hasText: "Reply to landlord about heater" });
    await row.locator("input[type='checkbox']").click();

    await expect(
      page.getByText("Reply to landlord about heater")
    ).toBeHidden();

    // Confirm api state flipped (server-side, via the fixture file)
    const r = await fetch(`${API}/tasks/today?include_done=true`);
    const data = (await r.json()) as ApiToday;
    const t = data.groups.flatMap((g) => g.tasks).find((t) => t.id === "t1");
    expect(t?.status).toBe("done");
  });

  test("'Show done' toggle reveals done tasks", async ({ page }) => {
    writeTasks([
      task({
        id: "t1",
        task: "Reply to landlord about heater",
        status: "done",
      }),
    ]);
    await page.goto("/");
    await expect(
      page.getByText("Reply to landlord about heater")
    ).toBeHidden();

    await page.getByRole("button", { name: /show done/i }).click();
    await expect(
      page.getByText("Reply to landlord about heater")
    ).toBeVisible();
  });

  test("refresh button refetches without page reload", async ({ page }) => {
    writeTasks([
      task({
        id: "t1",
        task: "Reply to landlord about heater",
        status: "done",
      }),
    ]);
    await page.goto("/");
    await expect(page.getByText(/no tasks for today yet/i)).toBeVisible();

    // Mutate fixture out-of-band (simulates external change, e.g. the TUI).
    writeTasks([
      task({
        id: "t1",
        task: "Reply to landlord about heater",
        status: "open",
      }),
    ]);

    await page
      .getByTestId("tasks-tile")
      .getByRole("button", { name: /^refresh$/i })
      .click();
    await expect(
      page.getByText("Reply to landlord about heater")
    ).toBeVisible();
  });
});

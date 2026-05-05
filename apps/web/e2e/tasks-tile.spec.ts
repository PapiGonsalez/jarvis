import { test, expect } from "@playwright/test";

const API = "http://localhost:8001";

// task_84bfee8c is the Marktplaats €250 task in tasks/2026-05-05.jsonl
// (priority: low, has due: 2026-05-05). Tests assume it exists.
const TASK_ID = "task_84bfee8c";
const TASK_TITLE = /Decide on D&M.s €250 offer/i;

type Task = { id: string; status: string };
type Group = { tasks: Task[] };
type TodayResponse = { groups: Group[] };

async function setStatus(id: string, target: "open" | "done"): Promise<void> {
  const r = await fetch(`${API}/tasks/today?include_done=true`);
  if (!r.ok) throw new Error(`api unreachable: ${r.status}`);
  const data = (await r.json()) as TodayResponse;
  const all = data.groups.flatMap((g) => g.tasks);
  const task = all.find((t) => t.id === id);
  if (!task) throw new Error(`task ${id} not found in today's jsonl`);
  if (task.status !== target) {
    await fetch(`${API}/tasks/${id}/done`, { method: "POST" });
  }
}

test.describe("TasksTile", () => {
  test.afterEach(async () => {
    // Always leave TASK_ID as done so the next test starts predictably.
    await setStatus(TASK_ID, "done");
  });

  test("empty state renders with extract-tasks launcher", async ({ page }) => {
    await setStatus(TASK_ID, "done");
    await page.goto("/");
    await expect(page.getByText(/no tasks for today yet/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /pull tasks from inbox/i })
    ).toBeVisible();
  });

  test("open task renders with priority indicator + due pill", async ({ page }) => {
    await setStatus(TASK_ID, "open");
    await page.goto("/");
    await expect(page.getByText(TASK_TITLE)).toBeVisible();
    await expect(page.getByText("2026-05-05")).toBeVisible();
    await expect(page.locator("[aria-label='priority low']")).toBeVisible();
  });

  test("checkbox marks task done and removes it from the default view", async ({
    page,
  }) => {
    await setStatus(TASK_ID, "open");
    await page.goto("/");
    await expect(page.getByText(TASK_TITLE)).toBeVisible();

    const row = page.locator("li").filter({ hasText: TASK_TITLE });
    await row.locator("input[type='checkbox']").click();

    await expect(page.getByText(TASK_TITLE)).toBeHidden();

    // confirm api state flipped
    const r = await fetch(`${API}/tasks/today?include_done=true`);
    const data = (await r.json()) as TodayResponse;
    const task = data.groups.flatMap((g) => g.tasks).find((t) => t.id === TASK_ID);
    expect(task?.status).toBe("done");
  });

  test("'Show done' toggle reveals done tasks", async ({ page }) => {
    await setStatus(TASK_ID, "done");
    await page.goto("/");
    await expect(page.getByText(TASK_TITLE)).toBeHidden();

    await page.getByRole("button", { name: /show done/i }).click();
    await expect(page.getByText(TASK_TITLE)).toBeVisible();
  });

  test("refresh button refetches without page reload", async ({ page }) => {
    await setStatus(TASK_ID, "done");
    await page.goto("/");
    await expect(page.getByText(/no tasks for today yet/i)).toBeVisible();

    // Toggle to open via api directly (simulates external mutation, e.g. TUI).
    await fetch(`${API}/tasks/${TASK_ID}/done`, { method: "POST" });

    await page.getByRole("button", { name: /^refresh$/i }).click();
    await expect(page.getByText(TASK_TITLE)).toBeVisible();
  });
});

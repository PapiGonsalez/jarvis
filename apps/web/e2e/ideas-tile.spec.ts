import { test, expect } from "@playwright/test";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";

// Same fixture-file pattern as the calendar tile. The api server (started by
// `make api` via `make dev`) sets JARVIS_IDEAS_FIXTURE to this path. When the
// file exists, /ideas/list serves its content; when it's missing, the endpoint
// reads ideas/*.md normally.
const FIXTURE_PATH = "/tmp/jarvis-ideas-active-fixture.json";

const GITHUB_BASE = "https://github.com/PapiGonsalez/jarvis/blob/main/ideas";

type FixtureIdea = {
  id: string;
  title: string;
  type: string;
  status: string;
  started: string;
  last_touched: string;
  next_action: string | null;
  description: string | null;
  status_notes: string | null;
  filename: string;
  link: string;
};

type Fixture = { ideas: FixtureIdea[] };

function idea(overrides: Partial<FixtureIdea>): FixtureIdea {
  const id = overrides.id ?? "x";
  const filename = overrides.filename ?? `${id}.md`;
  return {
    id,
    title: "Untitled",
    type: "project",
    status: "active",
    started: "2026-05-01",
    last_touched: "2026-05-05",
    next_action: null,
    description: null,
    status_notes: null,
    filename,
    link: `${GITHUB_BASE}/${filename}`,
    ...overrides,
  };
}

function writeFixture(f: Fixture): void {
  writeFileSync(FIXTURE_PATH, JSON.stringify(f));
}

test.describe("IdeasTile", () => {
  test.afterEach(() => {
    if (existsSync(FIXTURE_PATH)) unlinkSync(FIXTURE_PATH);
  });

  test("empty state when no ideas", async ({ page }) => {
    writeFixture({ ideas: [] });
    await page.goto("/");
    const tile = page.getByTestId("ideas-tile");
    await expect(tile.getByText(/no ideas yet/i)).toBeVisible();
  });

  test("single active idea renders with badge, type chip, next_action preview", async ({
    page,
  }) => {
    writeFixture({
      ideas: [
        idea({
          id: "alpha",
          title: "Alpha project",
          status: "active",
          type: "project",
          next_action: "Wire the thing to the other thing",
        }),
      ],
    });
    await page.goto("/");
    const tile = page.getByTestId("ideas-tile");
    await expect(tile.getByText("Alpha project")).toBeVisible();
    await expect(tile.getByText("active")).toBeVisible();
    await expect(tile.getByText(/·\s*project/)).toBeVisible();
    await expect(tile.getByText(/Wire the thing to the other thing/)).toBeVisible();
  });

  test("mixed statuses are sorted active → next-up → paused → shipped", async ({
    page,
  }) => {
    writeFixture({
      ideas: [
        idea({ id: "a", title: "Alpha active", status: "active" }),
        idea({ id: "b", title: "Bravo next-up", status: "next-up" }),
        idea({ id: "c", title: "Charlie paused", status: "paused" }),
        idea({ id: "d", title: "Delta shipped", status: "shipped" }),
      ],
    });
    await page.goto("/");
    const tile = page.getByTestId("ideas-tile");
    const titles = await tile.locator("li").locator("button").allInnerTexts();
    // First button text should reference Alpha; last should reference Delta.
    expect(titles[0]).toContain("Alpha active");
    expect(titles[1]).toContain("Bravo next-up");
    expect(titles[2]).toContain("Charlie paused");
    expect(titles[3]).toContain("Delta shipped");
  });

  test("shipped idea row is dimmed (opacity-60)", async ({ page }) => {
    writeFixture({
      ideas: [idea({ id: "d", title: "Delta done", status: "shipped" })],
    });
    await page.goto("/");
    const row = page.locator("li").filter({ hasText: "Delta done" });
    await expect(row).toHaveClass(/opacity-60/);
  });

  test("tap row expands inline detail; tap again collapses", async ({ page }) => {
    writeFixture({
      ideas: [
        idea({
          id: "alpha",
          title: "Alpha project",
          description: "This is the project description.",
          status_notes: "- 2026-05-05 — set up scaffolding",
        }),
      ],
    });
    await page.goto("/");
    const tile = page.getByTestId("ideas-tile");
    const row = tile.getByRole("button", { name: /Alpha project/ });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("This is the project description.")).toBeVisible();
    await expect(page.getByText("Recent", { exact: true })).toBeVisible();
    await expect(page.getByText(/set up scaffolding/)).toBeVisible();
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "false");
  });

  test("idea with no description / status_notes shows 'No details yet' on expand", async ({
    page,
  }) => {
    writeFixture({
      ideas: [idea({ id: "bare", title: "Bare idea" })],
    });
    await page.goto("/");
    const tile = page.getByTestId("ideas-tile");
    const row = tile.getByRole("button", { name: /Bare idea/ });
    await row.click();
    await expect(page.getByText(/No details yet/i)).toBeVisible();
  });

  test("idea with missing next_action just hides the second line", async ({
    page,
  }) => {
    writeFixture({
      ideas: [
        idea({ id: "no-next", title: "Has no next action", next_action: null }),
      ],
    });
    await page.goto("/");
    const tile = page.getByTestId("ideas-tile");
    await expect(tile.getByText("Has no next action")).toBeVisible();
    await expect(tile.getByText(/Next:/)).toHaveCount(0);
  });

  test("external-open button has correct GitHub URL + target=_blank + stops propagation", async ({
    page,
  }) => {
    writeFixture({
      ideas: [
        idea({
          id: "linked",
          title: "Linked idea",
          filename: "linked.md",
          link: `${GITHUB_BASE}/linked.md`,
        }),
      ],
    });
    await page.goto("/");
    const tile = page.getByTestId("ideas-tile");
    const link = tile.getByRole("link", { name: /Open Linked idea on GitHub/ });
    await expect(link).toHaveAttribute("href", `${GITHUB_BASE}/linked.md`);
    await expect(link).toHaveAttribute("target", "_blank");

    const row = tile.getByRole("button", { name: /Linked idea/ });
    await expect(row).toHaveAttribute("aria-expanded", "false");

    // Disarm the link so clicking it doesn't actually navigate, then verify
    // that clicking it does NOT toggle the row's expand state.
    await link.evaluate((a: HTMLAnchorElement) => a.removeAttribute("target"));
    await link.evaluate((a: HTMLAnchorElement) =>
      a.setAttribute("href", "javascript:void(0)")
    );
    await link.click();
    await expect(row).toHaveAttribute("aria-expanded", "false");
  });

  test("refresh button refetches without page reload", async ({ page }) => {
    writeFixture({
      ideas: [idea({ id: "first", title: "First idea" })],
    });
    await page.goto("/");
    const tile = page.getByTestId("ideas-tile");
    await expect(tile.getByText("First idea")).toBeVisible();

    writeFixture({
      ideas: [idea({ id: "second", title: "Second idea" })],
    });
    await tile.getByRole("button", { name: /^refresh$/i }).click();
    await expect(tile.getByText("Second idea")).toBeVisible();
    await expect(tile.getByText("First idea")).toBeHidden();
  });
});

import { test, expect } from "@playwright/test";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";

// Same fixture-file pattern as calendar/ideas tiles. The api server (started
// by `make api` via `make dev`) sets JARVIS_TOKENS_FIXTURE to this path. When
// the file exists, /tokens/summary serves its content; missing -> live mode.
const FIXTURE_PATH = "/tmp/jarvis-tokens-active-fixture.json";

type FixtureProject = { label: string; tokens: number; share: number };
type FixtureDaily = { date: string; tokens: number };

type Fixture = {
  window: { start: string; end: string; days: number };
  total_tokens: number;
  prior_total: number;
  delta_pct: number | null;
  daily: FixtureDaily[];
  projects: FixtureProject[];
};

const WINDOW = { start: "2026-04-29", end: "2026-05-05", days: 7 };

function fixture(overrides: Partial<Fixture>): Fixture {
  return {
    window: WINDOW,
    total_tokens: 0,
    prior_total: 0,
    delta_pct: null,
    daily: [
      { date: "2026-04-29", tokens: 0 },
      { date: "2026-04-30", tokens: 0 },
      { date: "2026-05-01", tokens: 0 },
      { date: "2026-05-02", tokens: 0 },
      { date: "2026-05-03", tokens: 0 },
      { date: "2026-05-04", tokens: 0 },
      { date: "2026-05-05", tokens: 0 },
    ],
    projects: [],
    ...overrides,
  };
}

function writeFixture(f: Fixture): void {
  writeFileSync(FIXTURE_PATH, JSON.stringify(f));
}

test.describe("TokensTile", () => {
  test.afterEach(() => {
    if (existsSync(FIXTURE_PATH)) unlinkSync(FIXTURE_PATH);
  });

  test("empty state when total_tokens is 0", async ({ page }) => {
    writeFixture(fixture({}));
    await page.goto("/");
    const tile = page.getByTestId("tokens-tile");
    await expect(tile.getByText(/no tokens used in the last 7 days/i)).toBeVisible();
  });

  test("renders headline + per-project bars + sparkline", async ({ page }) => {
    writeFixture(
      fixture({
        total_tokens: 12_345_678,
        prior_total: 10_000_000,
        delta_pct: 23.5,
        daily: [
          { date: "2026-04-29", tokens: 1_000_000 },
          { date: "2026-04-30", tokens: 2_000_000 },
          { date: "2026-05-01", tokens: 1_500_000 },
          { date: "2026-05-02", tokens: 3_000_000 },
          { date: "2026-05-03", tokens: 2_500_000 },
          { date: "2026-05-04", tokens: 1_000_000 },
          { date: "2026-05-05", tokens: 1_345_678 },
        ],
        projects: [
          { label: "alpha",   tokens: 7_000_000, share: 0.567 },
          { label: "bravo",   tokens: 3_000_000, share: 0.243 },
          { label: "charlie", tokens: 2_345_678, share: 0.190 },
        ],
      })
    );
    await page.goto("/");
    const tile = page.getByTestId("tokens-tile");
    await expect(tile.getByText("12.3M", { exact: false })).toBeVisible();
    await expect(tile.getByText(/tokens this week/)).toBeVisible();
    await expect(tile.getByText("alpha")).toBeVisible();
    await expect(tile.getByText("bravo")).toBeVisible();
    await expect(tile.getByText("charlie")).toBeVisible();

    const spark = tile.getByTestId("tokens-sparkline");
    await expect(spark).toBeVisible();
    const barCount = await spark.locator("div").count();
    expect(barCount).toBe(7);
  });

  test("positive delta renders with up-arrow and amber styling", async ({
    page,
  }) => {
    writeFixture(
      fixture({
        total_tokens: 12_000_000,
        prior_total: 10_000_000,
        delta_pct: 20.0,
        projects: [{ label: "alpha", tokens: 12_000_000, share: 1.0 }],
      })
    );
    await page.goto("/");
    const tile = page.getByTestId("tokens-tile");
    await expect(tile.getByText(/▲\s*\+20\.0%\s*vs prior\s*7d/)).toBeVisible();
  });

  test("negative delta renders with down-arrow and muted styling", async ({
    page,
  }) => {
    writeFixture(
      fixture({
        total_tokens: 8_000_000,
        prior_total: 10_000_000,
        delta_pct: -20.0,
        projects: [{ label: "alpha", tokens: 8_000_000, share: 1.0 }],
      })
    );
    await page.goto("/");
    const tile = page.getByTestId("tokens-tile");
    await expect(tile.getByText(/▼\s*-20\.0%\s*vs prior\s*7d/)).toBeVisible();
  });

  test("delta omitted when prior_total is 0 (delta_pct null)", async ({
    page,
  }) => {
    writeFixture(
      fixture({
        total_tokens: 5_000_000,
        prior_total: 0,
        delta_pct: null,
        projects: [{ label: "alpha", tokens: 5_000_000, share: 1.0 }],
      })
    );
    await page.goto("/");
    const tile = page.getByTestId("tokens-tile");
    // Headline still visible, but no "vs prior" line
    await expect(tile.getByText(/5M\s+tokens this week/i)).toBeVisible();
    await expect(tile.getByText(/vs prior/)).toHaveCount(0);
  });

  test("top 5 + Other line renders when API trims", async ({ page }) => {
    writeFixture(
      fixture({
        total_tokens: 100_000_000,
        prior_total: 50_000_000,
        delta_pct: 100.0,
        projects: [
          { label: "alpha",   tokens: 30_000_000, share: 0.30 },
          { label: "bravo",   tokens: 25_000_000, share: 0.25 },
          { label: "charlie", tokens: 20_000_000, share: 0.20 },
          { label: "delta",   tokens: 12_000_000, share: 0.12 },
          { label: "echo",    tokens:  8_000_000, share: 0.08 },
          { label: "Other",   tokens:  5_000_000, share: 0.05 },
        ],
      })
    );
    await page.goto("/");
    const tile = page.getByTestId("tokens-tile");
    for (const label of ["alpha", "bravo", "charlie", "delta", "echo", "Other"]) {
      await expect(tile.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test("refresh button refetches without page reload", async ({ page }) => {
    writeFixture(
      fixture({
        total_tokens: 1_000_000,
        prior_total: 500_000,
        delta_pct: 100.0,
        projects: [{ label: "first-load", tokens: 1_000_000, share: 1.0 }],
      })
    );
    await page.goto("/");
    const tile = page.getByTestId("tokens-tile");
    await expect(tile.getByText("first-load")).toBeVisible();

    writeFixture(
      fixture({
        total_tokens: 2_000_000,
        prior_total: 500_000,
        delta_pct: 300.0,
        projects: [{ label: "after-refresh", tokens: 2_000_000, share: 1.0 }],
      })
    );
    await tile.getByRole("button", { name: /^refresh$/i }).click();
    await expect(tile.getByText("after-refresh")).toBeVisible();
    await expect(tile.getByText("first-load")).toBeHidden();
  });
});

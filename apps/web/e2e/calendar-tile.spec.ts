import { test, expect } from "@playwright/test";
import { writeFileSync, unlinkSync, existsSync } from "node:fs";

// The api server (started by `make api`, which is started by `make dev` via
// `webServer` in playwright.config.ts) sets JARVIS_CALENDAR_FIXTURE to this
// path. When the file exists, /calendar/upcoming serves its content; when it's
// missing, the endpoint hits the real Google + ICS sources.
const FIXTURE_PATH = "/tmp/jarvis-calendar-active-fixture.json";

type FixtureEvent = {
  source: string;
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  all_day: boolean;
  status: string;
  link: string | null;
  description?: string | null;
  location?: string | null;
  organizer?: { email?: string; name?: string } | null;
};

type Fixture = {
  window: { t_min: string; t_max: string };
  all_day: FixtureEvent[];
  timed: FixtureEvent[];
  pending: FixtureEvent[];
  errors: Record<string, string>;
};

const WINDOW = {
  t_min: "2026-05-05T08:00:00+03:00",
  t_max: "2026-05-06T23:59:59+03:00",
};

function fixture(overrides: Partial<Fixture>): Fixture {
  return {
    window: WINDOW,
    all_day: [],
    timed: [],
    pending: [],
    errors: {},
    ...overrides,
  };
}

function writeFixture(f: Fixture): void {
  writeFileSync(FIXTURE_PATH, JSON.stringify(f));
}

test.describe("CalendarTile", () => {
  test.afterEach(() => {
    if (existsSync(FIXTURE_PATH)) unlinkSync(FIXTURE_PATH);
  });

  test("empty state when no events", async ({ page }) => {
    writeFixture(fixture({}));
    await page.goto("/");
    await expect(
      page.getByText(/no events in the next 36 hours/i)
    ).toBeVisible();
  });

  test("timed event renders with time, title, source label", async ({ page }) => {
    writeFixture(
      fixture({
        timed: [
          {
            source: "personal",
            id: "t1",
            title: "Standup with team",
            start: "2026-05-05T14:00:00+03:00",
            end: "2026-05-05T15:00:00+03:00",
            all_day: false,
            status: "accepted",
            link: "https://cal.example.com/t1",
          },
        ],
      })
    );
    await page.goto("/");
    await expect(
      page.getByRole("button", { name: /Standup with team/ })
    ).toBeVisible();
    await expect(page.getByText("14:00")).toBeVisible();
    await expect(page.getByText(/·\s*personal/).first()).toBeVisible();
  });

  test("all-day event renders under ALL DAY section", async ({ page }) => {
    writeFixture(
      fixture({
        all_day: [
          {
            source: "work",
            id: "a1",
            title: "Liberation Day",
            start: "2026-05-05",
            end: "2026-05-06",
            all_day: true,
            status: "accepted",
            link: "https://cal.example.com/a1",
          },
        ],
      })
    );
    await page.goto("/");
    await expect(page.getByText("ALL DAY")).toBeVisible();
    await expect(page.getByText("Liberation Day")).toBeVisible();
    await expect(page.getByText(/·\s*work/).first()).toBeVisible();
  });

  test("tap row expands inline detail; tap again collapses", async ({ page }) => {
    writeFixture(
      fixture({
        timed: [
          {
            source: "personal",
            id: "t1",
            title: "Standup with team",
            start: "2026-05-05T14:00:00+03:00",
            end: "2026-05-05T15:00:00+03:00",
            all_day: false,
            status: "accepted",
            link: "https://cal.example.com/t1",
            description: "Daily 15-min sync",
            location: "Zoom",
          },
        ],
      })
    );
    await page.goto("/");
    const row = page.getByRole("button", { name: /Standup with team/ });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Daily 15-min sync")).toBeVisible();
    await expect(page.getByText(/Location:\s*Zoom/)).toBeVisible();
    await row.click();
    await expect(row).toHaveAttribute("aria-expanded", "false");
  });

  test("pending mini-row shows count and expands to invite list", async ({
    page,
  }) => {
    writeFixture(
      fixture({
        pending: [
          {
            source: "work",
            id: "p1",
            title: "Quarterly planning",
            start: "2026-05-06T10:00:00+03:00",
            end: "2026-05-06T11:00:00+03:00",
            all_day: false,
            status: "needsAction",
            link: "https://cal.example.com/p1",
          },
          {
            source: "personal",
            id: "p2",
            title: "Coffee with Alex",
            start: "2026-05-06T16:30:00+03:00",
            end: "2026-05-06T17:00:00+03:00",
            all_day: false,
            status: "needsAction",
            link: null,
          },
        ],
      })
    );
    await page.goto("/");
    const trigger = page.getByRole("button", { name: /2 awaiting response/ });
    await expect(trigger).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText("Quarterly planning")).toBeHidden();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText("Quarterly planning")).toBeVisible();
    await expect(page.getByText("Coffee with Alex")).toBeVisible();
  });

  test("tentative event is rendered dimmed (opacity)", async ({ page }) => {
    writeFixture(
      fixture({
        timed: [
          {
            source: "personal",
            id: "t1",
            title: "Maybe lunch",
            start: "2026-05-05T12:00:00+03:00",
            end: "2026-05-05T13:00:00+03:00",
            all_day: false,
            status: "tentative",
            link: null,
          },
        ],
      })
    );
    await page.goto("/");
    const row = page
      .locator("li")
      .filter({ has: page.getByText("Maybe lunch") });
    await expect(row).toHaveClass(/opacity-50/);
  });

  test("partial source failure shows footer note, still renders other events", async ({
    page,
  }) => {
    writeFixture(
      fixture({
        timed: [
          {
            source: "personal",
            id: "t1",
            title: "Working event",
            start: "2026-05-05T09:00:00+03:00",
            end: "2026-05-05T10:00:00+03:00",
            all_day: false,
            status: "accepted",
            link: "https://cal.example.com/t1",
          },
        ],
        errors: { uni: "RequestException: timeout" },
      })
    );
    await page.goto("/");
    await expect(page.getByText("Working event")).toBeVisible();
    await expect(page.getByText(/uni\s*unavailable/i)).toBeVisible();
  });

  test("refresh button refetches without page reload", async ({ page }) => {
    writeFixture(
      fixture({
        timed: [
          {
            source: "personal",
            id: "t1",
            title: "First event",
            start: "2026-05-05T09:00:00+03:00",
            end: "2026-05-05T10:00:00+03:00",
            all_day: false,
            status: "accepted",
            link: null,
          },
        ],
      })
    );
    await page.goto("/");
    await expect(page.getByText("First event")).toBeVisible();

    // Mutate fixture: replace the timed event
    writeFixture(
      fixture({
        timed: [
          {
            source: "personal",
            id: "t2",
            title: "Second event",
            start: "2026-05-05T11:00:00+03:00",
            end: "2026-05-05T12:00:00+03:00",
            all_day: false,
            status: "accepted",
            link: null,
          },
        ],
      })
    );
    await page
      .getByTestId("calendar-tile")
      .getByRole("button", { name: /^refresh$/i })
      .click();
    await expect(page.getByText("Second event")).toBeVisible();
    await expect(page.getByText("First event")).toBeHidden();
  });

  test("external link button has target=_blank and stops propagation", async ({
    page,
  }) => {
    writeFixture(
      fixture({
        timed: [
          {
            source: "personal",
            id: "t1",
            title: "Linked event",
            start: "2026-05-05T15:00:00+03:00",
            end: "2026-05-05T16:00:00+03:00",
            all_day: false,
            status: "accepted",
            link: "https://cal.example.com/t1",
          },
        ],
      })
    );
    await page.goto("/");
    const link = page.getByRole("link", { name: /Open Linked event in calendar/ });
    await expect(link).toHaveAttribute("href", "https://cal.example.com/t1");
    await expect(link).toHaveAttribute("target", "_blank");

    // Clicking the row toggles expand; clicking the link should NOT toggle.
    const row = page.getByRole("button", { name: /Linked event/ });
    await expect(row).toHaveAttribute("aria-expanded", "false");
    // Prevent the new tab from actually opening; just verify expand state stays false.
    await link.evaluate((a: HTMLAnchorElement) => a.removeAttribute("target"));
    await link.evaluate((a: HTMLAnchorElement) => a.setAttribute("href", "javascript:void(0)"));
    await link.click();
    await expect(row).toHaveAttribute("aria-expanded", "false");
  });
});

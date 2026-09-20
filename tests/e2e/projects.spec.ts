import { expect, test, type Page } from "@playwright/test";
import { DOS_SCROLL_ATTR } from "@swearjar/dos/contracts";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import {
  PROJECTS_CARD_ATTR,
  PROJECTS_PATH,
  projectPath,
} from "../../src/features/projects/projects";
import { expectAbove, expectNoViolations, logon, waitForHydration } from "./helpers";

const FEED_REGION = "PROJECTS.EXE";
const layers = (page: Page) => page.locator(`[${DOC_LAYER_ATTR}]`);
// The PanelStack effect focuses the top layer's body; the focus is the sync
// point for keyboard tests, as the islands hydrate after the shell clock.
const focusedBody = (page: Page) => page.locator(`[${DOC_TOP_ATTR}] [${DOS_SCROLL_ATTR}]`);
const feed = (page: Page) => page.getByRole("region", { name: FEED_REGION });
const cards = (page: Page) => feed(page).locator(`[${PROJECTS_CARD_ATTR}]`);

test("renders the registry cut by status", async ({ page }) => {
  await page.goto(PROJECTS_PATH);
  await waitForHydration(page);

  await expect(page).toHaveTitle("Projects — Swear Jar Labs");
  await expect(feed(page).getByText("5 PROJECTS")).toBeVisible();
  await expect(cards(page)).toHaveCount(5);

  const sections = feed(page).getByRole("heading", { level: 2 });
  await expect(sections).toHaveText(["ACTIVE", "PLANNED", "ARCHIVE"]);
  await expect(cards(page).nth(0)).toContainText("SWEARJAR.DOS");
  await expect(cards(page).nth(1)).toContainText("Compiler");
  await expect(cards(page).nth(2)).toContainText("Tooling");
  await expect(cards(page).nth(3)).toContainText("Flagship");
  await expect(cards(page).nth(4)).toContainText("Token Cache");

  await expect(cards(page).nth(0).getByRole("link", { name: "SWEARJAR.DOS" })).toHaveAttribute(
    "href",
    projectPath("swearjar-dos"),
  );
  // The card carries the excerpt and the stack chips, not just the name.
  await expect(cards(page).nth(0)).toContainText("The terminal you are looking at");
  await expect(cards(page).nth(0).getByText("Next.js", { exact: true })).toBeVisible();
  await expect(cards(page).nth(0).getByText("Postgres", { exact: true })).toBeVisible();
  // Every feed card carries its section icon in the title row.
  await expect(cards(page).nth(0).locator('[data-file-icon="box"]')).toBeVisible();
  // The byline (lead and creation age) reads above the title, like the board.
  const firstCard = cards(page).nth(0);
  await expect(firstCard).toContainText(/AGO|JUST NOW/);
  await expectAbove(
    firstCard.getByRole("link", { name: "ada" }),
    firstCard.getByRole("link", { name: "SWEARJAR.DOS" }),
  );
  await expectNoViolations(page, PROJECTS_PATH);
});

test("opens a project layer and closes it back to the card", async ({ page }) => {
  await page.goto(PROJECTS_PATH);
  await waitForHydration(page);
  await expect(layers(page)).toHaveCount(1);

  // The card link uses a client navigation instead of reloading the shell.
  await page.evaluate(() => {
    (window as unknown as { sjSpaMarker?: number }).sjSpaMarker = 1;
  });
  await cards(page).nth(1).getByRole("link", { name: "Compiler" }).click();
  await expect(page).toHaveURL(projectPath("compiler"));
  await expect(layers(page)).toHaveCount(2);
  expect(
    await page.evaluate(() => (window as unknown as { sjSpaMarker?: number }).sjSpaMarker),
  ).toBe(1);

  const panel = page.getByRole("region", { name: "Compiler" });
  await expect(panel.getByRole("heading", { level: 1, name: "Compiler" })).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2, name: "ABOUT" })).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2, name: "FORGE" })).toBeVisible();
  await expect(panel.getByRole("heading", { level: 2, name: "JOURNAL" })).toBeVisible();
  await expect(page).toHaveTitle("Compiler — Swear Jar Labs");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(PROJECTS_PATH);
  await expect(layers(page)).toHaveCount(1);
  await expect(cards(page).nth(1).getByRole("link", { name: "Compiler" })).toBeFocused();
  await expectNoViolations(page, projectPath("compiler"));
});

test("walks the index with arrows and opens with Enter", async ({ page }) => {
  await page.goto(PROJECTS_PATH);
  await waitForHydration(page);
  await expect(focusedBody(page)).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(cards(page).nth(0).getByRole("link", { name: "SWEARJAR.DOS" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(cards(page).nth(1).getByRole("link", { name: "Compiler" })).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(projectPath("compiler"));
  await expect(layers(page)).toHaveCount(2);
});

test("reads the journal preview and follows ALL THREADS to the board", async ({ page }) => {
  await page.goto(projectPath("swearjar-dos"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "SWEARJAR.DOS" });

  await expect(
    panel.getByRole("link", { name: "Boot sequence: CRT-on before first paint" }),
  ).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "Palette check: CGA against the CRT glow" }),
  ).toBeVisible();

  const allThreads = panel.getByRole("link", { name: "ALL THREADS →" });
  await expect(allThreads).toHaveAttribute("href", "/discussions?board=swearjar-dos");
  await allThreads.click();
  await expect(page).toHaveURL("/discussions?board=swearjar-dos");
});

test("keeps an empty journal readable", async ({ page }) => {
  await page.goto(projectPath("flagship"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Flagship" });
  await expect(
    panel.getByText("No entries yet. The journal opens with the first thread."),
  ).toBeVisible();
  await expect(
    panel.getByText("No repository yet. The forge wakes when the code lands."),
  ).toBeVisible();
});

test("shows forge counters, the frozen archive and the member call", async ({ page }) => {
  await page.goto(projectPath("swearjar-dos"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "SWEARJAR.DOS" });

  await expect(panel.getByText("GITHUB", { exact: true })).toBeVisible();
  await expect(panel.getByText("OPEN PRS 3 · MERGED 30D 12 · COMMITS 7D 21")).toBeVisible();
  await expect(panel.getByText(/RELEASE v0\.1/)).toBeVisible();
  await expect(panel.getByText(/SYNCED /)).toBeVisible();
  await expect(
    panel.getByRole("link", { name: "https://github.com/swear-jar-labs/portal" }),
  ).toHaveAttribute("target", "_blank");

  // Guests are pointed at APPLY: the journal belongs to members.
  await expect(panel.getByText("Members write here. Want in?")).toBeVisible();
  await expect(panel.getByRole("link", { name: "[ APPLY → ]" })).toHaveAttribute("href", "/apply");

  await page.goto(projectPath("token-cache"));
  await waitForHydration(page);
  await expect(
    page.getByRole("region", { name: "Token Cache" }).getByText("FROZEN", { exact: true }),
  ).toBeVisible();
});

test("opens the journal for a member without an apply prompt", async ({ page }) => {
  await logon(page);
  await page.goto(projectPath("tooling"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Tooling" });

  await expect(panel.getByText("Members write here. Want in?")).toHaveCount(0);
  await expect(panel.getByRole("link", { name: "ALL THREADS →" })).toBeVisible();
});

test("opens a maintainer profile above the project and returns", async ({ page }) => {
  await page.goto(PROJECTS_PATH);
  await waitForHydration(page);

  const lead = cards(page).nth(0).getByRole("link", { name: "ada" });
  await expect(lead).toHaveAttribute("href", "/members/ada");
  await lead.click();
  await expect(page).toHaveURL("/members/ada");
  await expect(layers(page)).toHaveCount(2);
  await expect(page.getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "ada" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(PROJECTS_PATH);
  await expect(layers(page)).toHaveCount(1);
  await expect(cards(page).nth(0).getByRole("link", { name: "ada" })).toBeFocused();
});

test("shows PATH NOT FOUND for an unknown project", async ({ page }) => {
  await page.goto("/projects/nope");
  await expect(page.getByRole("heading", { level: 1, name: "PATH NOT FOUND" })).toBeVisible();
});

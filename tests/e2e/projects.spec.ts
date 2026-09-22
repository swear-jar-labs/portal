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
  await expect(sections).toHaveText(["PROJECTS.EXE", "ACTIVE", "PLANNED", "ARCHIVE"]);
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
  await expect(panel.getByRole("heading", { level: 2, name: "RELATED THREADS" })).toBeVisible();
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
  await focusedBody(page).focus();

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

  await expect(panel.getByRole("link", { name: "[ NEW THREAD ]" })).toHaveAttribute(
    "href",
    "/discussions?board=swearjar-dos&new=1",
  );

  await expect(
    panel.getByRole("link", { name: "Boot sequence: CRT-on before first paint" }),
  ).toBeVisible();
  // Journal titles read black on the project page, like the board's cards.
  await expect(
    panel.getByRole("link", { name: "Boot sequence: CRT-on before first paint" }),
  ).toHaveCSS("color", "rgb(0, 0, 0)");
  await expect(
    panel.getByRole("link", { name: "Palette check: CGA against the CRT glow" }),
  ).toBeVisible();
  // Journal entries are the board's own cards, votes included.
  await expect(panel.getByRole("button", { name: "▲ 9 VOTES" })).toBeVisible();
  // The journal walks two axes: ↓ steps between entries, → inside one.
  await panel.getByRole("link", { name: "Boot sequence: CRT-on before first paint" }).focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    panel.getByRole("link", { name: "Palette check: CGA against the CRT glow" }),
  ).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(panel.getByRole("link", { name: "ken" })).toBeFocused();
  const allThreads = panel.getByRole("link", { name: "ALL THREADS (2) →" });
  await expect(allThreads).toHaveAttribute("href", "/discussions?board=swearjar-dos");
  await allThreads.click();
  await expect(page).toHaveURL("/discussions?board=swearjar-dos");
});

test("opens a thread composer with the project preselected", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(projectPath("compiler"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Compiler" });

  await panel.getByRole("link", { name: "[ NEW THREAD ]" }).click();
  await expect(page).toHaveURL("/discussions?board=compiler");
  const form = page.getByRole("form", { name: "NEW THREAD" });
  await expect(form.getByRole("combobox", { name: "BOARD" })).toContainText("Compiler");
});

test("opens a journal thread and closes back to the project", async ({ page }) => {
  await page.goto(projectPath("swearjar-dos"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "SWEARJAR.DOS" });

  await panel.getByRole("link", { name: "Boot sequence: CRT-on before first paint" }).click();
  await expect(page).toHaveURL("/discussions/swearjar-boot");
  await expect(
    page.getByRole("region", { name: "Boot sequence: CRT-on before first paint" }),
  ).toBeVisible();

  // The thread closes with browser back to the project page it was read from,
  // and the project's own marker survives the nested push: Esc still lands on
  // the index.
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(projectPath("swearjar-dos"));
  await expect(page.getByRole("region", { name: "SWEARJAR.DOS" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(PROJECTS_PATH);
});

test("filters the board by tag inside the project scope", async ({ page }) => {
  await page.goto(projectPath("swearjar-dos"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "SWEARJAR.DOS" });

  await panel
    .getByRole("article")
    .filter({ hasText: "Palette check: CGA against the CRT glow" })
    .getByRole("button", { name: "QUESTION" })
    .click();
  await expect(page).toHaveURL("/discussions?board=swearjar-dos&tag=question");
});

test("votes in the journal", async ({ page }) => {
  await logon(page);
  await page.goto(projectPath("swearjar-dos"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "SWEARJAR.DOS" });

  // The journal shares the board's session store: the count grows in place.
  // (A plain cross-section link reloads and resets session state by design,
  // so the delta is pinned here, not across the navigation.)
  await panel.getByRole("button", { name: "▲ 9 VOTES" }).click();
  await expect(panel.getByRole("button", { name: "▲ 10 VOTES" })).toBeVisible();
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

  await expect(panel.getByText("REPOSITORY", { exact: true })).toBeVisible();
  await expect(panel.getByText("OPEN PRS", { exact: true })).toBeVisible();
  await expect(panel.getByText("MERGED 30D", { exact: true })).toBeVisible();
  await expect(panel.getByText("COMMITS 7D", { exact: true })).toBeVisible();
  await expect(panel.getByText("3", { exact: true })).toBeVisible();
  await expect(panel.getByText("12", { exact: true })).toBeVisible();
  await expect(panel.getByText("21", { exact: true })).toBeVisible();
  await expect(panel.getByText("RELEASE", { exact: true })).toBeVisible();
  await expect(panel.getByText(/v0\.1/)).toBeVisible();
  await expect(panel.getByText("SYNCED", { exact: true })).toBeVisible();
  // The ABOUT stack reads as chips, like the index cards.
  await expect(panel.getByText("STACK", { exact: true })).toBeVisible();
  await expect(panel.getByText("TypeScript", { exact: true })).toBeVisible();
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
  await expect(panel.getByRole("link", { name: "ALL THREADS (1) →" })).toBeVisible();
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

test("shows the claim ladder and lets a maintainer tune it", async ({ page }) => {
  // ada maintains tooling: the ladder reads as full sentences per rung.
  await logon(page, "ada");
  await page.goto(projectPath("tooling"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Tooling" });
  await expect(
    panel.getByRole("heading", { level: 2, name: "ASSIGNEE REQUIREMENTS" }),
  ).toBeVisible();
  await expect(panel.getByText("Who may take tickets of each size.")).toBeVisible();
  await expect(panel.getByText("TASKS ARE AVAILABLE FOR")).toBeVisible();
  await expect(panel.getByText("EVERYONE")).toBeVisible();
  await expect(panel.getByText("TASKS NEED")).toHaveCount(2);
  await expect(panel.getByText("2 DONE")).toBeVisible();
  await expect(panel.getByText("1 DONE")).toBeVisible();

  await panel.getByRole("button", { name: "[ EDIT ]" }).click();
  const save = panel.getByRole("button", { name: "[ SAVE ]" });
  // The opened form hands input focus to its first control.
  await expect(panel.getByRole("combobox", { name: "M NEEDS" })).toBeFocused();
  await expect(save).toBeDisabled();
  await panel.getByRole("combobox", { name: "M NEEDS" }).click();
  await page.getByRole("option", { name: "3", exact: true }).click();
  await expect(save).toBeEnabled();
  // CANCEL drops the draft: the fixture rungs are back, the form is gone.
  await panel.getByRole("button", { name: "[ CANCEL ]" }).click();
  await expect(panel.getByText("2 DONE")).toBeVisible();
  await expect(panel.getByRole("combobox", { name: "M NEEDS" })).toHaveCount(0);

  // SAVE lands the tune in the session: the rungs and the dossier gate
  // read it (cross-page it dies with the reload, like the tickets' store —
  // Phase 5 keeps it server-side).
  await panel.getByRole("button", { name: "[ EDIT ]" }).click();
  await panel.getByRole("combobox", { name: "M NEEDS" }).click();
  await page.getByRole("option", { name: "3", exact: true }).click();
  await panel.getByRole("button", { name: "[ SAVE ]" }).click();
  await expect(panel.getByText("3 DONE")).toBeVisible();
  await expect(panel.getByText("2 DONE")).toHaveCount(0);
  await expect(panel.getByRole("combobox", { name: "M NEEDS" })).toHaveCount(0);
  await expectNoViolations(page, "tuned claim ladder");
});

test("Escape cancels the claim form first and closes the project next", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(projectPath("tooling"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Tooling" });

  await panel.getByRole("button", { name: "[ EDIT ]" }).click();
  await expect(panel.getByRole("combobox", { name: "M NEEDS" })).toBeFocused();
  // The first Esc drops the draft like CANCEL: the form is gone, the project
  // stays open, and the keyboard is back on the trigger.
  await page.keyboard.press("Escape");
  await expect(panel.getByRole("combobox", { name: "M NEEDS" })).toHaveCount(0);
  await expect(page).toHaveURL(projectPath("tooling"));
  await expect(layers(page)).toHaveCount(2);
  await expect(panel.getByRole("button", { name: "[ EDIT ]" })).toBeFocused();
  // The second Esc finds no form and closes the project as before.
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(PROJECTS_PATH);
  await expect(layers(page)).toHaveCount(1);
  await expectNoViolations(page, "claim form escape");
});

test("shows the ladder read-only without a maintainer seat", async ({ page }) => {
  // ken maintains nothing on tooling: the sentences read, but offer no edit.
  await logon(page, "ken");
  await page.goto(projectPath("tooling"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Tooling" });
  await expect(panel.getByText("TASKS ARE AVAILABLE FOR")).toBeVisible();
  await expect(panel.getByText("EVERYONE")).toBeVisible();
  await expect(panel.getByText("TASKS NEED")).toHaveCount(2);
  await expect(panel.getByRole("button", { name: "[ EDIT ]" })).toHaveCount(0);
});

test("shows the ladder to a guest", async ({ page }) => {
  await page.goto(projectPath("tooling"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Tooling" });
  await expect(panel.getByText("EVERYONE")).toBeVisible();
  await expect(panel.getByText("1 DONE")).toBeVisible();
  await expect(panel.getByRole("button", { name: "[ EDIT ]" })).toHaveCount(0);
});

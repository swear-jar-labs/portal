import { expect, test, type Page } from "@playwright/test";
import { DOS_SCROLL_ATTR, DOS_ZONE_ATTR } from "@swearjar/dos/contracts";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import { DOC_ZONE } from "../../src/features/shell/zones";
import { projectPath } from "../../src/features/projects/projects";
import { TICKETS_PATH, ticketPath } from "../../src/features/tickets/tickets";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const FEED_REGION = "TICKETS.EXE";
const DOS_THREE = "Table contract for the tickets tracker";
const layers = (page: Page) => page.locator(`[${DOC_LAYER_ATTR}]`);
const feed = (page: Page) => page.getByRole("region", { name: FEED_REGION });
const table = (page: Page) => feed(page).getByRole("table", { name: "TICKETS" });
const focusedBody = (page: Page) =>
  page.locator(`[${DOC_TOP_ATTR}] [${DOS_ZONE_ATTR}="${DOC_ZONE}"] > [${DOS_SCROLL_ATTR}]`);

async function choose(page: Page, label: string, option: string) {
  await feed(page).getByRole("combobox", { name: label }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

test("renders the work queue and deep-links every filter", async ({ page }) => {
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  await expect(page).toHaveTitle("Tickets — Swear Jar Labs");
  await expect(feed(page).getByText("20 TICKETS")).toBeVisible();
  await expect(table(page).getByRole("row")).toHaveCount(21);
  await expect(table(page).getByRole("columnheader")).toHaveText([
    "KEY",
    "TITLE",
    "SIZE",
    "STATUS",
    "PROJECT",
    "ASSIGNEE",
  ]);

  const firstRow = table(page).getByRole("row").nth(1);
  await expect(firstRow).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await firstRow.hover();
  await expect(firstRow).toHaveCSS("background-color", "rgb(192, 192, 192)");
  await expect(firstRow.getByLabel("ada")).toBeVisible();
  await expect(firstRow.getByText("ada", { exact: true })).toHaveCount(0);

  await feed(page).getByRole("combobox", { name: "ASSIGNEE" }).click();
  await expect(page.getByRole("option")).toHaveCount(2);
  await expect(page.getByRole("option", { name: "ALL ASSIGNEES" })).toBeVisible();
  await expect(page.getByRole("option", { name: "UNASSIGNED" })).toBeVisible();
  await page.keyboard.press("Escape");

  await choose(page, "PROJECT", "Compiler");
  await expect(page).toHaveURL("/tickets?project=compiler");
  await expect(table(page).getByRole("row")).toHaveCount(6);
  await choose(page, "SIZE", "S");
  await expect(page).toHaveURL("/tickets?project=compiler&size=S");
  await expect(table(page).getByRole("row")).toHaveCount(3);
  await choose(page, "STATUS", "OPEN");
  await expect(page).toHaveURL("/tickets?project=compiler&size=S&status=open");
  await expect(table(page).getByRole("row")).toHaveCount(2);
  await feed(page).getByRole("textbox", { name: "SEARCH" }).fill("pretty-printer");
  await expect(page).toHaveURL(/q=pretty-printer/);
  await expect(table(page).getByRole("link", { name: "CMP-2" })).toBeVisible();
  await expectNoViolations(page, "filtered tickets tracker");
});

test("opens a ticket by clicking its row", async ({ page }) => {
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  // The row overlay stretches the KEY link across the row, so the title cell
  // belongs to its hit area: the click targets the row.
  await table(page).getByRole("row").filter({ hasText: DOS_THREE }).click();
  await expect(page).toHaveURL(ticketPath("DOS-3"));
  await expect(page.getByRole("region", { name: "DOS-3" })).toBeVisible();
});

test("opens a dossier with metadata, code links and its reverse readroom", async ({ page }) => {
  await page.goto(ticketPath("DOS-3"));
  await waitForHydration(page);

  await expect(layers(page)).toHaveCount(2);
  const dossier = page.getByRole("region", { name: "DOS-3" });
  await expect(dossier.getByRole("heading", { level: 1, name: DOS_THREE })).toBeVisible();
  await expect(dossier.getByText("REVIEW", { exact: true })).toBeVisible();
  await expect(dossier.getByRole("link", { name: "Tickets tracker on Table" })).toHaveAttribute(
    "href",
    "https://github.com/swear-jar-labs/portal/pull/51",
  );
  await expect(
    dossier.getByRole("link", {
      name: "Dissect the allocator that hides a free list behind a bump pointer",
    }),
  ).toHaveAttribute("href", "/readroom/bump-allocator");
  await expect(page).toHaveTitle(`DOS-3: ${DOS_THREE} — Swear Jar Labs`);
  await expectNoViolations(page, "ticket dossier");
});

test("walks the tracker with arrows, opens with Enter and returns focus", async ({ page }) => {
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await focusedBody(page).focus();
  const firstTicket = table(page).getByRole("link", { name: "DOS-1" });
  await page.keyboard.press("ArrowDown");
  await expect(feed(page).getByRole("button", { name: "[ NEW TICKET ]" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(feed(page).getByRole("combobox", { name: "PROJECT" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(firstTicket).toBeFocused();
  await expect(firstTicket.locator("xpath=ancestor::tr")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 170)",
  );
  await page.keyboard.press("ArrowUp");
  await expect(feed(page).getByRole("combobox", { name: "PROJECT" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(firstTicket).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(table(page).getByRole("link", { name: "FLAG-1" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(ticketPath("FLAG-1"));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(TICKETS_PATH);
  await expect(table(page).getByRole("link", { name: "FLAG-1" })).toBeFocused();
});

test("a guest is prompted before composing", async ({ page }) => {
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await feed(page).getByRole("button", { name: "[ NEW TICKET ]" }).click();
  await expect(page.getByRole("dialog", { name: "LOGON REQUIRED" })).toBeVisible();
});

test("a member composes globally and the session ticket opens in place", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await feed(page).getByRole("button", { name: "[ NEW TICKET ]" }).click();
  const form = page.getByRole("form", { name: "NEW TICKET" });
  await form.getByRole("combobox", { name: "PROJECT" }).click();
  await page.getByRole("option", { name: "Compiler", exact: true }).click();
  await form.getByLabel("TITLE").fill("Make the lexer errors legible");
  await form.getByRole("textbox", { name: "BODY" }).fill("Show the offending token and the line.");
  await form.getByRole("button", { name: "BUG" }).click();
  await form.getByRole("button", { name: "[ OPEN TICKET ]" }).click();

  const dossier = page.getByRole("region", { name: "CMP-6" });
  await expect(
    dossier.getByRole("heading", { name: "Make the lexer errors legible" }),
  ).toBeVisible();
  await dossier.getByRole("button", { name: "Close" }).click();
  // The tracker switched to the composed project, so the queue shows it.
  await expect(page).toHaveURL("/tickets?project=compiler");
  await expect(feed(page).getByText("6 TICKETS")).toBeVisible();
  await expect(table(page).getByRole("button", { name: "CMP-6" })).toBeFocused();
});

test("the project entry opens a preselected composer and preserves the project filter", async ({
  page,
}) => {
  await logon(page, "grace");
  await page.goto(projectPath("compiler"));
  await waitForHydration(page);
  const project = page.getByRole("region", { name: "Compiler" });
  await expect(project.getByRole("heading", { name: "LAST UPDATES" })).toBeVisible();
  const updates = project.getByRole("table", { name: "LAST UPDATES" });
  await expect(updates).toBeVisible();
  await expect(updates.getByRole("row")).toHaveCount(6);
  await expect(project.getByRole("link", { name: "ALL PROJECT TICKETS (5) →" })).toHaveAttribute(
    "href",
    "/tickets?project=compiler",
  );
  await project.getByRole("link", { name: "[ NEW TICKET ]" }).click();
  await expect(page).toHaveURL("/tickets?project=compiler&new=1");
  // The entry may arrive as a client navigation or as a fresh document (the
  // suite runs under load): a fresh document must hydrate before the form
  // keeps typed values.
  await waitForHydration(page);
  const form = page.getByRole("form", { name: "NEW TICKET" });
  await expect(form.getByRole("combobox", { name: "PROJECT" })).toContainText("Compiler");
  await form.getByLabel("TITLE").fill("Document the precedence table");
  await form.getByRole("textbox", { name: "BODY" }).fill("One table, one source of truth.");
  await form.getByRole("button", { name: "[ OPEN TICKET ]" }).click();
  await expect(page).toHaveURL("/tickets?project=compiler");
  await expect(page.getByRole("region", { name: "CMP-6" })).toBeVisible();
});

test("a member pins a code link in the dossier", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(ticketPath("DOS-2"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-2" });
  await dossier.getByRole("button", { name: "[ ADD LINK ]" }).click();
  await dossier.getByLabel("URL").fill("https://github.com/swear-jar-labs/portal/commit/abc123");
  await dossier.getByLabel("LABEL").fill("Fix the clock source");
  await dossier.getByRole("button", { name: "[ PIN LINK ]" }).click();
  await expect(dossier.getByRole("link", { name: "Fix the clock source" })).toHaveAttribute(
    "href",
    "https://github.com/swear-jar-labs/portal/commit/abc123",
  );

  // One url per ticket (the database's unique invariant): a duplicate is refused.
  await dossier.getByRole("button", { name: "[ ADD LINK ]" }).click();
  await dossier.getByLabel("URL").fill("https://github.com/swear-jar-labs/portal/commit/abc123");
  await dossier.getByLabel("LABEL").fill("Fix the clock source, again");
  await dossier.getByRole("button", { name: "[ PIN LINK ]" }).click();
  await expect(dossier.getByText("This link is already pinned.")).toBeVisible();
  await expect(
    dossier.getByRole("link", { name: "Fix the clock source", exact: true }),
  ).toHaveCount(1);
});

test("opens an author profile over the dossier and returns focus", async ({ page }) => {
  await page.goto(ticketPath("DOS-2"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-2" });
  const author = dossier.getByRole("link", { name: "ada" });
  await expect(author).toHaveAttribute("href", "/members/ada");

  await author.click();
  await expect(page).toHaveURL("/members/ada");
  await expect(layers(page)).toHaveCount(3);
  await expect(page.getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "ada" })).toBeVisible();
  await expectNoViolations(page, "member layer over a ticket dossier");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(ticketPath("DOS-2"));
  await expect(layers(page)).toHaveCount(2);
  await expect(dossier.getByRole("link", { name: "ada" })).toBeFocused();
});

test("shows PATH NOT FOUND for an unknown ticket", async ({ page }) => {
  await page.goto("/tickets/NOPE-404");
  await expect(page.getByRole("heading", { level: 1, name: "PATH NOT FOUND" })).toBeVisible();
});

import { expect, test, type Locator, type Page } from "@playwright/test";
import { DOS_SCROLL_ATTR, DOS_ZONE_ATTR } from "@swearjar/dos/contracts";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import { DOC_ZONE } from "../../src/features/shell/zones";
import { projectPath } from "../../src/features/projects/model/projects";
import {
  TICKETS_PATH,
  ticketEditButtonId,
  ticketPath,
} from "../../src/features/tickets/model/tickets";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const FEED_REGION = "TICKETS.EXE";
const DOS_THREE = "Table contract for the tickets tracker";
const layers = (page: Page) => page.locator(`[${DOC_LAYER_ATTR}]`);
const feed = (page: Page) => page.getByRole("region", { name: FEED_REGION });
const table = (page: Page) => feed(page).getByRole("table", { name: "TICKETS" });
const assigneeRow = (dossier: Locator) =>
  dossier.getByText("ASSIGNEE", { exact: true }).locator("..");
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
    "PRIORITY",
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
  await expect(table(page).getByRole("row")).toHaveCount(3);
  await feed(page).getByRole("textbox", { name: "SEARCH" }).fill("pretty-printer");
  await expect(page).toHaveURL(/q=pretty-printer/);
  await expect(table(page).getByRole("link", { name: "CMP-2" })).toBeVisible();
  await expectNoViolations(page, "filtered tickets tracker");
});

test("orders and filters the queue by priority", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  const rows = table(page).getByRole("row");

  // HIGH leads, LOW sinks: the tracker sorts by priority before freshness.
  await expect(rows.nth(1).getByRole("link", { name: "DOS-1" })).toBeVisible();
  await expect(rows.nth(2).getByRole("link", { name: "CMP-3" })).toBeVisible();
  await expect(rows.last().getByRole("link", { name: "TOOL-4" })).toBeVisible();

  await choose(page, "PRIORITY", "HIGH");
  await expect(page).toHaveURL("/tickets?priority=high");
  await expect(rows).toHaveCount(3);
  await choose(page, "PRIORITY", "LOW");
  await expect(page).toHaveURL("/tickets?priority=low");
  await expect(rows).toHaveCount(3);

  // The editor moves the priority in the EDIT layer: the queue follows, and the
  // edited ticket rises to the head of its new priority group.
  await choose(page, "PRIORITY", "ALL PRIORITIES");
  await table(page).getByRole("link", { name: "DOS-3" }).click();
  const dossier = page.getByRole("region", { name: "DOS-3" });
  await expect(dossier.getByText("NORMAL", { exact: true })).toBeVisible();
  await dossier.locator(`#${ticketEditButtonId}`).click();
  const layer = page.getByRole("region", { name: "EDIT TICKET" });
  await layer.getByRole("combobox", { name: "PRIORITY" }).click();
  await page.getByRole("option", { name: "HIGH", exact: true }).click();
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(dossier.getByText("HIGH", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(rows.nth(1).getByRole("link", { name: "DOS-3" })).toBeVisible();
  await expectNoViolations(page, "queue ordered by priority");
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
  await expect(feed(page).getByRole("button", { name: "NEW TICKET" })).toBeFocused();
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
  await expect(table(page).getByRole("link", { name: "CMP-3" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(ticketPath("CMP-3"));
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(TICKETS_PATH);
  await expect(table(page).getByRole("link", { name: "CMP-3" })).toBeFocused();
});

test("a guest is prompted before composing", async ({ page }) => {
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await feed(page).getByRole("button", { name: "NEW TICKET" }).click();
  await expect(page.getByRole("dialog", { name: "LOGON REQUIRED" })).toBeVisible();
});

test("a guest reads the dossier and is prompted before commenting", async ({ page }) => {
  await page.goto(ticketPath("DOS-1"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-1" });
  // The status reads as a tag: a guest holds no seat, so no edit control.
  await expect(dossier.getByText("OPEN", { exact: true })).toBeVisible();
  await expect(dossier.locator(`#${ticketEditButtonId}`)).toHaveCount(0);

  await dossier.getByRole("textbox", { name: "COMMENT" }).fill("Looks familiar.");
  await dossier.getByRole("button", { name: "POST COMMENT" }).click();
  await expect(page.getByRole("dialog", { name: "LOGON REQUIRED" })).toBeVisible();
});

test("a member composes globally and the session ticket opens in place", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await feed(page).getByRole("button", { name: "NEW TICKET" }).click();
  const form = page.getByRole("form", { name: "NEW TICKET" });
  await form.getByRole("combobox", { name: "PROJECT" }).click();
  await page.getByRole("option", { name: "Compiler", exact: true }).click();
  await form.getByLabel("TITLE").fill("Make the lexer errors legible");
  await form.getByRole("textbox", { name: "BODY" }).fill("Show the offending token and the line.");
  await form.getByRole("button", { name: "BUG" }).click();
  await form.getByRole("combobox", { name: "PRIORITY" }).click();
  await page.getByRole("option", { name: "HIGH", exact: true }).click();
  await form.getByRole("button", { name: "OPEN TICKET" }).click();

  const dossier = page.getByRole("region", { name: "CMP-6" });
  await expect(
    dossier.getByRole("heading", { name: "Make the lexer errors legible" }),
  ).toBeVisible();
  await expect(dossier.getByText("HIGH", { exact: true })).toBeVisible();
  await dossier.getByRole("button", { name: "Close", exact: true }).click();
  // The tracker switched to the composed project, so the queue shows it.
  await expect(page).toHaveURL("/tickets?project=compiler");
  await expect(feed(page).getByText("6 TICKETS")).toBeVisible();
  await expect(table(page).getByRole("button", { name: "CMP-6" })).toBeFocused();
  await expect(
    table(page).getByRole("row").filter({ hasText: "CMP-6" }).getByText("HIGH"),
  ).toBeVisible();
});

test("the project entry opens a preselected composer and preserves the project filter", async ({
  page,
}) => {
  await logon(page, "grace");
  await page.goto(projectPath("compiler"));
  await waitForHydration(page);
  const project = page.getByRole("region", { name: "Compiler" });
  await project.getByRole("tab", { name: "ACTIVITY" }).click();
  await expect(project.getByRole("heading", { name: "LAST UPDATES" })).toBeVisible();
  const updates = project.getByRole("table", { name: "LAST UPDATES" });
  await expect(updates).toBeVisible();
  await expect(updates.getByRole("row")).toHaveCount(6);
  await expect(project.getByRole("link", { name: "ALL PROJECT TICKETS (5) →" })).toHaveAttribute(
    "href",
    "/tickets?project=compiler",
  );
  await project.getByRole("link", { name: "NEW TICKET" }).click();
  await expect(page).toHaveURL("/tickets?project=compiler&new=1");
  // The entry may arrive as a client navigation or as a fresh document (the
  // suite runs under load): a fresh document must hydrate before the form
  // keeps typed values.
  await waitForHydration(page);
  const form = page.getByRole("form", { name: "NEW TICKET" });
  await expect(form.getByRole("combobox", { name: "PROJECT" })).toContainText("Compiler");
  await form.getByLabel("TITLE").fill("Document the precedence table");
  await form.getByRole("textbox", { name: "BODY" }).fill("One table, one source of truth.");
  await form.getByRole("button", { name: "OPEN TICKET" }).click();
  await expect(page).toHaveURL("/tickets?project=compiler");
  await expect(page.getByRole("region", { name: "CMP-6" })).toBeVisible();
});

test("a member pins a code link in the dossier", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(ticketPath("DOS-2"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-2" });
  await dossier.getByRole("button", { name: "ADD LINK" }).click();
  await dossier.getByLabel("URL").fill("https://github.com/swear-jar-labs/portal/commit/abc123");
  await dossier.getByLabel("LABEL").fill("Fix the clock source");
  await dossier.getByRole("button", { name: "PIN LINK" }).click();
  await expect(dossier.getByRole("link", { name: "Fix the clock source" })).toHaveAttribute(
    "href",
    "https://github.com/swear-jar-labs/portal/commit/abc123",
  );

  // One url per ticket (the database's unique invariant): a duplicate is refused.
  await dossier.getByRole("button", { name: "ADD LINK" }).click();
  await dossier.getByLabel("URL").fill("https://github.com/swear-jar-labs/portal/commit/abc123");
  await dossier.getByLabel("LABEL").fill("Fix the clock source, again");
  await dossier.getByRole("button", { name: "PIN LINK" }).click();
  await expect(dossier.getByText("This link is already pinned.")).toBeVisible();
  await expect(
    dossier.getByRole("link", { name: "Fix the clock source", exact: true }),
  ).toHaveCount(1);

  // The author unpins: the link leaves, the empty state returns.
  await dossier.getByRole("button", { name: "CANCEL" }).click();
  await expect(dossier.getByRole("button", { name: "ADD LINK" })).toBeFocused();
  await dossier.getByRole("button", { name: "Remove link Fix the clock source" }).click();
  await expect(dossier.getByRole("link", { name: "Fix the clock source" })).toHaveCount(0);
  await expect(dossier.getByText("No code links pinned yet.")).toBeVisible();

  // Escape cancels like CANCEL and returns the keyboard to the trigger.
  await dossier.getByRole("button", { name: "ADD LINK" }).click();
  await page.keyboard.press("Escape");
  await expect(dossier.getByLabel("URL")).toHaveCount(0);
  await expect(dossier.getByRole("button", { name: "ADD LINK" })).toBeFocused();
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

test("starts a blocked ticket only after its blocker finishes", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  // The tracker marks the blocked open ticket; a finished blocker leaves none.
  const blockedRow = table(page).getByRole("row").filter({ hasText: "DOS-4" });
  await expect(blockedRow.getByText("BLOCKED")).toBeVisible();
  const finishedRow = table(page).getByRole("row").filter({ hasText: "TOOL-3" });
  await expect(finishedRow.getByText("BLOCKED")).toHaveCount(0);

  // The BLOCKED BY section shows the dependency; Edit refuses to start it.
  await table(page).getByRole("link", { name: "DOS-4" }).click();
  const dossier = page.getByRole("region", { name: "DOS-4" });
  await expect(dossier.getByRole("heading", { name: "BLOCKED BY" })).toBeVisible();
  await expect(dossier.getByText("Waiting for the blockers:")).toHaveCount(0);
  await expect(dossier.getByRole("link", { name: "DOS-3" })).toHaveAttribute(
    "href",
    ticketPath("DOS-3"),
  );
  await dossier.locator(`#${ticketEditButtonId}`).click();
  const layer = page.getByRole("region", { name: "EDIT TICKET" });
  await layer.getByRole("combobox", { name: "STATUS" }).click();
  await page.getByRole("option", { name: "IN PROGRESS", exact: true }).click();
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(layer.getByText("The blockers must finish first: DOS-3")).toBeVisible();
  await layer.getByRole("button", { name: "CANCEL" }).click();

  // Finish the blocker in its own dossier (SPA navigation keeps the session).
  await page.keyboard.press("Escape");
  await table(page).getByRole("link", { name: "DOS-3" }).click();
  const blockerDossier = page.getByRole("region", { name: "DOS-3" });
  await blockerDossier.locator(`#${ticketEditButtonId}`).click();
  await layer.getByRole("combobox", { name: "STATUS" }).click();
  await page.getByRole("option", { name: "DONE", exact: true }).click();
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(blockerDossier.getByText("DONE", { exact: true })).toBeVisible();

  // Ada's existing assignment must be left before she can claim another.
  await page.keyboard.press("Escape");
  await table(page).getByRole("link", { name: "DOS-1" }).click();
  await page
    .getByRole("region", { name: "DOS-1" })
    .getByRole("button", { name: "UNASSIGN ME" })
    .click();
  await page.keyboard.press("Escape");
  // The blocker and one-active-task gates are now open.
  await expect(blockedRow.getByText("BLOCKED")).toHaveCount(0);
  await table(page).getByRole("link", { name: "DOS-4" }).click();
  const opened = page.getByRole("region", { name: "DOS-4" });
  await expect(opened.getByText("TASKS ARE AVAILABLE FOR")).toBeVisible();
  await expect(opened.getByText("EVERYONE")).toBeVisible();
  await opened.getByRole("button", { name: "ASSIGN TO ME" }).click();
  await expect(opened.getByRole("link", { name: "ada" })).toHaveCount(1);

  // The start itself moved to the edit layer and keeps the assignee.
  await opened.locator(`#${ticketEditButtonId}`).click();
  await layer.getByRole("combobox", { name: "STATUS" }).click();
  await page.getByRole("option", { name: "IN PROGRESS", exact: true }).click();
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(opened.getByText("IN PROGRESS", { exact: true })).toBeVisible();
  await expect(opened.getByRole("link", { name: "ada" })).toHaveCount(1);
  await expectNoViolations(page, "started ticket dossier");
});

test("refuses ASSIGN below the ladder rung and explains the need", async ({ page }) => {
  // Coadmin has no active ticket or done record: the ladder is the refusal.
  await logon(page, "coadmin");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  await table(page).getByRole("link", { name: "TOOL-3" }).click();
  const medium = page.getByRole("region", { name: "TOOL-3" });
  await expect(medium.getByText("TASKS NEED")).toBeVisible();
  await expect(medium.getByText("2 DONE")).toBeVisible();
  await expect(medium.getByText("TASKS (YOU HAVE 0)")).toBeVisible();
  await medium.getByRole("button", { name: "ASSIGN TO ME" }).click();
  await expect(assigneeRow(medium).getByText("NOT ASSIGNED")).toBeVisible();
  await page.keyboard.press("Escape");

  await table(page).getByRole("link", { name: "CMP-1" }).click();
  const large = page.getByRole("region", { name: "CMP-1" });
  await expect(large.getByText("TASKS NEED")).toBeVisible();
  await expect(large.getByText("1 DONE")).toBeVisible();
  await expect(large.getByText("TASK (YOU HAVE 0)")).toBeVisible();
  await large.getByRole("button", { name: "ASSIGN TO ME" }).click();
  await expect(assigneeRow(large).getByText("NOT ASSIGNED")).toBeVisible();
  await expectNoViolations(page, "refused ticket claim");
});

test("assigns and leaves a ticket on its dossier", async ({ page }) => {
  // Lin has the M track record but must leave her current active ticket first.
  await logon(page, "lin");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  await table(page).getByRole("link", { name: "TOOL-3" }).click();
  const dossier = page.getByRole("region", { name: "TOOL-3" });
  await expect(dossier.getByText("TASKS NEED")).toBeVisible();
  await expect(dossier.getByText("2 DONE")).toBeVisible();
  await expect(dossier.getByText("TASKS (YOU HAVE 2)")).toBeVisible();
  await dossier.getByRole("button", { name: "ASSIGN TO ME" }).click();
  await expect(
    dossier.getByText("Finish or leave your current active ticket first."),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await table(page).getByRole("link", { name: "TOOL-2" }).click();
  await page
    .getByRole("region", { name: "TOOL-2" })
    .getByRole("button", { name: "UNASSIGN ME" })
    .click();
  await page.keyboard.press("Escape");
  await table(page).getByRole("link", { name: "TOOL-3" }).click();
  // The button answers the keyboard too, not only the mouse.
  await dossier.getByRole("button", { name: "ASSIGN TO ME" }).focus();
  await page.keyboard.press("Enter");
  await expect(assigneeRow(dossier).getByText("NOT ASSIGNED")).toHaveCount(0);
  await expect(dossier.getByRole("button", { name: "UNASSIGN ME" })).toBeVisible();
  await expect(dossier.getByRole("button", { name: "ASSIGN TO ME" })).toHaveCount(0);

  // Leaving frees the ticket with no questions asked.
  await dossier.getByRole("button", { name: "UNASSIGN ME" }).click();
  await expect(assigneeRow(dossier).getByText("NOT ASSIGNED")).toBeVisible();
  await expectNoViolations(page, "assigned ticket dossier");
});

test("opens L to a done-M record and keeps S free for everyone", async ({ page }) => {
  // grace carries a done M (DOS-5): L is open to her.
  await logon(page, "grace");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await table(page).getByRole("link", { name: "DOS-3" }).click();
  await page
    .getByRole("region", { name: "DOS-3" })
    .getByRole("button", { name: "UNASSIGN ME" })
    .click();
  await page.keyboard.press("Escape");
  await table(page).getByRole("link", { name: "CMP-1" }).click();
  const large = page.getByRole("region", { name: "CMP-1" });
  await expect(large.getByText("1 DONE")).toBeVisible();
  await expect(large.getByText("TASK (YOU HAVE 1)")).toBeVisible();
  await large.getByRole("button", { name: "ASSIGN TO ME" }).click();
  await expect(assigneeRow(large).getByText("NOT ASSIGNED")).toHaveCount(0);
  await expect(large.getByRole("button", { name: "UNASSIGN ME" })).toBeVisible();
  await expectNoViolations(page, "claimed L ticket");
});

test("lets a Member without active work take an S ticket", async ({ page }) => {
  // Grace has no Tooling team seat. Leaving her current ticket frees one slot.
  await logon(page, "grace");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await table(page).getByRole("link", { name: "DOS-3" }).click();
  await page
    .getByRole("region", { name: "DOS-3" })
    .getByRole("button", { name: "UNASSIGN ME" })
    .click();
  await page.keyboard.press("Escape");
  await table(page).getByRole("link", { name: "TOOL-4" }).click();
  const dossier = page.getByRole("region", { name: "TOOL-4" });
  await expect(dossier.getByText("TASKS ARE AVAILABLE FOR")).toBeVisible();
  await expect(dossier.getByText("EVERYONE")).toBeVisible();
  await dossier.getByRole("button", { name: "ASSIGN TO ME" }).click();
  await expect(assigneeRow(dossier).getByText("NOT ASSIGNED")).toHaveCount(0);
  await expect(dossier.getByRole("button", { name: "UNASSIGN ME" })).toBeVisible();
});

test("a member with existing work cannot claim a second S ticket", async ({ page }) => {
  await logon(page, "ken");
  await page.goto(ticketPath("TOOL-4"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "TOOL-4" });
  await dossier.getByRole("button", { name: "ASSIGN TO ME" }).click();
  await expect(
    dossier.getByText("Finish or leave your current active ticket first."),
  ).toBeVisible();
  await expect(assigneeRow(dossier).getByText("NOT ASSIGNED")).toBeVisible();
});

test("a guest is prompted before assigning", async ({ page }) => {
  await page.goto(ticketPath("DOS-4"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-4" });
  await dossier.getByRole("button", { name: "ASSIGN TO ME" }).click();
  await expect(page.getByRole("dialog", { name: "LOGON REQUIRED" })).toBeVisible();
});

test("a Participant cannot claim a project ticket", async ({ page }) => {
  await logon(page, "demo-candidate");
  await page.goto(ticketPath("TOOL-4"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "TOOL-4" });
  await dossier.getByRole("button", { name: "ASSIGN TO ME" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    dossier.getByText("Apply for Member access to work on project tickets."),
  ).toBeVisible();
  await expect(assigneeRow(dossier).getByText("NOT ASSIGNED")).toBeVisible();
  await expectNoViolations(page, "Participant ticket claim refusal");
});

test("claim assigns one project reviewer automatically", async ({ page }) => {
  // Coadmin is a Member with no active ticket, outside Tooling's team.
  await logon(page, "coadmin");
  await page.goto(ticketPath("TOOL-4"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "TOOL-4" });
  await dossier.getByRole("button", { name: "ASSIGN TO ME" }).focus();
  await page.keyboard.press("Enter");
  await expect(dossier.getByText("REVIEWER", { exact: true })).toHaveCount(1);
  await expect(
    dossier.getByText("REVIEWER", { exact: true }).locator("..").getByRole("link", { name: "ada" }),
  ).toBeVisible();
  await expect(dossier.getByText("BACKUP REVIEWER")).toHaveCount(0);
  await expectNoViolations(page, "ticket reviewer assignment");
});

test("a maintainer changes the reviewer below assignee in Edit", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(ticketPath("DOS-2"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-2" });
  await dossier.locator(`#${ticketEditButtonId}`).click();
  const layer = page.getByRole("region", { name: "EDIT TICKET" });

  const reviewer = layer.getByRole("combobox", { name: "REVIEWER" });
  await expect(layer.getByRole("combobox", { name: "ASSIGNEE" })).toBeVisible();
  await reviewer.fill("gra");
  await expect(page.getByRole("option", { name: "grace", exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await layer.getByRole("button", { name: "SAVE" }).click();
  const reviewerRow = dossier.getByText("REVIEWER", { exact: true }).locator("..");
  await expect(reviewerRow.getByRole("link", { name: "grace" })).toBeVisible();

  await dossier.locator(`#${ticketEditButtonId}`).click();
  await layer.getByRole("combobox", { name: "REVIEWER" }).fill("ad");
  await expect(page.getByRole("option", { name: "ada", exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(reviewerRow.getByRole("link", { name: "ada" })).toBeVisible();
  await expectNoViolations(page, "manual ticket reviewer change");
});

test("a maintainer sees a three-day check-in signal that work activity clears", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-09-21T08:59:00.000Z") });
  await logon(page, "ada");
  await page.goto(ticketPath("DOS-1"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-1" });
  const signal = dossier.getByText(
    "Three days without a work update. Check in with the assignee; the ticket stays assigned.",
  );
  await expect(signal).toHaveCount(0);
  await page.clock.fastForward(2 * 60_000);
  await expect(signal).toBeVisible();
  await expect(dossier.getByRole("link", { name: "ada" }).first()).toBeVisible();
  await dossier
    .getByRole("textbox", { name: "COMMENT" })
    .fill("Investigated the boot path and found the first-paint race.");
  await dossier.getByRole("button", { name: "POST COMMENT" }).click();
  await expect(signal).toHaveCount(0);
  await expect(dossier.getByRole("link", { name: "ada" }).first()).toBeVisible();
  await expectNoViolations(page, "ticket check-in signal");
});

test("a maintainer manages blockers and the form refuses bad edges", async ({ page }) => {
  // Grace maintains Compiler and can pin and unpin its blockers.
  await logon(page, "grace");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  // A cycle: CMP-2 already waits for CMP-1, so CMP-1 cannot wait for CMP-2.
  await table(page).getByRole("link", { name: "CMP-1" }).click();
  const first = page.getByRole("region", { name: "CMP-1" });
  await first.getByRole("button", { name: "ADD BLOCKER" }).click();
  await first.getByLabel("TICKET KEY").fill("CMP-2");
  await first.getByRole("button", { name: "BLOCK", exact: true }).click();
  await expect(first.getByText("The tickets would wait for each other.")).toBeVisible();
  await first.getByRole("button", { name: "CANCEL" }).click();

  await page.keyboard.press("Escape");
  await table(page).getByRole("link", { name: "CMP-2" }).click();
  const dossier = page.getByRole("region", { name: "CMP-2" });
  await expect(dossier.getByRole("heading", { name: "BLOCKED BY" })).toBeVisible();
  await expect(dossier.getByRole("link", { name: "CMP-1" })).toBeVisible();

  // Unknown keys, self-blocks and duplicates are refused with their own text.
  await dossier.getByRole("button", { name: "ADD BLOCKER" }).click();
  await dossier.getByLabel("TICKET KEY").fill("NOPE-1");
  await dossier.getByRole("button", { name: "BLOCK", exact: true }).click();
  await expect(dossier.getByText("No ticket with this key.")).toBeVisible();
  await dossier.getByLabel("TICKET KEY").fill("CMP-2");
  await dossier.getByRole("button", { name: "BLOCK", exact: true }).click();
  await expect(dossier.getByText("A ticket cannot block itself.")).toBeVisible();
  await dossier.getByLabel("TICKET KEY").fill("CMP-1");
  await dossier.getByRole("button", { name: "BLOCK", exact: true }).click();
  await expect(dossier.getByText("This ticket is already listed as a blocker.")).toBeVisible();
  await dossier.getByRole("button", { name: "CANCEL" }).click();
  await expect(dossier.getByRole("button", { name: "ADD BLOCKER" })).toBeFocused();

  // Escape cancels like CANCEL and returns the keyboard to the trigger.
  await dossier.getByRole("button", { name: "ADD BLOCKER" }).click();
  await page.keyboard.press("Escape");
  await expect(dossier.getByLabel("TICKET KEY")).toHaveCount(0);
  await expect(dossier.getByRole("button", { name: "ADD BLOCKER" })).toBeFocused();

  // Removing the fixture blocker opens the gate; adding it back closes it.
  await dossier.getByRole("button", { name: "Remove blocker CMP-1" }).click();
  await expect(dossier.getByText("Nothing blocks this ticket.")).toBeVisible();
  await expect(dossier.getByRole("link", { name: "CMP-1" })).toHaveCount(0);
  await dossier.getByRole("button", { name: "ADD BLOCKER" }).click();
  await dossier.getByLabel("TICKET KEY").fill("CMP-1");
  await dossier.getByRole("button", { name: "BLOCK", exact: true }).click();
  await expect(dossier.getByRole("link", { name: "CMP-1" })).toBeVisible();
  await expectNoViolations(page, "ticket dossier with blockers");
});

test("guests and ticket authors see blockers without management controls", async ({ page }) => {
  await page.goto(ticketPath("DOS-4"));
  await waitForHydration(page);
  let dossier = page.getByRole("region", { name: "DOS-4" });
  await expect(dossier.getByRole("heading", { name: "BLOCKED BY" })).toBeVisible();
  await expect(dossier.getByRole("link", { name: "DOS-3" })).toBeVisible();
  await expect(dossier.getByRole("button", { name: "ADD BLOCKER" })).toHaveCount(0);
  await expect(dossier.getByRole("button", { name: "Remove blocker DOS-3" })).toHaveCount(0);

  await logon(page, "ken");
  await page.goto(ticketPath("DOS-4"));
  await waitForHydration(page);
  dossier = page.getByRole("region", { name: "DOS-4" });
  await expect(dossier.getByRole("heading", { name: "BLOCKED BY" })).toBeVisible();
  await expect(dossier.getByRole("link", { name: "DOS-3" })).toBeVisible();
  await expect(dossier.locator(`#${ticketEditButtonId}`)).toBeVisible();
  await expect(dossier.getByRole("button", { name: "ADD BLOCKER" })).toHaveCount(0);
  await expect(dossier.getByRole("button", { name: "Remove blocker DOS-3" })).toHaveCount(0);
  await expectNoViolations(page, "read-only ticket blockers");
});

test("searches the project filter from the keyboard", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  // A click opens the whole list; typing narrows it to the match.
  const project = feed(page).getByRole("combobox", { name: "PROJECT" });
  await project.click();
  await expect(page.getByRole("option", { name: /Compiler/ })).toBeVisible();
  await expectNoViolations(page, "ticket queue with the project search open");
  await project.fill("zzz");
  await expect(page.getByText("No projects match.")).toBeVisible();

  // An uncommitted close reverts to the picked project.
  await page.keyboard.press("Escape");
  await expect(project).toHaveValue("ALL PROJECTS");

  await project.fill("comp");
  await expect(page.getByRole("option", { name: /Compiler/ })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/tickets?project=compiler");
  await expect(table(page).getByRole("row")).toHaveCount(6);
  // A pick writes the label back into the box, not the typed text.
  await expect(feed(page).getByRole("combobox", { name: "PROJECT" })).toHaveValue("Compiler");
  // Re-picking the selected project changes no query, yet the full label
  // still lands back over the edited text.
  await project.fill("Compil");
  await page.keyboard.press("Enter");
  await expect(feed(page).getByRole("combobox", { name: "PROJECT" })).toHaveValue("Compiler");
  // A pick advances like ArrowRight: the next filter owns the keyboard.
  await expect(feed(page).getByRole("combobox", { name: "SIZE" })).toBeFocused();

  // A select commits its text the same way: arrows move, Enter picks the
  // highlighted size into the field and advances again.
  const size = feed(page).getByRole("combobox", { name: "SIZE" });
  await page.keyboard.press("Enter");
  await expect(page.getByRole("option", { name: "S", exact: true })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(size).toContainText("S");
  await expect(page).toHaveURL("/tickets?project=compiler&size=S");
  await expect(feed(page).getByRole("combobox", { name: "PRIORITY" })).toBeFocused();

  // The search is the row's last cell: Enter wraps to the first one.
  const search = feed(page).getByLabel("SEARCH");
  await search.fill("dos");
  await page.keyboard.press("Enter");
  await expect(project).toBeFocused();
});

test("pins a blocker picked from the keyboard", async ({ page }) => {
  // CMP-1 belongs to grace: she pins its blockers.
  await logon(page, "grace");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  await table(page).getByRole("link", { name: "CMP-1" }).click();
  const dossier = page.getByRole("region", { name: "CMP-1" });
  await dossier.getByRole("button", { name: "ADD BLOCKER" }).click();
  const box = dossier.getByRole("combobox", { name: "TICKET KEY" });
  await box.fill("dos");
  await expect(page.getByRole("option", { name: /DOS-1/ })).toBeVisible();
  await box.fill("dos-1");
  await page.keyboard.press("Enter");
  await expect(box).toHaveValue("DOS-1");
  // A pick advances to the submit next to the box.
  await expect(dossier.getByRole("button", { name: "BLOCK", exact: true })).toBeFocused();
  await dossier.getByRole("button", { name: "BLOCK", exact: true }).click();
  await expect(dossier.getByRole("link", { name: "DOS-1" })).toBeVisible();
  await expectNoViolations(page, "ticket dossier with a picked blocker");
});

test("moves the status from the edit layer and reopens a closed ticket", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  // DOS-1 is authored by grace: ada edits it as a maintainer of swearjar-dos.
  await table(page).getByRole("link", { name: "DOS-1" }).click();
  const dossier = page.getByRole("region", { name: "DOS-1" });
  await dossier.locator(`#${ticketEditButtonId}`).click();
  const layer = page.getByRole("region", { name: "EDIT TICKET" });
  const status = layer.getByRole("combobox", { name: "STATUS" });
  await status.click();
  await page.getByRole("option", { name: "IN PROGRESS", exact: true }).click();
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(dossier.getByText("IN PROGRESS", { exact: true })).toBeVisible();

  await dossier.locator(`#${ticketEditButtonId}`).click();
  await status.click();
  await page.getByRole("option", { name: "DONE", exact: true }).click();
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(dossier.getByText("DONE", { exact: true })).toBeVisible();
  // The closing stamp lands in the dates row.
  await expect(dossier.getByText("CLOSED", { exact: true })).toBeVisible();

  // Reopening clears the stamp.
  await dossier.locator(`#${ticketEditButtonId}`).click();
  await status.click();
  await page.getByRole("option", { name: "OPEN", exact: true }).click();
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(dossier.getByText("OPEN", { exact: true })).toBeVisible();
  await expect(dossier.getByText("CLOSED", { exact: true })).toHaveCount(0);
  await expectNoViolations(page, "reopened ticket dossier");
});

test("an editor edits a ticket; cancel keeps the draft out", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  // FLAG-1 belongs to flagship: grace authored it, the project has no
  // maintainers, so ada gets no edit control (her comment keeps its own EDIT,
  // so the check targets the ticket button id).
  await table(page).getByRole("link", { name: "FLAG-1" }).click();
  const other = page.getByRole("region", { name: "FLAG-1" });
  await expect(other.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(other.locator(`#${ticketEditButtonId}`)).toHaveCount(0);
  // Ada is neither the author, the assignee nor a maintainer here: no link or
  // blocker controls either.
  await expect(other.getByRole("button", { name: "ADD LINK" })).toHaveCount(0);
  await expect(other.getByRole("button", { name: "ADD BLOCKER" })).toHaveCount(0);
  await page.keyboard.press("Escape");

  // The author edits title, body, tags and priority: SAVE lands in the dossier.
  await table(page).getByRole("link", { name: "DOS-2" }).click();
  const dossier = page.getByRole("region", { name: "DOS-2" });
  await dossier.locator(`#${ticketEditButtonId}`).click();
  const layer = page.getByRole("region", { name: "EDIT TICKET" });
  await expect(layer.getByRole("button", { name: "SAVE" })).toBeDisabled();
  await layer.getByLabel("TITLE").fill("KeyBar clock drifts under load");
  await layer
    .getByRole("textbox", { name: "BODY" })
    .fill("The tick source should survive throttling.");
  await layer.getByRole("button", { name: "TESTING" }).click();
  await layer.getByRole("combobox", { name: "PRIORITY" }).click();
  await page.getByRole("option", { name: "LOW", exact: true }).click();
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(
    dossier.getByRole("heading", { name: "KeyBar clock drifts under load" }),
  ).toBeVisible();
  await expect(dossier.getByText("TESTING", { exact: true })).toBeVisible();
  await expect(dossier.getByText("LOW", { exact: true })).toBeVisible();

  // CANCEL drops the draft and the dossier keeps the saved fields.
  await dossier.locator(`#${ticketEditButtonId}`).click();
  await layer.getByLabel("TITLE").fill("Discarded title");
  await layer.getByRole("button", { name: "CANCEL" }).click();
  await expect(
    dossier.getByRole("heading", { name: "KeyBar clock drifts under load" }),
  ).toBeVisible();
  await expect(dossier.getByText("Discarded title")).toHaveCount(0);
  await expectNoViolations(page, "ticket edit layer");
});

test("the assignee moves status inside their range and touches nothing else", async ({ page }) => {
  // ken holds DOS-2 as assignee (author ada, no maintainer seat): status only.
  await logon(page, "ken");
  await page.goto(ticketPath("DOS-2"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-2" });
  await dossier.locator(`#${ticketEditButtonId}`).click();
  const layer = page.getByRole("region", { name: "EDIT TICKET" });
  await expect(layer.getByLabel("TITLE")).toHaveCount(0);
  await expect(layer.getByRole("textbox", { name: "BODY" })).toHaveCount(0);

  const status = layer.getByRole("combobox", { name: "STATUS" });
  await status.click();
  await expect(page.getByRole("option", { name: "IN PROGRESS", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "REVIEW", exact: true })).toBeVisible();
  await expect(page.getByRole("option", { name: "DONE", exact: true })).toHaveCount(0);
  await page.getByRole("option", { name: "REVIEW", exact: true }).click();
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(dossier.getByText("REVIEW", { exact: true })).toBeVisible();
  await expectNoViolations(page, "assignee edit layer");
});

test("the author fixes content but never the status or the size", async ({ page }) => {
  // Ken authored DOS-4 but is not a Lead or Maintainer of SWEARJAR.DOS.
  await logon(page, "ken");
  await page.goto(ticketPath("DOS-4"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-4" });
  await dossier.locator(`#${ticketEditButtonId}`).click();
  const layer = page.getByRole("region", { name: "EDIT TICKET" });
  await expect(layer.getByLabel("TITLE")).toBeVisible();
  await expect(layer.getByRole("combobox", { name: "STATUS" })).toHaveCount(0);
  await expect(layer.getByRole("combobox", { name: "SIZE" })).toHaveCount(0);
  await expect(layer.getByRole("button", { name: "SAVE" })).toBeDisabled();
  await layer.getByLabel("TITLE").fill("Keep the focus ring visible below sticky headers");
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(
    dossier.getByRole("heading", { name: "Keep the focus ring visible below sticky headers" }),
  ).toBeVisible();
});

test("a maintainer searches Members and can unassign", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(ticketPath("DOS-4"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-4" });
  await expect(assigneeRow(dossier).getByText("NOT ASSIGNED")).toBeVisible();
  await dossier.locator(`#${ticketEditButtonId}`).click();
  const layer = page.getByRole("region", { name: "EDIT TICKET" });
  const assignee = layer.getByRole("combobox", { name: "ASSIGNEE" });
  await expect(assignee).toHaveValue("NOT ASSIGNED");

  await assignee.fill("not-a-real-member");
  await expect(page.getByText("NO MATCHING MEMBERS")).toBeVisible();
  await expect(layer.getByRole("button", { name: "SAVE" })).toBeDisabled();

  await assignee.fill("coad");
  await expect(page.getByRole("option", { name: "coadmin", exact: true })).toBeVisible();
  await page.keyboard.press("Enter");
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(assigneeRow(dossier).getByText("NOT ASSIGNED")).toHaveCount(0);
  await expect(dossier.getByRole("link", { name: "coadmin" }).first()).toBeVisible();

  await dossier.locator(`#${ticketEditButtonId}`).click();
  await layer.getByRole("combobox", { name: "ASSIGNEE" }).click();
  await page.getByRole("option", { name: "NOT ASSIGNED", exact: true }).click();
  await layer.getByRole("button", { name: "SAVE" }).click();
  await expect(assigneeRow(dossier).getByText("NOT ASSIGNED")).toBeVisible();
  await expectNoViolations(page, "maintainer reassignment");
});

test("a member posts a comment on a ticket", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await table(page).getByRole("link", { name: "DOS-2" }).click();
  const dossier = page.getByRole("region", { name: "DOS-2" });
  await expect(dossier.getByRole("heading", { name: "COMMENTS · 1" })).toBeVisible();

  await dossier.getByRole("textbox", { name: "COMMENT" }).fill("The clock source is the culprit.");
  await dossier.getByRole("button", { name: "POST COMMENT" }).click();
  await expect(dossier.getByRole("heading", { name: "COMMENTS · 2" })).toBeVisible();
  await expect(dossier.getByText("The clock source is the culprit.")).toBeVisible();
});

test("edits and deletes an own comment; others stay read-only", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await table(page).getByRole("link", { name: "DOS-2" }).click();
  const dossier = page.getByRole("region", { name: "DOS-2" });

  // The fixture comment belongs to ken: ada only reads it.
  const fixture = dossier.getByRole("article").first();
  await expect(fixture.getByRole("button", { name: "EDIT" })).toHaveCount(0);
  await expect(fixture.getByRole("button", { name: "DELETE" })).toHaveCount(0);

  await dossier.getByRole("textbox", { name: "COMMENT", exact: true }).fill("First pass.");
  await dossier.getByRole("button", { name: "POST COMMENT" }).click();
  const mine = dossier.getByRole("article").nth(1);
  await expect(mine.getByText("First pass.")).toBeVisible();

  // The author edits inline: the mark appears next to the age.
  await mine.getByRole("button", { name: "EDIT" }).click();
  await mine.getByRole("textbox", { name: "EDIT COMMENT" }).fill("Second pass.");
  await mine.getByRole("button", { name: "SAVE" }).click();
  await expect(mine.getByText("Second pass.")).toBeVisible();
  await expect(mine.getByText("[EDITED]")).toBeVisible();

  // The author deletes: the comment becomes a tombstone with no body.
  await mine.getByRole("button", { name: "DELETE" }).click();
  const dialog = page.getByRole("dialog", { name: "DELETE COMMENT" });
  await dialog.getByRole("button", { name: "DELETE" }).click();
  await expect(mine.getByText("This comment was deleted.")).toBeVisible();
  await expect(mine.getByText("Second pass.")).toHaveCount(0);
  await expect(mine.getByRole("button", { name: "EDIT" })).toHaveCount(0);
  await expectNoViolations(page, "ticket dossier after a comment tombstone");
});

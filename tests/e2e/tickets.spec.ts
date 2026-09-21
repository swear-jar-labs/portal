import { expect, test, type Page } from "@playwright/test";
import { DOS_SCROLL_ATTR, DOS_ZONE_ATTR } from "@swearjar/dos/contracts";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import { DOC_ZONE } from "../../src/features/shell/zones";
import { projectPath } from "../../src/features/projects/projects";
import { TICKETS_PATH, ticketEditButtonId, ticketPath } from "../../src/features/tickets/tickets";
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
  await expect(table(page).getByRole("row")).toHaveCount(2);
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
  await layer.getByRole("button", { name: "[ SAVE ]" }).click();
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
  await feed(page).getByRole("button", { name: "[ NEW TICKET ]" }).click();
  await expect(page.getByRole("dialog", { name: "LOGON REQUIRED" })).toBeVisible();
});

test("a guest reads the dossier and is prompted before commenting", async ({ page }) => {
  await page.goto(ticketPath("DOS-1"));
  await waitForHydration(page);
  const dossier = page.getByRole("region", { name: "DOS-1" });
  // The status reads as a tag: only the author and the maintainers edit.
  await expect(dossier.getByText("OPEN", { exact: true })).toBeVisible();
  await expect(dossier.locator(`#${ticketEditButtonId}`)).toHaveCount(0);

  await dossier.getByRole("textbox", { name: "COMMENT" }).fill("Looks familiar.");
  await dossier.getByRole("button", { name: "[ POST COMMENT ]" }).click();
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
  await form.getByRole("combobox", { name: "PRIORITY" }).click();
  await page.getByRole("option", { name: "HIGH", exact: true }).click();
  await form.getByRole("button", { name: "[ OPEN TICKET ]" }).click();

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

test("starts a blocked ticket only after its blocker finishes", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  // The tracker marks the blocked open ticket; a finished blocker leaves none.
  const blockedRow = table(page).getByRole("row").filter({ hasText: "DOS-4" });
  await expect(blockedRow.getByText("BLOCKED")).toBeVisible();
  const finishedRow = table(page).getByRole("row").filter({ hasText: "TOOL-3" });
  await expect(finishedRow.getByText("BLOCKED")).toHaveCount(0);

  // The dossier shows the block; the edit layer refuses to start the ticket.
  await table(page).getByRole("link", { name: "DOS-4" }).click();
  const dossier = page.getByRole("region", { name: "DOS-4" });
  await expect(dossier.getByText("Waiting for the blockers: DOS-3")).toBeVisible();
  await expect(dossier.getByRole("link", { name: "DOS-3" })).toHaveAttribute(
    "href",
    ticketPath("DOS-3"),
  );
  await dossier.locator(`#${ticketEditButtonId}`).click();
  const layer = page.getByRole("region", { name: "EDIT TICKET" });
  await layer.getByRole("combobox", { name: "STATUS" }).click();
  await page.getByRole("option", { name: "IN PROGRESS", exact: true }).click();
  await layer.getByRole("button", { name: "[ SAVE ]" }).click();
  await expect(layer.getByText("The blockers must finish first: DOS-3")).toBeVisible();
  await layer.getByRole("button", { name: "[ CANCEL ]" }).click();

  // Finish the blocker in its own dossier (SPA navigation keeps the session).
  await page.keyboard.press("Escape");
  await table(page).getByRole("link", { name: "DOS-3" }).click();
  const blockerDossier = page.getByRole("region", { name: "DOS-3" });
  await blockerDossier.locator(`#${ticketEditButtonId}`).click();
  await layer.getByRole("combobox", { name: "STATUS" }).click();
  await page.getByRole("option", { name: "DONE", exact: true }).click();
  await layer.getByRole("button", { name: "[ SAVE ]" }).click();
  await expect(blockerDossier.getByText("DONE", { exact: true })).toBeVisible();

  // The gate is open: the start claims the ticket for the editor.
  await page.keyboard.press("Escape");
  await expect(blockedRow.getByText("BLOCKED")).toHaveCount(0);
  await table(page).getByRole("link", { name: "DOS-4" }).click();
  const opened = page.getByRole("region", { name: "DOS-4" });
  await opened.locator(`#${ticketEditButtonId}`).click();
  await layer.getByRole("combobox", { name: "STATUS" }).click();
  await page.getByRole("option", { name: "IN PROGRESS", exact: true }).click();
  await layer.getByRole("button", { name: "[ SAVE ]" }).click();
  await expect(opened.getByText("IN PROGRESS", { exact: true })).toBeVisible();
  await expect(opened.getByRole("link", { name: "ada" })).toHaveCount(1);
  await expectNoViolations(page, "started ticket dossier");
});

test("a member manages blockers and the form refuses bad edges", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);

  // A cycle: CMP-2 already waits for CMP-1, so CMP-1 cannot wait for CMP-2.
  await table(page).getByRole("link", { name: "CMP-1" }).click();
  const first = page.getByRole("region", { name: "CMP-1" });
  await first.getByRole("button", { name: "[ ADD BLOCKER ]" }).click();
  await first.getByLabel("TICKET KEY").fill("CMP-2");
  await first.getByRole("button", { name: "[ BLOCK ]" }).click();
  await expect(first.getByText("The tickets would wait for each other.")).toBeVisible();
  await first.getByRole("button", { name: "[ CANCEL ]" }).click();

  await page.keyboard.press("Escape");
  await table(page).getByRole("link", { name: "CMP-2" }).click();
  const dossier = page.getByRole("region", { name: "CMP-2" });
  await expect(dossier.getByText("Waiting for the blockers: CMP-1")).toBeVisible();
  await expect(dossier.getByRole("link", { name: "CMP-1" })).toBeVisible();

  // Unknown keys, self-blocks and duplicates are refused with their own text.
  await dossier.getByRole("button", { name: "[ ADD BLOCKER ]" }).click();
  await dossier.getByLabel("TICKET KEY").fill("NOPE-1");
  await dossier.getByRole("button", { name: "[ BLOCK ]" }).click();
  await expect(dossier.getByText("No ticket with this key.")).toBeVisible();
  await dossier.getByLabel("TICKET KEY").fill("CMP-2");
  await dossier.getByRole("button", { name: "[ BLOCK ]" }).click();
  await expect(dossier.getByText("A ticket cannot block itself.")).toBeVisible();
  await dossier.getByLabel("TICKET KEY").fill("CMP-1");
  await dossier.getByRole("button", { name: "[ BLOCK ]" }).click();
  await expect(dossier.getByText("This ticket is already pinned.")).toBeVisible();
  await dossier.getByRole("button", { name: "[ CANCEL ]" }).click();

  // Removing the fixture blocker opens the gate; adding it back closes it.
  await dossier.getByRole("button", { name: "Remove blocker CMP-1" }).click();
  await expect(dossier.getByText("Nothing blocks this ticket.")).toBeVisible();
  await expect(dossier.getByText("Waiting for the blockers: CMP-1")).toHaveCount(0);
  await dossier.getByRole("button", { name: "[ ADD BLOCKER ]" }).click();
  await dossier.getByLabel("TICKET KEY").fill("CMP-1");
  await dossier.getByRole("button", { name: "[ BLOCK ]" }).click();
  await expect(dossier.getByText("Waiting for the blockers: CMP-1")).toBeVisible();
  await expectNoViolations(page, "ticket dossier with blockers");
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
  await layer.getByRole("button", { name: "[ SAVE ]" }).click();
  await expect(dossier.getByText("IN PROGRESS", { exact: true })).toBeVisible();

  await dossier.locator(`#${ticketEditButtonId}`).click();
  await status.click();
  await page.getByRole("option", { name: "DONE", exact: true }).click();
  await layer.getByRole("button", { name: "[ SAVE ]" }).click();
  await expect(dossier.getByText("DONE", { exact: true })).toBeVisible();
  // The closing stamp lands in the dates row.
  await expect(dossier.getByText("CLOSED", { exact: true })).toBeVisible();

  // Reopening clears the stamp.
  await dossier.locator(`#${ticketEditButtonId}`).click();
  await status.click();
  await page.getByRole("option", { name: "OPEN", exact: true }).click();
  await layer.getByRole("button", { name: "[ SAVE ]" }).click();
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
  await page.keyboard.press("Escape");

  // The author edits title, body, tags and priority: SAVE lands in the dossier.
  await table(page).getByRole("link", { name: "DOS-2" }).click();
  const dossier = page.getByRole("region", { name: "DOS-2" });
  await dossier.locator(`#${ticketEditButtonId}`).click();
  const layer = page.getByRole("region", { name: "EDIT TICKET" });
  await expect(layer.getByRole("button", { name: "[ SAVE ]" })).toBeDisabled();
  await layer.getByLabel("TITLE").fill("KeyBar clock drifts under load");
  await layer
    .getByRole("textbox", { name: "BODY" })
    .fill("The tick source should survive throttling.");
  await layer.getByRole("button", { name: "TESTING" }).click();
  await layer.getByRole("combobox", { name: "PRIORITY" }).click();
  await page.getByRole("option", { name: "LOW", exact: true }).click();
  await layer.getByRole("button", { name: "[ SAVE ]" }).click();
  await expect(
    dossier.getByRole("heading", { name: "KeyBar clock drifts under load" }),
  ).toBeVisible();
  await expect(dossier.getByText("TESTING", { exact: true })).toBeVisible();
  await expect(dossier.getByText("LOW", { exact: true })).toBeVisible();

  // CANCEL drops the draft and the dossier keeps the saved fields.
  await dossier.locator(`#${ticketEditButtonId}`).click();
  await layer.getByLabel("TITLE").fill("Discarded title");
  await layer.getByRole("button", { name: "[ CANCEL ]" }).click();
  await expect(
    dossier.getByRole("heading", { name: "KeyBar clock drifts under load" }),
  ).toBeVisible();
  await expect(dossier.getByText("Discarded title")).toHaveCount(0);
  await expectNoViolations(page, "ticket edit layer");
});

test("a member posts a comment on a ticket", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(TICKETS_PATH);
  await waitForHydration(page);
  await table(page).getByRole("link", { name: "DOS-2" }).click();
  const dossier = page.getByRole("region", { name: "DOS-2" });
  await expect(dossier.getByRole("heading", { name: "COMMENTS · 1" })).toBeVisible();

  await dossier.getByRole("textbox", { name: "COMMENT" }).fill("The clock source is the culprit.");
  await dossier.getByRole("button", { name: "[ POST COMMENT ]" }).click();
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
  await expect(fixture.getByRole("button", { name: "[ EDIT ]" })).toHaveCount(0);
  await expect(fixture.getByRole("button", { name: "[ DELETE ]" })).toHaveCount(0);

  await dossier.getByRole("textbox", { name: "COMMENT", exact: true }).fill("First pass.");
  await dossier.getByRole("button", { name: "[ POST COMMENT ]" }).click();
  const mine = dossier.getByRole("article").nth(1);
  await expect(mine.getByText("First pass.")).toBeVisible();

  // The author edits inline: the mark appears next to the age.
  await mine.getByRole("button", { name: "[ EDIT ]" }).click();
  await mine.getByRole("textbox", { name: "EDIT COMMENT" }).fill("Second pass.");
  await mine.getByRole("button", { name: "[ SAVE ]" }).click();
  await expect(mine.getByText("Second pass.")).toBeVisible();
  await expect(mine.getByText("[EDITED]")).toBeVisible();

  // The author deletes: the comment becomes a tombstone with no body.
  await mine.getByRole("button", { name: "[ DELETE ]" }).click();
  const dialog = page.getByRole("dialog", { name: "DELETE COMMENT" });
  await dialog.getByRole("button", { name: "[ DELETE ]" }).click();
  await expect(mine.getByText("This comment was deleted.")).toBeVisible();
  await expect(mine.getByText("Second pass.")).toHaveCount(0);
  await expect(mine.getByRole("button", { name: "[ EDIT ]" })).toHaveCount(0);
  await expectNoViolations(page, "ticket dossier after a comment tombstone");
});

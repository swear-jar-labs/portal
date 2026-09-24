import { expect, test, type Page } from "@playwright/test";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import { PROJECTS_PATH, projectPath, projectTabPath } from "../../src/features/projects/projects";
import { threadPath } from "../../src/features/board/threads";
import { ticketEditButtonId, ticketPath } from "../../src/features/tickets/tickets";
import { readroomPath } from "../../src/features/readroom/readrooms";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const layers = (page: Page) => page.locator(`[${DOC_LAYER_ATTR}]`);
const top = (page: Page) => page.locator(`[${DOC_TOP_ATTR}]`);
const CARD = "SWEARJAR.DOS";
const BOOT_THREAD = "Boot sequence: CRT-on before first paint";
const BUMP = "Dissect the allocator that hides a free list behind a bump pointer";

test("cascades the project and the profile above the feed and peels them one by one", async ({
  page,
}) => {
  await logon(page, "admin");
  await page.goto(PROJECTS_PATH);
  await waitForHydration(page);

  await page.getByRole("link", { name: CARD, exact: true }).click();
  await expect(page).toHaveURL(projectPath("swearjar-dos"));
  await expect(layers(page)).toHaveCount(2);
  await expect(page).toHaveTitle(`${CARD} — Swear Jar Labs`);
  await expect(page.getByRole("region", { name: CARD })).toBeVisible();

  await page.getByRole("region", { name: CARD }).getByRole("tab", { name: "TEAM" }).click();
  const lead = page.getByRole("region", { name: CARD }).getByRole("link", { name: "ada" }).first();
  await lead.click();
  await expect(page).toHaveURL("/members/ada");
  await expect(layers(page)).toHaveCount(3);
  await expect(top(page).getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();
  await expect(page).toHaveTitle("ada — Swear Jar Labs");
  await expectNoViolations(page, "profile over the project");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(projectTabPath("swearjar-dos", "team"));
  await expect(layers(page)).toHaveCount(2);
  await expect(lead).toBeFocused();
  await expect(page).toHaveTitle(`${CARD} — Swear Jar Labs`);

  // The store-hosted project panel has no manage provider (it belongs to the
  // direct page's stack): the button adds the interceptor's second panel.
  await page.getByRole("button", { name: "MANAGE TEAM" }).click();
  await expect(page).toHaveURL(`${projectPath("swearjar-dos")}?tab=team&manage=team`);
  await expect(layers(page)).toHaveCount(3);
  await expect(page.getByRole("region", { name: "MANAGE TEAM" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(projectTabPath("swearjar-dos", "team"));
  await expect(layers(page)).toHaveCount(2);

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(PROJECTS_PATH);
  await expect(layers(page)).toHaveCount(1);
  await expect(page.getByRole("link", { name: CARD, exact: true })).toBeFocused();
  await expect(page).toHaveTitle("Projects — Swear Jar Labs");
});

test("opens a journal thread above the project and closes back to it", async ({ page }) => {
  await page.goto(projectPath("swearjar-dos"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: CARD });
  await panel.getByRole("tab", { name: "ACTIVITY" }).click();

  const card = panel.getByRole("link", { name: BOOT_THREAD });
  await card.click();
  await expect(page).toHaveURL(threadPath("swearjar-boot"));
  await expect(layers(page)).toHaveCount(3);
  await expect(top(page).getByRole("region", { name: BOOT_THREAD })).toBeVisible();
  await expect(page).toHaveTitle(`${BOOT_THREAD} — Swear Jar Labs`);
  await expectNoViolations(page, "thread over the project");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(projectTabPath("swearjar-dos", "activity"));
  await expect(layers(page)).toHaveCount(2);
  await expect(card).toBeFocused();
});

test("opens a ticket above the project and the project above the ticket", async ({ page }) => {
  await page.goto(projectPath("swearjar-dos"));
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: CARD });
  await panel.getByRole("tab", { name: "ACTIVITY" }).click();

  // LAST UPDATES: the tracker table reads in the project's ACTIVITY tab.
  const row = panel.getByRole("link", { name: "DOS-1" });
  await expect(row).toHaveAttribute("href", ticketPath("DOS-1"));
  await row.click();
  await expect(page).toHaveURL(ticketPath("DOS-1"));
  await expect(layers(page)).toHaveCount(3);
  const dossier = page.getByRole("region", { name: "DOS-1" });
  await expect(dossier).toBeVisible();
  await expectNoViolations(page, "ticket over the project");

  // The dossier's project link opens the project above the ticket.
  await dossier.getByRole("link", { name: CARD }).click();
  await expect(page).toHaveURL(projectPath("swearjar-dos"));
  await expect(layers(page)).toHaveCount(4);
  await expectNoViolations(page, "project over the ticket");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(ticketPath("DOS-1"));
  await expect(layers(page)).toHaveCount(3);
  // The project layer returns the keyboard to the dossier link that opened it.
  await expect(dossier.getByRole("link", { name: CARD })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(projectTabPath("swearjar-dos", "activity"));
  await expect(layers(page)).toHaveCount(2);
  await expect(row).toBeFocused();
});

test("edits the intercepted dossier through its query panel", async ({ page }) => {
  await logon(page, "grace");
  await page.goto("/tickets");
  await waitForHydration(page);

  await page.getByRole("link", { name: "DOS-1" }).click();
  await expect(page).toHaveURL(ticketPath("DOS-1"));
  await expect(layers(page)).toHaveCount(2);

  // The overlay dossier owns its edit panel as the `?edit=1` query of the
  // same layer: one entry, two panels (the manage=team canon).
  await page.locator(`#${ticketEditButtonId}`).click();
  await expect(page).toHaveURL(`${ticketPath("DOS-1")}?edit=1`);
  await expect(layers(page)).toHaveCount(3);
  const edit = page.getByRole("region", { name: "EDIT TICKET" });
  await expect(edit).toBeVisible();
  await expectNoViolations(page, "ticket edit over the tracker");

  await edit.getByRole("button", { name: "CANCEL" }).click();
  await expect(page).toHaveURL(ticketPath("DOS-1"));
  await expect(layers(page)).toHaveCount(2);
  await expect(page.getByRole("region", { name: "DOS-1" })).toBeVisible();
});

test("opens a readroom ticket as a layer above the task", async ({ page }) => {
  await page.goto(readroomPath("bump-allocator"));
  await waitForHydration(page);
  const task = page.getByRole("region", { name: BUMP });
  await expect(layers(page)).toHaveCount(2);

  const key = task.getByRole("link", { name: "DOS-3" });
  await key.click();
  await expect(page).toHaveURL(ticketPath("DOS-3"));
  await expect(layers(page)).toHaveCount(3);
  await expect(page.getByRole("region", { name: "DOS-3" })).toBeVisible();
  await expectNoViolations(page, "ticket over the readroom");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(readroomPath("bump-allocator"));
  await expect(layers(page)).toHaveCount(2);
  await expect(key).toBeFocused();
});

test("opens a profile thread in the fallback host and returns to the row", async ({ page }) => {
  // The standalone profile has no section stack: the fallback host renders
  // the overlay layer and hides the page behind it.
  await page.goto("/members/ada");
  await waitForHydration(page);
  await expect(layers(page)).toHaveCount(0);

  const row = page.getByRole("link", { name: "CI cache poisoning: how we lost a day" });
  await row.click();
  await expect(page).toHaveURL(threadPath("ci-cache-poisoning"));
  await expect(layers(page)).toHaveCount(1);
  await expect(
    page.getByRole("region", { name: "CI cache poisoning: how we lost a day" }),
  ).toBeVisible();
  await expectNoViolations(page, "thread over the profile host");

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/members/ada");
  await expect(layers(page)).toHaveCount(0);
  await expect(row).toBeFocused();
});

test("opens MANAGE TEAM from the admin queue as a layer over the admin page", async ({ page }) => {
  await logon(page, "admin");
  await page.goto("/admin");
  await waitForHydration(page);
  await page.getByRole("tab", { name: "PROJECT RESPONSIBILITY" }).click();

  const entry = page.getByRole("region", { name: "Flagship" });
  const manage = entry.getByRole("link", { name: "MANAGE TEAM" });
  await manage.click();
  await expect(page).toHaveURL(`${projectPath("flagship")}?tab=team&manage=team`);
  await expect(layers(page)).toHaveCount(2);
  await expect(page.getByRole("region", { name: "MANAGE TEAM" })).toBeVisible();
  await expect(page.getByRole("region", { name: "ADMIN.EXE" })).toHaveCount(0);
  await expectNoViolations(page, "manage team over admin");

  // The host unmounts the page under the layer, so the admin workspace
  // remounts on its first tab after the close (accepted trade-off).
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/admin");
  await expect(layers(page)).toHaveCount(0);
  await expect(page.getByRole("region", { name: "ADMIN.EXE" })).toBeVisible();
});

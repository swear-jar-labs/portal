import { expect, test } from "@playwright/test";
import { INBOX_FEED_ID } from "../../src/features/inbox/inbox";
import { DOS_SCROLL_ATTR } from "@swearjar/dos/contracts";
import { DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import { expectNoViolations, logon } from "./helpers";

test("opens inbox from the tray without resetting the shell clock", async ({ page }) => {
  await logon(page, "ada");

  const tray = page.getByRole("toolbar", { name: "Function keys" });
  const inbox = tray.locator('a[href="/inbox"]');
  await expect(inbox).toHaveAccessibleName(/INBOX/);
  await expect(tray.getByText(/^\d{2}:\d{2}$/)).toBeVisible();

  // The probe survives a client navigation and disappears on a document reload.
  await page.evaluate(() => {
    document.documentElement.dataset.inboxNavigationProbe = "present";
  });
  await inbox.focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL("/inbox");
  await expect
    .poll(() => page.evaluate(() => document.documentElement.dataset.inboxNavigationProbe))
    .toBe("present");
  await expect(tray.getByText("--:--")).toHaveCount(0);
  await expectNoViolations(page, "inbox tray navigation");
});

for (const key of ["Enter", "Space"] as const) {
  test(`hands focus to the inbox panel when INBOX.EXE opens with ${key}`, async ({ page }) => {
    await logon(page, "ada");
    const file = page.locator("#file-INBOX");
    await file.focus();
    await page.keyboard.press(key);

    await expect(page).toHaveURL("/inbox");
    const panel = page.getByRole("region", { name: "INBOX.EXE" });
    await expect(panel.locator(`:scope > [${DOS_SCROLL_ATTR}]`)).toBeFocused();

    await file.focus();
    await page.keyboard.press(key);
    await expect(panel.locator(`:scope > [${DOS_SCROLL_ATTR}]`)).toBeFocused();
    await expectNoViolations(page, `inbox file ${key} focus`);
  });
}

test("walks from the master checkbox through inbox rows and out of the table", async ({ page }) => {
  await logon(page, "ada");
  await page.locator("#file-INBOX").focus();
  await page.keyboard.press("Enter");

  const table = page.getByRole("table", { name: "INBOX" });
  const master = table.getByRole("checkbox", { name: "SELECT ALL MESSAGES" });
  const firstSubject = table.getByRole("button", { name: "Review requested on TOOL-1" });
  const firstCheckbox = table.getByRole("checkbox", {
    name: "SELECT MESSAGE: Review requested on TOOL-1",
  });
  const secondSubject = table.getByRole("button", { name: "DOS-3 moved to REVIEW" });
  const unreadOnly = page.getByRole("checkbox", { name: "UNREAD ONLY" });

  await master.focus();
  await page.keyboard.press("ArrowDown");
  await expect(firstSubject).toBeFocused();
  await expect(table.locator("tbody tr").first()).toHaveCSS("background-color", "rgb(0, 0, 170)");
  await page.keyboard.press("ArrowLeft");
  await expect(firstCheckbox).toBeFocused();
  await expect(table.locator("tbody tr").first()).toHaveCSS("background-color", "rgb(0, 0, 170)");
  await page.keyboard.press("ArrowRight");
  await expect(firstSubject).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowDown");
  await expect(secondSubject).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(firstCheckbox).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowUp");
  await expect(master).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(unreadOnly).toBeFocused();

  await master.focus();
  await page.keyboard.press("ArrowDown");
  const rows = table.locator("tbody tr");
  for (let index = 1; index < (await rows.count()); index++) {
    await page.keyboard.press("ArrowDown");
  }
  await expect(rows.last().getByRole("button")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(unreadOnly).toBeFocused();
  await expectNoViolations(page, "inbox table keyboard walk");
});

test("closes an open message with its title-bar button", async ({ page }) => {
  await logon(page, "ada");
  await page.locator("#file-INBOX").click();
  const row = page.getByRole("button", { name: "DOS-3 moved to REVIEW" });
  await row.click();

  const detail = page.locator(`[${DOC_TOP_ATTR}]`).getByRole("region", { name: "DOS-3" });
  await expect(detail).toBeVisible();
  await detail.getByRole("button", { name: "Close" }).click();

  await expect(detail).toHaveCount(0);
  await expect(row).toBeFocused();
  await expectNoViolations(page, "inbox message close");
});

test("returns focus to the feed when a read message leaves the unread filter", async ({ page }) => {
  await logon(page, "ada");
  await page.locator("#file-INBOX").click();
  await page.getByRole("checkbox", { name: "UNREAD ONLY" }).check();
  const row = page.getByRole("button", { name: "DOS-3 moved to REVIEW" });
  await row.click();

  const detail = page.locator(`[${DOC_TOP_ATTR}]`).getByRole("region", { name: "DOS-3" });
  await detail.getByRole("button", { name: "Close" }).click();

  await expect(row).toHaveCount(0);
  await expect(page.locator(`#${INBOX_FEED_ID}`)).toBeFocused();
  await expectNoViolations(page, "inbox unread filter close");
});

test("marks the inbox file while mail is unread and reports finished states", async ({ page }) => {
  await logon(page, "ada");
  const badge = page.getByRole("toolbar", { name: "Function keys" }).locator('a[href="/inbox"]');
  const inboxIcon = page.locator("#file-INBOX [data-file-icon]");
  await expect(badge).toBeVisible();
  await expect(inboxIcon).toHaveAttribute("data-file-icon", "mailUnread");

  await page.locator("#file-INBOX").click();
  const selectAll = page.getByRole("checkbox", { name: "SELECT ALL MESSAGES" });
  await selectAll.focus();
  await page.keyboard.press("Space");
  await expect(selectAll).toBeChecked();
  await page.getByRole("button", { name: "MARK AS READ" }).click();

  await page.getByRole("checkbox", { name: "UNREAD ONLY" }).check();
  await expect(page.getByText("All caught up. Nothing unread.")).toBeVisible();
  await expect(badge).toHaveCount(0);
  await expect(inboxIcon).toHaveAttribute("data-file-icon", "mail");

  await page.getByRole("checkbox", { name: "UNREAD ONLY" }).uncheck();
  await page.getByRole("checkbox", { name: "SELECT MESSAGE: DOS-3 moved to REVIEW" }).check();
  await page.getByRole("button", { name: "MARK AS UNREAD" }).click();
  await expect(inboxIcon).toHaveAttribute("data-file-icon", "mailUnread");
  await expect(badge).toBeVisible();

  await expect(page.getByRole("button", { name: "MARK ALL READ" })).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "INBOX.EXE" }).getByRole("button", {
      name: "ARCHIVE",
      exact: true,
    }),
  ).toHaveCount(0);
  await expectNoViolations(page, "inbox finished states");
});

test("selects individual and all visible messages for bulk actions", async ({ page }) => {
  await logon(page, "ada");
  await page.locator("#file-INBOX").click();

  const selectAll = page.getByRole("checkbox", { name: "SELECT ALL MESSAGES" });
  const review = page.getByRole("checkbox", {
    name: "SELECT MESSAGE: Review requested on TOOL-1",
  });
  const ticket = page.getByRole("checkbox", {
    name: "SELECT MESSAGE: DOS-3 moved to REVIEW",
  });
  await review.check();
  await expect(review).toBeChecked();
  await expect(ticket).not.toBeChecked();
  await expect(selectAll).not.toBeChecked();
  await page.getByRole("button", { name: "MARK AS READ" }).click();
  await expect(page.getByRole("button", { name: "Review requested on TOOL-1" })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "SELECT MESSAGE: Review requested on TOOL-1" }),
  ).not.toBeChecked();

  await selectAll.check();
  await expect(ticket).toBeChecked();
  await selectAll.uncheck();
  await expect(ticket).not.toBeChecked();

  await page.getByRole("checkbox", { name: "UNREAD ONLY" }).check();
  await selectAll.check();
  await page.getByRole("button", { name: "DELETE" }).click();
  await expect(page.getByText("All caught up. Nothing unread.")).toBeVisible();
  await page.getByRole("checkbox", { name: "UNREAD ONLY" }).uncheck();
  await expect(page.getByRole("button", { name: "Review requested on TOOL-1" })).toBeVisible();
  await expect(page.getByRole("button", { name: "DOS-3 moved to REVIEW" })).toHaveCount(0);
  await expectNoViolations(page, "inbox bulk actions");
});

for (const source of ["tray", "files"] as const) {
  for (const { key, subject } of [
    { key: "DOS-3", subject: "DOS-3 moved to REVIEW" },
    { key: "TOOL-1", subject: "Review requested on TOOL-1" },
  ]) {
    test(`opens ${key} from inbox via ${source} and returns to the message`, async ({ page }) => {
      await logon(page, "ada");
      if (source === "tray") {
        await page
          .getByRole("toolbar", { name: "Function keys" })
          .locator('a[href="/inbox"]')
          .click();
      } else {
        await page.locator("#file-INBOX").click();
      }
      await expect(page).toHaveURL("/inbox");

      await page.getByRole("button", { name: subject }).click();
      const origin = page.getByRole("link", { name: `OPEN ${key}` });
      await expect(origin).toBeVisible();
      await origin.click();

      await expect(page).toHaveURL(`/tickets/${key}`);
      await expect(
        page.locator(`[${DOC_TOP_ATTR}]`).getByRole("region", { name: key }),
      ).toBeVisible();
      await expectNoViolations(page, `${key} over inbox`);

      await page.keyboard.press("Escape");
      await expect(page).toHaveURL("/inbox");
      await expect(origin).toBeFocused();
    });
  }
}

import { expect, test } from "@playwright/test";
import { INBOX_FEED_ID } from "../../src/features/inbox/inbox";
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
  await page.getByRole("button", { name: "MARK ALL READ" }).click();

  await page.getByRole("checkbox", { name: "UNREAD ONLY" }).check();
  await expect(page.getByText("All caught up. Nothing unread.")).toBeVisible();
  await expect(badge).toHaveCount(0);
  await expect(inboxIcon).toHaveAttribute("data-file-icon", "mail");

  await page.getByRole("checkbox", { name: "UNREAD ONLY" }).uncheck();
  await page.getByRole("button", { name: "DOS-3 moved to REVIEW" }).click();
  await page.getByRole("button", { name: "MARK UNREAD" }).click();
  await expect(inboxIcon).toHaveAttribute("data-file-icon", "mailUnread");
  await expect(badge).toBeVisible();
  await page
    .locator(`[${DOC_TOP_ATTR}]`)
    .getByRole("region", { name: "DOS-3" })
    .getByRole("button", { name: "Close" })
    .click();

  await page.getByRole("button", { name: /^ARCHIVE/ }).click();
  await expect(page.getByText("Nothing archived yet. Archived mail waits here.")).toBeVisible();
  await expectNoViolations(page, "inbox finished states");
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

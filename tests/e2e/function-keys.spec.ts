import { expect, test, type Page } from "@playwright/test";
import { DOS_SCROLL_ATTR } from "@swearjar/dos/contracts";
import { SEARCH_FIELD_ID } from "../../src/features/shell/attributes";
import { enterShell, expectNoViolations, logon, waitForHydration } from "./helpers";

const keyBar = (page: Page) => page.getByRole("toolbar", { name: "Function keys" });
const searchKey = (page: Page) => keyBar(page).getByRole("button", { name: "F7 Search" });
const search = (page: Page) => page.locator(`#${SEARCH_FIELD_ID}`);

test("guest disabled keys stay visible, cancel browser actions and are skipped by Tab", async ({
  page,
}) => {
  await enterShell(page);
  for (const name of ["F6 Inbox", "F7 Search", "F9 Settings"]) {
    await expect(keyBar(page).getByRole("button", { name })).toBeDisabled();
  }
  await expect(keyBar(page).getByRole("button")).toHaveCount(10);
  await page.keyboard.press("F6");
  await page.keyboard.press("F7");
  await page.keyboard.press("F9");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("dialog")).toBeHidden();
  const cancelled = await page.evaluate(() =>
    ["F6", "F7", "F9"].map((key) => {
      const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  );
  expect(cancelled).toEqual([true, true, true]);
  await keyBar(page).getByRole("button", { name: "F5 Tickets" }).focus();
  await page.keyboard.press("Tab");
  await expect(keyBar(page).getByRole("button", { name: "F8 Register" })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(keyBar(page).getByRole("button", { name: "F10 Logon" })).toBeFocused();
  await expectNoViolations(page, "fixed guest function key bar");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/login\?next=/);
});

test("preserves modifier shortcuts and does not repeat held function keys", async ({ page }) => {
  await page.goto("/forum");
  await waitForHydration(page);
  await expect(searchKey(page)).toBeEnabled();
  const prevented = await page.evaluate(() => {
    const options = [
      { key: "F5", ctrlKey: true },
      { key: "F7", altKey: true },
      { key: "F9", metaKey: true },
      { key: "F1", repeat: true },
    ];
    return options.map((options) => {
      const event = new KeyboardEvent("keydown", { ...options, bubbles: true, cancelable: true });
      document.body.dispatchEvent(event);
      return event.defaultPrevented;
    });
  });
  expect(prevented).toEqual([false, false, false, true]);
  await expect(page).toHaveURL("/forum");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.keyboard.press("F1");
  await expect(page.getByRole("dialog")).toBeVisible();
  const blocked = await page.evaluate(() => {
    const event = new KeyboardEvent("keydown", { key: "F5", bubbles: true, cancelable: true });
    document.body.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(blocked).toBe(true);
  await expect(page).toHaveURL("/forum");
});

for (const path of ["/forum", "/forum?board=errata", "/readroom", "/tickets"]) {
  test(`F7 focuses and preserves the search on ${path}`, async ({ page }) => {
    await page.goto(path);
    await waitForHydration(page);
    await expect(searchKey(page)).toBeEnabled();
    await page.keyboard.press("F7");
    await expect(search(page)).toBeFocused();
    await page.keyboard.type("retry");
    await expect(search(page)).toHaveValue("retry");
    await expect(page).toHaveURL(/q=retry/);
    await page.getByLabel("Command line").focus();
    await page.keyboard.press("F7");
    await expect(search(page)).toBeFocused();
    await expect(search(page)).toHaveValue("retry");
    await expectNoViolations(page, `search shortcut ${path}`);
  });
}

for (const { path, button } of [
  { path: "/forum", button: "NEW THREAD" },
  { path: "/readroom", button: "NEW TASK" },
  { path: "/tickets", button: "NEW TICKET" },
]) {
  test(`F7 is disabled under the local editor on ${path}`, async ({ page }) => {
    await logon(page);
    await page.goto(path);
    await waitForHydration(page);
    await expect(searchKey(page)).toBeEnabled();
    await page.getByRole("button", { name: button, exact: true }).click();
    await expect(searchKey(page)).toBeDisabled();
    const focusedId = await page.evaluate(() => document.activeElement?.id);
    await page.keyboard.press("F7");
    expect(await page.evaluate(() => document.activeElement?.id)).toBe(focusedId);
    await expectNoViolations(page, `disabled search under ${button}`);
    await page.keyboard.press("Escape");
    await expect(searchKey(page)).toBeEnabled();
    await expect(page.getByRole("button", { name: button, exact: true })).toBeFocused();
    await page.keyboard.press("F7");
    await expect(search(page)).toBeFocused();
  });
}

test("F7 preserves overlay focus and is restored after closing the layer", async ({ page }) => {
  await page.goto("/forum");
  await waitForHydration(page);
  await expect(searchKey(page)).toBeEnabled();
  await page
    .getByRole("region", { name: "FORUM.EXE", exact: true })
    .getByRole("link", {
      name: "Why we write our own parsers: a case for recursive descent",
      exact: true,
    })
    .click();
  await expect(searchKey(page)).toBeDisabled();
  const focused = await page.evaluate(() => document.activeElement?.outerHTML);
  await page.keyboard.press("F7");
  expect(await page.evaluate(() => document.activeElement?.outerHTML)).toBe(focused);
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/forum");
  await expect(searchKey(page)).toBeEnabled();
  await page.keyboard.press("F7");
  await expect(search(page)).toBeFocused();
});

test("section keys focus the destination panel, including an already open section", async ({
  page,
}) => {
  await page.goto("/projects");
  await waitForHydration(page);
  for (const { key, path, title } of [
    { key: "F2", path: "/forum", title: "FORUM.EXE" },
    { key: "F3", path: "/readroom", title: "READROOM.EXE" },
    { key: "F4", path: "/projects", title: "PROJECTS.EXE" },
    { key: "F5", path: "/tickets", title: "TICKETS.EXE" },
  ]) {
    await page.getByLabel("Command line").focus();
    await page.keyboard.press(key);
    await expect(page).toHaveURL(path);
    const body = page
      .getByRole("region", { name: title, exact: true })
      .locator(`:scope > [${DOS_SCROLL_ATTR}]`);
    await expect(body).toBeFocused();
    await page.getByLabel("Command line").focus();
    await page.keyboard.press(key);
    await expect(body).toBeFocused();
  }
});

test("F6 opens Inbox, F9 opens Settings and F10 confirms Logoff", async ({ page }) => {
  await logon(page);
  await page.keyboard.press("F6");
  await expect(page).toHaveURL("/inbox");
  await page.keyboard.press("F9");
  await expect(page).toHaveURL("/settings");
  await page.keyboard.press("F8");
  await expect(page).toHaveURL("/profile");
  await expect(keyBar(page).getByRole("button")).toHaveCount(10);
  await page.keyboard.press("F10");
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("End the session?")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(keyBar(page).getByRole("button", { name: "F10 Logoff" })).toBeEnabled();
  await expectNoViolations(page, "member function key bar");
});

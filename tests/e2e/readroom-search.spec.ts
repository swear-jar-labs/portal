import { expect, test, type Page } from "@playwright/test";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const READROOM = "/readroom";
const feed = (page: Page) => page.getByRole("region", { name: "READROOM.EXE" });
const search = (page: Page) => feed(page).getByRole("textbox", { name: "SEARCH READROOM" });

test("finds a public note and archived write-up, then returns to the URL filters", async ({
  page,
}) => {
  await page.goto(READROOM);
  await waitForHydration(page);
  await expect(search(page)).toHaveAttribute("placeholder", "SEARCH");
  await search(page).fill("retry counter incremented");
  await expect(feed(page).getByText("1 TASK")).toBeVisible();
  await expect(feed(page).getByRole("article")).toHaveCount(1);
  await expect(feed(page).getByRole("article")).toContainText("NOTE");
  await expect(feed(page).getByRole("article").locator("div[class*='searchFragment']")).toHaveCSS(
    "background-color",
    "rgb(0, 0, 170)",
  );
  await feed(page)
    .getByRole("link", { name: "Postmortem read: the retry loop that never slept" })
    .click();
  await expect(page).toHaveURL("/readroom/retry-loop#readroom-note-retry-loop-3");
  await expect(page.locator("#readroom-note-retry-loop-3")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/readroom?q=retry+counter+incremented");
  await expect(page.locator("#readroom-card-retry-loop")).toBeFocused();

  await search(page).fill("slow leak with good manners");
  await expect(feed(page).getByRole("article")).toHaveCount(1);
  await expect(feed(page).getByRole("article")).toContainText("WRITE-UP");
  await feed(page)
    .getByRole("link", { name: "Archived: the token cache that remembered everything" })
    .click();
  await expect(page).toHaveURL("/readroom/token-cache#readroom-report-token-cache");
  await expect(page.locator("#readroom-report-token-cache")).toBeFocused();
  await page.goBack();
  await expect(search(page)).toHaveValue("slow leak with good manners");
  await expectNoViolations(page, "readroom search result");
});

test("query, AND tags and mode combine in the URL; clear restores the feed", async ({ page }) => {
  await page.goto("/readroom?q=retry&mode=new&tag=go");
  await waitForHydration(page);
  await expect(search(page)).toHaveValue("retry");
  await expect(feed(page).getByText("1 TASK")).toBeVisible();
  await expect.poll(() => feed(page).getByRole("article").count()).toBeGreaterThan(1);
  await feed(page).getByRole("button", { name: "Linux" }).click();
  await expect(page).toHaveURL("/readroom?q=retry&mode=new&tag=go&tag=linux");
  await expect(feed(page).getByText("1 TASK")).toBeVisible();
  await feed(page)
    .getByRole("group", { name: "READROOM MODE" })
    .getByRole("button", { name: "ACTIVE" })
    .click();
  await expect(feed(page).getByRole("article")).toHaveCount(0);
  await expect(page).toHaveURL("/readroom?q=retry&mode=active&tag=go&tag=linux");
  await feed(page)
    .getByRole("group", { name: "READROOM MODE" })
    .getByRole("button", { name: "NEW" })
    .click();
  await expect(feed(page).getByText("1 TASK")).toBeVisible();
  await search(page).focus();
  await page.keyboard.press("Enter");
  await expect(search(page)).not.toBeFocused();
  await feed(page).getByRole("button", { name: "CLEAR" }).click();
  await expect(search(page)).toHaveValue("");
  await page.goto("/readroom?tag=rust");
  await waitForHydration(page);
  await expect(feed(page).getByRole("article")).toHaveCount(0);
  await feed(page).getByRole("button", { name: "Rust" }).click();
  await expect(page).toHaveURL(READROOM);
  await expect(feed(page).getByRole("article")).toHaveCount(5);
  await expectNoViolations(page, "readroom search filters");
});

test("a sealed fixture note is absent for guests, its author and admin", async ({ page }) => {
  const sealedQuery = "/readroom?q=max_free_chunks";
  await page.goto(sealedQuery);
  await waitForHydration(page);
  await expect(feed(page).getByRole("article")).toHaveCount(0);
  await expect(feed(page).getByText("0 MATCHES")).toBeVisible();

  for (const user of ["ada", "admin"]) {
    await logon(page, user);
    await page.goto(sealedQuery);
    await waitForHydration(page);
    await expect(feed(page).getByRole("article")).toHaveCount(0);
    await expect(feed(page).getByText("0 MATCHES")).toBeVisible();
    if (user === "ada") {
      await page.getByRole("button", { name: "F9 Logoff" }).click();
      await page.getByRole("button", { name: "LOG OFF" }).click();
      await expect(page).toHaveURL("/");
    }
  }
});

test("a sealed note appears after the deadline when the author repeats the search", async ({
  page,
}) => {
  await logon(page, "ada");
  await page.goto(READROOM);
  await waitForHydration(page);
  await page.clock.install();
  await feed(page).getByRole("button", { name: "NEW TASK" }).click();
  const form = page.getByRole("form", { name: "NEW TASK" });
  await form.getByLabel("TITLE").fill("Clock boundary search task");
  await form.getByRole("textbox", { name: "DESCRIPTION" }).fill("A note will be sealed first.");
  await form.getByRole("button", { name: "OPEN TASK" }).click();
  const task = page.getByRole("region", { name: "Clock boundary search task" });
  await task.getByRole("textbox", { name: "NOTE" }).fill("clock_boundary_unique_token");
  await task.getByRole("button", { name: "POST NOTE" }).click();
  await task.getByRole("button", { name: "Close" }).click();
  await search(page).fill("clock_boundary_unique_token");
  await expect(feed(page).getByRole("article")).toHaveCount(0);
  await expect(feed(page).getByText("0 MATCHES")).toBeVisible();
  await page.clock.fastForward(8 * 24 * 60 * 60 * 1000);
  await expect(feed(page).getByRole("article")).toHaveCount(0);
  // The jump trips the idle screensaver (5 minutes by default): its capture
  // listener eats the first keystroke to wake the screen, so wake it before
  // repeating the search or the repeat never reaches the field.
  const screensaver = page.getByRole("img", { name: "Starfield screensaver" });
  await expect(screensaver).toBeVisible();
  await search(page).focus();
  await page.keyboard.press("Enter");
  await expect(screensaver).toBeHidden();
  await search(page).focus();
  await page.keyboard.press("Enter");
  await expect(feed(page).getByRole("article")).toHaveCount(1);
  await expect(feed(page).getByText("1 MATCH")).toBeVisible();
  await feed(page).getByRole("button", { name: "Clock boundary search task" }).click();
  await expect(page.locator("[id^=readroom-note-local-note-]")).toBeFocused();
});

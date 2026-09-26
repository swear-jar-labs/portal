import { expect, test, type Page } from "@playwright/test";
import { DOS_SCROLL_ATTR } from "@swearjar/dos/contracts";
import { FEED_PATH, threadPath } from "../../src/features/board/threads";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import { expectNoViolations, waitForHydration } from "./helpers";

const READ_FIRST = "READ FIRST: how this board works";
const MEMBER_PATH = "/members/ada";
const CI_CACHE = "CI cache poisoning: how we lost a day";
const layers = (page: Page) => page.locator(`[${DOC_LAYER_ATTR}]`);
const topPanel = (page: Page) => page.locator(`[${DOC_TOP_ATTR}]`);

function authorLink(page: Page) {
  return page
    .getByRole("region", { name: READ_FIRST })
    .getByRole("article")
    .first()
    .getByRole("link", { name: "ada" });
}

test("opens a public member profile from a post and returns from its thread", async ({ page }) => {
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  await expect(layers(page)).toHaveCount(2);
  await expect(page.getByRole("region", { name: "MEMBERS.EXE" })).toHaveCount(0);
  const author = authorLink(page);
  await expect(author).toHaveAttribute("href", MEMBER_PATH);

  // The profile link uses a client navigation instead of reloading the shell.
  await page.evaluate(() => {
    (window as unknown as { sjSpaMarker?: number }).sjSpaMarker = 1;
  });
  await author.click();
  await expect(page).toHaveURL(MEMBER_PATH);
  await expect(layers(page)).toHaveCount(3);
  const layerTops = await layers(page).evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().top),
  );
  expect(layerTops[0]).toBeLessThan(layerTops[1] ?? 0);
  expect(layerTops[1]).toBeLessThan(layerTops[2] ?? 0);
  await expect(page.getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "ada" })).toBeVisible();
  await expect(page.getByText("MAINTAINER", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { sjSpaMarker?: number }).sjSpaMarker),
  ).toBe(1);
  await expect(topPanel(page).locator(`[${DOS_SCROLL_ATTR}]`)).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(threadPath("read-first"));
  await expect(layers(page)).toHaveCount(2);
  await expect(authorLink(page)).toBeFocused();
  await expectNoViolations(page, threadPath("read-first"));
});

test("opens a member profile from a post with Space and Enter", async ({ page }) => {
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);

  const author = authorLink(page);
  await author.focus();
  await page.keyboard.press(" ");
  await expect(page).toHaveURL(MEMBER_PATH);

  await page.goBack();
  await expect(page).toHaveURL(threadPath("read-first"));
  const returnedAuthor = authorLink(page);
  await returnedAuthor.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(MEMBER_PATH);
});

test("opens a member profile from a feed byline and keeps its ring on the edge", async ({
  page,
}) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);

  const card = page.getByRole("article").filter({ hasText: CI_CACHE });
  const author = card.getByRole("link", { name: "ada" });
  await expect(author).toHaveAttribute("href", MEMBER_PATH);
  await author.focus();
  await expect(author).toHaveCSS("outline-offset", "-2px");

  await page.keyboard.press(" ");
  await expect(page).toHaveURL(MEMBER_PATH);
  await expect(layers(page)).toHaveCount(2);
  await expect(topPanel(page).getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);
  await expect(layers(page)).toHaveCount(1);
  await expect(
    page.getByRole("article").filter({ hasText: CI_CACHE }).getByRole("link", { name: "ada" }),
  ).toBeFocused();
});

test("keeps a direct member URL standalone across reload", async ({ page }) => {
  await page.goto(MEMBER_PATH);
  await expect(page.getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();
  await expect(layers(page)).toHaveCount(1);
  await expect(topPanel(page).getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(MEMBER_PATH);
  await expect(page.getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();
  await expect(layers(page)).toHaveCount(1);
  await expect(topPanel(page).getByRole("region", { name: "MEMBERS.EXE" })).toBeVisible();
});

test("shows PATH NOT FOUND for an unknown member", async ({ page }) => {
  await page.goto(`/members/never-registered-${Date.now().toString(36)}`);
  await expect(page.getByRole("heading", { level: 1, name: "PATH NOT FOUND" })).toBeVisible();
});

test("resolves a Member without posts but does not label a Participant as Member", async ({
  page,
}) => {
  await page.goto("/members/admin");
  await expect(page.getByRole("heading", { level: 1, name: "admin" })).toBeVisible();
  await expect(page.getByText("MEMBER", { exact: true })).toBeVisible();

  await page.goto("/members/demo-candidate");
  await expect(page.getByRole("heading", { level: 1, name: "PATH NOT FOUND" })).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { MAX_TAG_QUERY_LENGTH, MAX_TAGS } from "../../src/lib/tags";
import { messages } from "../../src/content/messages";
import { readroomTagIds } from "../../src/features/readroom/model/readrooms";
import { ticketTagIds } from "../../src/features/tickets/model/tickets";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const readroomTags = readroomTagIds.map((tag) => messages.readroom.tags[tag]);

const cases = [
  {
    path: "/tickets?project=dos-shell",
    action: "NEW TICKET",
    form: "NEW TICKET",
    tags: ticketTagIds.map((tag) => messages.tickets.tags[tag]),
    body: "BODY",
    submit: "OPEN TICKET",
  },
];

for (const entry of cases) {
  // The tickets vocabulary (6) fits under the shared cap, so no chip ever
  // disables there; the board and readroom pickers have their own tests below.
  const reachesCap = entry.tags.length > MAX_TAGS;
  test(`${entry.form} caps tags at ${MAX_TAGS} and keyboard walk skips unavailable chips`, async ({
    page,
  }) => {
    await logon(page);
    await page.goto(entry.path);
    await waitForHydration(page);
    await page.getByRole("button", { name: entry.action, exact: true }).click();
    const form = page.getByRole("form", { name: entry.form });
    const chip = (index: number) =>
      form.getByRole("button", { name: entry.tags[index], exact: true });
    const selectable = reachesCap ? MAX_TAGS : entry.tags.length;
    await chip(0).focus();
    for (let index = 0; index < selectable; index++) {
      await expect(chip(index)).toBeFocused();
      await page.keyboard.press("Space");
      await expect(chip(index)).toHaveAttribute("aria-pressed", "true");
      if (index < selectable - 1) await page.keyboard.press("ArrowRight");
    }
    if (reachesCap) {
      const pressedBackground = await chip(selectable - 1).evaluate(
        (node) => getComputedStyle(node).backgroundColor,
      );
      await chip(selectable - 1).hover();
      await expect(chip(selectable - 1)).toHaveCSS("background-color", pressedBackground);
      for (const name of entry.tags.slice(MAX_TAGS))
        await expect(form.getByRole("button", { name, exact: true })).toBeDisabled();
      await page.keyboard.press("ArrowRight");
      await expect(chip(0)).toBeFocused();
      await page.keyboard.press("Space");
      await expect(chip(MAX_TAGS)).toBeEnabled();
      await chip(MAX_TAGS).focus();
      await page.keyboard.press("Space");
      await expect(chip(0)).toBeDisabled();
    } else {
      for (const name of entry.tags)
        await expect(form.getByRole("button", { name, exact: true })).toBeEnabled();
    }
    await expectNoViolations(page, `${entry.form} at tag cap`);
    await page.screenshot({ path: test.info().outputPath("tag-cap.png") });
    await form.getByLabel("TITLE", { exact: true }).fill(`Tag cap ${entry.form}`);
    await form
      .getByRole("textbox", { name: entry.body, exact: true })
      .fill(`${selectable} tags are valid.`);
    if (entry.form === "NEW TICKET") {
      await form.getByRole("combobox", { name: "PROJECT", exact: true }).click();
      await page.getByRole("option", { name: "Compiler", exact: true }).click();
    }
    await form.getByRole("button", { name: entry.submit }).click();
    await expect(form).toHaveCount(0);
    await expect(page.getByText(`Tag cap ${entry.form}`, { exact: true }).first()).toBeVisible();
  });
}

test(`NEW TASK picks tags from the search box and caps at ${MAX_TAGS}`, async ({ page }) => {
  await logon(page);
  await page.goto("/readroom");
  await waitForHydration(page);
  await page.getByRole("button", { name: "NEW TASK", exact: true }).click();
  const form = page.getByRole("form", { name: "NEW TASK" });
  const box = form.getByRole("combobox", { name: "TAGS" });
  const pickedChip = (name: string) => form.getByRole("button", { name, exact: true });

  // The search narrows the 22-tech catalog to the match (the box hydrates
  // behind Suspense after the shell clock: retry the fill until it answers).
  await expect(async () => {
    await box.fill("Rust");
    await expect(page.getByRole("option", { name: "Rust", exact: true })).toBeVisible({
      timeout: 1_000,
    });
  }).toPass();
  await expect(page.getByRole("option", { name: "C", exact: true })).toHaveCount(0);
  // Escape, then clear: a click on an open box would shut it (the popover
  // treats the anchor press as outside), so the box must be closed here.
  await page.keyboard.press("Escape");
  await box.fill("");
  await page.keyboard.press("Escape");

  // Picks read back as removable chips until the shared cap.
  for (const name of readroomTags.slice(0, MAX_TAGS)) {
    await box.click();
    await page.getByRole("option", { name, exact: true }).click();
    await expect(pickedChip(name)).toBeVisible();
  }
  await expect(box).toHaveValue("");

  // At the cap the catalog is empty and names the limit.
  await box.click();
  await expect(page.getByText(messages.readroom.compose.errors.tags)).toBeVisible();
  await page.keyboard.press("Escape");

  // Removing a chip frees a slot for another pick.
  const freedTag = readroomTags[0];
  const overflowTag = readroomTags[MAX_TAGS];
  if (freedTag === undefined || overflowTag === undefined)
    throw new Error("the readroom tag catalog is shorter than the cap");
  await pickedChip(freedTag).click();
  await expect(pickedChip(freedTag)).toHaveCount(0);
  await box.click();
  await page.getByRole("option", { name: overflowTag, exact: true }).click();
  await expect(pickedChip(overflowTag)).toBeVisible();

  await expectNoViolations(page, "NEW TASK at tag cap");
  await page.screenshot({ path: test.info().outputPath("tag-cap.png") });
  await form.getByLabel("TITLE", { exact: true }).fill("Tag cap NEW TASK");
  await form
    .getByRole("textbox", { name: "DESCRIPTION", exact: true })
    .fill(`${MAX_TAGS} tags are valid.`);
  await form.getByLabel("DEADLINE").fill("2026-12-24T18:00");
  await form.getByRole("button", { name: "OPEN TASK" }).click();
  await expect(form).toHaveCount(0);
  await expect(page.getByText("Tag cap NEW TASK", { exact: true }).first()).toBeVisible();
});

test("NEW THREAD picks statuses and techs from one box and caps at 10", async ({ page }) => {
  await logon(page);
  await page.goto("/forum");
  await waitForHydration(page);
  await page.getByRole("button", { name: "NEW THREAD", exact: true }).click();
  const form = page.getByRole("form", { name: "NEW THREAD" });
  const box = form.getByRole("combobox", { name: "TAGS" });
  const pickedChip = (name: string) => form.getByRole("button", { name, exact: true });

  // The query caps at the shared length: longer input truncates.
  await box.pressSequentially("q".repeat(MAX_TAG_QUERY_LENGTH + 8));
  await expect(box).toHaveValue("q".repeat(MAX_TAG_QUERY_LENGTH));
  await box.fill("");
  await page.keyboard.press("Escape");

  // The search narrows the unified catalog: statuses read first, techs after.
  // The box hydrates behind Suspense after the shell clock: retry the fill
  // until it answers.
  await expect(async () => {
    await box.fill("ques");
    await expect(page.getByRole("option", { name: "QUESTION", exact: true })).toBeVisible({
      timeout: 1_000,
    });
  }).toPass();
  await expect(page.getByRole("option", { name: "Rust", exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await box.fill("");
  await page.keyboard.press("Escape");

  // One status plus nine techs reach the shared cap of ten.
  await box.click();
  await page.getByRole("option", { name: "QUESTION", exact: true }).click();
  await expect(pickedChip("QUESTION")).toBeVisible();
  for (const name of readroomTags.slice(0, MAX_TAGS - 1)) {
    await box.click();
    await page.getByRole("option", { name, exact: true }).click();
    await expect(pickedChip(name)).toBeVisible();
  }
  await expect(box).toHaveValue("");

  // At the cap the catalog is empty and names the limit.
  await box.click();
  await expect(page.getByText(messages.board.compose.errors.tags)).toBeVisible();
  await page.keyboard.press("Escape");

  // Removing a chip frees a slot for another pick.
  const overflowTag = readroomTags[MAX_TAGS - 1];
  if (overflowTag === undefined) throw new Error("the tech catalog is shorter than the cap");
  await pickedChip("QUESTION").click();
  await expect(pickedChip("QUESTION")).toHaveCount(0);
  await box.click();
  await page.getByRole("option", { name: overflowTag, exact: true }).click();
  await expect(pickedChip(overflowTag)).toBeVisible();

  await expectNoViolations(page, "NEW THREAD at tag cap");
  await page.screenshot({ path: test.info().outputPath("tag-cap.png") });
  await form.getByLabel("TITLE", { exact: true }).fill("Tag cap NEW THREAD");
  await form.getByRole("textbox", { name: "BODY", exact: true }).fill("Ten tags are valid here.");
  await form.getByRole("button", { name: "POST THREAD" }).click();
  await expect(form).toHaveCount(0);
  const card = page.getByRole("article").filter({ hasText: "Tag cap NEW THREAD" });
  await expect(card).toBeVisible();
  await expect(card.getByText(overflowTag, { exact: true })).toBeVisible();
  await expect(card.getByText("QUESTION", { exact: true })).toHaveCount(0);
  // The status vocabulary reaches the feed chips too.
  await expect(card.getByText("C", { exact: true })).toBeVisible();
});

test("ticket editing fits the whole vocabulary under the cap", async ({ page }) => {
  await logon(page, "grace");
  await page.goto("/tickets/DOS-3");
  await waitForHydration(page);
  await page.getByRole("button", { name: "EDIT", exact: true }).click();
  const form = page.getByRole("form", { name: "EDIT TICKET" });
  // Clear the fixture selection, then take every available tag: six chips fit
  // under the shared cap, so none disables and SAVE lands them all.
  for (const tag of ticketTagIds) {
    const chip = form.getByRole("button", { name: messages.tickets.tags[tag], exact: true });
    if ((await chip.getAttribute("aria-pressed")) === "true") await chip.click();
  }
  for (const tag of ticketTagIds)
    await form.getByRole("button", { name: messages.tickets.tags[tag], exact: true }).click();
  for (const tag of ticketTagIds)
    await expect(
      form.getByRole("button", { name: messages.tickets.tags[tag], exact: true }),
    ).toBeEnabled();
  await form.getByRole("button", { name: "SAVE" }).click();
  await expect(form).toHaveCount(0);
});

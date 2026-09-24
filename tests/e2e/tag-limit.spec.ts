import { expect, test } from "@playwright/test";
import { MAX_TAGS } from "../../src/lib/tags";
import { messages } from "../../src/content/messages";
import { tagIds } from "../../src/features/board/threads";
import { readroomTagIds } from "../../src/features/readroom/readrooms";
import { ticketTagIds } from "../../src/features/tickets/tickets";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const cases = [
  {
    path: "/forum",
    action: "NEW THREAD",
    form: "NEW THREAD",
    tags: tagIds.map((tag) => messages.board.tags[tag]),
    body: "BODY",
    submit: "POST THREAD",
  },
  {
    path: "/readroom",
    action: "NEW TASK",
    form: "NEW TASK",
    tags: readroomTagIds.map((tag) => messages.readroom.tags[tag]),
    body: "DESCRIPTION",
    submit: "OPEN TASK",
  },
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
  // Only the readroom vocabulary (22 techs) reaches the shared cap; the board
  // (7) and the tickets (6) fit under it, so no chip ever disables there.
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
    if (entry.form === "NEW TASK") await form.getByLabel("DEADLINE").fill("2026-12-24T18:00");
    if (entry.form === "NEW TICKET") {
      await form.getByRole("combobox", { name: "PROJECT", exact: true }).click();
      await page.getByRole("option", { name: "Compiler", exact: true }).click();
    }
    await form.getByRole("button", { name: entry.submit }).click();
    await expect(form).toHaveCount(0);
    await expect(page.getByText(`Tag cap ${entry.form}`, { exact: true }).first()).toBeVisible();
  });
}

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

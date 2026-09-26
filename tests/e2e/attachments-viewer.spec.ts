import { expect, test } from "@playwright/test";
import { MAX_PREVIEW_BYTES } from "../../src/features/readroom/model/attachment-preview";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const TASK = "Dissect the allocator that hides a free list behind a bump pointer";

test("views literal source, handles empty and oversized files, and downloads binaries", async ({
  page,
}) => {
  await logon(page, "grace");
  await page.goto("/readroom/bump-allocator");
  await waitForHydration(page);
  const task = page.getByRole("region", { name: TASK });
  const source = "<script>window.viewerExecuted = true</script>\n# literal markdown\n\tПривет";
  await task.locator('input[type="file"]').setInputFiles([
    { name: "source.html", mimeType: "text/html", buffer: Buffer.from(source) },
    { name: "empty.txt", mimeType: "text/plain", buffer: Buffer.alloc(0) },
    { name: "big.txt", mimeType: "text/plain", buffer: Buffer.alloc(MAX_PREVIEW_BYTES + 1, "a") },
    { name: "binary.txt", mimeType: "text/plain", buffer: Buffer.from([65, 0, 66]) },
    { name: "data.zip", mimeType: "application/zip", buffer: Buffer.from([80, 75, 0, 0]) },
  ]);
  const file = task.getByRole("button", { name: "View file source.html" });
  await file.click();
  let dialog = page.getByRole("dialog", { name: "FILE VIEWER: source.html" });
  await expect(dialog.locator("pre")).toHaveText(source);
  expect(await page.evaluate(() => Reflect.get(window, "viewerExecuted"))).toBeUndefined();
  await expectNoViolations(page, "literal HTML viewer");
  await page.screenshot({ path: test.info().outputPath("viewer-desktop.png") });
  const download = page.waitForEvent("download");
  await dialog.getByRole("link", { name: "DOWNLOAD" }).click();
  expect((await download).suggestedFilename()).toBe("source.html");
  await page.keyboard.press("Escape");
  await expect(file).toBeFocused();
  for (const [name, text] of [
    ["empty.txt", "This file is empty."],
    ["big.txt", "This file exceeds the preview limit."],
    ["binary.txt", "Preview is unavailable for this file."],
  ] as const) {
    await task.getByRole("button", { name: `View file ${name}` }).click();
    dialog = page.getByRole("dialog", { name: `FILE VIEWER: ${name}` });
    await expect(dialog.getByText(text, { exact: false })).toBeVisible();
    await expect(dialog.getByRole("link", { name: "DOWNLOAD" })).toBeVisible();
    await page.keyboard.press("Escape");
  }
  const binary = task.getByRole("link", { name: "data.zip" });
  const binaryDownload = page.waitForEvent("download");
  await binary.click();
  expect((await binaryDownload).suggestedFilename()).toBe("data.zip");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("sniffs content when the filename says nothing", async ({ page }) => {
  await logon(page, "grace");
  await page.goto("/readroom/bump-allocator");
  await waitForHydration(page);
  const task = page.getByRole("region", { name: TASK });
  // No extension and no MIME: the row offers the viewer, the bytes decide.
  // setInputFiles cannot carry an empty MIME (it normalizes to octet-stream),
  // so the files arrive through a DataTransfer with a true empty type, like
  // the picker's choice for an extensionless file.
  await task.locator('input[type="file"]').evaluate((input) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(["plain notes"], "notes", { type: "" }));
    transfer.items.add(new File([new Uint8Array([65, 0, 66])], "blob", { type: "" }));
    if (!(input instanceof HTMLInputElement)) throw new Error("file input is missing");
    input.files = transfer.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await task.getByRole("button", { name: "View file notes" }).click();
  let dialog = page.getByRole("dialog", { name: "FILE VIEWER: notes" });
  await expect(dialog.locator("pre")).toHaveText("plain notes");
  await page.keyboard.press("Escape");
  await task.getByRole("button", { name: "View file blob" }).click();
  dialog = page.getByRole("dialog", { name: "FILE VIEWER: blob" });
  await expect(
    dialog.getByText("Preview is unavailable for this file.", { exact: false }),
  ).toBeVisible();
  await expect(dialog.getByRole("link", { name: "DOWNLOAD" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expectNoViolations(page, "sniffed attachments");
});

test("draft preview closes back to the form and a submitted file remains readable on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await logon(page);
  await page.goto("/readroom");
  await waitForHydration(page);
  await page.getByRole("button", { name: "NEW TASK" }).click();
  const form = page.getByRole("form", { name: "NEW TASK" });
  const filename = `${"long_filename_".repeat(8)}.ts`;
  const source = `const example = "${"word".repeat(200)}";\n${"// next line\n".repeat(100)}`;
  await form.getByLabel("ATTACH FILES").focus();
  const choosing = page.waitForEvent("filechooser");
  await page.keyboard.press("Space");
  await (await choosing).setFiles({ name: filename, mimeType: "", buffer: Buffer.from(source) });
  const file = form.getByRole("button", { name: `View file ${filename}` });
  await file.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: `FILE VIEWER: ${filename}` });
  await expect(dialog.locator("pre")).toHaveText(source);
  expect(await dialog.locator("pre").evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(
    true,
  );
  await expectNoViolations(page, "mobile file viewer");
  await page.screenshot({ path: test.info().outputPath("viewer-mobile.png") });
  await page.keyboard.press("Escape");
  await expect(file).toBeFocused();
  await expect(form).toBeVisible();
  await form.getByLabel("TITLE").fill("Files stay with the task");
  await form.getByRole("textbox", { name: "DESCRIPTION" }).fill("Read the attached source.");
  await form.getByLabel("DEADLINE").fill("2026-12-24T18:00");
  await form.getByRole("button", { name: "OPEN TASK" }).click();
  const task = page.getByRole("region", { name: "Files stay with the task" });
  await task.getByRole("button", { name: `View file ${filename}` }).click();
  await expect(dialog.locator("pre")).toHaveText(source);
  await page.keyboard.press("Escape");
  await task.getByRole("button", { name: `Remove file ${filename}` }).click();
  await expect(task.getByLabel("ATTACH FILES")).toBeFocused();
});

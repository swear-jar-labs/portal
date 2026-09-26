import { expect, test } from "@playwright/test";
import { FEED_PATH, threadPath } from "../../src/features/board/model/threads";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const FEED_REGION = "FORUM.EXE";
const READ_FIRST = "READ FIRST: how this board works";
const PIXEL = "tests/e2e/fixtures/pixel.png";

test("writes Markdown with the toolbar and previews it before posting", async ({ page }) => {
  await logon(page);
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });

  await feed.getByRole("button", { name: "NEW THREAD" }).click();
  const form = page.getByRole("form", { name: "NEW THREAD" });
  await form.getByLabel("TITLE").fill("Editor writes Markdown");
  const body = form.getByLabel("BODY");
  await body.fill("free(ptr);");
  await body.press("ControlOrMeta+a");
  await form.getByRole("button", { name: "Code block", exact: true }).click();
  await expect(body).toHaveValue("```\nfree(ptr);\n```");

  await form.getByRole("button", { name: "PREVIEW" }).click();
  await expect(form.locator("pre", { hasText: "free(ptr);" })).toBeVisible();
  await expectNoViolations(page, "compose layer with the editor");

  // Walk order follows the eyes: ▼ from the tabs reaches the toolbar.
  await form.getByRole("button", { name: "WRITE" }).click();
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("button", { name: "Code", exact: true })).toBeFocused();

  await form.getByRole("button", { name: "POST THREAD" }).click();
  const card = feed.getByRole("article").filter({ hasText: "Editor writes Markdown" });
  await card.getByRole("button", { name: "Editor writes Markdown" }).click();
  const thread = page.getByRole("region", { name: "Editor writes Markdown" });
  const opening = thread.getByRole("article").first();
  await expect(opening.locator("pre", { hasText: "free(ptr);" })).toBeVisible();
  await expect(opening).not.toContainText("```");
});

test("inserts images by URL and imitates an upload", async ({ page }) => {
  await logon(page);
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });

  await feed.getByRole("button", { name: "NEW THREAD" }).click();
  const form = page.getByRole("form", { name: "NEW THREAD" });
  await form.getByLabel("TITLE").fill("Editor shows pictures");
  const body = form.getByLabel("BODY");
  await body.fill("see:");

  await form.getByRole("button", { name: "Image", exact: true }).click();
  await form.getByLabel("URL").fill("not a url");
  await form.getByRole("button", { name: "INSERT" }).click();
  await expect(form.getByText("Paste an http(s) image URL.")).toBeVisible();
  await expect(body).toHaveValue("see:");

  await form.getByLabel("URL").fill("https://example.com/bug.jpg");
  await form.getByRole("button", { name: "INSERT" }).click();
  await expect(body).toHaveValue("see:![](<https://example.com/bug.jpg>)");

  // Enter in the URL field inserts instead of submitting the thread form.
  await form.getByLabel("URL").fill("https://example.com/second.jpg");
  await form.getByLabel("URL").press("Enter");
  await expect(body).toHaveValue(
    "see:![](<https://example.com/bug.jpg>)![](<https://example.com/second.jpg>)",
  );
  await expect(page.getByRole("form", { name: "NEW THREAD" })).toBeVisible();

  // The upload is an imitation: the file previews through an object URL for
  // this session and is never stored.
  await form.locator('input[type="file"]').setInputFiles(PIXEL);
  await expect(body).toHaveValue(/see:.*!\[pixel\]\(<blob:/);
  await expect(form.getByText(/Nothing is uploaded/)).toBeVisible();

  await form.getByRole("button", { name: "PREVIEW" }).click();
  await expect(form.locator('img[src="https://example.com/bug.jpg"]')).toBeVisible();
  await expect(form.locator('img[src^="blob:"]')).toBeVisible();
});

test("renders a Markdown reply and edit, not plain text", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });

  await thread.getByRole("textbox", { name: "REPLY" }).fill("A **bold** claim.");
  await thread.getByRole("button", { name: "POST REPLY" }).click();
  const added = thread.getByRole("article").last();
  await expect(added.locator("strong", { hasText: "bold" })).toBeVisible();
  await expect(added).not.toContainText("**bold**");

  await added.getByRole("button", { name: "EDIT" }).click();
  const editor = thread.getByRole("textbox", { name: "EDIT POST" });
  await editor.fill("An *italic* correction.");
  await page.keyboard.press("Shift+Enter");
  await expect(added.locator("em", { hasText: "italic" })).toBeVisible();
  await expect(added).not.toContainText("*italic*");
  await expect(added).toContainText("[EDITED]");
});

test("keeps the keyboard on the tabs across preview switches", async ({ page }) => {
  await logon(page);
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });

  await feed.getByRole("button", { name: "NEW THREAD" }).click();
  const form = page.getByRole("form", { name: "NEW THREAD" });
  const preview = form.getByRole("button", { name: "PREVIEW" });
  await expect(preview).toHaveAttribute("aria-pressed", "false");

  await preview.focus();
  await page.keyboard.press("Enter");
  await expect(preview).toHaveAttribute("aria-pressed", "true");
  await expect(preview).toBeFocused();

  const write = form.getByRole("button", { name: "WRITE" });
  await write.focus();
  await page.keyboard.press("Enter");
  await expect(write).toHaveAttribute("aria-pressed", "true");
  await expect(write).toBeFocused();
});

import { expect, test, type Page } from "@playwright/test";
import { DOC_LAYER_ATTR } from "../../src/features/shell/attributes";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

const FILES = "C:\\SWEARJAR";
const THREAD = "/forum/read-first";
const REPLY = "#board-post-read-first-2";

async function logoff(page: Page) {
  await page.getByRole("button", { name: "F9 Logoff" }).click();
  await page.getByRole("button", { name: "LOG OFF" }).click();
  await expect(page).toHaveURL("/");
}

async function logonSpa(page: Page, user: string) {
  await page.getByRole("region", { name: FILES }).locator("#file-LOGON").click();
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "LOG ON" }).click();
  await expect(page).toHaveURL("/", { timeout: 15_000 });
}

async function openThread(page: Page) {
  await page.getByRole("region", { name: FILES }).locator("#file-FORUM").click();
  await page
    .getByRole("article")
    .filter({ hasText: "READ FIRST: how this board works" })
    .getByRole("link", { name: "READ FIRST: how this board works" })
    .click();
  await expect(page.locator(REPLY)).toBeVisible();
}

test("private report, admin correction request, author edit and resolution", async ({ page }) => {
  await logon(page, "ada");
  await page.goto(THREAD);
  await waitForHydration(page);
  const reply = page.locator(REPLY);
  await reply.getByRole("button", { name: "REPORT" }).click();
  const form = page.getByRole("dialog", { name: "REPORT CONTENT" });
  await form.getByRole("textbox", { name: "Reason" }).fill("This reply includes private data.");
  await form.getByRole("button", { name: "SEND REPORT" }).click();
  await expect(reply.getByText("REPORT SENT")).toBeVisible();
  await expect(page.locator("#file-REPORTS")).toBeVisible();
  await page.locator("#file-REPORTS").click();
  await page.getByRole("button", { name: "OPEN REPORT" }).click();
  await expect(page.getByText("This reply includes private data.")).toBeVisible();
  await page.keyboard.press("Escape");
  await logoff(page);

  await logonSpa(page, "grace");
  await openThread(page);
  await expect(page.locator(REPLY).getByText("REPORT SENT")).toBeVisible();
  await expect(page.locator(REPLY).getByRole("button", { name: "SEND CORRECTION" })).toHaveCount(0);
  await logoff(page);

  await logonSpa(page, "admin");
  await page.getByRole("region", { name: FILES }).locator("#file-ADMIN").click();
  await page.getByRole("tab", { name: "MODERATION" }).click();
  await expect(page.getByText("This reply includes private data.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "PRIVATE REPORTS" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "CASE HISTORY" })).toBeVisible();
  await page
    .getByRole("textbox", { name: "NEW MODERATOR MESSAGE" })
    .fill("Please remove the private detail.");
  await page.getByRole("button", { name: "REQUEST EDIT" }).click();
  await expect(page.getByText("CHANGES REQUESTED")).toBeVisible();
  await expect(page.getByText("Please remove the private detail.")).toBeVisible();
  await page
    .getByRole("textbox", { name: "NEW MODERATOR MESSAGE" })
    .fill("Hidden until corrected.");
  await page.getByRole("button", { name: "HIDE NOW" }).click();
  await expect(page.getByText("CHANGES REQUESTED")).toBeVisible();
  await page.getByRole("link", { name: "OPEN MATERIAL" }).click();
  await expect(page.locator(`[${DOC_LAYER_ATTR}]`)).toHaveCount(2);
  await expect(page.locator(REPLY)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("tab", { name: "MODERATION" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("link", { name: "OPEN MATERIAL" })).toBeFocused();
  await expectNoViolations(page, "admin moderation queue");
  await logoff(page);

  await logonSpa(page, "ken");
  await openThread(page);
  await expect(page.locator(REPLY).getByText("Pinned. If a thread drifts")).toHaveCount(0);
  await expect(page.locator(REPLY).getByText("This material is temporarily hidden")).toBeVisible();
  await logoff(page);

  await logonSpa(page, "grace");
  await expect(page.locator("#file-REPORTS")).toBeVisible();
  await page.locator("#file-REPORTS").click();
  await page.getByRole("tab", { name: "ON MY CONTENT" }).click();
  await expect(page.getByText("NEW")).toBeVisible();
  await page.getByRole("button", { name: "OPEN REPORT" }).click();
  await expect(page.getByText("Please remove the private detail.")).toBeVisible();
  await expect(page.getByText("This reply includes private data.")).toHaveCount(0);
  await expectNoViolations(page, "personal reports");
  await page.keyboard.press("Escape");
  await openThread(page);
  const ownReply = page.locator(REPLY);
  await expect(ownReply.getByRole("button", { name: "MODERATION NOTE" })).toHaveCount(0);
  await expect(ownReply.getByText("This reply includes private data.")).toHaveCount(0);
  await ownReply.getByRole("button", { name: "EDIT", exact: true }).click();
  await ownReply.getByRole("textbox", { name: "EDIT POST" }).fill("Updated after review.");
  await ownReply.getByRole("button", { name: "SAVE" }).click();
  await expect(ownReply.getByRole("button", { name: "SEND CORRECTION" })).toBeVisible();
  await page.locator("#file-REPORTS").click();
  await page.getByRole("tab", { name: "ON MY CONTENT" }).click();
  await page.getByRole("button", { name: "OPEN REPORT" }).click();
  await expect(page.getByText("Your saved changes are ready to send to moderation.")).toBeVisible();
  await page.getByRole("button", { name: "SEND CORRECTION" }).click();
  await expect(page.getByText("CORRECTION SENT")).toBeVisible();
  await expect(page.getByRole("button", { name: "SEND CORRECTION" })).toHaveCount(0);
  await openThread(page);
  await expect(page.locator(REPLY).getByText("CORRECTION SENT")).toBeVisible();
  await expect(page.locator(REPLY).getByText("REPORT SENT")).toHaveCount(0);
  await logoff(page);

  await logonSpa(page, "admin");
  await page.getByRole("region", { name: FILES }).locator("#file-ADMIN").click();
  await page.getByRole("tab", { name: "MODERATION" }).click();
  await expect(page.getByText("AUTHOR REPORTED A CORRECTION", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "RESTORE" }).click();
  await page.getByRole("button", { name: "RESOLVE" }).click();
  const resolve = page.getByRole("dialog", { name: "RESOLVE REPORT" });
  await expect(resolve.getByRole("combobox", { name: "RESOLUTION OUTCOME" })).toBeFocused();
  await expectNoViolations(page, "resolve report dialog");
  await resolve.getByRole("combobox", { name: "RESOLUTION OUTCOME" }).click();
  await page.getByRole("option", { name: "CORRECTED" }).click();
  await resolve.getByRole("textbox", { name: "DECISION EXPLANATION" }).fill("Correction accepted.");
  await resolve.getByRole("button", { name: "RESOLVE" }).click();
  await expect(page.getByText("FORUM POST · RESOLVED", { exact: false })).toBeVisible();
  await logoff(page);

  await logonSpa(page, "ada");
  await openThread(page);
  await expect(page.locator(REPLY).getByText("REPORT SENT")).toHaveCount(0);
  await expect(page.locator("#file-REPORTS")).toBeVisible();
  await page.locator("#file-REPORTS").click();
  await page.getByRole("button", { name: "OPEN REPORT" }).click();
  const sentDetail = page.getByRole("region", { name: "REPORT DETAILS" });
  await expect(sentDetail.getByText("REPORT RESOLVED")).toBeVisible();
  await expect(sentDetail.getByText("Correction accepted.")).toBeVisible();
});

test("opens a reported session post as a local admin stack layer", async ({ page }) => {
  const title = "A session-only moderation example";
  const body = "A transient post still needs review.";
  await logon(page, "ada");
  await page.goto("/forum");
  await waitForHydration(page);
  await page.getByRole("button", { name: "NEW THREAD" }).click();
  const compose = page.getByRole("form", { name: "NEW THREAD" });
  await compose.getByLabel("TITLE").fill(title);
  await compose.getByLabel("BODY").fill(body);
  await compose.getByRole("button", { name: "POST THREAD" }).click();
  await logoff(page);

  await logonSpa(page, "ken");
  await page.getByRole("region", { name: FILES }).locator("#file-FORUM").click();
  await page
    .getByRole("article")
    .filter({ hasText: title })
    .getByRole("button", { name: title })
    .click();
  const post = page.getByRole("region", { name: title }).getByRole("article").first();
  await post.getByRole("button", { name: "REPORT" }).click();
  const form = page.getByRole("dialog", { name: "REPORT CONTENT" });
  await form.getByRole("textbox", { name: "Reason" }).fill("The session post needs review.");
  await form.getByRole("button", { name: "SEND REPORT" }).click();
  await logoff(page);

  await logonSpa(page, "admin");
  await page.getByRole("region", { name: FILES }).locator("#file-ADMIN").click();
  await page.getByRole("tab", { name: "MODERATION" }).click();
  await page.getByRole("button", { name: "OPEN MATERIAL" }).click();
  await expect(page.locator(`[${DOC_LAYER_ATTR}]`)).toHaveCount(2);
  await expect(
    page.getByRole("region", { name: "REPORTED MATERIAL" }).getByText(body),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "OPEN MATERIAL" })).toBeFocused();
  await page
    .getByRole("textbox", { name: "NEW MODERATOR MESSAGE" })
    .fill("Keep the session post hidden during review.");
  await page.getByRole("button", { name: "HIDE NOW" }).click();
  await logoff(page);

  await logonSpa(page, "ken");
  await page.locator("#file-REPORTS").click();
  await page.getByRole("button", { name: "OPEN REPORT" }).click();
  await page.getByRole("button", { name: "OPEN MATERIAL" }).click();
  const reporterPreview = page.getByRole("region", { name: "REPORTED MATERIAL" });
  await expect(reporterPreview.getByText(body)).toHaveCount(0);
  await expect(reporterPreview.getByText("This material is temporarily hidden")).toBeVisible();
});

test("groups complaints and lets the author request review in the same case", async ({ page }) => {
  for (const [index, [user, reason]] of (
    [
      ["ada", "This post includes a private address."],
      ["ken", "This post also includes a personal name."],
    ] as const
  ).entries()) {
    if (index === 0) await logon(page, user);
    else await logonSpa(page, user);
    await openThread(page);
    await page.locator(REPLY).getByRole("button", { name: "REPORT" }).click();
    const dialog = page.getByRole("dialog", { name: "REPORT CONTENT" });
    await dialog.getByRole("textbox", { name: "Reason" }).fill(reason);
    await dialog.getByRole("button", { name: "SEND REPORT" }).click();
    await logoff(page);
  }

  await logonSpa(page, "grace");
  await expect(page.locator("#file-REPORTS")).toBeVisible();
  await page.locator("#file-REPORTS").click();
  await page.getByRole("tab", { name: "ON MY CONTENT" }).click();
  await expect(page.getByRole("button", { name: "OPEN REPORT" })).toHaveCount(1);
  await page.getByRole("button", { name: "OPEN REPORT" }).click();
  const authorDetail = page.getByRole("region", { name: "REPORT DETAILS" });
  await expect(authorDetail.getByText("CASE OPENED", { exact: false })).toBeVisible();
  await expect(authorDetail.getByText("This post includes a private address.")).toHaveCount(0);
  await expect(authorDetail.getByText("This post also includes a personal name.")).toHaveCount(0);
  await logoff(page);

  await logonSpa(page, "admin");
  await page.getByRole("region", { name: FILES }).locator("#file-ADMIN").click();
  await page.getByRole("tab", { name: "MODERATION" }).click();
  await expect(page.getByRole("heading", { name: "PRIVATE REPORTS" })).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "NEW MODERATOR MESSAGE" })
    .fill("Hidden while we check the private details.");
  await page.getByRole("button", { name: "HIDE NOW" }).click();
  await page.getByRole("button", { name: "RESOLVE" }).click();
  const hiddenResolution = page.getByRole("dialog", { name: "RESOLVE REPORT" });
  await hiddenResolution.getByRole("combobox", { name: "RESOLUTION OUTCOME" }).click();
  await page.getByRole("option", { name: "REMAIN HIDDEN" }).click();
  await hiddenResolution
    .getByRole("textbox", { name: "DECISION EXPLANATION" })
    .fill("The private details must stay hidden.");
  await hiddenResolution.getByRole("button", { name: "RESOLVE" }).click();
  await logoff(page);

  await logonSpa(page, "grace");
  await openThread(page);
  const post = page.locator(REPLY);
  await expect(
    post.getByText("This material remains hidden after the case was resolved."),
  ).toBeVisible();
  await post.getByRole("button", { name: "REQUEST REVIEW" }).click();
  const review = page.getByRole("dialog", { name: "REQUEST REVIEW" });
  await review
    .getByRole("textbox", { name: "YOUR MESSAGE TO MODERATION" })
    .fill("I removed the private detail in another source; please reconsider.");
  await expectNoViolations(page, "author review request");
  await review.getByRole("button", { name: "REQUEST REVIEW" }).click();
  await expect(post.getByText("REPORT SENT")).toBeVisible();
  await logoff(page);

  await logonSpa(page, "admin");
  await page.getByRole("region", { name: FILES }).locator("#file-ADMIN").click();
  await page.getByRole("tab", { name: "MODERATION" }).click();
  await expect(
    page.getByText("I removed the private detail in another source; please reconsider."),
  ).toBeVisible();
  await page.getByRole("button", { name: "RESOLVE" }).click();
  const reviewResolution = page.getByRole("dialog", { name: "RESOLVE REPORT" });
  await reviewResolution.getByRole("combobox", { name: "RESOLUTION OUTCOME" }).click();
  await page.getByRole("option", { name: "REMAIN HIDDEN" }).click();
  await reviewResolution
    .getByRole("textbox", { name: "DECISION EXPLANATION" })
    .fill("The details still need to stay hidden.");
  await reviewResolution.getByRole("button", { name: "RESOLVE" }).click();
  await logoff(page);

  await logonSpa(page, "grace");
  await openThread(page);
  await post.getByRole("button", { name: "ADD INFORMATION" }).click();
  await page
    .getByRole("dialog", { name: "ADD INFORMATION" })
    .getByRole("textbox", { name: "YOUR MESSAGE TO MODERATION" })
    .fill("Here is the source proving the private detail was removed.");
  await page
    .getByRole("dialog", { name: "ADD INFORMATION" })
    .getByRole("button", { name: "ADD INFORMATION" })
    .click();
  await logoff(page);

  await logonSpa(page, "admin");
  await page.getByRole("region", { name: FILES }).locator("#file-ADMIN").click();
  await page.getByRole("tab", { name: "MODERATION" }).click();
  await expect(
    page.getByText("Here is the source proving the private detail was removed."),
  ).toBeVisible();
  await page.getByRole("button", { name: "REOPEN REVIEW" }).click();
  await page.getByRole("button", { name: "RESTORE" }).click();
  await page.getByRole("button", { name: "RESOLVE" }).click();
  const restoredResolution = page.getByRole("dialog", { name: "RESOLVE REPORT" });
  await restoredResolution.getByRole("combobox", { name: "RESOLUTION OUTCOME" }).click();
  await page.getByRole("option", { name: "NO VIOLATION" }).click();
  await restoredResolution
    .getByRole("textbox", { name: "DECISION EXPLANATION" })
    .fill("The post can remain visible.");
  await restoredResolution.getByRole("button", { name: "RESOLVE" }).click();
  await logoff(page);

  await logonSpa(page, "grace");
  await openThread(page);
  await expect(page.locator(REPLY).getByText("REPORT SENT")).toHaveCount(0);
  await expect(
    page.locator(REPLY).getByText("Pinned. If a thread drifts", { exact: false }),
  ).toBeVisible();
});

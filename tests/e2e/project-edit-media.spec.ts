import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { PROJECTS_CARD_ATTR } from "@/features/projects/model/projects";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

async function logoff(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "F10 Logoff" }).click();
  await page.getByRole("button", { name: "LOG OFF" }).click();
  await expect(page).toHaveURL("/");
}

test("project screenshots keep their own aspect ratios in the dossier and card", async ({
  page,
}) => {
  await page.goto("/projects/tooling");
  const dossier = page.getByRole("region", { name: "Tooling" });
  const log = dossier.getByRole("img", { name: "Tooling build log with completed checks" });
  const logBox = await log.boundingBox();
  expect(logBox).not.toBeNull();
  if (!logBox) return;
  expect(logBox.width / logBox.height).toBeCloseTo(4 / 3, 1);
  expect(logBox.height).toBeLessThanOrEqual(400);

  await page.goto("/projects");
  const card = page
    .locator(`article[${PROJECTS_CARD_ATTR}]`)
    .filter({ has: page.getByRole("link", { name: "Tooling" }) });
  const cardLog = card.getByRole("img", { name: "Tooling build log with completed checks" });
  const cardBox = await cardLog.boundingBox();
  expect(cardBox).not.toBeNull();
  if (!cardBox) return;
  expect(cardBox.width / cardBox.height).toBeCloseTo(4 / 3, 1);
  expect(cardBox.height).toBeLessThanOrEqual(400);
});

test("CANCEL closes a directly linked project editor", async ({ page }) => {
  await logon(page, "grace");
  await page.goto("/projects/compiler?manage=edit");
  await waitForHydration(page);
  await page
    .getByRole("form", { name: "EDIT PROJECT" })
    .getByRole("button", { name: "CANCEL" })
    .click();
  await expect(page).toHaveURL("/projects/compiler");
  await expect(page.getByRole("region", { name: "EDIT PROJECT" })).toHaveCount(0);
});

test("CANCEL closes only the editor in a project overlay", async ({ page }) => {
  await logon(page, "grace");
  await page.goto("/projects");
  await waitForHydration(page);
  await page.getByRole("link", { name: "Compiler" }).click();
  const project = page.getByRole("region", { name: "Compiler" });
  await project.getByRole("button", { name: "EDIT PROJECT" }).click();
  await page
    .getByRole("form", { name: "EDIT PROJECT" })
    .getByRole("button", { name: "CANCEL" })
    .click();
  await expect(page).toHaveURL("/projects/compiler");
  await expect(page.getByRole("region", { name: "EDIT PROJECT" })).toHaveCount(0);
  await expect(project).toBeVisible();
});

test("a Maintainer edits a new project's details and screenshots across accounts and reload", async ({
  page,
}) => {
  test.setTimeout(120_000);
  const slug = `media-${crypto.randomUUID().slice(0, 8)}`;
  const initialName = `Media ${slug}`;
  const editedName = `Edited ${initialName}`;
  const path = `/projects/${slug}`;
  await logon(page, "grace");
  await page.goto("/projects/propose");
  await waitForHydration(page);
  const proposal = page.getByRole("form", { name: "PROPOSE A PROJECT" });
  await proposal.getByLabel("Project name").fill(initialName);
  await proposal.getByLabel("Project URL slug").fill(slug);
  await proposal
    .getByLabel("Goal and scope")
    .fill("A small project for reviewing media editing and project details.");
  await proposal
    .getByLabel("What help or contributors are needed?")
    .fill("Members can review screenshots and documentation.");
  await proposal.getByRole("combobox", { name: "Stack" }).fill("TypeScript");
  await page.getByRole("option", { name: "TypeScript" }).click();
  await proposal.getByRole("button", { name: "SUBMIT PROPOSAL" }).click();
  await expect(
    page
      .getByRole("region", { name: new RegExp(initialName) })
      .getByText("Waiting for admin review."),
  ).toBeVisible();
  await logoff(page);

  await logon(page, "admin");
  await page.goto("/admin");
  await page.getByRole("tab", { name: "PROJECT PROPOSALS" }).click();
  const review = page.getByRole("region", { name: `${initialName} grace`, exact: false });
  await review.getByRole("button", { name: "APPROVE" }).click();
  await expect(review.getByText("This application has a final decision.")).toBeVisible();
  await logoff(page);

  await logon(page, "grace");
  await page.goto(path);
  await waitForHydration(page);
  const project = page.getByRole("region", { name: initialName });
  await expect(project.getByText("No screenshots yet.")).toBeVisible();
  await project.getByRole("button", { name: "EDIT PROJECT" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`${path}?manage=edit`);
  const editor = page.getByRole("region", { name: "EDIT PROJECT" });
  const form = editor.getByRole("form", { name: "EDIT PROJECT" });
  await form.getByLabel("Project name").fill("Discarded title");
  await form.getByRole("button", { name: "CANCEL" }).click();
  await expect(page).toHaveURL(path);
  await expect(editor).toHaveCount(0);
  await project.getByRole("button", { name: "EDIT PROJECT" }).click();
  await expect(form.getByLabel("Project name")).toHaveValue(initialName);
  await expectNoViolations(page, "project editor");
  await form.getByLabel("Project name").fill(editedName);
  await form
    .getByLabel("Goal and scope")
    .fill("A shared media project with editing, ordering and reviewer notes.");
  await form
    .getByLabel("What help or contributors are needed?")
    .fill("Looking for screenshots and documentation help.");
  await form.locator('input[type="file"]').setInputFiles("tests/e2e/fixtures/snippet.c");
  await expect(form.getByText("Choose a JPEG, PNG or WebP image.")).toBeVisible();
  const pixel = readFileSync("tests/e2e/fixtures/pixel.png");
  for (const name of ["screen-one.png", "screen-two.png", "screen-three.png"]) {
    await form
      .locator('input[type="file"]')
      .setInputFiles({ name, mimeType: "image/png", buffer: pixel });
    await expect(
      form.getByRole("img", {
        name: `${editedName}: ${name.replace(".png", "").replace("-", " ")}`,
      }),
    ).toBeVisible();
  }
  await form.getByRole("button", { name: "MOVE UP 3" }).focus();
  await page.keyboard.press("Enter");
  await form.getByRole("button", { name: "MOVE UP 2" }).click();
  await form.getByRole("button", { name: "SAVE PROJECT" }).click();
  await expect(editor).toHaveCount(0);
  await expect(page).toHaveURL(path);
  await expect(page.getByRole("region", { name: editedName, includeHidden: true })).toHaveCount(1);
  const updated = page.getByRole("region", { name: editedName });
  await expect(updated.getByRole("heading", { name: editedName, level: 1 })).toBeVisible();
  const screenshotButton = updated.getByRole("button", {
    name: `Open screenshot: ${editedName}: screen three`,
  });
  await screenshotButton.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("dialog", { name: `SCREENSHOTS: ${editedName}: screen three` }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(screenshotButton).toBeFocused();

  await page.goto("/projects");
  const card = page
    .locator(`article[${PROJECTS_CARD_ATTR}]`)
    .filter({ has: page.getByRole("link", { name: editedName }) });
  await expect(card.getByRole("img", { name: `${editedName}: screen three` })).toBeVisible();
  await expect(card.getByRole("img", { name: `${editedName}: screen one` })).toBeVisible();
  await expect(card.getByRole("img", { name: `${editedName}: screen two` })).toHaveCount(0);
  await card.getByRole("button", { name: `Open screenshot: ${editedName}: screen three` }).click();
  await expect(
    page.getByRole("dialog", { name: `SCREENSHOTS: ${editedName}: screen three` }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(card.getByRole("img", { name: `${editedName}: screen three` })).toBeVisible();
  await card.getByRole("link", { name: editedName }).click();
  const overlayProject = page.getByRole("region", { name: editedName });
  await overlayProject.getByRole("button", { name: "EDIT PROJECT" }).click();
  const overlayEditor = page.getByRole("region", { name: "EDIT PROJECT" });
  await overlayEditor.getByRole("button", { name: "SAVE PROJECT" }).click();
  await expect(overlayEditor).toHaveCount(0);
  await expect(overlayProject).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/projects");
  await logoff(page);

  await logon(page, "lin");
  await page.goto(path);
  await expect(page.getByRole("heading", { name: editedName, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "EDIT PROJECT" })).toHaveCount(0);
  await logoff(page);

  await logon(page, "grace");
  await page.goto(path);
  await page.getByRole("button", { name: "EDIT PROJECT" }).click();
  const revise = page.getByRole("form", { name: "EDIT PROJECT" });
  await revise.getByRole("button", { name: "REMOVE 1" }).click();
  await revise.getByRole("button", { name: "SAVE PROJECT" }).click();
  await expect(revise).toHaveCount(0);
  await expect(page).toHaveURL(path);
  await expect(
    page
      .getByRole("region", { name: editedName, includeHidden: true })
      .getByRole("img", { name: `${editedName}: screen three`, includeHidden: true }),
  ).toHaveCount(0);
  const remainingImage = page.getByRole("region", { name: editedName }).getByRole("img", {
    name: `${editedName}: screen one`,
  });
  const remainingBox = await remainingImage.boundingBox();
  expect(remainingBox).not.toBeNull();
  expect(remainingBox?.height).toBeLessThanOrEqual(400);
  await page.goto("/projects");
  await expect(card.getByRole("img", { name: `${editedName}: screen one` })).toBeVisible();
  await expect(card.getByRole("img", { name: `${editedName}: screen two` })).toBeVisible();
  await expect(card.getByRole("img", { name: `${editedName}: screen three` })).toHaveCount(0);
});

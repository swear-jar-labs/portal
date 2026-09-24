import { expect, test, type Page } from "@playwright/test";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

async function logoff(page: Page) {
  await page.getByRole("button", { name: "F9 Logoff" }).click();
  await page.getByRole("button", { name: "[ LOG OFF ]" }).click();
  await expect(page).toHaveURL("/");
}

test("a Member proposes a project, clarifies it, and becomes its first Maintainer", async ({
  page,
}) => {
  const slug = `workshop-${Date.now().toString(36)}`;
  const name = `Workshop ${slug}`;
  await logon(page, "ada");
  await page.goto("/projects");
  await waitForHydration(page);
  await page.getByRole("button", { name: "[ PROPOSE PROJECT ]" }).click();
  await expect(page).toHaveURL("/projects/propose");
  await expect(page.getByRole("region", { name: "PROPOSE A PROJECT" })).toBeVisible();
  const form = page.getByRole("form", { name: "PROPOSE A PROJECT" });
  await form.getByLabel("Project name").fill(name);
  await form.getByLabel("Project URL slug").fill(slug);
  await form
    .getByLabel("Goal and scope")
    .fill("A shared workshop for small testable debugging tools.");
  await form.getByLabel("Repository URL (optional)").fill("https://github.com/example/workshop");
  const stackSearch = form.getByRole("combobox", { name: "Stack" });
  await stackSearch.fill("Not in the catalog");
  await expect(page.getByText("No matching technology.")).toBeVisible();
  await stackSearch.press("Enter");
  await expect(page).toHaveURL("/projects/propose");
  await stackSearch.fill("Type");
  await expect(page.getByRole("option", { name: "TypeScript" })).toBeVisible();
  await stackSearch.press("Enter");
  await expect(stackSearch).toBeFocused();
  await expect(form.getByRole("button", { name: "Remove TypeScript" })).toBeVisible();
  await stackSearch.fill("Rus");
  await stackSearch.press("Enter");
  await form.getByRole("button", { name: "Remove Rust" }).click();
  await expect(form.getByRole("button", { name: "Remove Rust" })).toHaveCount(0);
  await stackSearch.fill("Rust");
  await page.getByRole("option", { name: "Rust" }).click();
  await expect(form.getByRole("button", { name: "Remove Rust" })).toBeVisible();
  await form
    .getByLabel("What help or contributors are needed?")
    .fill("Members can build examples, tests and documentation.");
  await expectNoViolations(page, "project proposal form");
  await form.getByRole("button", { name: "[ SUBMIT PROPOSAL ]" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: new RegExp(name) }).getByText("Waiting for admin review."),
  ).toBeVisible();
  await logoff(page);

  await logon(page, "admin");
  await page.goto("/admin");
  await page.getByRole("tab", { name: "MEMBER APPLICATIONS" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "PROJECT PROPOSALS" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expectNoViolations(page, "admin project tabs");
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "MEMBER APPLICATIONS" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "PROJECT RESPONSIBILITY" })).toBeFocused();
  await page.getByRole("tab", { name: "PROJECT PROPOSALS" }).click();
  const review = page.getByRole("region", { name: `${name} ada`, exact: false });
  await expect(review.getByText(/TypeScript, Rust/)).toBeVisible();
  await review.getByLabel("Reason or question").fill("Who will review releases?");
  await review.getByRole("button", { name: "[ REQUEST DETAILS ]" }).click();
  await expect(review.getByText("Waiting for the applicant's clarification.")).toBeVisible();
  await logoff(page);

  await logon(page, "ada");
  await page.goto("/projects/propose");
  await waitForHydration(page);
  await expect(
    page.getByRole("region", { name: new RegExp(name) }).getByText("Who will review releases?"),
  ).toBeVisible();
  const reply = page.getByRole("form", { name: `Reply to admin: ${name}` });
  await reply
    .getByLabel("Reply to admin")
    .fill("I will review releases and ask another Maintainer when needed.");
  await reply.getByRole("button", { name: "[ SEND REPLY ]" }).click();
  await expect(
    page.getByRole("region", { name: new RegExp(name) }).getByText("Waiting for admin review."),
  ).toBeVisible();
  await logoff(page);

  await logon(page, "coadmin");
  await page.goto("/admin");
  await page.getByRole("tab", { name: "PROJECT PROPOSALS" }).click();
  const ready = page.getByRole("region", { name: `${name} ada`, exact: false });
  await expect(
    ready.getByText("I will review releases and ask another Maintainer when needed."),
  ).toBeVisible();
  await ready.getByRole("button", { name: "[ APPROVE ]" }).click();
  await expect(ready.getByText("This application has a final decision.")).toBeVisible();
  await page.goto("/projects");
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  await page.goto(`/projects/${slug}`);
  const panel = page.getByRole("region", { name });
  await panel.getByRole("tab", { name: "TEAM" }).click();
  await expect(panel.getByText("MAINTAINERS", { exact: true })).toBeVisible();
  await expect(panel.getByText("LEAD", { exact: true })).toBeVisible();
  await expect(panel.getByRole("link", { name: "ada" })).toHaveCount(3);
  await panel.getByRole("tab", { name: "PROJECT" }).click();
  await expect(panel.getByText("Repository activity is not synced in this demo.")).toBeVisible();
  await page.goto(`/tickets?project=${slug}`);
  await expect(page.getByRole("combobox", { name: "PROJECT" })).toHaveValue(name);
  await page.goto(`/forum?board=${slug}`);
  await expect(page.getByRole("combobox", { name: "BOARD" })).toContainText(name);
  await expectNoViolations(page, "approved project board");
});

test("guests and Participants can discuss ideas but cannot submit a project", async ({ page }) => {
  await page.goto("/projects");
  await expect(page.getByRole("form", { name: "PROPOSE A PROJECT" })).toHaveCount(0);
  await waitForHydration(page);
  await page.getByRole("button", { name: "[ PROPOSE PROJECT ]" }).click();
  await expect(page).toHaveURL("/projects/propose");
  await expect(page.getByRole("link", { name: "[ DISCUSS IN FORUM → ]" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/projects");
  await expect(page.getByRole("button", { name: "[ PROPOSE PROJECT ]" })).toBeFocused();
  await logon(page, `project-participant-${Date.now().toString(36)}`);
  await page.goto("/projects/propose");
  await expect(page.getByRole("form", { name: "PROPOSE A PROJECT" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "[ APPLY FOR MEMBER → ]" })).toBeVisible();
});

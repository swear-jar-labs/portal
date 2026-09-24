import { expect, test, type Page } from "@playwright/test";
import { expectNoViolations, logon, waitForHydration } from "./helpers";

async function logoff(page: Page) {
  await page.getByRole("button", { name: "F9 Logoff" }).click();
  await page.getByRole("button", { name: "LOG OFF" }).click();
  await expect(page).toHaveURL("/");
}

test("a Participant sees the Member path without team controls", async ({ page }) => {
  await logon(page, `team-participant-${Date.now().toString(36)}`);
  await page.goto("/projects/tooling");
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Tooling" });
  await panel.getByRole("tab", { name: "TEAM" }).click();
  await expect(panel.getByText("Apply for Member access to join a project team.")).toBeVisible();
  await expect(panel.getByRole("link", { name: "APPLY FOR MEMBER →" })).toHaveAttribute(
    "href",
    "/apply",
  );
  await expect(panel.getByRole("button", { name: "JOIN TEAM" })).toHaveCount(0);
  await expect(panel.getByRole("button", { name: "MANAGE TEAM" })).toHaveCount(0);
  await expectNoViolations(page, "participant project team path");
});

test("two Members join independently and a Maintainer grants and revokes a project Reviewer", async ({
  page,
}) => {
  // Five logon sessions and two admin-style layer visits: the scenario runs
  // long under the full parallel suite.
  test.setTimeout(60_000);
  await logon(page, "grace");
  await page.goto("/projects/tooling");
  await waitForHydration(page);
  const panel = page.getByRole("region", { name: "Tooling" });
  await panel.getByRole("tab", { name: "TEAM" }).click();
  await panel.getByRole("button", { name: "JOIN TEAM" }).focus();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("button", { name: "LEAVE TEAM" })).toBeVisible();
  await expect(panel.getByRole("button", { name: "MANAGE TEAM" })).toHaveCount(0);
  await expectNoViolations(page, "joined project team");
  await logoff(page);

  await logon(page, "ken");
  await page.goto("/projects/tooling?tab=team");
  await waitForHydration(page);
  await page
    .getByRole("region", { name: "Tooling" })
    .getByRole("button", { name: "JOIN TEAM" })
    .click();
  await expect(
    page.getByRole("region", { name: "Tooling" }).getByRole("button", { name: "LEAVE TEAM" }),
  ).toBeVisible();
  await logoff(page);

  await logon(page, "ada");
  await page.goto("/projects/tooling");
  await waitForHydration(page);
  const own = page.getByRole("region", { name: "Tooling" });
  await own.getByRole("tab", { name: "TEAM" }).click();
  await expect(own.getByText("LEAD", { exact: true })).toBeVisible();
  await expect(own.getByText("MAINTAINERS", { exact: true })).toBeVisible();
  await own.getByRole("button", { name: "MANAGE TEAM" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/projects/tooling?tab=team&manage=team");
  const manage = page.getByRole("region", { name: "MANAGE TEAM" });
  await expect(manage).toBeVisible();
  await expectNoViolations(page, "manage team layer");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL("/projects/tooling?tab=team");
  await expect(own.getByRole("button", { name: "MANAGE TEAM" })).toBeFocused();
  await own.getByRole("button", { name: "MANAGE TEAM" }).click();
  await expect(manage.getByRole("button", { name: "UNASSIGN ] lin MAINTAINERS" })).toBeVisible();
  await manage.getByRole("combobox", { name: "Member" }).fill("gra");
  await page.getByRole("option", { name: "grace" }).click();
  await expect(manage.getByText("ASSIGN TO", { exact: true })).toBeVisible();
  await manage.getByRole("button", { name: "REVIEWERS" }).click();
  await expect(manage.getByRole("button", { name: "UNASSIGN ] grace REVIEWERS" })).toBeVisible();
  await page.goto("/projects/compiler");
  await page.getByRole("region", { name: "Compiler" }).getByRole("tab", { name: "TEAM" }).click();
  await expect(
    page.getByRole("region", { name: "Compiler" }).getByText("No Reviewers appointed yet."),
  ).toBeVisible();
  await logoff(page);

  await logon(page, "grace");
  await page.goto("/projects/tooling");
  await waitForHydration(page);
  const reviewer = page.getByRole("region", { name: "Tooling" });
  await reviewer.getByRole("tab", { name: "TEAM" }).click();
  await expect(reviewer.getByRole("button", { name: "LEAVE TEAM" })).toBeVisible();
  await reviewer.getByRole("button", { name: "LEAVE TEAM" }).click();
  await expect(reviewer.getByRole("button", { name: "JOIN TEAM" })).toBeVisible();
  await expect(reviewer.getByRole("link", { name: "grace" })).toBeVisible();
  await logoff(page);

  await logon(page, "ada");
  await page.goto("/projects/tooling?tab=team");
  await page
    .getByRole("region", { name: "Tooling" })
    .getByRole("button", { name: "MANAGE TEAM" })
    .click();
  await page
    .getByRole("region", { name: "MANAGE TEAM" })
    .getByRole("button", { name: "UNASSIGN ] grace REVIEWERS" })
    .click();
  await expect(
    page.getByRole("region", { name: "Tooling" }).getByText("No Reviewers appointed yet."),
  ).toBeVisible();
});

test("admin restores a project with no Maintainer through the responsibility queue", async ({
  page,
}) => {
  await logon(page, "admin");
  await page.goto("/projects/flagship?tab=team");
  await waitForHydration(page);
  await expect(
    page.getByText(
      "No Maintainer is available. New ticket assignments are paused until admin appoints one.",
    ),
  ).toBeVisible();
  await page.goto("/tickets/FLAG-2");
  const paused = page.getByRole("region", { name: "FLAG-2" });
  await expect(paused.getByRole("button", { name: "ASSIGN TO ME" })).toBeDisabled();
  await expect(
    paused.getByText(
      "No Maintainer is available. New ticket assignments are paused until admin appoints one.",
    ),
  ).toBeVisible();
  await page.goto("/admin");
  await page.getByRole("tab", { name: "PROJECT RESPONSIBILITY" }).click();
  const entry = page.getByRole("region", { name: "Flagship" });
  await entry.getByRole("link", { name: "MANAGE TEAM" }).click();
  await expect(page).toHaveURL("/projects/flagship?tab=team&manage=team");
  const manage = page.getByRole("region", { name: "MANAGE TEAM" });
  const memberSearch = manage.getByRole("combobox", { name: "Member" });
  // A full navigation can expose the server-rendered input before its client
  // handler hydrates; clear the box each attempt so the post-hydration fill
  // fires a change (a repeated fill of the same value is a no-op).
  await expect
    .poll(async () => {
      await memberSearch.fill("");
      await memberSearch.fill("ken");
      return memberSearch.getAttribute("aria-expanded");
    })
    .toBe("true");
  await page.getByRole("option", { name: "ken" }).click();
  await manage.getByRole("button", { name: "MAINTAINERS" }).focus();
  await page.keyboard.press("Enter");
  await expect(manage.getByRole("link", { name: "ken" })).toBeVisible();
  await expectNoViolations(page, "admin team management");
  await page.goto("/projects/flagship?tab=team");
  await expect(
    page.getByRole("region", { name: "Flagship" }).getByText("No Maintainer is available."),
  ).toHaveCount(0);
  await page.goto("/tickets/FLAG-2");
  await expect(
    page.getByRole("region", { name: "FLAG-2" }).getByRole("button", { name: "ASSIGN TO ME" }),
  ).toBeEnabled();
  await page.goto("/projects/flagship?tab=team");
  await page
    .getByRole("region", { name: "Flagship" })
    .getByRole("button", { name: "MANAGE TEAM" })
    .click();
  await page
    .getByRole("region", { name: "MANAGE TEAM" })
    .getByRole("button", { name: "UNASSIGN ] ken MAINTAINERS" })
    .click();
  await expect(
    page.getByRole("region", { name: "MANAGE TEAM" }).getByText("No Maintainer is available."),
  ).toBeVisible();
  await page.goto("/tickets/FLAG-2");
  await expect(
    page.getByRole("region", { name: "FLAG-2" }).getByRole("button", { name: "ASSIGN TO ME" }),
  ).toBeDisabled();
});

test("admin filters the responsibility queue to projects without a Maintainer", async ({
  page,
}) => {
  await logon(page, "admin");
  await page.goto("/admin");
  await waitForHydration(page);
  await page.getByRole("tab", { name: "PROJECT RESPONSIBILITY" }).click();
  // Tooling always keeps its Maintainers (no e2e scenario removes them), so
  // the filter assertions below stay deterministic while Flagship's
  // Maintainer set is mutated by parallel scenarios on the shared demo server.
  await expect(page.getByRole("region", { name: "Tooling" })).toBeVisible();

  const filter = page.getByRole("combobox", { name: "SHOW" });
  await filter.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Tooling" })).toHaveCount(0);
  await expectNoViolations(page, "filtered responsibility queue");

  await filter.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("region", { name: "Tooling" })).toBeVisible();
});

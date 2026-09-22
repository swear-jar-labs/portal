import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { DOS_SURFACE_ATTR, DOS_ZONE_ATTR } from "@swearjar/dos/contracts";
import { DOC_ZONE } from "../../src/features/shell/zones";
import { enterShell, expectMinimumContrast } from "./helpers";

// The doc panel is the paper surface; the file list is paper too, so the zone
// picks the reading surface (the file list lives in the files zone).
const PAPER_DOC = `[${DOS_ZONE_ATTR}="${DOC_ZONE}"][${DOS_SURFACE_ATTR}="paper"]`;

test.beforeEach(async ({ page }) => {
  await enterShell(page);
});

// Tones resolve against the panel's palette, not the shell's dark body, so a
// sample must live inside the panel.
function resolveTone(page: Page, token: string): Promise<string> {
  return page.locator(PAPER_DOC).evaluate((surface, name) => {
    const sample = document.createElement("span");
    sample.style.color = `var(${name})`;
    surface.append(sample);
    const value = getComputedStyle(sample).color;
    sample.remove();
    return value;
  }, token);
}

test("puts the document on the white paper surface", async ({ page }) => {
  const panel = page.locator(PAPER_DOC);
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS("background-color", "rgb(255, 255, 255)");
});

test("renders the about hero and tone formatting", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "SWEAR JAR LABS" })).toBeVisible();
  await expect(page.getByText("SIDE BY SIDE, LINE BY LINE", { exact: true })).toBeVisible();

  const phrase = page.getByText("A small software workshop", { exact: true });
  await expect(phrase).toBeVisible();

  await expect(phrase).toHaveCSS("color", await resolveTone(page, "--dos-tone-cyan"));
  await expect(phrase).toHaveCSS("font-weight", "700");
  await expectMinimumContrast(phrase);
});

test("centers the manifesto heading and right-aligns the signature", async ({ page }) => {
  await page.keyboard.press("F3");

  const heading = page.getByRole("heading", { level: 2, name: "THE MANIFESTO" });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("text-align", "center");
  await expect(page.getByText("THE MANIFESTO")).toHaveCSS(
    "color",
    await resolveTone(page, "--dos-tone-yellow"),
  );
  await expectMinimumContrast(heading);

  await expect(page.getByText("— the team")).toHaveCSS("text-align", "right");
});

test("centers the how-it-works and rules headings in the manifesto style", async ({ page }) => {
  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

  await files.getByRole("button", { name: "HOW-IT-WORKS" }).click();
  const howHeading = page.getByRole("heading", { level: 2, name: "HOW IT WORKS" });
  await expect(howHeading).toBeVisible();
  await expect(howHeading).toHaveCSS("text-align", "center");
  await expect(howHeading).toHaveCSS("color", await resolveTone(page, "--dos-tone-yellow"));

  const how = page.getByRole("region", { name: "HOW-IT-WORKS.TXT", exact: true });
  for (const section of ["DISCUSSIONS & ERRATA", "READROOM", "PROJECTS"]) {
    await expect(how.getByText(section, { exact: true })).toBeVisible();
  }
  await expect(
    how.getByText(
      "Learn to build software by making your own decisions, including the wrong ones.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    how.getByText("Demo build: registration and Member applications are still in development."),
  ).toBeVisible();

  await files.getByRole("button", { name: "RULES" }).click();
  const rulesHeading = page.getByRole("heading", { level: 2, name: "THE RULES" });
  await expect(rulesHeading).toBeVisible();
  await expect(rulesHeading).toHaveCSS("text-align", "center");
  await expect(rulesHeading).toHaveCSS("color", await resolveTone(page, "--dos-tone-yellow"));
});

test("has no detectable accessibility violations on a tone-heavy doc", async ({ page }) => {
  await page.keyboard.press("F3");
  await expect(page.getByRole("heading", { level: 2, name: "THE MANIFESTO" })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

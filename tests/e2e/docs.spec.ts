import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { enterShell } from "./helpers";

test.beforeEach(async ({ page }) => {
  await enterShell(page);
});

test("renders the about hero and tone formatting", async ({ page }) => {
  await expect(page.getByRole("heading", { level: 1, name: "SWEAR JAR LABS" })).toBeVisible();

  const phrase = page.getByText("keeping the craft of building software systems alive");
  await expect(phrase).toBeVisible();

  const cyan = await page.evaluate(() => {
    const sample = document.createElement("span");
    sample.style.color = "var(--dos-light-cyan)";
    document.body.append(sample);
    const value = getComputedStyle(sample).color;
    sample.remove();
    return value;
  });
  await expect(phrase).toHaveCSS("color", cyan);
  await expect(phrase).toHaveCSS("font-weight", "700");
});

test("centers the manifesto heading and right-aligns the signature", async ({ page }) => {
  await page.keyboard.press("F3");

  const heading = page.getByRole("heading", { level: 2, name: "THE MANIFESTO" });
  await expect(heading).toBeVisible();
  await expect(heading).toHaveCSS("text-align", "center");

  const yellow = await page.evaluate(() => {
    const sample = document.createElement("span");
    sample.style.color = "var(--dos-yellow)";
    document.body.append(sample);
    const value = getComputedStyle(sample).color;
    sample.remove();
    return value;
  });
  await expect(page.getByText("THE MANIFESTO")).toHaveCSS("color", yellow);

  await expect(page.getByText("— the team")).toHaveCSS("text-align", "right");
});

test("has no detectable accessibility violations on a tone-heavy doc", async ({ page }) => {
  await page.keyboard.press("F3");
  await expect(page.getByRole("heading", { level: 2, name: "THE MANIFESTO" })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

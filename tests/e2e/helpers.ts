import { expect, type Locator, type Page } from "@playwright/test";

export async function enterShell(page: Page) {
  await page.goto("/");
  await expect(page.getByText("SWEARJAR.DOS /LOAD")).toBeVisible();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "WELCOME TO SWEARJAR.DOS" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
}

type Rgb = { r: number; g: number; b: number };

const COLOR_PATTERN = /rgba?\((\d+),\s*(\d+),\s*(\d+)/;

function parseColor(value: string): Rgb {
  const match = COLOR_PATTERN.exec(value);
  if (!match) throw new Error(`Unsupported color: ${value}`);
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]) };
}

function channel(value: number): number {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance({ r, g, b }: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

// axe cannot judge text contrast inside the shell: the CRT scanline/vignette
// overlays leave the effective background indeterminate, so its color-contrast
// rule lands in "incomplete" instead of "violation" (verified). This checks the
// painted colors directly, over the first opaque ancestor background.
export async function expectMinimumContrast(locator: Locator, minimum = 4.5) {
  const colors = await locator.evaluate((element) => {
    const foreground = getComputedStyle(element).color;
    let node: Element | null = element;
    let background = "rgb(0, 0, 0)";
    while (node) {
      const value = getComputedStyle(node).backgroundColor;
      if (value !== "rgba(0, 0, 0, 0)") {
        background = value;
        break;
      }
      node = node.parentElement;
    }
    return { foreground, background };
  });

  const ratio = contrastRatio(parseColor(colors.foreground), parseColor(colors.background));
  expect(
    ratio,
    `${colors.foreground} on ${colors.background} is ${ratio.toFixed(2)}:1`,
  ).toBeGreaterThanOrEqual(minimum);
}

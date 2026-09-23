import AxeBuilder from "@axe-core/playwright";
import { expect, type Locator, type Page } from "@playwright/test";
import { DOS_SCROLL_ATTR, DOS_ZONE_ATTR } from "@swearjar/dos/contracts";
import { messages } from "../../src/content/messages";
import { DOC_ZONE } from "../../src/features/shell/zones";

// The right-hand document's scroll body. The file list carries a keyboard
// scroll region of its own, so the bare scroll attribute matches both.
export function docScroll(page: Page): Locator {
  return page.locator(`[${DOS_ZONE_ATTR}="${DOC_ZONE}"] [${DOS_SCROLL_ATTR}]`);
}

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

// The command-bar clock is client state: the "--:--" placeholder disappears once
// hydration ran. Keyboard- and click-driven tests wait on it, or their events
// can land before the shell listeners exist (a full run under parallel load).
export async function waitForHydration(page: Page) {
  await expect(page.getByText(messages.shell.keyBar.clockFallback)).toHaveCount(0);
}

const ARROW_KEY_CODES = {
  ArrowLeft: 37,
  ArrowUp: 38,
  ArrowRight: 39,
  ArrowDown: 40,
} as const;

// Playwright's keyboard.press is a single stroke; the walk follows the system
// auto-repeat, so a held key goes through CDP: the browser then marks the
// event as a repeat, exactly as holding the key down would.
export async function repeatKey(page: Page, key: keyof typeof ARROW_KEY_CODES): Promise<void> {
  const client = await page.context().newCDPSession(page);
  const virtualKeyCode = ARROW_KEY_CODES[key];
  const stroke = {
    key,
    code: key,
    windowsVirtualKeyCode: virtualKeyCode,
    nativeVirtualKeyCode: virtualKeyCode,
  };
  await client.send("Input.dispatchKeyEvent", { ...stroke, type: "rawKeyDown", autoRepeat: true });
  await client.send("Input.dispatchKeyEvent", { ...stroke, type: "keyUp" });
  await client.detach();
}

// The mock logon: any spec that needs a member session starts here. A plain
// logon lands on the member home (FORUM); a ?next= return is covered by the
// account spec, not by every consumer of this helper.
export async function logon(page: Page, user = "ada") {
  await page.goto("/login");
  await waitForHydration(page);
  await page.getByLabel("Username").fill(user);
  await page.getByLabel("Password").fill("secret");
  await page.getByRole("button", { name: "[ LOG ON ]" }).click();
  await expect(page).toHaveURL("/forum", { timeout: 15_000 });
}

// Client-side navigation updates <title> asynchronously; axe would otherwise
// flag an empty document title mid-transition (caught under parallel load).
export async function expectNoViolations(page: Page, context: string) {
  await expect.poll(() => page.title()).not.toBe("");
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations, context).toEqual([]);
}

// Cards read the byline above the title on screen through the CSS slot order
// (the DOM keeps the title first), so the placement is asserted geometrically.
export async function expectAbove(first: Locator, second: Locator) {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);
  if (!firstBox || !secondBox) throw new Error("the compared card parts are not rendered");
  expect(firstBox.y + firstBox.height).toBeLessThanOrEqual(secondBox.y);
}

// The byline shares one row: the lead link and the hint stay centered.
export async function expectSameVerticalCenter(first: Locator, second: Locator) {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()]);
  if (!firstBox || !secondBox) throw new Error("the compared card parts are not rendered");
  const firstCenter = firstBox.y + firstBox.height / 2;
  const secondCenter = secondBox.y + secondBox.height / 2;
  expect(Math.abs(firstCenter - secondCenter)).toBeLessThanOrEqual(1);
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

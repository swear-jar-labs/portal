import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { enterShell, expectMinimumContrast } from "./helpers";

test.beforeEach(async ({ page }) => {
  await enterShell(page);
});

// Reads a design token through a probe element, so assertions compare computed
// colors against tokens instead of literals.
async function tokenColor(page: Page, token: string): Promise<string> {
  return page.evaluate((name) => {
    const sample = document.createElement("span");
    sample.style.backgroundColor = `var(${name})`;
    document.body.append(sample);
    const value = getComputedStyle(sample).backgroundColor;
    sample.remove();
    return value;
  }, token);
}

test("boots into the DOS shell with the file manager and content", async ({ page }) => {
  await expect(page.getByRole("menubar")).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Function keys" })).toBeVisible();
  await expect(page.getByLabel("Command line")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "SWEAR JAR LABS" })).toBeVisible();
});

test("switches the CRT on only as the boot completes", async ({ page }) => {
  const animation = await page.getByRole("menubar").evaluate((element) => {
    const shell = element.parentElement;
    return shell ? getComputedStyle(shell).animationName : "missing";
  });
  expect(animation).toContain("crtOn");
});

test("hides the brand text on mobile and keeps it on desktop", async ({ page }) => {
  const brandText = page.getByText(/SWEARJAR\.DOS v0\.1/);
  await expect(brandText).toBeVisible();

  await page.setViewportSize({ width: 390, height: 780 });
  await expect(brandText).toBeHidden();

  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(brandText).toBeVisible();
});

test("opens a static doc from the file manager", async ({ page }) => {
  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
  await files.getByRole("button", { name: /RULES/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "RULES.TXT" })).toBeVisible();
  await expect(page.getByText("The jar only accepts coins.")).toBeVisible();
});

test("HELP lists commands", async ({ page }) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("HELP");
  await page.keyboard.press("Enter");
  await expect(page.getByText("Available commands:")).toBeVisible();
});

test("Tab completes a command", async ({ page }) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("ABO");
  await page.keyboard.press("Tab");
  await expect(input).toHaveValue("ABOUT");
});

test("Tab from the command line returns to the file manager", async ({ page }) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.press("Tab");
  await expect(input).not.toBeFocused();
  await expect(input).toHaveValue("");
  await expect(page.locator("#file-ABOUT")).toBeFocused();
});

test("Shift+Tab from the command line returns to the file manager", async ({ page }) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("ABO");
  await page.keyboard.press("Shift+Tab");
  await expect(input).not.toBeFocused();
  await expect(input).toHaveValue("ABO");
  await expect(page.locator("#file-ABOUT")).toBeFocused();
});

test("erases the command line with Backspace from the file manager", async ({ page }) => {
  const input = page.getByLabel("Command line");

  await input.focus();
  await page.keyboard.type("ABX");
  await page.keyboard.press("Shift+Tab");
  await expect(input).toHaveValue("ABX");
  await expect(input).not.toBeFocused();

  // Backspace is part of the shell's type-anywhere capture: it edits the line
  // and hands it the keyboard.
  await page.keyboard.press("Backspace");
  await expect(input).toHaveValue("AB");
  await expect(input).toBeFocused();
});

test("Tab on a complete command completes nothing and returns to the file manager", async ({
  page,
}) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("ABOUT");
  await page.keyboard.press("Tab");
  await expect(input).toHaveValue("ABOUT");
  await expect(page.locator("#file-ABOUT")).toBeFocused();
});

test("Tab toggles focus between the file list and the document", async ({ page }) => {
  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
  const doc = page.locator("[data-dos-scroll]");

  // A doc open keeps the keyboard in the list; Tab hands it to the panel and
  // back.
  await files.getByRole("button", { name: "ABOUT" }).click();
  await expect(files.locator("#file-ABOUT")).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(doc).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(files.locator("#file-ABOUT")).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  await expect(doc).toBeFocused();
});

test("an unknown command feeds the swear jar", async ({ page }) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("ASDF");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Bad command or file name.")).toBeVisible();
  await expect(page.getByText("JAR: 1 COIN")).toBeVisible();
});

test("light dialogs take the light surface while HELP stays dark", async ({ page }) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("ASDF");
  await page.keyboard.press("Enter");

  const error = page.getByRole("dialog");
  const errorBody = error.locator("[data-dos-window-body]");
  await expect(errorBody).toHaveAttribute("data-dos-surface", "light");
  await expect(errorBody).toHaveCSS("background-color", await tokenColor(page, "--dos-light-gray"));
  // The bold red headline counts as large text, so AA holds at 3:1.
  await expectMinimumContrast(error.getByText("Bad command or file name."), 3);
  await expectMinimumContrast(error.getByText("The jar clinks. +1 coin."));
  await expectMinimumContrast(error.getByText("Try HELP."));

  await page.keyboard.press("Enter");
  await expect(error).toBeHidden();

  await page.keyboard.press("F1");
  const helpBody = page.getByRole("dialog").locator("[data-dos-window-body]");
  await expect(helpBody).not.toHaveAttribute("data-dos-surface", "light");
  await expect(helpBody).toHaveCSS("background-color", await tokenColor(page, "--dos-black"));
});

test("F1 opens help from the keyboard", async ({ page }) => {
  await page.keyboard.press("F1");
  await expect(page.getByText("Available commands:")).toBeVisible();
});

test("lays HELP out in two columns, and in one when the screen is narrow", async ({ page }) => {
  await page.keyboard.press("F1");
  const dialog = page.getByRole("dialog");
  const help = dialog.locator("[data-dos-window-body] > div");

  // With two columns the vertical centre of the block is the gap between them
  // and no text fragment crosses it; with one wide column text does cross.
  const crossingFragments = () =>
    help.evaluate((element) => {
      const box = element.getBoundingClientRect();
      const centre = box.left + box.width / 2;
      const range = document.createRange();
      range.selectNodeContents(element);
      return Array.from(range.getClientRects()).filter(
        (rect) => rect.left < centre && rect.right > centre,
      ).length;
    });

  expect(await crossingFragments()).toBe(0);

  await page.setViewportSize({ width: 700, height: 800 });
  expect(await crossingFragments()).toBeGreaterThan(0);
});

test("does not autofocus the close button of a dialog", async ({ page }) => {
  await page.keyboard.press("F1");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // HELP has no controls: the window body (the scroll region) takes focus, so
  // ↑/↓ scroll a long text natively.
  const body = dialog.locator("[data-dos-window-body]");
  await expect(body).toBeFocused();
  await expect(dialog.getByRole("button", { name: "Close" })).not.toBeFocused();
  // The body draws no focus ring: focus is trapped in the window, and the ring
  // would only appear by input modality. Controls keep their own rings.
  await expect(body).toHaveCSS("outline-style", "none");
});

test("closes a dialog with Enter or Space", async ({ page }) => {
  await page.keyboard.press("F1");
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("[data-dos-window-body]")).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();

  await page.keyboard.press("F1");
  await expect(dialog.locator("[data-dos-window-body]")).toBeFocused();
  await page.keyboard.press(" ");
  await expect(dialog).toBeHidden();
});

test("keeps Enter on the close button a button activation", async ({ page }) => {
  await page.keyboard.press("F1");
  const dialog = page.getByRole("dialog");
  const close = dialog.getByRole("button", { name: "Close" });
  await close.focus();
  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();
});

test("function keys open their commands", async ({ page }) => {
  const toolbar = page.getByRole("toolbar", { name: "Function keys" });
  await expect(toolbar.getByRole("button", { name: "F6 Products" })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "F8 Apply" })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "F9 Logon" })).toBeVisible();
  await expect(toolbar.getByRole("button", { name: "F10 Exit" })).toBeVisible();

  await page.keyboard.press("F3");
  await expect(page.getByRole("heading", { level: 2, name: "MANIFESTO.TXT" })).toBeVisible();

  await page.keyboard.press("F4");
  await expect(page.getByRole("heading", { level: 2, name: "RULES.TXT" })).toBeVisible();

  await page.keyboard.press("F7");
  await expect(page.getByRole("heading", { level: 2, name: "STATUS.TXT" })).toBeVisible();

  await page.keyboard.press("F5");
  const doom = page.getByRole("dialog");
  await expect(doom.getByText("DOOM.EXE", { exact: true })).toBeVisible();
  await expect(
    doom.getByText("This is the only OS DOOM has not been ported to yet."),
  ).toBeVisible();
  await doom.getByRole("button", { name: "Close" }).click();

  await page.keyboard.press("F10");
  await expect(page.getByText("There is no exit, as there is no logon.")).toBeVisible();
});

test("typing anywhere goes to the command line", async ({ page }) => {
  const input = page.getByLabel("Command line");
  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

  await files.getByRole("button", { name: "RULES" }).click();
  await page.keyboard.type("status");
  await expect(input).toBeFocused();
  await expect(input).toHaveValue("status");
  const typedWidth = (await input.boundingBox())?.width ?? 0;
  expect(typedWidth).toBeGreaterThan(30);

  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 2, name: "STATUS.TXT" })).toBeVisible();
  await expect.poll(async () => (await input.boundingBox())?.width ?? 0).toBeLessThan(10);
});

test("ignores typing while a dialog is open", async ({ page }) => {
  await page.keyboard.press("F1");
  await expect(page.getByText("Available commands:")).toBeVisible();

  await page.keyboard.type("asdf");
  await expect(page.getByLabel("Command line")).toHaveValue("");
});

test("has no detectable accessibility violations", async ({ page }) => {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test("has no detectable accessibility violations with a dialog open", async ({ page }) => {
  await page.keyboard.press("F1");
  await expect(page.getByText("Available commands:")).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations).toEqual([]);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("still reaches the shell", async ({ page }) => {
    await expect(page.getByRole("menubar")).toBeVisible();
  });
});

test.describe("file manager", () => {
  test("lists columns and the file summary", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

    await expect(files.getByRole("columnheader", { name: "NAME" })).toBeVisible();
    await expect(files.getByRole("columnheader", { name: "TYPE" })).toBeVisible();
    await expect(files.getByRole("columnheader", { name: "SIZE" })).toBeVisible();
    await expect(files.getByText("3 DIRS, 12 FILES")).toBeVisible();
  });

  test("moves the selection with arrows without changing the document", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

    await files.getByRole("button", { name: "ABOUT" }).click();
    await page.keyboard.press("ArrowDown");

    await expect(files.locator("#file-MANIFESTO")).toBeFocused();
    await expect(page.getByRole("heading", { level: 2, name: "ABOUT.TXT" })).toBeVisible();
    await expect(files.getByRole("button", { name: "ABOUT" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(files.getByRole("button", { name: "MANIFESTO" })).not.toHaveAttribute(
      "aria-current",
      "true",
    );

    const cyan = await page.evaluate(() => {
      const sample = document.createElement("span");
      sample.style.color = "var(--dos-light-cyan)";
      document.body.append(sample);
      const value = getComputedStyle(sample).color;
      sample.remove();
      return value;
    });
    const cyanRows = await files
      .locator("tbody tr")
      .evaluateAll(
        (rows, color) =>
          rows.filter((row) => getComputedStyle(row).backgroundColor === color).length,
        cyan,
      );
    expect(cyanRows).toBe(1);
  });

  test("opens the selection with ArrowRight", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

    await files.getByRole("button", { name: "ABOUT" }).click();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("ArrowRight");

    await expect(page.getByRole("heading", { level: 2, name: "MANIFESTO.TXT" })).toBeVisible();
  });

  test("opens a route file with Space from the focused row", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

    await files.getByRole("link", { name: "APPLY" }).focus();
    await page.keyboard.press(" ");

    await expect(page).toHaveURL("/apply");
  });

  test("collapses and expands folders with arrows and clicks", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

    await files.getByRole("button", { name: "ABOUT" }).click();
    await page.keyboard.press("ArrowUp");
    await expect(files.locator("#dir-read")).toBeFocused();

    await page.keyboard.press("ArrowLeft");
    await expect(files.getByRole("button", { name: "ABOUT" })).toBeHidden();
    await page.keyboard.press("ArrowRight");
    await expect(files.getByRole("button", { name: "ABOUT" })).toBeVisible();

    await files.getByRole("button", { name: /BOARD/ }).click();
    await expect(files.getByRole("link", { name: /DISCUSSIONS/ })).toBeHidden();
    await files.getByRole("button", { name: /BOARD/ }).click();
    await expect(files.getByRole("link", { name: /DISCUSSIONS/ })).toBeVisible();
  });

  test("activates the selection from an empty command line", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

    await files.getByRole("button", { name: "RULES" }).click();
    await page.keyboard.press("ArrowDown");
    await page.getByLabel("Command line").focus();
    await page.keyboard.press("Enter");

    await expect(page.getByRole("heading", { level: 2, name: "STATUS.TXT" })).toBeVisible();
  });

  test("opens a file by clicking its size cell", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    const sizeCell = files.getByRole("cell", { name: "640B" });
    const box = await sizeCell.boundingBox();
    if (!box) throw new Error("size cell is not visible");

    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

    await expect(page.getByRole("heading", { level: 2, name: "RULES.TXT" })).toBeVisible();
  });
});

test.describe("mobile file manager", () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test("cycles peek, compact and full via the header and footer", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    await expect(files.getByRole("columnheader", { name: "NAME" })).toBeVisible();
    await expect(files.getByText("3 DIRS, 12 FILES")).toBeVisible();

    const scroller = files.locator("table").locator("..");
    const height = () => scroller.evaluate((el) => el.clientHeight);
    await expect
      .poll(() => scroller.evaluate((el) => el.scrollHeight > el.clientHeight))
      .toBe(true);

    const compact = await height();
    const header = files.getByRole("button", {
      name: "Cycle file list size (header)",
    });
    const footer = files.getByRole("button", {
      name: "Cycle file list size (footer)",
    });

    await header.click();
    const full = await height();
    expect(full).toBeGreaterThan(compact);

    await header.click();
    const peek = await height();
    expect(peek).toBeLessThan(compact);

    await footer.click();
    expect(await height()).toBe(compact);
  });

  test("steps between sizes with the corner arrows", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    const scroller = files.locator("table").locator("..");
    const height = () => scroller.evaluate((el) => el.clientHeight);

    const compact = await height();
    const collapse = files.getByRole("button", { name: "Collapse file list" });
    const expand = files.getByRole("button", { name: "Expand file list" });

    await collapse.click();
    const peek = await height();
    expect(peek).toBeLessThan(compact);

    await collapse.click();
    const full = await height();
    expect(full).toBeGreaterThan(compact);

    await expand.click();
    expect(await height()).toBe(peek);
  });

  test("has no detectable accessibility violations on mobile", async ({ page }) => {
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });

  test("Tab toggles focus between the list and the document", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    await files.getByRole("button", { name: "ABOUT" }).click();
    await page.keyboard.press("Tab");
    await expect(page.locator("[data-dos-scroll]")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(files.locator("#file-ABOUT")).toBeFocused();
  });

  test("keeps the desktop controls out of the desktop layout", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });

    await expect(files.getByRole("button", { name: /Cycle file list size/ })).toHaveCount(0);
    await expect(files.getByRole("button", { name: "Collapse file list" })).toHaveCount(0);
    await expect(files.getByRole("heading", { level: 2, name: "C:\\SWEARJAR" })).toBeVisible();
  });
});

test.describe("mobile to desktop", () => {
  test.use({ viewport: { width: 390, height: 780 } });

  test("keeps the desktop layout after widening the viewport", async ({ page }) => {
    const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
    const scroller = files.locator("table").locator("..");
    const height = () => scroller.evaluate((el) => el.clientHeight);
    const compact = await height();

    await page.getByRole("button", { name: "Expand file list" }).click();
    const full = await height();
    expect(full).toBeGreaterThan(compact);

    await page.setViewportSize({ width: 1280, height: 800 });

    await expect(page.getByRole("button", { name: "Expand file list" })).toHaveCount(0);

    const ratio = await files.evaluate((element) => {
      const parent = element.parentElement;
      if (!parent) return 0;
      return element.getBoundingClientRect().width / parent.getBoundingClientRect().width;
    });
    expect(ratio).toBeGreaterThan(0.25);
    expect(ratio).toBeLessThan(0.45);

    await page.setViewportSize({ width: 390, height: 780 });
    await expect(page.getByRole("button", { name: "Cycle file list size (header)" })).toBeVisible();

    // Widening the viewport resets the mobile list size, so the panel is compact again.
    expect(await height()).toBe(compact);
  });
});

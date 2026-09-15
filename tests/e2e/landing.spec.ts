import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { enterShell } from "./helpers";

test.beforeEach(async ({ page }) => {
  await enterShell(page);
});

test("boots into the DOS shell with the file manager and content", async ({ page }) => {
  await expect(page.getByRole("menubar")).toBeVisible();
  await expect(page.getByRole("toolbar", { name: "Function keys" })).toBeVisible();
  await expect(page.getByLabel("Command line")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "SWEAR JAR LABS" })).toBeVisible();
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

test("Tab leaves an empty command line", async ({ page }) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.press("Tab");
  await expect(input).not.toBeFocused();
  await expect(input).toHaveValue("");
});

test("Shift+Tab always leaves the command line", async ({ page }) => {
  const input = page.getByLabel("Command line");
  await input.focus();
  await page.keyboard.type("ABO");
  await page.keyboard.press("Shift+Tab");
  await expect(input).not.toBeFocused();
  await expect(input).toHaveValue("ABO");
});

test("Tab toggles focus between the file list and the document", async ({ page }) => {
  const files = page.getByRole("region", { name: "C:\\SWEARJAR" });
  const doc = page.locator("[data-dos-scroll]");

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

test("F1 opens help from the keyboard", async ({ page }) => {
  await page.keyboard.press("F1");
  await expect(page.getByText("Available commands:")).toBeVisible();
});

test("does not autofocus the close button of a dialog", async ({ page }) => {
  await page.keyboard.press("F1");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toBeFocused();
  await expect(dialog.getByRole("button", { name: "Close" })).not.toBeFocused();
});

test("closes a dialog with Enter or Space", async ({ page }) => {
  await page.keyboard.press("F1");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeFocused();

  await page.keyboard.press("Enter");
  await expect(dialog).toBeHidden();

  await page.keyboard.press("F1");
  await expect(dialog).toBeFocused();
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
    await expect(files.getByText("3 DIRS, 13 FILES")).toBeVisible();
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
    await expect(files.getByText("3 DIRS, 13 FILES")).toBeVisible();

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

import { expect, test, type Page } from "@playwright/test";
import {
  DOS_ROW_ATTR,
  DOS_SCROLL_ATTR,
  DOS_SURFACE_ATTR,
  FOCUSABLE_SELECTOR,
} from "@swearjar/dos/contracts";
import { DOC_LAYER_ATTR, DOC_TOP_ATTR } from "../../src/features/shell/attributes";
import { FEED_PATH, threadPath } from "../../src/features/board/threads";
import {
  expectAbove,
  expectNoViolations,
  expectSameVerticalCenter,
  logon,
  repeatKey,
  waitForHydration,
} from "./helpers";

const FEED_REGION = "DISCUSSIONS.EXE";
const FILES_REGION = "C:\\SWEARJAR";
const READ_FIRST = "READ FIRST: how this board works";
const CI_CACHE = "CI cache poisoning: how we lost a day";
const HEAP_POSTMORTEM = "Postmortem: heap corruption at 3am";
const TABS_CLOSED = "Bikeshed closed: tabs, and here is why";
const NEW_THREAD = "[ NEW THREAD ]";
const LOGON_PROMPT = "LOGON REQUIRED";
const layers = (page: Page) => page.locator(`[${DOC_LAYER_ATTR}]`);
// The PanelStack effect focuses the top layer's body and attaches the Esc
// listener; the focus is the sync point for keyboard tests, as the island
// hydrates behind a Suspense boundary after the shell clock already ticks.
const focusedBody = (page: Page) => page.locator(`[${DOC_TOP_ATTR}] [${DOS_SCROLL_ATTR}]`);

test("renders the hot feed and re-sorts by new", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  const cards = feed.getByRole("article");

  await expect(cards).toHaveCount(12);
  await expect(feed.getByText("12 THREADS")).toBeVisible();
  await expect(cards.first()).toContainText("[PINNED]");
  // Every feed card carries its section icon in the title row.
  await expect(cards.first().locator('[data-file-icon="speech"]')).toBeVisible();
  // Hot ends with the quietest thread; new ends with the oldest activity.
  await expect(cards.last()).toContainText("Withdrawn: the weekly call");

  await feed.getByRole("button", { name: "NEW", exact: true }).click();
  await expect(page).toHaveURL(`${FEED_PATH}?sort=new`);
  await expect(feed.getByRole("button", { name: "NEW", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(cards.last()).toContainText("Eviction policy: LRU lies about recency");

  const firstCard = cards.first();
  // The byline reads above the title on screen through the CSS slot order,
  // while the title leads the DOM: the walk enters the row on it, not on the
  // author.
  await expectSameVerticalCenter(
    firstCard.getByRole("link").nth(1),
    firstCard.locator('[data-dos-role="hint"]').first(),
  );
  await expectAbove(firstCard.getByRole("link").nth(1), firstCard.getByRole("link").first());
});

test("filters by tag and board and keeps the state in the URL", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });

  await feed.getByRole("button", { name: "QUESTION" }).first().click();
  await expect(page).toHaveURL(`${FEED_PATH}?tag=question`);
  await expect(feed.getByRole("article")).toHaveCount(3);
  await expect(feed.getByRole("button", { name: "QUESTION" }).first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Board and tag combine into the empty-filter state.
  await feed.getByRole("combobox", { name: "BOARD" }).click();
  await page.getByRole("option", { name: "Compiler" }).click();
  await expect(page).toHaveURL(`${FEED_PATH}?board=compiler&tag=question`);
  await expect(feed.getByText("NO MATCHES. TRY CHANGING THE FILTERS.")).toBeVisible();
  await expect(feed.getByText("0 THREADS")).toBeVisible();

  // The state is deep-linkable.
  await page.reload();
  await expect(feed.getByText("NO MATCHES. TRY CHANGING THE FILTERS.")).toBeVisible();
});

test("a tag on a card filters the feed instead of opening the thread", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });

  const card = feed.getByRole("article").filter({ hasText: CI_CACHE });
  await card.getByRole("button", { name: "TOOLING" }).click();

  await expect(page).toHaveURL(`${FEED_PATH}?tag=tooling`);
  await expect(feed.getByRole("article")).toHaveCount(2);
});

test("the gap between card tags belongs to the stretched link", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const card = page
    .getByRole("article")
    .filter({ hasText: "Why we write our own parsers: a case for recursive descent" });
  await card.scrollIntoViewIfNeeded();
  const first = await card.getByRole("button", { name: "COMPILERS" }).boundingBox();
  const second = await card.getByRole("button", { name: "PROPOSAL" }).boundingBox();
  if (!first || !second) throw new Error("the card with two tags is not rendered");

  // The actions row keeps its gap click-through: the tags are its direct
  // children, so the exact middle between them hits the link stretched under
  // it, not a wrapper raised over it.
  await page.mouse.click((first.x + first.width + second.x) / 2, first.y + first.height / 2);
  await expect(page).toHaveURL(threadPath("handwritten-parsers"));
});

test("walks the feed by rows and remembers the control inside one", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  const cards = feed.getByRole("article");

  // From the panel surface, ▲ enters the first row; ▼ steps to the next row.
  // The walk lives in the island, which hydrates behind Suspense after the
  // shell clock: retry the first step until the listeners answer, or the press
  // lands before the walk exists (a full run under parallel load).
  await expect(async () => {
    await focusedBody(page).focus();
    await page.keyboard.press("ArrowDown");
    await expect(feed.getByRole("combobox", { name: "BOARD" })).toBeFocused({ timeout: 1_000 });
  }).toPass();
  await page.keyboard.press("ArrowDown");
  await expect(feed.getByRole("button", { name: "PROPOSAL" }).first()).toBeFocused();
  await expect(feed.getByRole("button", { name: "PROPOSAL" }).first()).toHaveCSS(
    "outline-offset",
    "-2px",
  );

  // ◀/▶ walk inside the tag row.
  await page.keyboard.press("ArrowRight");
  await expect(feed.getByRole("button", { name: "DECISION" }).first()).toBeFocused();

  // ▼ leaves the row for the compose control (an unmarked row of its own),
  // then for the first card's title (it leads the DOM while the byline reads
  // above it on screen); ▶ walks author and vote.
  await page.keyboard.press("ArrowDown");
  await expect(feed.getByRole("button", { name: NEW_THREAD })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(cards.first().getByRole("link").first()).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(cards.first().getByRole("link").nth(1)).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(cards.first().getByRole("button").first()).toBeFocused();

  // ▼ steps to the next card's title; ▲ returns to the control left in the first one.
  await page.keyboard.press("ArrowDown");
  await expect(cards.nth(1).getByRole("link").first()).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(cards.first().getByRole("button").first()).toBeFocused();

  // The walk wraps: ▲ from the first row lands on the last card's title.
  await focusedBody(page).focus();
  await page.keyboard.press("ArrowDown");
  await expect(feed.getByRole("combobox", { name: "BOARD" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(cards.last().getByRole("link").first()).toBeFocused();
});

test("keeps walking while an arrow is held (system auto-repeat)", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });

  // Enter the feed, then hold ▼: each auto-repeat event is a step, so the walk
  // follows the held key instead of ignoring it. The first step retries until
  // the island's listeners answer (see the walk test above).
  await expect(async () => {
    await focusedBody(page).focus();
    await page.keyboard.press("ArrowDown");
    await expect(feed.getByRole("combobox", { name: "BOARD" })).toBeFocused({ timeout: 1_000 });
  }).toPass();
  await repeatKey(page, "ArrowDown");
  await expect(feed.getByRole("button", { name: "PROPOSAL" }).first()).toBeFocused();
});

test("enters the scrolled feed from its visible edge", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const surface = focusedBody(page);
  // The row in sight: the first row whose own control is inside the region.
  const rowInSight = (edge: "first" | "last") =>
    surface.evaluate(
      (el, { selector, rowAttr, edge }) => {
        const box = el.getBoundingClientRect();
        const controls = Array.from(el.querySelectorAll<HTMLElement>(selector));
        const row = Array.from(el.querySelectorAll<HTMLElement>(`[${rowAttr}]`))
          .filter((candidate) => {
            const control = candidate.querySelector<HTMLElement>(selector);
            if (!control) return false;
            const rect = control.getBoundingClientRect();
            return rect.bottom > box.top && rect.top < box.bottom;
          })
          .at(edge === "first" ? 0 : -1);
        const control = row?.querySelector<HTMLElement>(selector);
        return control ? controls.indexOf(control) : null;
      },
      { selector: FOCUSABLE_SELECTOR, rowAttr: DOS_ROW_ATTR, edge },
    );

  // The wheel scrolls the panel without moving the keyboard focus.
  await surface.focus();
  await surface.hover();
  await page.mouse.wheel(0, 2000);
  await expect.poll(() => surface.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  const expected = await rowInSight("first");

  // The walk enters where the user is looking — the first row in sight — and
  // the view keeps the user's scroll instead of snapping back to the top.
  await page.keyboard.press("ArrowDown");
  if (expected === null) throw new Error("no focusable row is visible");
  await expect(surface.locator(FOCUSABLE_SELECTOR).nth(expected)).toBeFocused();
  const entered = await surface.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const rect = document.activeElement?.getBoundingClientRect();
    return {
      inSight: rect !== undefined && rect.bottom > box.top && rect.top < box.bottom,
      scrollTop: el.scrollTop,
      max: el.scrollHeight - el.clientHeight,
    };
  });
  expect(entered.inSight).toBe(true);
  expect(entered.scrollTop).toBeGreaterThan(entered.max / 2);

  // The mirror case: with the feed back at the top, ▲ enters the last row in
  // sight, not the feed's last row.
  await surface.focus();
  await surface.hover();
  await page.mouse.wheel(0, -2000);
  await expect.poll(() => surface.evaluate((el) => el.scrollTop)).toBe(0);
  const mirroredExpected = await rowInSight("last");

  await page.keyboard.press("ArrowUp");
  if (mirroredExpected === null) throw new Error("no focusable row is visible");
  await expect(surface.locator(FOCUSABLE_SELECTOR).nth(mirroredExpected)).toBeFocused();
  const mirrored = await surface.evaluate((el) => ({
    scrollTop: el.scrollTop,
    max: el.scrollHeight - el.clientHeight,
  }));
  expect(mirrored.scrollTop).toBeLessThan(mirrored.max / 2);
});

test("walks the thread posts with ▲/▼ and wraps", async ({ page }) => {
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });
  await expect(focusedBody(page)).toBeFocused();

  // Three posts, the reply composer as four rows (tabs, toolbar, field,
  // submit) and the thread vote above them as an unmarked row of its own.
  const rows = page.locator(`[${DOC_TOP_ATTR}] [${DOS_ROW_ATTR}]`);
  await expect(rows).toHaveCount(7);

  await page.keyboard.press("ArrowDown");
  await expect(thread.getByRole("button", { name: "▲ 45 VOTES" }).first()).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(rows.nth(0)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(rows.nth(1)).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(rows.nth(2)).toBeFocused();
  // The composer walks top-down like the eyes: tabs, toolbar, field, submit.
  await page.keyboard.press("ArrowDown");
  await expect(thread.getByRole("button", { name: "[ WRITE ]" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(thread.getByRole("button", { name: "Code", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("textbox", { name: "REPLY" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(thread.getByRole("button", { name: "[ POST REPLY ]" })).toBeFocused();
  // The post walk wraps at both ends.
  await page.keyboard.press("ArrowDown");
  await expect(thread.getByRole("button", { name: "▲ 45 VOTES" }).first()).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(thread.getByRole("button", { name: "[ POST REPLY ]" })).toBeFocused();
});

test("opens a thread at the top and scrolls to the composer on reply", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("heap-postmortem"));
  await waitForHydration(page);
  const surface = focusedBody(page);
  await expect(surface).toBeFocused();
  // Reading starts at the head of the thread, not at its tail.
  await expect.poll(() => surface.evaluate((el) => el.scrollTop)).toBe(0);

  // Choosing a parent moves the keyboard to the composer and the view follows:
  // the field is the thread's tail, so the panel scrolls down to it.
  await page
    .getByRole("region", { name: HEAP_POSTMORTEM })
    .getByRole("article")
    .first()
    .getByRole("button", { name: "[ REPLY ]" })
    .click();
  await expect.poll(() => surface.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
});

test("opens a thread over the feed and pops back to the focused card", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  await feed.getByRole("link", { name: CI_CACHE }).click();

  const thread = page.getByRole("region", { name: CI_CACHE });
  await expect(page).toHaveURL(threadPath("ci-cache-poisoning"));
  await expect(thread).toBeVisible();
  // The thread opens as a light window over the feed (the titleTone prop is gone;
  // the surface contract is what the kit guarantees now).
  await expect(thread).toHaveAttribute(DOS_SURFACE_ATTR, "light");
  await expect(thread.getByRole("heading", { name: CI_CACHE })).toBeVisible();
  // The thread body takes the keyboard; the feed layer below goes inert.
  await expect(page.locator(`[${DOC_TOP_ATTR}] [${DOS_SCROLL_ATTR}]`)).toBeFocused();
  await expect(layers(page)).toHaveCount(2);
  await expect(layers(page).first()).toHaveAttribute("inert", "");
  await expect(layers(page).last()).not.toHaveAttribute("inert", "");
  await expect(feed).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);
  await expect(page.locator("#thread-card-ci-cache-poisoning")).toBeFocused();
});

test("a thread reached by browser back closes with the feed", async ({ page }) => {
  // Deep link: the thread is the first history entry, so its close pushes the
  // feed instead of going back off the page.
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  await expect(focusedBody(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);

  // Push a thread from the feed, then walk history back to the deep-linked
  // entry: there is no pushed-feed entry behind it to go back to.
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: CI_CACHE })
    .click();
  await expect(page).toHaveURL(threadPath("ci-cache-poisoning"));

  await page.goBack();
  await expect(page).toHaveURL(FEED_PATH);
  await page.goBack();
  await expect(page).toHaveURL(threadPath("read-first"));
  await waitForHydration(page);
  await expect(page.getByRole("region", { name: READ_FIRST })).toBeVisible();
  await expect(focusedBody(page)).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);
  await expect(page.getByRole("region", { name: FEED_REGION })).toBeVisible();
});

test("a second Esc does not pop another layer while the close is in flight", async ({ page }) => {
  // A history entry behind the feed gives a runaway second close somewhere to
  // go back to — and keeps the bug visible.
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  await expect(focusedBody(page)).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);

  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: CI_CACHE })
    .click();
  await expect(page).toHaveURL(threadPath("ci-cache-poisoning"));
  await expect(focusedBody(page)).toBeFocused();

  // Both presses go out back to back: one close owns the pop.
  await Promise.all([page.keyboard.press("Escape"), page.keyboard.press("Escape")]);

  await expect(page).toHaveURL(FEED_PATH);
  await expect(page.getByRole("region", { name: FEED_REGION })).toBeVisible();
});

test("the thread [X] closes back to the feed", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: /Why we write our own parsers/ })
    .click();

  const thread = page.getByRole("region", { name: /Why we write our own parsers/ });
  await thread.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL(FEED_PATH);
});

test("a deep link opens the stack and Tab from the file list reaches the top layer", async ({
  page,
}) => {
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  await expect(page).toHaveTitle(`${READ_FIRST} — Swear Jar Labs`);
  await expect(page.getByRole("region", { name: READ_FIRST })).toBeVisible();

  // The section file stays current on its deep routes.
  const files = page.getByRole("region", { name: FILES_REGION });
  await expect(files.locator("#file-DISCUSSIONS")).toHaveAttribute("aria-current", "true");

  await files.locator("#file-DISCUSSIONS").focus();
  // Under parallel load a late island commit can replace the row between
  // .focus() and Tab (the stroke then falls through to the native order):
  // refocus the current row and retry until the panel answers.
  const topBody = page.locator(`[${DOC_TOP_ATTR}] [${DOS_SCROLL_ATTR}]`);
  await expect
    .poll(async () => {
      await files.locator("#file-DISCUSSIONS").focus();
      await page.keyboard.press("Tab");
      return await topBody.evaluate((node) => node === document.activeElement);
    })
    .toBe(true);
  await page.keyboard.press("Shift+Tab");
  await expect(files.locator("#file-DISCUSSIONS")).toBeFocused();

  // A deep-linked thread pushes the feed on close.
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(FEED_PATH);
  await expect(page.getByRole("region", { name: FEED_REGION })).toBeVisible();
});

test("renders posts, the empty thread and the locked thread", async ({ page }) => {
  await page.goto(threadPath("read-first"));
  const thread = page.getByRole("region", { name: READ_FIRST });
  // The reply marker quotes the same opening line: read the root post's body.
  await expect(
    thread.getByRole("article").first().getByText("BRING QUESTIONS, SHOW YOUR REASONING"),
  ).toBeVisible();
  await expect(thread.getByRole("listitem")).toHaveCount(3);
  await expect(thread.getByRole("textbox", { name: "REPLY" })).toBeVisible();

  await page.goto(threadPath("withdrawn-call"));
  await expect(
    page
      .getByRole("region", { name: "Withdrawn: the weekly call" })
      .getByText("NO POSTS HERE YET."),
  ).toBeVisible();

  await page.goto(threadPath("tabs-vs-spaces"));
  const locked = page.getByRole("region", { name: TABS_CLOSED });
  await expect(locked.getByText("[LOCKED]").first()).toBeVisible();
  await expect(locked.getByText("THIS THREAD IS LOCKED.")).toBeVisible();
  // A locked thread takes no replies.
  await expect(locked.getByRole("textbox", { name: "REPLY" })).toHaveCount(0);
});

test("a guest action asks for logon and keeps the reply draft", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  const dialog = page.getByRole("dialog", { name: LOGON_PROMPT });

  // Compose is gated.
  await feed.getByRole("button", { name: NEW_THREAD }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "[ CANCEL ]" }).click();
  await expect(dialog).toBeHidden();

  // A vote is gated too, and nothing changes behind the prompt.
  const vote = feed
    .getByRole("article")
    .filter({ hasText: CI_CACHE })
    .getByRole("button", { name: "▲ 14 VOTES" });
  await expect(vote).toHaveAttribute("aria-pressed", "false");
  await vote.click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "[ CANCEL ]" }).click();
  await expect(vote).toHaveAttribute("aria-pressed", "false");

  // A reply attempt keeps the draft for after the logon.
  await page.getByRole("link", { name: CI_CACHE }).click();
  const reply = page
    .getByRole("region", { name: CI_CACHE })
    .getByRole("textbox", { name: "REPLY" });
  await reply.fill("Writing for the jar.");
  await page.getByRole("button", { name: "[ POST REPLY ]" }).click();
  await expect(dialog).toBeVisible();
  // The modal hides the page from the a11y tree; check the draft after closing.
  await dialog.getByRole("button", { name: "[ CANCEL ]" }).click();
  await expect(reply).toHaveValue("Writing for the jar.");
  await page.getByRole("button", { name: "[ POST REPLY ]" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "[ LOG ON ]" }).click();
  await expect(page).toHaveURL("/login");
});

test("votes a thread once and keeps the delta across panels", async ({ page }) => {
  await logon(page);
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });
  const card = feed.getByRole("article").filter({ hasText: CI_CACHE });

  await card.getByRole("button", { name: "▲ 14 VOTES" }).click();
  await expect(card.getByRole("button", { name: "▲ 15 VOTES" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // The open thread shows the same thread vote; its posts keep their own.
  await card.getByRole("link", { name: CI_CACHE }).click();
  const thread = page.getByRole("region", { name: CI_CACHE });
  await expect(thread.getByRole("button", { name: "▲ 15 VOTES" }).first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const firstPost = thread.getByRole("article").first();
  await firstPost.getByRole("button", { name: "▲ 14 VOTES" }).click();
  await expect(firstPost.getByRole("button", { name: "▲ 15 VOTES" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  // Closing back to the feed: the card keeps the vote, a second click unvotes.
  await page.keyboard.press("Escape");
  const stillVoted = feed
    .getByRole("article")
    .filter({ hasText: CI_CACHE })
    .getByRole("button", { name: "▲ 15 VOTES" });
  await expect(stillVoted).toHaveAttribute("aria-pressed", "true");
  await stillVoted.click();
  await expect(
    feed
      .getByRole("article")
      .filter({ hasText: CI_CACHE })
      .getByRole("button", { name: "▲ 14 VOTES" }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("composes a thread that lives in the session", async ({ page }) => {
  const title = "Cache keys must hash the toolchain";
  await logon(page);
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const feed = page.getByRole("region", { name: FEED_REGION });

  await feed.getByRole("button", { name: NEW_THREAD }).click();
  const form = page.getByRole("form", { name: "NEW THREAD" });

  // An empty submit names both required fields.
  await form.getByRole("button", { name: "[ POST THREAD ]" }).click();
  await expect(form.getByText("Give the thread a title.")).toBeVisible();
  await expect(form.getByText("Write the opening post.")).toBeVisible();

  await form.getByRole("combobox", { name: "BOARD" }).click();
  await page.getByRole("option", { name: "Tooling" }).click();
  await form.getByRole("button", { name: "TOOLING" }).click();
  await form.getByLabel("TITLE").fill(title);
  await form.getByLabel("BODY").fill("A header edit slipped past the cache again.");
  await form.getByRole("button", { name: "[ POST THREAD ]" }).click();

  const card = feed.getByRole("article").filter({ hasText: title });
  await expect(card).toBeVisible();
  await expect(card).toContainText("TOOLING");
  // The submit switched the feed to the composed thread's board: the count is
  // the board's own (one fixture thread plus the new one).
  await expect(feed.getByText("2 THREADS")).toBeVisible();
  // The layer closes and focus lands on the card it just created.
  await expect(form).toHaveCount(0);
  const cardTitle = card.getByRole("button", { name: title });
  await expect(cardTitle).toBeFocused();
  // A composed thread has no route: its title must not pretend to be a link.
  // Its author is still a real public-profile link.
  await expect(card.getByRole("link", { name: title })).toHaveCount(0);

  // The composed thread opens in place and survives the return to the feed.
  await cardTitle.click();
  const thread = page.getByRole("region", { name: title });
  await expect(thread.getByText("A header edit slipped past the cache again.")).toBeVisible();
  await expect(thread.getByRole("textbox", { name: "REPLY" })).toBeVisible();

  // A jump inside the local thread writes the hash; closing drops it, so the
  // feed URL never points at a layer that is gone.
  await thread.getByRole("article").first().getByRole("button", { name: "[ REPLY ]" }).click();
  await thread.getByRole("textbox", { name: "REPLY" }).fill("Answering the opening post.");
  await thread.getByRole("button", { name: "[ POST REPLY ]" }).click();
  await thread.getByRole("article").last().getByRole("button", { name: "In reply to ada" }).click();
  await expect(page).toHaveURL(/#board-post-/);

  await page.keyboard.press("Escape");
  await expect(feed.getByRole("article").filter({ hasText: title })).toBeVisible();
  await expect(page).toHaveURL(`${FEED_PATH}?board=tooling&sort=new`);
});

test("replies, edits and tombstones a post", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });

  // A post by another author offers no edit controls.
  const gracePost = thread.getByRole("article").filter({ hasText: "Pinned. If a thread drifts" });
  await expect(gracePost.getByRole("button", { name: "[ EDIT ]" })).toHaveCount(0);

  const reply = thread.getByRole("textbox", { name: "REPLY" });
  await reply.fill("Updated rules: the jar takes IOUs now.");
  await thread.getByRole("button", { name: "[ POST REPLY ]" }).click();
  await expect(reply).toHaveValue("");
  const added = thread.getByRole("article").last();
  await expect(added).toContainText("Updated rules: the jar takes IOUs now.");

  // The edit opens with the caret in the text and saves on Shift+Enter.
  await added.getByRole("button", { name: "[ EDIT ]" }).click();
  const editor = thread.getByRole("textbox", { name: "EDIT POST" });
  await expect(editor).toBeFocused();
  await editor.fill("Updated rules: the jar takes IOUs, by hand.");
  await page.keyboard.press("Shift+Enter");
  await expect(added).toContainText("Updated rules: the jar takes IOUs, by hand.");
  await expect(added).toContainText("[EDITED]");
  // The editor is gone: the keyboard stays on the post, not on the body.
  await expect(added).toBeFocused();

  // Cancelling an edit also hands the keyboard back and drops the draft.
  await added.getByRole("button", { name: "[ EDIT ]" }).click();
  await thread.getByRole("textbox", { name: "EDIT POST" }).fill("Discarded text.");
  await added.getByRole("button", { name: "[ CANCEL ]" }).click();
  await expect(added).toBeFocused();
  await expect(added).toContainText("Updated rules: the jar takes IOUs, by hand.");
  await expect(added).not.toContainText("Discarded text.");

  // Delete asks first; cancelling keeps the post, confirming leaves a tombstone.
  await added.getByRole("button", { name: "[ DELETE ]" }).click();
  const dialog = page.getByRole("dialog", { name: "DELETE POST" });
  await dialog.getByRole("button", { name: "[ CANCEL ]" }).click();
  await expect(added).toContainText("by hand");
  await added.getByRole("button", { name: "[ DELETE ]" }).click();
  await dialog.getByRole("button", { name: "[ DELETE ]" }).click();
  await expect(added).toContainText("This post was deleted.");
  await expect(added).not.toContainText("by hand");
  await expect(added).toContainText("ada");
  await expect(added.getByRole("button", { name: "VOTES" })).toHaveCount(0);
});

test("shows the parent of a published reply and jumps to it", async ({ page }) => {
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });
  // The quoted line also lives in the marker: target the root post by anchor.
  const parent = page.locator("#board-post-read-first-1");
  const marker = thread.getByRole("button", { name: "In reply to ada" });

  await expect(marker).toContainText("↪");
  await expect(marker).toContainText('ada: "Bring questions, show your reasoning');
  // The answered member's face travels with the quote.
  await expect(marker.locator("img")).toHaveAttribute("src", "/avatars/ada.png");

  // The jump rewrites the address without a history entry: Back still closes
  // the thread, and the anchor is shareable.
  await marker.click();
  await expect(page).toHaveURL(`${threadPath("read-first")}#board-post-read-first-1`);
  await expect(parent).toBeFocused();
});

test("targets a post from the composer and posts the marker", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });
  const parent = thread.getByRole("article").filter({ hasText: "Pinned. If a thread drifts" });
  const reply = thread.getByRole("textbox", { name: "REPLY" });

  await parent.getByRole("button", { name: "[ REPLY ]" }).click();
  // Choosing a target hands the caret to the composer and names the parent.
  await expect(reply).toBeFocused();
  await expect(thread.getByText("REPLYING TO")).toBeVisible();
  await expect(thread.getByText(/grace: "Pinned\. If a thread drifts/)).toBeVisible();
  await expect(
    page
      .getByRole("form", { name: "Reply to this thread" })
      .locator('img[src="/avatars/grace.png"]'),
  ).toBeVisible();

  await reply.fill("Carrying on, with the jar watching.");
  await thread.getByRole("button", { name: "[ POST REPLY ]" }).click();

  const added = thread.getByRole("article").last();
  await expect(added).toContainText("Carrying on, with the jar watching.");
  await expect(added.getByRole("button", { name: "In reply to grace" })).toContainText(
    "Pinned. If a thread drifts",
  );
  // Posting clears the target: the next reply starts from the tail again.
  await expect(thread.getByText("REPLYING TO")).toHaveCount(0);
});

test("cancels the reply target and keeps the draft", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });
  const parent = thread.getByRole("article").filter({ hasText: "Pinned. If a thread drifts" });
  const reply = thread.getByRole("textbox", { name: "REPLY" });

  await parent.getByRole("button", { name: "[ REPLY ]" }).click();
  await reply.fill("Draft stays.");
  await thread.getByRole("button", { name: "Cancel reply target" }).click();
  await expect(reply).toBeFocused();
  await expect(reply).toHaveValue("Draft stays.");
  await expect(thread.getByText("REPLYING TO")).toHaveCount(0);

  // Posted without a target, the reply carries no marker.
  await thread.getByRole("button", { name: "[ POST REPLY ]" }).click();
  const added = thread.getByRole("article").last();
  await expect(added).toContainText("Draft stays.");
  await expect(added.getByRole("button", { name: "In reply to" })).toHaveCount(0);
});

test("reaches the reply target clear control with the arrows", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });
  const reply = thread.getByRole("textbox", { name: "REPLY" });

  await thread
    .getByRole("article")
    .filter({ hasText: "Pinned. If a thread drifts" })
    .getByRole("button", { name: "[ REPLY ]" })
    .click();
  await expect(reply).toBeFocused();

  // ▲ from the empty caret climbs past the toolbar and the tabs into the
  // target row: the chip is three rows above the field.
  await page.keyboard.press("ArrowUp");
  await expect(thread.getByRole("button", { name: "Code", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(thread.getByRole("button", { name: "[ WRITE ]" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  const clear = thread.getByRole("button", { name: "Cancel reply target" });
  await expect(clear).toBeFocused();

  // Enter clears the target and hands the caret back to the field.
  await page.keyboard.press("Enter");
  await expect(thread.getByText("REPLYING TO")).toHaveCount(0);
  await expect(reply).toBeFocused();
});

test("a guest reply keeps its target through the logon prompt", async ({ page }) => {
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });
  const dialog = page.getByRole("dialog", { name: LOGON_PROMPT });

  await thread
    .getByRole("article")
    .filter({ hasText: "Pinned. If a thread drifts" })
    .getByRole("button", { name: "[ REPLY ]" })
    .click();
  const reply = thread.getByRole("textbox", { name: "REPLY" });
  await reply.fill("Writing for the jar.");
  await thread.getByRole("button", { name: "[ POST REPLY ]" }).click();
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "[ CANCEL ]" }).click();
  await expect(thread.getByText("REPLYING TO")).toBeVisible();
  await expect(reply).toHaveValue("Writing for the jar.");
});

test("a locked thread takes no reply targets", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("tabs-vs-spaces"));
  await waitForHydration(page);
  const locked = page.getByRole("region", { name: TABS_CLOSED });

  // The published marker stays a navigation aid; the reply controls are gone.
  await expect(locked.getByRole("button", { name: "In reply to ken" })).toBeVisible();
  await expect(locked.getByRole("button", { name: "[ REPLY ]" })).toHaveCount(0);
  await expect(locked.getByRole("textbox", { name: "REPLY" })).toHaveCount(0);
});

test("quotes a tombstoned parent by name only", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const thread = page.getByRole("region", { name: READ_FIRST });
  const reply = thread.getByRole("textbox", { name: "REPLY" });

  await reply.fill("Parent to be buried.");
  await thread.getByRole("button", { name: "[ POST REPLY ]" }).click();
  const parentAnchor = await thread.getByRole("article").last().getAttribute("id");
  if (parentAnchor === null) throw new Error("the session post carries no anchor");
  // The article locator is live; the anchor keeps naming the same post after
  // the next reply lands below it.
  const parent = page.locator(`#${parentAnchor}`);

  await parent.getByRole("button", { name: "[ REPLY ]" }).click();
  await reply.fill("The child keeps the name.");
  await thread.getByRole("button", { name: "[ POST REPLY ]" }).click();
  const child = thread.getByRole("article").last();
  const marker = child.getByRole("button", { name: "In reply to ada" });
  await expect(marker).toContainText("Parent to be buried.");

  await parent.getByRole("button", { name: "[ DELETE ]" }).click();
  await page
    .getByRole("dialog", { name: "DELETE POST" })
    .getByRole("button", { name: "[ DELETE ]" })
    .click();
  await expect(marker).not.toContainText("Parent to be buried.");
  await expect(marker).toContainText("ada");

  // The tombstone keeps its anchor: the jump still lands on it.
  await marker.click();
  await expect(page.locator(`#${parentAnchor}`)).toBeFocused();
});

test("a post hash deep link focuses the post", async ({ page }) => {
  await page.goto(`${threadPath("read-first")}#board-post-read-first-3`);
  await waitForHydration(page);
  await expect(page.locator("#board-post-read-first-3")).toBeFocused();
});

test("an unknown post hash leaves the keyboard on the panel body", async ({ page }) => {
  await page.goto(`${threadPath("read-first")}#board-post-no-such-post`);
  await waitForHydration(page);
  await expect(focusedBody(page)).toBeFocused();
});

test("walks the compose layer and returns focus to its button", async ({ page }) => {
  await logon(page);
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  await page.getByRole("button", { name: NEW_THREAD }).click();
  const form = page.getByRole("form", { name: "NEW THREAD" });
  await expect(page.locator(`[${DOC_TOP_ATTR}] [${DOS_SCROLL_ATTR}]`)).toBeFocused();

  // The form walks two axes: rows step down to the editor's field, tabs and
  // toolbar rows, cells step across the tags and the submit pair.
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("combobox", { name: "BOARD" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("button", { name: "PROPOSAL" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(form.getByRole("button", { name: "DECISION" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("textbox", { name: "TITLE" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("button", { name: "[ WRITE ]" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("button", { name: "Code", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("textbox", { name: "BODY" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(form.getByRole("button", { name: "[ POST THREAD ]" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(form.getByRole("button", { name: "[ CANCEL ]" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(form).toHaveCount(0);
  await expect(page.getByRole("button", { name: NEW_THREAD })).toBeFocused();
});

test("keeps the caret in the reply textarea inside its row", async ({ page }) => {
  await logon(page);
  await page.goto(threadPath("read-first"));
  await waitForHydration(page);
  const reply = page.getByRole("textbox", { name: "REPLY" });
  await reply.fill("first");
  await reply.focus();

  // ◀ keeps the caret in the text; ▲ leaves the row only from its start,
  // climbing the toolbar and the tabs before the posts.
  await page.keyboard.press("ArrowLeft");
  await expect(reply).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(reply).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("button", { name: "Code", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("button", { name: "[ WRITE ]" })).toBeFocused();
  await page.keyboard.press("ArrowUp");
  const rows = page.locator(`[${DOC_TOP_ATTR}] [${DOS_ROW_ATTR}]`);
  await expect(rows.nth(2)).toBeFocused();
});

test("lays a lone panel flush and steps the stacked thread down", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  const margins = (target: Page) =>
    layers(target).evaluateAll((elements) =>
      elements.map((element) => {
        const style = getComputedStyle(element);
        return { left: style.marginLeft, top: style.marginTop };
      }),
    );

  // The lone feed panel takes the whole workspace: the cascade belongs to a
  // stack, not to the only layer there is.
  expect(await margins(page)).toEqual([{ left: "0px", top: "0px" }]);

  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: CI_CACHE })
    .click();
  await expect(layers(page)).toHaveCount(2);
  const stacked = await margins(page);
  expect(stacked).toHaveLength(2);
  // The base stays whole; the thread steps down and reveals its title bar.
  expect(stacked[0]).toEqual({ left: "0px", top: "0px" });
  expect(stacked[1]?.left).toBe("0px");
  expect(stacked[1]?.top).not.toBe("0px");
});

test("stacks the layers flush on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(threadPath("read-first"));
  await expect(page.getByRole("region", { name: READ_FIRST })).toBeVisible();

  const margin = await page
    .locator(`[${DOC_TOP_ATTR}]`)
    .evaluate((element) => getComputedStyle(element).marginTop);
  expect(margin).toBe("0px");
});

test("renders post code blocks and bundled images", async ({ page }) => {
  await page.goto(threadPath("heap-postmortem"));

  const thread = page.getByRole("region", { name: HEAP_POSTMORTEM });
  await expect(thread.locator("code.language-c")).toBeVisible();
  await expect(thread.locator("pre").getByText("write_thing(old_buf)")).toBeVisible();
  await expect(
    thread.getByRole("img", { name: /moth taped into the Harvard Mark II logbook/ }),
  ).toBeVisible();
});

test("answers an unknown thread with the shell 404", async ({ page }) => {
  await page.goto(threadPath("no-such-thread"));

  await expect(page.getByRole("heading", { level: 1, name: "PATH NOT FOUND" })).toBeVisible();
  await expect(page.getByRole("menubar")).toBeVisible();
});

test("has no accessibility violations", async ({ page }) => {
  await page.goto(FEED_PATH);
  await waitForHydration(page);
  await expectNoViolations(page, FEED_PATH);

  // The guest gate is a dialog of its own.
  await page.getByRole("button", { name: NEW_THREAD }).click();
  const prompt = page.getByRole("dialog", { name: LOGON_PROMPT });
  await expect(prompt).toBeVisible();
  await expectNoViolations(page, "logon prompt");
  await prompt.getByRole("button", { name: "[ CANCEL ]" }).click();

  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: READ_FIRST })
    .click();
  await expect(page.getByRole("region", { name: READ_FIRST })).toBeVisible();
  await expectNoViolations(page, "thread");

  // The media post: code well and a content image with alt text.
  await page.goto(threadPath("heap-postmortem"));
  await expect(page.getByRole("region", { name: HEAP_POSTMORTEM })).toBeVisible();
  await expectNoViolations(page, "thread with code and image");
});

test("has no accessibility violations as a member", async ({ page }) => {
  await logon(page);
  await page.goto(FEED_PATH);
  await waitForHydration(page);

  // The compose layer.
  await page.getByRole("button", { name: NEW_THREAD }).click();
  await expect(page.getByRole("form", { name: "NEW THREAD" })).toBeVisible();
  await expectNoViolations(page, "compose layer");
  await page.keyboard.press("Escape");

  // The thread with vote controls, edit/delete and the reply composer.
  await page
    .getByRole("region", { name: FEED_REGION })
    .getByRole("link", { name: READ_FIRST })
    .click();
  const thread = page.getByRole("region", { name: READ_FIRST });
  await expect(thread).toBeVisible();
  await expectNoViolations(page, "member thread");

  // The reply target chip is part of the composer row.
  await thread
    .getByRole("article")
    .filter({ hasText: "Pinned. If a thread drifts" })
    .getByRole("button", { name: "[ REPLY ]" })
    .click();
  await expect(page.getByText("REPLYING TO")).toBeVisible();
  await expectNoViolations(page, "member thread with reply target");
});

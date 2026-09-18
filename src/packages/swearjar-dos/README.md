# swearjar-dos

The DOS-style UI kit for Swear Jar Labs — **SWEARJAR.DOS**.

## Boundary

- Self-contained: **no imports from the app** (`src/app`, `src/db`, `src/lib`, `src/features`); enforced by ESLint.
- Public API: `index.ts` (components, surfaces, keyboard helpers) and the CSS-free
  `contracts.ts` (`@swearjar/dos/contracts`: `data-*` attributes and
  `FOCUSABLE_SELECTOR`) for consumers without a CSS-aware bundler — the Playwright e2e
  transform cannot load CSS modules, so tests import the contracts entry, never internals.
- Styling: CSS Modules + `tokens.css`. No visual CSS frameworks.
- Import from the app as `@swearjar/dos` (components) or `@swearjar/dos/contracts` (DOM contracts).

## Layout

- `tokens.css` — palette, typography (roles and scale), borders, motion, z-index
- `base.css` — reset and base element styles
- `contracts.ts` — the CSS-free public entry: `data-*` attributes and
  `FOCUSABLE_SELECTOR`, re-exported from `attributes.ts`/`focus.ts`
- `components/<Name>/{Name.tsx, Name.module.css}` — primitives and surfaces
- `commands/` — command types + registry helpers (completion, HELP)
- `sprites.ts` — 16×16 pixel sprite data (the jar and the file-row glyphs)
- `attributes.ts` — shared `data-*` contracts (`DOS_SCROLL_ATTR`, `DOS_ZONE_ATTR`,
  `DOS_ROW_ATTR`, `DOS_ROLE_ATTR`) for keyboard-navigation and typography code in consumers;
  `Stack navRow` stamps the row mark, `useControlWalk` steps between rows with ↑/↓ and
  between their controls with ←/→; `DOS_SCROLL_ATTR` marks a keyboard scroll region
  (a panel body, the file list's scroll box) that the walk measures row visibility against
- `focus.ts` — `FOCUSABLE_SELECTOR` (focusable controls in DOM order for the walk;
  hidden inputs and "smart" controls — native date/time/number pickers, ranges, radios —
  are excluded, since they consume arrows themselves), `nextStepIndex` with
  `isInScrollView` (a row scrolled out of its region enters the visible area from the
  edge in the direction of travel — ↓ first visible, ↑ last visible; the region's
  `scroll-padding` insets the measured viewport, so a sticky header stays out of sight)
  and `nextControlIndex` (the wrapping step both build on)
- `keyboard.ts` — window-listener guards: `shouldSkipEvent` (`defaultPrevented` or
  `isComposing`) and `hasCommandModifier` (Ctrl/Alt/Meta; Shift is not a command
  modifier). `repeat` is not a guard — each listener owns that policy.
- `walk.ts` — `useControlWalk`, the kit's arrow-navigation model. A region with at
  least one marked row (`Stack navRow`) is two-axis: ↑/↓ walk the rows, ←/→ the cells
  of the current row (outside a row they stay native). A region without row markup is
  a flat list: all four arrows step through the controls in DOM order. A step out of
  sight (or without a current control) enters from the visible edge; a held arrow
  walks on with the system auto-repeat; Shift+↑/↓ scrolls an overflowing region. The
  consumer supplies the region resolver (the shell filters by `zone`, `Dialog`
  returns its window body) and its gates.
- `index.ts` — public entrypoint

## Components

- Layout/type: `Stack`, `Heading`, `Text`, `List`, `Link`
- Controls: `Button`, `Field`, `Form`, `Textarea`, `Select`, `Checkbox`
- Surfaces: `Panel`, `Window`, `Dialog` (Radix), `MenuBar` (Radix), `FileTable`
- Effects: `Crt` (the global screen the app lives in: its pseudo-elements paint
  the scanline/vignette filter over the shell and its portaled surfaces),
  `Sprite`, `Screensaver`
- Chrome: `CloseButton` (the title-bar `[X]`, shared by `Window` and app panels)

## Typography roles

UI text carries one role, stamped as `DOS_ROLE_ATTR` (`data-dos-role`); the role table in
`tokens.css` owns color, weight, size, line-height, tracking and the light family's bold
smear, and `Text`/`Heading` read it through the `--dos-text-*` variables. Role colors come
from the tone palette, so the
light surface remap applies to them too; the content palette (markdown directives, boot/welcome)
and literal colors stay on the `tone` prop — UI text uses a role.

| Role       | Color   | Weight  | Notes                                                      |
| ---------- | ------- | ------- | ---------------------------------------------------------- |
| `body`     | inherit | inherit | The default; the light surface makes it bold               |
| `hint`     | dim     | inherit | Secondary text: 0.9em and dim; the ink follows the surface |
| `accent`   | yellow  | inherit | Yellow lines that are not headings                         |
| `danger`   | red     | bold    | Errors                                                     |
| `positive` | green   | inherit | Positive states                                            |
| `heading`  | yellow  | bold    | `Heading` always stamps it; the level adds the size        |

`Text` props split into two mutually exclusive variants: the role variant (`role`, default
`body`, always stamped) and the content variant (`tone` with optional `weight="bold"`), which
rides on the default `body` role. Mixing them is a type error. `Heading` has no role prop — it
is always `heading` — and its levels read the scale tokens (`--dos-text-h1-size` …
`--dos-text-h4-size`, one size for h4–h6), `--dos-text-heading-line-height` and
`--dos-text-heading-tracking`. Body text uses the subtle `--dos-text-body-tracking`; headings
keep their wider tracking. Weights are `--dos-weight-regular` / `--dos-weight-bold`; both map to
the real regular and bold files of Greybeard, and `font-synthesis: none` prevents a browser from
inventing another weight. The `hint` role has no weight or stroke of its own: it is dim and
0.9em, and it rides the surface ink (bold with the smear on the light family).

The kit preserves the case authored by the caller: mixed-case prose and labels stay mixed case,
while DOS commands and canonical identifiers remain uppercase because their source strings are
uppercase. Components do not apply `text-transform`; command matching may normalize input
internally without changing what the user sees. The command line, menu bar and F-key bar are the
deliberate chrome exceptions: they display their content in uppercase.

Greybeard v1.0.0 ([flowchartsman/greybeard](https://github.com/flowchartsman/greybeard), MIT —
the license ships next to the font files) includes Cyrillic, Greek and extensive technical glyph
coverage, so the UI uses one local font family rather than a metric-matched script fallback. Its 18px outlines are used on
desktop and its 16px outlines at the narrow breakpoint, matching the pixel sizes supplied by the
font; body line-heights are whole pixels (22px and 20px) so baselines land on the grid too. Body
text and headings carry no extra letter-spacing, so their characters stay on the font's native
grid. Small text — tags — uses the 16px design at its native 16px on both breakpoints
(`--dos-font-small`, `--dos-font-size-small`, `--dos-line-height-small`): a scaled body outline
smears at chip sizes.

## Surfaces and keys

- Surfaces: **`light`** (default) — the silver window chrome of dialogs, forms, the board
  and the file browser (`Panel`, `Window`, reached through `Dialog`) — and **`paper`** — the
  white client area of readers and lists (documents, the file list). Both share one ink
  family: black text, white inputs and cards, re-colored tones, blue focus rings and links.
  The palettes live once in `tokens.css` under `[data-dos-surface="light" | "paper"]`
  (`DOS_SURFACE_ATTR`); Panel and Window stamp the attribute always. CGA vivid colors do
  not read on light, so accents use their darker, AA-readable relatives and vivid color
  comes back as blocks (tag fills, title bars, selection); a lighter ground raises the AA
  luminance budget, so `paper` carries the brighter accents (still ≥4.5:1 on white). The
  light family carries bold body plus the DOS bold smear (`--dos-text-light-shadow`, a
  `text-shadow` copy half a CSS pixel right — one whole device pixel at dpr2): Greybeard's
  regular cut reads too light on the bright ground, and the smear adds the step without a
  sub-pixel stroke, whose weight flips with the layout phase. `hint` rides the same ink
  (it differs by size and dim color); controls may override the weight too. Panel and Window
  repeat background/color in a compound rule, so the surface owns them against a consumer's
  single-class background; a focused body marks the whole window frame. Disabled buttons
  get their own body color per surface, so they stay visible. The dark palette remains the
  base for the console chrome outside the windows (boot, command line, screensaver), which
  carry their own backgrounds.
- The kit owns the walk (`walk.ts`); the consumer owns zones, gates and closing: the shell
  speaks Norton Commander — **Tab toggles the file list and the right-hand window** (from a
  form control too), **arrows walk the window's controls** with wrap-around, **Enter/Space
  activate**. The command-line capture skips controls, `[role='combobox']` included;
  `Backspace` belongs to the capture too — it edits the line from anywhere.
- Keys reached by several window listeners follow one precedence: **the local control first,
  then the walk by region, then chrome**. Whoever handles an event calls `preventDefault()`;
  the rest respect `defaultPrevented` — listener registration order is not a contract.
  Control semantics and the walk stay in the kit; zones, gates and closing stay in the app.
- `Select` opens on `Enter`/`Space`/`Alt+↓`; a printable key opens the list at the matching
  option (type-ahead). Its arrows belong to the walk while closed.
- `CmdLine` takes `zone` like `Panel`: the shell routes Tab from the line back to the file
  list. Completion applies only while it changes the value (a complete command passes
  through to the panel model).
- Forms: `Enter` toggles a `Checkbox` (Space stays native) and activates buttons;
  `Shift+Enter` submits the form from any control except buttons and links (`Select`
  lets it through). `Shift+↑/↓` scrolls an overflowing walk region; text fields keep
  their selection.
- A window's width is `--dos-window-width` (default `min(560px, 94%)`): a consumer
  widens a specific window through the variable (`Dialog` takes `className` for its
  content root) — the shell's HELP dialog does, to flow its list into columns.
- `Dialog`: Tab stays native inside the Radix trap; the window body is a flat walk
  region (`useControlWalk`), so all four arrows step through its controls with wrap-around,
  and a body without controls keeps the arrows native — the body itself takes focus then,
  so a long HELP text scrolls. The modal body draws no focus ring — focus is trapped in
  the window and the ring only flickered with the input modality; controls keep their rings.
- `Form` and `Panel` are semantic owners of intrinsics: the app composes them, never HTML.

## Extraction

Designed to be lifted into its own repository/package (`SWEARJAR.DOS`) once there is a second consumer. Until then it lives here.

# swearjar-dos

The DOS-style UI kit for Swear Jar Labs — **SWEARJAR.DOS**.

## Boundary

- Self-contained: **no imports from the app** (`src/app`, `src/db`, `src/lib`, `src/features`); enforced by ESLint.
- Public API only through `index.ts`.
- Styling: CSS Modules + `tokens.css`. No visual CSS frameworks.
- Import from the app as `@swearjar/dos`.

## Layout

- `tokens.css` — palette, typography, borders, motion, z-index
- `base.css` — reset and base element styles
- `components/<Name>/{Name.tsx, Name.module.css}` — primitives and surfaces
- `commands/` — command types + registry helpers (completion, HELP)
- `sprites.ts` — pixel sprite data (the swear jar)
- `attributes.ts` — shared `data-*` contracts (`DOS_SCROLL_ATTR`, `DOS_ZONE_ATTR`) for
  keyboard-navigation code in consumers
- `focus.ts` — `FOCUSABLE_SELECTOR` (focusable controls in DOM order, shared by the
  panel walk and the dialog arrow cycle; hidden inputs and "smart" controls — native
  date/time/number pickers, ranges, radios — are excluded, since they consume arrows
  themselves) and `nextControlIndex` (wrapping walk, `-1` enters from an edge)
- `index.ts` — public entrypoint

## Components

- Layout/type: `Stack`, `Heading`, `Text`, `List`, `Link`
- Controls: `Button`, `Field`, `Form`, `Textarea`, `Select`, `Checkbox`
- Surfaces: `Panel`, `Window`, `Dialog` (Radix), `MenuBar` (Radix), `StatusBar`, `FileTable`
- Effects: `Crt`, `Sprite`, `Screensaver`
- Chrome: `CloseButton` (the title-bar `[X]`, shared by `Window` and app panels)

## Surfaces and keys

- `Panel surface="light"` and `Window surface="light"` (reached through `Dialog surface`) share
  the light surface — the prototype's `.win-body.form`: black text on light gray, white inputs,
  re-colored tones, form controls and focus rings. The palette lives once in `tokens.css` under
  `[data-dos-surface="light"]` (`DOS_SURFACE_ATTR`); the components opt in through the attribute,
  and the dark look stays the fallback. The surface is bold: primary text is black on gray there,
  and VT323's 400 strokes read too thin — tones keep their colors, controls may override weight.
  Panel repeats background/color in a compound rule, so the surface owns them against a consumer's
  single-class background; a focused body marks the whole window frame. Disabled buttons get their
  own body color per surface, so they stay visible.
- The kit owns focus primitives (`focus.ts`), the consumer owns the model: the shell speaks
  Norton Commander — **Tab toggles the file list and the right-hand window** (from a form
  control too), **bare ↑/↓ walk the window's controls** with wrap-around, **Enter/Space
  activate**. The command-line capture skips controls, `[role='combobox']` included.
- Keys reached by several window listeners follow one precedence: **the local control first,
  then the consumer's hook by zone, then chrome**. Whoever handles an event calls
  `preventDefault()`; the rest respect `defaultPrevented` — listener registration order is
  not a contract. Control semantics stay in the kit, navigation stays in the shell.
- `Select` opens on `Enter`/`Space`/`Alt+↓`; a printable key opens the list at the matching
  option (type-ahead). Its arrows belong to the shell's walk while closed.
- `CmdLine` takes `zone` like `Panel`: the shell routes Tab from the line back to the file
  list. Completion applies only while it changes the value (a complete command passes
  through to the panel model).
- Forms: `Enter` toggles a `Checkbox` (Space stays native) and activates buttons;
  `Shift+Enter` submits the form from any control except buttons and links (`Select`
  lets it through). `Shift+↑/↓` scrolls an overflowing window in the shell's panel
  model; text fields keep their selection.
- A window's width is `--dos-window-width` (default `min(560px, 94%)`): a consumer
  widens a specific window through the variable (`Dialog` takes `className` for its
  content root) — the shell's HELP dialog does, to flow its list into columns.
- `Dialog`: Tab stays native inside the Radix trap; ←/→/↑/↓ cycle the body's controls, while
  on the window surface ↑/↓ stay native so a long HELP text scrolls (the body takes focus
  when the dialog has no controls). The modal body draws no focus ring — focus is trapped in
  the window and the ring only flickered with the input modality; controls keep their rings.
- `Form` and `Panel` are semantic owners of intrinsics: the app composes them, never HTML.

## Extraction

Designed to be lifted into its own repository/package (`SWEARJAR.DOS`) once there is a second consumer. Until then it lives here.

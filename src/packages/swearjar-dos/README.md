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
- `index.ts` — public entrypoint

## Components

- Layout/type: `Stack`, `Heading`, `Text`, `List`, `Link`
- Controls: `Button`, `Field`, `CmdLine`, `KeyBar`
- Surfaces: `Panel`, `Window`, `Dialog` (Radix), `MenuBar` (Radix), `StatusBar`, `FileTable`
- Effects: `Crt`, `Sprite`, `Screensaver`

## Extraction

Designed to be lifted into its own repository/package (`SWEARJAR.DOS`) once there is a second consumer. Until then it lives here.

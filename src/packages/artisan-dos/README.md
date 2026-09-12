# artisan-dos

The DOS-style UI kit for Artisan Softworks — **ARTISAN.DOS**.

## Boundary

- Self-contained: **no imports from the app** (`src/app`, `src/db`, `src/lib`).
- Public API only through `index.ts`.
- Styling: CSS Modules + `tokens.css`. No visual CSS frameworks.
- Import from the app as `@artisan/dos`.

## Layout

- `tokens.css` — palette, typography, borders, motion
- `components/` — primitives and layout (added as we build)
- `index.ts` — public entrypoint

## Extraction

Designed to be lifted into its own repository/package (`ARTISAN.DOS`) once there is a second consumer. Until then it lives here.

# swearjar-dos

The DOS-style UI kit for Swear Jar Labs — **SWEARJAR.DOS**.

## Boundary

- Self-contained: **no imports from the app** (`src/app`, `src/db`, `src/lib`).
- Public API only through `index.ts`.
- Styling: CSS Modules + `tokens.css`. No visual CSS frameworks.
- Import from the app as `@swearjar/dos`.

## Layout

- `tokens.css` — palette, typography, borders, motion
- `components/` — primitives and layout (added as we build)
- `index.ts` — public entrypoint

## Extraction

Designed to be lifted into its own repository/package (`SWEARJAR.DOS`) once there is a second consumer. Until then it lives here.

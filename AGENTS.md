<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Swear Jar Labs — agent notes

A workshop for engineers: FORUM, ERRATA, READROOM and project work in
**SWEARJAR.DOS**, a keyboard-friendly DOS-style interface. Public repo, MIT.

## Stack

- Next.js 16 (App Router, React Server Components) + TypeScript strict — render
  on the server by default; add `"use client"` only where interactivity needs it.
- UI kit: `src/packages/swearjar-dos` (CSS Modules + design tokens) — every page
  builds from it. The kit never imports app code.
- Postgres 17 + Drizzle ORM (`src/db/schema.ts`, migrations in `drizzle/`);
  Better Auth for accounts and sessions (`src/auth.ts`).
- Vitest for units, Playwright for e2e. **npm** only (pnpm/corepack is broken here).
- All user-visible strings live in `src/content/messages.ts`; plural forms come
  from `src/lib/plural.ts`. Components never carry their own copy.

## Layout (feature slices)

```
src/app/**            routing only: Next files and thin re-exports of feature facades
src/features/<name>/  vertical slice of one section (shell, account, board, tickets, ...)
  index.ts            facade for src/app (pages, pages' metadata)
  contracts/          what other features may see: explicit re-exports, no logic
  model/              pure: types, zod schemas, rules (no IO)
  data/               access layer: queries, stores, server actions, fixtures
src/shared/**         primitives used by several features (Markdown, members, mock switch)
src/lib/**            app-wide helpers (env, auth client, markdown pipeline)
src/content/**        command registry, messages, docs loading
src/packages/**       the SWEARJAR.DOS UI kit and its own tests
src/db/**             Drizzle schema + pooled client; src/auth.ts is the Better Auth server
```

Import direction: `app → features (facade) → contracts → own internals → shared →
lib/content/db/packages`. Features may import their own and other features'
contracts, never another feature's internals; `features/* → features/shell` is the
one exception (the frame). ESLint enforces the boundaries and rejects cycles — if
you add a cross-feature import, check the whole loop, not one edge.

A contract barrel publishes leaves only: a module that itself reads another
feature's contract must not be re-exported from a barrel, or the graph closes a
cycle (`board → members → board`).

## Conventions (reviewed, not suggestions)

- Commits: Conventional Commits, single-line subject (`feat: ...`), no body.
- No dead code and no "for later" APIs: extend a public surface under a real
  consumer or a test, delete the rest.
- No DOM programming: no `.click()`, no `querySelector`/`closest` for structure.
  Activation goes through callbacks; focus and `scrollIntoView` by known id are
  fine. Cross-layer contracts are exported constants (data attributes), not
  strings typed at the call site.
- Named constants for meaningful numbers, paths, prefixes and keys; literal at
  the call site is a signal to extract. If JS and CSS need the same value, it is
  declared once (token + TS constant, linked by a comment).
- Linked lists (commands ↔ files ↔ menus ↔ keys) use a union type from `as const`,
  and a unit test proves they stay in step.
- Typography roles (`body`, `hint`, `accent`, `danger`, `positive`, `heading`)
  come from `tokens.css`; `Heading` is always `heading`, `Text` takes either a
  role or content tone/weight — not both.
- Tests mirror `src/` under `tests/unit/**`; kit tests live inside the package
  (`src/packages/*/tests/**`); e2e flows in `tests/e2e/`. Pure logic gets a unit
  test; e2e proves behaviour and never replaces a unit test.

## Commands (run from the repo root, bare — no pipes that hide exit codes)

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
npm run test:e2e    # Playwright; sets SWEARJAR_E2E=1, own dev server on :3100
npm run db:migrate  # apply drizzle/ to DATABASE_URL
npm run build
```

Generate a migration with a name that says what changed —
`npm run db:generate -- --name=sync_community_levels` →
`drizzle/20261003204512_sync_community_levels.sql`. The timestamp prefix is
configured once (`migrations.prefix` in `drizzle.config.ts`) and orders the
history; the name is not optional in spirit: without it the tool writes a random
three-word file name that tells a reader nothing. Never rename migration files
by hand — the journal and the snapshot chain reference them.

`SWEARJAR_E2E=1` (see `src/shared/mock.ts`) marks the seeded run: the global
setup recreates the e2e schema and seeds fixture accounts, and specs sign in
through real Better Auth sessions (loopback OAuth stand-ins behind the
`google`/`github` ids). The suite needs PostgreSQL: by default the global
setup starts the local compose service `db-e2e` when it is down and stops it
after the run only if it started it; `E2E_DATABASE_URL` points the run at an
external database and disables that management. The e2e run is not a statement
about which parts of the app are server-backed — that is what README.md
describes, and it changes as features land.

## Wiring a feature to the server

Pages and their data functions are the stable seam: when a fixture-backed
feature gets a real backend, the bodies of the `data/` functions and server
actions change while their signatures — and every caller — stay as they are.
Keep that shape, and keep types in `model/` free of IO.

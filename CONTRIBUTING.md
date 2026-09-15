# Contributing

Contributions are welcome. Keep changes small and readable; expect review.

## Code style

- TypeScript strict. Small, explicit modules. Avoid premature abstraction.
- Prefer readable code over clever code.
- Comments explain _why_, not _what_; most code needs none.
- Keep files focused. A component around 200 lines or a hook around 80 is a prompt to ask
  "which two responsibilities got mixed here?", not a hard limit; split by responsibility,
  not by line count.
- Lists that reference each other by id (commands, files, menus, keys) share a union type;
  a unit test keeps them consistent.
- No DOM programming: activation goes through callbacks, not `.click()`; shared contracts
  are exported constants (`data-*`), not strings typed in place.
- Name meaningful numbers and strings (timings, sizes, paths, attributes). If JS and CSS
  need the same value, declare it once (token + constant).
- UI strings and plural forms live in `src/content/messages.ts` (selected via
  `src/lib/plural.ts`); components keep no strings of their own. Ids, paths and canon stay
  in code.
- Pure logic gets Vitest tests; e2e covers behavior, and keyboard-facing scenarios get an
  axe check. No `waitForTimeout` in tests.
- Before a PR: `npm run typecheck && npm run lint && npm run format:check && npm test`
  (add `npm run test:e2e` for UI changes).

## Workflow

1. Pick or open a ticket. Write a short spec: problem, approach, cost.
2. Branch: `feat/...`, `fix/...`, `docs/...`.
3. Small, focused commits (conventional commit messages).
4. Open a PR. Expect review and questions like "explain why this way".
5. Merge after review, then share what changed and what we learned on the board.

## Behavior

Be kind. We are all cats and floofs here. Toxicity is not a style — it is grounds for removal.

# Contributing

Contributions are welcome. Keep changes small and readable; expect review.

The current milestone is a functional UI on mocks. Keep backend integration, database changes and migrations out of UI-only work. Demo accounts are not real authentication or authorization; don't treat their checks as production security.

## Code style

- TypeScript strict. Small, explicit modules. Avoid premature abstraction.
- Layout is feature-sliced: routes in `src/app` stay thin (re-export a feature facade);
  a section lives in `src/features/<name>` with an `index.ts` facade for routing.
  Other features use its `contracts/index.ts`, never its internals. Inside a feature,
  use relative imports. `features/* → features/shell` is the frame exception; shell
  does not import other features. Shared modules and the UI kit do not import features.
  Contract barrels only re-export their own leaves; check the whole import graph for cycles.
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
  in code. Boot and welcome copy lives in `src/content/landing.ts`; public documents
  live in `content/docs/en/`.
- Unit tests live in `tests/unit` (mirroring `src`; kit tests stay inside the kit) and e2e in
  `tests/e2e`. Pure logic gets Vitest tests; e2e covers behavior, and keyboard-facing scenarios
  get an axe check. No `waitForTimeout` in tests.
- Before a PR: `npm run typecheck && npm run lint && npm run format:check && npm test`
  (add `npm run test:e2e` for UI changes).

## Workflow

1. Pick or open a ticket. Write a short spec: problem, approach, cost.
2. Branch: `feat/...`, `fix/...`, `docs/...`.
3. Small, focused commits (conventional commit messages).
4. Open a PR. Expect review and questions like "explain why this way".
5. Merge after review, then share what changed and what we learned on the board.

## Tools and learning

You may use AI tools in project work, provided you review all generated code yourself and take
responsibility for it. Be ready to explain the change, its trade-offs and how you checked it.
"The model wrote it" is not a review response.

If you're starting out, we recommend writing as much as possible yourself, with minimal AI
assistance. Make your own decisions and work through the mistakes with more experienced
developers. The practice is part of the point.

## Writing for the interface

- Be direct, specific and welcoming. Dry humor belongs in the flavor, not in place of an explanation.
- Use uppercase for section names and commands such as READROOM and HELP, and canonical filenames such as HOW-IT-WORKS.TXT. Use sentence case for prose; Participant and Member name participation levels, not commands.
- Errors explain what happened and what to do next. Confirmations explain what will change and what will remain.
- Describe the build that exists. Keep demo limitations close to the relevant action; don't imply that data was sent or saved when it wasn't.

## Behavior

Kindness is a rule, not a mood. Critique the work, not the person. Explain what could be better
and why. If you're stuck or need to step away, keep the people working with you in the loop.

Only share code and materials you have permission to publish. Leave passwords, tokens and
other people's private information out of posts, issues and pull requests.

# Swear Jar Labs

A workshop for people who want to understand how software works — and how to build it well.

We write code, question it, and help each other fix what we were sure would work. The platform brings together FORUM, ERRATA, READROOM and project work in **SWEARJAR.DOS**, a keyboard-friendly DOS-style interface. Open source, MIT licensed.

## Stack

- **Next.js** (App Router, React Server Components) + TypeScript strict
- **SWEARJAR.DOS** — our DOS-style UI kit
- **CSS Modules** for CRT/DOS styling
- **Vitest** + **Playwright**
- **PostgreSQL 18**, **Drizzle ORM**, **Better Auth**
- **Docker Compose** (`web` + `db` + `caddy`)

## Getting started

Requirements: Node 22, npm and a PostgreSQL 18 instance (local install or Docker).

Install and run:

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

REGISTER creates an account with a username, email and password (8 characters or more); LOGON then accepts either the username or the email with that password. Accounts join as Participants. An account created through a provider (Google, GitHub) gets a username derived from its mailbox — `ada@lab.io` becomes `ada`, and a taken handle gets a numeric suffix. The provider buttons appear only when OAuth credentials are set in `.env` — without them the forms stay on email and password.

APPLY submits a Member application; `admin` and `coadmin` review it through ADMIN.EXE. A decision updates the account.
Members can propose projects from PROJECTS, choosing technologies from the shared catalog; `admin` and `coadmin` review proposals in ADMIN.EXE. Approval lists the project and makes its author the first Maintainer.

`npm run db:migrate` applies the versioned SQL in `drizzle/`. UUID keys use `gen_random_uuid()`, which has been in PostgreSQL core since version 13 — no extension to install. Migrations are generated with a name that says what changed: `npm run db:generate -- --name=sync_community_levels` writes `drizzle/20261003204512_sync_community_levels.sql` — the timestamp prefix (`migrations.prefix` in `drizzle.config.ts`) orders the history, the name describes the change. Without `--name` drizzle-kit invents a random three-word name. Values in `.env.example` are local placeholders, not production secrets.

## Scripts

| Command                | What it does                                         |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start the dev server                                 |
| `npm run build`        | Production build                                     |
| `npm run typecheck`    | Generate Next route types, then TypeScript (no emit) |
| `npm run lint`         | ESLint                                               |
| `npm run format`       | Format with Prettier                                 |
| `npm run format:check` | Check formatting                                     |
| `npm run db:generate`  | Generate SQL migrations (pass `--name=<change>`)     |
| `npm run db:migrate`   | Apply migrations                                     |
| `npm run db:push`      | Push the schema directly (local dev)                 |
| `npm run db:studio`    | Open Drizzle Studio                                  |
| `npm test`             | Unit tests (Vitest)                                  |
| `npm run test:e2e`     | End-to-end tests (Playwright, isolated dev server)   |

## Contributing

Playwright starts a fresh dev server on `http://localhost:3100` for each run and
stores its build output in `.next-e2e`. It does not reuse the interactive server
on port 3000. The suite needs PostgreSQL: the runner manages the local compose
service `db-e2e` itself — it starts it (same server version, separate instance
on `:5433`, database `swearjar_e2e`) when it is down, and stops it afterwards
only if it started it. Set `E2E_DATABASE_URL` to point the run at an external
database (CI, a long-running local instance) and the harness leaves Docker
alone. The runner also sets `SWEARJAR_E2E=1` and recreates the e2e schema
before the run: migrations apply, fixture accounts seed, and every spec signs
in through real Better Auth sessions — Google/GitHub buttons run a genuine
OAuth handshake against loopback stand-ins, so no traffic leaves the machine.
Failed tests retain a trace in `test-results`; open it
with `npx playwright show-trace <path-to-trace.zip>`.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) first. The short version: keep changes readable and expect review.

## License

MIT — see [LICENSE](./LICENSE).

# Swear Jar Labs

A workshop for people who want to understand how software works — and how to build it well.

We write code, question it, and help each other fix what we were sure would work. The platform brings together FORUM, ERRATA, READROOM and project work in **SWEARJAR.DOS**, a keyboard-friendly DOS-style interface. Open source, MIT licensed.

This repository currently runs on demo data. Threads, notes, ticket edits and project settings live in browser memory and reset on reload. Terminal preferences persist in this browser; demo sign-in uses a cookie. Member applications, project proposals, approved projects and admin decisions live in the dev server process and reset when it restarts. Repository counters and demo activity are fixtures, not live integrations.

The next milestone is a complete UI on mocks. Real registration, project permissions and shared storage are not implemented yet. The backend choice is still open; the existing database and auth scaffold is not a commitment to the final stack.

## Stack

- **Next.js** (App Router, React Server Components) + TypeScript strict
- **SWEARJAR.DOS** — our DOS-style UI kit (in progress)
- **CSS Modules** for CRT/DOS styling
- **Vitest** + **Playwright**
- Scaffold: **PostgreSQL 17**, **Drizzle ORM**, **Better Auth** and **Docker Compose** (`web` + `db` + `caddy`). Real authentication and database-backed workflows are not wired up.

## Getting started

Requirements: Node 22 and npm. The mock UI does not need a running database or OAuth credentials.

Install and run:

```bash
npm install
cp .env.example .env
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

In development, LOGON accepts a valid username and any non-empty demo password. Use made-up credentials, never a real password. The Google and GitHub buttons simulate sign-in as `ada` and `grace`; they do not contact those providers. Demo sessions are disabled in production and are not a security boundary.

New demo accounts join as Participants. APPLY submits a demo Member application; `admin` and `coadmin` can review it through ADMIN.EXE. A decision updates the demo account, with no email or external delivery.
Members can propose projects from PROJECTS. They choose technologies from the shared catalog; `admin` and `coadmin` review proposals in ADMIN.EXE. Approval lists the project and makes its author the first Maintainer in the demo process.

The database scripts below belong to the scaffold. Do not run schema pushes or generate migrations for UI-only changes; backend integration is a separate step. Values in `.env.example` are local placeholders, not production secrets.

## Scripts

| Command                | What it does                                         |
| ---------------------- | ---------------------------------------------------- |
| `npm run dev`          | Start the dev server                                 |
| `npm run build`        | Production build                                     |
| `npm run typecheck`    | Generate Next route types, then TypeScript (no emit) |
| `npm run lint`         | ESLint                                               |
| `npm run format`       | Format with Prettier                                 |
| `npm run format:check` | Check formatting                                     |
| `npm run db:generate`  | Generate SQL migrations from the schema              |
| `npm run db:migrate`   | Apply migrations                                     |
| `npm run db:push`      | Push the schema directly (local dev)                 |
| `npm run db:studio`    | Open Drizzle Studio                                  |
| `npm test`             | Unit tests (Vitest)                                  |
| `npm run test:e2e`     | End-to-end tests (Playwright, isolated dev server)   |

## Contributing

Playwright starts a fresh dev server on `http://localhost:3100` for each run and
stores its build output in `.next-e2e`. It does not reuse the interactive server
on port 3000, so demo accounts and application queues start from their seed data.
The runner sets `SWEARJAR_E2E=1` automatically. Failed tests retain a trace in
`test-results`; open it with `npx playwright show-trace <path-to-trace.zip>`.

Read [CONTRIBUTING.md](./CONTRIBUTING.md) first. The short version: keep changes readable and expect review.

## License

MIT — see [LICENSE](./LICENSE).

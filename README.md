# Swear Jar Labs

A workshop for people who want to understand how software works — and how to build it well.

We write code, question it, and help each other fix what we were sure would work. The platform brings together DISCUSSIONS, ERRATA, READROOM and project work in **SWEARJAR.DOS**, a keyboard-friendly DOS-style interface. Open source, MIT licensed.

This repository currently runs on demo data. Threads, notes, tickets and project changes live in browser memory and reset on reload. Terminal preferences persist in this browser; demo sign-in uses a cookie. Application forms do not submit applications, and repository counters and demo activity are fixtures, not live integrations.

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
| `npm run test:e2e`     | End-to-end tests (Playwright)                        |

## Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) first. The short version: keep changes readable and expect review.

## License

MIT — see [LICENSE](./LICENSE).

# Swear Jar Labs

The platform of the Swear Jar Labs community: public discussion, code reading, and project work. Open source (MIT), built with Next.js and PostgreSQL.

Most of us learned to program the same way: wrote code, broke it, fixed what we broke. That feedback loop is fading. As AI writes more of the code, the work moves toward reading and judging it. But reading is earned by writing, and juniors get fewer chances to cut their teeth. We're building this space to make that practice deliberate: through real projects, public review, and owning our mistakes.

Early, in active development: this repository currently holds the platform skeleton.

## Stack

- **Next.js** (App Router, React Server Components) + TypeScript strict
- **PostgreSQL** + **Drizzle ORM**
- **Better Auth** (Google, GitHub, and user + password)
- **SWEARJAR.DOS** — our DOS-style UI kit (in progress)
- **CSS Modules** for CRT/DOS styling
- **Vitest** + **Playwright**
- **Docker Compose**: `web` + `db` + `caddy`

## Getting started

Requirements: Node 22 (npm included) and PostgreSQL 17.

Start a local database:

```bash
docker run --name swearjar-db \
  -e POSTGRES_USER=swearjar \
  -e POSTGRES_PASSWORD=swearjar \
  -e POSTGRES_DB=swearjar \
  -p 5432:5432 -d postgres:17-alpine
```

Install and run:

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

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

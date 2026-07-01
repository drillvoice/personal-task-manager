# personal-task-manager

A personal GTD task and project manager, built as a mobile-first PWA. Single
user, real login, live daily use.

- **Getting the app running the first time:** [`initial-setup.md`](./initial-setup.md)
- **Product spec:** [`docs/task-app-spec.md`](./docs/task-app-spec.md)
- **UI reference mockup:** [`docs/task-app-mockup.jsx`](./docs/task-app-mockup.jsx)
- **Conventions & rules for future work:** [`CLAUDE.md`](./CLAUDE.md)
- **Changelog:** [`CHANGELOG.md`](./CHANGELOG.md)

## Local development

Once `.env.local` is filled in (see `initial-setup.md` §5):

```bash
pnpm install
pnpm db:migrate
pnpm db:seed       # optional — populates the mockup's fixture data
pnpm dev
```

## Common scripts

| Script | What it does |
|---|---|
| `pnpm dev` | Next dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` — run this before considering any change done |
| `pnpm test` | Vitest — the targeted-tests set (priority cap, week bucketing, streak) |
| `pnpm db:generate` | Generate a new Drizzle migration from schema changes |
| `pnpm db:migrate` | Apply pending migrations to `DATABASE_URL` |
| `pnpm db:seed` | Wipe + reseed dev database with the mockup fixtures |
| `pnpm db:studio` | Open Drizzle Studio against `DATABASE_URL` |

## Stack

Next.js 16 App Router · TypeScript strict · Tailwind v4 · Drizzle ORM +
postgres.js on Neon · Auth.js v5 magic-link (Resend) · vitest.

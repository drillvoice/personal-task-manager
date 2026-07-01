# AGENTS.md — project conventions

This is a personal, single-user GTD task/project app. Solo project, not a
team codebase — process is lightweight but the app runs against real daily-use
data, so correctness matters.

## Source of truth
- **`docs/task-app-spec.md`** — the authoritative product spec. Anything not
  covered here defers to it.
- **`docs/task-app-mockup.jsx`** — the interactive UI reference. Component
  structure, design tokens, and interaction logic were ported from this file.
  Any UI change should keep the mockup's language (paper/ink tokens, mono
  metadata, dashed empty slots, chip-based filters).

## Stack
- Next.js 16 (App Router), TypeScript strict, Tailwind v4 (CSS-first `@theme`)
- Drizzle ORM + postgres.js against Neon Postgres
- Auth.js v5 (beta) with GitHub OAuth, single-user `ALLOWED_EMAIL` allowlist
  gate (the app was briefly on Resend magic-link — swapped out because for a
  single-user app the email path had too many moving parts)
- date-fns / date-fns-tz — **all "today" and week-bucket logic must go
  through `src/lib/time.ts`** and stay anchored to `Australia/Sydney`
- vitest for the handful of tests we do keep

## Auth architecture — non-obvious constraints

Read this before editing `src/lib/auth.ts`, `src/lib/auth.config.ts`, or
`middleware.ts`. These are baked-in constraints, not preferences — each
represents a bug we already hit.

- **Split-config is required, not optional.** `src/lib/auth.config.ts` must
  stay edge-safe (no Drizzle adapter, no postgres.js import path).
  `middleware.ts` imports it directly and constructs a minimal NextAuth
  instance. Importing the full `src/lib/auth.ts` from middleware causes
  `MIDDLEWARE_INVOCATION_TIMEOUT` on Vercel because postgres.js can't run on
  the edge runtime.
- **JWT session strategy needs explicit id mapping.** The `jwt` + `session`
  callbacks in `auth.config.ts` thread `user.id` through the token onto
  `session.user.id`. Auth.js v5 does NOT do this automatically for JWT
  sessions — remove those callbacks and `requireUserId()` will start looping
  with middleware after a fresh sign-in.
- **`allowDangerousEmailAccountLinking: true` on the GitHub provider is
  deliberate.** The "danger" only applies to multi-user apps (attacker
  signs up for OAuth with your email → auto-linked to your account). We're
  gated by an `ALLOWED_EMAIL` allowlist, so any OAuth account with that
  email is legitimately Joel. Removing this flag will strand the app in
  `OAuthAccountNotLinked` whenever a fresh sign-in meets an existing user
  row (e.g. after a schema reset or another provider swap).
- **`/api/*` is excluded from the middleware matcher on purpose.** The
  Auth.js callback route must not run through our redirect logic. Server
  actions handle their own session checks via `requireUserId()`.
- **`AUTH_URL` must never be set on Vercel Production/Preview.** Leave it
  unset and Auth.js reads `VERCEL_URL`. Setting it explicitly to something
  static will misdirect every OAuth callback.

## Communication

**Terse is not always good.** For deployment, env-var, or third-party
provider setup, brevity has repeatedly cost Joel time — instructions get
skimmed, subtle constraints get missed, and he ends up redeploying twice.

Concrete rules:
- **Call out cross-value constraints as their own paragraph**, not as one
  bullet in a list of "verify these are set." Example: `ALLOWED_EMAIL` must
  match the email address associated with the Resend account when using the
  `onboarding@resend.dev` sandbox sender — that's a *constraint between two
  variables*, and it needs its own callout, not a bullet.
- **Front-load prerequisites.** If a fix depends on X being true, state X
  before the fix, not after it.
- **Prefer one complete explanation over a series of short follow-ups.**
  If the diagnosis involves 3+ potential causes or subtle env-var
  interactions, spend the paragraph. A round-trip conversation costs more
  than a longer message.
- This applies to setup and ops work specifically. For code review,
  code changes, and coding-question answers, terse is still fine.

## Standing rules

**Run `pnpm typecheck` before considering any task done.** TypeScript is the
main correctness net; if it fails, the task isn't done.

**Run `pnpm test` after touching:**
- `src/lib/time.ts` — week bucketing / today / due labels
- `src/lib/server/priority-cap.ts` — the "exactly 3" cap enforcement
- `src/lib/server/streak.ts` — streak calculation
Any other file with a `*.test.ts` sibling.

**Never hand-alter the database schema.** Every change goes through
`pnpm db:generate` (Drizzle migration file) → committed alongside the code
that needs it → applied via `pnpm db:migrate`. If a migration would drop or
rewrite data, pause and confirm with Joel first — this database holds real
daily-use data.

**Never mock the DB in integration tests.** Priority-cap and streak logic are
unit-tested in isolation (see `*.test.ts` next to each). If a test would need
DB fixtures, ask before adding one — we haven't invested in the harness for it.

**Preserve the design tokens.** Colours, fonts, and spacing live as CSS custom
properties in `src/app/globals.css` inside `@theme`. Do not add new one-off
hex codes in components — reach for the token, or add a new token if the palette
genuinely needs one.

**Priority is required, defaults to 3.** Every task always has a P1/P2/P3
badge. Never hide it. See `src/components/priority-badge.tsx`.

**Inbox is a pseudo-project** (`projectId = null`). It appears in the Tasks
view but is *excluded* from the Projects history table. See
`src/lib/server/tasks.ts` and `src/lib/server/projects.ts`.

## Code style
- No comments explaining *what* code does — well-named identifiers cover it.
  Only add a comment when the *why* is non-obvious (a workaround, a subtle
  invariant, a boundary decision).
- Prefer editing existing files to adding new ones.
- Prefer server components + server actions. Client components only for
  interactive state (checkbox toggle, filter chips, textarea autosave).

## Deliberately skipped
- CI, feature flags, semver — see `docs/task-app-spec.md` §8.
- Multi-user, offline-first writes, mobile-optimised Projects table — see §10.

## Handoff docs
- `initial-setup.md` — everything Joel needs to do manually to bring the app up
  in Vercel + Neon + Resend. If any env var or provisioning step changes, that
  file needs to change with it.
- `CHANGELOG.md` — Keep-a-Changelog style. Add an entry whenever behaviour
  visibly changes. No version tagging discipline is required.

# AGENTS.md — project conventions

> **Keep `CLAUDE.md` in sync.** This file is a near-identical mirror of
> `CLAUDE.md` for other agent tooling. Any change here should be made in
> `CLAUDE.md` too (and vice versa).

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
- Drizzle ORM against Neon Postgres. **The app runtime queries over Neon's
  HTTP endpoint** (`drizzle-orm/neon-http` + `@neondatabase/serverless`, wired
  in `src/lib/db/index.ts`) — no TCP pool, no interactive transactions (nothing
  uses `db.transaction`). **postgres.js is used only by the local CLI scripts**
  (`src/db/migrate.ts`, `src/db/seed.ts`), which run over TCP. Schema lives at
  `src/lib/db/schema.ts`; migrations at `src/db/migrations`.
- Auth.js v5 (beta) with GitHub OAuth, single-user `ALLOWED_EMAIL` allowlist
  gate (the app was briefly on Resend magic-link — swapped out because for a
  single-user app the email path had too many moving parts)
- date-fns / date-fns-tz — **all "today" and week-bucket logic must go
  through `src/lib/time.ts`** and stay anchored to `Australia/Sydney`
- chrono-node — natural-language due-date parsing in task titles
  (`src/lib/server/parse-due-date.ts`); its reference date is anchored to
  `Australia/Sydney` via `time.ts`, not the runtime's UTC clock
- vitest for the handful of tests we do keep
- **Hosting is region-pinned to Australia** — Vercel functions and the Neon
  Postgres instance both run on Australian (Sydney) servers, matching the
  app's `Australia/Sydney` time anchoring.

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
- **Make important caveats visually prominent — Joel scans.** When a
  response ends with a "one thing worth flagging" style caveat, trade-off,
  or gotcha that Joel genuinely needs to notice, don't leave it as an
  ordinary sentence buried at the bottom. Keeping it last is good, but set
  it off so it survives a scan: give it its own heading (e.g. a bold
  **⚠️ Heads-up** line), extra blank lines around it, or a blockquote.
  Reserve this for things that actually matter — if every response shouts,
  nothing does.

## Standing rules

**Run `pnpm typecheck` before considering any task done.** TypeScript is the
main correctness net; if it fails, the task isn't done.

**Run `pnpm test` after touching:**
- `src/lib/time.ts` — week bucketing / today / due labels
- `src/lib/server/parse-due-date.ts` — natural-language due-date extraction
  (timezone-sensitive; shares `time.ts`'s Sydney anchoring)
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

**Priority is a tag, not a field.** There is no `tasks.priority` column —
priority is expressed as a `p1`/`p2`/`p3` task tag, same as any other tag.
`src/lib/priority.ts` derives a task's effective priority from its tag names
(`priorityFromTagNames`, case-insensitive; highest wins if more than one is
present) and provides the sort comparator (`comparePriority`, untagged sorts
last). Views that already load a task's full tag list (Tasks, Meetings)
derive priority from it directly; views that don't (Today, Review) use
`src/lib/server/task-priority.ts#loadTaskPriorities`. A task with no priority
tag has no badge — `src/components/priority-badge.tsx` renders nothing for
`null`. Quick-capture's inline `#tag` syntax (see review actions) is the
normal way to set it, e.g. `ring matthew #p1`.

**Inbox is a pseudo-project** (`projectId = null`). It appears in the Tasks
view but is *excluded* from the Projects history table. See
`src/lib/server/tasks.ts` and `src/lib/server/projects.ts`.

## Code style
- No comments explaining *what* code does — well-named identifiers cover it.
  Only add a comment when the *why* is non-obvious (a workaround, a subtle
  invariant, a boundary decision).
- Prefer editing an existing file over creating a new one *for the same
  concern* — but keep the codebase's one-concern-per-file grain; split when a
  file starts doing two jobs or gets unwieldy, not to avoid touching existing
  code.
- Prefer server components + server actions. Client components only for
  interactive state (checkbox toggle, filter chips, textarea autosave).

## Deliberately skipped
- CI, feature flags, semver — see `docs/task-app-spec.md` §8.
- Multi-user, offline-first writes, mobile-optimised Projects table — see §10.

## Handoff docs
- `initial-setup.md` — everything Joel needs to do manually to bring the app up
  in Vercel + Neon + GitHub OAuth (both Vercel and Neon are region-pinned to
  Australia). If any env var or provisioning step changes, that file needs to
  change with it.
- `CHANGELOG.md` — Keep-a-Changelog style. Add an entry whenever behaviour
  visibly changes. No version tagging discipline is required.

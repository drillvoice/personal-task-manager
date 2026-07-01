# Changelog

Kept in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style. No
SemVer discipline — see `CLAUDE.md` and the spec §8.

## [Unreleased]

### Fixed
- Post-sign-in `ERR_TOO_MANY_REDIRECTS`. Cause: Auth.js v5 with JWT session
  strategy doesn't auto-populate `session.user.id` — `requireUserId()` bounced
  to /login, middleware saw a valid cookie and bounced back to /today, forever.
  Fix: explicit `jwt` and `session` callbacks in `src/lib/auth.config.ts` that
  copy `user.id` through the token, plus a belt-and-braces `session.user.id`
  check on the login page's server-side redirect.
- No visual feedback when clicking "Send magic link". Extracted the login form
  into `src/components/login-form.tsx`, a client component with explicit
  idle → sending → sent | error states. The server action now calls `signIn`
  with `redirect: false` so we can render a proper "Check your email"
  confirmation with the actual sent-to address and a "wrong email?" reset.
- Middleware timeouts on the magic-link callback route
  (`MIDDLEWARE_INVOCATION_TIMEOUT`). Root cause: Auth.js v5 middleware with
  `session: { strategy: "database" }` was calling the Drizzle adapter on every
  request, which uses `postgres.js` — that doesn't run on Vercel's edge
  runtime, so the DB call hung and hit the 25s middleware timeout. Fix
  splits the Auth.js config: an edge-safe `src/lib/auth.config.ts` used by
  middleware (no adapter, no postgres.js), and the full config in
  `src/lib/auth.ts` that adds the adapter and Resend provider. Also
  switched to JWT session strategy so middleware validates the auth cookie
  in-place, and excluded `/api/*` from the middleware matcher so the auth
  handler never runs through it.

### Added
- Initial scaffold: Next.js 16 App Router + TypeScript strict + Tailwind v4
  with the mockup's `@theme` tokens (paper / ink / accent / teal / P1–3),
  Space Grotesk + Inter + IBM Plex Mono fonts.
- Drizzle ORM schema and first migration covering all tables in spec §3:
  `users`, `accounts`, `sessions`, `verification_tokens`, `projects`, `tasks`,
  `tags`, `task_tags`, `project_weekly_notes`, `weekly_reviews`,
  `weekly_priorities`, `daily_plans`, `daily_plan_items`.
- Auth.js v5 with Resend magic-link provider, Drizzle adapter, single-user
  email allowlist enforced in the `signIn` callback and via `middleware.ts`.
- App shell: bottom tab nav (Today / Tasks / Projects / Review), viewport
  width switching between 420 px (mobile-first views) and 900 px for the
  Projects history table, PWA manifest.
- Today view: three numbered priority slots with dashed empty placeholders,
  "Also due today" section, inline slot picker ranked by weekly-priority →
  due date → priority.
- Tasks view: by-project ↔ all-tasks toggle, smart search bar combining
  free-text with P1/P2/P3, Next/Waiting, and tag chip filters, inline add-task
  form (Inbox pseudo-project supported).
- Projects history table: sticky project column and week headers, current
  week tinted, click-to-expand cells, inline add-project form, 12-week
  rolling window Monday-anchored to Australia/Sydney.
- Weekly Review page: streak indicator, checklist for get-clear, per-project
  card with editable notes + inline add-action + priority pick, weekly
  priorities selector with hard-capped 3, reflection textarea with autosave
  on blur, finish button.
- Review history page: reverse-chronological list of past reviews with
  completion state and reflection notes.
- Targeted vitest coverage for the pieces where silent bugs would matter:
  week bucketing / today / due labels (`src/lib/time.test.ts`), priority cap
  enforcement (`src/lib/server/priority-cap.test.ts`), streak calculation
  (`src/lib/server/streak.test.ts`).
- `initial-setup.md` covering Vercel + Neon + Resend + env vars + first
  migration + smoke test.
- `CLAUDE.md` capturing project conventions for future sessions.
- Seed script (`pnpm db:seed`) mirroring the mockup's fixture projects and
  weekly notes for a fresh dev database.

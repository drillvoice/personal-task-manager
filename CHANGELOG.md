# Changelog

Kept in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style. No
SemVer discipline — see `CLAUDE.md` and the spec §8.

## [Unreleased]

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

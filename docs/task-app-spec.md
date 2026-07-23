# Personal GTD Task/Project App — Build Spec

## 1. Purpose & Philosophy

A personal task and project management app built around Getting Things Done (GTD), specifically:

- **Separation of processing and execution.** Capture and clarification happen during a weekly review; execution happens day-to-day against a pre-decided list.
- **Projects vs. next actions.** Every open loop lives as a Project; every actionable step lives as a Task, ideally linked to a Project.
- **Weekly rhythm → daily rhythm.** Weekly review sets the top 3 priorities for the week. Each day, the user sets a top 3 for that day, pulled from the broader task pool.
- **Single user.** Built for one person (Joel), but with real login/auth so it syncs cleanly across mobile and desktop.

Design principles: mobile-first, fast (feels instant, minimal loading spinners), calm/uncluttered UI — this is a daily-use tool, not a feature showcase.

A working visual reference mockup exists (`task-app-mockup.jsx`) — see §7. Build should follow its structure, component logic, and design language closely rather than reinterpreting from this spec alone.

---

## 2. Tech Stack (recommended)

- **Framework:** Next.js 14+ (App Router), deployed on Vercel
- **Database:** Vercel Postgres or Neon (Postgres)
- **ORM:** Drizzle ORM (lightweight, good TS inference) — Prisma is a fine alternative if preferred
- **Auth:** Auth.js (NextAuth) with email magic-link provider — avoids password management entirely, good fit for a single-user app
- **Styling:** Tailwind CSS, extended with the custom token system in §7 (not default Tailwind theme colors)
- **Icons:** lucide-react
- **PWA:** `next-pwa` or a hand-rolled manifest + service worker for installability and asset caching. Data itself requires network in v1 (see §9 — offline write support is a future enhancement, not a v1 requirement).
- **State/data fetching:** React Server Components + Server Actions where possible; keep client JS minimal for speed. Consider React Query only if client-side interactivity gets complex (e.g. drag-to-reorder).
- **Language:** TypeScript throughout (see §8 — this substitutes for full TDD as the primary correctness net on a solo project).

---

## 3. Data Model

### `users`
Single row realistically, but modeled properly.
- `id`, `email`, `created_at`

### `projects`
- `id`
- `name`
- `status`: `active | someday_maybe | on_hold | completed | archived`
- `notes` (markdown/text — the qualitative "why/context" space for the project, always current, distinct from the weekly history snapshots below)
- `created_at`, `updated_at`
- Note: a fixed system project (or `project_id = null` handling) represents **Inbox** — the holding area for standalone tasks not yet linked to a project. Excluded from the Projects history table (§4.E) since it isn't a real project.

### `tasks`
- `id`
- `title`
- `project_id` (nullable — null means it lives in Inbox)
- `status`: `inbox | next_action | waiting_on | done`
- `due_date` (nullable)
- Priority is **not** a field — it's expressed via `p1`/`p2`/`p3` task tags (see `task_tags` below), so all prioritizing goes through one system. 1 is highest. A task with no `p1`/`p2`/`p3` tag has no priority signal: no badge, sorts last. If more than one is present, the highest wins.
- `context` (optional single-select, e.g. `@computer`, `@calls`, `@errands`, `@home` — classic GTD context tag)
- `order` (int, for manual sorting within a list)
- `created_at`, `completed_at`

### `tags`
- `id`, `name`, `color`

### `task_tags` (join table)
- `task_id`, `tag_id`

### `project_weekly_notes`
- `id`, `project_id`, `week_start_date`, `note`
Snapshot of a project's state for a given week. Populated during the weekly review's project-review step, or edited directly. This is what powers the Projects history table (§4.E) — one row per project, one column per week.

### `weekly_reviews`
- `id`
- `week_start_date`
- `started_at`, `completed_at` (nullable until finished — lets you track streaks/consistency)
- `reflection_notes` (freeform text — how the week went)

### `weekly_priorities`
- `id`, `weekly_review_id`, `task_id`, `order`
(the "top 3 for the week" — modeled as a join so a task can be flagged as a weekly priority)

### `daily_plans`
- `id`, `date` (unique per day)

### `daily_plan_items`
- `id`, `daily_plan_id`, `task_id`, `order`
(the "top 3 for today")

---

## 4. Core Modules

### A. Weekly Review Flow
This is **one continuous scrollable page**, not a multi-step wizard — all sections visible and editable at once, in order:

1. **Get clear** — checklist reminder to process email inbox to zero, capture any loose open loops as new tasks (quick-add inline), review last week's calendar, and review this week's calendar
2. **Review projects** — every `active` project listed as its own card (not paged one-at-a-time): editable notes field, its tasks, and a quick-add for new next actions, all inline
3. **Set weekly priorities** — checklist of all open tasks across active projects; pick exactly 3 (extra checkboxes disable/grey out once 3 are selected, with a live "x/3 selected" counter)
4. **Reflection** — freeform textarea on how the week went

A streak/last-completed indicator ("4-week streak · last completed Mon 22 Jun") sits at the top of the page. A separate history view lists past completed reviews.

A review is a **completable instance**, not a fixed weekly slot. Finishing one files it to history and clears the page; `/review` then shows a "filed ✓" confirmation with a **Start next review** button that opens a fresh blank review. If more than 5 days have passed since the last completion, opening `/review` starts a fresh review automatically. Reviews are therefore no longer strictly one-per-week — at most one is *open* (in-progress) at a time, but a single week can hold more than one completed review. (`project_weekly_notes` remains one-per-week, unchanged.)

### B. Tasks (the working view)
Two modes, toggled at the top of the same screen:

- **By project** — projects shown as collapsible cards (active/someday/all filter), each expandable to its notes + tasks. Includes the Inbox pseudo-project for standalone tasks.
- **All tasks** — flat list across every project, each row tagged with its project name.

Both modes share one **smart search/filter bar**: a free-text search over task titles, plus combinable toggle chips for **priority** (P1/P2/P3, color-coded — these filter by the `p1`/`p2`/`p3` tag, same underlying data as the tag chips below), **status** (Next action / Waiting on), and **tag** (dynamically generated from tags in use, excluding the priority tags already surfaced as their own chips). All filters AND together. In "By project" mode, an active filter collapses out non-matching projects and auto-expands matching ones to show just the relevant tasks.

The search bar doubles as a **capture bar**: typing filters as described above, and pressing ⏎ creates a task from whatever is in the box. It accepts the same inline syntax as the other quick-add fields — `#tag` and a natural-language due phrase ("in 3 days") — plus a `^project` sigil, which is unique to this bar because it is the only capture surface not already scoped to a project. Typing `^` opens an inline project autocomplete; selecting from it inserts the full project name, so multi-word names work. Text after `^` that matches no project is left in the title verbatim and the task lands in Inbox — a typo never blocks or misdirects a capture. On success the search text clears while the filter chips stay on. (The sigil is `^` rather than `@` because `@` is reserved for GTD context tags — see §3.)

A **"+ New task"** action opens an inline form (title, project dropdown incl. Inbox, due date, tag picker) without leaving the page. There is no separate priority control — set it by picking (or typing) a `p1`/`p2`/`p3` tag, same as any other tag.

### C. Project Notes
Not a separate module structurally — it's the current `notes` field on each project — a first-class, roomy writing surface (markdown-friendly) for the "state of the project" narrative. Distinct from the weekly snapshots in `project_weekly_notes`, which are historical and don't change once a week has passed.

### D. Today View
- Today's top 3 (from `daily_plan_items`), rendered as three explicit slots — including visibly empty/dashed slots if fewer than 3 are set, not a shrinking list. This is deliberate: the empty slot is what keeps the "only 3" constraint honest.
- Secondary section: anything else due today or overdue
- A lightweight "set today's top 3" action — pick from tasks (favoring this week's priorities and anything due soon)

### E. Projects (history table — desktop-oriented)
A separate view from Tasks. Projects as rows, weeks as columns, cells hold that project's `project_weekly_notes` entry for that week:
- Scrolling **right** on a row shows one project's history over time.
- Scrolling **down** shows a snapshot of every project for a given week.
- The current week's column is visually distinct (tinted) so it's always obvious which column is "live."
- Cells truncate long notes with click-to-expand.
- First column (project names) and header row (weeks) are sticky.
- A **"+ New project"** action here (name + status) — this is the canonical place new projects get created; they then become available in the Tasks view's project dropdown.
- Explicitly not optimized for mobile — acceptable to only render well above a certain viewport width, per Joel's direction.

---

## 5. Screens/Routes (draft)

- `/today` — daily view (likely the default landing page)
- `/tasks` — by-project / all-tasks toggle, smart search, task creation (mobile-first)
- `/projects` — history table (desktop-oriented), project creation
- `/review` — the single-page weekly review
- `/review/history` — past completed reviews, streak tracking
- `/login` — magic link auth

---

## 6. Non-Functional Requirements

- **Speed:** aim for sub-second navigation between views; prefetch aggressively; avoid full-page reloads for common actions (add task, complete task, reorder)
- **Mobile-first for Today, Tasks, and Review.** Projects (history table) is desktop-oriented by design and doesn't need a mobile-optimized layout — acceptable to be awkward or hidden below a certain breakpoint.
- **Installable PWA:** manifest + icons + service worker for "add to home screen" behavior on mobile
- **Fast task capture:** quick-add should be reachable in one tap/keystroke from any screen

---

## 7. UI Direction & Reference Mockup

A working interactive mockup (`task-app-mockup.jsx`) covers all four core screens (Today, Tasks, Projects, Review) with real — if in-memory — interactivity: adding tasks and projects, filtering, expanding table cells, stepping through the review. **Treat this file as the primary visual and structural reference**, not just inspiration; port its component structure, token system, and interaction logic into the real app rather than redesigning from scratch.

**Design language:** a cool-paper, index-card/ledger aesthetic rather than a generic SaaS dashboard — reflects the physical-tray metaphor of GTD without being twee about it. Deliberately avoids the "warm cream + serif + terracotta" look that's become an AI-design cliché.

- **Color tokens:** paper (`#EEEEE7`) / paper-raised (`#F8F8F2`) backgrounds, near-black warm ink (`#1C1E1B`) text, hairline dividers (`#D6D5C8`). One signal accent, a burnt orange (`#E15A2B`), reserved specifically for "today/priority" emphasis — not used decoratively elsewhere. A muted teal (`#2E5F5C`) for tags/secondary UI. Priority has its own three-color scale, distinct from the accent: P1 red (`#B23A2E`), P2 amber (`#B8791E`), P3 green (`#2E6B52`) — shown whenever a task carries the matching `p1`/`p2`/`p3` tag; a task with none of those tags shows no priority badge.
- **Typography:** Space Grotesk for display/headers, Inter for body, IBM Plex Mono for all metadata (dates, tags, priority badges, counts) — the monospace treatment for metadata is a deliberate "index card annotation" signature, distinct from task titles.
- **Signature element:** Today's three priority slots are rendered as physical-feeling numbered cards, with unfilled slots shown as dashed placeholders rather than being hidden — this is the one place the "exactly 3" constraint is made visually unavoidable.

**Key decisions baked into the mockup that the spec text alone wouldn't convey:**
- Priority (P1/P2/P3) is expressed via a `p1`/`p2`/`p3` task tag, not a dedicated field — all prioritizing goes through the one tag system. Default sort order is p1, p2, p3, then untagged (no badge shown) last.
- The Tasks view's filter bar unifies free-text search with tag/priority/status chips rather than using separate dropdowns — all combinable.
- Projects (history table) is where projects get created; Tasks is where tasks get created. New projects immediately become available in the task-creation project dropdown.
- Inbox is a permanent pseudo-project for standalone tasks, visible in Tasks but deliberately excluded from the Projects history table.

---

## 8. Engineering Practices

Calibrated for a **solo, single-user project with real data that gets relied on daily** — not a team project or published library. Some standard practices are worth adopting for that reason specifically; others are deliberately skipped as unnecessary process overhead.

**Adopt:**
- **TypeScript throughout**, as the primary correctness net. Full test-driven development (writing tests before every line of code) is too much ceremony for a solo project and will slow iteration more than it helps; TypeScript catches a large share of the same class of mistakes for near-zero added friction.
- **Targeted tests, not full coverage.** Write tests specifically for the handful of places a silent bug would actually cause harm: the "exactly 3" daily/weekly-priority cap logic, week-bucketing date math for the history table, and review streak calculation. Skip testing simple CRUD and UI rendering.
- **Database migrations, checked into git, always.** No hand-altering the schema directly, in dev or prod. Every schema change goes through a Drizzle migration file, committed alongside the code that needs it.
- **Separate dev/prod databases**, ideally via branching (Neon supports this natively), paired with Vercel preview deployments — so day-to-day iteration never risks live task data.
- **Automated backups / point-in-time recovery** on the production database from day one, given this holds real daily-use data almost immediately after launch.
- **A `CLAUDE.md` in the repo root** — project conventions Claude Code should read automatically each session: coding style, "run typecheck before considering a task done," "confirm before any destructive migration," stack reminders, and a pointer to this spec and the mockup file.
- **A lightweight `CHANGELOG.md`** (Keep a Changelog format) — not for external consumers, just so future sessions (human or Claude Code) can answer "when did the priority system change?" without archaeology.
- **Basic error logging** — Vercel's built-in logs are sufficient to start; Sentry's free tier if more visibility is wanted later.

**Deliberately skip:**
- **Strict semantic versioning.** SemVer exists to signal breaking changes to downstream consumers of a published API — there are none here, it's a single person hitting a live app. The changelog covers the useful part without the version-number ceremony.
- **CI pipelines with full test suites, staged environments, feature flags.** Team/scale coordination tooling that adds process without a team to coordinate.

---

## 9. Setup & Handoff Documentation

Some steps can't be done by Claude Code itself and require Joel to act manually outside the coding environment — creating the Vercel project, provisioning the database, setting environment variables, configuring the email provider for magic-link auth, and connecting the custom domain if any.

**Requirement: Claude Code should produce an `initial-setup.md` file** as part of the initial build, containing:
- Step-by-step instructions for creating the Vercel project and linking the GitHub repo
- Exactly which environment variables are needed (e.g. `DATABASE_URL`, `AUTH_SECRET`, email provider API key), what each one is for, and where in the Vercel dashboard to set them
- Database provisioning steps (Neon/Vercel Postgres project creation, connection string retrieval)
- Any one-time setup needed for the email magic-link provider (e.g. a Resend account and API key)
- How to run the first migration against the newly provisioned database
- A final checklist to confirm the deployment is live and working end-to-end

This should be written as a checklist Joel can follow top-to-bottom without needing to already understand the stack.

---

## 10. Explicitly Out of Scope for v1 (future ideas)

- Offline-first writes with background sync
- Multi-user / sharing / delegation
- Calendar integration (time-blocking, due-date sync to Google Calendar)
- Recurring tasks
- Native mobile app (PWA is sufficient for now)
- Mobile-optimized layout for the Projects history table

---

## 11. Open Questions to Resolve During Build

- Exact context tag list (start with a small fixed set: `@computer`, `@calls`, `@errands`, `@home`, `@waiting`)
- Whether the tag chip list in the Tasks filter bar needs a cap or autocomplete once real usage produces many tags (the mockup shows every tag that exists — fine for a handful, untested at scale)
- Whether `project_weekly_notes` entries are only editable during that week's review, or editable at any time (recommend: editable anytime, but review flow is the primary place they get written)
- Whether weekly and daily priorities should visually distinguish tasks that are on both lists

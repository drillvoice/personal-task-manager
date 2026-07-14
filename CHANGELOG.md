# Changelog

Kept in [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) style. No
SemVer discipline — see `CLAUDE.md` and the spec §8.

## [Unreleased]

### Added
- **This week's three on Today:** the Today screen now opens with the three
  top priorities set in the weekly review, sitting above the daily "Today's
  three". Each is clickable (opens the task editor) and completable inline;
  when no review has been done for the current week it shows a prompt linking
  to the weekly review.
- **Edit tasks from the Today screen:** clicking a task title in Today's three,
  Tomorrow's three, or Also due today opens the same editor the Tasks view uses
  (project, people, tags, due date, notes, complete/delete) — here as a modal
  overlay, since Today has no room for a side panel. Task detail is loaded on
  demand so the landing page stays lean.

### Changed
- **Marking a meeting completed returns to the meetings list.** Clicking "Mark
  completed" in a meeting now saves the status and navigates back to
  `/meetings` instead of leaving you on the completed meeting. "Reopen" still
  keeps you on the meeting.
- **Today screen uses sentence case** for the date header, section labels
  ("Also due today", "Tomorrow's three"), and the add-to-plan picker labels,
  replacing the previous all-caps text.

- **Review history — open, edit, delete, export:** each entry in Review
  history now links to a full detail view. From there a filed review can be
  **reopened** back into the editor (blocked only while another review is
  still in progress), **deleted** (with an inline confirm; its weekly
  priorities go too, but the week's project notes stay), or **exported** to a
  clean printable page (browser "Save as PDF") carrying the weekly priorities,
  each project's note for that week, and the reflection.
- **Natural-language due dates:** typing a date phrase into any task title —
  "Reply to John in 14 days", "Submit report tomorrow", "Call the plumber
  friday" — now sets the due date and strips the phrase from the title, the
  same way inline `#tags` are extracted. Works in every quick-add and in the
  full new-task form (an explicit date-picker value still wins). Parsed via
  `chrono-node`, anchored to Australia/Sydney through `src/lib/time.ts`.
- **Global quick capture:** a floating "+" button on every screen (and the
  `c` key) opens a one-line capture box that saves straight to the Inbox,
  with the same inline `#tag` syntax as the Review screen's quick-add.
- **Weekly-priority markers:** tasks on this week's review top-3 now show a
  small accent `★ wk` marker in the Today slots, the Also-due list, the slot
  picker, and every Tasks-view row — making the weekly→daily rhythm visible.
- **Done chip:** the Tasks filter bar has a new "Done" status chip that shows
  recently completed tasks (last 30 days), so an accidental completion can be
  unticked and "what did I finish" is answerable. Done tasks stay hidden
  everywhere else, as before.
- **Project notes:** each project card in the Tasks view now has a
  "Project notes" disclosure — a roomy autosaving surface for the project's
  current narrative (spec §4.C), distinct from the weekly snapshots. A teal
  dot on the toggle marks projects that have notes.
- **Review shows momentum:** the streak header adds "N tasks done this week",
  and Review history lists each week's three priorities with ✓/○ for whether
  they were completed.
- Tasks have a free-text **notes** field (links, context, working detail),
  editable from the new detail panel with autosave.
- The **Today** slot picker now has a filter box at the top: type to narrow
  the eligible-task list by title or project name instead of scrolling. It also
  stays open after you pick a task, so you can fill several empty slots in one
  go — it closes automatically once the last slot is filled.
- The **New person** form submits on ⌘/Ctrl+Enter from any field (name, role,
  organisation, email, phone, or notes), so you can save without reaching for
  the mouse or tabbing to the button.
- Each project section in the **Tasks** view (By project) now has an inline
  "Add a task…" input beneath its task list, so you can add a task already
  linked to that project without opening the New task form. Supports inline
  `#tag` syntax (e.g. `#p1`), mirroring the Review screen's add-a-next-action
  control.

### Fixed
- **"Mark complete" in the task editor now works and shows it.** The checkbox
  in the task detail panel (the Today-screen edit modal and the Tasks-view side
  panel) was a static, always-empty box: clicking it fired the completion
  server-side but gave no visual feedback, so it looked like nothing happened.
  It now fills in immediately, toggles complete/incomplete, and holds its state
  (kept as local state since the panel's task snapshot isn't revalidated).
- **"Tomorrow's three" now files tasks one day out, not two.** `tomorrowIso()`
  chained `toZonedTime` → `formatInTimeZone`, double-applying the Sydney offset
  and returning day+2 whenever the runtime timezone was UTC (i.e. on Vercel,
  though not in Sydney-local dev). A task added to Tomorrow landed on the plan
  two days ahead, so it never rolled into Today the next day. Now computed by
  adding a calendar day to the Sydney date string.
- Un-completing a task now restores its previous status (e.g. `waiting_on`)
  instead of forcing it back to `next_action`. Backed by a new
  `tasks.previous_status` column (migration 0011).
- The task-notes autosave no longer silently discards a save that the server
  rejected — the panel shows "Not saved — …" and keeps your text dirty. Notes
  also save through their own action, so a half-edited title can no longer
  invalidate a notes save.
- Task tags now dedupe case-insensitively everywhere (`#P1` reuses `p1`
  instead of creating a duplicate priority chip).
- Editing a task's tags/assignees is now atomic (single batched transaction):
  a mid-write failure can no longer strip a task's tags or priority. Same for
  meeting attendees/tags, and task creation.
- Opening Today simultaneously on two devices no longer risks a unique-key
  error when the day's plan is first created.
- A due date exactly a week out now shows as "8 Jul" instead of a bare
  weekday name that read as this week.
- `pnpm db:seed` now refuses to run if the user already has any project,
  requiring `SEED_FORCE=1` to override. Its old guard only checked
  `NODE_ENV === "production"`, which assumed a separate dev database that
  this project never actually set up — local and every Vercel environment
  share one Neon database, so the old guard did nothing to stop a local
  `pnpm db:seed` from wiping real data. See `initial-setup.md` §2 and §8.

### Removed
- The unused `tasks.context` column and `task_context` enum (migration 0012).
  GTD contexts were specced but never surfaced in any UI, and no row ever set
  one — tags (e.g. `#calls`) cover the use case through the one tag system.

### Changed
- **Weeks now run Sunday→Saturday, keyed by the Monday inside them.** A review
  or project note recorded on a Sunday files under the *upcoming* Monday's week
  (Joel sometimes does the review on the Sunday ahead), rather than the week
  just ending. Weeks are referred to as "w/b Mon 13 Jul" in Review history, the
  filed-review card, and the export. Only the week-bucketing in
  `src/lib/time.ts` changed; existing history rows keep the Monday they were
  filed under.
- **Weekly review is now a completable instance, not a fixed weekly slot.**
  Finishing a review files it to history and the page presents a "filed ✓"
  confirmation with a **Start next review** button that opens a fresh, blank
  review (0/3 priorities, empty checklist and reflection). If more than 5 days
  have passed since the last completion, opening `/review` starts a fresh one
  automatically. Previously a review was keyed one-per-Monday-week, so
  reopening `/review` later in the same week as a completed review showed that
  finished review with a dead "Review completed ✓" button and phantom,
  un-editable priorities — now fixed. At most one review is *open* at a time
  (migration 0013 swaps the `(user, week)` unique index for a partial unique
  index on open reviews).
- **Snappier interactions:** completing a task, picking/removing Today slots,
  and toggling weekly priorities now update the UI immediately (optimistic)
  and reconcile with the server in the background.
- Notes autosaves (task notes, review reflection, project weekly notes) no
  longer re-render the page being typed on with every save, cutting a full
  data reload per pause/blur.
- The Tasks view no longer loads the full archive of done tasks — only the
  last 30 days of completions ship to the browser.
- **Tasks view (desktop):** clicking anywhere on a task row now opens a
  detail panel in a permanently reserved right-hand column (dashed empty
  slot when nothing is selected), replacing the inline edit form. All edits
  autosave per field — title on blur/Enter, pickers and due date on change,
  notes debounced. Esc, the ✕, or re-clicking the row closes the panel;
  completing or deleting the task closes it automatically. Mobile keeps the
  previous inline editing. Meeting detail is unchanged.
- The **Today** view now uses the wide (900px) desktop surface instead of the
  narrow mobile column, so the slot picker's task rows no longer wrap or scroll
  horizontally.
- The app can be installed as a standalone desktop app from Chrome/Edge
  (install icon in the address bar → own window, dock icon, opens at
  `/today`). The web app manifest no longer locks orientation to portrait
  (wrong for a desktop window) and now declares a stable `id` so the
  installed app survives future `start_url` changes.
- The organisation/tag/people combobox (`EntityPicker`, used across People,
  Tasks, Meetings, and the New task form) is now keyboard-friendly: the
  suggestion list only opens once you start typing (or press ↓), closes as
  soon as focus leaves the field, and its options are skipped by Tab so
  Tab always moves to the next field instead of walking the dropdown.
- The **People** view now uses the wide (900px) desktop surface instead of the
  narrow mobile column. The add/edit person forms lay Role, Organisation,
  Email, and Phone across a single row (4-up at ≥768px), and each person's
  read row now shows the name on its own line with role · org · email · phone
  collapsed onto one details line below — more compact vertically. Everything
  reflows to a single column on mobile.
- On desktop (≥768px) the top navigation now sits as a vertical sidebar on
  the left, using the previously under-utilised horizontal space and freeing
  vertical room for the task lists. On smaller screens it stays the horizontal
  top bar. The active item gains a subtle `accent-soft` background pill in the
  sidebar.
- The **New task** form no longer preselects a project — it opens with the
  project field empty (Inbox / no project) instead of defaulting to the first
  project in the list.
- **Priority is now a tag, not a field.** The dedicated `priority` column
  (and its P1/P2/P3 picker buttons on the add/edit task forms) is gone —
  prioritizing a task means attaching a `p1`, `p2`, or `p3` tag, same as any
  other tag (via the tag picker, or inline `#p1` in quick-capture). Existing
  tasks were migrated automatically: each task's prior priority value became
  a matching tag, so no prioritization was lost. The P1/P2/P3 badge still
  shows wherever it did before, now derived from tags — a task with none of
  the three tags shows no badge and sorts after everything that has one.
  Sorting in Today, Tasks, and Review all updated to match. See
  `src/lib/priority.ts` and `CLAUDE.md`.
- Tasks can now be **tagged**: the task add/edit forms have a tag picker (the
  same type-to-select control), so you can attach existing task tags or create
  new ones inline. Tags show as chips on the task row and are filterable via
  the existing smart-search tag chips.
- All tag / person / project selectors are now a single shared type-to-select
  picker: type to filter existing items, press Enter to select (or to create a
  new one if nothing matches), and selected items show as chips. Removing a
  chip takes a second confirming click. This replaces the old dropdown +
  "Edit tags" / "+ contact" patterns everywhere (meeting attendees & tags, new
  meeting form, and the project & assignee fields in the task add/edit forms).
- Tasks now support **multiple assignees** (people) instead of a single
  person/organisation contact. Existing single-person assignments are migrated
  into the new `task_assignees` join table; **organisation assignment on tasks
  has been removed** (org data on tasks is dropped in the migration).
  Organisations still exist for the People CRM.
- Meeting detail: the linked-task rows are stacked (title on its own row,
  metadata beneath) so they read cleanly in the tasks column, and the in-meeting
  add-task form gives the date its own full-width row.
- Weekly review now uses the wide desktop layout (matching Tasks/Projects/
  Meetings) instead of the narrow mobile-first column. Each project's review
  card is two-column: a bigger, resizable notes textarea on the left, open
  tasks in a parallel column on the right. The notes field now writes to the
  same per-week `project_weekly_notes` table the Projects history table reads
  from — previously it wrote to a separate, non-versioned `projects.notes`
  field — and the card shows the most recent past week's note (read-only)
  above this week's textarea when one exists.

### Fixed
- Weekly review: selecting/unselecting weekly priorities (and the analogous
  Today's-three / Tomorrow's-three slot picking) could crash the page with a
  server error. Two stale, untracked constraints on `weekly_priorities` and
  `daily_plan_items` (`wp_review_slot_uniq`/`dpi_plan_slot_uniq` uniqueness
  and `wp_slot_range`/`dpi_slot_range` a 0–2 range check) — leftovers from an
  earlier fixed-slot design, never declared in `schema.ts` or created by a
  tracked migration — collided with `sort_order` values that were computed
  from a stale row *count* rather than a value guaranteed to be free. Dropped
  the constraints (migrations 0008/0009) and fixed the insert logic to use
  `max(sort_order) + 1`.
- Weekly review: the "last completed" date in the streak header no longer
  triggers a hydration mismatch. It was formatted with
  `toLocaleDateString(undefined, …)`, which resolves to whatever locale the
  runtime defaults to — server (Node) and browser can disagree, producing
  different text ("Mon 6 Jul" vs "Mon, Jul 6") on first render. Now formatted
  with a fixed `date-fns` pattern via a new `shortDateLabel` helper in
  `src/lib/time.ts`.

### Added
- Weekly review quick-capture and "Add a next action" inputs now support
  inline `#tag` syntax: `ring matthew #p1` creates a task titled "ring
  matthew" tagged with `p1` (an existing task tag is reused if the name
  matches, otherwise a new one is created). Multiple hashtags per line are
  all applied.
- Weekly review "Get clear" checklist now includes two more items: reviewing
  last week's calendar and reviewing this week's calendar, alongside the
  existing inbox-to-zero and open-loops checks.
- Meetings module: new Meetings page (with nav item) for scheduling upcoming
  meetings with a date and attendees picked from the People CRM (including
  inline person creation). Each meeting has autosaving prep notes and meeting
  notes, tags (a vocabulary of their own, separate from task tags, creatable
  inline), and a
  quick-add task panel — tasks created there are normal tasks (Inbox by
  default) that stay linked to the meeting. Marking a meeting completed moves
  it to a searchable archive (filter by title, attendee, or tag). Deleting a
  meeting keeps its tasks (ON DELETE SET NULL). The meeting detail page uses
  the wide two-column layout: notes on the left, tasks on the right.
- Contact picker in task add/edit forms now has a "+ New person…" option:
  type a name to create the person inline and link them to the task. Other
  details (role, email, org, notes) can be filled in later on the People
  page.
- People & Organisations (mini CRM): new People page (with nav item) for
  creating, editing, and deleting people (name, role, email, phone, notes,
  organisation) and organisations (name, notes). Tasks can now be linked to
  one person or one organisation via a contact picker in the add/edit task
  forms; linked contacts show as a small chip on the task row. Deleting a
  person or organisation unlinks their tasks (ON DELETE SET NULL).
- Today view: a "Tomorrow's three" section below "Also due today", using the
  same three-slot picker as today's plan but scoped to tomorrow's daily
  plan. Lets you assign next-day priorities while wrapping up today. Reuses
  the existing `daily_plans`/`daily_plan_items` tables (already keyed by
  date) — no schema change. Unlike today's slots, tomorrow's slots have no
  complete checkbox since those tasks aren't due yet.

### Changed
- Meetings: the whole module now uses the wide desktop frame (it was only
  the detail page), the new-meeting form no longer overflows its card on
  narrow widths, and the date field defaults to today (Sydney time).
- Tasks view: completed tasks are hidden by default (both "By project" and
  "All tasks" modes), and projects with no incomplete tasks no longer show
  up in the "By project" list.

### Changed
- First-load performance: database queries now run over Neon's HTTP driver
  (`drizzle-orm/neon-http`) instead of a TCP postgres.js pool, removing the
  connection handshake on serverless cold starts. Local CLI scripts
  (`db:migrate`, `db:seed`) still use postgres.js.
- Every app route now streams a skeleton shell (`loading.tsx`) immediately
  while data loads, instead of blocking the whole page on the database.
- Today page now loads its plan slots and also-due list in two parallel
  queries instead of a 3–4 query waterfall.

### Changed
- Tasks view now uses the wider desktop app frame, and the top navigation
  sits on a compact centred rail instead of spacing items across the full
  browser width.

### Fixed
- Project dropdowns in task add/edit forms are no longer clipped by the
  project card, and long project lists scroll inside the menu.

### Changed
- Projects history table: cells are now editable in-place. Each cell is a
  textarea that autosaves on blur (via the existing `upsertWeeklyNote`
  action), replacing the old click-to-expand-only behaviour that had no
  edit affordance at all.
- Projects history table columns are no longer a fixed 12-week rolling
  window. They now show only weeks where some project has a non-empty
  note, plus the current week (always). A fresh account starts with just
  one column and grows as notes accumulate — instead of showing 11 empty
  pre-history columns for a brand-new project.

### Fixed
- `OAuthAccountNotLinked` on the first GitHub sign-in. An earlier
  magic-link attempt had created an orphan `user` row (email set, no
  linked `account` record). Auth.js refuses to auto-link by default
  because in a multi-user app that would be an OAuth-takeover vector,
  but for a single-user app gated by `ALLOWED_EMAIL` the threat is
  null. Enabled `allowDangerousEmailAccountLinking: true` on the GitHub
  provider so a fresh sign-in reuses the existing user row. Also
  rewrote the misleading error-message copy on the login page — the old
  wording ("linked to a different email than expected") sent Joel to
  double-check env vars for something that was not an env-var problem.

### Changed
- Auth provider swapped from Resend magic-link to GitHub OAuth. For a
  single-user personal app the email path had too many moving parts
  (domain verification, deliverability, expiring links, silent failures).
  GitHub OAuth is one click, no email round-trip. The `ALLOWED_EMAIL`
  gate stays — we now compare it against the GitHub-linked primary email
  in the `signIn` callback. Env vars: `AUTH_RESEND_KEY` and
  `AUTH_EMAIL_FROM` are gone; `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`
  are new. Removed the `resend` package.

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

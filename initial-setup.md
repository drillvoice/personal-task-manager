# Initial setup checklist

Everything you need to do outside the code editor to get the app running for
the first time. Follow top to bottom. Estimated total time: **45–60 minutes**,
plus DNS propagation if you want a custom domain.

- [ ] **§1** Push the repo to GitHub
- [ ] **§2** Create the Neon Postgres project (dev + prod branches)
- [ ] **§3** Register the GitHub OAuth App
- [ ] **§4** Create the Vercel project and link the GitHub repo
- [ ] **§5** Fill in environment variables (dev locally, prod in Vercel)
- [ ] **§6** Add PWA icons (optional but recommended before shipping)
- [ ] **§7** Run the first database migration
- [ ] **§8** Seed the dev database (optional)
- [ ] **§9** Deploy and smoke-test end to end

---

## §1 · Push the repo to GitHub

```bash
git status                     # sanity-check what's committed
git remote add origin git@github.com:<your-github>/personal-task-manager.git
git branch -M main
git push -u origin main
```

If the repo already exists on GitHub, skip the `git remote add` line.

---

## §2 · Create the Neon Postgres project

We're on Neon because it supports **native database branching** — a preview
branch per Vercel preview deployment, cleanly isolated from prod. This is the
spec's §8 recommendation.

1. Sign up at <https://neon.tech> (GitHub sign-in works).
2. Create a new project. Region: pick the one closest to Vercel's default
   (`us-east-1` is a safe default for most people; if you know you'll be
   deploying to Sydney, pick `ap-southeast-2`).
3. Postgres version: **whatever the default is** (18 as of writing). Any modern
   version works — Drizzle and postgres.js don't care.
4. If Neon offers to enable **Neon Auth**, leave it **off**. That's their
   own auth product; we're doing auth in-app via Auth.js + GitHub OAuth,
   so a parallel Neon Auth user store would be dead weight.
5. When Neon offers to name the default branch, keep it `main`.
6. In the Neon dashboard, note two things:
   - **Connection string** for the `main` (production) branch — you'll paste
     this into Vercel later. Use the **pooled** connection string
     (`...-pooler.<region>.neon.tech`). It's tagged in the dashboard.
   - Create a second branch called `dev` from `main`. Copy its pooled
     connection string for your local `.env.local`.
7. In `Settings → General`, enable **Point-in-time restore** (Neon does this
   for you on Free but keep the retention at the default 7 days — extend if
   you want more).

> Cost: the Neon Free tier is enough for a single-user daily-use app for a
> long time. Upgrade only if you exceed 0.5 GB storage or 190 compute-hours
> per month.

---

## §3 · Register the GitHub OAuth App

Sign-in is via "Sign in with GitHub" — no email delivery to worry about, no
expiring magic links.

1. Go to <https://github.com/settings/developers> → **OAuth Apps** → **New
   OAuth App**.
2. Fill in:
   - **Application name:** something like `Task Manager`.
   - **Homepage URL:** your Vercel deployment URL (e.g.
     `https://personal-task-manager-<hash>.vercel.app`, or your custom
     domain if you have one).
   - **Application description:** anything, or leave blank.
   - **Authorization callback URL:** `<homepage>/api/auth/callback/github`
     (e.g. `https://personal-task-manager-<hash>.vercel.app/api/auth/callback/github`).
     GitHub accepts multiple callback URLs on the same app since 2021, so
     you can also add `http://localhost:3000/api/auth/callback/github` in
     the same field for local dev — put each URL on its own line.
3. Click **Register application**. You'll land on the app's page:
   - Copy the **Client ID** — this becomes `AUTH_GITHUB_ID`.
   - Click **Generate a new client secret**, copy the value — this becomes
     `AUTH_GITHUB_SECRET`. You'll only see it once.
4. **Sanity-check your GitHub primary email.** Auth.js reads the primary
   email from your GitHub account and passes it to our `signIn` allowlist.
   Go to <https://github.com/settings/emails> — if "Keep my email addresses
   private" is on, your effective primary email is
   `NNNNN+username@users.noreply.github.com`. Either uncheck that so your
   real email is used, or set `ALLOWED_EMAIL` to the `users.noreply.github.com`
   value.

> Why GitHub OAuth over magic-link email: for a personal single-user app
> the email path adds a lot of moving parts (sending domain verification,
> deliverability, expiring links) with no real benefit. This is the simpler
> path.

---

## §4 · Create the Vercel project

1. Sign in at <https://vercel.com> (GitHub sign-in recommended so the repo
   link is one click).
2. `Add New… → Project → Import Git Repository → personal-task-manager`.
3. Framework preset should auto-detect **Next.js**. Leave root directory as
   `./`, build command as `next build`, output directory blank.
4. **Don't deploy yet** — click through to `Environment Variables` first
   (§5). If you do deploy without them, the deploy will succeed but the app
   will crash on first request; you'll need to redeploy after setting vars.

---

## §5 · Environment variables

Copy `.env.example` → `.env.local` in your local repo, then fill in the
values for dev. In Vercel, set the same keys under
`Project → Settings → Environment Variables` for **Production**, **Preview**,
and **Development** — usually with the prod Neon connection string for
Production and the dev Neon branch string for Preview/Development.

| Variable | What it is | Where it comes from |
|---|---|---|
| `DATABASE_URL` | Neon Postgres pooled connection string | Neon dashboard → the pooled URL for `main` (prod) or `dev` (local) |
| `AUTH_SECRET` | Session cookie signing key | Generate: `openssl rand -base64 32` |
| `AUTH_URL` | Base URL Auth.js redirects back to | **Local only** — set to `http://localhost:3000` in `.env.local`. **Do not set in Vercel Production or Preview** — Auth.js auto-detects from `VERCEL_URL`. Setting `http://localhost:3000` in prod will send every OAuth callback to your laptop |
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID | From §3, the OAuth App page |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret | From §3, "Generate a new client secret" |
| `ALLOWED_EMAIL` | The single email that's allowed to sign in | Your email address (case-insensitive) |

**In Vercel:** for each of the three environments (Production, Preview,
Development), set the same keys. It's fine for all three to share the same
GitHub OAuth credentials and `AUTH_SECRET`; the `DATABASE_URL` should
differ (prod ↔ dev Neon branch).

> **Cleanup from earlier setup:** if you had `AUTH_RESEND_KEY` and
> `AUTH_EMAIL_FROM` set from the magic-link days, delete them from all
> three environments — they're no longer read.

---

## §6 · PWA icons (optional but recommended before shipping)

The manifest at `src/app/manifest.ts` currently ships with an empty icons
array. Before you install the app to a home screen, generate three PNGs and
drop them at:

- `public/icons/icon-192.png` (192×192)
- `public/icons/icon-512.png` (512×512)
- `public/icons/icon-512-maskable.png` (512×512, safe-zone padded)

Easiest tool: <https://realfavicongenerator.net/>. Then uncomment / restore
the `icons` array in `manifest.ts` — see the comment in that file.

---

## §7 · Run the first migration

The migration file is already committed at
`src/db/migrations/0000_*.sql`. To apply it:

**Locally (against the dev Neon branch):**
```bash
pnpm install
pnpm db:migrate
```

**Against production (first-time deploy):**
Run the same command from your local shell with `DATABASE_URL` temporarily
pointed at the prod connection string:
```bash
DATABASE_URL="postgres://…main.neon.tech/…" pnpm db:migrate
```
For future migrations you can run it from Vercel's function shell or add a
one-off script — but for the first one, doing it locally is safest.

---

## §8 · Seed the dev database (optional)

Populate the dev database with the mockup's fixture projects so the app
isn't empty when you first sign in:

```bash
# .env.local must have DATABASE_URL and ALLOWED_EMAIL set
pnpm db:seed
```

The seed script is idempotent — rerunning wipes and reinserts your user's
data. It refuses to run against production (`NODE_ENV=production`).

---

## §9 · Deploy and smoke-test

1. Push to `main` — Vercel auto-deploys.
2. Wait for the build to finish, click the deployed URL.
3. You'll be redirected to `/login`. Click **Sign in with GitHub**.
4. Approve the OAuth authorisation on GitHub. You should land on `/today`.
5. Tap **New task** in the Tasks tab and add one. It should appear.
6. Try adding it to today's plan. Try the priority cap — try to add a fourth,
   confirm it's blocked with the "already has 3 tasks" error.
7. Open the Projects tab → **New project** → add one. Confirm it shows up as
   a row.
8. Open the Weekly Review tab. Check the two boxes at the top, edit the
   notes on a project, pick a couple of tasks as weekly priorities, write
   a reflection, hit **Finish review**. Reload the page — the streak should
   still be there next week.

If any of the above fails:
- **GitHub says "redirect_uri is not associated with this application"** —
  the callback URL registered in your OAuth App (§3) doesn't include the
  URL you're actually signing in from. Add it to the OAuth App's
  authorization callback URL list.
- **"That GitHub account isn't allowed to sign in here"** — `ALLOWED_EMAIL`
  doesn't match your GitHub primary email. Check
  <https://github.com/settings/emails>; if "Keep my email addresses
  private" is on, either turn it off, or use the
  `NNNNN+username@users.noreply.github.com` value as `ALLOWED_EMAIL`.
- **Sign-in redirects you to `localhost:3000`** — `AUTH_URL` is set on
  Vercel Production. Delete it there (see §5); Auth.js will auto-detect
  from `VERCEL_URL`.
- **App crashes on any page** — check Vercel's function logs; usually
  `DATABASE_URL` is wrong or points at the unpooled endpoint.
- **After a successful sign-in you get stuck in a redirect loop** — this
  almost always means an old session cookie from an earlier deploy is
  still around. Clear cookies for the Vercel URL, then retry.

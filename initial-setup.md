# Initial setup checklist

Everything you need to do outside the code editor to get the app running for
the first time. Follow top to bottom. Estimated total time: **45–60 minutes**,
plus DNS propagation if you want a custom domain.

- [ ] **§1** Push the repo to GitHub
- [ ] **§2** Create the Neon Postgres project (dev + prod branches)
- [ ] **§3** Set up Resend for magic-link email
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
3. Postgres version: **17** (default).
4. When Neon offers to name the default branch, keep it `main`.
5. In the Neon dashboard, note two things:
   - **Connection string** for the `main` (production) branch — you'll paste
     this into Vercel later. Use the **pooled** connection string
     (`...-pooler.<region>.neon.tech`). It's tagged in the dashboard.
   - Create a second branch called `dev` from `main`. Copy its pooled
     connection string for your local `.env.local`.
6. In `Settings → General`, enable **Point-in-time restore** (Neon does this
   for you on Free but keep the retention at the default 7 days — extend if
   you want more).

> Cost: the Neon Free tier is enough for a single-user daily-use app for a
> long time. Upgrade only if you exceed 0.5 GB storage or 190 compute-hours
> per month.

---

## §3 · Set up Resend for magic-link email

1. Sign up at <https://resend.com>.
2. Add a domain you own (e.g. `yourname.com`) and add the DNS records Resend
   shows you (SPF, DKIM, DMARC). If you don't have a domain, Resend gives you
   `onboarding@resend.dev` for dev, but you'll want a real one before prod.
3. Create an API key: `API Keys → Create API Key`, name it something like
   `task-manager-prod`. Copy the value — you'll only see it once. Save
   somewhere temporary until you paste it into Vercel.
4. Decide your "from" address, e.g. `Task Manager <no-reply@yourname.com>`.

> Cost: Resend Free tier = 3,000 emails/mo, plenty for magic-link auth on a
> single user.

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
| `AUTH_URL` | Base URL Auth.js redirects back to | Local: `http://localhost:3000`. Prod: Vercel auto-detects, you can leave it unset |
| `AUTH_RESEND_KEY` | Resend API key | Resend dashboard → API Keys |
| `AUTH_EMAIL_FROM` | From address on the magic-link email | e.g. `Task Manager <no-reply@yourname.com>` |
| `ALLOWED_EMAIL` | The single email that's allowed to sign in | Your email address (case-insensitive) |

**In Vercel:** for each of the three environments (Production, Preview,
Development), set the same keys. It's fine for all three to share the same
Resend key and `AUTH_SECRET`; the `DATABASE_URL` should differ (prod ↔ dev
Neon branch).

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
3. You'll be redirected to `/login`. Enter your email, click **Send magic
   link**. Check your inbox.
4. Click the link — you should land on `/today`.
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
- **Login email doesn't arrive** — check the Resend dashboard "Logs" tab;
  domain probably isn't verified yet.
- **App crashes on any page** — check Vercel's function logs; usually
  `DATABASE_URL` is wrong.
- **"Task not found" or auth loops** — confirm `ALLOWED_EMAIL` matches
  what you're signing in with, case-insensitive.

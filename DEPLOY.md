# Deploying KasiKash

The app is a Vite-built static SPA + a Supabase Postgres backend. It works in two modes:

- **Demo mode** — no env vars set, uses `localStorage` only. Great for social recording, screenshots, or previewing changes. Single-device.
- **Cloud mode** — `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set. Real anonymous auth, real Postgres, multi-device sync, RLS-secured per-user data.

Both modes are compiled from the same code. The moment those two env vars are present at build time, the app upgrades itself into a real product.

## Table of contents

- [Option A — Vercel](#option-a--vercel-fastest)
- [Option B — Netlify](#option-b--netlify)
- [Setting up Supabase (one-time)](#setting-up-supabase-one-time)
- [Continuous integration](#continuous-integration-ci)
- [Local development](#local-development)
- [Testing on your phone](#testing-the-deployed-app-on-your-phone)
- [Troubleshooting](#troubleshooting)

---

## Option A — Vercel (fastest)

1. Go to [vercel.com/new](https://vercel.com/new) and sign in with GitHub.
2. Import `snerantie/AI-Data-To-Kasi-Small-business`.
3. Vercel auto-detects Vite from `vercel.json`. Nothing to configure.
4. **(Optional but recommended)** Add environment variables from your Supabase project (see below). Otherwise the deploy runs in demo mode, which is fine for previews.
5. Click **Deploy**.

Every push to `main` redeploys production. Every PR gets its own preview URL — perfect for filming a demo from your phone before merging.

## Option B — Netlify

1. Go to [app.netlify.com/start](https://app.netlify.com/start) and sign in with GitHub.
2. Pick `snerantie/AI-Data-To-Kasi-Small-business`.
3. Netlify reads `netlify.toml` — build command and publish directory are pre-filled.
4. **(Optional)** Add the two Supabase env vars in **Site settings → Environment variables**.
5. Click **Deploy site**.

Same behaviour: every push redeploys, every PR gets a Deploy Preview.

---

## Setting up Supabase (one-time)

This is what upgrades the app from demo to real product. It takes ~5 minutes.

### 1. Create a Supabase project

- Go to [supabase.com/dashboard](https://supabase.com/dashboard) and sign in.
- Click **New project**. Give it a name (`kasikash` works), pick a region close to your users (`Southeast Asia (Singapore)` or `Europe West` are the closest to Southern Africa — Supabase doesn't yet offer a JHB region), set a strong database password (you won't need it often, but save it).
- Wait ~2 minutes for the project to provision.

### 2. Run the migrations (in order)

Open the **SQL Editor** in your Supabase dashboard, click **New query**, and paste the contents of each migration file in order. Run one, wait for "Success", then paste the next.

1. **[`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql)** — the initial schema. Creates `profiles`, `sales`, `tabs`, `stokvels`, `contributions`, the auto-profile trigger, and Row Level Security policies.
2. **[`supabase/migrations/002_profile_extras.sql`](supabase/migrations/002_profile_extras.sql)** — adds `business_type` on profiles and drops the demo-mode defaults on name fields so onboarding fills them properly.
3. **[`supabase/migrations/003_multiuser_stokvel.sql`](supabase/migrations/003_multiuser_stokvel.sql)** — turns the stokvel from a single-user savings tracker into a real multi-user group. Adds `stokvel_memberships`, `stokvel_invites`, the `join_stokvel` RPC, updated RLS so members can read shared stokvel data, and backfills existing stokvels so their creators become admins.

If you've already run 001 and 002 before, run only 003. All migrations are idempotent — running them twice is safe.

### 3. Enable anonymous sign-ins

Anonymous auth lets people use KasiKash without signing up first. Perfect for the "just start using it" onboarding.

- Go to **Authentication → Sign In / Providers**.
- Find **Anonymous Sign-Ins** in the list.
- Toggle it **on** and save.

### 3b. Enable email sign-in (for magic links)

Email magic-link sign-in is how anonymous accounts get upgraded to permanent ones so data survives switching phones.

- In **Authentication → Sign In / Providers**, find **Email** and confirm it's enabled (it usually is by default).
- Below that, find **"Confirm email"** — leave it on. It's what makes the magic-link click actually upgrade the account.

### 3c. Add redirect URLs so magic links work

When a user clicks a magic link, Supabase redirects them back to your app. It only redirects to URLs you've whitelisted.

- Go to **Authentication → URL Configuration**.
- Set **Site URL** to your primary production URL. Pick the one you'll share — for example `https://kasikash.vercel.app`.
- Under **Redirect URLs**, add every domain the app runs on so preview builds and both deploys work:
  - `https://kasikash.vercel.app/**`  ← your Vercel production
  - `https://kasikash-*.vercel.app/**`  ← Vercel PR previews (wildcards allowed)
  - `https://kasikash.netlify.app/**`  ← your Netlify production
  - `https://deploy-preview-*--kasikash.netlify.app/**`  ← Netlify PR previews
  - `http://localhost:5173/**`  ← local dev

  Use whatever your actual deploy URLs are. The `/**` on the end covers all paths.
- Click **Save**.

### 3d. About the free email service (optional but useful to know)

Supabase's default email sender is fine for testing but limited to **2 emails / hour / user** on the free tier. For production traffic you should point Supabase at your own SMTP provider (Resend, SendGrid, Postmark, etc.) — [official guide here](https://supabase.com/docs/guides/auth/auth-smtp). Not needed to get started.

### 4. Copy the two env vars you need

- Go to **Project Settings → API**.
- Copy the **Project URL** — that's your `VITE_SUPABASE_URL`.
- Copy the **anon / public** key — that's your `VITE_SUPABASE_ANON_KEY`. Do NOT use the `service_role` key here, it bypasses RLS.

### 5. Add them to your hosting provider

**On Vercel:** Project → Settings → **Environment Variables**. Add both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for all environments (Production, Preview, Development). Redeploy.

**On Netlify:** Site → Site settings → **Environment variables**. Add the same two. Trigger a redeploy.

**For local development:** copy `.env.example` to `.env.local` in the project root and fill in the values. `npm run dev` picks it up automatically.

### 6. Verify

Open the deployed URL. On the Home screen you should now see a small green **☁ Cloud** pill under the greeting instead of the greyed-out **⊘ Demo** pill. Log a sale on one device, open the URL on another (same Supabase project) and it should appear.

---

## Continuous integration (CI)

`.github/workflows/ci.yml` runs on every push and PR — it type-checks and builds the app so broken code never merges into `main`. GitHub Actions is enabled by default; no setup needed.

---

## Local development

```bash
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (optional)
npm install
npm run dev
```

Open `http://localhost:5173`.

Without `.env.local`, the app runs in demo mode. With it, you're hitting your live Supabase.

---

## Testing the deployed app on your phone

1. Open the deployed URL on your Android or iOS phone.
2. Grant microphone permission when prompted — enables real voice input.
3. Install as a PWA:
   - **Android (Chrome):** menu (⋮) → **Install app**
   - **iOS (Safari):** Share (⌫↑) → **Add to Home Screen**

The browser chrome disappears entirely, so it looks like a native app in your recording.

---

## Troubleshooting

**Voice doesn't work.** The Web Speech API isn't supported in every browser (notably Firefox on desktop). The app falls back to a simulated transcription so demos still work — for the best recording use Chrome on Android or Safari on iOS.

**Sync badge stays on "Sync..." forever.** Check the browser console. Common causes:
- Env vars typo'd (double-check `VITE_` prefix and no extra spaces).
- Migration hasn't been run yet — the `profiles` trigger fails silently, the client keeps trying.
- Anonymous sign-in disabled — enable it under Authentication → Providers.

**Sync badge shows "Offline".** The user is authenticated but a query failed. Usually a network issue or the RLS policies weren't created. Re-run the migration.

**"row-level security policy" errors in Supabase logs.** Verify RLS policies exist (`select * from pg_policies where schemaname = 'public'`). If you dropped them accidentally, re-run the migration — it uses `drop policy if exists ... create policy` idempotently.

**Blank screen after deploy.** Confirm the platform is using `npm run build` and serving `dist/`. Both `vercel.json` and `netlify.toml` set this automatically.

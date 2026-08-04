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

### 2. Run the migration

Open the **SQL Editor** in your Supabase dashboard, click **New query**, and paste the contents of [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) from this repo. Click **Run**.

This creates the tables (`profiles`, `sales`, `tabs`, `stokvels`, `contributions`), the auto-profile trigger, and the Row Level Security policies so every owner can only see their own rows.

### 3. Enable anonymous sign-ins

Anonymous auth lets people use KasiKash without signing up first. Perfect for the "just start using it" onboarding.

- Go to **Authentication → Sign In / Providers**.
- Find **Anonymous Sign-Ins** in the list.
- Toggle it **on** and save.

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

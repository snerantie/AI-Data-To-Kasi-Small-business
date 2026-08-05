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
4. **[`supabase/migrations/004_yoco_payments.sql`](supabase/migrations/004_yoco_payments.sql)** — adds automated payment support via Yoco. Creates `stokvel_payment_config` (server-only), `stokvel_payments` (member-readable state), a `payment_id` column on `contributions`, and a DB trigger that auto-inserts the contribution when a payment succeeds. Also adds `stokvel_payments` to `supabase_realtime` so the client can watch payment status live.

If you've already run earlier migrations, run only the new one. All migrations are idempotent — running them twice is safe.

## Setting up Yoco automated payments (per stokvel)

Once migration 004 has run and the Edge Functions are deployed (see below), each stokvel admin can turn on automated contributions:

1. Admin signs up at **[yoco.co.za](https://yoco.co.za)** — free, ~5 minutes. Yoco needs the business's ID and bank details so payouts land in the right account.
2. In the Yoco dashboard, navigate to **Developers → API keys** and generate a **Secret key**. Two types:
   - `sk_test_...` — test-mode keys for sandbox payments (no real money moves).
   - `sk_live_...` — live keys, real money flows.
3. Open KasiKash → **Settings → Payments** (this section only appears if you're a stokvel admin).
4. Paste the Yoco secret key into the field, pick **Test** or **Live** mode, and tap **Turn on payments**.
5. KasiKash validates the key by registering our webhook against the admin's Yoco account. On success the section shows a green "Automated payments active" pill.
6. Members can now tap the R50 / R100 / R250 / R500 buttons on the Stokvel screen — they'll be redirected to Yoco's checkout, pay via PayShap or card, and land back in KasiKash with the contribution automatically recorded.

**KasiKash takes 0% platform fee.** Yoco charges its own standard rate (roughly 3% + R2 per transaction) direct to the admin's merchant account. All money flows admin → Yoco → admin's bank. KasiKash never touches the funds.

## Setting up the WhatsApp bot (per admin, optional)

The WhatsApp integration lets members text natural-language sales lines like `sold 3 bread R18` to the admin's WhatsApp Business number, and have them logged automatically to the sender's KasiKash account.

This is **entirely optional** and only useful once the admin has completed Meta's approval. Skipping this section leaves the "WhatsApp bot" section in Settings inactive — the app still works for every other feature.

### 1. Get Meta Cloud API access

1. Sign up at [business.facebook.com](https://business.facebook.com) if you don't have a Business Manager account.
2. Create a **WhatsApp Business Account** inside your Business Manager (Business Settings → Accounts → WhatsApp Accounts).
3. Add a phone number to it. Meta's free tier lets you use a test number initially (great for development); for real customers you'll verify a real phone number.
4. Go to **[developers.facebook.com](https://developers.facebook.com)** → your app → **WhatsApp → API Setup**. Note down:
   - **Phone Number ID** (a numeric string, ~15 digits)
   - **Temporary access token** (starts with `EAAG...`). For production, generate a **system-user permanent access token** — see [Meta's guide](https://developers.facebook.com/docs/whatsapp/business-management-api/get-started).
5. Under **WhatsApp → Configuration**, add a webhook:
   - **Callback URL:** `https://<your-supabase-project>.functions.supabase.co/whatsapp-webhook`
   - **Verify token:** a random string of your choice (KasiKash's Settings will generate one for you)
   - Subscribe to **messages** field only.

### 2. Run migration 009 in the Supabase SQL editor

`supabase/migrations/009_whatsapp_bot.sql` creates the `whatsapp_bot_configs` table and helper RPCs. Idempotent, safe to re-run.

### 3. Deploy the two Edge Functions

```bash
supabase functions deploy save-whatsapp-config
supabase functions deploy whatsapp-webhook --no-verify-jwt
```

`--no-verify-jwt` on `whatsapp-webhook` is critical — Meta doesn't send a Supabase JWT.

### 4. Configure inside KasiKash

1. Sign in to your account (Settings → Account → link email or phone).
2. Go to **Settings → WhatsApp bot** and paste in:
   - Phone Number ID (from step 1)
   - Access token (from step 1)
   - Verify token (tap **Generate** for a random one, then use the same value when configuring the webhook in Meta's dashboard)
   - Your WhatsApp Business number in E.164 (e.g. `+27831234567`)
3. Tap **Turn on WhatsApp bot**. If credentials are valid, the section flips to "active".

### 5. Test

From any WhatsApp number, text your business line something like `sold 3 bread R18`. Within a few seconds:

- The webhook fires, the parser recognises 3 × Bread @ R18, and inserts a sale on the sender's KasiKash account (identified by their WhatsApp number matching `profiles.phone`).
- The sender gets an auto-reply: `✅ KasiKash: Logged 3 × Bread @ R18. Total R54.`

Members must first link their phone number in KasiKash (Settings → Account → Phone tab) so the webhook can match their WhatsApp sender to their account. Unlinked numbers get a friendly "sign in and link your phone first" auto-reply.

### 6. Costs

Meta's WhatsApp Cloud API is **free** for the first 1,000 conversations per month, then ~R0.30 per conversation to SA numbers. A "conversation" is a 24-hour window with a specific user, so 1,000/month covers hundreds of active users at typical usage.

## Deploying the Supabase Edge Functions

The three payment-flow Edge Functions live in `supabase/functions/`. Deploying them requires the Supabase CLI:

```bash
# Install once (macOS / Linux):
brew install supabase/tap/supabase   # macOS
# or: npm install -g supabase        # npm

# Link this repo to your Supabase project (one-time)
supabase link --project-ref <your-project-ref>

# Deploy all three payment functions
supabase functions deploy save-payment-config
supabase functions deploy create-checkout
supabase functions deploy yoco-webhook --no-verify-jwt
```

The `--no-verify-jwt` flag on `yoco-webhook` is important — Yoco doesn't send a Supabase JWT when it POSTs webhook events. We verify authenticity via the per-stokvel HMAC signature inside the function itself.

The other two functions (`save-payment-config` and `create-checkout`) MUST be JWT-protected — Supabase auto-verifies the caller's JWT so we can read `auth.uid()` inside the function. Deploy them without the flag.

**Where does the webhook URL come from?** The `save-payment-config` function computes it as `${SUPABASE_URL}/functions/v1/yoco-webhook` and registers that with Yoco when an admin configures payments. If you deploy the webhook function under a different name, update the URL construction in `save-payment-config`.

**Environment variables** — the Edge Functions automatically get `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `SUPABASE_ANON_KEY` injected. No manual env setup needed.

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

### 3e. Enable phone (SMS) sign-in — optional but recommended

Many SA township users have a phone number but not an active email address. KasiKash supports phone-OTP sign-in as an alternative to the email magic-link. It uses the same underlying Supabase Auth mechanism, so once configured, users see a **Phone** tab alongside **Email** in Settings → Account.

**In your Supabase dashboard:**

1. Go to **Authentication → Sign In / Providers**.
2. Enable **Phone**.
3. Under "SMS provider", pick one of the supported providers. Common choices:
   - **Twilio** — reliable, worldwide. Free trial gives you a small monthly SMS budget, then pay-as-you-go (roughly R1.50 per SMS to SA numbers as of 2026).
   - **MessageBird** — European alternative, similar pricing.
   - **Vonage** (formerly Nexmo) — similar pricing.
4. Follow the provider's signup + KYC. For Twilio:
   - Sign up at [twilio.com](https://www.twilio.com).
   - Verify a phone number for the trial account.
   - Buy a Twilio phone number (free trial credit covers this).
   - In Supabase's Phone Auth setup, paste:
     - **Twilio Account SID** — from your Twilio console dashboard.
     - **Twilio Auth Token** — from your Twilio console dashboard.
     - **Twilio Phone Number** — the number you bought (in E.164 format, e.g. `+27871234567` or a US test number).
5. Save.
6. (Optional but recommended) Customise the SMS template. Default is `Your code is {{ .Code }}` which works fine, but you can brand it: `KasiKash code: {{ .Code }}. Valid 60 seconds.`
7. Test by trying the Phone tab in the app's Settings → Account section.

**Note:** SA numbers must be sent from an international phone number (Twilio trial accounts sometimes restrict this). For production, budget ~R2 per user activation. Total cost for 100 activations: ~R200 one-time.

If you'd rather ship without phone auth, just don't enable Phone in the provider list. The app auto-hides the Phone tab if the request fails, so users still see and use the email path.

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

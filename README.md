# KasiKash

**Kasi hustle, upgraded.** Voice-first, multilingual finance OS for township small businesses.

Speak isiZulu, Sesotho, or English into your phone — KasiKash turns it into clean bookkeeping, tracks customer tabs (skoroskoro), manages your stokvel, and builds a portable **KasiScore** credit profile.

## What it does

- **Voice-first sale logging.** Say _"Ngithengise izinkwa ezintathu ngo-R18"_ and the app parses `Item: Bread, Qty: 3, Price: R18` in real time. Web Speech API, works offline as a fallback.
- **Skoroskoro (customer tabs).** Track who owes what. WhatsApp-reminder button for debts older than 7 days. One-tap mark-as-paid.
- **Stokvel savings pot.** Track contributions to your group savings, progress bar, contribution history — the paper notebook, upgraded.
- **Receipt scan.** Snap a supplier receipt, get line items back automatically (currently a demo OCR mock; real Tesseract.js integration coming).
- **WhatsApp bot preview.** A full WhatsApp-styled chat where you can text sales to KasiKash — same voice parser under the hood.
- **Dynamic AI insights.** A rules engine scores 8 real-time signals from your data (old tabs, hot items, day vs week average, silent-day detection, KasiScore thresholds, stokvel goal proximity) and surfaces the top 3 personalised tips.
- **KasiScore.** A 300–850 credit score built from your actual transaction discipline. The trojan horse for future micro-credit.

## Two modes, same code

- **Demo mode** — no env vars set. Uses `localStorage` only. Perfect for social recording and screenshots.
- **Cloud mode** — [set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`](DEPLOY.md#setting-up-supabase-one-time). Real anonymous auth, real Postgres, multi-device sync, RLS-secured per-user data. The little pill on the Home screen tells you which mode you're in.

## Tech

| Piece | Choice |
|---|---|
| App | Vite + React 19 + TypeScript |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Icons | Lucide |
| Voice | Web Speech API + custom en/zu/st number-word + item parser |
| Backend | Supabase (Postgres + anonymous auth + RLS) |
| Deploy | Vercel or Netlify (both configured in-repo) |
| CI | GitHub Actions — typecheck + build on every PR |

## Getting started

```bash
git clone https://github.com/snerantie/AI-Data-To-Kasi-Small-business.git
cd AI-Data-To-Kasi-Small-business
npm install

# Optional but recommended for a real backend:
cp .env.example .env.local
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

npm run dev
```

Then open [http://localhost:5173](http://localhost:5173).

## Deployment

See [`DEPLOY.md`](DEPLOY.md) for step-by-step Vercel + Netlify + Supabase setup. TL;DR: import the repo, add two env vars, ship. ~10 minutes end to end.

## Recording tips

- Use Chrome on Android or Safari on iOS for the best Web Speech experience.
- Install as a PWA before you film (menu → Install app / Share → Add to Home Screen) so browser chrome disappears.
- Cold refresh replays the 1.8s splash intro — great first frame for a video.
- The KasiScore dial animates from 300 → target on every visit to Insights, so hit it last for the money shot.

## Repository layout

```
├── .github/workflows/ci.yml     GitHub Actions build + typecheck
├── public/                       Static assets (icon, manifest, favicon)
├── src/
│   ├── components/               BottomNav, Logo, SyncBadge
│   ├── lib/
│   │   ├── supabase.ts           Nullable Supabase client
│   │   └── remote.ts             CRUD helpers, best-effort sync
│   ├── screens/                  Welcome, Home, LogSale, Tabs, Stokvel, Insights, WhatsAppBot, Splash
│   ├── App.tsx                   Router shell
│   ├── i18n.ts                   EN / ZU / ST copy (typed)
│   ├── store.ts                  Global state + selectors + hydration
│   └── voice.ts                  Web Speech API wrapper + sale parser
├── supabase/migrations/001_init.sql   Full schema + RLS policies
├── vercel.json                   Vercel deploy config
├── netlify.toml                  Netlify deploy config
└── DEPLOY.md                     Deployment guide
```

## Roadmap

- [ ] Real receipt OCR via Tesseract.js WASM (100% in-browser)
- [ ] Real WhatsApp Business API integration (Meta Cloud API sandbox)
- [ ] Phone OTP sign-in (Supabase + Twilio/MessageBird for SA numbers)
- [ ] Multi-stokvel support (some owners belong to 3+ stokvels)
- [ ] Cash-flow forecast + restock reminders
- [ ] Credit-partner integration (Jumo / Lulalend / stokvel federation)
- [ ] Native app wrap via Capacitor

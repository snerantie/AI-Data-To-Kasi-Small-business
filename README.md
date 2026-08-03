# KasiKash

**Kasi hustle, upgraded.** Voice-first, multilingual finance OS for township small businesses.

Speak isiZulu, Sesotho, or English into your phone — KasiKash turns it into clean bookkeeping, tracks customer tabs (skoroskoro), and builds a portable **KasiScore** credit profile.

## The demo flow (for social recording)

1. **Splash + language picker** — pick isiZulu, Sesotho, or English.
2. **Home dashboard** — today's takings, profit, money owed, and live KasiScore.
3. **Log a sale by voice** — tap the mic, say _"Ngithengise izinkwa ezintathu ngo-R18"_. Watch it parse into `Item / Qty / Price` in real time.
4. **Skoroskoro** — track customer tabs, mark them paid, WhatsApp reminders for old debts.
5. **Insights** — animated KasiScore, top seller, week profit, and AI tips.

## Tech

- Vite + React 19 + TypeScript
- Tailwind CSS for styling
- Framer Motion for animations
- Lucide icons
- Web Speech API for real voice recognition (with a graceful demo fallback so recording works on any device)
- `localStorage`-backed store — no backend needed for the MVP

## Run locally

```bash
npm install
npm run dev
```

Then open the URL that Vite prints (usually `http://localhost:5173`).

For the best voice experience, run in **Chrome** on desktop or Android. Safari on iOS supports the Web Speech API but with limited language coverage. The app auto-falls back to a demo transcription when speech isn't available, so it still films beautifully.

## Recording tips

- Use a phone-shaped browser window (or Chrome DevTools device toolbar → iPhone 14 Pro).
- Reset demo data any time by clearing site storage.
- The KasiScore animates on every visit to Insights — great for the money shot.

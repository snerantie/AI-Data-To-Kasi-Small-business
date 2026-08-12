# KasiKash — LinkedIn Copy-Paste Kit

Everything you need to set up a LinkedIn **Company Page** or a **Personal Profile** for KasiKash.
All blocks below are ready to select-all → copy → paste directly into LinkedIn's fields.

Brand PNGs live under [`public/og/`](./public/og/) and (once merged) are also served at:
- Logo 400x400 — https://kasikash.com/og/kasikash-logo-400.png
- Logo 1024x1024 — https://kasikash.com/og/kasikash-logo-1024.png
- Company Page banner (1128x191) — https://kasikash.com/og/linkedin-banner-1128x191.png
- Personal Profile banner (1584x396) — https://kasikash.com/og/linkedin-personal-1584x396.png

---

## 1. Tagline (max 120 chars)

Use this in LinkedIn's **Tagline** field on Company Page, or as a personal **Headline**.

```
A credit passport for the businesses banks can't see.
```

Alternate options if you want variety:
```
Voice-first finance for South Africa's informal small businesses.
```
```
Kasi hustle, upgraded — voice-first bookkeeping + a portable KasiScore.
```
```
Turning cash sales, tabs, and stokvels into credit that lenders trust.
```

---

## 2. Overview (short — ~470 chars)

Good for a tight About section, hero blurb, or your personal bio.

```
KasiKash is a voice-first finance app for South Africa's informal small businesses — spaza shops, hair salons, taxi ranks, phone-repair traders and kasi hustles that trade mostly in cash and have never been able to prove their income to a lender.

Owners speak isiZulu, Sesotho, Afrikaans or English into their phone. We turn it into clean bookkeeping, customer-tab tracking, stokvel savings, and a transparent 300–850 KasiScore — a Financial Passport that lenders can trust.

Free forever for the business. We only get paid when a lender uses the passport.
```

---

## 3. Description / About (full — ~1,850 chars, fits LinkedIn's 2,000 limit)

Paste into LinkedIn's **Description** (during setup) or **About** (once live) field.

```
KasiKash is a credit passport for the businesses banks can't see.

South Africa has millions of spaza shops, hair salons, taxi ranks, phone-repair traders and kasi hustles that trade mostly in cash — and have never been able to prove their income to a formal lender. KasiKash changes that.

We're a voice-first, multilingual finance app that turns everyday informal-business activity into an evidence-backed Financial Passport. Owners speak isiZulu, Sesotho, Afrikaans or English into their phone and we turn it into clean bookkeeping, customer-tab tracking (skoroskoro), stokvel management, and a transparent 300–850 KasiScore built from three tiers of evidence:

• Declared — self-reported sales via voice or tap
• Observed — bank statement PDFs and CSVs parsed locally on the device
• Verified — Yoco card transactions and confirmed stokvel contributions

Every score factor is auditable and explained inside the app, so both the owner and a future lender can see exactly how the number was built.

What's in the app today:
• Voice sale logging in four SA languages
• Bank statement PDF/CSV parsing — fully on-device, the file never leaves your phone
• Stokvel savings pot with contribution history and WhatsApp invites
• Customer tabs with one-tap "mark paid" and WhatsApp reminders
• Receipt scanning for supplier expenses
• Works offline; syncs when you're back online
• Installable as a PWA — no App Store needed

Business model:
Free forever for the small businesses using the app. We monetise by selling credit intelligence to lenders — never by charging the traders. If a spaza owner can't afford a bank account, they definitely shouldn't be paying for the tool that proves they deserve one.

Website: https://kasikash.com
```

---

## 4. Short bio (~220 chars)

For LinkedIn About preview, personal Headline (long form), or X/Twitter bio.

```
Voice-first finance for South Africa's informal small businesses. Log sales, run stokvels, build a Financial Passport that lenders trust. isiZulu · Sesotho · Afrikaans · English.
```

---

## 5. Company Page setup — fill-the-blank

| LinkedIn field | Value |
|---|---|
| Company name | `KasiKash` |
| LinkedIn URL slug | `kasikash` (fallback: `kasikash-financial`) |
| Website | `https://kasikash.com` |
| Industry | `Financial Services` |
| Company size | *(dropdown — pick what fits, e.g. `1 employee`)* |
| Company type | `Privately held` |
| Founded | `2026` |
| Headquarters | *(your city — e.g. `Johannesburg, Gauteng`)* |
| Tagline | `A credit passport for the businesses banks can't see.` |

**Specialties** (comma-separated — paste as one line):

```
Fintech, Financial Inclusion, Informal Economy, Alternative Credit Scoring, Township Small Business, Stokvel Management, Voice-First UX, Multi-language Apps, PWA, South Africa SME, Credit Passport, Bank Statement Intelligence
```

---

## 6. Personal launch post (LinkedIn feed)

Paste as-is. Best posted from your personal profile on launch day, tagging the Company Page.

```
I built an app for the businesses banks can't see.

South Africa has millions of spaza shops, hair salons, taxi ranks and kasi hustles trading in cash every day — and almost none of them can prove their income to a formal lender.

So I built KasiKash.

It's a voice-first finance app for informal SMEs. Owners speak isiZulu, Sesotho, Afrikaans or English into their phone. The app turns that into clean bookkeeping, tracks customer tabs, manages their stokvel, and builds a portable Financial Passport with a transparent 300–850 KasiScore.

Every score factor is auditable. Every rand is explained. The traders own their data.

Three tiers of evidence power the score:
• Declared — voice-logged sales
• Observed — bank statement PDFs parsed locally on the device
• Verified — Yoco card transactions and confirmed stokvel contributions

Free forever for the businesses using it. We monetise by selling credit intelligence to lenders — never by charging the traders.

Live now: https://kasikash.com
Installable on any phone. No App Store required.

If you're a lender, a stokvel treasurer, or a spaza owner and this sounds useful — I'd love to talk.

#FinancialInclusion #SouthAfrica #Fintech #InformalEconomy #SMEs #Stokvel
```

---

## 7. Image assets — what goes where on LinkedIn

| Asset | LinkedIn slot | File |
|---|---|---|
| Square logo (K on green tile) | **Profile picture** (Company Page logo, or your personal photo) | `public/og/kasikash-logo-400.png` (or `-1024.png`) |
| Wide short banner | **Company Page cover photo** | `public/og/linkedin-banner-1128x191.png` |
| Wide tall banner | **Personal Profile cover photo** | `public/og/linkedin-personal-1584x396.png` |
| **Square launch poster (RECOMMENDED for LinkedIn feed)** | **Attach to your launch feed post** — square = no crop | Rendered live at [`/press/summary`](https://kasikash.com/press/summary) — screenshot at 1200x1200 |
| **"How to get started" poster (long)** | Follow-up tap-through detail, or WhatsApp shares where portrait is fine | Rendered live at [`/press/how-it-works`](https://kasikash.com/press/how-it-works) — screenshot full page |
| **"How the KasiScore is built" poster (long)** | Second follow-up post, ~1 week after launch | Rendered live at [`/press/kasiscore`](https://kasikash.com/press/kasiscore) — screenshot full page |

### Screenshotting the posters

All three posters are live React pages, not static PNGs. That means the copy stays in sync with the design system automatically — no image-editor round-trip when we tweak wording.

#### 🟢 RECOMMENDED — square launch poster (`/press/summary`)

**Use this for your first LinkedIn feed post.** It's a 1200×1200 square specifically designed so LinkedIn shows all content in-feed with **no cropping**. Everything a viewer needs — headline, KasiScore dial, evidence tiers, 4 features, kasikash.com CTA, SA flag — visible at first glance.

To screenshot at the exact right size:

1. On a **laptop or desktop**, open [https://kasikash.com/press/summary](https://kasikash.com/press/summary).
2. Open DevTools (Cmd+Opt+I on Mac / F12 on Windows) → click the Device Toolbar icon (phone/tablet icon top-left of DevTools).
3. Set **Responsive** viewport to **1200 × 1200** (type the numbers into the top-of-viewport width / height fields).
4. Capture:
   - **Chrome/Edge:** DevTools three-dot menu (top-right of DevTools panel) → **Capture screenshot**
   - **Firefox:** DevTools → Responsive Design Mode → camera icon
   - **Safari:** File → Take Screenshot → Selected Portion → drag to select the square
5. Result: a perfect 1200×1200 PNG. Upload as the image on your LinkedIn feed post — it will render full-width, no crop.

#### 🟡 Tall detail posters (`/press/how-it-works` and `/press/kasiscore`)

Use these for **follow-up posts** in the days/weeks after launch when you want to dive deeper — or to attach to WhatsApp / Signal messages where portrait format works. LinkedIn will crop them in feed, but users can tap to expand.

For those, use the **full-page** screenshot flow:

1. Open the URL on a laptop, resize the browser to ~1200 px wide (or DevTools → Device toolbar → 1200 wide, any height).
2. Full-page screenshot:
   - **Chrome/Edge:** DevTools → three-dot menu inside DevTools → **Capture full size screenshot**
   - **Firefox:** three-dot menu → **Take Screenshot** → **Save full page**
   - **Safari:** File → Export as PDF, then convert to PNG
3. Output: a tall portrait PNG (~1200 × 2400) that scrolls open when tapped in LinkedIn.

You can pair any poster with the personal launch caption in [section 6](#6-personal-launch-post-linkedin-feed).

To regenerate any of the above after editing the SVG source:

```bash
npm run brand:render
```

---

## 8. Brand palette (paste into Canva Brand Kit if you're remixing)

```
#0B0F0A  base / dark
#15803D  brand green
#22C55E  bright green
#0B3A1F  gradient midpoint
#D1FAE5  body text on dark
#86EFAC  accent text
#FBBF24  yellow dot accent
#FFFFFF  wordmark
```

Fonts: **Space Grotesk** (headings) + **Inter** (body). Both free on Google Fonts.

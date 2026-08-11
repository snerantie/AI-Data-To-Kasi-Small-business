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

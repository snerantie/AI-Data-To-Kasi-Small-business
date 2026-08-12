/**
 * Press asset — "How to get started with KasiKash" (PR #31).
 *
 * A single-page infographic served at kasikash.com/press/how-it-works.
 * The founder opens it on a laptop, takes a full-page screenshot,
 * and posts the resulting image to LinkedIn / Twitter / WhatsApp.
 *
 * Modelled on the SPAZA SHOP registration guide the founder shared as
 * reference: numbered steps arranged left / centre / right around a
 * hero phone, "why use this" list at the bottom, trust badge, SA
 * flag, CTA. Same information architecture; KasiKash brand and
 * content throughout.
 *
 * ─────────────────────────────────────────────────────────────────
 * Why we render this in the app codebase (not Canva)
 * ─────────────────────────────────────────────────────────────────
 * The founder has been building this whole product in one codebase
 * and shouldn't need to fight another tool (Canva / Figma) to
 * produce marketing assets that already exist as designs in the
 * app. Building it here means:
 *   * Exact brand consistency (same Tailwind tokens, same Space
 *     Grotesk / Inter fonts, same colour palette as every screen)
 *   * Iteration is a code change, not a design-file re-export
 *   * The URL itself is shareable — you can send a partner the
 *     link if they want the "spec" version rather than a JPEG
 *   * Future press assets (milestone posts, case studies, launch
 *     announcements) inherit this file's design system for free
 *
 * The trade-off is we don't get Canva's playful stickers/decorations.
 * That's fine — KasiKash's brand voice is more considered than
 * sticker-heavy anyway.
 *
 * ─────────────────────────────────────────────────────────────────
 * Screenshotting for posting
 * ─────────────────────────────────────────────────────────────────
 * Open kasikash.com/press/how-it-works on a laptop or desktop, at
 * a browser viewport of ~1200px wide. Use the browser's built-in
 * screenshot tool:
 *   Chrome/Edge:  DevTools → three-dot menu → "Capture full size
 *                 screenshot" (produces a single tall PNG covering
 *                 the whole page)
 *   Safari:       File → Export as PDF (then convert to PNG)
 *   Firefox:      Three-dot menu → Take Screenshot → Save full page
 *
 * Result: a portrait PNG that reads well on LinkedIn portrait
 * (1080x1920) and Instagram / X. If LinkedIn crops it, tap the
 * image to see the full version.
 *
 * ─────────────────────────────────────────────────────────────────
 * NOT indexed by search engines
 * ─────────────────────────────────────────────────────────────────
 * robots.txt disallows /press/ so this asset doesn't show up in
 * Google's search index. It's a shareable graphic, not a page
 * intended for organic discovery.
 */

import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  FileText,
  Landmark,
  Mic,
  PiggyBank,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Top-level poster
// ---------------------------------------------------------------------------

export function PressHowItWorks() {
  return (
    <div className="min-h-screen w-full bg-bg text-white font-body antialiased overflow-x-hidden">
      {/* Constrained max width — the poster reads best at ~1200px on
          a laptop; wider viewports get letterboxed with the bg. */}
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-10 md:py-14">
        <PosterHeader />
        <PosterBody />
        <WhyKasiKashStrip />
        <TrustBanner />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header — logo + tagline + right-hand marketing line
// ---------------------------------------------------------------------------

function PosterHeader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 md:gap-10 items-center pb-6 md:pb-10 border-b border-white/5">
      {/* Logo + brand */}
      <div className="flex items-center gap-3">
        <Monogram size={64} />
        <div className="leading-tight">
          <div className="font-display font-bold text-3xl md:text-4xl">
            <span className="text-white">Kasi</span>
            <span className="text-kasi-gold">Kash</span>
          </div>
          <div className="text-white/40 text-xs uppercase tracking-[0.15em]">
            Your business. Your evidence. Your credit.
          </div>
        </div>
      </div>

      {/* Center: big headline */}
      <div className="text-center md:text-left md:pl-8">
        <div className="inline-block bg-kasi-green text-bg font-display font-bold text-sm md:text-base px-3 py-1 rounded-md tracking-wider mb-2">
          HOW TO GET STARTED
        </div>
        <div className="font-display font-bold text-4xl md:text-6xl leading-[1.05] tracking-tight">
          <span className="text-white">Kasi</span>
          <span className="text-kasi-gold">Kash</span>
        </div>
        <div className="text-white/70 text-base md:text-lg mt-1">
          Start in minutes. <span className="text-kasi-gold">Build for life.</span>
        </div>
      </div>

      {/* Right: value prop */}
      <div className="text-right md:text-left md:pl-6 md:border-l md:border-white/10">
        <div className="font-display italic text-white/90 text-lg md:text-xl leading-tight">
          One credit
          <br />
          passport.
          <br />
          <span className="text-kasi-green">Endless</span>{" "}
          <span className="text-kasi-gold">possibilities.</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Poster body — 4 steps left / hero phone / 4 steps right
// ---------------------------------------------------------------------------

function PosterBody() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-10 mt-10 md:mt-14 items-start">
      {/* Left column — steps 1-4 */}
      <div className="flex flex-col gap-6">
        <StepCard
          n={1}
          title="Choose your language"
          body="Pick from isiZulu, Sesotho, Afrikaans, or English. The whole app switches instantly."
          screen={<LanguageMini />}
          alignLeft
        />
        <StepCard
          n={2}
          title="Tell us about your business"
          body="Spaza, salon, taxi, kitchen, tailor — or just here for the stokvel. Optional and skippable."
          screen={<BusinessMini />}
          alignLeft
        />
        <StepCard
          n={3}
          title="Create or join a stokvel"
          body="Start a new savings group with your neighbours, or join an existing one with a code."
          screen={<StokvelSetupMini />}
          alignLeft
        />
        <StepCard
          n={4}
          title="Log sales by voice"
          body='Tap the mic and say "Sold 3 bread at R18". The sale is logged — no forms, no typing.'
          screen={<VoiceLogMini />}
          alignLeft
        />
      </div>

      {/* Centre — hero phone */}
      <div className="flex flex-col items-center gap-4 mt-4">
        <HeroPhone />
        <div className="text-center max-w-[240px]">
          <div className="text-white/50 text-xs uppercase tracking-wider mb-1">
            The dashboard
          </div>
          <div className="text-white text-sm leading-relaxed">
            Your business at a glance — takings, insights, tabs,
            stokvel, all in one place.
          </div>
        </div>
      </div>

      {/* Right column — steps 5-8 */}
      <div className="flex flex-col gap-6">
        <StepCard
          n={5}
          title="Track customer tabs"
          body="Who owes you what. Add a name and an amount. Mark as paid when they settle. Tab history feeds your credit score."
          screen={<TabsMini />}
        />
        <StepCard
          n={6}
          title="Manage your stokvel"
          body="Confirm contributions, invite members via WhatsApp, share banking details, track progress toward the goal."
          screen={<StokvelMini />}
        />
        <StepCard
          n={7}
          title="Import bank statements"
          body="Upload a PDF or CSV. Parsed on your phone — the file never leaves the device. Adds observed evidence to your passport."
          screen={<BankImportMini />}
        />
        <StepCard
          n={8}
          title="Watch your KasiScore grow"
          body="A 300-850 credit signal built from declared, observed, and verified evidence. Auditable. Portable across lenders."
          screen={<ScoreMini />}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step card — number + text + a mini-phone mockup
// ---------------------------------------------------------------------------

function StepCard({
  n,
  title,
  body,
  screen,
  alignLeft = false,
}: {
  n: number;
  title: string;
  body: string;
  screen: React.ReactNode;
  alignLeft?: boolean;
}) {
  return (
    <div
      className={
        "flex gap-4 items-start " + (alignLeft ? "flex-row-reverse" : "")
      }
    >
      {/* Screen mockup */}
      <div className="shrink-0">{screen}</div>
      {/* Text */}
      <div
        className={
          "flex-1 min-w-0 pt-1 " + (alignLeft ? "text-right" : "text-left")
        }
      >
        <div
          className={
            "flex items-center gap-2 mb-1 " +
            (alignLeft ? "justify-end" : "justify-start")
          }
        >
          <div className="w-7 h-7 rounded-full bg-kasi-green text-bg font-display font-bold text-sm flex items-center justify-center">
            {n}
          </div>
          <div className="font-display font-bold text-lg text-white">
            {title}
          </div>
        </div>
        <div className="text-white/65 text-sm leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini phone frame — used inside every step card
// ---------------------------------------------------------------------------

function MiniPhone({ children }: { children: React.ReactNode }) {
  // ~120px wide keeps the poster readable at LinkedIn-portrait
  // resolutions (1080px). Content inside must be dense but legible.
  return (
    <div
      className="relative bg-bg border border-white/10 rounded-[18px] overflow-hidden shadow-lg"
      style={{ width: 130, height: 230 }}
    >
      {/* Faint notch bar at top for phone realism */}
      <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full bg-white/15" />
      <div className="pt-4 pb-2 px-2 h-full overflow-hidden">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero phone — the large centre phone showing Home
// ---------------------------------------------------------------------------

function HeroPhone() {
  return (
    <div
      className="relative bg-bg border border-white/15 rounded-[32px] overflow-hidden"
      style={{
        width: 240,
        height: 480,
        boxShadow:
          "0 30px 80px -20px rgba(34, 197, 94, 0.35), 0 0 0 6px rgba(255,255,255,0.02)",
      }}
    >
      {/* Notch */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-14 h-1.5 rounded-full bg-white/20 z-10" />
      <div className="pt-6 px-3 h-full overflow-hidden flex flex-col gap-2.5">
        {/* Header row */}
        <div className="flex items-start justify-between pt-2">
          <div>
            <div className="text-white/40 text-[9px] uppercase tracking-wider">
              Sawubona,
            </div>
            <div className="font-display font-bold text-white text-lg leading-tight mt-0.5">
              Nomsa 👋
            </div>
          </div>
          <MiniScoreBadge score={487} />
        </div>

        {/* Takings hero */}
        <div className="rounded-2xl bg-gradient-to-br from-kasi-green-deep via-kasi-green to-kasi-green/70 p-3 mt-1">
          <div className="text-bg/70 text-[8px] uppercase tracking-wider font-semibold">
            Today's takings
          </div>
          <div className="font-display font-bold text-bg text-3xl leading-none mt-1">
            R2,340
          </div>
          <div className="flex gap-3 mt-2 text-[8px] uppercase tracking-wider text-bg/60">
            <div>
              Profit <span className="text-bg font-semibold">R820</span>
            </div>
            <div>
              Owed <span className="text-bg font-semibold">R180</span>
            </div>
          </div>
        </div>

        {/* Log a sale */}
        <div className="rounded-2xl bg-gradient-to-br from-kasi-green/25 via-kasi-green/10 to-transparent border border-kasi-green/40 p-2.5 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-kasi-green text-bg flex items-center justify-center shrink-0">
            <Mic size={14} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-[11px]">
              Log a sale
            </div>
            <div className="text-white/50 text-[8px]">Tap and speak</div>
          </div>
          <ArrowRight size={12} className="text-kasi-green" />
        </div>

        {/* Two-col row */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-kasi-coral/[0.08] border border-kasi-coral/25 p-2">
            <Users size={12} className="text-kasi-coral" />
            <div className="text-white text-[10px] font-semibold mt-1">
              Add a tab
            </div>
          </div>
          <div className="rounded-xl bg-kasi-gold/[0.08] border border-kasi-gold/25 p-2">
            <TrendingUp size={12} className="text-kasi-gold" />
            <div className="text-white text-[10px] font-semibold mt-1">
              See insights
            </div>
          </div>
        </div>

        {/* Scan + import */}
        <div className="rounded-xl bg-kasi-gold/[0.05] border border-kasi-gold/20 p-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-kasi-gold text-bg flex items-center justify-center">
            <ScanLine size={12} />
          </div>
          <div className="text-white text-[10px] font-medium">
            Scan receipt
          </div>
        </div>
        <div className="rounded-xl bg-kasi-gold/[0.05] border border-kasi-gold/20 p-2 flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-kasi-gold text-bg flex items-center justify-center">
            <FileText size={12} />
          </div>
          <div className="text-white text-[10px] font-medium">
            Import bank
          </div>
        </div>

        {/* Bottom tab bar */}
        <div className="mt-auto flex justify-around bg-bg-card/60 backdrop-blur rounded-2xl border border-white/5 p-1.5">
          {[
            { label: "Home", active: true },
            { label: "Log" },
            { label: "Tabs" },
            { label: "Stokvel" },
            { label: "Score" },
          ].map((t) => (
            <div
              key={t.label}
              className={
                "text-[7px] uppercase tracking-wider px-1 py-1 rounded-md " +
                (t.active
                  ? "bg-kasi-green/15 text-kasi-green"
                  : "text-white/40")
              }
            >
              {t.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniScoreBadge({ score }: { score: number }) {
  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/10 px-2 py-1 text-center">
      <div className="text-[7px] uppercase tracking-wider text-white/50">
        KasiScore
      </div>
      <div className="font-display font-bold text-kasi-gold text-base leading-none mt-0.5">
        {score}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mini screens (one per step) — styled reproductions of the real UI
// ---------------------------------------------------------------------------

function MiniHeader({ step }: { step: string }) {
  return (
    <>
      <div className="flex items-center justify-between text-[8px]">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-full bg-kasi-green flex items-center justify-center text-bg font-bold text-[8px]">
            K
          </div>
          <span className="text-white font-semibold">
            <span>Kasi</span>
            <span className="text-kasi-gold">Kash</span>
          </span>
        </div>
        <span className="text-white/40">{step}</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full mt-1.5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-kasi-green to-kasi-gold rounded-full"
          style={{
            width:
              step === "Step 1 of 4"
                ? "25%"
                : step === "Step 3 of 4"
                  ? "75%"
                  : step === "Step 4 of 4"
                    ? "100%"
                    : "0%",
          }}
        />
      </div>
    </>
  );
}

function LanguageMini() {
  return (
    <MiniPhone>
      <MiniHeader step="Step 1 of 4" />
      <div className="font-display font-bold text-white text-[10px] mt-2">
        Choose your language
      </div>
      <div className="flex flex-col gap-1 mt-2">
        {[
          { code: "EN", name: "English", selected: true },
          { code: "ZU", name: "isiZulu" },
          { code: "ST", name: "Sesotho" },
          { code: "AF", name: "Afrikaans" },
        ].map((l) => (
          <div
            key={l.code}
            className={
              "flex items-center gap-1.5 px-1.5 py-1 rounded-md border " +
              (l.selected
                ? "bg-kasi-green/10 border-kasi-green/40"
                : "bg-white/[0.02] border-white/5")
            }
          >
            <div
              className={
                "w-4 h-4 rounded-md flex items-center justify-center text-[7px] font-bold " +
                (l.selected
                  ? "bg-kasi-green text-bg"
                  : "bg-white/5 text-white/50")
              }
            >
              {l.code}
            </div>
            <div className="text-white text-[8px] font-semibold flex-1">
              {l.name}
            </div>
            {l.selected && (
              <div className="w-2 h-2 rounded-full bg-kasi-green" />
            )}
          </div>
        ))}
      </div>
    </MiniPhone>
  );
}

function BusinessMini() {
  return (
    <MiniPhone>
      <MiniHeader step="Step 3 of 4" />
      <div className="font-display font-bold text-white text-[10px] mt-2 leading-tight">
        Tell us about your business
      </div>
      <div className="text-white/40 text-[6.5px] mt-0.5">
        Optional. Skip if stokvel only.
      </div>
      <div className="mt-1.5 px-1.5 py-1 rounded-md bg-white/[0.03] border border-white/10 text-white/40 text-[7px]">
        e.g. Nomsa's Spaza
      </div>
      <div className="text-white/50 text-[6.5px] uppercase tracking-wider mt-2">
        Type
      </div>
      <div className="grid grid-cols-2 gap-1 mt-1">
        {[
          { icon: "🏪", name: "Spaza" },
          { icon: "💇", name: "Salon" },
          { icon: "🚐", name: "Taxi" },
          { icon: "🪡", name: "Tailor" },
          { icon: "🍲", name: "Kitchen" },
          { icon: "✨", name: "Other" },
        ].map((b) => (
          <div
            key={b.name}
            className="px-1 py-1 rounded-md bg-white/[0.03] border border-white/5 flex items-center gap-1"
          >
            <span className="text-[8px]">{b.icon}</span>
            <span className="text-white text-[7px] font-semibold">
              {b.name}
            </span>
          </div>
        ))}
      </div>
    </MiniPhone>
  );
}

function StokvelSetupMini() {
  return (
    <MiniPhone>
      <MiniHeader step="Step 4 of 4" />
      <div className="font-display font-bold text-white text-[10px] mt-2">
        Your stokvel
      </div>
      <div className="text-white/40 text-[6.5px] mt-0.5 leading-tight">
        Create a new one or join with a code.
      </div>
      <div className="flex flex-col gap-1 mt-2">
        <div className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-md bg-kasi-gold/[0.08] border border-kasi-gold/40">
          <div className="w-5 h-5 rounded-md bg-kasi-gold text-bg flex items-center justify-center text-[10px] font-bold">
            +
          </div>
          <div className="flex-1">
            <div className="text-white text-[8px] font-semibold">
              Create new
            </div>
            <div className="text-white/40 text-[6px]">You're admin</div>
          </div>
          <ArrowRight size={8} className="text-kasi-gold" />
        </div>
        <div className="flex items-center gap-1.5 px-1.5 py-1.5 rounded-md bg-kasi-green/[0.08] border border-kasi-green/40">
          <div className="w-5 h-5 rounded-md bg-kasi-green text-bg flex items-center justify-center">
            <span className="text-[8px] font-bold">⌘</span>
          </div>
          <div className="flex-1">
            <div className="text-white text-[8px] font-semibold">
              Join with code
            </div>
            <div className="text-white/40 text-[6px]">You're member</div>
          </div>
          <ArrowRight size={8} className="text-kasi-green" />
        </div>
        <div className="flex items-center gap-1.5 px-1.5 py-1 rounded-md bg-white/[0.02] border border-white/5">
          <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-white/50 text-[10px]">
            ▶︎
          </div>
          <div className="text-white/60 text-[8px]">Skip for now</div>
        </div>
      </div>
    </MiniPhone>
  );
}

function VoiceLogMini() {
  return (
    <MiniPhone>
      <div className="text-white/50 text-[7px] uppercase tracking-wider">
        Log a sale
      </div>
      <div className="font-display font-bold text-white text-[10px] leading-tight mt-1">
        Tap to speak
      </div>
      <div className="flex flex-col items-center justify-center flex-1 gap-1 mt-2">
        <div className="relative">
          {/* Pulse rings */}
          <div className="absolute inset-0 rounded-full bg-kasi-green/30 animate-ping" />
          <div className="relative w-14 h-14 rounded-full bg-kasi-green flex items-center justify-center shadow-glow">
            <Mic size={20} className="text-bg" />
          </div>
        </div>
        <div className="text-white text-[7px] font-semibold mt-1">
          Say what you sold
        </div>
        <div className="text-white/40 text-[6px] italic">
          "Sold 3 bread at R18"
        </div>
      </div>
    </MiniPhone>
  );
}

function TabsMini() {
  return (
    <MiniPhone>
      <div className="text-white/50 text-[7px] uppercase tracking-wider">
        Skoroskoro
      </div>
      <div className="font-display font-bold text-white text-[10px] leading-tight mt-1">
        Customer tabs
      </div>
      <div className="rounded-lg bg-gradient-to-br from-kasi-coral/[0.12] to-transparent border border-kasi-coral/25 p-1.5 mt-2">
        <div className="text-white/50 text-[6px] uppercase tracking-wider">
          Total owed
        </div>
        <div className="font-display font-bold text-white text-lg leading-none mt-0.5">
          R1,240
        </div>
        <div className="text-white/40 text-[6px] mt-0.5">3 customers</div>
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5">
        {[
          { name: "Thabo", amount: "R380" },
          { name: "Zanele", amount: "R520" },
          { name: "Sipho", amount: "R340" },
        ].map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between px-1.5 py-0.5 rounded-md bg-white/[0.02] border border-white/5"
          >
            <div className="text-white text-[7.5px] font-semibold">
              {c.name}
            </div>
            <div className="text-kasi-coral text-[7px] font-mono">
              {c.amount}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto py-1 rounded-md bg-kasi-green text-bg text-[8px] font-semibold text-center">
        + Add customer
      </div>
    </MiniPhone>
  );
}

function StokvelMini() {
  return (
    <MiniPhone>
      <div className="flex items-center justify-between">
        <div className="text-white/50 text-[7px] uppercase tracking-wider">
          Group savings
        </div>
        <div className="text-[6px] font-bold text-kasi-gold bg-kasi-gold/10 px-1 py-0.5 rounded">
          ADMIN
        </div>
      </div>
      <div className="font-display font-bold text-white text-[10px] leading-tight mt-1">
        Holdings
      </div>
      <div className="rounded-lg bg-gradient-to-br from-kasi-green-deep/60 via-kasi-green/40 to-kasi-gold/20 p-1.5 mt-1.5">
        <div className="flex items-center justify-between">
          <div className="text-white/60 text-[6px] uppercase">Saved</div>
          <div className="text-[6px] text-white/60">3 of 4 members</div>
        </div>
        <div className="font-display font-bold text-white text-base leading-none mt-0.5">
          R3,200
        </div>
        <div className="text-white/60 text-[6px] mt-0.5">of R5,000 goal</div>
        <div className="h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
          <div className="h-full bg-white rounded-full" style={{ width: "64%" }} />
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1 rounded-md bg-kasi-gold/[0.08] border border-kasi-gold/30 px-1.5 py-1">
        <Users size={10} className="text-kasi-gold" />
        <div className="text-white text-[7px] font-semibold">
          Invite members
        </div>
      </div>
      <div className="mt-1 grid grid-cols-4 gap-0.5">
        {["R50", "R100", "R250", "R500"].map((amt) => (
          <div
            key={amt}
            className="text-center py-0.5 rounded-md bg-white/[0.03] border border-white/10 text-white text-[7px] font-mono font-semibold"
          >
            {amt}
          </div>
        ))}
      </div>
      <div className="mt-auto flex items-center gap-1 px-1 py-1 rounded-md bg-kasi-green/[0.06] border border-kasi-green/30">
        <Landmark size={10} className="text-kasi-green" />
        <div className="text-white text-[7px] font-semibold">
          Banking added ✓
        </div>
      </div>
    </MiniPhone>
  );
}

function BankImportMini() {
  return (
    <MiniPhone>
      <div className="text-white/50 text-[7px] uppercase tracking-wider">
        Passport
      </div>
      <div className="font-display font-bold text-white text-[10px] leading-tight mt-1">
        Import bank statement
      </div>
      <div className="rounded-lg bg-white/[0.03] border border-white/10 p-2 mt-2 flex flex-col items-center gap-1">
        <div className="w-8 h-8 rounded-md bg-kasi-gold/15 border border-kasi-gold/30 flex items-center justify-center text-kasi-gold">
          <FileText size={14} />
        </div>
        <div className="text-white text-[7px] font-semibold">Capitec.pdf</div>
        <div className="text-white/40 text-[6px]">
          Parsed on your phone
        </div>
      </div>
      <div className="flex items-center justify-center my-1.5">
        <div className="text-kasi-green">↓</div>
      </div>
      <div className="rounded-lg bg-kasi-green/[0.08] border border-kasi-green/25 p-1.5">
        <div className="text-kasi-green text-[6.5px] uppercase tracking-wider font-semibold">
          Observed evidence added
        </div>
        <div className="text-white text-[7px] mt-1 leading-tight">
          R14,800 inflows • 12 counterparties • 3 recurring
        </div>
      </div>
      <div className="mt-auto text-white/40 text-[6px] italic text-center leading-tight">
        Only extracted data is stored.
        <br />
        The PDF itself never leaves your phone.
      </div>
    </MiniPhone>
  );
}

function ScoreMini() {
  return (
    <MiniPhone>
      <div className="text-white/50 text-[7px] uppercase tracking-wider">
        Insights
      </div>
      <div className="font-display font-bold text-white text-[10px] leading-tight mt-1">
        Your KasiScore
      </div>

      {/* Small dial */}
      <div className="flex justify-center mt-2">
        <div className="relative w-16 h-16">
          <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
            <defs>
              <linearGradient id="miniScoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#22C55E" />
              </linearGradient>
            </defs>
            <circle
              cx="32"
              cy="32"
              r="26"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="32"
              cy="32"
              r="26"
              stroke="url(#miniScoreGrad)"
              strokeWidth="6"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="163.4"
              strokeDashoffset="60"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[5px] uppercase tracking-wider text-white/50">
              Score
            </div>
            <div className="font-display font-bold text-white text-sm leading-none">
              647
            </div>
            <div className="text-kasi-green text-[6px] font-semibold">
              Good
            </div>
          </div>
        </div>
      </div>

      {/* Factor bars */}
      <div className="mt-2 flex flex-col gap-1">
        {[
          { label: "Consistency", w: "72%" },
          { label: "Volume", w: "58%" },
          { label: "Evidence", w: "64%" },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-1">
            <div className="text-white/60 text-[6px] flex-1 truncate">
              {f.label}
            </div>
            <div className="w-14 h-1 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-kasi-green rounded-full"
                style={{ width: f.w }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto text-center text-white/40 text-[6px] italic">
        Portable across lenders
      </div>
    </MiniPhone>
  );
}

// ---------------------------------------------------------------------------
// Why KasiKash strip
// ---------------------------------------------------------------------------

function WhyKasiKashStrip() {
  return (
    <div className="mt-12 md:mt-16 rounded-3xl bg-gradient-to-br from-kasi-green/[0.06] via-kasi-gold/[0.04] to-transparent border border-white/10 p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div>
          <div className="font-display font-bold text-2xl md:text-3xl text-white mb-2">
            Why <span className="text-kasi-green">KasiKash</span>
            <span className="text-kasi-gold">?</span>
          </div>
          <div className="text-white/60 text-sm">
            Built for the reality of running an informal business in
            South Africa. Every feature earns its place.
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <WhyItem>
            <span className="text-white font-semibold">Voice-first</span> in
            four SA languages — isiZulu, Sesotho, Afrikaans, English
          </WhyItem>
          <WhyItem>
            <span className="text-white font-semibold">Works offline</span>{" "}
            — sales queue on your phone and sync when you're back online
          </WhyItem>
          <WhyItem>
            <span className="text-white font-semibold">Free forever</span> for
            spaza owners. We're paid by lenders, never by the business
          </WhyItem>
          <WhyItem>
            <span className="text-white font-semibold">
              Bank-grade privacy
            </span>{" "}
            — statements parsed locally, files never uploaded
          </WhyItem>
          <WhyItem>
            <span className="text-white font-semibold">
              Financial Passport
            </span>{" "}
            you own — portable across every lender you'll ever talk to
          </WhyItem>
        </div>
      </div>
    </div>
  );
}

function WhyItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <CheckCircle2
        size={16}
        className="text-kasi-green shrink-0 mt-0.5"
      />
      <div className="text-white/80 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trust banner (bottom strip)
// ---------------------------------------------------------------------------

function TrustBanner() {
  return (
    <div className="mt-8 md:mt-10 rounded-3xl bg-bg-card border border-white/10 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        {/* Trust */}
        <div className="p-5 border-b md:border-b-0 md:border-r border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-kasi-gold/15 border border-kasi-gold/30 flex items-center justify-center text-kasi-gold shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="font-display font-bold text-white text-sm">
              SAFE. SECURE. TRUSTED.
            </div>
            <div className="text-white/50 text-xs mt-0.5">
              Your data is yours. Row-level protected.
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="p-5 border-b md:border-b-0 md:border-r border-white/5 bg-gradient-to-br from-kasi-gold/[0.06] to-transparent text-center">
          <div className="font-display font-bold text-lg md:text-xl text-white leading-tight">
            <span className="text-kasi-green">Start</span> building your{" "}
            <span className="text-kasi-gold">passport</span>
          </div>
          <div className="mt-2 text-kasi-gold font-semibold text-sm">
            kasikash.com
          </div>
        </div>

        {/* Made in SA */}
        <div className="p-5 flex items-center gap-3">
          <SouthAfricanFlag />
          <div>
            <div className="font-display font-bold text-white text-sm">
              MADE IN SOUTH AFRICA
            </div>
            <div className="text-white/50 text-xs mt-0.5">
              For kasi businesses. By a founder from here.
            </div>
          </div>
        </div>
      </div>

      {/* Bottom footer strip */}
      <div className="px-5 py-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-white/40 text-[11px]">
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className="text-kasi-gold" />
          Sinethemba Mvelase, Founder
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <PiggyBank size={11} />
            Stokvels
          </div>
          <div className="flex items-center gap-1">
            <Store size={11} />
            Spaza shops
          </div>
          <div className="flex items-center gap-1">
            <CreditCard size={11} />
            Credit
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared decorations
// ---------------------------------------------------------------------------

function Monogram({ size = 56 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-2xl bg-gradient-to-br from-kasi-green via-kasi-green-deep to-kasi-gold flex items-center justify-center shadow-glow relative"
    >
      <span
        style={{ fontSize: size * 0.45 }}
        className="font-display font-bold text-bg"
      >
        K
      </span>
      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-kasi-gold" />
    </div>
  );
}

/**
 * SA flag rendered as CSS — no external asset needed. Simplified
 * "Y" shape approximation; readable at small sizes.
 */
function SouthAfricanFlag() {
  return (
    <div
      className="shrink-0 rounded-md overflow-hidden border border-white/10"
      style={{ width: 44, height: 30 }}
    >
      <svg
        viewBox="0 0 44 30"
        width="44"
        height="30"
        preserveAspectRatio="none"
      >
        <rect width="44" height="15" fill="#E03C31" />
        <rect y="15" width="44" height="15" fill="#001489" />
        <polygon points="0,0 18,15 0,30" fill="#007A4D" />
        <polygon
          points="0,4 15,15 0,26 22,15"
          fill="#FFFFFF"
        />
        <polygon
          points="0,7 12,15 0,23 18,15"
          fill="#000000"
        />
        <polygon points="0,10 9,15 0,20 14,15" fill="#FFB612" />
      </svg>
    </div>
  );
}

// Suppress an unused-motion warning; kept so future step-in
// animations don't require a re-import.
export const __unused = { motion };

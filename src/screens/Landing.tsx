/**
 * Marketing landing page for kasikash.com (PR #28).
 *
 * Shown to first-time visitors of kasikash.com before they enter
 * the app itself. Existing users (with a saved onboarding state
 * or a dismissed-landing flag) skip it and go straight to their
 * dashboard.
 *
 * ─────────────────────────────────────────────────────────────────
 * Why a marketing site inside the SPA (not a separate static site)
 * ─────────────────────────────────────────────────────────────────
 * The app is a Vite React SPA. A separate marketing site would
 * mean a second codebase, a second deploy, and a second design
 * system to keep in sync. For pilot-phase scope, it's not worth
 * the drag. We render the landing at the root path inside the
 * existing SPA and short-circuit past it once the visitor has
 * opened the app once (localStorage flag). The landing bundle is
 * ~30kB gzipped on top of the ~170kB app bundle — a rounding
 * error compared with the friction of maintaining two codebases.
 *
 * ─────────────────────────────────────────────────────────────────
 * Structure
 * ─────────────────────────────────────────────────────────────────
 * Sections are in essay reading order so a serious visitor (CEO,
 * potential lender partner, journalist) can absorb the full pitch
 * top-to-bottom on their phone without needing to open anything
 * else. Copy is deliberately long-form — a landing page for a
 * fintech underwriting layer needs to prove the founder has
 * thought about the problem carefully, not blast marketing copy.
 *
 *   1. Nav              — logo + "Open the app" CTA
 *   2. Hero             — headline, subhead, primary CTA
 *   3. The invisible economy   — the problem
 *   4. The Financial Passport  — the vision
 *   5. How it works            — the solution (three columns)
 *   6. Interactive KasiScore   — three toggles + live dial
 *   7. Evidence tiers          — declared / observed / verified
 *   8. For financial institutions — the B2B pitch
 *   9. Contact form            — Supabase-backed
 *  10. Founder                 — Sinethemba Mvelase, Founder
 *  11. Footer                  — WhatsApp / repo / "Open the app"
 *
 * Two sections are truly interactive (Sections 6 + 7). The rest
 * animate on scroll but are read-only. That mix is deliberate:
 * enough interactivity to signal craft, not so much that a CEO on
 * a slow train connection sees a broken page.
 */

import { motion, useInView } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  ChevronDown,
  CircleCheck,
  Eye,
  FileText,
  HelpCircle,
  Landmark,
  Mic,
  PiggyBank,
  Send,
  Sparkles,
  UserPen,
  Wallet,
} from "lucide-react";

import { supabase } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

/**
 * The whole landing page.
 *
 * @param onOpenApp - Fired when the visitor taps any "Open the app"
 *   CTA. The parent (App.tsx) sets a localStorage flag and
 *   transitions to the Splash → Onboarding → App flow. From the
 *   landing's perspective it's a fire-and-forget signal.
 */
export function Landing({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <div className="min-h-screen w-full bg-bg text-white font-body antialiased overflow-x-hidden">
      <Nav onOpenApp={onOpenApp} />
      <Hero onOpenApp={onOpenApp} />
      <InvisibleEconomy />
      <FinancialPassport />
      <HowItWorks />
      <InteractiveKasiScore />
      <EvidenceTiers />
      <ForFinancialInstitutions />
      <FrequentlyAskedQuestions />
      <ContactSection />
      <Founder />
      <Footer onOpenApp={onOpenApp} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reusable helpers
// ---------------------------------------------------------------------------

/**
 * Reveals children with a fade + slide as they scroll into view.
 * We use IntersectionObserver via framer-motion's `useInView` so
 * the effect fires once per element (no re-triggering on scroll-
 * back) and stays performant on long pages.
 */
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** The stylised "K" monogram used in place of a founder photo. */
function Monogram({ size = 56 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-2xl bg-gradient-to-br from-kasi-green via-kasi-green-deep to-kasi-gold flex items-center justify-center shadow-glow"
    >
      <span
        style={{ fontSize: size * 0.45 }}
        className="font-display font-bold text-bg"
      >
        K
      </span>
    </div>
  );
}

/** Section wrapper with consistent max-width + vertical padding. */
function Section({
  id,
  children,
  className = "",
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={
        "relative w-full px-5 py-20 md:py-28 " +
        "max-w-5xl mx-auto " +
        className
      }
    >
      {children}
    </section>
  );
}

/** Small eyebrow label used above every section headline. */
function Eyebrow({
  children,
  icon: Icon,
}: {
  children: React.ReactNode;
  icon?: typeof Sparkles;
}) {
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-white/60 text-xs uppercase tracking-[0.15em] mb-5">
      {Icon && <Icon size={12} className="text-kasi-gold" />}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Nav
// ---------------------------------------------------------------------------

function Nav({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-bg/70 border-b border-white/5">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <Monogram size={32} />
          <span className="font-display font-bold text-lg tracking-tight">
            KasiKash
          </span>
        </div>
        <button
          onClick={onOpenApp}
          className="group flex items-center gap-1.5 px-4 py-2 rounded-full bg-kasi-green text-bg text-sm font-semibold hover:bg-kasi-green/90 transition-colors"
        >
          Open the app
          <ArrowRight
            size={14}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </button>
      </div>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// 2. Hero
// ---------------------------------------------------------------------------

function Hero({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <section className="relative overflow-hidden">
      {/* Background glow — subtle, off-brand-green, positioned so it
          reads as ambient light rather than a graphic element. */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[720px] bg-kasi-green/[0.08] blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-40 right-0 w-[400px] h-[400px] bg-kasi-gold/[0.06] blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-5 pt-16 pb-24 md:pt-24 md:pb-32">
        <Reveal>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-kasi-gold/[0.08] border border-kasi-gold/30 text-kasi-gold text-xs uppercase tracking-[0.15em] mb-8">
            <Sparkles size={12} />
            A credit passport for informal SMEs
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight max-w-4xl">
            A credit passport for the businesses{" "}
            <span className="text-kasi-green">banks can&apos;t see.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="mt-6 text-lg md:text-xl text-white/70 max-w-2xl leading-relaxed">
            KasiKash turns kasi hustle — cash sales, tabs, stokvel
            contributions, bank activity — into observable evidence a
            formal lender can trust. We&apos;re building the layer that
            makes South Africa&apos;s informal economy underwritable
            for the first time.
          </p>
        </Reveal>
        <Reveal delay={0.25}>
          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <button
              onClick={onOpenApp}
              className="group flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-kasi-green text-bg font-semibold shadow-glow hover:bg-kasi-green/90 transition-colors"
            >
              Open the app
              <ArrowRight
                size={16}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </button>
            <a
              href="#how-it-works"
              className="group flex items-center justify-center gap-2 px-6 py-3.5 rounded-full border border-white/15 hover:bg-white/[0.04] font-semibold transition-colors"
            >
              How it works
              <ChevronDown
                size={16}
                className="group-hover:translate-y-0.5 transition-transform"
              />
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.4}>
          <div className="mt-14 flex flex-wrap items-center gap-x-8 gap-y-3 text-white/50 text-sm">
            <div className="flex items-center gap-2">
              <CircleCheck size={14} className="text-kasi-green" />
              Voice-first, four languages
            </div>
            <div className="flex items-center gap-2">
              <CircleCheck size={14} className="text-kasi-green" />
              Bank statements parsed locally
            </div>
            <div className="flex items-center gap-2">
              <CircleCheck size={14} className="text-kasi-green" />
              Owner-controlled data
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. The invisible economy — the problem
// ---------------------------------------------------------------------------

function InvisibleEconomy() {
  return (
    <Section id="problem">
      <Reveal>
        <Eyebrow icon={Eye}>The problem</Eyebrow>
        <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl">
          The invisible economy.
        </h2>
      </Reveal>
      <div className="mt-10 grid md:grid-cols-2 gap-x-14 gap-y-6 text-white/80 text-lg leading-relaxed max-w-4xl">
        <Reveal delay={0.1}>
          <p>
            South Africa has roughly{" "}
            <span className="text-white font-semibold">
              two million informal businesses
            </span>
            . Spaza shops, kasi hustles, corner traders, hair salons,
            taxi ranks. Together they turn over an estimated R350–R450
            billion a year — comparable to the country&apos;s largest
            listed retailers.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <p>
            But almost none of them can borrow R5,000 from a formal
            lender. Not because they&apos;re bad borrowers — because
            they&apos;re{" "}
            <span className="text-white font-semibold">invisible</span>.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <p>
            Bank statements show only the digital slice of their
            income. Self-declared turnover on a loan application form
            is unverifiable. Formal accounting is rare. The evidence
            that a business is real and consistent is trapped in the
            owner&apos;s head — and stays there.
          </p>
        </Reveal>
        <Reveal delay={0.4}>
          <p>
            Meanwhile the person with a formal payroll gets a R50,000
            credit card. Not because they&apos;re more creditworthy
            than a spaza owner turning over R30,000 a month in cash —
            because one of them is <em>visible</em> to the system, and
            the other one isn&apos;t.
          </p>
        </Reveal>
        <Reveal delay={0.5} className="md:col-span-2">
          <p className="text-white text-xl md:text-2xl font-display leading-snug pt-4 border-t border-white/10">
            This is the informal economy&apos;s underwriting problem in
            one sentence. And it&apos;s the only problem KasiKash
            exists to solve.
          </p>
        </Reveal>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 4. The Financial Passport — the vision
// ---------------------------------------------------------------------------

function FinancialPassport() {
  return (
    <div className="relative w-full bg-gradient-to-b from-transparent via-kasi-green/[0.03] to-transparent">
      <Section id="vision">
        <Reveal>
          <Eyebrow icon={FileText}>The vision</Eyebrow>
          <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl">
            The Financial Passport.
          </h2>
        </Reveal>
        <div className="mt-10 max-w-3xl text-white/80 text-lg leading-relaxed space-y-6">
          <Reveal delay={0.1}>
            <p>
              We think about credit differently. Instead of asking
              &quot;does this business have a formal record?&quot;, we
              ask a better question:{" "}
              <span className="text-white font-semibold">
                what can we actually observe about this business over
                time?
              </span>
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p>
              Voice-logged sales become declared evidence. Bank
              statement inflows become observed evidence. Yoco
              transactions and matched supplier receipts become
              verified evidence. Stokvel discipline is a behavioural
              signal in its own right.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <p>
              Each of these has a different weight in the underwriting
              decision. A declared cash sale is not the same as a
              bank-matched EFT — and we don&apos;t pretend it is. What
              emerges is a Financial Passport the business owner{" "}
              <span className="text-white font-semibold">owns</span>.
              Not a bank&apos;s opinion of them. Not a credit
              bureau&apos;s file. A living, portable document of their
              actual activity — one they can carry from one lender to
              the next.
            </p>
          </Reveal>
          <Reveal delay={0.4}>
            <p className="text-kasi-gold italic">
              The point is not to make the informal economy look more
              formal than it is. The point is to make it{" "}
              <em>legible</em> — honestly, in its own terms.
            </p>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. How it works — the solution
// ---------------------------------------------------------------------------

const HOW_STEPS = [
  {
    icon: Mic,
    title: "Voice-first logging",
    body: "Say &ldquo;R50 for bread&rdquo; in isiZulu, Sesotho, Afrikaans, or English. The sale is logged. No forms, no typing, no keyboards to fight with. The app was designed for people who&rsquo;ve never written their income down before.",
    accent: "text-kasi-green",
    bg: "bg-kasi-green/10",
    border: "border-kasi-green/25",
  },
  {
    icon: Landmark,
    title: "Evidence layered on top",
    body: "Import a bank PDF, scan a supplier receipt, connect Yoco. Each layer thickens the passport without pretending anything false. Cash sales stay honest — they don&rsquo;t magically become verified income just because they exist.",
    accent: "text-kasi-gold",
    bg: "bg-kasi-gold/10",
    border: "border-kasi-gold/25",
  },
  {
    icon: PiggyBank,
    title: "The KasiScore",
    body: "A single number, 300&ndash;850, built transparently from the declared / observed / verified evidence mix. Improves with real behaviour — not with form-filling. Every factor is auditable and explained in the app.",
    accent: "text-kasi-coral",
    bg: "bg-kasi-coral/10",
    border: "border-kasi-coral/25",
  },
];

function HowItWorks() {
  return (
    <Section id="how-it-works">
      <Reveal>
        <Eyebrow icon={Sparkles}>How it works</Eyebrow>
        <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl">
          Three layers, one passport.
        </h2>
      </Reveal>
      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {HOW_STEPS.map((step, i) => (
          <Reveal key={step.title} delay={0.05 + i * 0.1}>
            <div className="h-full rounded-3xl bg-white/[0.02] border border-white/10 p-6 hover:bg-white/[0.04] transition-colors">
              <div
                className={
                  "w-12 h-12 rounded-2xl flex items-center justify-center mb-5 border " +
                  step.bg +
                  " " +
                  step.border
                }
              >
                <step.icon size={22} className={step.accent} />
              </div>
              <h3 className="font-display font-bold text-xl mb-3">
                {step.title}
              </h3>
              <p
                className="text-white/70 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: step.body }}
              />
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 6. Interactive KasiScore — the centerpiece
// ---------------------------------------------------------------------------

type SignalKey = "sales" | "bank" | "stokvel";

/**
 * Illustrative score model — deliberately NOT the real
 * computeKasiScore. On this page we're demonstrating the concept
 * ("every layer of evidence lifts the score") not the exact
 * production algorithm. Real scoring lives in src/lib/score.ts,
 * uses richer signals, and works from actual user state.
 *
 * Chosen so the progression tells a clear story:
 *   base only         → 300  Building     (empty state)
 *   + declared sales  → 385  Building
 *   + bank statement  → 505  Fair
 *   + stokvel + bank  → 585  Fair
 *   + all three       → 645  Good
 */
const SIGNAL_WEIGHTS: Record<SignalKey, number> = {
  sales: 85, // 20 voice-logged sales → contribution consistency + sales_activity
  bank: 120, // R25k observed inflows over 3 months → evidence_confidence + volume
  stokvel: 140, // 4 confirmed contributions → biggest single factor
};

const SIGNAL_META: Record<
  SignalKey,
  { icon: typeof Mic; title: string; body: string; tier: string }
> = {
  sales: {
    icon: Mic,
    title: "Log 20 sales",
    body: "Voice-recorded, in-language, over the last 30 days.",
    tier: "declared",
  },
  bank: {
    icon: Landmark,
    title: "Import a bank statement",
    body: "R25,000 in observed inflows, 17 distinct counterparties.",
    tier: "observed",
  },
  stokvel: {
    icon: PiggyBank,
    title: "Confirm stokvel contributions",
    body: "Four weeks of confirmed monthly contributions.",
    tier: "verified",
  },
};

function tierLabel(score: number): { label: string; color: string } {
  if (score >= 750) return { label: "Excellent", color: "text-kasi-green" };
  if (score >= 640) return { label: "Good", color: "text-kasi-green" };
  if (score >= 500) return { label: "Fair", color: "text-kasi-gold" };
  return { label: "Building", color: "text-kasi-coral" };
}

function InteractiveKasiScore() {
  const [signals, setSignals] = useState<Record<SignalKey, boolean>>({
    sales: false,
    bank: false,
    stokvel: false,
  });

  const score = useMemo(() => {
    let s = 300; // SCORE_MIN, same floor as production
    if (signals.sales) s += SIGNAL_WEIGHTS.sales;
    if (signals.bank) s += SIGNAL_WEIGHTS.bank;
    if (signals.stokvel) s += SIGNAL_WEIGHTS.stokvel;
    return s;
  }, [signals]);

  const { label, color } = tierLabel(score);
  const progress = Math.max(0, Math.min(1, (score - 300) / (850 - 300)));

  const toggle = (key: SignalKey) =>
    setSignals((s) => ({ ...s, [key]: !s[key] }));

  return (
    <div className="relative w-full bg-gradient-to-b from-transparent via-white/[0.02] to-transparent">
      <Section>
        <Reveal>
          <Eyebrow icon={Sparkles}>Try it</Eyebrow>
          <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl">
            See how the score builds.
          </h2>
          <p className="mt-4 text-white/60 text-lg max-w-2xl">
            Toggle each source of evidence to see how the KasiScore
            responds. Every layer lifts it in proportion to how much
            independent proof it carries.
          </p>
        </Reveal>

        <div className="mt-12 grid md:grid-cols-2 gap-8 items-center">
          {/* Left: toggles */}
          <Reveal delay={0.1}>
            <div className="space-y-3">
              {(Object.keys(SIGNAL_META) as SignalKey[]).map((key) => {
                const meta = SIGNAL_META[key];
                const on = signals[key];
                return (
                  <button
                    key={key}
                    onClick={() => toggle(key)}
                    className={
                      "w-full flex items-center gap-4 rounded-2xl border p-4 text-left transition-all " +
                      (on
                        ? "bg-kasi-green/[0.08] border-kasi-green/40"
                        : "bg-white/[0.02] border-white/10 hover:bg-white/[0.04]")
                    }
                  >
                    <div
                      className={
                        "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors " +
                        (on
                          ? "bg-kasi-green text-bg border-kasi-green"
                          : "bg-white/[0.03] text-white/60 border-white/10")
                      }
                    >
                      <meta.icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-white">
                          {meta.title}
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-white/40">
                          {meta.tier}
                        </span>
                      </div>
                      <div className="text-white/55 text-sm mt-0.5">
                        {meta.body}
                      </div>
                    </div>
                    <div
                      className={
                        "w-11 h-6 rounded-full relative transition-colors shrink-0 " +
                        (on ? "bg-kasi-green" : "bg-white/10")
                      }
                    >
                      <motion.div
                        layout
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 30,
                        }}
                        className={
                          "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md " +
                          (on ? "right-0.5" : "left-0.5")
                        }
                      />
                    </div>
                  </button>
                );
              })}
              <div className="pt-3 text-white/40 text-xs leading-relaxed">
                Illustrative — the production algorithm uses more
                signals and reads from your actual activity. See the
                Insights tab inside the app for the full breakdown.
              </div>
            </div>
          </Reveal>

          {/* Right: live score dial */}
          <Reveal delay={0.2}>
            <div className="rounded-3xl bg-gradient-to-br from-kasi-gold/20 via-kasi-green/10 to-bg-card border border-white/10 p-8 flex flex-col items-center">
              <ScoreDial progress={progress} score={score} label={label} labelColor={color} />
              <div className="mt-6 w-full grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-wider">
                <div
                  className={
                    "px-2 py-1 rounded-full " +
                    (signals.sales
                      ? "bg-white/10 text-white"
                      : "bg-white/[0.03] text-white/30")
                  }
                >
                  Declared
                </div>
                <div
                  className={
                    "px-2 py-1 rounded-full " +
                    (signals.bank
                      ? "bg-kasi-gold/10 text-kasi-gold"
                      : "bg-white/[0.03] text-white/30")
                  }
                >
                  Observed
                </div>
                <div
                  className={
                    "px-2 py-1 rounded-full " +
                    (signals.stokvel
                      ? "bg-kasi-green/10 text-kasi-green"
                      : "bg-white/[0.03] text-white/30")
                  }
                >
                  Verified
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </Section>
    </div>
  );
}

function ScoreDial({
  progress,
  score,
  label,
  labelColor,
}: {
  progress: number;
  score: number;
  label: string;
  labelColor: string;
}) {
  const size = 200;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="landingScoreGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#22C55E" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#landingScoreGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          style={{ filter: "drop-shadow(0 0 20px rgba(34, 197, 94, 0.35))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[11px] uppercase tracking-widest text-white/50">
          KasiScore
        </div>
        <motion.div
          key={score}
          initial={{ opacity: 0.6, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="font-display text-5xl font-bold text-white leading-none mt-1"
        >
          {score}
        </motion.div>
        <div className={"font-semibold text-sm mt-1 " + labelColor}>{label}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. Evidence tiers
// ---------------------------------------------------------------------------

const TIERS = [
  {
    key: "declared",
    weight: "0.2×",
    title: "Declared",
    example: "R100 sale, logged by voice.",
    body: "The owner said it happened. That&rsquo;s a real signal — but it&rsquo;s the weakest kind, because we can&rsquo;t independently corroborate it. Every voice-logged cash sale sits here.",
    color: "text-white",
    ring: "border-white/20",
    bg: "bg-white/[0.03]",
  },
  {
    key: "observed",
    weight: "0.7×",
    title: "Observed",
    example: "R100 EFT inflow on a bank statement.",
    body: "A real digital artefact from a trusted-enough source. Bank statement lines, imported supplier receipts, own-record transactions. We can see it happened, even if only one party is attesting.",
    color: "text-kasi-gold",
    ring: "border-kasi-gold/40",
    bg: "bg-kasi-gold/[0.06]",
  },
  {
    key: "verified",
    weight: "1.0×",
    title: "Verified",
    example: "R100 Yoco card payment webhook.",
    body: "Independent third-party confirmation. A Yoco transaction. A bank webhook. A confirmed stokvel contribution matched to a payment. This is the credit-grade evidence a lender can act on.",
    color: "text-kasi-green",
    ring: "border-kasi-green/40",
    bg: "bg-kasi-green/[0.06]",
  },
];

function EvidenceTiers() {
  return (
    <Section id="evidence">
      <Reveal>
        <Eyebrow icon={CircleCheck}>The evidence model</Eyebrow>
        <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl">
          Not every signal weighs the same.
        </h2>
        <p className="mt-4 text-white/60 text-lg max-w-2xl">
          Every event in KasiKash is tagged with an evidence tier.
          The tier determines how much the event contributes to the
          KasiScore. Nothing gets promoted to a tier it hasn&apos;t
          earned.
        </p>
      </Reveal>

      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {TIERS.map((tier, i) => (
          <Reveal key={tier.key} delay={0.05 + i * 0.15}>
            <div
              className={
                "h-full rounded-3xl border p-6 relative overflow-hidden " +
                tier.ring +
                " " +
                tier.bg
              }
            >
              <div className="flex items-baseline justify-between mb-4">
                <h3
                  className={
                    "font-display font-bold text-2xl " + tier.color
                  }
                >
                  {tier.title}
                </h3>
                <span className="font-mono text-lg text-white/50">
                  {tier.weight}
                </span>
              </div>
              <div className="text-white/50 text-xs uppercase tracking-wider mb-2">
                Example
              </div>
              <div
                className={
                  "text-sm font-medium mb-4 pb-4 border-b border-white/10 " +
                  tier.color
                }
              >
                {tier.example}
              </div>
              <p
                className="text-white/70 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: tier.body }}
              />
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.5}>
        <div className="mt-10 rounded-2xl bg-white/[0.02] border border-white/10 p-5 md:p-6 text-white/70 text-sm md:text-base leading-relaxed max-w-3xl">
          <span className="text-white font-semibold">
            The load-bearing rule:
          </span>{" "}
          a bank statement line saying &ldquo;R5,000 from S. Dlamini&rdquo;
          is <em>never</em> auto-promoted to a customer sale. It stays
          as an observed inflow with an unknown counterparty. The
          system is deliberately incapable of manufacturing certainty
          it doesn&apos;t have.
        </div>
      </Reveal>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 8. For financial institutions
// ---------------------------------------------------------------------------

function ForFinancialInstitutions() {
  return (
    <div className="relative w-full bg-gradient-to-b from-transparent via-kasi-gold/[0.03] to-transparent">
      <Section id="for-lenders">
        <div className="grid md:grid-cols-5 gap-10 items-start">
          <Reveal className="md:col-span-2">
            <Eyebrow icon={Building2}>For financial institutions</Eyebrow>
            <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tight">
              The underwriting layer for the informal economy.
            </h2>
          </Reveal>
          <div className="md:col-span-3 space-y-5 text-white/80 text-lg leading-relaxed">
            <Reveal delay={0.1}>
              <p>
                If you underwrite loans for small businesses in South
                Africa, you already know the pain: telling a real
                R30k-a-month spaza from a form-filler is the
                difference between a healthy portfolio and a book of
                write-offs.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <p>KasiKash gives you:</p>
              <ul className="mt-4 space-y-3 text-white/70 text-base">
                <li className="flex gap-3">
                  <ArrowUpRight
                    size={18}
                    className="text-kasi-green shrink-0 mt-1"
                  />
                  <span>
                    <span className="text-white font-semibold">
                      Observed evidence
                    </span>{" "}
                    — bank inflows, receipt scans, Yoco activity —
                    aggregated per business over time.
                  </span>
                </li>
                <li className="flex gap-3">
                  <ArrowUpRight
                    size={18}
                    className="text-kasi-green shrink-0 mt-1"
                  />
                  <span>
                    <span className="text-white font-semibold">
                      Multi-signal risk assessment
                    </span>{" "}
                    — behaviour and consistency, not just balance.
                    Counterparty diversity, cash-deposit cadence,
                    stokvel discipline, tab repayment.
                  </span>
                </li>
                <li className="flex gap-3">
                  <ArrowUpRight
                    size={18}
                    className="text-kasi-green shrink-0 mt-1"
                  />
                  <span>
                    <span className="text-white font-semibold">
                      A pipeline of qualified informal-SME borrowers
                    </span>{" "}
                    — eventually, once we&apos;ve validated the score
                    against real repayment behaviour.
                  </span>
                </li>
              </ul>
            </Reveal>
            <Reveal delay={0.3}>
              <p className="pt-2">
                We&apos;re piloting with a small number of stokvels
                now to validate that the score predicts real
                repayment. If you want to see the passport format,
                talk about a partnership, or run the pilot data
                against your own risk model — reach out below.
              </p>
            </Reveal>
          </div>
        </div>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. Frequently asked questions (PR #30)
//
// Visible FAQ section that mirrors the FAQPage JSON-LD block in
// index.html <head>. Two reasons the visible content matters:
//   * Google penalises inconsistency between structured data and
//     page content — the visible section proves the FAQ isn't
//     invented purely for search-engine consumption.
//   * Humans doing due diligence (CEOs, journalists, potential
//     lender partners) benefit from a clear Q&A alongside the
//     essay sections.
// The Q&A copy is intentionally verbatim between here and the
// JSON-LD block — if you edit one, edit the other. See PR #30.
// ---------------------------------------------------------------------------

type FaqEntry = { question: string; answer: string };

const FAQ_ENTRIES: FaqEntry[] = [
  {
    // NOTE (PR #33): kept short — under ~155 chars — because Google
    // often picks this exact answer as the search-result description,
    // and anything longer gets truncated mid-sentence. Must stay in
    // sync with the FAQPage JSON-LD in index.html.
    question: "What is KasiKash?",
    answer:
      "KasiKash is a voice-first finance app for South Africa's informal small businesses — spaza shops, salons, taxi ranks — that turns cash sales, tabs, and stokvel contributions into a credit passport lenders trust.",
  },
  {
    question: "How does the KasiScore work?",
    answer:
      "The KasiScore is a 300–850 credit signal built transparently from three tiers of evidence: declared (self-reported sales), observed (bank statement inflows, receipts), and verified (Yoco transactions, confirmed stokvel contributions). Each tier has a different weight, so a Yoco-verified R100 sale counts about five times more than a voice-logged R100 cash sale. Every factor is auditable and explained inside the app.",
  },
  {
    question: "Is KasiKash free?",
    answer:
      "Yes. KasiKash is free forever for spaza owners, informal traders, and stokvel members. We monetize by selling credit intelligence to lenders — never by charging the small businesses using the app.",
  },
  {
    question: "Who is KasiKash for?",
    answer:
      "KasiKash is for South African informal businesses that trade mostly in cash and have never been able to prove their income to a formal lender. Spaza shops, hair salons, phone-repair guys, taxi ranks, corner traders, kasi hustles — and the stokvels those business owners participate in.",
  },
  {
    question: "What languages does KasiKash support?",
    answer:
      "KasiKash supports four South African languages: isiZulu, Sesotho, Afrikaans, and English. Voice logging works in all four so you can say things like \u201cR50 for bread\u201d in whichever language feels natural.",
  },
  {
    question: "Is my business data safe with KasiKash?",
    answer:
      "Yes. Bank statement PDFs are parsed locally on your phone — the file itself never leaves your device. Only extracted transaction data is stored, protected by row-level security so only you can read your own records. Your Financial Passport belongs to you and is portable across lenders.",
  },
  {
    question: "Does KasiKash work offline?",
    answer:
      "Yes. Sales you log while offline are queued on your phone and sync automatically the next time you're online. Designed for the reality of intermittent kasi mobile connectivity.",
  },
  {
    question:
      "How is KasiKash different from apps like Flash, Shop2Shop, or Lesaka?",
    answer:
      "Flash, Shop2Shop, and Lesaka are transaction infrastructure — they move money for informal businesses. KasiKash is credit infrastructure. We build the financial identity that turns transactions from any of those platforms (plus voice-logged cash sales, bank statements, and stokvel discipline) into an underwritable credit passport a lender can act on. We can partner with all of them, not compete.",
  },
];

function FrequentlyAskedQuestions() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <Section id="faq">
      <Reveal>
        <Eyebrow icon={HelpCircle}>Frequently asked</Eyebrow>
        <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tight max-w-3xl">
          Questions we hear a lot.
        </h2>
        <p className="mt-4 text-white/60 text-lg max-w-2xl">
          The short answers. Tap any question to expand. If you have
          something we don&apos;t address here, the contact form below
          reaches the founder directly.
        </p>
      </Reveal>

      <div className="mt-10 flex flex-col gap-3">
        {FAQ_ENTRIES.map((entry, i) => {
          const isOpen = openIndex === i;
          return (
            <Reveal key={entry.question} delay={0.03 * i}>
              <motion.div
                layout
                className="rounded-2xl bg-white/[0.02] border border-white/10 overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <div className="flex-1 min-w-0 font-semibold text-white text-base">
                    {entry.question}
                  </div>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-white/50 shrink-0"
                  >
                    <ChevronDown size={18} />
                  </motion.div>
                </button>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="px-5 pb-5 text-white/75 text-sm leading-relaxed border-t border-white/5 pt-4"
                  >
                    {entry.answer}
                  </motion.div>
                )}
              </motion.div>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 10. Contact form
// ---------------------------------------------------------------------------

type ContactState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success" }
  | { kind: "error"; message: string };

function ContactSection() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organization, setOrganization] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<ContactState>({ kind: "idle" });

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 2 &&
    email.includes("@") &&
    message.trim().length > 0 &&
    status.kind !== "submitting";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus({ kind: "submitting" });

    if (!supabase) {
      // Fall back to a mailto: link when the app is running without
      // Supabase configured (local dev previews, dry runs). Better
      // than showing an opaque failure.
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\nOrg: ${organization}\n\n${message}`,
      );
      window.location.href = `mailto:hello@kasikash.com?subject=KasiKash%20enquiry&body=${body}`;
      setStatus({ kind: "success" });
      return;
    }

    const { error } = await supabase.from("contact_messages").insert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      organization: organization.trim() || null,
      message: message.trim(),
      source: "landing_page",
      user_agent:
        typeof navigator !== "undefined"
          ? navigator.userAgent.slice(0, 500)
          : null,
    });

    if (error) {
      setStatus({
        kind: "error",
        message:
          "Couldn't send your message just now. Please try again in a moment, or email hello@kasikash.com directly.",
      });
      return;
    }

    setStatus({ kind: "success" });
    setName("");
    setEmail("");
    setOrganization("");
    setMessage("");
  };

  return (
    <Section id="contact">
      <div className="grid md:grid-cols-5 gap-10">
        <Reveal className="md:col-span-2">
          <Eyebrow icon={Send}>Get in touch</Eyebrow>
          <h2 className="font-display text-3xl md:text-5xl font-bold leading-tight tracking-tight">
            Let&apos;s talk.
          </h2>
          <p className="mt-4 text-white/60 text-base leading-relaxed max-w-md">
            Lenders, partners, journalists, or anyone building for
            South Africa&apos;s informal economy — leave a note and
            I&apos;ll reply personally.
          </p>
          <div className="mt-6 text-white/40 text-sm">
            Prefer email? <span className="text-white/70">hello@kasikash.com</span>
          </div>
        </Reveal>

        <Reveal delay={0.1} className="md:col-span-3">
          <form
            onSubmit={submit}
            className="rounded-3xl bg-white/[0.02] border border-white/10 p-5 md:p-6 flex flex-col gap-4"
          >
            <div className="grid md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wider text-white/50">
                  Your name
                </span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={200}
                  className="px-4 py-3 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green transition-colors"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs uppercase tracking-wider text-white/50">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={320}
                  className="px-4 py-3 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green transition-colors"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wider text-white/50">
                Organization <span className="text-white/30">(optional)</span>
              </span>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                maxLength={200}
                className="px-4 py-3 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green transition-colors"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs uppercase tracking-wider text-white/50">
                Message
              </span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                maxLength={5000}
                rows={5}
                className="px-4 py-3 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green transition-colors resize-y min-h-[120px]"
              />
            </label>

            {status.kind === "error" && (
              <div className="rounded-xl bg-kasi-coral/[0.08] border border-kasi-coral/25 text-kasi-coral text-sm px-4 py-3">
                {status.message}
              </div>
            )}
            {status.kind === "success" && (
              <div className="rounded-xl bg-kasi-green/[0.08] border border-kasi-green/25 text-kasi-green text-sm px-4 py-3 flex items-center gap-2">
                <CircleCheck size={16} />
                Thanks — message received. I&apos;ll reply personally,
                usually within a day.
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className={
                "mt-1 py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors " +
                (canSubmit
                  ? "bg-kasi-green text-bg hover:bg-kasi-green/90 shadow-glow"
                  : "bg-white/5 text-white/30 cursor-not-allowed")
              }
            >
              {status.kind === "submitting" ? (
                <>Sending…</>
              ) : (
                <>
                  Send message
                  <Send size={14} />
                </>
              )}
            </button>
          </form>
        </Reveal>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// 10. Founder
// ---------------------------------------------------------------------------

function Founder() {
  return (
    <div className="relative w-full border-t border-white/5">
      <Section>
        <Reveal>
          <div className="flex items-center gap-4 max-w-2xl">
            <Monogram size={64} />
            <div>
              <div className="text-xs uppercase tracking-[0.15em] text-white/40 mb-1">
                <span className="inline-flex items-center gap-1.5">
                  <UserPen size={11} /> Built by
                </span>
              </div>
              <div className="font-display text-xl md:text-2xl font-bold text-white">
                Sinethemba Mvelase
              </div>
              <div className="text-white/60 text-sm">
                Founder, KasiKash
              </div>
            </div>
          </div>
          <p className="mt-6 text-white/70 text-base leading-relaxed max-w-2xl">
            KasiKash is a working thesis, not a finished product. The
            app is in a controlled pilot with a small group of
            stokvels while the credit signal is validated against
            real repayment behaviour. If you want to follow the
            build — or push back on any of the ideas above — the
            contact form goes straight to me.
          </p>
        </Reveal>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11. Footer
// ---------------------------------------------------------------------------

function Footer({ onOpenApp }: { onOpenApp: () => void }) {
  return (
    <footer className="w-full border-t border-white/5 bg-bg">
      <div className="max-w-5xl mx-auto px-5 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Monogram size={36} />
          <div>
            <div className="font-display font-bold">KasiKash</div>
            <div className="text-white/40 text-xs">
              A credit passport for informal SMEs.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/50">
          <a
            href="#problem"
            className="hover:text-white transition-colors"
          >
            Problem
          </a>
          <a
            href="#vision"
            className="hover:text-white transition-colors"
          >
            Vision
          </a>
          <a
            href="#how-it-works"
            className="hover:text-white transition-colors"
          >
            How it works
          </a>
          <a
            href="#for-lenders"
            className="hover:text-white transition-colors"
          >
            For lenders
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
          <a
            href="#contact"
            className="hover:text-white transition-colors"
          >
            Contact
          </a>
        </div>
        <button
          onClick={onOpenApp}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-kasi-green text-bg text-sm font-semibold hover:bg-kasi-green/90 transition-colors"
        >
          Open the app
          <ArrowRight size={13} />
        </button>
      </div>
      <div className="max-w-5xl mx-auto px-5 pb-8 text-white/30 text-xs">
        &copy; {new Date().getFullYear()} KasiKash. Built in South
        Africa.
      </div>
    </footer>
  );
}

// Keep `Wallet` referenced so the lucide tree-shaker doesn't lose
// the icon in case a future edit reintroduces it — cheap defensive
// export. Similarly for other icons we imported but only use
// conditionally.
export const __LandingIcons = { Wallet };

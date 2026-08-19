/**
 * Press asset — "How the KasiScore is built" (PR #33).
 *
 * A second shareable poster served at kasikash.com/press/kasiscore,
 * meant to be posted a week or two after the "How to get started"
 * poster (PR #32) as a deeper follow-up in the LinkedIn rollout.
 *
 * Where PR #32 answered "how do I use KasiKash?", this one answers
 * "why should a lender trust the number KasiKash gives them?" —
 * the intellectual centerpiece of the product.
 *
 * Structure mirrors the "How to get started" poster so the two
 * feel like a series:
 *   * Same header shape (logo + green pill + gold-italic tagline)
 *   * Same three-column body (left / centre hero / right)
 *   * Same trust banner + SA flag footer
 *
 * Content is different — this one shows:
 *   * The three evidence tiers with their multipliers
 *   * A big central score dial + factor breakdown
 *   * Three scenarios (empty → active → mature) showing score climb
 *   * "Why the KasiScore is different" checklist
 *
 * Not indexed (robots.txt disallows /press/) — a Google searcher
 * shouldn't land on a bare infographic without context.
 */

import {
  ArrowRight,
  CheckCircle2,
  Eye,
  FileText,
  Landmark,
  Mic,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Store,
  TrendingUp,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Top-level poster
// ---------------------------------------------------------------------------

export function PressKasiScore() {
  return (
    <div className="min-h-screen w-full bg-bg text-white font-body antialiased overflow-x-hidden">
      <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-10 md:py-14">
        <PosterHeader />
        <PosterBody />
        <WhyDifferentStrip />
        <TrustBanner />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function PosterHeader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_auto] gap-6 md:gap-10 items-center pb-6 md:pb-10 border-b border-white/5">
      <div className="flex items-center gap-3">
        <Monogram size={64} />
        <div className="leading-tight">
          <div className="font-display font-bold text-3xl md:text-4xl">
            <span className="text-white">Kasi</span>
            <span className="text-kasi-gold">Kash</span>
          </div>
          <div className="text-white/40 text-xs uppercase tracking-[0.15em]">
            The credit signal beneath the passport.
          </div>
        </div>
      </div>

      <div className="text-center md:text-left md:pl-8">
        <div className="inline-block bg-kasi-gold text-bg font-display font-bold text-sm md:text-base px-3 py-1 rounded-md tracking-wider mb-2">
          HOW THE KASISCORE IS BUILT
        </div>
        <div className="font-display font-bold text-4xl md:text-6xl leading-[1.05] tracking-tight">
          <span className="text-white">300</span>{" "}
          <span className="text-white/40">→</span>{" "}
          <span className="text-kasi-green">850</span>
        </div>
        <div className="text-white/70 text-base md:text-lg mt-1">
          <span className="text-kasi-gold">Transparent.</span> Auditable.{" "}
          <span className="text-kasi-green">Yours.</span>
        </div>
      </div>

      <div className="text-right md:text-left md:pl-6 md:border-l md:border-white/10">
        <div className="font-display italic text-white/90 text-lg md:text-xl leading-tight">
          Every layer of
          <br />
          evidence
          <br />
          <span className="text-kasi-green">lifts</span>{" "}
          <span className="text-kasi-gold">the score.</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Body
// ---------------------------------------------------------------------------

function PosterBody() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 md:gap-10 mt-10 md:mt-14 items-start">
      {/* Left column — evidence tiers */}
      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="The evidence model" icon={Eye}>
          Not all signals weigh the same.
        </SectionHeading>
        <TierCard
          tier="Declared"
          weight="0.2×"
          color="declared"
          example="R100 voice-logged cash sale"
          body="The owner said it happened. Real signal — but weakest, because no other party attests to it. All voice-logged cash sales sit here."
        />
        <TierCard
          tier="Observed"
          weight="0.7×"
          color="observed"
          example="R100 bank statement EFT inflow"
          body="A real digital artefact. Bank statement lines, receipt scans, own-record transactions. We can see it happened, even if only one party is attesting."
        />
        <TierCard
          tier="Verified"
          weight="1.0×"
          color="verified"
          example="R100 Yoco card payment webhook"
          body="Independent third-party confirmation. Yoco transactions, bank webhooks, confirmed stokvel contributions. Credit-grade evidence a lender can act on."
        />
        <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 text-white/70 text-sm leading-relaxed">
          <span className="text-white font-semibold">The load-bearing rule:</span>{" "}
          a bank inflow labelled &quot;R5,000 from S. Dlamini&quot; is{" "}
          <em>never</em> auto-promoted to a customer sale. It stays as
          an observed inflow with an unknown counterparty. The system
          is incapable of manufacturing certainty it doesn&apos;t have.
        </div>
      </div>

      {/* Centre — hero score dial + scenarios */}
      <div className="flex flex-col items-center gap-6 mt-4">
        <HeroDial score={647} tier="Good" />
        <FactorBreakdown />
      </div>

      {/* Right column — scenarios */}
      <div className="flex flex-col gap-6">
        <SectionHeading eyebrow="What the score does" icon={TrendingUp}>
          Every honest layer of evidence climbs the score.
        </SectionHeading>
        <ScenarioCard
          n={1}
          label="Empty account"
          score={300}
          tier="Building"
          note="You haven't logged anything yet. We show the empty state honestly — no fake number."
          color="empty"
        />
        <ScenarioCard
          n={2}
          label="Voice-logged sales only"
          score={385}
          tier="Building"
          note="20 declared cash sales over 30 days. Real signal, but the score reflects the tier weight."
          color="low"
        />
        <ScenarioCard
          n={3}
          label="Sales + bank statement"
          score={505}
          tier="Fair"
          note="Add R25k of observed inflows over 3 months. Score climbs into the Fair tier."
          color="mid"
        />
        <ScenarioCard
          n={4}
          label="Sales + bank + stokvel"
          score={647}
          tier="Good"
          note="Four weeks of confirmed stokvel contributions add the strongest signal. Good territory."
          color="high"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section heading (used at the top of each side column)
// ---------------------------------------------------------------------------

function SectionHeading({
  eyebrow,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  icon: typeof Eye;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="inline-flex items-center gap-2 text-white/50 text-[10px] uppercase tracking-[0.15em] mb-2">
        <Icon size={11} className="text-kasi-gold" />
        {eyebrow}
      </div>
      <div className="font-display font-bold text-xl md:text-2xl text-white leading-snug">
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TierCard — one of declared / observed / verified
// ---------------------------------------------------------------------------

function TierCard({
  tier,
  weight,
  color,
  example,
  body,
}: {
  tier: string;
  weight: string;
  color: "declared" | "observed" | "verified";
  example: string;
  body: string;
}) {
  const palette = {
    declared: {
      bg: "bg-white/[0.03]",
      border: "border-white/20",
      accent: "text-white",
    },
    observed: {
      bg: "bg-kasi-gold/[0.06]",
      border: "border-kasi-gold/40",
      accent: "text-kasi-gold",
    },
    verified: {
      bg: "bg-kasi-green/[0.06]",
      border: "border-kasi-green/40",
      accent: "text-kasi-green",
    },
  }[color];

  return (
    <div className={"rounded-2xl border p-4 " + palette.bg + " " + palette.border}>
      <div className="flex items-baseline justify-between mb-2">
        <div className={"font-display font-bold text-lg " + palette.accent}>
          {tier}
        </div>
        <div className="font-mono text-base text-white/50">{weight}</div>
      </div>
      <div className="text-white/50 text-[10px] uppercase tracking-wider mb-1">
        Example
      </div>
      <div className={"text-sm font-medium mb-3 " + palette.accent}>
        {example}
      </div>
      <div className="text-white/60 text-xs leading-relaxed">{body}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeroDial — big central score with dial + tier
// ---------------------------------------------------------------------------

function HeroDial({ score, tier }: { score: number; tier: string }) {
  const min = 300;
  const max = 850;
  const progress = Math.max(0, Math.min(1, (score - min) / (max - min)));
  const size = 240;
  const stroke = 20;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  return (
    <div className="relative flex flex-col items-center">
      <div className="text-white/50 text-[10px] uppercase tracking-[0.2em] mb-2">
        Sample KasiScore
      </div>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient
              id="pressScoreGrad"
              x1="0"
              y1="0"
              x2="1"
              y2="1"
            >
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
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#pressScoreGrad)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{
              filter: "drop-shadow(0 0 24px rgba(34, 197, 94, 0.4))",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[10px] uppercase tracking-widest text-white/50">
            KasiScore
          </div>
          <div className="font-display text-6xl font-bold text-white leading-none mt-2">
            {score}
          </div>
          <div className="text-kasi-green font-semibold text-sm mt-2">
            {tier}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 text-xs">
        <span className="text-white/40">300</span>
        <div className="relative h-1 w-40 rounded-full bg-white/5 overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-kasi-gold to-kasi-green"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-white/40">850</span>
      </div>
      <div className="mt-4 text-center max-w-[240px]">
        <div className="text-white/80 text-sm leading-relaxed">
          Traditional credit score range. Higher = more evidence,
          more consistency, more independently-verifiable behaviour.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FactorBreakdown — the 8 factors under the dial
// ---------------------------------------------------------------------------

const FACTORS = [
  { label: "Contribution consistency", weight: 20, fill: 78 },
  { label: "Contribution volume", weight: 15, fill: 62 },
  { label: "Recent momentum", weight: 12, fill: 68 },
  { label: "Tab repayment", weight: 15, fill: 55 },
  { label: "Sales activity", weight: 10, fill: 50 },
  { label: "Profile completeness", weight: 10, fill: 75 },
  { label: "Evidence quality", weight: 10, fill: 60 },
  { label: "Time on KasiKash", weight: 8, fill: 35 },
];

function FactorBreakdown() {
  return (
    <div className="w-full max-w-[280px] rounded-2xl bg-white/[0.02] border border-white/10 p-4">
      <div className="text-white/60 text-[10px] uppercase tracking-wider font-semibold mb-3 flex items-center gap-1.5">
        <Sparkles size={11} className="text-kasi-gold" />
        What drives the score
      </div>
      <div className="flex flex-col gap-2">
        {FACTORS.map((f) => (
          <div key={f.label} className="flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <div className="text-white text-[10.5px] font-medium truncate">
                  {f.label}
                </div>
                <div className="text-white/40 text-[9px] tabular-nums ml-2">
                  {f.weight}%
                </div>
              </div>
              <div className="mt-0.5 h-1 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={
                    "h-full rounded-full " +
                    (f.fill >= 70
                      ? "bg-kasi-green"
                      : f.fill >= 45
                        ? "bg-kasi-gold"
                        : "bg-kasi-coral")
                  }
                  style={{ width: `${f.fill}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-white/40 text-[9.5px] leading-relaxed mt-3 pt-3 border-t border-white/5">
        Weights are Phase-1 heuristics. Every factor is auditable in
        the app.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScenarioCard — right-column scenario progression
// ---------------------------------------------------------------------------

function ScenarioCard({
  n,
  label,
  score,
  tier,
  note,
  color,
}: {
  n: number;
  label: string;
  score: number;
  tier: string;
  note: string;
  color: "empty" | "low" | "mid" | "high";
}) {
  const palette = {
    empty: {
      badge: "bg-white/10 text-white/60",
      ring: "border-white/10",
      scoreColor: "text-white/40",
      tierColor: "text-white/50",
    },
    low: {
      badge: "bg-kasi-coral/15 text-kasi-coral",
      ring: "border-white/15",
      scoreColor: "text-white",
      tierColor: "text-kasi-coral",
    },
    mid: {
      badge: "bg-kasi-gold/15 text-kasi-gold",
      ring: "border-kasi-gold/20",
      scoreColor: "text-white",
      tierColor: "text-kasi-gold",
    },
    high: {
      badge: "bg-kasi-green/15 text-kasi-green",
      ring: "border-kasi-green/30",
      scoreColor: "text-white",
      tierColor: "text-kasi-green",
    },
  }[color];

  return (
    <div className={"rounded-2xl border p-4 bg-white/[0.02] " + palette.ring}>
      <div className="flex items-center gap-2 mb-2">
        <div className={"w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold " + palette.badge}>
          {n}
        </div>
        <div className="text-white/70 text-xs uppercase tracking-wider">
          {label}
        </div>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <div className={"font-display font-bold text-3xl " + palette.scoreColor}>
          {score}
        </div>
        <div className={"text-xs font-semibold " + palette.tierColor}>
          {tier}
        </div>
      </div>
      <div className="text-white/60 text-xs leading-relaxed">{note}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Why the KasiScore is different strip
// ---------------------------------------------------------------------------

function WhyDifferentStrip() {
  return (
    <div className="mt-12 md:mt-16 rounded-3xl bg-gradient-to-br from-kasi-gold/[0.06] via-kasi-green/[0.04] to-transparent border border-white/10 p-6 md:p-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div>
          <div className="font-display font-bold text-2xl md:text-3xl text-white mb-2">
            Why the <span className="text-kasi-green">KasiScore</span> is{" "}
            <span className="text-kasi-gold">different</span>
          </div>
          <div className="text-white/60 text-sm">
            Built for the businesses formal credit can&apos;t see. Not a
            copy of FICO, not a substitute for a bank statement — the
            layer that combines both plus everything else in between.
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <WhyItem>
            <span className="text-white font-semibold">Evidence-tiered</span> —
            declared, observed, verified. Not one signal, all of them
          </WhyItem>
          <WhyItem>
            <span className="text-white font-semibold">
              Cash-native
            </span>{" "}
            — a cash-heavy spaza isn&apos;t penalised for being cash-heavy
          </WhyItem>
          <WhyItem>
            <span className="text-white font-semibold">Stokvel-aware</span> —
            group-savings discipline is a first-class credit signal
          </WhyItem>
          <WhyItem>
            <span className="text-white font-semibold">
              Owner-portable
            </span>{" "}
            — the passport belongs to the business, not the bank
          </WhyItem>
          <WhyItem>
            <span className="text-white font-semibold">
              Never inventing certainty
            </span>{" "}
            — R5k from "S. Dlamini" stays observed / unknown, never a "sale"
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
// Trust banner (bottom strip) — same shape as PressHowItWorks so the
// two posters visually feel like a series
// ---------------------------------------------------------------------------

function TrustBanner() {
  return (
    <div className="mt-8 md:mt-10 rounded-3xl bg-bg-card border border-white/10 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        <div className="p-5 border-b md:border-b-0 md:border-r border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-kasi-gold/15 border border-kasi-gold/30 flex items-center justify-center text-kasi-gold shrink-0">
            <ShieldCheck size={18} />
          </div>
          <div>
            <div className="font-display font-bold text-white text-sm">
              AUDITABLE. PORTABLE. YOURS.
            </div>
            <div className="text-white/50 text-xs mt-0.5">
              Every factor explained inside the app.
            </div>
          </div>
        </div>

        <div className="p-5 border-b md:border-b-0 md:border-r border-white/5 bg-gradient-to-br from-kasi-gold/[0.06] to-transparent text-center">
          <div className="font-display font-bold text-lg md:text-xl text-white leading-tight">
            <span className="text-kasi-green">See</span> your{" "}
            <span className="text-kasi-gold">KasiScore</span> grow
          </div>
          <div className="mt-2 text-kasi-gold font-semibold text-sm">
            kasikash.com
          </div>
        </div>

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

      <div className="px-5 py-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-white/40 text-[11px]">
        <div className="flex items-center gap-1.5">
          <Sparkles size={11} className="text-kasi-gold" />
          Sinethemba Mvelase &amp; Thato Molefe, Co-Founders
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Mic size={11} />
            Voice-first
          </div>
          <div className="flex items-center gap-1">
            <FileText size={11} />
            Bank statements
          </div>
          <div className="flex items-center gap-1">
            <PiggyBank size={11} />
            Stokvels
          </div>
          <div className="flex items-center gap-1">
            <Landmark size={11} />
            Yoco
          </div>
          <div className="flex items-center gap-1">
            <Store size={11} />
            Spaza shops
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared decorations (kept in-file so the poster is self-contained)
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
        <polygon points="0,4 15,15 0,26 22,15" fill="#FFFFFF" />
        <polygon points="0,7 12,15 0,23 18,15" fill="#000000" />
        <polygon points="0,10 9,15 0,20 14,15" fill="#FFB612" />
      </svg>
    </div>
  );
}

// Suppress an unused-icon warning; kept for future variations that
// re-introduce this icon so re-imports aren't needed.
export const __unused = { ArrowRight };

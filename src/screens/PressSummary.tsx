/**
 * Press asset — single square poster for LinkedIn feed (PR #34).
 *
 * Served at kasikash.com/press/summary. Designed to be
 * screenshotted at exactly 1200x1200 (LinkedIn feed's sweet spot
 * for square images) so nothing gets cropped in-feed. Contrast
 * with the existing tall posters:
 *
 *   /press/how-it-works  — 8-step deep-dive, ~2400px tall,
 *                          gets aggressively cropped in feed
 *                          preview
 *   /press/kasiscore     — evidence-tier essay, ~2000px tall,
 *                          same problem
 *   /press/summary       — the ONE image most posts should
 *                          attach: square, no crop, all
 *                          essential info visible
 *
 * Design brief from founder feedback:
 *   "For the pics or description pics for LinkedIn post they are
 *    long, close it possible to combine everything into one image?"
 *
 * ─────────────────────────────────────────────────────────────────
 * Layout (top-to-bottom, four zones inside a 1200x1200 frame)
 * ─────────────────────────────────────────────────────────────────
 *
 *   1. Hero band            — logo, KasiKash wordmark, tagline,
 *                              language list
 *   2. Signature visual     — big KasiScore dial + tier bar
 *   3. Feature grid         — four features in a 2x2 grid with
 *                              icons and one-liners
 *   4. Footer strip         — kasikash.com CTA + SA flag +
 *                              founder credit
 *
 * The four zones are stacked vertically inside a fixed-height
 * container so the total height matches the screenshotting
 * viewport exactly.
 *
 * Screenshotting workflow:
 *   1. Open kasikash.com/press/summary on a laptop
 *   2. DevTools → Device toolbar → set viewport to 1200x1200
 *   3. Take a viewport screenshot (Cmd/Ctrl + Shift + P →
 *      "Capture screenshot" in Chrome DevTools)
 *   4. Result: a perfect 1200x1200 PNG ready to upload to
 *      LinkedIn / Instagram / X / Facebook — all of which prefer
 *      square for feed presentation
 */

import {
  CheckCircle2,
  FileText,
  Landmark,
  Mic,
  PiggyBank,
  Sparkles,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export function PressSummary() {
  return (
    <div className="min-h-screen w-full bg-bg text-white font-body antialiased flex items-center justify-center py-6 md:py-10 px-4">
      {/* Fixed 1200x1200 square — this is the exact viewport the
          screenshotter should capture. On larger screens it's
          centered; on smaller viewports it scales down proportionally
          via CSS `max-width: 100vw`. */}
      <div
        className="relative bg-bg overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
        style={{
          width: "min(1200px, 100vw - 32px)",
          aspectRatio: "1 / 1",
        }}
      >
        {/* Ambient background glow — pushed to the corners so it
            frames rather than distracts from the content */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-kasi-green/[0.08] blur-3xl rounded-full pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-kasi-gold/[0.08] blur-3xl rounded-full pointer-events-none" />

        <div className="relative h-full w-full flex flex-col p-10 md:p-14">
          <HeroBand />
          <SignatureDial />
          <FeatureGrid />
          <FooterStrip />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Hero band
// ---------------------------------------------------------------------------

function HeroBand() {
  return (
    <div className="flex flex-col gap-3 pb-6 md:pb-8 border-b border-white/5">
      {/* Row 1: logo + wordmark + made-in-SA pill */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monogram size={56} />
          <div className="font-display font-bold text-3xl md:text-4xl tracking-tight leading-none">
            <span className="text-white">Kasi</span>
            <span className="text-kasi-gold">Kash</span>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10">
          <SouthAfricanFlag />
          <span className="text-white/70 text-xs uppercase tracking-wider font-semibold">
            Made in South Africa
          </span>
        </div>
      </div>

      {/* Row 2: headline */}
      <div className="mt-3">
        <div className="font-display font-bold text-3xl md:text-5xl leading-[1.05] tracking-tight max-w-3xl">
          A <span className="text-kasi-green">credit passport</span> for
          the businesses{" "}
          <span className="text-kasi-gold">banks can&apos;t see.</span>
        </div>
      </div>

      {/* Row 3: language chips */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {["isiZulu", "Sesotho", "Afrikaans", "English"].map((lang, i) => (
          <span
            key={lang}
            className={
              "px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider " +
              (i === 0
                ? "bg-kasi-green/15 text-kasi-green border border-kasi-green/30"
                : "bg-white/[0.03] text-white/70 border border-white/10")
            }
          >
            {lang}
          </span>
        ))}
        <span className="text-white/40 text-xs">·</span>
        <span className="px-2.5 py-0.5 rounded-full bg-kasi-gold/10 text-kasi-gold border border-kasi-gold/30 text-[11px] font-semibold uppercase tracking-wider">
          Voice-first
        </span>
        <span className="text-white/40 text-xs">·</span>
        <span className="px-2.5 py-0.5 rounded-full bg-white/[0.03] text-white/70 border border-white/10 text-[11px] font-semibold uppercase tracking-wider">
          Free forever
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Signature dial — the visual anchor
// ---------------------------------------------------------------------------

function SignatureDial() {
  return (
    <div className="flex-1 flex items-center justify-center gap-8 md:gap-14 py-4 md:py-6">
      {/* Left half: score dial */}
      <div className="flex flex-col items-center shrink-0">
        <ScoreDial score={647} tier="Good" />
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-white/40">300</span>
          <div className="w-32 h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-kasi-gold to-kasi-green rounded-full"
              style={{ width: `${((647 - 300) / (850 - 300)) * 100}%` }}
            />
          </div>
          <span className="text-white/40">850</span>
        </div>
      </div>

      {/* Right half: evidence tier stack */}
      <div className="flex flex-col gap-2.5 max-w-[280px]">
        <div className="text-white/50 text-xs uppercase tracking-[0.15em] mb-1 flex items-center gap-1.5">
          <Sparkles size={12} className="text-kasi-gold" />
          The KasiScore
        </div>
        <div className="text-white/85 text-sm md:text-base leading-relaxed">
          Built from three tiers of evidence — declared, observed,
          verified — and weighted honestly.
        </div>
        <div className="flex flex-col gap-1.5 mt-2">
          <TierRow name="Declared" weight="0.2×" color="declared" />
          <TierRow name="Observed" weight="0.7×" color="observed" />
          <TierRow name="Verified" weight="1.0×" color="verified" />
        </div>
      </div>
    </div>
  );
}

function ScoreDial({ score, tier }: { score: number; tier: string }) {
  const min = 300;
  const max = 850;
  const progress = Math.max(0, Math.min(1, (score - min) / (max - min)));
  const size = 220;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient
            id="summaryScoreGrad"
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
          stroke="url(#summaryScoreGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            filter: "drop-shadow(0 0 20px rgba(34, 197, 94, 0.35))",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[10px] uppercase tracking-widest text-white/50">
          KasiScore
        </div>
        <div className="font-display text-5xl font-bold text-white leading-none mt-2">
          {score}
        </div>
        <div className="text-kasi-green font-semibold text-sm mt-2">
          {tier}
        </div>
      </div>
    </div>
  );
}

function TierRow({
  name,
  weight,
  color,
}: {
  name: string;
  weight: string;
  color: "declared" | "observed" | "verified";
}) {
  const palette = {
    declared: { dot: "bg-white/40", text: "text-white/70" },
    observed: { dot: "bg-kasi-gold", text: "text-kasi-gold" },
    verified: { dot: "bg-kasi-green", text: "text-kasi-green" },
  }[color];
  return (
    <div className="flex items-center gap-2">
      <div className={"w-2 h-2 rounded-full " + palette.dot} />
      <div className={"text-sm font-semibold flex-1 " + palette.text}>
        {name}
      </div>
      <div className="font-mono text-xs text-white/40">{weight}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Feature grid — 2x2 of what the app does
// ---------------------------------------------------------------------------

const FEATURES = [
  {
    icon: Mic,
    title: "Voice-log sales",
    body: "Say “R50 for bread”. Sale logged.",
    accent: "text-kasi-green",
    ring: "border-kasi-green/25",
    bg: "bg-kasi-green/[0.06]",
  },
  {
    icon: Landmark,
    title: "Import bank statements",
    body: "PDF or CSV, parsed on your phone.",
    accent: "text-kasi-gold",
    ring: "border-kasi-gold/25",
    bg: "bg-kasi-gold/[0.06]",
  },
  {
    icon: PiggyBank,
    title: "Run stokvels",
    body: "Track savings, confirm contributions.",
    accent: "text-kasi-coral",
    ring: "border-kasi-coral/25",
    bg: "bg-kasi-coral/[0.06]",
  },
  {
    icon: Users,
    title: "Track customer tabs",
    body: "Who owes what. Mark paid when settled.",
    accent: "text-white",
    ring: "border-white/15",
    bg: "bg-white/[0.03]",
  },
];

function FeatureGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 py-4">
      {FEATURES.map((f) => (
        <div
          key={f.title}
          className={"rounded-2xl border p-4 md:p-5 " + f.ring + " " + f.bg}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
              <f.icon size={18} className={f.accent} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-white text-sm md:text-base truncate">
                {f.title}
              </div>
              <div className="text-white/60 text-xs mt-0.5 leading-tight">
                {f.body}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Footer strip
// ---------------------------------------------------------------------------

function FooterStrip() {
  return (
    <div className="pt-4 md:pt-6 border-t border-white/5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-xl bg-kasi-gold/15 border border-kasi-gold/30 flex items-center justify-center text-kasi-gold shrink-0">
          <FileText size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-white/50 text-[10px] uppercase tracking-wider font-semibold">
            Financial passport
          </div>
          <div className="text-white font-semibold text-sm md:text-base truncate">
            Auditable. Portable. Yours.
          </div>
        </div>
      </div>

      <div className="text-right shrink-0">
        <div className="text-white/50 text-[10px] uppercase tracking-wider font-semibold">
          Try it
        </div>
        <div className="font-display font-bold text-kasi-gold text-base md:text-xl">
          kasikash.com
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared decorations (kept in-file so this poster is self-contained
// and can be duplicated for future variants without a shared-imports
// tangle)
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
      className="shrink-0 rounded-sm overflow-hidden border border-white/10"
      style={{ width: 22, height: 15 }}
    >
      <svg
        viewBox="0 0 22 15"
        width="22"
        height="15"
        preserveAspectRatio="none"
      >
        <rect width="22" height="7.5" fill="#E03C31" />
        <rect y="7.5" width="22" height="7.5" fill="#001489" />
        <polygon points="0,0 9,7.5 0,15" fill="#007A4D" />
        <polygon points="0,2 7.5,7.5 0,13 11,7.5" fill="#FFFFFF" />
        <polygon points="0,3.5 6,7.5 0,11.5 9,7.5" fill="#000000" />
        <polygon points="0,5 4.5,7.5 0,10 7,7.5" fill="#FFB612" />
      </svg>
    </div>
  );
}

// Kept so the tree-shaker doesn't lose CheckCircle2 if a future
// variant re-introduces trust-check bullets to the layout.
export const __unused = { CheckCircle2 };

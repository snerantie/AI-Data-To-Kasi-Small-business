import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronRight,
  FileText,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import type { Screen } from "../App";
import type { Lang, TKey } from "../i18n";
import { tr, trParams } from "../i18n";
import type { ScoreFactorKey } from "../lib/score";
import {
  computeInsights,
  formatRand,
  kasiScoreDetail,
  sumWeekProfit,
  topSeller,
  useStore,
} from "../store";

// Factor-name lookup so the breakdown can display a translated name
// per factor without embedding i18n in the scorer.
const FACTOR_NAME_KEY: Record<ScoreFactorKey, TKey> = {
  contribution_consistency: "factorContribConsistency",
  contribution_volume: "factorContribVolume",
  tab_repayment: "factorTabRepayment",
  sales_activity: "factorSalesActivity",
  time_on_platform: "factorTimeOnPlatform",
  profile_maturity: "factorProfileMaturity",
  recent_momentum: "factorRecentMomentum",
  // PR #22 — the eighth factor. Rewards independent digital evidence.
  evidence_confidence: "factorEvidenceConfidence",
};

const FACTOR_EXPLAIN_KEY: Record<ScoreFactorKey, TKey> = {
  contribution_consistency: "factorContribConsistencyExplain",
  contribution_volume: "factorContribVolumeExplain",
  tab_repayment: "factorTabRepaymentExplain",
  sales_activity: "factorSalesActivityExplain",
  time_on_platform: "factorTimeOnPlatformExplain",
  profile_maturity: "factorProfileMaturityExplain",
  recent_momentum: "factorRecentMomentumExplain",
  evidence_confidence: "factorEvidenceConfidenceExplain",
};

function tierI18nKey(
  tier: "building" | "fair" | "good" | "excellent",
): TKey {
  switch (tier) {
    case "excellent":
      return "scoreLabelExcellent";
    case "good":
      return "scoreLabelGood";
    case "fair":
      return "scoreLabelFair";
    case "building":
      return "scoreTierBuilding";
  }
}

export function Insights({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { state } = useStore();
  const detail = useMemo(() => kasiScoreDetail(state), [state]);
  const target = detail.score;
  const weekProfit = sumWeekProfit(state.sales);
  const top = topSeller(state.sales);
  const insights = computeInsights(state);

  const [display, setDisplay] = useState(300);
  const [expanded, setExpanded] = useState<ScoreFactorKey | null>(null);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 300;
    const dur = 1400;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const progress = Math.max(0, Math.min(1, (display - 300) / (850 - 300)));
  const scoreLabel = tr(tierI18nKey(detail.tier), lang);

  return (
    <div className="h-full overflow-y-auto pb-32 px-5 pt-8">
      <div className="mb-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">
          {tr("insights", lang)}
        </div>
        <div className="font-display text-2xl font-semibold">
          {tr("creditScore", lang)}
        </div>
        <div className="text-sm text-white/60 mt-0.5">{tr("creditSub", lang)}</div>
      </div>

      {/* Circular score OR empty-state prompt.
          When the account has zero value-bearing activity, we don't
          show a number — we show an honest "start logging" prompt.
          The factor breakdown below still renders (with all zeros),
          so the user can see exactly which categories they haven't
          touched yet. */}
      {detail.insufficientData ? (
        <div className="relative rounded-3xl p-8 bg-gradient-to-br from-white/[0.04] to-transparent border border-white/10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/40 font-display text-4xl font-bold">
            —
          </div>
          <div className="text-center">
            <div className="text-white/85 text-sm font-semibold">
              {tr("scoreEmptyTitle", lang)}
            </div>
            <div className="text-white/50 text-xs mt-1 max-w-[240px] mx-auto leading-relaxed">
              {tr("scoreEmptyBody", lang)}
            </div>
          </div>
          <button
            onClick={() => onNavigate("log")}
            className="mt-1 px-5 py-2.5 rounded-full bg-kasi-green text-bg text-sm font-semibold flex items-center gap-2"
          >
            {tr("scoreEmptyCta", lang)}
            <ChevronRight size={16} />
          </button>
        </div>
      ) : (
        <div className="relative rounded-3xl p-6 bg-gradient-to-br from-kasi-gold/25 via-kasi-green/15 to-bg-card border border-white/5 flex flex-col items-center">
          <ScoreDial progress={progress} value={display} label={scoreLabel} />
        </div>
      )}

      {/* Financial passport CTA — only shown when the score is
          real. On an empty account, downloading a passport at 300
          with zero data is meaningless, so we hide the card. */}
      {!detail.insufficientData && (
        <motion.button
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate("passport")}
          className="mt-4 w-full flex items-center gap-4 px-5 py-4 rounded-3xl bg-gradient-to-br from-kasi-gold/25 via-kasi-gold/10 to-transparent border border-kasi-gold/40"
        >
          <div className="w-12 h-12 rounded-2xl bg-kasi-gold text-bg flex items-center justify-center shrink-0 shadow-gold">
            <FileText size={22} />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="font-semibold">
              {tr("insightsDownloadCTA", lang)}
            </div>
            <div className="text-white/60 text-xs mt-0.5">
              {tr("insightsDownloadDesc", lang)}
            </div>
          </div>
          <ChevronRight size={20} className="text-kasi-gold" />
        </motion.button>
      )}

      {/* Score breakdown */}
      <div className="mt-6">
        <div className="text-white/50 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles size={12} className="text-kasi-gold" />
          {tr("scoreBreakdownTitle", lang)}
        </div>
        <div className="text-white/45 text-[11px] mb-3">
          {tr("scoreBreakdownSubtitle", lang)}
        </div>
        <div className="flex flex-col gap-2">
          {detail.factors.map((f) => {
            const isExpanded = expanded === f.key;
            return (
              <motion.div
                key={f.key}
                layout
                className="rounded-2xl bg-bg-card border border-white/5 overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpanded(isExpanded ? null : f.key)
                  }
                  className="w-full flex items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {tr(FACTOR_NAME_KEY[f.key], lang)}
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={
                          "h-full transition-all " +
                          (f.normalised >= 75
                            ? "bg-kasi-green"
                            : f.normalised >= 50
                              ? "bg-kasi-gold"
                              : "bg-kasi-coral")
                        }
                        style={{ width: `${Math.max(4, f.normalised)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display font-bold text-sm tabular-nums">
                      {f.normalised}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-white/40">
                      +{f.contribution}
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="px-4 pb-3 text-white/70 text-xs leading-relaxed border-t border-white/5 pt-3"
                  >
                    {tr(FACTOR_EXPLAIN_KEY[f.key], lang)}
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mt-5">
        <StatCard
          icon={TrendingUp}
          label={tr("weekProfit", lang)}
          value={formatRand(weekProfit)}
          accent="green"
        />
        <StatCard
          icon={Trophy}
          label={tr("topSellerLabel", lang)}
          value={top ? top.item : "—"}
          accent="gold"
        />
      </div>

      {/* Dynamic AI Tips */}
      <div className="mt-6">
        <div className="text-white/50 text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lightbulb size={14} className="text-kasi-gold" />
            {tr("aiTips", lang)}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-kasi-green/80 normal-case tracking-normal">
            <Sparkles size={10} />
            {tr("aiPoweredBadge", lang)}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {insights.length === 0 ? (
            <div className="rounded-2xl bg-bg-card border border-white/5 p-4 text-white/60 text-sm">
              Log a few more sales to unlock personalised tips.
            </div>
          ) : (
            insights.map((ins) => (
              <TipCard
                key={ins.id}
                tip={trParams(ins.key as TKey, lang, ins.params)}
                accent={ins.accent}
              />
            ))
          )}
        </div>
      </div>

      <div className="mt-8 text-center text-white/40 text-xs">
        {tr("poweredBy", lang)}
      </div>
    </div>
  );
}

function ScoreDial({
  progress,
  value,
  label,
}: {
  progress: number;
  value: number;
  label: string;
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
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
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
          stroke="url(#scoreGrad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ filter: "drop-shadow(0 0 20px rgba(34, 197, 94, 0.4))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-[11px] uppercase tracking-widest text-white/50">
          KasiScore
        </div>
        <div className="font-display text-5xl font-bold text-white leading-none mt-1">
          {value}
        </div>
        <div className="text-kasi-green font-semibold text-sm mt-1">{label}</div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  accent: "green" | "gold";
}) {
  const color = accent === "green" ? "text-kasi-green" : "text-kasi-gold";
  return (
    <div className="rounded-2xl bg-bg-card border border-white/5 p-4">
      <div className="flex items-center gap-2 text-white/60 text-xs mb-2">
        <Icon size={14} className={color} />
        <span>{label}</span>
      </div>
      <div className="font-display font-bold text-xl">{value}</div>
    </div>
  );
}

function TipCard({
  tip,
  accent,
}: {
  tip: string;
  accent: "green" | "gold" | "coral";
}) {
  const bar =
    accent === "green"
      ? "bg-kasi-green"
      : accent === "gold"
        ? "bg-kasi-gold"
        : "bg-kasi-coral";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl bg-bg-card border border-white/5 p-4 pl-5 overflow-hidden"
    >
      <div className={"absolute left-0 top-0 bottom-0 w-1.5 " + bar} />
      <p className="text-sm text-white/85 leading-relaxed">{tip}</p>
    </motion.div>
  );
}

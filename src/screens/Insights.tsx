import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Lightbulb, TrendingUp, Trophy, Sparkles } from "lucide-react";
import type { Lang } from "../i18n";
import { tr, trParams } from "../i18n";
import type { TKey } from "../i18n";
import {
  computeInsights,
  formatRand,
  kasiScore,
  sumWeekProfit,
  topSeller,
  useStore,
} from "../store";

export function Insights({ lang }: { lang: Lang }) {
  const { state } = useStore();
  const target = kasiScore(state);
  const weekProfit = sumWeekProfit(state.sales);
  const top = topSeller(state.sales);
  const insights = computeInsights(state);

  const [display, setDisplay] = useState(300);
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
  const scoreLabel =
    target >= 720
      ? tr("scoreLabelExcellent", lang)
      : target >= 600
        ? tr("scoreLabelGood", lang)
        : tr("scoreLabelFair", lang);

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

      {/* Circular score */}
      <div className="relative rounded-3xl p-6 bg-gradient-to-br from-kasi-gold/25 via-kasi-green/15 to-bg-card border border-white/5 flex flex-col items-center">
        <ScoreDial progress={progress} value={display} label={scoreLabel} />
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

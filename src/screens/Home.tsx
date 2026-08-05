import { motion } from "framer-motion";
import {
  Mic,
  ScanLine,
  UserPlus,
  TrendingUp,
  Settings as SettingsIcon,
} from "lucide-react";
import type { Lang } from "../i18n";
import { tr } from "../i18n";
import type { Screen } from "../App";
import {
  formatRand,
  useStore,
  sumSalesToday,
  estimatedProfitToday,
  totalOwed,
  kasiScore,
} from "../store";
import { SyncBadge } from "../components/SyncBadge";

export function Home({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { state, syncStatus } = useStore();
  const takings = sumSalesToday(state.sales);
  const profit = estimatedProfitToday(state.sales);
  const owed = totalOwed(state.tabs);
  const score = kasiScore(state);

  const recent = state.sales.slice(0, 4);

  const displayName = state.profile.ownerName?.trim() || "You";
  const businessName = state.profile.businessName?.trim();

  return (
    <div className="h-full overflow-y-auto pb-32 px-5 pt-8">
      {/* ----- Header ----- */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex flex-col gap-1.5 min-w-0">
          <SyncBadge status={syncStatus} />
          <div className="min-w-0">
            <div className="text-white/60 text-base">{tr("greeting", lang)}</div>
            <div className="font-display text-3xl font-semibold truncate">
              {displayName} 👋
            </div>
            {businessName && (
              <div className="text-white/50 text-sm truncate">
                {businessName}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigate("insights")}
            className="rounded-2xl bg-bg-card border border-white/5 px-3 py-2.5 flex flex-col items-center min-w-[68px]"
          >
            <span className="text-[10px] text-white/50 uppercase tracking-wider">
              {tr("creditScore", lang)}
            </span>
            <span className="font-display text-xl font-bold text-kasi-gold">
              {score}
            </span>
          </button>
          <button
            onClick={() => onNavigate("settings")}
            aria-label="Settings"
            className="w-12 h-12 rounded-2xl bg-bg-card border border-white/5 flex items-center justify-center text-white/70"
          >
            <SettingsIcon size={20} />
          </button>
        </div>
      </div>

      {/* ----- Hero: today's takings ----- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-kasi-green-deep via-kasi-green to-kasi-green/70 shadow-glow"
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative">
          <div className="text-bg/80 text-xs uppercase tracking-widest font-semibold">
            {tr("todayEarnings", lang)}
          </div>
          <div className="font-display text-6xl font-bold text-bg mt-1 leading-none">
            {formatRand(takings)}
          </div>
          <div className="flex items-center gap-4 mt-5 text-bg">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">
                {tr("profit", lang)}
              </div>
              <div className="font-display text-xl font-semibold">
                {formatRand(profit)}
              </div>
            </div>
            <div className="w-px h-9 bg-bg/20" />
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">
                {tr("owed", lang)}
              </div>
              <div className="font-display text-xl font-semibold">
                {formatRand(owed)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ----- Primary action: Log a sale (big, mic-flavoured) ----- */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate("log")}
        className="w-full mt-5 flex items-center gap-4 px-5 py-5 rounded-3xl bg-gradient-to-br from-kasi-green/25 via-kasi-green/10 to-transparent border border-kasi-green/40 min-h-[72px]"
      >
        <div className="w-14 h-14 rounded-2xl bg-kasi-green text-bg flex items-center justify-center shadow-glow shrink-0">
          <Mic size={26} />
        </div>
        <div className="text-left flex-1">
          <div className="font-display text-lg font-bold">
            {tr("logSale", lang)}
          </div>
          <div className="text-white/60 text-sm">
            {tr("micTapToSpeak", lang)}
          </div>
        </div>
        <span className="text-kasi-green text-xl">→</span>
      </motion.button>

      {/* ----- Secondary actions ----- */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <ActionCard
          icon={UserPlus}
          label={tr("addTab", lang)}
          onClick={() => onNavigate("tabs")}
          accent="coral"
        />
        <ActionCard
          icon={TrendingUp}
          label={tr("seeInsights", lang)}
          onClick={() => onNavigate("insights")}
          accent="gold"
        />
      </div>

      {/* ----- Receipt scanner (PR #17) ----- */}
      {/* Full-width so it doesn't compete with the two-up cards above.
          Gold outline matches the passport CTA on Insights so the two
          "power features" have a consistent visual language. */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate("scan")}
        className="mt-3 w-full flex items-center gap-4 px-5 py-4 rounded-3xl bg-gradient-to-br from-kasi-gold/20 via-kasi-gold/5 to-transparent border border-kasi-gold/30"
      >
        <div className="w-12 h-12 rounded-2xl bg-kasi-gold/15 border border-kasi-gold/40 text-kasi-gold flex items-center justify-center shrink-0">
          <ScanLine size={22} />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="font-semibold">{tr("scanReceipt", lang)}</div>
          <div className="text-white/60 text-xs mt-0.5">
            {tr("scanReceiptDesc", lang)}
          </div>
        </div>
        <span className="text-kasi-gold">→</span>
      </motion.button>

      {/* ----- Recent sales ----- */}
      <div className="mt-6">
        <div className="text-white/50 text-xs uppercase tracking-wider mb-3">
          {tr("recentSales", lang)}
        </div>
        {recent.length === 0 ? (
          <div className="text-white/60 text-sm bg-bg-card rounded-2xl p-4 border border-white/5">
            {tr("noSales", lang)}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-2xl bg-bg-card border border-white/5 px-4 py-3.5"
              >
                <div>
                  <div className="font-medium flex items-center gap-2 text-base">
                    {s.item}
                    {s.source === "voice" && (
                      <span className="text-[9px] uppercase text-kasi-green border border-kasi-green/30 px-1.5 py-0.5 rounded">
                        Voice
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/50 mt-0.5">
                    {s.qty} × {formatRand(s.price)}
                  </div>
                </div>
                <div className="font-display font-semibold text-kasi-green text-base">
                  +{formatRand(s.qty * s.price)}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  icon: Icon,
  label,
  onClick,
  accent,
}: {
  icon: typeof Mic;
  label: string;
  onClick: () => void;
  accent: "gold" | "coral";
}) {
  const bg =
    accent === "gold"
      ? "from-kasi-gold/25 to-kasi-gold/5 border-kasi-gold/30"
      : "from-kasi-coral/25 to-kasi-coral/5 border-kasi-coral/30";
  const iconColor =
    accent === "gold" ? "text-kasi-gold" : "text-kasi-coral";
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={
        "relative flex flex-col items-start gap-4 p-4 rounded-2xl bg-gradient-to-br border min-h-[112px] " +
        bg
      }
    >
      <div className={"p-2.5 rounded-xl bg-black/30 " + iconColor}>
        <Icon size={22} />
      </div>
      <div className="text-sm font-semibold text-left leading-tight">
        {label}
      </div>
    </motion.button>
  );
}

import { motion } from "framer-motion";
import { Mic, UserPlus, TrendingUp, ScanLine, MessageCircle } from "lucide-react";
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

  return (
    <div className="h-full overflow-y-auto pb-32 px-5 pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex flex-col gap-1.5">
          <SyncBadge status={syncStatus} />
          <div>
            <div className="text-white/60 text-sm">{tr("greeting", lang)}</div>
            <div className="font-display text-2xl font-semibold">
              {tr("ownerName", lang)} 👋
            </div>
          </div>
        </div>
        <button
          onClick={() => onNavigate("insights")}
          className="rounded-2xl bg-bg-card border border-white/5 px-3 py-2 flex flex-col items-center min-w-[64px]"
        >
          <span className="text-[10px] text-white/50 uppercase tracking-wider">
            {tr("creditScore", lang)}
          </span>
          <span className="font-display text-lg font-bold text-kasi-gold">
            {score}
          </span>
        </button>
      </div>

      {/* WhatsApp pill */}
      <motion.button
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate("whatsapp")}
        className="w-full mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600/25 via-emerald-500/15 to-transparent border border-emerald-500/30"
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-500 text-bg flex items-center justify-center">
          <MessageCircle size={18} />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold">{tr("tryWhatsApp", lang)}</div>
          <div className="text-[11px] text-white/60">
            {tr("whatsappSub", lang)}
          </div>
        </div>
        <span className="text-emerald-400 text-sm">→</span>
      </motion.button>

      {/* Hero card */}
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
          <div className="font-display text-5xl font-bold text-bg mt-1">
            {formatRand(takings)}
          </div>
          <div className="flex items-center gap-4 mt-4 text-bg">
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">
                {tr("profit", lang)}
              </div>
              <div className="font-display text-lg font-semibold">
                {formatRand(profit)}
              </div>
            </div>
            <div className="w-px h-8 bg-bg/20" />
            <div>
              <div className="text-[10px] uppercase tracking-wider opacity-70">
                {tr("owed", lang)}
              </div>
              <div className="font-display text-lg font-semibold">
                {formatRand(owed)}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick actions */}
      <div className="mt-6">
        <div className="text-white/50 text-xs uppercase tracking-wider mb-3">
          {tr("quickActions", lang)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ActionCard
            icon={Mic}
            label={tr("logSale", lang)}
            onClick={() => onNavigate("log")}
            accent="green"
          />
          <ActionCard
            icon={ScanLine}
            label={tr("scanReceipt", lang)}
            onClick={() => onNavigate("log")}
            accent="gold"
          />
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
            accent="cream"
          />
        </div>
      </div>

      {/* Recent sales */}
      <div className="mt-6">
        <div className="text-white/50 text-xs uppercase tracking-wider mb-3">
          {tr("recentSales", lang)}
        </div>
        {recent.length === 0 ? (
          <div className="text-white/50 text-sm bg-bg-card rounded-2xl p-4 border border-white/5">
            {tr("noSales", lang)}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-2xl bg-bg-card border border-white/5 px-4 py-3"
              >
                <div>
                  <div className="font-medium flex items-center gap-2">
                    {s.item}
                    {s.source === "receipt" && (
                      <span className="text-[9px] uppercase text-kasi-gold border border-kasi-gold/30 px-1.5 py-0.5 rounded">
                        Scan
                      </span>
                    )}
                    {s.source === "voice" && (
                      <span className="text-[9px] uppercase text-kasi-green border border-kasi-green/30 px-1.5 py-0.5 rounded">
                        Voice
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/50">
                    {s.qty} × {formatRand(s.price)}
                  </div>
                </div>
                <div className="font-display font-semibold text-kasi-green">
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
  accent: "green" | "gold" | "coral" | "cream";
}) {
  const bg =
    accent === "green"
      ? "from-kasi-green/25 to-kasi-green/5 border-kasi-green/30"
      : accent === "gold"
        ? "from-kasi-gold/25 to-kasi-gold/5 border-kasi-gold/30"
        : accent === "coral"
          ? "from-kasi-coral/25 to-kasi-coral/5 border-kasi-coral/30"
          : "from-kasi-cream/20 to-kasi-cream/5 border-kasi-cream/20";
  const iconColor =
    accent === "green"
      ? "text-kasi-green"
      : accent === "gold"
        ? "text-kasi-gold"
        : accent === "coral"
          ? "text-kasi-coral"
          : "text-kasi-cream";
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={
        "relative flex flex-col items-start gap-4 p-4 rounded-2xl bg-gradient-to-br border " +
        bg
      }
    >
      <div className={"p-2.5 rounded-xl bg-black/30 " + iconColor}>
        <Icon size={22} />
      </div>
      <div className="text-sm font-medium text-left leading-tight">{label}</div>
    </motion.button>
  );
}

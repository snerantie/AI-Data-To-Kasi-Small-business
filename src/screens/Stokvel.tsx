import { motion, AnimatePresence } from "framer-motion";
import { PiggyBank, Users, Plus, Sparkles, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { tr } from "../i18n";
import {
  formatRand,
  stokvelProgress,
  stokvelTotal,
  useStore,
} from "../store";
import type { Screen } from "../App";

const QUICK_AMOUNTS = [50, 100, 250, 500];

export function Stokvel({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { state, addContribution } = useStore();
  const total = stokvelTotal(state.stokvel);
  const targetProgress = stokvelProgress(state.stokvel);
  const goalReached = state.stokvel.name && targetProgress >= 1;
  const [displayed, setDisplayed] = useState(0);
  const [flash, setFlash] = useState<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = displayed;
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayed(from + (targetProgress - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProgress]);

  const daysAgo = (ts: number) =>
    Math.max(0, Math.round((Date.now() - ts) / (1000 * 60 * 60 * 24)));

  const contribute = (amount: number) => {
    addContribution(amount);
    setFlash(amount);
    setTimeout(() => setFlash(null), 1600);
  };

  // ---- Empty state (user skipped stokvel during onboarding) --------------
  if (!state.stokvel.name) {
    return (
      <div className="h-full flex flex-col items-center justify-center px-6 pb-32 text-center gap-4">
        <div className="w-20 h-20 rounded-3xl bg-kasi-gold/10 border border-kasi-gold/25 flex items-center justify-center">
          <PiggyBank size={38} className="text-kasi-gold" />
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold">
            {tr("stokvelTitle", lang)}
          </h2>
          <p className="text-white/60 text-sm mt-1 max-w-[260px] mx-auto">
            {tr("stokvelSub", lang)}
          </p>
        </div>
        <button
          onClick={() => onNavigate("settings")}
          className="mt-2 flex items-center gap-2 px-4 py-3 rounded-2xl bg-kasi-gold text-bg font-semibold text-sm shadow-gold"
        >
          <SettingsIcon size={16} />
          {tr("onbStokvelTitle", lang)}
        </button>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-32 px-5 pt-8">
      <div className="mb-5">
        <div className="text-white/60 text-xs uppercase tracking-wider flex items-center gap-1.5">
          <PiggyBank size={14} className="text-kasi-gold" />
          {tr("stokvelSub", lang)}
        </div>
        <div className="font-display text-2xl font-semibold mt-1">
          {state.stokvel.name}
        </div>
      </div>

      {/* Pot progress card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-kasi-gold/30 via-kasi-green/20 to-bg-card border border-white/5"
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-kasi-gold/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-xs uppercase tracking-widest text-white/60">
              {tr("stokvelSaved", lang)}
            </div>
            <div className="text-xs text-white/50 flex items-center gap-1">
              <Users size={12} />
              {state.stokvel.members} {tr("stokvelMembers", lang)}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-5xl font-bold">
              {formatRand(total)}
            </div>
            <div className="text-white/50 text-lg">
              / {formatRand(state.stokvel.goal)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-kasi-gold to-kasi-green"
                animate={{ width: `${Math.min(100, displayed * 100)}%` }}
                transition={{ type: "spring", stiffness: 60, damping: 20 }}
                style={{ boxShadow: "0 0 20px rgba(34,197,94,0.5)" }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-white/60">
              <span>{Math.round(displayed * 100)}%</span>
              <span>
                {tr("stokvelGoal", lang)}: {formatRand(state.stokvel.goal)}
              </span>
            </div>
          </div>

          {goalReached && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 flex items-center gap-2 rounded-xl bg-kasi-green/20 border border-kasi-green/30 px-3 py-2 text-kasi-green font-semibold text-sm"
            >
              <Sparkles size={16} />
              {tr("goalReached", lang)} 🎉
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Quick contribute */}
      <div className="mt-6">
        <div className="text-white/50 text-xs uppercase tracking-wider mb-3">
          {tr("quickAdd", lang)}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <motion.button
              key={amt}
              whileTap={{ scale: 0.95 }}
              onClick={() => contribute(amt)}
              className="py-3 rounded-2xl bg-bg-card border border-white/5 flex flex-col items-center gap-0.5 hover:border-kasi-green/40 active:border-kasi-green transition-colors"
            >
              <span className="font-display font-bold text-kasi-gold">R{amt}</span>
              <span className="text-[9px] text-white/50 uppercase">
                {tr("contribute", lang)}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Contribution history */}
      <div className="mt-6">
        <div className="text-white/50 text-xs uppercase tracking-wider mb-3">
          {tr("recentContributions", lang)}
        </div>
        <div className="flex flex-col gap-2">
          {state.stokvel.contributions.slice(0, 8).map((c) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-2xl bg-bg-card border border-white/5 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-kasi-gold/15 border border-kasi-gold/30 flex items-center justify-center">
                  <Plus size={16} className="text-kasi-gold" />
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {c.note ??
                      (daysAgo(c.createdAt) === 0
                        ? "Today"
                        : `${daysAgo(c.createdAt)} days ago`)}
                  </div>
                  <div className="text-[11px] text-white/50">
                    {new Date(c.createdAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
              </div>
              <div className="font-display font-semibold text-kasi-green">
                +{formatRand(c.amount)}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Flash toast */}
      <AnimatePresence>
        {flash !== null && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-24 left-4 right-4 rounded-2xl bg-kasi-green text-bg px-4 py-3 font-semibold text-center shadow-glow"
          >
            +{formatRand(flash)} → {state.stokvel.name} ✨
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { motion } from "framer-motion";
import { LANGS, tr } from "../i18n";
import type { Lang } from "../i18n";
import { Logo } from "../components/Logo";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

export function Welcome({ onPick }: { onPick: (l: Lang) => void }) {
  const [selected, setSelected] = useState<Lang>("en");

  return (
    <div className="h-full flex flex-col items-center justify-between px-6 pt-16 pb-10">
      {/* Ambient decoration */}
      <motion.div
        className="pointer-events-none absolute top-10 -left-10 w-64 h-64 rounded-full bg-kasi-green/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 6, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-24 -right-16 w-72 h-72 rounded-full bg-kasi-gold/20 blur-3xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 7, repeat: Infinity, delay: 1 }}
      />

      <div className="relative flex flex-col items-center gap-3">
        <Logo size={54} />
        <motion.p
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="text-white/70 text-sm text-center max-w-[260px]"
        >
          {tr("tagline", selected)}
        </motion.p>
      </div>

      <div className="relative w-full flex flex-col gap-4">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="font-display text-2xl font-semibold text-center"
        >
          {tr("chooseLang", selected)}
        </motion.h2>

        <div className="flex flex-col gap-3">
          {LANGS.map((l, i) => {
            const active = selected === l.code;
            return (
              <motion.button
                key={l.code}
                onClick={() => setSelected(l.code)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                whileTap={{ scale: 0.98 }}
                className={
                  "w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all " +
                  (active
                    ? "bg-kasi-green/15 border-kasi-green shadow-glow"
                    : "bg-bg-card border-white/5 hover:border-white/10")
                }
              >
                <div className="flex items-center gap-3">
                  <div
                    className={
                      "w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm " +
                      (active
                        ? "bg-kasi-green text-bg"
                        : "bg-white/5 text-white/70")
                    }
                  >
                    {l.flag}
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{l.native}</div>
                    <div className="text-xs text-white/50">{l.label}</div>
                  </div>
                </div>
                <div
                  className={
                    "w-5 h-5 rounded-full border-2 " +
                    (active
                      ? "border-kasi-green bg-kasi-green"
                      : "border-white/20")
                  }
                />
              </motion.button>
            );
          })}
        </div>
      </div>

      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => onPick(selected)}
        className="relative w-full py-4 rounded-2xl bg-kasi-green text-bg font-display font-bold text-lg shadow-glow flex items-center justify-center gap-2"
      >
        {tr("getStarted", selected)}
        <ArrowRight size={20} />
      </motion.button>
    </div>
  );
}

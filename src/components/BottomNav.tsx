import { motion } from "framer-motion";
import { Home, Mic, Users, LayoutGrid, TrendingUp } from "lucide-react";
import type { Lang, TKey } from "../i18n";
import { tr } from "../i18n";
import type { Screen } from "../App";

// PR #35 — the Stokvel slot became the Services hub. Stokvel is now
// reached by entering the Stokvel service card inside Services, so
// the nav grid gains a "Services" entry (grid icon) in its place.
const items: { key: Screen; icon: typeof Home; label: TKey }[] = [
  { key: "home", icon: Home, label: "home" },
  { key: "log", icon: Mic, label: "sales" },
  { key: "tabs", icon: Users, label: "tabs" },
  { key: "services", icon: LayoutGrid, label: "servicesNav" },
  { key: "insights", icon: TrendingUp, label: "insights" },
];

export function BottomNav({
  screen,
  onNavigate,
  lang,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  lang: Lang;
}) {
  return (
    <div className="absolute bottom-0 left-0 right-0 px-3 pb-4 pt-2 z-20">
      <div className="mx-auto max-w-md rounded-3xl bg-bg-card/90 backdrop-blur border border-white/5 flex items-center justify-around p-1.5 shadow-2xl">
        {items.map((it) => {
          // PR #35 — stokvel + mashonisa are sub-screens of the
          // Services hub, so keep the Services nav item highlighted
          // while the user is inside either of them.
          const active =
            screen === it.key ||
            (it.key === "services" &&
              (screen === "stokvel" || screen === "mashonisa"));
          const Icon = it.icon;
          return (
            <button
              key={it.key}
              onClick={() => onNavigate(it.key)}
              className="relative flex-1 flex flex-col items-center gap-0.5 py-2 rounded-2xl"
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 rounded-2xl bg-kasi-green/15 border border-kasi-green/30"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                size={18}
                className={
                  "relative z-10 " + (active ? "text-kasi-green" : "text-white/60")
                }
              />
              <span
                className={
                  "relative z-10 text-[9px] font-medium " +
                  (active ? "text-kasi-green" : "text-white/60")
                }
              >
                {tr(it.label, lang)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

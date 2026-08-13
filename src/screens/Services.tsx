/**
 * Services hub (PR #35).
 *
 * The central screen that lists the services a user has enabled and
 * lets them enter each one, plus a section to turn on services they
 * haven't enabled yet. Replaces the dedicated Stokvel bottom-nav tab
 * — stokvel is now reached by entering the Stokvel service card here.
 *
 * ─────────────────────────────────────────────────────────────────
 * Scope (deliberately small)
 * ─────────────────────────────────────────────────────────────────
 * The original design spec described a 7-service platform with
 * roles, permissions, invitation-code service assignment and hard
 * route guards. That's a multi-month build and a product pivot away
 * from the credit-passport pilot. This PR ships the *shape* of that
 * idea with exactly two services — stokvel (existing) and mashonisa
 * (new) — and no RBAC. Any enabled service is fully accessible; we
 * don't pretend to enforce cross-service isolation we haven't built.
 *
 * When the pilot validates that this multi-service framing helps
 * (rather than just complicating onboarding), we expand. Until then,
 * two real services beat seven stubs.
 */

import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  HandCoins,
  PiggyBank,
  Plus,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import type { Screen } from "../App";
import type { Lang, TKey } from "../i18n";
import { tr } from "../i18n";
import type { ServiceType } from "../store";
import { formatRand, useStore } from "../store";

// Static metadata for each service. `screen` is the app Screen the
// "Enter" button navigates to.
const SERVICE_META: Record<
  ServiceType,
  {
    icon: typeof PiggyBank;
    nameKey: TKey;
    descKey: TKey;
    screen: Screen;
    accent: string;
    ring: string;
    bg: string;
    iconBg: string;
  }
> = {
  stokvel: {
    icon: PiggyBank,
    nameKey: "serviceStokvelName",
    descKey: "serviceStokvelDesc",
    screen: "stokvel",
    accent: "text-kasi-green",
    ring: "border-kasi-green/30",
    bg: "from-kasi-green/[0.08] to-transparent",
    iconBg: "bg-kasi-green/15 border-kasi-green/30 text-kasi-green",
  },
  mashonisa: {
    icon: HandCoins,
    nameKey: "serviceMashonisaName",
    descKey: "serviceMashonisaDesc",
    screen: "mashonisa",
    accent: "text-kasi-gold",
    ring: "border-kasi-gold/30",
    bg: "from-kasi-gold/[0.08] to-transparent",
    iconBg: "bg-kasi-gold/15 border-kasi-gold/30 text-kasi-gold",
  },
};

const ALL_SERVICES: ServiceType[] = ["stokvel", "mashonisa"];

export function Services({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { state, enableService } = useStore();
  const [enabling, setEnabling] = useState<ServiceType | null>(null);

  const enabledTypes = new Set(state.services.map((s) => s.serviceType));
  const enabled = ALL_SERVICES.filter((s) => enabledTypes.has(s));
  const available = ALL_SERVICES.filter((s) => !enabledTypes.has(s));

  const handleEnable = async (serviceType: ServiceType) => {
    setEnabling(serviceType);
    await enableService(serviceType);
    setEnabling(null);
  };

  return (
    <div className="h-full overflow-y-auto pb-32 px-5 pt-8">
      <div className="mb-6">
        <div className="text-white/60 text-xs uppercase tracking-wider">
          {tr("servicesNav", lang)}
        </div>
        <div className="font-display text-2xl font-semibold">
          {tr("servicesTitle", lang)}
        </div>
        <div className="text-sm text-white/60 mt-0.5">
          {tr("servicesSubtitle", lang)}
        </div>
      </div>

      {/* Enabled services */}
      <div className="flex flex-col gap-3">
        {enabled.map((type) => {
          const meta = SERVICE_META[type];
          const Icon = meta.icon;
          const summary = serviceSummary(type, state, lang);
          return (
            <motion.button
              key={type}
              layout
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(meta.screen)}
              className={
                "w-full text-left rounded-3xl border p-5 bg-gradient-to-br " +
                meta.ring +
                " " +
                meta.bg
              }
            >
              <div className="flex items-start gap-4">
                <div
                  className={
                    "w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 " +
                    meta.iconBg
                  }
                >
                  <Icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-display font-bold text-lg text-white">
                      {tr(meta.nameKey, lang)}
                    </div>
                    <span className="text-[9px] uppercase tracking-wider text-kasi-green flex items-center gap-0.5">
                      <Check size={9} />
                      {tr("servicesEnabled", lang)}
                    </span>
                  </div>
                  <div className="text-white/60 text-xs mt-1 leading-relaxed">
                    {tr(meta.descKey, lang)}
                  </div>
                  {summary && (
                    <div className="mt-3 text-sm font-semibold text-white/90">
                      {summary}
                    </div>
                  )}
                </div>
                <div
                  className={
                    "shrink-0 self-center flex items-center gap-1 text-sm font-semibold " +
                    meta.accent
                  }
                >
                  {tr("servicesEnter", lang)}
                  <ArrowRight size={14} />
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Available (not-yet-enabled) services */}
      {available.length > 0 && (
        <div className="mt-8">
          <div className="text-white/50 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <Sparkles size={12} className="text-kasi-gold" />
            {tr("servicesAddTitle", lang)}
          </div>
          <div className="text-white/45 text-[11px] mb-3">
            {tr("servicesAddSubtitle", lang)}
          </div>
          <div className="flex flex-col gap-3">
            {available.map((type) => {
              const meta = SERVICE_META[type];
              const Icon = meta.icon;
              const busy = enabling === type;
              return (
                <div
                  key={type}
                  className="w-full rounded-3xl border border-white/10 bg-white/[0.02] p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0 text-white/50">
                      <Icon size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-lg text-white/90">
                        {tr(meta.nameKey, lang)}
                      </div>
                      <div className="text-white/50 text-xs mt-1 leading-relaxed">
                        {tr(meta.descKey, lang)}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEnable(type)}
                    disabled={busy}
                    className="mt-4 w-full py-3 rounded-2xl bg-kasi-green text-bg font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Plus size={16} />
                    {tr("servicesTurnOn", lang)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * A one-line status summary shown on an enabled service's card so the
 * user gets a glance-value hook without entering. Returns null when
 * there's nothing meaningful to show yet.
 */
function serviceSummary(
  type: ServiceType,
  state: ReturnType<typeof useStore>["state"],
  lang: Lang,
): string | null {
  if (type === "stokvel") {
    const stk = state.stokvel;
    if (!stk) return null;
    return `${stk.name} · ${stk.memberships.length}/${stk.members}`;
  }
  if (type === "mashonisa") {
    const loans = state.loans;
    if (loans.length === 0) return null;
    const outstanding = loans.reduce((sum, l) => {
      if (l.status === "repaid" || l.status === "defaulted") return sum;
      const target = l.amountLent * (1 + l.interestPercentage / 100);
      return sum + Math.max(0, target - l.amountRepaid);
    }, 0);
    return `${tr("mashonisaOutstandingTitle", lang)}: ${formatRand(outstanding)}`;
  }
  return null;
}

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
  Settings as SettingsIcon,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Screen } from "../App";
import type { Lang, TKey } from "../i18n";
import { tr } from "../i18n";
import type { ServiceType } from "../store";
import {
  formatRand,
  sumSalesToday,
  useStore,
} from "../store";
import { SyncBadge } from "../components/SyncBadge";
import { AccountNudges } from "../components/AccountNudges";

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
  business: {
    icon: Store,
    nameKey: "serviceBusinessName",
    descKey: "serviceBusinessDesc",
    screen: "home",
    accent: "text-kasi-coral",
    ring: "border-kasi-coral/30",
    bg: "from-kasi-coral/[0.08] to-transparent",
    iconBg: "bg-kasi-coral/15 border-kasi-coral/30 text-kasi-coral",
  },
};

// Order services are shown in the launcher: business first (if
// enabled), then the financial services.
const ALL_SERVICES: ServiceType[] = ["business", "stokvel", "mashonisa"];

export function Services({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { state, syncStatus, enableService, disableService } = useStore();
  const [enabling, setEnabling] = useState<ServiceType | null>(null);
  // PR #38 — "manage" mode lets the user REMOVE a service they don't
  // use. This is how, e.g., an existing user whose `business` service
  // was auto-backfilled can drop it so they stop seeing the takings
  // dashboard card.
  const [managing, setManaging] = useState(false);

  const enabledTypes = new Set(state.services.map((s) => s.serviceType));
  const enabled = ALL_SERVICES.filter((s) => enabledTypes.has(s));
  const available = ALL_SERVICES.filter((s) => !enabledTypes.has(s));

  const handleEnable = async (serviceType: ServiceType) => {
    setEnabling(serviceType);
    await enableService(serviceType);
    setEnabling(null);
  };

  const handleDisable = async (serviceType: ServiceType) => {
    await disableService(serviceType);
    // If that was the last enabled service the Manage toggle vanishes,
    // so drop out of manage mode to avoid a stuck state. `enabled` is
    // captured at render time — length 1 means we just removed the last.
    if (enabled.length <= 1) setManaging(false);
  };

  const ownerName = state.profile.ownerName?.trim();

  return (
    <div className="h-full overflow-y-auto pb-28 px-5 pt-8">
      {/* Header — greeting + sync badge + settings gear. This is the
          app's landing screen now, so the settings entry point lives
          here (it used to be on the business Home). */}
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          {ownerName && (
            <div className="text-white/60 text-sm">
              {tr("greeting", lang)}
            </div>
          )}
          <div className="font-display text-2xl font-bold leading-tight truncate">
            {ownerName || tr("servicesTitle", lang)}
          </div>
          <div className="text-sm text-white/55 mt-0.5">
            {tr("servicesSubtitle", lang)}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SyncBadge status={syncStatus} />
          <button
            onClick={() => onNavigate("settings")}
            aria-label={tr("settingsTitle", lang)}
            className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/70"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>

      {/* Manage toggle — lets the user remove services they don't use.
          Only shown when they have at least one service to manage. */}
      {enabled.length > 0 && (
        <div className="flex justify-end -mt-2 mb-3">
          <button
            onClick={() => setManaging((v) => !v)}
            className={
              "text-sm font-medium " +
              (managing ? "text-kasi-green" : "text-white/50")
            }
          >
            {managing ? tr("servicesDone", lang) : tr("servicesManage", lang)}
          </button>
        </div>
      )}

      {/* Backup + install nudges — on the launcher so EVERY user sees
          them, including stokvel/mashonisa-only users who never open
          the business Home. This is where they learn to secure their
          data. */}
      <AccountNudges lang={lang} onNavigate={onNavigate} />

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
              onClick={() =>
                managing ? handleDisable(type) : onNavigate(meta.screen)
              }
              aria-label={
                managing
                  ? `${tr("servicesRemove", lang)} ${tr(meta.nameKey, lang)}`
                  : `${tr("servicesEnter", lang)} ${tr(meta.nameKey, lang)}`
              }
              className={
                "w-full text-left rounded-3xl border p-5 bg-gradient-to-br " +
                (managing
                  ? "border-kasi-coral/40 from-kasi-coral/[0.06] to-transparent"
                  : meta.ring + " " + meta.bg)
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
                {managing ? (
                  <div className="shrink-0 self-center flex items-center gap-1 text-sm font-semibold text-kasi-coral">
                    <span
                      className="w-8 h-8 rounded-full bg-kasi-coral/15 border border-kasi-coral/30 flex items-center justify-center"
                      aria-hidden
                    >
                      <X size={16} />
                    </span>
                    {tr("servicesRemove", lang)}
                  </div>
                ) : (
                  <div
                    className={
                      "shrink-0 self-center flex items-center gap-1 text-sm font-semibold " +
                      meta.accent
                    }
                  >
                    {tr("servicesEnter", lang)}
                    <ArrowRight size={14} />
                  </div>
                )}
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
  if (type === "business") {
    const today = sumSalesToday(state.sales);
    if (today <= 0) return null;
    return `${tr("todayEarnings", lang)}: ${formatRand(today)}`;
  }
  return null;
}

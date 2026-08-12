import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import {
  FileUp,
  Mic,
  ScanLine,
  UserPlus,
  TrendingUp,
  Settings as SettingsIcon,
  Smartphone,
  X,
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
import { InstallSheet } from "../components/InstallSheet";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import { ShieldCheck } from "lucide-react";

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

  // ─── PWA install banner (PR #29) ────────────────────────────────
  // Small dismissible card that nudges the user to save the app to
  // their home screen. Only shows when:
  //   * The browser hasn't been marked "installed" (standalone mode)
  //   * The user hasn't previously dismissed the banner in
  //     localStorage (persistent across sessions)
  //   * The current platform actually supports install (any mobile;
  //     hides on desktop because Home is a mobile-first screen and
  //     desktop users are unlikely to install)
  // Tapping the banner opens the InstallSheet with platform-
  // appropriate instructions.
  const { platform, isInstalled } = useInstallPrompt();
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("kasikash:install-banner-dismissed") === "1";
  });
  const [installSheetOpen, setInstallSheetOpen] = useState(false);

  // Show the banner only for mobile-capable platforms where install
  // is a realistic prospect. Desktop users generally don't add web
  // apps to their home screen — they already have bookmarks.
  const showInstallBanner =
    !isInstalled &&
    !bannerDismissed &&
    (platform === "android-chrome" ||
      platform === "ios-safari" ||
      platform === "other-mobile");

  const dismissBanner = () => {
    window.localStorage.setItem("kasikash:install-banner-dismissed", "1");
    setBannerDismissed(true);
  };

  // Close the sheet automatically if the user installs (via any
  // path) so we don't leave a stale modal open behind the newly-
  // launched PWA.
  useEffect(() => {
    if (isInstalled) setInstallSheetOpen(false);
  }, [isInstalled]);

  // ─── Back-up-your-account banner (PR #33) ───────────────────────
  // Silent risk: a pilot user could log R30k of sales, clear their
  // browser cache once, and lose everything — because they never
  // linked an email or phone. The Settings section has the form,
  // but nobody discovers it until it's too late. This banner
  // surfaces the prompt WHERE users actually see it (Home) and
  // only fires when it's a real risk:
  //   * Cloud is configured (isCloud true — otherwise pointless)
  //   * User isn't signed in yet
  //   * They've done at least one piece of real activity so we're
  //     not nagging fresh-onboarded users about backing up an
  //     empty account
  //   * They haven't dismissed the banner in localStorage
  const hasRealActivity =
    state.sales.length > 0 ||
    state.tabs.length > 0 ||
    (state.stokvel?.contributions.length ?? 0) > 0;
  const isCloudMode = useStore().isCloud;
  const isAnonymousUser = useStore().isAnonymous;
  const [backupDismissed, setBackupDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return (
      window.localStorage.getItem("kasikash:backup-banner-dismissed") ===
      "1"
    );
  });
  const showBackupBanner =
    isCloudMode &&
    isAnonymousUser &&
    hasRealActivity &&
    !backupDismissed;
  const dismissBackupBanner = () => {
    window.localStorage.setItem(
      "kasikash:backup-banner-dismissed",
      "1",
    );
    setBackupDismissed(true);
  };

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
            <span
              className={
                score === null
                  ? "font-display text-2xl font-bold text-white/40"
                  : "font-display text-xl font-bold text-kasi-gold"
              }
            >
              {score === null ? "—" : score}
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

      {/* ----- Back up your account banner (PR #33) —
             appears ONLY for anonymous users who have real activity.
             Silent-data-loss protection. */}
      <AnimatePresence>
        {showBackupBanner && (
          <motion.div
            key="backup-banner"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-4 rounded-2xl border border-kasi-gold/30 bg-gradient-to-br from-kasi-gold/[0.08] to-transparent overflow-hidden"
          >
            <div className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-kasi-gold/15 border border-kasi-gold/30 flex items-center justify-center text-kasi-gold shrink-0">
                <ShieldCheck size={18} />
              </div>
              <button
                onClick={() => onNavigate("settings")}
                className="flex-1 min-w-0 text-left"
              >
                <div className="text-sm font-semibold text-white truncate">
                  {tr("backupBannerTitle", lang)}
                </div>
                <div className="text-xs text-white/60 truncate">
                  {tr("backupBannerSub", lang)}
                </div>
              </button>
              <button
                onClick={() => onNavigate("settings")}
                className="shrink-0 px-3 py-1.5 rounded-full bg-kasi-gold text-bg text-xs font-semibold"
              >
                {tr("backupBannerAction", lang)}
              </button>
              <button
                onClick={dismissBackupBanner}
                aria-label={tr("backupBannerDismiss", lang)}
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----- Install banner (PR #29) — dismissible, appears above the hero ----- */}
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            key="install-banner"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-4 rounded-2xl border border-kasi-green/25 bg-gradient-to-br from-kasi-green/[0.08] to-transparent overflow-hidden"
          >
            <div className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-kasi-green/15 border border-kasi-green/30 flex items-center justify-center text-kasi-green shrink-0">
                <Smartphone size={18} />
              </div>
              <button
                onClick={() => setInstallSheetOpen(true)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="text-sm font-semibold text-white truncate">
                  {tr("installBannerTitle", lang)}
                </div>
                <div className="text-xs text-white/60 truncate">
                  {tr("installBannerSub", lang)}
                </div>
              </button>
              <button
                onClick={() => setInstallSheetOpen(true)}
                className="shrink-0 px-3 py-1.5 rounded-full bg-kasi-green text-bg text-xs font-semibold"
              >
                {tr("installBannerAction", lang)}
              </button>
              <button
                onClick={dismissBanner}
                aria-label={tr("installBannerDismiss", lang)}
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* ----- Bank statement importer (PR #23) ----- */}
      {/* Same gold visual language as the receipt scanner card so the
          two "observed-evidence" power features feel like siblings.
          Feeds the observed side of the Financial Passport; parsing
          happens entirely on the device. */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate("import")}
        className="mt-3 w-full flex items-center gap-4 px-5 py-4 rounded-3xl bg-gradient-to-br from-kasi-gold/20 via-kasi-gold/5 to-transparent border border-kasi-gold/30"
      >
        <div className="w-12 h-12 rounded-2xl bg-kasi-gold/15 border border-kasi-gold/40 text-kasi-gold flex items-center justify-center shrink-0">
          <FileUp size={22} />
        </div>
        <div className="text-left flex-1 min-w-0">
          <div className="font-semibold">{tr("importStatementCard", lang)}</div>
          <div className="text-white/60 text-xs mt-0.5">
            {tr("importStatementCardDesc", lang)}
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
      {/* PR #29 — install sheet, mounted at the end so its fixed
          backdrop sits above every other Home surface. */}
      <AnimatePresence>
        {installSheetOpen && (
          <InstallSheet
            lang={lang}
            onClose={() => setInstallSheetOpen(false)}
          />
        )}
      </AnimatePresence>
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

import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, Smartphone, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Screen } from "../App";
import type { Lang } from "../i18n";
import { tr } from "../i18n";
import { useStore } from "../store";
import { InstallSheet } from "./InstallSheet";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

/**
 * AccountNudges (PR #37) — the two dismissible onboarding-hygiene
 * banners, extracted so they can render on BOTH the Services
 * launcher (the universal landing) and the business Home.
 *
 * Why the extraction matters now: PR #36 made the Services launcher
 * the landing screen and gated the business Home behind the business
 * service. The "back up your account" banner used to live only on
 * Home — which means a stokvel- or mashonisa-only user (who never
 * opens the business Home) would NEVER be prompted to secure their
 * data. That's the exact silent-data-loss risk the banner exists to
 * prevent. Putting it on the launcher fixes that for every user.
 *
 * Two banners, both dismissible, both persisting their dismissal in
 * localStorage under shared keys — so dismissing on the launcher
 * also dismisses on Home (no double-nagging across screens):
 *
 *   1. Back up your account — only for anonymous cloud users who
 *      have real activity (a sale / tab / stokvel contribution /
 *      loan). Routes to Settings → Account to link an email/phone.
 *
 *   2. Add to home screen — install-capable mobile platforms that
 *      haven't installed yet. Opens the InstallSheet.
 */
export function AccountNudges({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { state, isCloud, isAnonymous } = useStore();
  const { platform, isInstalled } = useInstallPrompt();

  // --- Backup banner ---
  // "Real activity" spans every service so a mashonisa-only or
  // stokvel-only user is prompted just like a business user is.
  const hasRealActivity =
    state.sales.length > 0 ||
    state.tabs.length > 0 ||
    state.loans.length > 0 ||
    (state.stokvel?.contributions.length ?? 0) > 0;

  const [backupDismissed, setBackupDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return (
      window.localStorage.getItem("kasikash:backup-banner-dismissed") === "1"
    );
  });
  const showBackupBanner =
    isCloud && isAnonymous && hasRealActivity && !backupDismissed;
  const dismissBackup = () => {
    window.localStorage.setItem("kasikash:backup-banner-dismissed", "1");
    setBackupDismissed(true);
  };

  // --- Install banner ---
  const [installDismissed, setInstallDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return (
      window.localStorage.getItem("kasikash:install-banner-dismissed") === "1"
    );
  });
  const [installSheetOpen, setInstallSheetOpen] = useState(false);
  const showInstallBanner =
    !isInstalled &&
    !installDismissed &&
    (platform === "android-chrome" ||
      platform === "ios-safari" ||
      platform === "other-mobile");
  const dismissInstall = () => {
    window.localStorage.setItem("kasikash:install-banner-dismissed", "1");
    setInstallDismissed(true);
  };

  // Close the install sheet automatically once the app is installed.
  useEffect(() => {
    if (isInstalled) setInstallSheetOpen(false);
  }, [isInstalled]);

  return (
    <>
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
                onClick={dismissBackup}
                aria-label={tr("backupBannerDismiss", lang)}
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
                onClick={dismissInstall}
                aria-label={tr("installBannerDismiss", lang)}
                className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white/50 hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {installSheetOpen && (
          <InstallSheet
            lang={lang}
            onClose={() => setInstallSheetOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

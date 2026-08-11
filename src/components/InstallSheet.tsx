import { motion } from "framer-motion";
import {
  ArrowDown,
  Check,
  Home as HomeIcon,
  Share as ShareIcon,
  Smartphone,
  X,
} from "lucide-react";
import { useState } from "react";
import { useInstallPrompt } from "../hooks/useInstallPrompt";
import type { Lang } from "../i18n";
import { tr } from "../i18n";

/**
 * "Add to Home Screen" bottom sheet (PR #29).
 *
 * Shown when the user taps the "Install KasiKash" affordance in
 * Home or Settings. The content adapts to what the current
 * browser actually allows:
 *
 *   android-chrome  → shows the real prompt button which fires the
 *                     browser's native install dialog (via
 *                     useInstallPrompt().promptNative())
 *   ios-safari      → shows a labeled step-through: tap Share →
 *                     Add to Home Screen, with visual arrows
 *   desktop or
 *   other-mobile    → shows a friendly "not supported in your
 *                     browser" note with a hint to open in
 *                     Chrome / Safari on mobile instead
 *
 * The sheet mounts + dismisses via SheetShell-style backdrop +
 * bottom-sheet motion. Kept as its own component (rather than
 * inlined inside Home/Settings) because both screens trigger it
 * and it's rich enough to warrant its own file.
 */
export function InstallSheet({
  lang,
  onClose,
}: {
  lang: Lang;
  onClose: () => void;
}) {
  const { platform, canPromptNative, promptNative } = useInstallPrompt();
  const [prompted, setPrompted] = useState<
    "accepted" | "dismissed" | null
  >(null);

  const handleNativeInstall = async () => {
    const outcome = await promptNative();
    if (outcome === "accepted" || outcome === "dismissed") {
      setPrompted(outcome);
      if (outcome === "accepted") {
        // Give the user a beat to see the "Installed!" state,
        // then close the sheet.
        window.setTimeout(onClose, 1400);
      }
    }
  };

  return (
    <motion.div
      key="install-sheet"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full md:max-w-sm bg-bg-soft border-t md:border border-white/10 md:rounded-3xl rounded-t-3xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-kasi-green/15 border border-kasi-green/30 flex items-center justify-center text-kasi-green">
              <Smartphone size={16} />
            </div>
            <div className="font-display font-bold text-lg">
              {tr("installTitle", lang)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:bg-white/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <p className="text-white/70 text-sm leading-relaxed mb-5">
          {tr("installSub", lang)}
        </p>

        {/* Body renders per-platform. */}
        {platform === "android-chrome" && (
          <AndroidBody
            canPromptNative={canPromptNative}
            onInstall={handleNativeInstall}
            prompted={prompted}
            lang={lang}
          />
        )}

        {platform === "ios-safari" && <IOSBody lang={lang} />}

        {(platform === "other-mobile" || platform === "desktop") && (
          <UnsupportedBody platform={platform} lang={lang} />
        )}

        <div className="mt-6 rounded-2xl bg-white/[0.02] border border-white/10 p-3 text-white/50 text-xs leading-relaxed">
          {tr("installFooterNote", lang)}
        </div>
      </motion.div>
    </motion.div>
  );
}

function AndroidBody({
  canPromptNative,
  onInstall,
  prompted,
  lang,
}: {
  canPromptNative: boolean;
  onInstall: () => void;
  prompted: "accepted" | "dismissed" | null;
  lang: Lang;
}) {
  if (prompted === "accepted") {
    return (
      <div className="rounded-2xl bg-kasi-green/[0.08] border border-kasi-green/25 text-kasi-green text-sm px-4 py-4 flex items-center gap-2">
        <Check size={18} />
        {tr("installAndroidDone", lang)}
      </div>
    );
  }
  if (canPromptNative) {
    return (
      <button
        onClick={onInstall}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-kasi-green text-bg font-semibold shadow-glow"
      >
        <HomeIcon size={16} />
        {tr("installAndroidCta", lang)}
      </button>
    );
  }
  // Chrome hasn't fired beforeinstallprompt yet — usually because
  // the site was already visited long enough that the browser
  // decided not to re-offer, OR the PWA install criteria haven't
  // been met on this device. Fall through to manual instructions.
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 text-white/70 text-sm leading-relaxed">
      <div className="font-semibold text-white mb-2">
        {tr("installAndroidManualTitle", lang)}
      </div>
      <ol className="list-decimal list-inside space-y-1.5">
        <li>{tr("installAndroidManualStep1", lang)}</li>
        <li>{tr("installAndroidManualStep2", lang)}</li>
        <li>{tr("installAndroidManualStep3", lang)}</li>
      </ol>
    </div>
  );
}

/**
 * iOS Safari has NO programmatic install API. This body walks the
 * user through Safari's Share menu step by step with visual
 * anchors — the Share icon on the toolbar, then the "Add to Home
 * Screen" row, then the confirm.
 */
function IOSBody({ lang }: { lang: Lang }) {
  return (
    <div className="flex flex-col gap-3">
      <IOSStep
        n={1}
        icon={<ShareIcon size={16} className="text-white" />}
        title={tr("installIOSStep1Title", lang)}
        body={tr("installIOSStep1Body", lang)}
      />
      <div className="flex items-center justify-center py-1">
        <ArrowDown size={16} className="text-white/30" />
      </div>
      <IOSStep
        n={2}
        icon={<HomeIcon size={16} className="text-white" />}
        title={tr("installIOSStep2Title", lang)}
        body={tr("installIOSStep2Body", lang)}
      />
      <div className="flex items-center justify-center py-1">
        <ArrowDown size={16} className="text-white/30" />
      </div>
      <IOSStep
        n={3}
        icon={<Check size={16} className="text-kasi-green" />}
        title={tr("installIOSStep3Title", lang)}
        body={tr("installIOSStep3Body", lang)}
      />
    </div>
  );
}

function IOSStep({
  n,
  icon,
  title,
  body,
}: {
  n: number;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-kasi-green text-bg font-bold text-sm flex items-center justify-center shrink-0">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-white font-semibold text-sm">
          {icon}
          {title}
        </div>
        <div className="text-white/60 text-xs mt-1 leading-relaxed">
          {body}
        </div>
      </div>
    </div>
  );
}

function UnsupportedBody({
  platform,
  lang,
}: {
  platform: "other-mobile" | "desktop";
  lang: Lang;
}) {
  const msgKey =
    platform === "desktop"
      ? "installDesktopHint"
      : "installOtherMobileHint";
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-4 text-white/70 text-sm leading-relaxed">
      {tr(msgKey, lang)}
    </div>
  );
}

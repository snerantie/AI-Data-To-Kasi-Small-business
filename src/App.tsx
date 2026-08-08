import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { Home } from "./screens/Home";
import { LogSale } from "./screens/LogSale";
import { Tabs } from "./screens/Tabs";
import { Insights } from "./screens/Insights";
import { Onboarding } from "./screens/Onboarding";
import { Stokvel } from "./screens/Stokvel";
import { Splash } from "./screens/Splash";
import { Settings } from "./screens/Settings";
import { PassportPreview } from "./screens/PassportPreview";
import { ScanReceipt } from "./screens/ScanReceipt";
import { ImportStatement } from "./screens/ImportStatement";
import { NotifyProvider } from "./components/NotifyProvider";
import {
  PaymentReturn,
  clearPaymentReturnUrl,
  parsePaymentReturn,
} from "./screens/PaymentReturn";
import {
  clearInviteUrl,
  parseInviteFromUrl,
} from "./lib/inviteLink";
import { needsOnboarding, useStore } from "./store";
import type { Lang } from "./i18n";

type PaymentReturnState = {
  kind: "success" | "cancel" | "failed";
  paymentId: string;
} | null;

export type Screen =
  | "home"
  | "log"
  | "tabs"
  | "stokvel"
  | "insights"
  | "settings"
  | "passport"
  | "scan"
  // New in PR #23: upload + parse bank statements.
  | "import";

const SCREENS_WITH_NAV: Screen[] = [
  "home",
  "log",
  "tabs",
  "stokvel",
  "insights",
];

export default function App() {
  const { state } = useStore();
  const [screen, setScreen] = useState<Screen>("home");
  const [splashDone, setSplashDone] = useState(false);
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturnState>(null);
  // PR #25: invite-link handling.
  //
  // When a new member taps a WhatsApp invite link like
  // `.../?invite=KX7QAP` we parse the code out on first render,
  // route them to the Stokvel screen, and hand the code down as a
  // prop so the Join sheet opens pre-filled. That turns "member
  // must copy the code, open the app, find the join screen, paste
  // the code, tap join" into "tap link → tap join". Two taps.
  //
  // The parameter stays in `pendingInviteCode` until either:
  //   * The Stokvel screen has consumed it (auto-opened the Join
  //     sheet + posted the request), OR
  //   * The user manually cleared it (tapped away without joining).
  //
  // We DON'T clear the URL until the join is either successful or
  // the user dismisses the prompt — otherwise a hydration hiccup
  // or a refresh mid-onboarding would silently drop the invite.
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(
    null,
  );

  const lang: Lang = state.lang ?? "en";
  const showNav = SCREENS_WITH_NAV.includes(screen);
  const mustOnboard = needsOnboarding(state);

  // On first render, check the URL for a payment_return param. If the
  // user just came back from Yoco we'll show the confirmation overlay.
  useEffect(() => {
    const detected = parsePaymentReturn();
    if (detected) {
      setPaymentReturn(detected);
      // If the user is mid-onboarding and returned from a payment,
      // route them to the Stokvel tab afterward so they see it working.
      setScreen("stokvel");
    }

    // Same first-render pass picks up any `?invite=CODE` in the URL
    // so a WhatsApp-shared link auto-populates the Join Stokvel
    // sheet without the user having to retype anything. Deliberately
    // does NOT clearInviteUrl() here — see comment on
    // pendingInviteCode above.
    const invite = parseInviteFromUrl();
    if (invite) {
      setPendingInviteCode(invite);
      setScreen("stokvel");
    }
  }, []);

  const dismissPaymentReturn = () => {
    clearPaymentReturnUrl();
    setPaymentReturn(null);
  };

  // Called by the Stokvel screen once the pending invite has been
  // either accepted or dismissed. Clearing state + URL together
  // means a refresh doesn't re-trigger the prompt.
  const clearPendingInvite = () => {
    setPendingInviteCode(null);
    clearInviteUrl();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-6">
      {/* Global toast layer — rendered outside the phone-frame so
          notifications sit above every screen and every sheet, no
          matter which one is currently active. */}
      <NotifyProvider />
      <div className="phone-frame relative">
        <AnimatePresence mode="wait">
          {!splashDone ? (
            <Splash key="splash" onDone={() => setSplashDone(true)} />
          ) : mustOnboard ? (
            <motion.div
              key="onboarding"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <Onboarding />
            </motion.div>
          ) : (
            <motion.div
              key="app"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={screen}
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22 }}
                >
                  {screen === "home" && (
                    <Home lang={lang} onNavigate={setScreen} />
                  )}
                  {screen === "log" && (
                    <LogSale lang={lang} onNavigate={setScreen} />
                  )}
                  {screen === "tabs" && <Tabs lang={lang} />}
                  {screen === "stokvel" && (
                    <Stokvel
                      lang={lang}
                      onNavigate={setScreen}
                      pendingInviteCode={pendingInviteCode}
                      onInviteConsumed={clearPendingInvite}
                    />
                  )}
                  {screen === "insights" && (
                    <Insights lang={lang} onNavigate={setScreen} />
                  )}
                  {screen === "settings" && (
                    <Settings lang={lang} onNavigate={setScreen} />
                  )}
                  {screen === "passport" && (
                    <PassportPreview lang={lang} onNavigate={setScreen} />
                  )}
                  {screen === "scan" && (
                    <ScanReceipt lang={lang} onNavigate={setScreen} />
                  )}
                  {screen === "import" && (
                    <ImportStatement lang={lang} onNavigate={setScreen} />
                  )}
                </motion.div>
              </AnimatePresence>
              {showNav && (
                <BottomNav screen={screen} onNavigate={setScreen} lang={lang} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Yoco payment-return overlay */}
        <AnimatePresence>
          {paymentReturn && splashDone && (
            <PaymentReturn
              key={paymentReturn.paymentId}
              lang={lang}
              kind={paymentReturn.kind}
              paymentId={paymentReturn.paymentId}
              onDismiss={dismissPaymentReturn}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

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
import {
  PaymentReturn,
  clearPaymentReturnUrl,
  parsePaymentReturn,
} from "./screens/PaymentReturn";
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
  | "passport";

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
  }, []);

  const dismissPaymentReturn = () => {
    clearPaymentReturnUrl();
    setPaymentReturn(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-6">
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
                    <Stokvel lang={lang} onNavigate={setScreen} />
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

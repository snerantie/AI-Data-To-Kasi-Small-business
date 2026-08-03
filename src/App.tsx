import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { Home } from "./screens/Home";
import { LogSale } from "./screens/LogSale";
import { Tabs } from "./screens/Tabs";
import { Insights } from "./screens/Insights";
import { Welcome } from "./screens/Welcome";
import { Stokvel } from "./screens/Stokvel";
import { WhatsAppBot } from "./screens/WhatsAppBot";
import { useStore } from "./store";
import type { Lang } from "./i18n";

export type Screen =
  | "home"
  | "log"
  | "tabs"
  | "stokvel"
  | "insights"
  | "whatsapp";

const SCREENS_WITH_NAV: Screen[] = ["home", "log", "tabs", "stokvel", "insights"];

export default function App() {
  const { state, setLang } = useStore();
  const [screen, setScreen] = useState<Screen>("home");

  const lang: Lang = state.lang ?? "en";
  const showNav = SCREENS_WITH_NAV.includes(screen);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 md:p-6">
      <div className="phone-frame relative">
        <AnimatePresence mode="wait">
          {!state.onboarded ? (
            <motion.div
              key="welcome"
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <Welcome onPick={(l) => setLang(l)} />
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
                  {screen === "stokvel" && <Stokvel lang={lang} />}
                  {screen === "insights" && <Insights lang={lang} />}
                  {screen === "whatsapp" && (
                    <WhatsAppBot lang={lang} onNavigate={setScreen} />
                  )}
                </motion.div>
              </AnimatePresence>
              {showNav && (
                <BottomNav screen={screen} onNavigate={setScreen} lang={lang} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

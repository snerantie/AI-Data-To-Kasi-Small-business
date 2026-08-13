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
import { Landing } from "./screens/Landing";
import { Services } from "./screens/Services";
import { Mashonisa } from "./screens/Mashonisa";
import { PressHowItWorks } from "./screens/PressHowItWorks";
import { PressKasiScore } from "./screens/PressKasiScore";
import { PressSummary } from "./screens/PressSummary";
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
  | "import"
  // New in PR #35: Services hub + Mashonisa service.
  | "services"
  | "mashonisa";

// PR #35 — the Services hub replaces the dedicated Stokvel tab in the
// bottom nav. Stokvel + Mashonisa are reached by entering their cards
// in the Services hub, but they KEEP the bottom nav visible (with the
// Services item highlighted) so the user always has a way back —
// otherwise entering a service would trap them on a nav-less screen.
const SCREENS_WITH_NAV: Screen[] = [
  "home",
  "log",
  "tabs",
  "services",
  "insights",
  "stokvel",
  "mashonisa",
];

/**
 * PR #28 — path-based split between the marketing website and the app.
 *
 *   /              → marketing landing (src/screens/Landing.tsx)
 *   /app  and  /app/…  → the KasiKash app itself
 *
 * Both live on the same domain (kasikash.com) — no subdomains — but
 * they render completely different trees. The Landing is a full-
 * width scrollable website with no phone frame; the app keeps its
 * existing phone-frame wrapper so it still looks and feels like a
 * mobile-first product on desktop.
 *
 * Backward compatibility for invite URLs shared BEFORE this split:
 *   Old links look like `https://kasikash.com/?invite=CODE` (root
 *   path). Those still work — when the Landing detects an
 *   `?invite=` or `?payment_return=` param at the root, it
 *   transparently navigates to `/app/…?invite=CODE` (client-side
 *   history replaceState — no full page reload). The app then
 *   consumes the invite exactly as it always has. This means every
 *   already-shared WhatsApp invite in the pilot cohort continues to
 *   open the join flow correctly.
 *
 * Why plain `pathname` routing rather than a router library:
 *   The app has exactly two "modes" — website vs app — and no other
 *   deep-linking needs (screen state inside the app is held in
 *   React state, not URLs). Pulling in react-router for a
 *   two-branch decision adds bundle weight for no benefit. When we
 *   grow to deep-linking individual app screens we can revisit.
 */
function getPathname(): string {
  if (typeof window === "undefined") return "/";
  return window.location.pathname || "/";
}

/**
 * Returns true when the current path should render the app tree.
 * `/app`, `/app/`, `/app/anything` all count as app routes; a lone
 * `/` or any other unrecognised path renders the Landing.
 */
function isAppPath(pathname: string): boolean {
  return pathname === "/app" || pathname.startsWith("/app/");
}

/**
 * Returns true when the current path should render a press /
 * marketing asset (a shareable infographic-style page). Currently:
 *   /press/how-it-works — the LinkedIn "how to get started" poster
 * Kept separate from isAppPath because press pages render full-
 * width and dark-themed (like Landing) but WITHOUT the marketing
 * nav / hero / contact form — they're single-purpose visuals
 * meant to be screenshotted.
 */
function isPressPath(pathname: string): boolean {
  return (
    pathname === "/press/how-it-works" ||
    pathname === "/press/how-it-works/" ||
    pathname === "/press/kasiscore" ||
    pathname === "/press/kasiscore/" ||
    // PR #34 — single square poster for LinkedIn feed. Meant to
    // replace the tall posters as the primary "attach to a
    // LinkedIn post" asset.
    pathname === "/press/summary" ||
    pathname === "/press/summary/"
  );
}

/**
 * Returns which press asset to render at the current pathname.
 * Keeps the routing decision alongside the pathname check so a new
 * press asset only needs one place to plug in.
 */
function pressComponentFor(pathname: string): React.ReactNode {
  if (
    pathname === "/press/kasiscore" ||
    pathname === "/press/kasiscore/"
  ) {
    return <PressKasiScore />;
  }
  if (
    pathname === "/press/summary" ||
    pathname === "/press/summary/"
  ) {
    return <PressSummary />;
  }
  return <PressHowItWorks />;
}

export default function App() {
  const { state } = useStore();
  const [pathname, setPathname] = useState<string>(getPathname);
  const [screen, setScreen] = useState<Screen>("home");
  const [splashDone, setSplashDone] = useState(false);
  const [paymentReturn, setPaymentReturn] = useState<PaymentReturnState>(null);
  // PR #25: invite-link handling.
  //
  // When a new member taps a WhatsApp invite link like
  // `.../app/?invite=K-M9P2-XR7A` we parse the code out on first
  // render, route them to the Stokvel screen, and hand the code
  // down as a prop so the Join sheet opens pre-filled. Two taps
  // instead of six.
  //
  // We DON'T clear the URL until the join is either successful or
  // the user dismisses the prompt — otherwise a refresh
  // mid-onboarding would silently drop the invite.
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(
    null,
  );

  const lang: Lang = state.lang ?? "en";
  const onAppRoute = isAppPath(pathname);
  const onPressRoute = isPressPath(pathname);
  const showNav = SCREENS_WITH_NAV.includes(screen);
  const mustOnboard = needsOnboarding(state);

  // ─────────────────────────────────────────────────────────────────
  // Path-change plumbing.
  //
  // We listen for popstate so the browser back/forward buttons keep
  // pathname state in sync with the address bar. Not strictly
  // required for the pilot (nobody's going to hit back from the app
  // into the landing), but it's a two-line safety net and prevents
  // ghost states if someone does.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onPopState = () => setPathname(getPathname());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // Backward compat: rescue root-path invite URLs.
  //
  // Historical `https://kasikash.com/?invite=CODE` links are already
  // in WhatsApp conversations. We transparently move them under
  // `/app/` so the existing app-side consumer picks them up. Only
  // fires when we're literally at `/` — we don't want to redirect
  // someone who's on `/legal` or a future website subpage.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (onAppRoute) return;
    if (pathname !== "/" && pathname !== "") return;

    const search = new URLSearchParams(window.location.search);
    const shouldRedirect =
      search.has("invite") ||
      search.has("payment_return") ||
      search.has("payment_id");

    if (shouldRedirect) {
      const url = new URL(window.location.href);
      const newUrl =
        "/app/" +
        (url.search ? url.search : "") +
        (url.hash ? url.hash : "");
      // replaceState — no history entry for `/` so back button won't
      // trap the user in a redirect loop.
      window.history.replaceState({}, "", newUrl);
      setPathname("/app/");
    }
  }, [pathname, onAppRoute]);

  // ─────────────────────────────────────────────────────────────────
  // App-side URL consumption (payment_return + invite).
  //
  // Runs only when we're on an app route AND the splash has
  // completed. On the landing route this whole block is skipped, so
  // the marketing page never accidentally opens a Yoco return sheet
  // or a Stokvel join sheet.
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!onAppRoute) return;

    const detected = parsePaymentReturn();
    if (detected) {
      setPaymentReturn(detected);
      setScreen("stokvel");
    }

    const invite = parseInviteFromUrl();
    if (invite) {
      setPendingInviteCode(invite);
      setScreen("stokvel");
    }
  }, [onAppRoute]);

  const navigateToApp = () => {
    // Preserve any query params + hash from the landing URL — e.g.
    // a partner sharing `kasikash.com/?welcome=1&utm_source=xyz`
    // still gets attribution once they cross into the app.
    const url = new URL(window.location.href);
    const search = url.search;
    const hash = url.hash;
    window.history.pushState({}, "", "/app/" + search + hash);
    setPathname("/app/");
  };

  const dismissPaymentReturn = () => {
    clearPaymentReturnUrl();
    setPaymentReturn(null);
  };

  const clearPendingInvite = () => {
    setPendingInviteCode(null);
    clearInviteUrl();
  };

  // ─────────────────────────────────────────────────────────────────
  // Press route: single-purpose shareable infographic page.
  //
  // Rendered before the marketing Landing check because /press/… is
  // a specific sub-tree we want to keep visually distinct — no
  // marketing nav, no contact form, just the poster ready to
  // screenshot.
  // ─────────────────────────────────────────────────────────────────
  if (onPressRoute) {
    return <>{pressComponentFor(pathname)}</>;
  }

  // ─────────────────────────────────────────────────────────────────
  // Website route: render the full-width marketing landing.
  //
  // Deliberately outside the phone-frame wrapper — the Landing is a
  // real website, not a phone screen. It has its own layout, own
  // nav, own footer, and reads at desktop widths just fine.
  // ─────────────────────────────────────────────────────────────────
  if (!onAppRoute) {
    return <Landing onOpenApp={navigateToApp} />;
  }

  // ─────────────────────────────────────────────────────────────────
  // App route: existing app tree, unchanged apart from being nested
  // under this conditional.
  // ─────────────────────────────────────────────────────────────────
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
                  {screen === "services" && (
                    <Services lang={lang} onNavigate={setScreen} />
                  )}
                  {screen === "mashonisa" && (
                    <Mashonisa lang={lang} onNavigate={setScreen} />
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

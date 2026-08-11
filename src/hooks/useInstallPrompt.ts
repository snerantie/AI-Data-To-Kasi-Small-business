import { useEffect, useState } from "react";

/**
 * PWA install-prompt handling (PR #29).
 *
 * Detects the current environment and returns a small state
 * machine callers can use to render a platform-appropriate
 * "Add to Home Screen" experience.
 *
 * ───────────────────────────────────────────────────────────────
 * Why this hook exists
 * ───────────────────────────────────────────────────────────────
 * Pilot users open the WhatsApp invite link, land in Safari or
 * Chrome, and then have no idea they can save the app to their
 * home screen. On Android there IS a browser API for a real
 * install prompt; on iOS Safari there ISN'T — the user must
 * discover the Share menu → Add to Home Screen manually.
 *
 * The pilot has been quietly failing on this: many users bounce
 * back to WhatsApp to re-open the link every session because they
 * think that's the only way in. The web app is a PWA already;
 * this hook + a UX layer on top of it fixes the discoverability
 * gap.
 *
 * ───────────────────────────────────────────────────────────────
 * Return shape
 * ───────────────────────────────────────────────────────────────
 *   platform         — which install path applies right now
 *   canPromptNative  — true iff Android Chrome fired
 *                       beforeinstallprompt and we captured it
 *   promptNative     — call to fire the native prompt (Android)
 *   isInstalled      — best-effort detection of "user already
 *                       launched via home-screen icon"
 *
 * Callers show:
 *   * a real "Install" button when `canPromptNative` is true
 *   * iOS-Safari instructions when `platform === "ios-safari"`
 *   * nothing at all when `isInstalled` (already done)
 *   * a generic "your browser doesn't support install" note
 *     otherwise (desktop Chrome, Firefox, etc.)
 */

export type InstallPlatform =
  | "ios-safari" // no beforeinstallprompt; must use Share → Add to HS
  | "android-chrome" // supports beforeinstallprompt
  | "other-mobile" // Firefox mobile, Samsung Internet, etc. — best-effort
  | "desktop" // laptop/desktop browser — install possible but rare
  | "unknown";

// The `BeforeInstallPromptEvent` type is not in the standard DOM
// lib. We narrow it inline so we don't pull in a d.ts.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function detectPlatform(): InstallPlatform {
  if (typeof window === "undefined") return "unknown";
  const ua = window.navigator.userAgent;

  // iPad on iOS 13+ reports as Macintosh in the UA string; the
  // reliable test is `maxTouchPoints > 1` in that case.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  if (isIOS && isSafari) return "ios-safari";
  if (isIOS) return "other-mobile"; // iOS non-Safari (Chrome iOS, etc.)

  const isAndroid = /Android/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edg/.test(ua);
  if (isAndroid && isChrome) return "android-chrome";
  if (isAndroid) return "other-mobile";

  // Anything not iOS or Android = laptop/desktop.
  return "desktop";
}

/**
 * Best-effort "am I already installed?" detection.
 *
 * When the PWA is launched from the home-screen icon the browser
 * runs it in standalone display mode. Two matching signals:
 *   * `window.matchMedia('(display-mode: standalone)')` — modern
 *   * `navigator.standalone === true` — iOS Safari legacy
 * Either is sufficient. Both false → we're in a browser tab.
 */
function detectInstalled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if (
      "standalone" in window.navigator &&
      (window.navigator as { standalone?: boolean }).standalone === true
    ) {
      return true;
    }
  } catch {
    // Old browsers without matchMedia — fall through to false.
  }
  return false;
}

export function useInstallPrompt() {
  const [platform] = useState<InstallPlatform>(() => detectPlatform());
  const [isInstalled, setIsInstalled] = useState<boolean>(() =>
    detectInstalled(),
  );
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Capture the browser's install prompt so the UI can fire it
    // on a user-driven tap later. Chrome fires this once per page
    // load when the site meets PWA installability criteria — icon,
    // manifest, HTTPS, service worker (or an equivalent).
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    // If the user installs via any path (native prompt, three-dot
    // menu, share menu on iOS) the browser fires `appinstalled`.
    // We flip the isInstalled flag so the UI hides the prompt.
    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  const canPromptNative = deferredPrompt !== null && !isInstalled;

  /**
   * Fire the browser's native install prompt. Only valid to call
   * when `canPromptNative` is true (guarded by the button UX).
   * Returns the user's decision so callers can log or react.
   */
  const promptNative = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      // Chrome docs say the event can only be used once — clear it.
      setDeferredPrompt(null);
      if (outcome === "accepted") setIsInstalled(true);
      return outcome;
    } catch {
      return "unavailable";
    }
  };

  return {
    platform,
    canPromptNative,
    promptNative,
    isInstalled,
  } as const;
}

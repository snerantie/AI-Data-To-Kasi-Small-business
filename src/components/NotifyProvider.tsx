import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, Info, X } from "lucide-react";

import {
  subscribeToNotifications,
  type Notification,
  type NotifyTone,
} from "../lib/notify";

/**
 * Renders in-app toast notifications emitted through the `notify` bus.
 * Mounted once at the app root so a single stack of toasts is
 * visible across every screen.
 *
 * Behaviour:
 *   * New notifications slide in from the top-right.
 *   * Each toast auto-dismisses after its ttl (default 5000ms).
 *   * Tapping the X button dismisses immediately.
 *   * Maximum 4 stacked at once; older ones get pushed out when the
 *     fifth arrives.
 */
export function NotifyProvider() {
  const [items, setItems] = useState<Notification[]>([]);

  useEffect(() => {
    return subscribeToNotifications((n) => {
      setItems((prev) => {
        // Dedupe: if we already have a notification with this id
        // (rare, mostly a safety net) drop the older one.
        const next = prev.filter((p) => p.id !== n.id);
        next.push(n);
        // Cap at 4 concurrent — a queue of unread pings is stress-
        // inducing on a small screen.
        return next.slice(-4);
      });
      const ttl = n.ttlMs ?? 5000;
      window.setTimeout(() => {
        setItems((prev) => prev.filter((p) => p.id !== n.id));
      }, ttl);
    });
  }, []);

  const dismiss = (id: string) =>
    setItems((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="pointer-events-none fixed top-3 left-0 right-0 z-50 flex flex-col items-center gap-2 px-3">
      <AnimatePresence initial={false}>
        {items.map((n) => (
          <ToastCard key={n.id} n={n} onClose={() => dismiss(n.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast card — the single visible unit. Split out so we can tweak the
// look-and-feel per tone in one place.
// ---------------------------------------------------------------------------

const TONE_CLASSES: Record<NotifyTone, string> = {
  info: "bg-bg-card border-white/10 text-white",
  success: "bg-kasi-green/15 border-kasi-green/40 text-kasi-green",
  warning: "bg-kasi-gold/15 border-kasi-gold/40 text-kasi-gold",
  error: "bg-kasi-coral/15 border-kasi-coral/40 text-kasi-coral",
};

const TONE_ICONS: Record<NotifyTone, typeof Info> = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: AlertTriangle,
};

function ToastCard({ n, onClose }: { n: Notification; onClose: () => void }) {
  const Icon = TONE_ICONS[n.tone];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className={
        "pointer-events-auto max-w-[420px] w-full rounded-2xl border backdrop-blur-md px-4 py-3 flex items-start gap-3 shadow-lg " +
        TONE_CLASSES[n.tone]
      }
    >
      <Icon size={18} className="shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-sm truncate">{n.title}</div>
        {n.body && (
          <div className="text-white/70 text-xs mt-0.5 leading-snug">
            {n.body}
          </div>
        )}
      </div>
      <button
        onClick={onClose}
        className="text-white/40 hover:text-white/80 -mt-0.5 -mr-1 p-1 shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

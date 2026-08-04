import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { tr } from "../i18n";
import {
  fetchPayment,
  subscribeToPayment,
} from "../lib/payments";
import type { PaymentRow } from "../lib/payments";
import { useStore } from "../store";

type ReturnKind = "success" | "cancel" | "failed";

type Props = {
  lang: Lang;
  kind: ReturnKind;
  paymentId: string;
  onDismiss: () => void;
};

/**
 * Overlay shown when the user returns from a Yoco checkout with a
 * `?payment_return=...&pid=...` URL param. It waits for the payment
 * status to settle (via Realtime), then shows a success / failure /
 * cancel confirmation and dismisses.
 *
 * The store's shared Realtime sub already re-hydrates when payments
 * change, so the underlying app state (contributions, stokvel total)
 * updates in the background while this overlay is on screen.
 */
export function PaymentReturn({ lang, kind, paymentId, onDismiss }: Props) {
  const { refreshFromRemote } = useStore();
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [resolved, setResolved] = useState(false);

  // On mount: fetch payment once + subscribe for updates
  useEffect(() => {
    let mounted = true;

    fetchPayment(paymentId).then((p) => {
      if (!mounted) return;
      setPayment(p);
      if (p && p.status !== "pending") {
        setResolved(true);
        if (p.status === "succeeded") refreshFromRemote();
      }
    });

    const unsub = subscribeToPayment(paymentId, (p) => {
      if (!mounted) return;
      setPayment(p);
      if (p.status !== "pending") {
        setResolved(true);
        if (p.status === "succeeded") refreshFromRemote();
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId]);

  // Auto-dismiss on success after 3s. Failure/cancel stays open until
  // the user taps Close, so they read the reason.
  useEffect(() => {
    if (!resolved || !payment) return;
    if (payment.status !== "succeeded") return;
    const t = window.setTimeout(onDismiss, 3200);
    return () => window.clearTimeout(t);
  }, [resolved, payment, onDismiss]);

  // Determine which state to show.
  //   - If Yoco redirected with cancel/failed we can trust that and skip
  //     the loading state.
  //   - Otherwise we wait for the DB row's status to catch up.
  const displayStatus: "processing" | "succeeded" | "failed" | "cancelled" =
    kind === "cancel"
      ? "cancelled"
      : kind === "failed"
        ? "failed"
        : !resolved || (payment?.status ?? "pending") === "pending"
          ? "processing"
          : (payment!.status as "succeeded" | "failed" | "cancelled");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-bg/95 backdrop-blur-md flex items-center justify-center px-6"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={displayStatus}
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 22 }}
          className="w-full max-w-sm text-center"
        >
          {displayStatus === "processing" && (
            <>
              <div className="w-20 h-20 rounded-full bg-kasi-green/15 border border-kasi-green/30 flex items-center justify-center mx-auto mb-5">
                <Loader2 size={36} className="animate-spin text-kasi-green" />
              </div>
              <div className="font-display text-xl font-bold">
                {tr("payReturnProcessing", lang)}
              </div>
              <div className="text-white/60 text-sm mt-2">
                {tr("authPendingExpires", lang)}
              </div>
            </>
          )}

          {displayStatus === "succeeded" && (
            <>
              <motion.div
                initial={{ scale: 0.7 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="w-24 h-24 rounded-full bg-kasi-green/15 border border-kasi-green/40 flex items-center justify-center mx-auto mb-5 shadow-glow"
              >
                <CheckCircle2 size={44} className="text-kasi-green" />
              </motion.div>
              <div className="font-display text-2xl font-bold text-kasi-green">
                {tr("payReturnSuccess", lang)}
              </div>
              {payment && (
                <div className="text-white/70 text-lg mt-2">
                  R{Math.round(payment.amount).toLocaleString("en-ZA")}
                  {payment.isTest && (
                    <span className="ml-2 text-[10px] uppercase tracking-wider text-kasi-gold border border-kasi-gold/30 px-1.5 py-0.5 rounded">
                      Test
                    </span>
                  )}
                </div>
              )}
            </>
          )}

          {displayStatus === "cancelled" && (
            <>
              <div className="w-20 h-20 rounded-full bg-kasi-gold/15 border border-kasi-gold/30 flex items-center justify-center mx-auto mb-5">
                <AlertCircle size={36} className="text-kasi-gold" />
              </div>
              <div className="font-display text-xl font-bold text-kasi-gold">
                {tr("payReturnCancel", lang)}
              </div>
              <button
                onClick={onDismiss}
                className="mt-6 px-6 py-3 rounded-2xl bg-kasi-gold text-bg font-semibold"
              >
                {tr("payReturnClose", lang)}
              </button>
            </>
          )}

          {displayStatus === "failed" && (
            <>
              <div className="w-20 h-20 rounded-full bg-kasi-coral/15 border border-kasi-coral/30 flex items-center justify-center mx-auto mb-5">
                <XCircle size={36} className="text-kasi-coral" />
              </div>
              <div className="font-display text-xl font-bold text-kasi-coral">
                {tr("payReturnFailed", lang)}
              </div>
              {payment?.errorMessage && (
                <div className="text-white/50 text-xs mt-2 max-w-[280px] mx-auto break-words">
                  {payment.errorMessage}
                </div>
              )}
              <button
                onClick={onDismiss}
                className="mt-6 px-6 py-3 rounded-2xl bg-kasi-coral text-bg font-semibold"
              >
                {tr("payReturnClose", lang)}
              </button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

/**
 * Parse `?payment_return=...&pid=...` from the current URL.
 * Returns null if either param is missing / invalid.
 */
export function parsePaymentReturn(): {
  kind: ReturnKind;
  paymentId: string;
} | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("payment_return");
  const pid = params.get("pid");
  if (!raw || !pid) return null;
  if (raw !== "success" && raw !== "cancel" && raw !== "failed") return null;
  return { kind: raw as ReturnKind, paymentId: pid };
}

/**
 * Remove `payment_return` and `pid` from the URL without triggering a
 * reload. Called after the user dismisses the return overlay so a
 * refresh doesn't re-show it.
 */
export function clearPaymentReturnUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("payment_return");
  url.searchParams.delete("pid");
  const cleaned = url.pathname + (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") + url.hash;
  window.history.replaceState({}, "", cleaned);
}

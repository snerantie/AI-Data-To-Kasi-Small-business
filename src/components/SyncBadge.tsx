import { motion } from "framer-motion";
import { Cloud, Loader2, WifiOff } from "lucide-react";
import type { SyncStatus } from "../store";

/**
 * Small pill that surfaces whether the app is currently connected to
 * the cloud backend. Rendered from Home.
 *
 *   local       → hidden entirely (localStorage-only, e.g. no Supabase
 *                 configured — a legitimate technical fallback, but we
 *                 don't advertise it as a mode).
 *   connecting  → gold spinner "Sync"
 *   synced      → green cloud   "Cloud"
 *   error       → coral wifi-off "Offline"
 */
export function SyncBadge({ status }: { status: SyncStatus }) {
  if (status === "local") return null;

  const config = {
    connecting: {
      icon: Loader2,
      label: "Sync",
      className: "text-kasi-gold border-kasi-gold/25 bg-kasi-gold/[0.06]",
    },
    synced: {
      icon: Cloud,
      label: "Cloud",
      className: "text-kasi-green border-kasi-green/30 bg-kasi-green/[0.08]",
    },
    error: {
      icon: WifiOff,
      label: "Offline",
      className: "text-kasi-coral border-kasi-coral/30 bg-kasi-coral/[0.08]",
    },
  }[status];

  const Icon = config.icon;
  const spinning = status === "connecting";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={
        "flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-medium uppercase tracking-wider " +
        config.className
      }
    >
      <Icon size={11} className={spinning ? "animate-spin" : ""} />
      <span>{config.label}</span>
    </motion.div>
  );
}

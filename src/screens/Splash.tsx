import { motion } from "framer-motion";
import { useEffect } from "react";

/**
 * Cold-open splash. Roughly 1.8s total:
 *  - 0.0s  ambient glow blooms in
 *  - 0.15s big K tile drops in with spring
 *  - 0.4s  gold dot pops
 *  - 0.55s wordmark slides up
 *  - 0.85s tagline fades in
 *  - 1.6s  whole thing fades out
 *  - 1.85s onDone fires → app swaps to Welcome / main
 */
export function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 1850);
    return () => window.clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35 }}
      className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden"
    >
      {/* Ambient glow blobs */}
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1.15 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="pointer-events-none absolute top-16 -left-20 w-80 h-80 rounded-full bg-kasi-green/25 blur-3xl"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1.15 }}
        transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 }}
        className="pointer-events-none absolute bottom-24 -right-20 w-96 h-96 rounded-full bg-kasi-gold/20 blur-3xl"
      />

      {/* Fade-out sweep at 1.6s */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.25 }}
        className="pointer-events-none absolute inset-0 bg-bg"
      />

      <div className="relative flex flex-col items-center gap-4">
        {/* Logo tile */}
        <div className="relative flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.4, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 16,
              delay: 0.15,
            }}
            className="relative w-20 h-20 rounded-3xl bg-kasi-green flex items-center justify-center shadow-glow"
          >
            <span className="font-display font-bold text-bg text-5xl leading-none">
              K
            </span>
            {/* Gold dot */}
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 12,
                delay: 0.4,
              }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-kasi-gold shadow-gold"
            />
          </motion.div>

          {/* Wordmark */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.5, ease: "easeOut" }}
            className="font-display font-bold text-4xl tracking-tight"
          >
            Kasi<span className="text-kasi-gold">Kash</span>
          </motion.div>
        </div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85, duration: 0.55 }}
          className="text-white/60 text-sm text-center max-w-[220px]"
        >
          Kasi hustle, upgraded.
        </motion.div>

        {/* Loader dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1, duration: 0.3 }}
          className="mt-4 flex items-center gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-kasi-green"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                delay: i * 0.12,
              }}
            />
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

import { motion } from "framer-motion";

export function Logo({ size = 48 }: { size?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className="inline-flex items-center gap-2"
    >
      <div
        className="relative rounded-2xl bg-kasi-green flex items-center justify-center shadow-glow"
        style={{ width: size, height: size }}
      >
        <span
          className="font-display font-bold text-bg"
          style={{ fontSize: size * 0.55, lineHeight: 1 }}
        >
          K
        </span>
        <span
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-kasi-gold"
          style={{ width: size * 0.22, height: size * 0.22 }}
        />
      </div>
      <span
        className="font-display font-bold tracking-tight"
        style={{ fontSize: size * 0.55 }}
      >
        Kasi<span className="text-kasi-gold">Kash</span>
      </span>
    </motion.div>
  );
}

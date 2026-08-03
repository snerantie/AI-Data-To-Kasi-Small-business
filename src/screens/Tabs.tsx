import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Check, Plus, MessageCircle } from "lucide-react";
import type { Lang } from "../i18n";
import { tr } from "../i18n";
import { formatRand, totalOwed, useStore } from "../store";

export function Tabs({ lang }: { lang: Lang }) {
  const { state, addTab, markTabPaid } = useStore();
  const [form, setForm] = useState({ customer: "", amount: 0 });
  const [openForm, setOpenForm] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const owed = totalOwed(state.tabs);
  const unpaid = state.tabs.filter((t) => !t.paid);
  const paid = state.tabs.filter((t) => t.paid);

  const submit = () => {
    if (!form.customer || form.amount <= 0) return;
    addTab({ customer: form.customer, amount: form.amount });
    setForm({ customer: "", amount: 0 });
    setOpenForm(false);
  };

  const daysAgo = (ts: number) =>
    Math.max(0, Math.round((Date.now() - ts) / (1000 * 60 * 60 * 24)));

  const handlePaid = (id: string, name: string) => {
    markTabPaid(id);
    setFlash(name);
    setTimeout(() => setFlash(null), 1800);
  };

  return (
    <div className="h-full overflow-y-auto pb-32 px-5 pt-8">
      <div className="mb-4">
        <div className="text-white/60 text-xs uppercase tracking-wider">
          {tr("tabs", lang)}
        </div>
        <div className="font-display text-2xl font-semibold">
          {tr("tabsTitle", lang)}
        </div>
      </div>

      {/* Total owed */}
      <motion.div
        layout
        className="rounded-3xl p-5 bg-gradient-to-br from-kasi-coral/25 via-kasi-gold/20 to-kasi-green/15 border border-white/5"
      >
        <div className="text-xs uppercase tracking-wider text-white/60">
          {tr("totalOwed", lang)}
        </div>
        <div className="font-display text-4xl font-bold mt-1">
          {formatRand(owed)}
        </div>
        <div className="text-white/60 text-sm mt-1">
          {unpaid.length} {unpaid.length === 1 ? "customer" : "customers"}
        </div>
      </motion.div>

      {/* Add form */}
      <div className="mt-5">
        <button
          onClick={() => setOpenForm((v) => !v)}
          className="w-full py-3 rounded-2xl bg-kasi-green text-bg font-semibold flex items-center justify-center gap-2 shadow-glow"
        >
          <Plus size={18} />
          {tr("addCustomer", lang)}
        </button>
        <AnimatePresence>
          {openForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 rounded-2xl bg-bg-card border border-white/5 p-4 flex flex-col gap-2">
                <input
                  value={form.customer}
                  onChange={(e) =>
                    setForm({ ...form, customer: e.target.value })
                  }
                  placeholder={tr("customerName", lang)}
                  className="w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white outline-none focus:border-kasi-green"
                />
                <input
                  type="number"
                  value={form.amount || ""}
                  onChange={(e) =>
                    setForm({ ...form, amount: Number(e.target.value) })
                  }
                  placeholder={tr("amount", lang)}
                  className="w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white outline-none focus:border-kasi-green"
                />
                <button
                  onClick={submit}
                  className="mt-1 py-3 rounded-xl bg-kasi-gold text-bg font-semibold"
                >
                  {tr("save", lang)}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Unpaid list */}
      <div className="mt-6 flex flex-col gap-2">
        {unpaid.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="rounded-2xl bg-bg-card border border-white/5 p-4 flex items-center gap-3"
          >
            <div className="w-11 h-11 rounded-xl bg-kasi-green/15 border border-kasi-green/30 flex items-center justify-center font-display font-bold text-kasi-green">
              {t.customer[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="font-medium">{t.customer}</div>
              <div className="text-xs text-white/50">
                {daysAgo(t.createdAt)} {daysAgo(t.createdAt) === 1 ? "day" : "days"} ago
              </div>
            </div>
            <div className="text-right mr-2">
              <div className="font-display font-semibold text-kasi-coral">
                {formatRand(t.amount)}
              </div>
              {daysAgo(t.createdAt) > 7 && (
                <button className="text-[10px] flex items-center gap-1 text-kasi-gold mt-0.5">
                  <MessageCircle size={10} /> WhatsApp
                </button>
              )}
            </div>
            <button
              onClick={() => handlePaid(t.id, t.customer)}
              className="w-10 h-10 rounded-xl bg-kasi-green/15 border border-kasi-green/30 flex items-center justify-center"
            >
              <Check size={18} className="text-kasi-green" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Paid list */}
      {paid.length > 0 && (
        <div className="mt-6">
          <div className="text-white/40 text-xs uppercase tracking-wider mb-2">
            Recently paid
          </div>
          <div className="flex flex-col gap-2 opacity-60">
            {paid.slice(0, 3).map((t) => (
              <div
                key={t.id}
                className="rounded-2xl bg-bg-card border border-white/5 p-3 flex items-center gap-3"
              >
                <Check size={16} className="text-kasi-green" />
                <span className="flex-1 text-sm">{t.customer}</span>
                <span className="text-sm text-kasi-green">
                  {formatRand(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flash toast */}
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-24 left-4 right-4 rounded-2xl bg-kasi-green text-bg px-4 py-3 font-semibold text-center shadow-glow"
          >
            {flash} {tr("paidJust", lang)} ✅
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

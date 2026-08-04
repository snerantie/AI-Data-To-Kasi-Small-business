import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Check, RotateCcw, Undo2, Keyboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { tr } from "../i18n";
import { createRecognizer, isSpeechSupported, parseSale } from "../voice";
import type { ParsedSale } from "../voice";
import { useStore, formatRand } from "../store";
import type { Screen } from "../App";
import type { Sale } from "../store";

type Phase = "idle" | "listening" | "parsed";

export function LogSale({
  lang,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { addSale, undoSale } = useStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedSale | null>(null);
  const [manual, setManual] = useState({ item: "", qty: 1, price: 0 });
  const [showManual, setShowManual] = useState(false);
  const [supported, setSupported] = useState(true);
  const [micError, setMicError] = useState<string | null>(null);
  const [undoSalePayload, setUndoSalePayload] = useState<Sale | null>(null);
  const [undoing, setUndoing] = useState(false);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);

  useEffect(() => {
    setSupported(isSpeechSupported());
  }, []);

  const startListening = () => {
    setMicError(null);
    setTranscript("");
    setParsed(null);
    setPhase("listening");

    const r = createRecognizer(lang);
    if (!r) {
      setSupported(false);
      setPhase("idle");
      setShowManual(true);
      return;
    }
    recRef.current = r;
    r.onresult = (e) => {
      const text = e.results[0][0].transcript;
      setTranscript(text);
      const p = parseSale(text);
      setParsed(p);
      setPhase("parsed");
    };
    r.onerror = (event: unknown) => {
      const err = event as { error?: string };
      if (err.error === "not-allowed" || err.error === "service-not-allowed") {
        setMicError(tr("micPermissionDenied", lang));
      }
      setPhase("idle");
    };
    r.onend = () => {
      setPhase((p) => (p === "listening" ? "idle" : p));
    };
    try {
      r.start();
    } catch {
      setSupported(false);
      setPhase("idle");
      setShowManual(true);
    }
  };

  const stopListening = () => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    setPhase("idle");
  };

  const commitSale = (payload: {
    item: string;
    qty: number;
    price: number;
    raw?: string;
    source: "voice" | "manual";
  }) => {
    const full = addSale(payload);
    setUndoSalePayload(full);
    setPhase("idle");
    setTranscript("");
    setParsed(null);
    setManual({ item: "", qty: 1, price: 0 });
    // Auto-dismiss the undo toast after 6s
    window.setTimeout(() => {
      setUndoSalePayload((cur) => (cur?.id === full.id ? null : cur));
    }, 6000);
  };

  const confirm = () => {
    if (parsed) {
      commitSale({
        item: parsed.item,
        qty: parsed.qty,
        price: parsed.price,
        raw: transcript,
        source: "voice",
      });
    }
  };

  const saveManual = () => {
    if (!manual.item.trim() || manual.qty <= 0 || manual.price <= 0) return;
    commitSale({ ...manual, item: manual.item.trim(), source: "manual" });
    setShowManual(false);
  };

  const handleUndo = async () => {
    if (!undoSalePayload) return;
    setUndoing(true);
    undoSale(undoSalePayload.id);
    setUndoSalePayload(null);
    setUndoing(false);
    // Keep the user on this screen so they see the undo landed
  };

  return (
    <div className="h-full flex flex-col px-5 pt-8 pb-32 overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-white/60 text-xs uppercase tracking-wider">
          {tr("logSale", lang)}
        </div>
        <div className="font-display text-2xl font-semibold mt-1">
          {tr("micTapToSpeak", lang)}
        </div>
      </div>

      {/* Voice not supported: gentle nudge to type instead */}
      {!supported && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 rounded-2xl border border-kasi-gold/25 bg-kasi-gold/[0.08] p-4"
        >
          <div className="text-kasi-gold font-semibold text-sm">
            {tr("voiceUnavailableTitle", lang)}
          </div>
          <div className="text-white/70 text-sm mt-1">
            {tr("voiceUnavailableBody", lang)}
          </div>
        </motion.div>
      )}

      {/* Big Mic — only when voice is available */}
      {supported && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <div className="relative flex items-center justify-center">
            {phase === "listening" && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-kasi-green/30"
                  animate={{ scale: [1, 1.8, 2.4], opacity: [0.6, 0.2, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{ width: 220, height: 220 }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-kasi-green/30"
                  animate={{ scale: [1, 1.6, 2.2], opacity: [0.5, 0.15, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }}
                  style={{ width: 220, height: 220 }}
                />
              </>
            )}
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={phase === "listening" ? stopListening : startListening}
              className={
                "relative w-52 h-52 rounded-full flex items-center justify-center shadow-2xl transition-colors " +
                (phase === "listening"
                  ? "bg-kasi-coral"
                  : "bg-kasi-green shadow-glow")
              }
              aria-label={phase === "listening" ? "Stop" : "Start voice input"}
            >
              {phase === "listening" ? (
                <MicOff size={72} className="text-bg" />
              ) : (
                <Mic size={72} className="text-bg" />
              )}
            </motion.button>
          </div>

          <div className="text-center min-h-[64px] flex flex-col items-center justify-center gap-1 max-w-[320px]">
            {phase === "idle" && (
              <>
                <p className="text-white/85 text-base">
                  {tr("micTapToSpeak", lang)}
                </p>
                <p className="text-white/45 text-sm">
                  {lang === "en"
                    ? `Try: "${tr("sampleSuggestion1", lang)}"`
                    : lang === "zu"
                      ? `Zama: "${tr("sampleSuggestion1", lang)}"`
                      : `Leka: "${tr("sampleSuggestion1", lang)}"`}
                </p>
                {micError && (
                  <p className="text-kasi-coral text-xs mt-2">{micError}</p>
                )}
              </>
            )}
            {phase === "listening" && (
              <motion.p
                className="text-kasi-green font-medium text-xl"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {tr("listening", lang)}
              </motion.p>
            )}
          </div>
        </div>
      )}

      {/* Parsed result confirm card */}
      <AnimatePresence>
        {phase === "parsed" && parsed && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="rounded-3xl bg-bg-card border border-kasi-green/30 p-5 mt-4"
          >
            <div className="text-xs uppercase tracking-wider text-white/50 mb-1">
              {tr("heard", lang)}
            </div>
            <div className="text-white/90 italic mb-4">"{transcript}"</div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <Field label={tr("item", lang)} value={parsed.item} />
              <Field label={tr("qty", lang)} value={String(parsed.qty)} />
              <Field
                label={tr("price", lang)}
                value={formatRand(parsed.price)}
              />
            </div>
            <div className="rounded-2xl bg-kasi-green/10 border border-kasi-green/20 p-3 mb-4 flex justify-between items-center">
              <span className="text-white/70 text-sm">Total</span>
              <span className="font-display text-2xl font-bold text-kasi-green">
                {formatRand(parsed.qty * parsed.price)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPhase("idle");
                  setTranscript("");
                  setParsed(null);
                }}
                className="flex-1 py-3 rounded-2xl bg-bg border border-white/10 text-white/80 flex items-center justify-center gap-2 text-base"
              >
                <RotateCcw size={16} />
                {tr("retry", lang)}
              </button>
              <button
                onClick={confirm}
                className="flex-[2] py-3 rounded-2xl bg-kasi-green text-bg font-semibold flex items-center justify-center gap-2 shadow-glow text-base"
              >
                <Check size={18} />
                {tr("confirm", lang)}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual entry — always available as a fallback, expandable */}
      {phase !== "parsed" && (
        <div className="mt-4">
          {!showManual && supported && (
            <button
              onClick={() => setShowManual(true)}
              className="w-full py-3.5 rounded-2xl bg-bg-card border border-white/10 text-white/80 flex items-center justify-center gap-2 text-base"
            >
              <Keyboard size={18} />
              {tr("typeInstead", lang)}
            </button>
          )}
          {(showManual || !supported) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 rounded-2xl bg-bg-card border border-white/10 p-4 flex flex-col gap-3"
            >
              <input
                value={manual.item}
                onChange={(e) => setManual({ ...manual, item: e.target.value })}
                placeholder={tr("item", lang)}
                autoFocus
                className="w-full px-4 py-4 rounded-xl bg-bg border border-white/10 text-white text-base outline-none focus:border-kasi-green"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={manual.qty}
                  onChange={(e) =>
                    setManual({ ...manual, qty: Number(e.target.value) })
                  }
                  placeholder={tr("qty", lang)}
                  className="w-full px-4 py-4 rounded-xl bg-bg border border-white/10 text-white text-base outline-none focus:border-kasi-green"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  value={manual.price || ""}
                  onChange={(e) =>
                    setManual({ ...manual, price: Number(e.target.value) })
                  }
                  placeholder={tr("price", lang)}
                  className="w-full px-4 py-4 rounded-xl bg-bg border border-white/10 text-white text-base outline-none focus:border-kasi-green"
                />
              </div>
              <button
                onClick={saveManual}
                disabled={
                  !manual.item.trim() || manual.qty <= 0 || manual.price <= 0
                }
                className={
                  "mt-1 py-4 rounded-xl font-semibold text-base transition-colors " +
                  (manual.item.trim() && manual.qty > 0 && manual.price > 0
                    ? "bg-kasi-gold text-bg"
                    : "bg-white/5 text-white/30 cursor-not-allowed")
                }
              >
                {tr("save", lang)}
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* Undo toast after a sale is logged */}
      <AnimatePresence>
        {undoSalePayload && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-24 left-4 right-4 rounded-2xl bg-kasi-green text-bg px-4 py-3 font-semibold flex items-center justify-between shadow-glow"
          >
            <span className="flex items-center gap-2">
              <Check size={16} />
              {tr("saleLogged", lang)}: +
              {formatRand(undoSalePayload.qty * undoSalePayload.price)}
            </span>
            <button
              onClick={handleUndo}
              disabled={undoing}
              className="flex items-center gap-1 text-bg font-bold underline text-sm"
            >
              <Undo2 size={14} />
              {tr("undo", lang)}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  function Field({ label, value }: { label: string; value: string }) {
    return (
      <div className="rounded-xl bg-bg/60 border border-white/5 px-3 py-2">
        <div className="text-[10px] uppercase tracking-wider text-white/40">
          {label}
        </div>
        <div className="text-white font-semibold truncate">{value}</div>
      </div>
    );
  }
}

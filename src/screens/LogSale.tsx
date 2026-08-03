import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Check,
  RotateCcw,
  Sparkles,
  ScanLine,
  Camera,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import { tr } from "../i18n";
import { createRecognizer, isSpeechSupported, parseSale } from "../voice";
import type { ParsedSale } from "../voice";
import { useStore, formatRand } from "../store";
import type { Screen } from "../App";

type Phase = "idle" | "listening" | "parsed";

type ReceiptPhase = "closed" | "camera" | "scanning" | "done";

// Sample OCR output — used by the receipt scan mock.
const DEMO_RECEIPT = [
  { item: "Bread", qty: 6, price: 18 },
  { item: "Sugar", qty: 2, price: 22 },
  { item: "Milk", qty: 3, price: 26 },
  { item: "Cold drink", qty: 4, price: 15 },
];

export function LogSale({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { addSale, addSales } = useStore();
  const [phase, setPhase] = useState<Phase>("idle");
  const [transcript, setTranscript] = useState("");
  const [parsed, setParsed] = useState<ParsedSale | null>(null);
  const [manual, setManual] = useState({ item: "", qty: 1, price: 0 });
  const [supported, setSupported] = useState(true);
  const [receiptPhase, setReceiptPhase] = useState<ReceiptPhase>("closed");
  const [receiptItems, setReceiptItems] = useState<typeof DEMO_RECEIPT>([]);
  const recRef = useRef<ReturnType<typeof createRecognizer>>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSupported(isSpeechSupported());
  }, []);

  const startListening = () => {
    setTranscript("");
    setParsed(null);
    setPhase("listening");

    const r = createRecognizer(lang);
    if (!r) {
      setSupported(false);
      simulateDemoTranscript();
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
    r.onerror = () => setPhase("idle");
    r.onend = () => {
      setPhase((p) => (p === "listening" ? "idle" : p));
    };
    try {
      r.start();
    } catch {
      setSupported(false);
      simulateDemoTranscript();
    }
  };

  const simulateDemoTranscript = () => {
    const scripts: Record<Lang, string[]> = {
      en: ["I sold 3 bread at R18", "2 airtime R12", "sold 4 cold drink R15"],
      zu: [
        "Ngithengise izinkwa ezintathu ngo-18",
        "Amaairtime amabili 12",
        "izinkwa ezine ngo 15",
      ],
      st: [
        "Ke rekisitse bohobe bo bo bararo ka 18",
        "Li-airtime tse peli 12",
        "Ke rekisitse senoelo se sengoe ka 15",
      ],
    };
    const pick = scripts[lang][Math.floor(Math.random() * 3)];
    setTimeout(() => {
      setTranscript(pick);
      const p = parseSale(pick);
      setParsed(p);
      setPhase("parsed");
    }, 1800);
  };

  const stopListening = () => {
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    setPhase("idle");
  };

  const confirm = () => {
    if (parsed) {
      addSale({
        item: parsed.item,
        qty: parsed.qty,
        price: parsed.price,
        raw: transcript,
        source: "voice",
      });
      setPhase("idle");
      setTranscript("");
      setParsed(null);
      onNavigate("home");
    }
  };

  const saveManual = () => {
    if (!manual.item || manual.qty <= 0 || manual.price <= 0) return;
    addSale({ ...manual, source: "manual" });
    setManual({ item: "", qty: 1, price: 0 });
    onNavigate("home");
  };

  // ---- Receipt scan flow ----
  const openReceipt = () => {
    setReceiptPhase("camera");
    setReceiptItems([]);
  };

  const runOcrMock = () => {
    setReceiptPhase("scanning");
    // Reveal extracted items one-by-one for effect
    setReceiptItems([]);
    DEMO_RECEIPT.forEach((line, i) => {
      window.setTimeout(() => {
        setReceiptItems((prev) => [...prev, line]);
        if (i === DEMO_RECEIPT.length - 1) {
          window.setTimeout(() => setReceiptPhase("done"), 400);
        }
      }, 600 + i * 500);
    });
  };

  const applyReceipt = () => {
    addSales(receiptItems.map((r) => ({ ...r, source: "receipt" as const })));
    setReceiptPhase("closed");
    setReceiptItems([]);
    onNavigate("home");
  };

  return (
    <div className="h-full flex flex-col px-5 pt-8 pb-32 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-white/60 text-xs uppercase tracking-wider">
            {tr("logSale", lang)}
          </div>
          <div className="font-display text-2xl font-semibold">
            {tr("micTapToSpeak", lang)}
          </div>
        </div>
        <Sparkles className="text-kasi-gold" size={22} />
      </div>

      {/* Scan receipt button */}
      <button
        onClick={openReceipt}
        className="w-full mb-6 flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-kasi-gold/20 via-kasi-gold/10 to-transparent border border-kasi-gold/30"
      >
        <div className="w-9 h-9 rounded-xl bg-kasi-gold text-bg flex items-center justify-center">
          <ScanLine size={18} />
        </div>
        <div className="flex-1 text-left">
          <div className="text-sm font-semibold">{tr("scanTitle", lang)}</div>
          <div className="text-[11px] text-white/60">
            {tr("scanSubtitle", lang)}
          </div>
        </div>
        <span className="text-kasi-gold text-sm">→</span>
      </button>

      {/* Big Mic */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="relative flex items-center justify-center">
          {phase === "listening" && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full bg-kasi-green/30"
                animate={{ scale: [1, 1.8, 2.4], opacity: [0.6, 0.2, 0] }}
                transition={{ duration: 1.8, repeat: Infinity }}
                style={{ width: 200, height: 200 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full bg-kasi-green/30"
                animate={{ scale: [1, 1.6, 2.2], opacity: [0.5, 0.15, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }}
                style={{ width: 200, height: 200 }}
              />
            </>
          )}
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={phase === "listening" ? stopListening : startListening}
            className={
              "relative w-44 h-44 rounded-full flex items-center justify-center shadow-2xl transition-colors " +
              (phase === "listening"
                ? "bg-kasi-coral"
                : "bg-kasi-green shadow-glow")
            }
          >
            {phase === "listening" ? (
              <MicOff size={60} className="text-bg" />
            ) : (
              <Mic size={60} className="text-bg" />
            )}
          </motion.button>
        </div>

        <div className="text-center min-h-[72px] flex flex-col items-center justify-center gap-1 max-w-[300px]">
          {phase === "idle" && (
            <>
              <p className="text-white/80 text-sm">
                {tr("micTapToSpeak", lang)}
              </p>
              <p className="text-white/40 text-xs">
                {lang === "en"
                  ? `Try: "${tr("sampleSuggestion1", lang)}"`
                  : lang === "zu"
                    ? `Zama: "${tr("sampleSuggestion1", lang)}"`
                    : `Leka: "${tr("sampleSuggestion1", lang)}"`}
              </p>
              {!supported && (
                <p className="text-kasi-gold text-[11px] mt-2">
                  Demo mode — using simulated transcription
                </p>
              )}
            </>
          )}
          {phase === "listening" && (
            <motion.p
              className="text-kasi-green font-medium text-lg"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {tr("listening", lang)}
            </motion.p>
          )}
        </div>
      </div>

      {/* Parsed result */}
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
                className="flex-1 py-3 rounded-2xl bg-bg border border-white/10 text-white/80 flex items-center justify-center gap-2"
              >
                <RotateCcw size={16} />
                {tr("retry", lang)}
              </button>
              <button
                onClick={confirm}
                className="flex-[2] py-3 rounded-2xl bg-kasi-green text-bg font-semibold flex items-center justify-center gap-2 shadow-glow"
              >
                <Check size={18} />
                {tr("confirm", lang)}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual fallback */}
      {phase !== "parsed" && (
        <details className="mt-4 rounded-2xl bg-bg-card/60 border border-white/5 px-4 py-3">
          <summary className="text-white/70 text-sm cursor-pointer">
            {tr("manualEntry", lang)}
          </summary>
          <div className="mt-3 flex flex-col gap-2">
            <input
              value={manual.item}
              onChange={(e) => setManual({ ...manual, item: e.target.value })}
              placeholder={tr("item", lang)}
              className="w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white outline-none focus:border-kasi-green"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                value={manual.qty}
                onChange={(e) =>
                  setManual({ ...manual, qty: Number(e.target.value) })
                }
                placeholder={tr("qty", lang)}
                className="w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white outline-none focus:border-kasi-green"
              />
              <input
                type="number"
                value={manual.price || ""}
                onChange={(e) =>
                  setManual({ ...manual, price: Number(e.target.value) })
                }
                placeholder={tr("price", lang)}
                className="w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white outline-none focus:border-kasi-green"
              />
            </div>
            <button
              onClick={saveManual}
              className="mt-2 py-3 rounded-xl bg-kasi-gold text-bg font-semibold"
            >
              {tr("save", lang)}
            </button>
          </div>
        </details>
      )}

      {/* Receipt scan modal */}
      <AnimatePresence>
        {receiptPhase !== "closed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-bg/95 backdrop-blur flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="font-display font-semibold text-lg">
                {tr("scanTitle", lang)}
              </div>
              <button
                onClick={() => {
                  setReceiptPhase("closed");
                  setReceiptItems([]);
                }}
                className="p-1"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Camera / choose file */}
              {receiptPhase === "camera" && (
                <div className="h-full flex flex-col items-center justify-center gap-6">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-56 h-72 rounded-3xl border-2 border-dashed border-kasi-gold/50 bg-kasi-gold/5 flex flex-col items-center justify-center gap-3"
                  >
                    <Camera size={48} className="text-kasi-gold" />
                    <div className="text-white/60 text-sm px-4 text-center">
                      {tr("scanSubtitle", lang)}
                    </div>
                  </motion.div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={() => runOcrMock()}
                  />
                  <button
                    onClick={() => {
                      // Try opening camera picker; if not available or user cancels,
                      // still run the demo OCR.
                      fileRef.current?.click();
                      window.setTimeout(() => {
                        if (receiptPhase === "camera") runOcrMock();
                      }, 300);
                    }}
                    className="px-6 py-3 rounded-2xl bg-kasi-gold text-bg font-semibold flex items-center gap-2 shadow-gold"
                  >
                    <Camera size={18} />
                    {tr("choosePhoto", lang)}
                  </button>
                  <div className="text-kasi-gold text-[11px]">
                    {tr("demoReceiptNote", lang)}
                  </div>
                </div>
              )}

              {/* Scanning + revealing items */}
              {(receiptPhase === "scanning" || receiptPhase === "done") && (
                <div>
                  <div className="rounded-3xl border border-white/10 bg-bg-card/60 p-4 mb-4 relative overflow-hidden">
                    <div className="text-xs uppercase tracking-wider text-white/50 mb-3 flex items-center gap-2">
                      {receiptPhase === "scanning" ? (
                        <>
                          <motion.span
                            className="w-2 h-2 rounded-full bg-kasi-gold"
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity }}
                          />
                          {tr("scanning", lang)}
                        </>
                      ) : (
                        <>
                          <Check size={14} className="text-kasi-green" />
                          {tr("extractedItems", lang)}
                        </>
                      )}
                    </div>

                    {receiptPhase === "scanning" && (
                      <motion.div
                        className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-kasi-gold to-transparent"
                        initial={{ top: 0 }}
                        animate={{ top: "100%" }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      />
                    )}

                    <div className="flex flex-col gap-2">
                      <AnimatePresence>
                        {receiptItems.map((r, i) => (
                          <motion.div
                            key={r.item + i}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between rounded-xl bg-bg/60 border border-white/5 px-3 py-2"
                          >
                            <div>
                              <div className="text-sm font-medium">{r.item}</div>
                              <div className="text-[11px] text-white/50">
                                {r.qty} × {formatRand(r.price)}
                              </div>
                            </div>
                            <div className="font-display font-semibold text-kasi-green">
                              +{formatRand(r.qty * r.price)}
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>

                  {receiptPhase === "done" && (
                    <motion.button
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={applyReceipt}
                      className="w-full py-4 rounded-2xl bg-kasi-green text-bg font-display font-bold text-lg shadow-glow flex items-center justify-center gap-2"
                    >
                      <Check size={20} />
                      {tr("addAll", lang)} ({receiptItems.length})
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

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

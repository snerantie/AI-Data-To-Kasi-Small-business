import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";

import type { Screen } from "../App";
import type { Lang } from "../i18n";
import { tr, trParams } from "../i18n";
// Tesseract.js pulls a ~7MB WASM binary + language pack on first use.
// The module is only imported dynamically (inside runOcr), so users
// who never open the scanner never pay for it in their bundle.
import type { OcrItem, OcrProgress } from "../lib/ocr";
import { formatRand, useStore } from "../store";

/**
 * Receipt-scanning screen. Users take (or pick) a photo of a supplier
 * receipt; Tesseract.js runs client-side OCR; the parser turns raw
 * text into structured line items; the user reviews / edits / removes
 * items before saving them all to the sales log in one shot.
 *
 * Design constraints:
 *   - Zero server round-trip. Everything, including the OCR, runs in
 *     the browser. Works offline once the language pack is cached.
 *   - The Tesseract chunk is heavy, so its import is deferred until
 *     the user actually presses "Take a photo" — the mount cost of
 *     this screen is just a few kB.
 *   - Users who don't have a camera (desktop web PWA install) get the
 *     same flow via the file picker.
 */
export function ScanReceipt({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { addSales } = useStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Screen state machine. Kept as an explicit union so we can't get
  // into weird combos like "running with results visible".
  type Phase =
    | { kind: "idle" }
    | { kind: "running"; progress: OcrProgress }
    | { kind: "results"; items: OcrItem[]; imageUrl: string; rawText: string }
    | { kind: "error"; message: string; imageUrl?: string };
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [savingBusy, setSavingBusy] = useState(false);
  const [savedFlash, setSavedFlash] = useState<number | null>(null);

  // Whenever we get a new results phase, pre-select every item so the
  // user only has to uncheck the ones they don't want.
  useEffect(() => {
    if (phase.kind === "results") {
      setSelected(new Set(phase.items.map((_, i) => i)));
    }
  }, [phase]);

  const chooseFile = () => fileInputRef.current?.click();

  const runOcr = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);
    setPhase({
      kind: "running",
      progress: { status: "Loading OCR engine..." },
    });

    try {
      const { recognizeReceipt } = await import("../lib/ocr");
      const { text, items } = await recognizeReceipt(file, (p) => {
        setPhase((prev) =>
          prev.kind === "running" ? { kind: "running", progress: p } : prev,
        );
      });
      if (items.length === 0) {
        setPhase({
          kind: "error",
          message: tr("scanNoItemsFound", lang),
          imageUrl,
        });
        return;
      }
      setPhase({ kind: "results", items, imageUrl, rawText: text });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setPhase({ kind: "error", message, imageUrl });
    }
  };

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input's value so picking the same file twice in a row
    // still triggers a change event.
    e.target.value = "";
    if (file) void runOcr(file);
  };

  const startOver = () => {
    if (phase.kind === "results" || (phase.kind === "error" && phase.imageUrl)) {
      const url = phase.kind === "results" ? phase.imageUrl : phase.imageUrl;
      if (url) URL.revokeObjectURL(url);
    }
    setPhase({ kind: "idle" });
    setSelected(new Set());
  };

  const updateItem = (index: number, patch: Partial<OcrItem>) => {
    if (phase.kind !== "results") return;
    const next = phase.items.slice();
    next[index] = { ...next[index], ...patch };
    setPhase({ ...phase, items: next });
  };

  const removeItem = (index: number) => {
    if (phase.kind !== "results") return;
    const next = phase.items.filter((_, i) => i !== index);
    setPhase({ ...phase, items: next });
    // Recompute selection to keep it aligned to the new indices.
    const nextSel = new Set<number>();
    let newIdx = 0;
    for (let i = 0; i < phase.items.length; i++) {
      if (i === index) continue;
      if (selected.has(i)) nextSel.add(newIdx);
      newIdx++;
    }
    setSelected(nextSel);
  };

  const toggleSelected = (index: number) => {
    const next = new Set(selected);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelected(next);
  };

  const commit = async () => {
    if (phase.kind !== "results") return;
    const picked = phase.items.filter((_, i) => selected.has(i));
    if (picked.length === 0) return;
    setSavingBusy(true);
    try {
      addSales(
        picked.map((it) => ({
          item: it.name,
          qty: it.qty,
          price: it.price,
          raw: it.raw,
          source: "receipt" as const,
        })),
      );
      setSavedFlash(picked.length);
      window.setTimeout(() => {
        onNavigate("home");
      }, 900);
    } finally {
      setSavingBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 border-b border-white/5">
        <button
          onClick={() => onNavigate("home")}
          className="p-2 -ml-2 rounded-full text-white/70 hover:text-white"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold truncate">
            {tr("scanTitle", lang)}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-8">
        {/* Hidden file input; opened by the two buttons below. */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFilePicked}
          className="hidden"
        />

        {phase.kind === "idle" && (
          <IdleState lang={lang} onCamera={chooseFile} />
        )}
        {phase.kind === "running" && (
          <RunningState lang={lang} progress={phase.progress} />
        )}
        {phase.kind === "error" && (
          <ErrorState
            lang={lang}
            message={phase.message}
            imageUrl={phase.imageUrl}
            onRetry={startOver}
          />
        )}
        {phase.kind === "results" && (
          <ResultsState
            lang={lang}
            items={phase.items}
            imageUrl={phase.imageUrl}
            selected={selected}
            onToggle={toggleSelected}
            onUpdate={updateItem}
            onRemove={removeItem}
            onRetry={startOver}
            onCommit={commit}
            savingBusy={savingBusy}
          />
        )}
      </div>

      <AnimatePresence>
        {savedFlash !== null && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-4 right-4 rounded-2xl bg-kasi-green text-bg px-4 py-3 font-semibold text-center shadow-glow"
          >
            {trParams("scanAdded", lang, { count: savedFlash })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components — split out so the top-level ScanReceipt is easy to
// read as a state machine and each sub-state stays small.
// ---------------------------------------------------------------------------

function IdleState({
  lang,
  onCamera,
}: {
  lang: Lang;
  onCamera: () => void;
}) {
  return (
    <div className="flex flex-col items-center pt-4">
      <div className="w-24 h-24 rounded-3xl bg-kasi-gold/10 border border-kasi-gold/30 flex items-center justify-center mb-5">
        <Camera size={44} className="text-kasi-gold" />
      </div>
      <p className="text-white/70 text-center max-w-[280px] text-sm leading-relaxed">
        {tr("scanSubtitle", lang)}
      </p>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onCamera}
        className="mt-8 w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-kasi-green text-bg font-display font-bold text-lg shadow-glow"
      >
        <Camera size={20} />
        {tr("scanTakePhoto", lang)}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onCamera}
        className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-bg-card border border-white/10 text-white/80"
      >
        <ImageIcon size={16} />
        {tr("scanChooseFile", lang)}
      </motion.button>
    </div>
  );
}

function RunningState({
  lang,
  progress,
}: {
  lang: Lang;
  progress: OcrProgress;
}) {
  const pct =
    typeof progress.progress === "number"
      ? Math.round(progress.progress * 100)
      : null;
  return (
    <div className="flex flex-col items-center pt-10">
      <Loader2 size={40} className="animate-spin text-kasi-green" />
      <div className="mt-6 font-display text-lg">
        {tr("scanProcessing", lang)}
      </div>
      <div className="mt-2 text-white/50 text-xs text-center max-w-[240px]">
        {progress.status}
        {pct !== null ? ` · ${pct}%` : null}
      </div>

      {pct !== null && (
        <div className="mt-6 w-full max-w-[240px] h-2 rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-kasi-gold to-kasi-green"
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      )}
    </div>
  );
}

function ErrorState({
  lang,
  message,
  imageUrl,
  onRetry,
}: {
  lang: Lang;
  message: string;
  imageUrl?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center pt-6">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="w-40 h-40 rounded-2xl object-cover border border-white/10 mb-5 opacity-60"
        />
      )}
      <div className="rounded-2xl border border-kasi-coral/30 bg-kasi-coral/[0.06] p-4 text-kasi-coral text-sm text-center max-w-[280px]">
        {message}
      </div>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onRetry}
        className="mt-5 flex items-center gap-2 px-5 py-3 rounded-2xl bg-kasi-green text-bg font-semibold"
      >
        <RotateCcw size={16} />
        {tr("scanRetry", lang)}
      </motion.button>
    </div>
  );
}

function ResultsState({
  lang,
  items,
  imageUrl,
  selected,
  onToggle,
  onUpdate,
  onRemove,
  onRetry,
  onCommit,
  savingBusy,
}: {
  lang: Lang;
  items: OcrItem[];
  imageUrl: string;
  selected: Set<number>;
  onToggle: (i: number) => void;
  onUpdate: (i: number, patch: Partial<OcrItem>) => void;
  onRemove: (i: number) => void;
  onRetry: () => void;
  onCommit: () => void;
  savingBusy: boolean;
}) {
  const pickedCount = selected.size;
  const total = items
    .filter((_, i) => selected.has(i))
    .reduce((sum, it) => sum + it.price * it.qty, 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Thumbnail + counts */}
      <div className="flex items-center gap-3">
        <img
          src={imageUrl}
          alt=""
          className="w-14 h-14 rounded-xl object-cover border border-white/10 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">
            {trParams("scanFoundItems", lang, { count: items.length })}
          </div>
          <div className="text-white/50 text-xs">
            {tr("scanFooterHint", lang)}
          </div>
        </div>
        <button
          onClick={onRetry}
          className="p-2 rounded-xl text-white/50 hover:text-white/80"
          aria-label={tr("scanRetry", lang)}
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Item list */}
      <div className="flex flex-col gap-2">
        {items.map((it, idx) => {
          const isSelected = selected.has(idx);
          return (
            <motion.div
              key={idx}
              layout
              className={
                "rounded-2xl border p-3 " +
                (isSelected
                  ? "bg-kasi-green/[0.06] border-kasi-green/30"
                  : "bg-bg-card border-white/5 opacity-60")
              }
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onToggle(idx)}
                  className={
                    "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 " +
                    (isSelected
                      ? "bg-kasi-green border-kasi-green text-bg"
                      : "border-white/30")
                  }
                  aria-label={
                    isSelected ? tr("scanRemoveItem", lang) : tr("scanRetry", lang)
                  }
                >
                  {isSelected && <Check size={14} />}
                </button>

                <input
                  value={it.name}
                  onChange={(e) => onUpdate(idx, { name: e.target.value })}
                  className="flex-1 min-w-0 bg-transparent text-sm font-medium outline-none border-b border-transparent focus:border-kasi-green"
                  placeholder={tr("scanItemName", lang)}
                />

                <button
                  onClick={() => onRemove(idx)}
                  className="p-1.5 text-white/40 hover:text-kasi-coral"
                  aria-label={tr("scanRemoveItem", lang)}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/40">
                    {tr("scanItemQty", lang)}
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={it.qty}
                    onChange={(e) =>
                      onUpdate(idx, { qty: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="w-full mt-0.5 bg-transparent text-white font-mono tabular-nums outline-none border-b border-white/10 focus:border-kasi-green"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/40">
                    {tr("scanItemPrice", lang)}
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    value={it.price}
                    onChange={(e) =>
                      onUpdate(idx, { price: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-full mt-0.5 bg-transparent text-white font-mono tabular-nums outline-none border-b border-white/10 focus:border-kasi-green"
                  />
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">
                    {tr("scanLineTotal", lang)}
                  </div>
                  <div className="font-display text-kasi-green tabular-nums text-sm mt-0.5">
                    {formatRand(it.price * it.qty)}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom summary + commit */}
      <div className="mt-2 rounded-2xl bg-bg-card border border-white/5 p-3 flex items-center justify-between">
        <span className="text-white/60 text-xs uppercase tracking-wider">
          {tr("scanSelectedTotal", lang)}
        </span>
        <span className="font-display font-bold text-kasi-green">
          {formatRand(total)}
        </span>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onCommit}
        disabled={pickedCount === 0 || savingBusy}
        className={
          "py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 " +
          (pickedCount > 0 && !savingBusy
            ? "bg-kasi-green text-bg shadow-glow"
            : "bg-white/5 text-white/30 cursor-not-allowed")
        }
      >
        {savingBusy ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Plus size={18} />
        )}
        {trParams("scanConfirmAdd", lang, { count: pickedCount })}
      </motion.button>
    </div>
  );
}

import { useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";

import type { Screen } from "../App";
import type { Lang } from "../i18n";
import { tr, trParams } from "../i18n";
import type { BankId, ImportSummary } from "../lib/bank/types";
import { formatRand, useStore } from "../store";
import type { BankTransaction } from "../store";

/**
 * Bank-statement importer screen (PR #23).
 *
 * Runs the whole client-side pipeline behind a small state machine:
 *
 *   idle → reading → parsing → classifying → saving → done
 *                                                    ↓
 *                                                  error
 *
 * The heavy modules (`pdfjs-dist`, `papaparse`) are dynamically
 * imported when the user picks a file so that the initial bundle
 * stays small — a user who never opens this screen never pays for
 * a few hundred KB of parsing code.
 *
 * All file reading happens in the browser. Nothing is uploaded as a
 * file; only the extracted transactions are sent to Supabase, under
 * the same RLS as every other value-bearing table.
 */

type Phase =
  | { kind: "idle" }
  | { kind: "reading"; filename: string }
  | { kind: "parsing"; filename: string; bank: BankId | null }
  | { kind: "classifying"; filename: string; count: number }
  | { kind: "saving"; filename: string; count: number }
  | {
      kind: "done";
      summary: ImportSummary;
      bank: BankId;
      previewTx: BankTransaction[];
    }
  | { kind: "error"; message: string };

export function ImportStatement({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { addBankStatement, state } = useStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const chooseFile = () => fileInputRef.current?.click();

  const onFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so re-picking the same file re-fires
    if (!file) return;
    void runImport(file);
  };

  const runImport = async (file: File) => {
    try {
      setPhase({ kind: "reading", filename: file.name });

      // 1. Compute the file hash. This is the first-line idempotency
      //    check — if we've already imported this exact file, we
      //    short-circuit before parsing.
      const bytes = await file.arrayBuffer();
      const { sha256HexBytes } = await import("../lib/bank/fingerprint");
      const fileHash = await sha256HexBytes(bytes);

      // 2. Pick the parser based on filename + MIME. Dynamic import
      //    keeps both parsers out of the initial bundle.
      setPhase({ kind: "parsing", filename: file.name, bank: null });
      const lower = file.name.toLowerCase();
      const isPdf =
        lower.endsWith(".pdf") || file.type === "application/pdf";
      const isCsv =
        lower.endsWith(".csv") ||
        file.type === "text/csv" ||
        file.type === "application/vnd.ms-excel";

      if (!isPdf && !isCsv) {
        setPhase({
          kind: "error",
          message: tr("importUnsupportedType", lang),
        });
        return;
      }

      const raw = isPdf
        ? await (await import("../lib/bank/pdf")).parsePdfStatement(
            file,
            fileHash,
          )
        : await (await import("../lib/bank/csv")).parseCsvStatement(
            file,
            fileHash,
          );

      setPhase({
        kind: "classifying",
        filename: file.name,
        count: raw.transactions.length,
      });

      // 3. Classify + detect recurrence + hash each row for
      //    idempotency. This is what turns a RawParsedStatement into
      //    something the store can persist.
      const { processStatement } = await import("../lib/bank/pipeline");
      const processed = await processStatement(raw);

      // 4. Persist. The store handles idempotency both locally and
      //    server-side, and returns a summary the UI shows.
      setPhase({
        kind: "saving",
        filename: file.name,
        count: processed.transactions.length,
      });
      const summary = await addBankStatement(processed);

      // 5. Build a preview list — the most-recent 12 transactions
      //    we just imported so the user sees exactly what landed.
      const previewFingerprints = new Set(
        processed.transactions.map((t) => t.fingerprint),
      );
      const preview = state.bankTransactions
        .filter((t) => previewFingerprints.has(t.fingerprint))
        .slice(0, 12);

      setPhase({
        kind: "done",
        summary,
        bank: processed.bank,
        previewTx: preview,
      });
    } catch (err) {
      // Anything the pipeline throws (parser, fingerprinter, store)
      // ends up here. We keep the message short + surface the raw
      // error's `message` for the technically curious.
      const message = err instanceof Error ? err.message : String(err);
      setPhase({ kind: "error", message });
    }
  };

  const startOver = () => setPhase({ kind: "idle" });

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
            {tr("importStatementTitle", lang)}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-8">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,application/pdf,text/csv"
          onChange={onFilePicked}
          className="hidden"
        />

        {phase.kind === "idle" && (
          <IdleState lang={lang} onChoose={chooseFile} />
        )}
        {(phase.kind === "reading" ||
          phase.kind === "parsing" ||
          phase.kind === "classifying" ||
          phase.kind === "saving") && (
          <ProgressState lang={lang} phase={phase} />
        )}
        {phase.kind === "error" && (
          <ErrorState
            lang={lang}
            message={phase.message}
            onRetry={startOver}
          />
        )}
        {phase.kind === "done" && (
          <DoneState
            lang={lang}
            summary={phase.summary}
            bank={phase.bank}
            preview={phase.previewTx}
            onImportAnother={startOver}
            onHome={() => onNavigate("home")}
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subviews
// ---------------------------------------------------------------------------

function IdleState({
  lang,
  onChoose,
}: {
  lang: Lang;
  onChoose: () => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <p className="text-white/70 text-sm leading-relaxed">
        {tr("importIdleBody", lang)}
      </p>

      <button
        onClick={onChoose}
        className="w-full py-4 rounded-2xl bg-kasi-gold text-bg font-semibold flex items-center justify-center gap-2 shadow-glow-gold"
      >
        <Upload size={18} />
        {tr("importChooseFile", lang)}
      </button>

      <div className="rounded-2xl border border-white/10 bg-bg-card/50 p-4 text-xs text-white/60 leading-relaxed">
        <div className="font-semibold text-white/80 mb-2">
          {tr("importSupportedHeader", lang)}
        </div>
        <ul className="list-disc pl-5 space-y-1">
          <li>{tr("importSupportCapitecFnb", lang)}</li>
          <li>{tr("importSupportCsvAny", lang)}</li>
          <li>{tr("importSupportOnDevice", lang)}</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-white/10 bg-bg-card/30 p-4 text-xs text-white/50 leading-relaxed">
        {tr("importPrivacyNote", lang)}
      </div>
    </div>
  );
}

function ProgressState({
  lang,
  phase,
}: {
  lang: Lang;
  phase:
    | { kind: "reading"; filename: string }
    | { kind: "parsing"; filename: string; bank: BankId | null }
    | { kind: "classifying"; filename: string; count: number }
    | { kind: "saving"; filename: string; count: number };
}) {
  const label = (() => {
    switch (phase.kind) {
      case "reading":
        return tr("importPhaseReading", lang);
      case "parsing":
        return tr("importPhaseParsing", lang);
      case "classifying":
        return trParams("importPhaseClassifying", lang, {
          count: phase.count,
        });
      case "saving":
        return trParams("importPhaseSaving", lang, {
          count: phase.count,
        });
    }
  })();

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <Loader2 className="animate-spin text-kasi-gold" size={40} />
      <div className="text-center">
        <div className="text-sm text-white font-semibold">{label}</div>
        <div className="text-xs text-white/50 mt-1 truncate max-w-[240px]">
          {phase.filename}
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  lang,
  message,
  onRetry,
}: {
  lang: Lang;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-kasi-coral/30 bg-kasi-coral/[0.06] p-4">
        <div className="text-kasi-coral font-semibold mb-1">
          {tr("importErrorTitle", lang)}
        </div>
        <div className="text-white/70 text-xs">{message}</div>
      </div>
      <button
        onClick={onRetry}
        className="w-full py-3 rounded-2xl border border-white/10 text-white/80 font-semibold flex items-center justify-center gap-2"
      >
        <RotateCcw size={16} />
        {tr("importTryAgain", lang)}
      </button>
    </div>
  );
}

function DoneState({
  lang,
  summary,
  bank,
  preview,
  onImportAnother,
  onHome,
}: {
  lang: Lang;
  summary: ImportSummary;
  bank: BankId;
  preview: BankTransaction[];
  onImportAnother: () => void;
  onHome: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Success banner */}
      <div className="rounded-2xl bg-kasi-green/[0.08] border border-kasi-green/25 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-kasi-green/20 border border-kasi-green/40 flex items-center justify-center shrink-0">
          <Check className="text-kasi-green" size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-kasi-green text-sm">
            {tr("importDoneTitle", lang)}
          </div>
          <div className="text-xs text-white/60 mt-0.5">
            {trParams("importDoneSubtitle", lang, {
              bank: bankDisplayName(bank),
            })}
          </div>
        </div>
      </div>

      {/* Counts */}
      <div className="rounded-2xl border border-white/10 p-4 space-y-2 text-sm">
        <SummaryRow
          label={tr("importSummaryTotal", lang)}
          value={String(summary.totalTransactions)}
        />
        <SummaryRow
          label={tr("importSummaryInserted", lang)}
          value={String(summary.inserted)}
          accent="green"
        />
        {summary.duplicates > 0 && (
          <SummaryRow
            label={tr("importSummaryDuplicates", lang)}
            value={String(summary.duplicates)}
            accent="muted"
          />
        )}
        {summary.dropped > 0 && (
          <SummaryRow
            label={tr("importSummaryDropped", lang)}
            value={String(summary.dropped)}
            accent="coral"
          />
        )}
      </div>

      {/* Warnings */}
      {summary.warnings.length > 0 && (
        <div className="rounded-2xl border border-kasi-gold/25 bg-kasi-gold/[0.06] p-4">
          <div className="text-kasi-gold font-semibold text-xs mb-2">
            {tr("importWarningsHeader", lang)}
          </div>
          <ul className="list-disc pl-5 space-y-1 text-xs text-white/70">
            {summary.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Transaction preview */}
      {preview.length > 0 && (
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-xs text-white/50">
            <FileText size={12} />
            {tr("importPreviewHeader", lang)}
          </div>
          <div className="divide-y divide-white/5">
            {preview.map((t) => (
              <PreviewRow key={t.id} tx={t} lang={lang} />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onImportAnother}
          className="flex-1 py-3 rounded-2xl border border-white/10 text-white/80 text-sm font-semibold"
        >
          {tr("importAnother", lang)}
        </button>
        <button
          onClick={onHome}
          className="flex-1 py-3 rounded-2xl bg-kasi-green text-bg text-sm font-semibold shadow-glow"
        >
          {tr("importBackHome", lang)}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  accent = "default",
}: {
  label: string;
  value: string;
  accent?: "default" | "green" | "coral" | "muted";
}) {
  const valueColor =
    accent === "green"
      ? "text-kasi-green"
      : accent === "coral"
        ? "text-kasi-coral"
        : accent === "muted"
          ? "text-white/50"
          : "text-white";
  return (
    <div className="flex items-center justify-between">
      <span className="text-white/70 text-xs">{label}</span>
      <span className={`font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}

function PreviewRow({ tx, lang }: { tx: BankTransaction; lang: Lang }) {
  const isIn = tx.direction === "in";
  const amountLabel = `${isIn ? "+" : "-"}${formatRand(tx.amount)}`;
  const date = new Date(tx.occurredAt);
  const dateLabel = date.toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "short",
  });
  const catLabel = classificationLabel(tx.classification, lang);
  return (
    <div className="px-4 py-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm text-white truncate">
          {tx.counterpartyName ?? tx.description}
        </div>
        <div className="text-[11px] text-white/50 mt-0.5">
          {dateLabel} · {catLabel}
        </div>
      </div>
      <div
        className={`text-sm font-semibold shrink-0 ${
          isIn ? "text-kasi-green" : "text-white"
        }`}
      >
        {amountLabel}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function bankDisplayName(bank: BankId): string {
  const NAMES: Record<BankId, string> = {
    capitec: "Capitec",
    fnb: "FNB",
    absa: "Absa",
    standard: "Standard Bank",
    nedbank: "Nedbank",
    tymebank: "TymeBank",
    discovery: "Discovery",
    investec: "Investec",
    african_bank: "African Bank",
    unknown: "Bank",
  };
  return NAMES[bank];
}

/**
 * Look up the localised display label for a classification. Kept as
 * an explicit `Record` so the i18n keys are statically typed and any
 * category added in future forces a compile error until the label is
 * added here.
 */
function classificationLabel(
  category: BankTransaction["classification"],
  lang: Lang,
): string {
  const KEYS: Record<BankTransaction["classification"], import("../i18n").TKey> = {
    unknown: "classificationUnknown",
    own_transfer: "classificationOwnTransfer",
    cash_deposit: "classificationCashDeposit",
    cash_withdrawal: "classificationCashWithdrawal",
    bank_fee: "classificationBankFee",
    airtime: "classificationAirtime",
    utility: "classificationUtility",
    rent_or_subscription: "classificationRentOrSubscription",
    supplier_like: "classificationSupplierLike",
    salary_like: "classificationSalaryLike",
    stokvel_related: "classificationStokvelRelated",
    loan_repayment: "classificationLoanRepayment",
    refund: "classificationRefund",
  };
  return tr(KEYS[category], lang);
}

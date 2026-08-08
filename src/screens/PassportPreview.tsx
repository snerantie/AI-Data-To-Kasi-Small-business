import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileText,
  Loader2,
  Share2,
  Sparkles,
} from "lucide-react";

import type { Screen } from "../App";
import type { Lang, TKey } from "../i18n";
import { tr, trParams } from "../i18n";
// NOTE: the passport module pulls in jsPDF (~200kB + html2canvas +
// DOMPurify transitively). Imported dynamically inside the click
// handlers below so users who never open the passport screen — and
// even users who do open it but don't tap Download/Share — never
// pay for that bundle in the initial page load.
import type { ScoreFactorKey } from "../lib/score";
import { formatRand, kasiScoreDetail, useStore } from "../store";

/**
 * On-screen preview of the "Financial Passport" PDF. Renders the same
 * information the PDF will contain — score, factors, tenure, quick
 * business/stokvel snapshot — plus Download + Share primary actions.
 *
 * Deliberately doesn't try to be a pixel-perfect preview of the PDF.
 * That would be another 400 lines of code for little value: users
 * hit Download once they trust the summary. Instead we surface the
 * key numbers they'd want to sanity-check before sending it to a
 * lender or funder.
 */
export function PassportPreview({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const { state, userId } = useStore();
  const detail = useMemo(() => kasiScoreDetail(state), [state]);

  const [busy, setBusy] = useState<null | "download" | "share">(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const passportInput = { state, detail, lang, userId };

  const runDownload = async () => {
    setError(null);
    setBusy("download");
    try {
      const mod = await import("../lib/passport");
      mod.downloadPassport(passportInput);
      setFlash("download");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      window.setTimeout(() => setFlash(null), 1800);
    }
  };

  const runShare = async () => {
    setError(null);
    setBusy("share");
    try {
      const mod = await import("../lib/passport");
      const result = await mod.sharePassport(passportInput);
      if (result.ok) {
        setFlash(result.via);
      } else {
        setError(result.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      window.setTimeout(() => setFlash(null), 1800);
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header with back */}
      <div className="flex items-center gap-3 px-5 pt-6 pb-4 border-b border-white/5">
        <button
          onClick={() => onNavigate("insights")}
          className="p-2 -ml-2 rounded-full text-white/70 hover:text-white"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="font-display text-xl font-semibold">
          {tr("passportTitle", lang)}
        </h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-8 space-y-5">
        <p className="text-white/70 text-sm leading-relaxed">
          {tr("passportSubtitle", lang)}
        </p>

        {/* Empty-state banner. If the account has no activity yet,
            we tell the user honestly and hide the numerical score
            plus the Download / Share buttons. Downloading an
            all-zero passport is misleading — better to route them
            back to log something first. */}
        {detail.insufficientData && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 flex flex-col gap-3">
            <div className="text-white font-semibold text-sm">
              {tr("scoreEmptyTitle", lang)}
            </div>
            <div className="text-white/60 text-xs leading-relaxed">
              {tr("scoreEmptyBody", lang)}
            </div>
            <button
              onClick={() => onNavigate("log")}
              className="mt-1 self-start px-4 py-2 rounded-full bg-kasi-green text-bg text-xs font-semibold"
            >
              {tr("scoreEmptyCta", lang)}
            </button>
          </div>
        )}

        {/* Hero: KasiScore snapshot (only shown when we have real
            data). Otherwise the empty-state banner above tells the
            user what to do next. */}
        {!detail.insufficientData && (
        <div className="relative rounded-3xl p-5 bg-gradient-to-br from-kasi-gold/25 via-kasi-green/15 to-bg-card border border-white/5">
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-widest text-white/50">
                {tr("pdfSectionScore", lang)}
              </div>
              <div className="font-display text-4xl font-bold mt-1 leading-none">
                {detail.score}
                <span className="text-lg text-white/40 font-normal ml-1">
                  / 850
                </span>
              </div>
              <div className="mt-2 text-kasi-green font-semibold text-sm">
                {tr(tierI18nKey(detail.tier), lang)}
              </div>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <FileText size={22} className="text-kasi-gold" />
            </div>
          </div>

          {state.profile.ownerName && (
            <div className="mt-4 pt-3 border-t border-white/5">
              <div className="text-[10px] uppercase tracking-widest text-white/50">
                {tr("pdfSectionOwner", lang)}
              </div>
              <div className="text-lg font-semibold mt-0.5">
                {state.profile.ownerName}
              </div>
              {state.profile.businessName && (
                <div className="text-white/60 text-sm mt-0.5">
                  {state.profile.businessName}
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Factor mini-list — what's in the PDF */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2 flex items-center gap-1.5">
            <Sparkles size={12} className="text-kasi-gold" />
            {tr("scoreBreakdownTitle", lang)}
          </div>
          <div className="rounded-2xl bg-bg-card border border-white/5 p-4 flex flex-col gap-2.5">
            {detail.factors.map((f) => (
              <div key={f.key} className="flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0 truncate text-white/80">
                  {tr(FACTOR_NAME_KEY[f.key], lang)}
                </div>
                <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={
                      "h-full " +
                      (f.normalised >= 75
                        ? "bg-kasi-green"
                        : f.normalised >= 50
                          ? "bg-kasi-gold"
                          : "bg-kasi-coral")
                    }
                    style={{ width: `${Math.max(4, f.normalised)}%` }}
                  />
                </div>
                <div className="tabular-nums text-white/60 text-xs w-8 text-right">
                  {f.normalised}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* What's inside the PDF (data snapshot) */}
        <div>
          <div className="text-[11px] uppercase tracking-wider text-white/50 mb-2">
            {tr("passportPreviewNote", lang)}
          </div>
          <div className="rounded-2xl bg-bg-card border border-white/5 p-4 flex flex-col gap-2.5 text-sm">
            {state.sales.length > 0 && (
              <SnapshotRow
                label={tr("pdfSectionSalesActivity", lang)}
                value={trParams("scoreFactorContribToScore", lang, { pts: state.sales.length })}
              />
            )}
            {state.tabs.length > 0 && (
              <SnapshotRow
                label={tr("pdfSectionTabDiscipline", lang)}
                value={`${state.tabs.filter((t) => t.paid).length} / ${state.tabs.length}`}
              />
            )}
            {state.stokvel ? (
              <SnapshotRow
                label={tr("pdfSectionStokvelSavings", lang)}
                value={formatRand(
                  state.stokvel.contributions
                    .filter((c) => (c.status ?? "confirmed") === "confirmed")
                    .filter((c) => c.ownerId === userId)
                    .reduce((s, c) => s + c.amount, 0),
                )}
              />
            ) : (
              <div className="text-white/50 text-sm italic">
                {tr("pdfNoStokvel", lang)}
              </div>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="rounded-2xl bg-kasi-coral/[0.08] border border-kasi-coral/30 text-kasi-coral text-sm p-3">
            {error}
          </div>
        )}

        {/* Actions.
            When the account has insufficient data we hide the
            Download and Share buttons — the passport at 300/850
            with zero data conveys nothing useful, and letting
            a user share one just because the buttons are there
            invites the exact "why does it say 530 with no data"
            confusion we're fixing in this PR. */}
        {!detail.insufficientData && (
          <div className="flex flex-col gap-2">
            <button
              onClick={runDownload}
              disabled={busy !== null}
              className={
                "py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 " +
                (busy === null
                  ? "bg-kasi-green text-bg shadow-glow"
                  : "bg-white/5 text-white/30 cursor-not-allowed")
              }
            >
              {busy === "download" ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Download size={18} />
              )}
              {tr("passportDownloadBtn", lang)}
            </button>
            <button
              onClick={runShare}
              disabled={busy !== null}
              className={
                "py-3.5 rounded-2xl font-semibold text-base flex items-center justify-center gap-2 " +
                (busy === null
                  ? "bg-bg-card border border-white/10 text-white/80"
                  : "bg-white/5 text-white/30 cursor-not-allowed")
              }
            >
              {busy === "share" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Share2 size={16} />
              )}
              {tr("passportShareBtn", lang)}
            </button>
          </div>
        )}

        {/* Timestamp + disclaimer */}
        <div className="text-white/40 text-xs text-center">
          {trParams("passportGeneratedOn", lang, {
            date: new Date(detail.computedAt).toLocaleDateString(),
          })}
        </div>
      </div>

      {/* Flash toast */}
      <AnimatePresence>
        {flash !== null && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-6 left-4 right-4 rounded-2xl bg-kasi-green text-bg px-4 py-3 font-semibold text-center shadow-glow"
          >
            {flash === "download"
              ? tr("passportDownloadBtn", lang) + " ✓"
              : flash === "share"
                ? tr("passportShareBtn", lang) + " ✓"
                : "✓"}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact label / value row for the preview snapshot card.
function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/60 text-xs uppercase tracking-wider">
        {label}
      </span>
      <span className="text-white font-semibold text-sm text-right">
        {value}
      </span>
    </div>
  );
}

// Local copy of the tier-to-i18n lookup used by the PDF module.
// Duplicated here because the PDF module isn't a natural home for
// screen-side UI helpers and importing it just for this one map
// would pull jsPDF into the initial screen bundle.
function tierI18nKey(
  tier: "building" | "fair" | "good" | "excellent",
): TKey {
  switch (tier) {
    case "excellent":
      return "scoreLabelExcellent";
    case "good":
      return "scoreLabelGood";
    case "fair":
      return "scoreLabelFair";
    case "building":
      return "scoreTierBuilding";
  }
}

// Factor-key → i18n-name lookup, mirroring the one inside passport.ts.
// Local so this screen has no runtime dependency on the PDF renderer.
const FACTOR_NAME_KEY: Record<ScoreFactorKey, TKey> = {
  contribution_consistency: "factorContribConsistency",
  contribution_volume: "factorContribVolume",
  tab_repayment: "factorTabRepayment",
  sales_activity: "factorSalesActivity",
  time_on_platform: "factorTimeOnPlatform",
  profile_maturity: "factorProfileMaturity",
  recent_momentum: "factorRecentMomentum",
  // PR #22 — new eighth factor for evidence quality.
  evidence_confidence: "factorEvidenceConfidence",
};

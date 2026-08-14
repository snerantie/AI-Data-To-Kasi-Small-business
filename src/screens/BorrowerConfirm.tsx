import { useEffect, useState } from "react";
import { CheckCircle2, Check, ShieldCheck } from "lucide-react";
import { LanguageSelect } from "../components/LanguageSelect";
import type { Lang } from "../i18n";
import { tr } from "../i18n";
import { formatRand } from "../store";
import { isValidSaId } from "../lib/saId";
import { fetchLoanForConfirmation, confirmLoanByToken } from "../lib/remote";
import { parseConfirmTokenFromUrl } from "../lib/inviteLink";

/**
 * Public, no-login borrower confirmation screen (borrower identity,
 * Phase 2). Reached at `/confirm/?t=<token>` — App.tsx renders this
 * standalone, before the app shell / splash / onboarding, so a
 * stranger only ever sees this one focused page.
 *
 * The borrower sees the loan a mashonisa recorded for them, enters
 * their own SA ID + name, agrees, and submits. The write happens
 * server-side via a scoped anon RPC (see confirmLoanByToken) — this
 * screen never touches the loans table directly.
 */

type LoanSummary = {
  borrowerName: string;
  amountLent: number;
  agreedRepaymentDate: string | null;
};

type Phase =
  | { k: "loading" }
  | { k: "notfound" }
  | { k: "form"; summary: LoanSummary }
  | { k: "submitting"; summary: LoanSummary }
  | { k: "error"; summary: LoanSummary }
  | { k: "success" };

export function BorrowerConfirm() {
  const [lang, setLang] = useState<Lang>("en");
  const [token] = useState<string | null>(() => parseConfirmTokenFromUrl());
  const [phase, setPhase] = useState<Phase>({ k: "loading" });
  const [name, setName] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!token) {
      setPhase({ k: "notfound" });
      return;
    }
    (async () => {
      const summary = await fetchLoanForConfirmation(token);
      if (!alive) return;
      if (!summary) {
        setPhase({ k: "notfound" });
        return;
      }
      setName(summary.borrowerName ?? "");
      setPhase({ k: "form", summary });
    })();
    return () => {
      alive = false;
    };
  }, [token]);

  const idOk = isValidSaId(idNumber);
  const canSubmit = idOk && agreed && name.trim().length > 0;

  const submit = async () => {
    if (!token || !canSubmit) return;
    if (phase.k !== "form" && phase.k !== "error") return;
    const summary = phase.summary;
    setPhase({ k: "submitting", summary });
    const res = await confirmLoanByToken(
      token,
      idNumber.replace(/\s+/g, ""),
      name.trim(),
    );
    if (res.ok) setPhase({ k: "success" });
    else setPhase({ k: "error", summary });
  };

  const summary =
    phase.k === "form" || phase.k === "submitting" || phase.k === "error"
      ? phase.summary
      : null;
  const submitting = phase.k === "submitting";

  return (
    <div className="min-h-screen w-full bg-bg text-white font-body antialiased">
      <div className="max-w-md mx-auto px-5 py-8">
        {/* Brand + language */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-kasi-green to-kasi-gold flex items-center justify-center font-display font-bold text-bg text-sm">
              K
            </div>
            <span className="font-display font-bold text-lg">KasiKash</span>
          </div>
          <div className="w-36">
            <LanguageSelect value={lang} onChange={setLang} />
          </div>
        </div>

        {phase.k === "loading" && (
          <div className="text-white/60 text-sm py-16 text-center">
            {tr("bcLoading", lang)}
          </div>
        )}

        {phase.k === "notfound" && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-center">
            <h1 className="font-display text-2xl font-bold">
              {tr("bcNotFoundTitle", lang)}
            </h1>
            <p className="text-white/60 text-sm mt-3 leading-relaxed">
              {tr("bcNotFoundBody", lang)}
            </p>
          </div>
        )}

        {phase.k === "success" && (
          <div className="rounded-3xl border border-kasi-green/30 bg-kasi-green/[0.06] p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-kasi-green/15 border border-kasi-green/30 text-kasi-green flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="font-display text-2xl font-bold mt-4">
              {tr("bcSuccessTitle", lang)}
            </h1>
            <p className="text-white/70 text-sm mt-3 leading-relaxed">
              {tr("bcSuccessBody", lang)}
            </p>
          </div>
        )}

        {summary && (
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="font-display text-2xl font-bold">
                {tr("bcTitle", lang)}
              </h1>
              <p className="text-white/60 text-sm mt-2 leading-relaxed">
                {tr("bcSubtitle", lang)}
              </p>
            </div>

            {/* Loan summary */}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-white/60 text-sm">
                  {tr("mashonisaAmountLent", lang)}
                </span>
                <span className="font-display text-2xl font-bold text-kasi-gold">
                  {formatRand(summary.amountLent)}
                </span>
              </div>
              {summary.agreedRepaymentDate && (
                <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-white/10">
                  <span className="text-white/60 text-sm">
                    {tr("mashonisaRepaymentDate", lang)}
                  </span>
                  <span className="text-white/90 text-sm font-medium">
                    {summary.agreedRepaymentDate}
                  </span>
                </div>
              )}
            </div>

            {/* Name */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-white/50">
                {tr("bcNameLabel", lang)}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={120}
                className="px-4 py-3 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green transition-colors"
              />
            </label>

            {/* ID number */}
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] uppercase tracking-wider text-white/50">
                {tr("mashonisaIdLabel", lang)}
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value)}
                placeholder={tr("mashonisaIdPlaceholder", lang)}
                maxLength={20}
                className="px-4 py-3 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green transition-colors"
              />
              {idNumber.trim().length > 0 && (
                <span
                  className={
                    "text-xs " + (idOk ? "text-kasi-green" : "text-kasi-coral")
                  }
                >
                  {idOk
                    ? tr("mashonisaIdValid", lang)
                    : tr("mashonisaIdInvalid", lang)}
                </span>
              )}
            </label>

            {/* Agreement */}
            <button
              type="button"
              onClick={() => setAgreed((v) => !v)}
              className="flex items-start gap-3 text-left rounded-2xl bg-white/[0.02] border border-white/10 p-4"
            >
              <div
                className={
                  "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 " +
                  (agreed
                    ? "border-kasi-green bg-kasi-green text-bg"
                    : "border-white/25")
                }
              >
                {agreed && <Check size={13} />}
              </div>
              <div className="text-xs text-white/70 leading-relaxed">
                <span className="font-semibold text-white/90">
                  {tr("mashonisaAgreeConfirm", lang)}
                </span>
                {" — "}
                {tr("mashonisaAgreeText", lang)}
              </div>
            </button>

            {phase.k === "error" && (
              <div className="rounded-xl bg-kasi-coral/[0.08] border border-kasi-coral/25 text-kasi-coral text-sm px-4 py-3">
                {tr("bcError", lang)}
              </div>
            )}

            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className={
                "py-3.5 rounded-full font-semibold flex items-center justify-center gap-2 transition-colors " +
                (canSubmit && !submitting
                  ? "bg-kasi-green text-bg hover:bg-kasi-green/90 shadow-glow"
                  : "bg-white/5 text-white/30 cursor-not-allowed")
              }
            >
              <ShieldCheck size={16} />
              {submitting ? tr("bcLoading", lang) : tr("bcSubmit", lang)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

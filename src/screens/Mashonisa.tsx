/**
 * Mashonisa service screen (PR #35).
 *
 * A loan-book for informal money lenders: record loans out, log
 * repayments, see what's still owed. Cash-native and evidence-tiered,
 * consistent with the KasiScore credit-signal thesis — a mashonisa's
 * repayment history is some of the strongest behavioural evidence a
 * lender partner could want.
 *
 * Reachable via the Services hub (Services → Mashonisa → Enter). Only
 * users who have enabled the mashonisa service see it; the App-level
 * router won't route here otherwise.
 *
 * Kept intentionally focused: loans + repayments + status. No
 * interest-schedule maths beyond a flat percentage, no reminders, no
 * borrower accounts. Those can come once the pilot shows mashonisas
 * actually use this.
 */

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  HandCoins,
  Landmark,
  Loader2,
  Plus,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import type { Screen } from "../App";
import type { Lang } from "../i18n";
import { tr, trParams } from "../i18n";
import { buildBorrowerConfirmUrl } from "../lib/inviteLink";
import type {
  BorrowerConfirmation,
  MashonisaBanking,
  MashonisaLoan,
  MashonisaLoanStatus,
} from "../store";
import { formatRand, useStore } from "../store";
import { isValidSaId, maskSaId } from "../lib/saId";

export function Mashonisa({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const {
    state,
    addMashonisaLoan,
    addMashonisaRepayment,
    setMashonisaLoanStatus,
    removeMashonisaLoan,
    saveMashonisaBankingDetails,
  } = useStore();
  const loans = state.loans;
  const banking = state.mashonisaBanking;
  const hasBanking = Boolean(
    banking &&
      (banking.accountNumber || banking.payshapPhone) &&
      banking.bankName,
  );

  const [sheet, setSheet] = useState<
    | null
    | "new-loan"
    | "banking"
    | { kind: "repay"; loanId: string }
  >(null);

  // -- Aggregates for the hero cards --
  const totalOnLoan = loans
    .filter((l) => l.status !== "repaid" && l.status !== "defaulted")
    .reduce((sum, l) => sum + l.amountLent, 0);
  const totalOutstanding = loans.reduce((sum, l) => {
    if (l.status === "repaid" || l.status === "defaulted") return sum;
    const target = l.amountLent * (1 + l.interestPercentage / 100);
    return sum + Math.max(0, target - l.amountRepaid);
  }, 0);
  const totalRepaid = loans.reduce((sum, l) => sum + l.amountRepaid, 0);

  return (
    <div className="h-full overflow-y-auto pb-32 px-5 pt-8">
      {/* Header with back-to-services */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => onNavigate("services")}
          className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/70"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-kasi-gold/15 border border-kasi-gold/30 flex items-center justify-center text-kasi-gold">
            <HandCoins size={18} />
          </div>
          <div>
            <div className="font-display text-xl font-semibold leading-none">
              {tr("mashonisaTitle", lang)}
            </div>
            <div className="text-white/50 text-xs mt-0.5">
              {tr("mashonisaSubtitle", lang)}
            </div>
          </div>
        </div>
      </div>

      {/* Hero cards */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <HeroStat
          label={tr("mashonisaOutTitle", lang)}
          value={formatRand(totalOnLoan)}
          accent="text-white"
        />
        <HeroStat
          label={tr("mashonisaOutstandingTitle", lang)}
          value={formatRand(totalOutstanding)}
          accent="text-kasi-gold"
        />
        <HeroStat
          label={tr("mashonisaRepaidTitle", lang)}
          value={formatRand(totalRepaid)}
          accent="text-kasi-green"
        />
      </div>

      {/* Banking setup prompt / summary (PR #36).
          Borrowers pay loans back via the app using these details.
          Empty-state nudge when not set up; compact summary + edit
          once configured. */}
      {!hasBanking ? (
        <button
          onClick={() => setSheet("banking")}
          className="w-full mb-4 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-kasi-green/[0.06] border border-kasi-green/30 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-kasi-green/15 border border-kasi-green/30 flex items-center justify-center text-kasi-green shrink-0">
            <Landmark size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm">
              {tr("mashonisaBankingEmptyTitle", lang)}
            </div>
            <div className="text-white/60 text-xs mt-0.5 leading-relaxed">
              {tr("mashonisaBankingEmptyBody", lang)}
            </div>
          </div>
          <span className="text-kasi-green shrink-0 self-center">→</span>
        </button>
      ) : (
        <button
          onClick={() => setSheet("banking")}
          className="w-full mb-4 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.02] border border-white/10 text-left"
        >
          <Landmark size={16} className="text-kasi-green shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">
              {banking?.bankName}
              {banking?.accountNumber ? ` · ${banking.accountNumber}` : ""}
            </div>
            <div className="text-white/40 text-[11px]">
              {tr("mashonisaBankingConfigured", lang)}
            </div>
          </div>
          <span className="text-white/40 text-xs shrink-0">
            {tr("payUpdateKey", lang)}
          </span>
        </button>
      )}

      {/* New loan button */}
      <button
        onClick={() => setSheet("new-loan")}
        className="w-full py-4 rounded-2xl bg-kasi-gold text-bg font-display font-bold flex items-center justify-center gap-2 shadow-gold mb-6"
      >
        <Plus size={18} />
        {tr("mashonisaAddLoan", lang)}
      </button>

      {/* Loan list OR empty state */}
      {loans.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-8 flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-kasi-gold/10 border border-kasi-gold/25 flex items-center justify-center text-kasi-gold">
            <HandCoins size={26} />
          </div>
          <div className="text-white font-semibold">
            {tr("mashonisaEmptyTitle", lang)}
          </div>
          <div className="text-white/55 text-sm max-w-[260px] leading-relaxed">
            {tr("mashonisaEmptyBody", lang)}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              lang={lang}
              onRepay={() =>
                setSheet({ kind: "repay", loanId: loan.id })
              }
              onMarkDefaulted={() =>
                setMashonisaLoanStatus(loan.id, "defaulted")
              }
              onDelete={() => removeMashonisaLoan(loan.id)}
            />
          ))}
        </div>
      )}

      {/* Sheets */}
      <AnimatePresence>
        {sheet === "new-loan" && (
          <NewLoanSheet
            lang={lang}
            onClose={() => setSheet(null)}
            onSave={(input) => {
              addMashonisaLoan(input);
              setSheet(null);
            }}
          />
        )}
        {sheet === "banking" && (
          <BankingSheet
            lang={lang}
            existing={banking}
            onClose={() => setSheet(null)}
            onSave={saveMashonisaBankingDetails}
          />
        )}
        {sheet && typeof sheet === "object" && sheet.kind === "repay" && (
          <RepaymentSheet
            lang={lang}
            loan={loans.find((l) => l.id === sheet.loanId) ?? null}
            banking={hasBanking ? banking : null}
            onClose={() => setSheet(null)}
            onSave={(amount, method) => {
              addMashonisaRepayment(sheet.loanId, { amount, method });
              setSheet(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function HeroStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl bg-bg-card border border-white/5 p-3">
      <div className="text-white/50 text-[9px] uppercase tracking-wider leading-tight">
        {label}
      </div>
      <div className={"font-display font-bold text-base mt-1 " + accent}>
        {value}
      </div>
    </div>
  );
}

function statusMeta(status: MashonisaLoanStatus): {
  key:
    | "mashonisaStatusOpen"
    | "mashonisaStatusPartial"
    | "mashonisaStatusRepaid"
    | "mashonisaStatusDefaulted";
  color: string;
  bg: string;
} {
  switch (status) {
    case "repaid":
      return {
        key: "mashonisaStatusRepaid",
        color: "text-kasi-green",
        bg: "bg-kasi-green/10 border-kasi-green/30",
      };
    case "partial":
      return {
        key: "mashonisaStatusPartial",
        color: "text-kasi-gold",
        bg: "bg-kasi-gold/10 border-kasi-gold/30",
      };
    case "defaulted":
      return {
        key: "mashonisaStatusDefaulted",
        color: "text-kasi-coral",
        bg: "bg-kasi-coral/10 border-kasi-coral/30",
      };
    default:
      return {
        key: "mashonisaStatusOpen",
        color: "text-white/70",
        bg: "bg-white/[0.03] border-white/10",
      };
  }
}

function LoanCard({
  loan,
  lang,
  onRepay,
  onMarkDefaulted,
  onDelete,
}: {
  loan: MashonisaLoan;
  lang: Lang;
  onRepay: () => void;
  onMarkDefaulted: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = statusMeta(loan.status);
  const target = loan.amountLent * (1 + loan.interestPercentage / 100);
  const outstanding = Math.max(0, target - loan.amountRepaid);
  const progress = target > 0 ? Math.min(1, loan.amountRepaid / target) : 0;
  const settled = loan.status === "repaid" || loan.status === "defaulted";

  return (
    <motion.div
      layout
      className="rounded-2xl bg-bg-card border border-white/5 overflow-hidden"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-white truncate">
              {loan.borrowerName}
            </div>
            {loan.borrowerIdNumber ? (
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                <span className="text-kasi-green">
                  {tr("mashonisaIdConfirmedBadge", lang)}
                </span>
                <span className="text-white/40 font-mono">
                  {maskSaId(loan.borrowerIdNumber)}
                </span>
              </div>
            ) : loan.borrowerConfirmation === "awaiting" ? (
              <div className="mt-0.5 text-[11px] text-kasi-gold">
                {tr("mashonisaAwaitingBadge", lang)}
              </div>
            ) : loan.borrowerConfirmation === "unverified" ? (
              <div className="mt-0.5 text-[11px] text-white/40">
                {tr("mashonisaUnverifiedBadge", lang)}
              </div>
            ) : null}
            <div className="text-white/50 text-xs mt-0.5">
              {formatRand(loan.amountRepaid)} {tr("mashonisaOf", lang)}{" "}
              {formatRand(target)}
              {loan.interestPercentage > 0 && (
                <span className="text-white/30">
                  {" "}
                  · {loan.interestPercentage}%
                </span>
              )}
            </div>
          </div>
          <div
            className={
              "shrink-0 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border " +
              meta.bg +
              " " +
              meta.color
            }
          >
            {tr(meta.key, lang)}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={
              "h-full rounded-full transition-all " +
              (loan.status === "defaulted"
                ? "bg-kasi-coral"
                : loan.status === "repaid"
                  ? "bg-kasi-green"
                  : "bg-kasi-gold")
            }
            style={{ width: `${Math.max(3, progress * 100)}%` }}
          />
        </div>

        {!settled && (
          <div className="mt-2 text-xs text-white/60">
            {tr("mashonisaOutstandingTitle", lang)}:{" "}
            <span className="text-kasi-gold font-semibold">
              {formatRand(outstanding)}
            </span>
          </div>
        )}
      </button>

      {/* Awaiting remote confirmation — share the link so the borrower
          confirms their ID on their own phone. */}
      {loan.borrowerConfirmation === "awaiting" && loan.confirmationToken && (
        <div className="px-4 pb-4 -mt-1">
          <button
            onClick={() => {
              const url = buildBorrowerConfirmUrl(loan.confirmationToken!);
              const message = trParams(
                "mashonisaConfirmWhatsAppMessage",
                lang,
                { amount: Math.round(loan.amountLent), url },
              );
              window.open(
                "https://wa.me/?text=" + encodeURIComponent(message),
                "_blank",
                "noopener",
              );
            }}
            className="w-full py-2.5 rounded-xl bg-kasi-gold/15 border border-kasi-gold/30 text-kasi-gold text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Send size={15} />
            {tr("mashonisaShareLink", lang)}
          </button>
        </div>
      )}

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4 border-t border-white/5 pt-3 flex flex-col gap-2"
          >
            {loan.notes && (
              <div className="text-white/60 text-xs italic">
                {loan.notes}
              </div>
            )}
            {/* Repayment history */}
            {loan.repayments.length > 0 && (
              <div className="flex flex-col gap-1">
                {loan.repayments.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-xs text-white/60"
                  >
                    <span>{new Date(r.paidAt).toLocaleDateString()}</span>
                    <span className="text-kasi-green font-mono">
                      +{formatRand(r.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!settled && (
              <div className="flex gap-2 mt-1">
                <button
                  onClick={onRepay}
                  className="flex-1 py-2.5 rounded-xl bg-kasi-green text-bg text-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <Check size={14} />
                  {tr("mashonisaRecordRepayment", lang)}
                </button>
                <button
                  onClick={onMarkDefaulted}
                  className="px-3 py-2.5 rounded-xl bg-kasi-coral/10 border border-kasi-coral/30 text-kasi-coral text-xs font-medium"
                >
                  {tr("mashonisaMarkDefaulted", lang)}
                </button>
              </div>
            )}
            <button
              onClick={onDelete}
              className="mt-1 py-2 rounded-xl bg-white/[0.02] border border-white/10 text-white/50 text-xs flex items-center justify-center gap-1.5"
            >
              <Trash2 size={12} />
              {tr("mashonisaDeleteLoan", lang)}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sheets
// ---------------------------------------------------------------------------

function SheetShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full md:max-w-md bg-bg-soft border-t md:border border-white/10 md:rounded-3xl rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="font-display font-bold text-lg">{title}</div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:bg-white/5"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "decimal";
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-white/50">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode ?? "text"}
        type={type ?? "text"}
        className="px-4 py-3 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-gold"
      />
    </label>
  );
}

function NewLoanSheet({
  lang,
  onClose,
  onSave,
}: {
  lang: Lang;
  onClose: () => void;
  onSave: (input: {
    borrowerName: string;
    borrowerPhone?: string;
    borrowerIdNumber?: string;
    borrowerConfirmation?: BorrowerConfirmation;
    consentAt?: number;
    confirmationToken?: string;
    amountLent: number;
    interestPercentage?: number;
    agreedRepaymentDate?: string;
    notes?: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [interest, setInterest] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  // Borrower identity capture. Phase 1 supports "borrower is here"
  // (they enter their SA ID + agree on this phone) and "cash only"
  // (no ID). The remote confirmation link is Phase 2.
  const [mode, setMode] = useState<"in_person" | "awaiting" | "unverified">(
    "in_person",
  );
  const [idNumber, setIdNumber] = useState("");
  const [agreed, setAgreed] = useState(false);

  const amountNum = parseFloat(amount);
  const idOk = isValidSaId(idNumber);
  const baseOk = name.trim().length > 0 && amountNum > 0;
  // Only in-person capture needs the ID + agreement up front. "Send a
  // link" (awaiting) and cash-only just need the basics; the borrower
  // supplies their ID remotely in the awaiting case.
  const canSubmit = mode === "in_person" ? baseOk && idOk && agreed : baseOk;

  return (
    <SheetShell title={tr("mashonisaAddLoan", lang)} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Field
          label={tr("mashonisaBorrowerName", lang)}
          value={name}
          onChange={setName}
          placeholder={tr("mashonisaBorrowerNamePlaceholder", lang)}
        />
        <Field
          label={tr("mashonisaBorrowerPhone", lang)}
          value={phone}
          onChange={setPhone}
          inputMode="tel"
        />
        <Field
          label={tr("mashonisaAmountLent", lang)}
          value={amount}
          onChange={setAmount}
          inputMode="decimal"
          placeholder="0"
        />
        <Field
          label={tr("mashonisaInterest", lang)}
          value={interest}
          onChange={setInterest}
          inputMode="decimal"
          placeholder="0"
        />
        <Field
          label={tr("mashonisaRepaymentDate", lang)}
          value={dueDate}
          onChange={setDueDate}
          type="date"
        />
        <Field
          label={tr("mashonisaNotes", lang)}
          value={notes}
          onChange={setNotes}
        />

        {/* Borrower confirmation — bind the loan to a real identity so
            the borrower is accountable and it builds their record. */}
        <div>
          <div className="text-xs uppercase tracking-wider text-white/50 mb-2">
            {tr("mashonisaConfirmTitle", lang)}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode("in_person")}
              className={
                "py-2.5 rounded-xl text-sm font-medium border transition-colors " +
                (mode === "in_person"
                  ? "bg-kasi-gold text-bg border-kasi-gold"
                  : "bg-bg-card text-white/70 border-white/10")
              }
            >
              {tr("mashonisaBorrowerHere", lang)}
            </button>
            <button
              type="button"
              onClick={() => setMode("unverified")}
              className={
                "py-2.5 rounded-xl text-sm font-medium border transition-colors " +
                (mode === "unverified"
                  ? "bg-kasi-gold text-bg border-kasi-gold"
                  : "bg-bg-card text-white/70 border-white/10")
              }
            >
              {tr("mashonisaCashOnly", lang)}
            </button>
          </div>

          {/* Remote confirmation — the borrower confirms via a link. */}
          <button
            type="button"
            onClick={() => setMode("awaiting")}
            className={
              "mt-2 w-full py-2.5 rounded-xl text-sm font-medium border transition-colors " +
              (mode === "awaiting"
                ? "bg-kasi-gold text-bg border-kasi-gold"
                : "bg-bg-card text-white/70 border-white/10")
            }
          >
            {tr("mashonisaSendLink", lang)}
          </button>

          {mode === "awaiting" && (
            <div className="mt-3 rounded-2xl bg-white/[0.02] border border-white/10 p-3 text-xs text-white/60 leading-relaxed">
              {tr("mashonisaAwaitingHint", lang)}
            </div>
          )}

          {mode === "in_person" && (
            <div className="mt-3 flex flex-col gap-3">
              <div>
                <Field
                  label={tr("mashonisaIdLabel", lang)}
                  value={idNumber}
                  onChange={setIdNumber}
                  inputMode="numeric"
                  placeholder={tr("mashonisaIdPlaceholder", lang)}
                />
                {idNumber.trim().length > 0 && (
                  <div
                    className={
                      "text-xs mt-1 " +
                      (idOk ? "text-kasi-green" : "text-kasi-coral")
                    }
                  >
                    {idOk
                      ? tr("mashonisaIdValid", lang)
                      : tr("mashonisaIdInvalid", lang)}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAgreed((v) => !v)}
                className="flex items-start gap-3 text-left rounded-2xl bg-white/[0.02] border border-white/10 p-3"
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
            </div>
          )}
        </div>

        <button
          onClick={() =>
            onSave({
              borrowerName: name,
              borrowerPhone: phone || undefined,
              borrowerIdNumber: mode === "in_person" ? idNumber : undefined,
              borrowerConfirmation: mode,
              consentAt: mode === "in_person" ? Date.now() : undefined,
              confirmationToken:
                mode === "awaiting" ? crypto.randomUUID() : undefined,
              amountLent: amountNum,
              interestPercentage: interest ? parseFloat(interest) : 0,
              agreedRepaymentDate: dueDate || undefined,
              notes: notes || undefined,
            })
          }
          disabled={!canSubmit}
          className={
            "mt-1 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 " +
            (canSubmit
              ? "bg-kasi-gold text-bg shadow-gold"
              : "bg-white/5 text-white/30 cursor-not-allowed")
          }
        >
          <HandCoins size={16} />
          {tr("mashonisaSaveLoan", lang)}
        </button>
      </div>
    </SheetShell>
  );
}

function RepaymentSheet({
  lang,
  loan,
  banking,
  onClose,
  onSave,
}: {
  lang: Lang;
  loan: MashonisaLoan | null;
  banking: MashonisaBanking | null;
  onClose: () => void;
  onSave: (
    amount: number,
    method: "cash" | "eft" | "payshap" | "card" | "other",
  ) => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<
    "cash" | "eft" | "payshap" | "card" | "other"
  >(banking ? "eft" : "cash");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const amountNum = parseFloat(amount);
  const canSubmit = amountNum > 0 && !saving;

  if (!loan) {
    // Loan was deleted while the sheet was mid-open — close gracefully.
    onClose();
    return null;
  }

  const copy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard blocked — silently ignore; the value is visible.
    }
  };

  const methods: {
    key: "cash" | "eft" | "payshap" | "card" | "other";
    label: string;
  }[] = [
    { key: "cash", label: "Cash" },
    { key: "eft", label: "EFT" },
    { key: "payshap", label: "PayShap" },
    { key: "card", label: "Card" },
    { key: "other", label: "Other" },
  ];

  return (
    <SheetShell title={tr("mashonisaRecordRepayment", lang)} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="text-white/60 text-sm">
          {loan.borrowerName}
        </div>

        {/* Pay-here panel — where the borrower should send the money.
            Only shown when the lender has set up banking. The
            borrower reference is the loan's borrower name so the
            lender can match the incoming payment. */}
        {banking && (
          <div className="rounded-2xl border border-kasi-green/30 bg-gradient-to-br from-kasi-green/[0.08] to-transparent p-4">
            <div className="flex items-center gap-2 text-kasi-green text-xs font-semibold uppercase tracking-wider mb-2">
              <Landmark size={13} />
              {tr("mashonisaPayHereTitle", lang)}
            </div>
            <div className="text-white/60 text-xs mb-3 leading-relaxed">
              {tr("mashonisaPayHereBody", lang)}
            </div>
            <div className="flex flex-col gap-1.5">
              {banking.payshapPhone && (
                <PayRow
                  label={tr("bankPayshapPhone", lang)}
                  value={banking.payshapPhone}
                  onCopy={() =>
                    copy("payshap", banking.payshapPhone as string)
                  }
                  copied={copied === "payshap"}
                />
              )}
              {banking.bankName && (
                <PayRow label={tr("bankName", lang)} value={banking.bankName} />
              )}
              {banking.accountNumber && (
                <PayRow
                  label={tr("bankAccountNumber", lang)}
                  value={banking.accountNumber}
                  onCopy={() =>
                    copy("acc", banking.accountNumber as string)
                  }
                  copied={copied === "acc"}
                />
              )}
              {banking.branchCode && (
                <PayRow
                  label={tr("bankBranchCode", lang)}
                  value={banking.branchCode}
                />
              )}
              <PayRow
                label={tr("mashonisaPayReference", lang)}
                value={loan.borrowerName}
              />
            </div>
          </div>
        )}

        <Field
          label={tr("mashonisaRepaymentAmount", lang)}
          value={amount}
          onChange={setAmount}
          inputMode="decimal"
          placeholder="0"
        />
        <div className="flex flex-wrap gap-2">
          {methods.map((m) => (
            <button
              key={m.key}
              onClick={() => setMethod(m.key)}
              className={
                "px-3 py-2 rounded-xl text-sm font-medium border " +
                (method === m.key
                  ? "bg-kasi-green/15 border-kasi-green/40 text-kasi-green"
                  : "bg-white/[0.02] border-white/10 text-white/60")
              }
            >
              {m.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setSaving(true);
            onSave(amountNum, method);
          }}
          disabled={!canSubmit}
          className={
            "mt-1 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 " +
            (canSubmit
              ? "bg-kasi-green text-bg shadow-glow"
              : "bg-white/5 text-white/30 cursor-not-allowed")
          }
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Check size={16} />
          )}
          {tr("mashonisaRecordRepayment", lang)}
        </button>
      </div>
    </SheetShell>
  );
}


// ---------------------------------------------------------------------------
// PayRow — one label/value line in the "pay here" panel, with an
// optional copy-to-clipboard button.
// ---------------------------------------------------------------------------

function PayRow({
  label,
  value,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-white/45 text-[10px] uppercase tracking-wider">
          {label}
        </div>
        <div className="text-white text-sm font-mono truncate">{value}</div>
      </div>
      {onCopy && (
        <button
          onClick={onCopy}
          className="shrink-0 flex items-center gap-1 text-[11px] text-kasi-green"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BankingSheet — set the lender's receiving bank / PayShap details so
// borrowers can pay loans back via the app. Reuses the same field
// shape as the stokvel banking form. Saves through the store's
// saveMashonisaBankingDetails (local-first + remote upsert).
// ---------------------------------------------------------------------------

function BankingSheet({
  lang,
  existing,
  onClose,
  onSave,
}: {
  lang: Lang;
  existing: MashonisaBanking | null;
  onClose: () => void;
  onSave: (banking: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    branchCode: string;
    payshapPhone: string;
  }) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [bankName, setBankName] = useState(existing?.bankName ?? "");
  const [accountHolder, setAccountHolder] = useState(
    existing?.accountHolder ?? "",
  );
  const [accountNumber, setAccountNumber] = useState(
    existing?.accountNumber ?? "",
  );
  const [branchCode, setBranchCode] = useState(existing?.branchCode ?? "");
  const [payshapPhone, setPayshapPhone] = useState(
    existing?.payshapPhone ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A usable receiving setup needs a bank name + at least one
  // destination (account number OR PayShap).
  const canSubmit =
    bankName.trim().length > 0 &&
    (accountNumber.trim().length > 0 || payshapPhone.trim().length > 0) &&
    !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSaving(true);
    const result = await onSave({
      bankName: bankName.trim(),
      accountHolder: accountHolder.trim(),
      accountNumber: accountNumber.trim(),
      branchCode: branchCode.trim(),
      payshapPhone: payshapPhone.trim(),
    });
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.error);
  };

  return (
    <SheetShell title={tr("mashonisaBankingSheetTitle", lang)} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-white/60 text-sm leading-relaxed">
          {tr("mashonisaBankingSheetSub", lang)}
        </p>
        <Field
          label={tr("bankName", lang)}
          value={bankName}
          onChange={setBankName}
          placeholder={tr("settingsBankingPlaceholderBank", lang)}
        />
        <Field
          label={tr("bankAccountHolder", lang)}
          value={accountHolder}
          onChange={setAccountHolder}
          placeholder={tr("settingsBankingPlaceholderHolder", lang)}
        />
        <Field
          label={tr("bankAccountNumber", lang)}
          value={accountNumber}
          onChange={setAccountNumber}
          placeholder={tr("settingsBankingPlaceholderAccount", lang)}
          inputMode="numeric"
        />
        <Field
          label={tr("bankBranchCode", lang)}
          value={branchCode}
          onChange={setBranchCode}
          placeholder={tr("settingsBankingPlaceholderBranch", lang)}
          inputMode="numeric"
        />
        <Field
          label={tr("bankPayshapPhone", lang)}
          value={payshapPhone}
          onChange={setPayshapPhone}
          placeholder={tr("settingsBankingPlaceholderPayshap", lang)}
          inputMode="tel"
        />
        {error && (
          <div className="rounded-xl bg-kasi-coral/[0.08] border border-kasi-coral/25 text-kasi-coral text-xs px-3 py-2">
            {error}
          </div>
        )}
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={
            "mt-1 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 " +
            (canSubmit
              ? "bg-kasi-green text-bg shadow-glow"
              : "bg-white/5 text-white/30 cursor-not-allowed")
          }
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Landmark size={16} />
          )}
          {tr("mashonisaBankingSheetSave", lang)}
        </button>
      </div>
    </SheetShell>
  );
}

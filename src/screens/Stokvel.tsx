import { motion, AnimatePresence } from "framer-motion";
import {
  PiggyBank,
  Users,
  Plus,
  Sparkles,
  UserPlus,
  Copy,
  MessageCircle,
  X,
  LogOut,
  Loader2,
  Check,
  KeyRound,
  CreditCard,
  Info,
  Zap,
  Landmark,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Lang, TKey } from "../i18n";
import { buildInviteUrl, normalizeInviteCode } from "../lib/inviteLink";
import { tr, trParams } from "../i18n";
import {
  formatRand,
  generateReference,
  memberContributed,
  stokvelPendingContributions,
  stokvelProgress,
  stokvelTotal,
  useStore,
} from "../store";
import type {
  Contribution,
  ContributionMethod,
  StokvelBankAccount,
  StokvelInvite,
  StokvelKind,
} from "../store";
import type { Screen } from "../App";

const QUICK_AMOUNTS = [50, 100, 250, 500];

type Sheet =
  | null
  | "create"
  | "join"
  | "invite"
  | "leave"
  | "contribute"
  | "reject"
  // PR #29 — Stokvel-side banking form. Same fields as the
  // Settings section, but reachable directly from the Stokvel
  // screen so admins aren't sent hunting for it.
  | "banking";

/**
 * Props (PR #25 additions):
 *   pendingInviteCode  — when a user opens a `?invite=CODE` URL,
 *                        App.tsx routes them here and passes the
 *                        code so the Join sheet auto-opens
 *                        pre-filled. `null` means the user got
 *                        here normally.
 *   onInviteConsumed   — called once we've either successfully
 *                        joined or the user closed the sheet
 *                        without joining, so App.tsx can clear
 *                        the URL query parameter.
 */
export function Stokvel(props: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
  pendingInviteCode?: string | null;
  onInviteConsumed?: () => void;
}) {
  const { lang } = props;
  // onNavigate is accepted for API symmetry with the other screens
  // (App.tsx passes it uniformly) but this screen currently
  // navigates via internal sheets rather than parent-driven route
  // changes, so we don't consume it here.
  const pendingInviteCode = props.pendingInviteCode ?? null;
  const onInviteConsumed = props.onInviteConsumed;
  const {
    state,
    userId,
    startContribution,
    createStokvelAsAdmin,
    joinStokvelByCode,
    generateInvite,
    getLatestInvite,
    leaveStokvel,
    confirmContribution,
    rejectContribution,
    // PR #29 — surfaced here so the empty-state banking sheet can
    // save directly from the Stokvel screen instead of forcing the
    // admin to navigate to Settings first.
    saveStokvelBanking,
  } = useStore();
  const stokvel = state.stokvel;

  const [sheet, setSheet] = useState<Sheet>(null);
  const [flash, setFlash] = useState<number | null>(null);
  // PR #25: when App.tsx forwards a `pendingInviteCode` from the
  // `?invite=CODE` URL parameter, auto-open the Join sheet with the
  // code pre-filled. Only fires when the user isn't already in a
  // stokvel (the app doesn't yet support multiple memberships) —
  // otherwise we'd overwrite whatever they're already looking at.
  //
  // We record the code we consumed so if App re-passes the same
  // prop on a re-render we don't reopen the sheet endlessly.
  const [consumedInviteCode, setConsumedInviteCode] = useState<
    string | null
  >(null);
  useEffect(() => {
    if (!pendingInviteCode) return;
    if (consumedInviteCode === pendingInviteCode) return;
    if (state.stokvel) {
      // Already in a stokvel. Silently discard the pending code so
      // the URL doesn't sit there forever, but don't disrupt the
      // user with a modal — they can join a second stokvel manually
      // once we support multi-membership in a future PR.
      setConsumedInviteCode(pendingInviteCode);
      onInviteConsumed?.();
      return;
    }
    setSheet("join");
    setConsumedInviteCode(pendingInviteCode);
    // NOTE: we don't call onInviteConsumed() yet — the URL stays
    // populated until the Join sheet closes (see JoinStokvelSheet's
    // onClose handler wiring below). That way if the user
    // accidentally dismisses the sheet before joining, they can
    // just refresh and re-trigger it.
  }, [pendingInviteCode, consumedInviteCode, state.stokvel, onInviteConsumed]);
  const [displayed, setDisplayed] = useState(0);
  // When the user taps a quick-amount tile we don't contribute
  // immediately — we open a confirmation sheet with this amount
  // pre-filled. `null` means the user tapped "Custom" and needs to
  // type an amount themselves.
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  // Which contribution is being rejected right now, if any. The reject
  // flow opens a sheet asking for an optional reason.
  const [rejectingContribution, setRejectingContribution] =
    useState<Contribution | null>(null);
  // Tracks which contributions are mid-flight to prevent double-taps
  // on the Confirm/Reject buttons while the RPC round-trips.
  const [busyContributionIds, setBusyContributionIds] = useState<
    Set<string>
  >(new Set());

  const targetProgress = stokvelProgress(stokvel);
  const total = stokvelTotal(stokvel);
  const goalReached = Boolean(stokvel && targetProgress >= 1);
  const isAdmin = stokvel?.role === "admin";

  // PR #29 — is banking usable for this stokvel yet?
  // "Usable" means at least a bank account number OR a PayShap
  // phone AND a bank name. Anything less is a half-filled record
  // that isn't useful for members trying to pay. Mirrors the
  // check inside ContributeSheet so the empty-state prompt and
  // the actual pay flow agree.
  const bankAcc = stokvel?.bankAccount;
  const hasBankingConfigured = Boolean(
    bankAcc &&
      (bankAcc.accountNumber || bankAcc.payshapPhone) &&
      bankAcc.bankName,
  );

  // Animate the progress bar
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = displayed;
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayed(from + (targetProgress - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetProgress]);

  const daysAgo = (ts: number) =>
    Math.max(0, Math.round((Date.now() - ts) / (1000 * 60 * 60 * 24)));

  const [redirecting, setRedirecting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  // Actually record / initiate the contribution. Always called from
  // the ContributeSheet after the user has explicitly confirmed the
  // amount, chosen a method, and (for bank-transfer) actually done
  // the transfer in their banking app — never directly from a
  // quick-amount tile.
  const contribute = async (
    amount: number,
    note?: string,
    opts?: { method?: ContributionMethod; reference?: string },
  ): Promise<boolean> => {
    setPayError(null);
    const result = await startContribution(amount, note, opts);
    if (result.kind === "logged") {
      setFlash(amount);
      setTimeout(() => setFlash(null), 1600);
      return true;
    } else if (result.kind === "redirect") {
      setRedirecting(true);
      // Give the UI a moment to show the "Opening Yoco..." state
      // before navigation, so the user knows something's happening.
      window.setTimeout(() => {
        window.location.href = result.url;
      }, 200);
      return true;
    } else if (result.kind === "error") {
      setPayError(result.error);
      window.setTimeout(() => setPayError(null), 4000);
      return false;
    }
    return false;
  };

  const openContributeSheet = (amount: number | null) => {
    setPendingAmount(amount);
    setSheet("contribute");
  };

  // Admin: mark a pending contribution as verified. Guarded against
  // double-taps by adding the contribution id to a "busy" set for
  // the duration of the round-trip.
  const onConfirmContribution = async (id: string) => {
    if (busyContributionIds.has(id)) return;
    setBusyContributionIds((prev) => new Set(prev).add(id));
    try {
      await confirmContribution(id);
    } finally {
      setBusyContributionIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const openRejectSheet = (c: Contribution) => {
    setRejectingContribution(c);
    setSheet("reject");
  };

  const onRejectContribution = async (id: string, reason?: string) => {
    if (busyContributionIds.has(id)) return;
    setBusyContributionIds((prev) => new Set(prev).add(id));
    try {
      const result = await rejectContribution(
        id,
        reason && reason.length > 0 ? reason : undefined,
      );
      if (result.ok) {
        setSheet(null);
        setRejectingContribution(null);
      }
      return result;
    } finally {
      setBusyContributionIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  // ---------------------------------------------------------------- Empty state
  if (!stokvel) {
    return (
      <div className="h-full flex flex-col items-center px-5 pt-16 pb-32 overflow-y-auto">
        <div className="w-24 h-24 rounded-3xl bg-kasi-gold/10 border border-kasi-gold/25 flex items-center justify-center mb-5">
          <PiggyBank size={44} className="text-kasi-gold" />
        </div>

        <h2 className="font-display text-2xl font-semibold text-center">
          {tr("stokvelEmptyTitle", lang)}
        </h2>
        <p className="text-white/60 text-center mt-2 max-w-[280px]">
          {tr("stokvelEmptySub", lang)}
        </p>

        <div className="w-full max-w-md flex flex-col gap-3 mt-8">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setSheet("create")}
            className="w-full flex items-center gap-4 px-5 py-5 rounded-3xl bg-gradient-to-br from-kasi-gold/25 via-kasi-gold/10 to-transparent border border-kasi-gold/40 min-h-[80px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-kasi-gold text-bg flex items-center justify-center shrink-0 shadow-gold">
              <Plus size={26} />
            </div>
            <div className="text-left flex-1">
              <div className="font-display text-lg font-bold">
                {tr("stokvelCreateCard", lang)}
              </div>
              <div className="text-white/60 text-sm">
                {tr("stokvelCreateCardDesc", lang)}
              </div>
            </div>
            <span className="text-kasi-gold text-xl">→</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setSheet("join")}
            className="w-full flex items-center gap-4 px-5 py-5 rounded-3xl bg-gradient-to-br from-kasi-green/25 via-kasi-green/10 to-transparent border border-kasi-green/40 min-h-[80px]"
          >
            <div className="w-14 h-14 rounded-2xl bg-kasi-green text-bg flex items-center justify-center shrink-0 shadow-glow">
              <KeyRound size={26} />
            </div>
            <div className="text-left flex-1">
              <div className="font-display text-lg font-bold">
                {tr("stokvelJoinCard", lang)}
              </div>
              <div className="text-white/60 text-sm">
                {tr("stokvelJoinCardDesc", lang)}
              </div>
            </div>
            <span className="text-kasi-green text-xl">→</span>
          </motion.button>
        </div>

        <AnimatePresence>
          {sheet === "create" && (
            <CreateStokvelSheet
              lang={lang}
              onClose={() => setSheet(null)}
              onSubmit={createStokvelAsAdmin}
            />
          )}
          {sheet === "join" && (
            <JoinStokvelSheet
              lang={lang}
              onClose={() => {
                setSheet(null);
                // PR #25: close = the user is done with the invite
                // (either joined successfully or dismissed the
                // sheet). Let App.tsx clear the URL parameter so
                // a refresh doesn't reopen this sheet.
                onInviteConsumed?.();
              }}
              onSubmit={joinStokvelByCode}
              defaultCode={pendingInviteCode ?? undefined}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ---------------------------------------------------------------- Full state
  const yourContribution = userId ? memberContributed(stokvel, userId) : 0;

  // Sort members: admins first, then by joinedAt
  const sortedMembers = [...stokvel.memberships].sort((a, b) => {
    if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
    return a.joinedAt - b.joinedAt;
  });

  return (
    <div className="h-full overflow-y-auto pb-32 px-5 pt-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="text-white/60 text-xs uppercase tracking-wider flex items-center gap-1.5">
            <PiggyBank size={14} className="text-kasi-gold" />
            {tr("stokvelSub", lang)}
          </div>
          <div className="font-display text-2xl font-semibold mt-1 truncate">
            {stokvel.name}
          </div>
        </div>
        <div
          className={
            "text-[10px] uppercase tracking-wider px-2 py-1 rounded-full border font-semibold shrink-0 " +
            (isAdmin
              ? "text-kasi-gold border-kasi-gold/30 bg-kasi-gold/[0.08]"
              : "text-kasi-green border-kasi-green/30 bg-kasi-green/[0.08]")
          }
        >
          {tr(isAdmin ? "stokvelRoleAdmin" : "stokvelRoleMember", lang)}
        </div>
      </div>

      {/* Pot progress card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-kasi-gold/30 via-kasi-green/20 to-bg-card border border-white/5"
      >
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-kasi-gold/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-baseline justify-between mb-2">
            <div className="text-xs uppercase tracking-widest text-white/60">
              {tr("stokvelSaved", lang)}
            </div>
            <div className="text-xs text-white/50 flex items-center gap-1">
              <Users size={12} />
              {trParams("stokvelMemberOf", lang, {
                count: stokvel.memberships.length,
                target: stokvel.members,
              })}
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-display text-5xl font-bold">
              {formatRand(total)}
            </div>
            <div className="text-white/50 text-lg">
              / {formatRand(stokvel.goal)}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="h-3 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-kasi-gold to-kasi-green"
                animate={{ width: `${Math.min(100, displayed * 100)}%` }}
                transition={{ type: "spring", stiffness: 60, damping: 20 }}
                style={{ boxShadow: "0 0 20px rgba(34,197,94,0.5)" }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[11px] text-white/60">
              <span>{Math.round(displayed * 100)}%</span>
              <span>
                {tr("stokvelGoal", lang)}: {formatRand(stokvel.goal)}
              </span>
            </div>
          </div>

          {/* Your contribution to this stokvel */}
          <div className="mt-4 rounded-2xl bg-black/20 border border-white/5 px-3 py-2.5 flex items-center justify-between">
            <span className="text-white/60 text-xs uppercase tracking-wider">
              {tr("stokvelYouContributed", lang)}
            </span>
            <span className="font-display font-bold text-kasi-green">
              {formatRand(yourContribution)}
            </span>
          </div>

          {goalReached && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-4 flex items-center gap-2 rounded-xl bg-kasi-green/20 border border-kasi-green/30 px-3 py-2 text-kasi-green font-semibold text-sm"
            >
              <Sparkles size={16} />
              {tr("goalReached", lang)} 🎉
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Admin action: Invite */}
      {isAdmin && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setSheet("invite")}
          className="w-full mt-4 flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-kasi-gold/10 border border-kasi-gold/30 text-kasi-gold"
        >
          <UserPlus size={18} />
          <span className="font-semibold text-sm">
            {tr("stokvelInviteBtn", lang)}
          </span>
          <span className="ml-auto text-kasi-gold">→</span>
        </motion.button>
      )}

      {/* Banking empty-state (PR #29).
          Admin-only. Shown when the stokvel has no bank account
          configured OR every field is empty. Tapping opens the
          BankingSheet in a bottom modal — the same form that
          Settings surfaces, but reachable directly from the
          Stokvel screen so admins aren't sent hunting through
          the Settings tab to find it. */}
      {isAdmin && !hasBankingConfigured && (
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => setSheet("banking")}
          className="w-full mt-3 flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-kasi-green/[0.06] border border-kasi-green/30 text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-kasi-green/15 border border-kasi-green/30 flex items-center justify-center text-kasi-green shrink-0">
            <Landmark size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm">
              {tr("stokvelBankingEmptyTitle", lang)}
            </div>
            <div className="text-white/60 text-xs mt-0.5 leading-relaxed">
              {tr("stokvelBankingEmptyBody", lang)}
            </div>
          </div>
          <span className="text-kasi-green shrink-0 self-center">→</span>
        </motion.button>
      )}

      {/* Member-side hint when the admin hasn't set up banking yet.
          Contribute-time UX already handles this gracefully by
          falling back to card/legacy, but a small inline message
          here helps a member who's confused about WHY the bank
          option isn't available. */}
      {!isAdmin && !hasBankingConfigured && (
        <div className="mt-3 rounded-2xl bg-white/[0.02] border border-white/10 p-3 text-white/60 text-xs leading-relaxed flex items-start gap-2">
          <Info size={14} className="text-kasi-gold shrink-0 mt-0.5" />
          <span>{tr("stokvelBankingMemberInfo", lang)}</span>
        </div>
      )}

      {/* Quick contribute */}
      <div className="mt-6">
        <div className="text-white/50 text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>{tr("quickAdd", lang)}</span>
          {state.paymentConfig?.isActive && (
            <span className="normal-case tracking-normal text-[10px] text-kasi-green flex items-center gap-1">
              ⚡ {tr("payAutoBadge", lang)}
              {state.paymentConfig.isTest && (
                <span className="text-kasi-gold ml-1">
                  · {tr("payTestBadge", lang)}
                </span>
              )}
            </span>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <motion.button
              key={amt}
              whileTap={{ scale: 0.95 }}
              disabled={redirecting}
              onClick={() => openContributeSheet(amt)}
              className={
                "py-3.5 rounded-2xl bg-bg-card border border-white/5 flex flex-col items-center gap-0.5 transition-colors " +
                (redirecting
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:border-kasi-green/40 active:border-kasi-green")
              }
            >
              <span className="font-display font-bold text-kasi-gold">
                R{amt}
              </span>
              <span className="text-[9px] text-white/50 uppercase">
                {tr("contribute", lang)}
              </span>
            </motion.button>
          ))}
        </div>
        {/* Custom amount tile — full-width so it doesn't get lost in
            the preset row. Opens the same sheet as the presets but
            with no amount pre-filled. */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          disabled={redirecting}
          onClick={() => openContributeSheet(null)}
          className={
            "mt-2 w-full py-3 rounded-2xl bg-bg-card border border-white/10 flex items-center justify-center gap-2 transition-colors " +
            (redirecting
              ? "opacity-40 cursor-not-allowed"
              : "hover:border-kasi-gold/50 active:border-kasi-gold")
          }
        >
          <Plus size={16} className="text-kasi-gold" />
          <span className="font-semibold text-sm text-white/80">
            {tr("contribCustom", lang)}
          </span>
        </motion.button>
        {payError && (
          <div className="mt-2 text-kasi-coral text-xs">{payError}</div>
        )}
      </div>

      {/* Opening Yoco... overlay */}
      <AnimatePresence>
        {redirecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-bg/85 backdrop-blur-sm flex flex-col items-center justify-center gap-4"
          >
            <Loader2 size={32} className="animate-spin text-kasi-green" />
            <div className="text-white font-medium">
              {tr("payOpeningCheckout", lang)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Members list */}
      <div className="mt-6">
        <div className="text-white/50 text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
          <span>{tr("stokvelMembersList", lang)}</span>
          <span className="text-[10px] normal-case tracking-normal text-white/40">
            {stokvel.memberships.length}
          </span>
        </div>
        <div className="flex flex-col gap-2">
          {sortedMembers.map((m) => {
            const contributed = memberContributed(stokvel, m.userId);
            const isMe = m.userId === userId;
            return (
              <div
                key={m.userId}
                className="flex items-center gap-3 rounded-2xl bg-bg-card border border-white/5 px-4 py-3"
              >
                <div
                  className={
                    "w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm shrink-0 " +
                    (m.role === "admin"
                      ? "bg-kasi-gold/15 border border-kasi-gold/30 text-kasi-gold"
                      : "bg-kasi-green/15 border border-kasi-green/30 text-kasi-green")
                  }
                >
                  {(m.displayName[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {m.displayName}
                    {isMe && (
                      <span className="text-white/40 text-xs"> (you)</span>
                    )}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-white/40">
                    {tr(
                      m.role === "admin"
                        ? "stokvelRoleAdmin"
                        : "stokvelRoleMember",
                      lang,
                    )}
                  </div>
                </div>
                <div className="font-display font-semibold text-kasi-green text-sm">
                  {formatRand(contributed)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending verification section.
          Admins see every pending contribution on the stokvel plus
          Confirm / Reject buttons. Non-admins see only their own
          pending rows, read-only, so they know the admin has been
          notified. Confirmed and rejected rows live in the Recent
          Contributions section below. */}
      {(() => {
        const allPending = stokvelPendingContributions(stokvel);
        const visiblePending = isAdmin
          ? allPending
          : allPending.filter((c) => c.ownerId === userId);
        if (visiblePending.length === 0) return null;
        return (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white/50 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Info size={12} className="text-kasi-gold" />
                  {tr("pendingSectionTitle", lang)}
                </div>
                <div className="text-[11px] text-white/50 mt-1 max-w-[260px]">
                  {isAdmin
                    ? tr("pendingAdminSubtitle", lang)
                    : tr("pendingMemberSubtitle", lang)}
                </div>
              </div>
              <div className="text-[11px] px-2 py-1 rounded-full bg-kasi-gold/15 border border-kasi-gold/30 text-kasi-gold font-semibold">
                {visiblePending.length}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {visiblePending.map((c) => {
                const isMine = c.ownerId === userId;
                const isBusy = busyContributionIds.has(c.id);
                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl bg-kasi-gold/[0.05] border border-kasi-gold/25 px-4 py-3 flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {c.memberName ? (
                            <>
                              <span className="text-white/50 text-xs">
                                {tr("contribBy", lang)}{" "}
                              </span>
                              {c.memberName}
                              {isMine && (
                                <span className="text-white/40 text-xs">
                                  {" "}
                                  (you)
                                </span>
                              )}
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                        <div className="text-[11px] text-white/50 truncate">
                          {daysAgo(c.createdAt) === 0
                            ? "Today"
                            : `${daysAgo(c.createdAt)} days ago`}
                          {c.reference && (
                            <>
                              <span className="text-white/30 mx-1">·</span>
                              <span className="font-mono text-white/70">
                                {c.reference}
                              </span>
                            </>
                          )}
                          {c.note && (
                            <>
                              <span className="text-white/30 mx-1">·</span>
                              <span className="text-white/60">{c.note}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-display font-semibold text-kasi-gold">
                          +{formatRand(c.amount)}
                        </div>
                        <div className="text-[9px] uppercase tracking-wider text-kasi-gold/70">
                          {tr("pendingBadge", lang)}
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          disabled={isBusy}
                          onClick={() => onConfirmContribution(c.id)}
                          className={
                            "py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 " +
                            (isBusy
                              ? "bg-white/5 text-white/30 cursor-not-allowed"
                              : "bg-kasi-green/15 border border-kasi-green/40 text-kasi-green")
                          }
                        >
                          {isBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Check size={14} />
                          )}
                          {tr("verifyConfirmBtn", lang)}
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => openRejectSheet(c)}
                          className={
                            "py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 " +
                            (isBusy
                              ? "bg-white/5 text-white/30 cursor-not-allowed"
                              : "bg-kasi-coral/10 border border-kasi-coral/30 text-kasi-coral")
                          }
                        >
                          <X size={14} />
                          {tr("verifyRejectBtn", lang)}
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Recent contributions: confirmed + rejected only (pending
          lives in the section above so admins have a clear queue). */}
      {(() => {
        const nonPending = stokvel.contributions.filter(
          (c) => (c.status ?? "confirmed") !== "pending",
        );
        if (nonPending.length === 0) return null;
        return (
          <div className="mt-6">
            <div className="text-white/50 text-xs uppercase tracking-wider mb-3">
              {tr("recentContributions", lang)}
            </div>
            <div className="flex flex-col gap-2">
              {nonPending.slice(0, 10).map((c) => {
                const isRejected = c.status === "rejected";
                return (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={
                      "flex items-center justify-between rounded-2xl px-4 py-3 " +
                      (isRejected
                        ? "bg-kasi-coral/[0.05] border border-kasi-coral/25"
                        : "bg-bg-card border border-white/5")
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border " +
                          (isRejected
                            ? "bg-kasi-coral/15 border-kasi-coral/30"
                            : "bg-kasi-gold/15 border-kasi-gold/30")
                        }
                      >
                        {isRejected ? (
                          <X size={16} className="text-kasi-coral" />
                        ) : (
                          <Plus size={16} className="text-kasi-gold" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">
                          {c.memberName ? (
                            <>
                              <span className="text-white/50 text-xs">
                                {tr("contribBy", lang)}{" "}
                              </span>
                              {c.memberName}
                            </>
                          ) : (
                            "—"
                          )}
                        </div>
                        <div className="text-[11px] text-white/50 truncate">
                          {daysAgo(c.createdAt) === 0
                            ? "Today"
                            : `${daysAgo(c.createdAt)} days ago`}
                          {c.note && (
                            <>
                              <span className="text-white/30 mx-1">·</span>
                              <span className="text-white/60">{c.note}</span>
                            </>
                          )}
                          {isRejected && c.rejectedReason && (
                            <>
                              <span className="text-white/30 mx-1">·</span>
                              <span className="text-kasi-coral">
                                {c.rejectedReason}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={
                          "font-display font-semibold " +
                          (isRejected
                            ? "text-kasi-coral line-through"
                            : "text-kasi-green")
                        }
                      >
                        {isRejected ? "" : "+"}
                        {formatRand(c.amount)}
                      </div>
                      {isRejected && (
                        <div className="text-[9px] uppercase tracking-wider text-kasi-coral/80">
                          {tr("rejectedBadge", lang)}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Leave stokvel — subtle at the bottom */}
      <button
        onClick={() => setSheet("leave")}
        className="mt-8 w-full py-2.5 rounded-xl bg-bg-card border border-white/5 text-white/40 text-xs font-medium flex items-center justify-center gap-1.5"
      >
        <LogOut size={12} />
        {tr("stokvelLeave", lang)}
      </button>

      {/* Sheets */}
      <AnimatePresence>
        {sheet === "contribute" && (
          <ContributeSheet
            lang={lang}
            stokvelName={stokvel.name}
            initialAmount={pendingAmount}
            paymentActive={Boolean(state.paymentConfig?.isActive)}
            paymentIsTest={Boolean(state.paymentConfig?.isTest)}
            bankAccount={stokvel.bankAccount}
            isAdmin={isAdmin}
            onClose={() => setSheet(null)}
            onSubmit={async (amt, note, opts) => {
              const ok = await contribute(amt, note, opts);
              if (ok) setSheet(null);
              return ok;
            }}
          />
        )}
        {sheet === "invite" && (
          <InviteSheet
            lang={lang}
            stokvelName={stokvel.name}
            onClose={() => setSheet(null)}
            generate={generateInvite}
            fetchLatest={getLatestInvite}
          />
        )}
        {sheet === "leave" && (
          <LeaveConfirmSheet
            lang={lang}
            onClose={() => setSheet(null)}
            onConfirm={leaveStokvel}
          />
        )}
        {sheet === "reject" && rejectingContribution && (
          <RejectContributionSheet
            lang={lang}
            contribution={rejectingContribution}
            busy={busyContributionIds.has(rejectingContribution.id)}
            onClose={() => {
              setSheet(null);
              setRejectingContribution(null);
            }}
            onConfirm={(reason) =>
              onRejectContribution(rejectingContribution.id, reason)
            }
          />
        )}
        {/* PR #29 — banking form as a bottom sheet, reachable
             directly from the Stokvel screen (via the empty-state
             prompt above). Saves through the same
             saveStokvelBanking() store method as the Settings
             section, so both entry points write to the same row. */}
        {sheet === "banking" && (
          <BankingSheet
            lang={lang}
            existing={stokvel.bankAccount}
            onClose={() => setSheet(null)}
            onSave={saveStokvelBanking}
          />
        )}
      </AnimatePresence>

      {/* Flash toast */}
      <AnimatePresence>
        {flash !== null && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-24 left-4 right-4 rounded-2xl bg-kasi-green text-bg px-4 py-3 font-semibold text-center shadow-glow"
          >
            +{formatRand(flash)} → {stokvel.name} ✨
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Sheets (bottom-panel modals)
// ============================================================================

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
      className="absolute inset-0 z-30 bg-bg/95 backdrop-blur flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="font-display font-semibold text-lg">{title}</div>
        <button onClick={onClose} className="p-1 -mr-1">
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
    </motion.div>
  );
}

function CreateStokvelSheet({
  lang,
  onClose,
  onSubmit,
}: {
  lang: Lang;
  onClose: () => void;
  onSubmit: (input: {
    name: string;
    kind: StokvelKind;
    goal: number;
    members: number;
  }) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
  // PR #35 — stokvel sub-type. Defaults to 'savings' (the most
  // common / general case) so a user who doesn't care just proceeds.
  const [kind, setKind] = useState<StokvelKind>("savings");
  const [goal, setGoal] = useState(5000);
  const [members, setMembers] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const clean = name.trim();
    if (!clean) return;
    setSubmitting(true);
    setError(null);
    const id = await onSubmit({
      name: clean,
      kind,
      goal: Number(goal) || 5000,
      members: Number(members) || 1,
    });
    setSubmitting(false);
    if (id) {
      onClose();
    } else {
      setError("Could not create stokvel — please try again.");
    }
  };

  const KINDS: {
    value: StokvelKind;
    labelKey: TKey;
    descKey: TKey;
  }[] = [
    {
      value: "savings",
      labelKey: "stokvelKindSavings",
      descKey: "stokvelKindSavingsDesc",
    },
    {
      value: "groceries",
      labelKey: "stokvelKindGroceries",
      descKey: "stokvelKindGroceriesDesc",
    },
    {
      value: "birthdays",
      labelKey: "stokvelKindBirthdays",
      descKey: "stokvelKindBirthdaysDesc",
    },
  ];

  return (
    <SheetShell title={tr("stokvelCreateHeader", lang)} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-white/50">
            {tr("onbStokvelNameLabel", lang)}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tr("onbStokvelNamePlaceholder", lang)}
            maxLength={60}
            className="mt-1 w-full px-4 py-3.5 rounded-xl bg-bg-card border border-white/10 text-white text-base outline-none focus:border-kasi-green"
          />
        </div>

        {/* PR #35 — stokvel sub-type picker */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-white/50">
            {tr("stokvelKindLabel", lang)}
          </label>
          <div className="mt-1 flex flex-col gap-2">
            {KINDS.map((k) => {
              const selected = kind === k.value;
              return (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => setKind(k.value)}
                  className={
                    "text-left px-4 py-3 rounded-xl border transition-colors " +
                    (selected
                      ? "bg-kasi-green/10 border-kasi-green/40"
                      : "bg-bg-card border-white/10")
                  }
                >
                  <div
                    className={
                      "text-sm font-semibold " +
                      (selected ? "text-kasi-green" : "text-white")
                    }
                  >
                    {tr(k.labelKey, lang)}
                  </div>
                  <div className="text-white/50 text-xs mt-0.5 leading-relaxed">
                    {tr(k.descKey, lang)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              {tr("onbStokvelGoalLabel", lang)}
            </label>
            <input
              type="number"
              inputMode="numeric"
              value={goal || ""}
              onChange={(e) => setGoal(Number(e.target.value))}
              placeholder="5000"
              className="mt-1 w-full px-4 py-3.5 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green"
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              {tr("onbStokvelMembersLabel", lang)}
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={members || ""}
              onChange={(e) => setMembers(Number(e.target.value))}
              placeholder="4"
              className="mt-1 w-full px-4 py-3.5 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green"
            />
          </div>
        </div>
        {error && <div className="text-kasi-coral text-xs">{error}</div>}
        <button
          onClick={submit}
          disabled={!name.trim() || submitting}
          className={
            "mt-2 py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 " +
            (name.trim() && !submitting
              ? "bg-kasi-gold text-bg shadow-gold"
              : "bg-white/5 text-white/30 cursor-not-allowed")
          }
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {tr("stokvelCreatingProgress", lang)}
            </>
          ) : (
            <>
              <Plus size={18} />
              {tr("stokvelCreateSubmit", lang)}
            </>
          )}
        </button>
      </div>
    </SheetShell>
  );
}

function JoinStokvelSheet({
  lang,
  onClose,
  onSubmit,
  defaultCode = "",
}: {
  lang: Lang;
  onClose: () => void;
  onSubmit: (
    code: string,
  ) =>
    | Promise<{ ok: true; stokvelId: string } | { ok: false; error: string }>
    | { ok: false; error: string };
  // PR #25: when the sheet is opened from an invite link
  // (`?invite=CODE`), the code is pre-filled here so the user
  // just has to tap Join.
  defaultCode?: string;
}) {
  // Start pre-filled with the invite code (if any), already run
  // through the same normaliser we apply on manual typing below —
  // so a code arriving from a WhatsApp `?invite=` link, from a
  // hand-typed lowercase paste, or from a paste that lost its
  // hyphens all end up looking identical in the input.
  const [code, setCode] = useState<string>(
    normalizeInviteCode(defaultCode) ?? defaultCode.trim().toUpperCase(),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A code is submittable only if it normalises to a valid
  // K-XXXX-XXXX shape. This mirrors the server-side format check,
  // avoids a wasted RPC round-trip on obvious garbage, and lets us
  // disable the "Join" button visually the moment the input is
  // still incomplete.
  const normalised = normalizeInviteCode(code);
  const canSubmit = normalised !== null && !submitting;

  const submit = async () => {
    if (!normalised) return;
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(normalised);
    setSubmitting(false);
    if (result.ok) {
      onClose();
    } else {
      setError(
        result.error === "invalid_or_expired"
          ? tr("stokvelJoinInvalid", lang)
          : result.error,
      );
    }
  };

  return (
    <SheetShell title={tr("stokvelJoinHeader", lang)} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-white/50">
            {tr("stokvelJoinCodeLabel", lang)}
          </label>
          <input
            autoFocus
            value={code}
            onChange={(e) => {
              // We deliberately DON'T force-uppercase or strip
              // punctuation while the user is still typing —
              // that would move the caret and make backspace feel
              // broken on Android keyboards. Instead we let them
              // type whatever, and `normalizeInviteCode` on
              // submit accepts lower/mixed case, missing hyphens,
              // stray spaces, and stray punctuation all as valid.
              setCode(e.target.value);
              if (error) setError(null);
            }}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder={tr("stokvelJoinCodePlaceholder", lang)}
            className="mt-1 w-full px-4 py-3.5 rounded-xl bg-bg-card border border-white/10 text-white text-lg font-mono tracking-wider outline-none focus:border-kasi-green"
          />
        </div>
        {error && <div className="text-kasi-coral text-sm">{error}</div>}
        <button
          onClick={submit}
          disabled={!canSubmit}
          className={
            "mt-2 py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 " +
            (canSubmit
              ? "bg-kasi-green text-bg shadow-glow"
              : "bg-white/5 text-white/30 cursor-not-allowed")
          }
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {tr("stokvelJoiningProgress", lang)}
            </>
          ) : (
            <>
              <KeyRound size={18} />
              {tr("stokvelJoinSubmit", lang)}
            </>
          )}
        </button>
      </div>
    </SheetShell>
  );
}

function InviteSheet({
  lang,
  stokvelName,
  onClose,
  generate,
  fetchLatest,
}: {
  lang: Lang;
  stokvelName: string;
  onClose: () => void;
  generate: () => Promise<StokvelInvite | null>;
  fetchLatest: () => Promise<StokvelInvite | null>;
}) {
  const [invite, setInvite] = useState<StokvelInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await fetchLatest();
      if (cancelled) return;
      if (existing && (existing.expiresAt ?? Infinity) > Date.now()) {
        setInvite(existing);
      } else {
        const created = await generate();
        if (!cancelled) setInvite(created);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setLoading(true);
    const created = await generate();
    setInvite(created);
    setLoading(false);
  };

  // PR #25: copy the full invite URL (not just the raw code) so a
  // member pasting into WhatsApp gets a clickable link. Falls back
  // to the code alone if the clipboard API is somehow unavailable,
  // so the "Copy" button never leaves the user empty-handed.
  const copy = async () => {
    if (!invite) return;
    const link = buildInviteUrl(invite.code);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      try {
        await navigator.clipboard.writeText(invite.code);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        // ignore
      }
    }
  };

  // PR #25: the WhatsApp share message now embeds a tappable URL
  // ahead of the raw code. Previously it only carried the code as
  // text, so recipients had nothing to tap and had to manually
  // enter it — the exact bug that was blocking new members from
  // joining pilot stokvels.
  const shareWA = () => {
    if (!invite) return;
    const inviteUrl = buildInviteUrl(invite.code);
    const message = trParams("stokvelInviteWhatsAppMessage", lang, {
      code: invite.code,
      url: inviteUrl,
    });
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener");
  };

  const expiresInDays = invite?.expiresAt
    ? Math.max(
        0,
        Math.ceil((invite.expiresAt - Date.now()) / (1000 * 60 * 60 * 24)),
      )
    : null;

  return (
    <SheetShell title={tr("stokvelInviteHeader", lang)} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <p className="text-white/60 text-sm leading-relaxed">
          {tr("stokvelInviteHelper", lang)}
        </p>

        {loading || !invite ? (
          <div className="rounded-3xl border border-white/5 bg-bg-card p-8 flex flex-col items-center gap-3">
            <Loader2 size={22} className="animate-spin text-kasi-gold" />
            <div className="text-white/50 text-xs">
              {tr("stokvelCreatingProgress", lang)}
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-3xl border border-kasi-gold/30 bg-gradient-to-br from-kasi-gold/15 via-kasi-gold/5 to-transparent p-6 flex flex-col items-center gap-2">
              <div className="text-[10px] uppercase tracking-widest text-white/50">
                {stokvelName}
              </div>
              <div className="font-display text-3xl font-bold tracking-wider text-kasi-gold">
                {invite.code}
              </div>
              {expiresInDays !== null && (
                <div className="text-white/40 text-xs">
                  {trParams("stokvelInviteExpires", lang, {
                    days: expiresInDays,
                  })}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copy}
                className={
                  "py-3.5 rounded-2xl border font-semibold text-sm flex items-center justify-center gap-2 " +
                  (copied
                    ? "bg-kasi-green/15 border-kasi-green/40 text-kasi-green"
                    : "bg-bg-card border-white/10 text-white/80")
                }
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied
                  ? tr("stokvelInviteCopied", lang)
                  : tr("stokvelInviteCopy", lang)}
              </button>
              <button
                onClick={shareWA}
                className="py-3.5 rounded-2xl bg-emerald-500 text-bg font-semibold text-sm flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                WhatsApp
              </button>
            </div>

            <button
              onClick={refresh}
              className="mt-1 text-white/50 text-xs underline"
            >
              {tr("stokvelInviteRefresh", lang)}
            </button>
          </>
        )}
      </div>
    </SheetShell>
  );
}

function LeaveConfirmSheet({
  lang,
  onClose,
  onConfirm,
}: {
  lang: Lang;
  onClose: () => void;
  onConfirm: () => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [soleAdmin, setSoleAdmin] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const result = await onConfirm();
    setSubmitting(false);
    if (result.ok) {
      onClose();
    } else if (result.error === "sole_admin") {
      setSoleAdmin(true);
    }
  };

  return (
    <SheetShell title={tr("stokvelLeave", lang)} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-white/80 leading-relaxed">
          {tr("stokvelLeaveConfirm", lang)}
        </p>
        {soleAdmin && (
          <div className="rounded-2xl border border-kasi-coral/30 bg-kasi-coral/[0.08] p-3 text-kasi-coral text-sm">
            {tr("stokvelLeaveSoleAdmin", lang)}
          </div>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={submit}
            disabled={submitting || soleAdmin}
            className={
              "py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 " +
              (submitting || soleAdmin
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-kasi-coral text-bg")
            }
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {tr("stokvelLeaveConfirmBtn", lang)}
          </button>
          <button
            onClick={onClose}
            className="py-3 rounded-2xl bg-bg-card border border-white/10 text-white/80"
          >
            {tr("stokvelLeaveCancel", lang)}
          </button>
        </div>
      </div>
    </SheetShell>
  );
}


// ============================================================================
// ContributeSheet
// ============================================================================
//
// The single entry point for logging or making a contribution. Its job is to
// never let a member silently record a payment: it makes the amount
// explicit, adds an optional note, and — critically — tells the user
// honestly what will happen when they tap the primary button.
//
//   • paymentActive === true  → real money moves via Yoco checkout.
//                                Primary button: "Pay with card".
//   • paymentActive === false → the app is being used as a ledger for a
//                                payment made outside it (EFT / cash).
//                                Primary button: "Log payment (EFT / cash)".
//                                We show an explainer so the user knows
//                                money is NOT moving and an admin can
//                                verify. If the current user is the
//                                stokvel admin, we also nudge them to
//                                set up Yoco in Settings.
//
// ContributeSheet payment-method priority:
//
//   1. Bank details on the stokvel  → primary flow (no external
//      signup, everyone can use this today).
//   2. Yoco config active           → offered as an alternative when
//      bank details also exist; primary when bank details are missing.
//   3. Neither configured           → legacy "log payment (EFT/cash)"
//      flow with the honest banner from PR #13.
//
// A tab-style toggle appears only when BOTH bank details AND Yoco are
// available, so ordinary flows stay uncluttered.
function ContributeSheet({
  lang,
  stokvelName,
  initialAmount,
  paymentActive,
  paymentIsTest,
  bankAccount,
  isAdmin,
  onClose,
  onSubmit,
}: {
  lang: Lang;
  stokvelName: string;
  initialAmount: number | null;
  paymentActive: boolean;
  paymentIsTest: boolean;
  bankAccount: StokvelBankAccount | null;
  isAdmin: boolean;
  onClose: () => void;
  onSubmit: (
    amount: number,
    note?: string,
    opts?: { method?: ContributionMethod; reference?: string },
  ) => Promise<boolean>;
}) {
  const [amountText, setAmountText] = useState(
    initialAmount !== null && initialAmount > 0 ? String(initialAmount) : "",
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Reference is generated once when the sheet mounts and stays put
  // for the whole session — so the value the user pastes into their
  // banking app matches the value we store server-side.
  const [reference] = useState(() => generateReference());

  // Which method is currently selected in the sheet. Defaults to
  // whichever primary flow applies for this stokvel.
  const hasBank = Boolean(
    bankAccount &&
      (bankAccount.accountNumber ||
        bankAccount.payshapPhone ||
        bankAccount.accountHolder),
  );
  const [method, setMethod] = useState<"bank" | "card" | "legacy">(
    hasBank ? "bank" : paymentActive ? "card" : "legacy",
  );

  const parsedAmount = Math.floor(Number(amountText.replace(/[^\d]/g, "")) || 0);
  const canSubmit = parsedAmount > 0 && !submitting;

  // Copy-to-clipboard payload for the bank-transfer flow. Includes
  // everything the payer needs in a single paste-friendly block.
  const bankCopyBlock = () => {
    const lines: string[] = [`KasiKash payment — ${stokvelName}`];
    if (bankAccount?.bankName) lines.push(`Bank: ${bankAccount.bankName}`);
    if (bankAccount?.accountHolder)
      lines.push(`Account holder: ${bankAccount.accountHolder}`);
    if (bankAccount?.accountNumber)
      lines.push(`Account number: ${bankAccount.accountNumber}`);
    if (bankAccount?.branchCode)
      lines.push(`Branch code: ${bankAccount.branchCode}`);
    if (bankAccount?.payshapPhone)
      lines.push(`PayShap: ${bankAccount.payshapPhone}`);
    lines.push(`Reference: ${reference}`);
    if (parsedAmount > 0) lines.push(`Amount: R${parsedAmount}`);
    return lines.join("\n");
  };

  const copyBank = async () => {
    try {
      await navigator.clipboard.writeText(bankCopyBlock());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (older browsers / iOS quirks) — no-op.
    }
  };

  const shareViaWhatsApp = () => {
    const msg = trParams("contribBankWhatsAppMessage", lang, {
      stokvel: stokvelName,
      amount: parsedAmount > 0 ? `R${parsedAmount}` : "",
      reference,
    });
    window.open(
      `https://wa.me/?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener",
    );
  };

  const submit = async () => {
    if (!canSubmit) {
      setError(tr("contribInvalidAmount", lang));
      return;
    }
    setError(null);
    setSubmitting(true);
    const cleanNote = note.trim();
    const noteOrUndef = cleanNote.length > 0 ? cleanNote : undefined;

    let ok = false;
    if (method === "bank") {
      ok = await onSubmit(parsedAmount, noteOrUndef, {
        method: "eft",
        reference,
      });
    } else if (method === "card") {
      // Yoco path — no reference; the checkout URL is the source of truth.
      ok = await onSubmit(parsedAmount, noteOrUndef, { method: "yoco" });
    } else {
      // Legacy "no config" path: keep the honest manual-log behavior.
      ok = await onSubmit(parsedAmount, noteOrUndef, { method: "eft" });
    }

    setSubmitting(false);
    if (!ok) setError(tr("contribInvalidAmount", lang));
  };

  const primaryLabel = () => {
    if (submitting) return tr("stokvelCreatingProgress", lang);
    const suffix = parsedAmount > 0 ? ` · R${parsedAmount}` : "";
    if (method === "bank") return `${tr("contribBankIvePaid", lang)}${suffix}`;
    if (method === "card") return `${tr("contribPayYocoBtn", lang)}${suffix}`;
    return `${tr("contribLogEftBtn", lang)}${suffix}`;
  };

  return (
    <SheetShell
      title={`${tr("contribSheetTitle", lang)} ${stokvelName}`}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {/* Method toggle — only when the stokvel supports both flows */}
        {hasBank && paymentActive && (
          <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-bg-card border border-white/10">
            <button
              onClick={() => setMethod("bank")}
              className={
                "py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors " +
                (method === "bank"
                  ? "bg-kasi-gold text-bg"
                  : "text-white/60")
              }
            >
              <Landmark size={14} />
              {tr("contribMethodBank", lang)}
            </button>
            <button
              onClick={() => setMethod("card")}
              className={
                "py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors " +
                (method === "card"
                  ? "bg-kasi-green text-bg"
                  : "text-white/60")
              }
            >
              <CreditCard size={14} />
              {tr("contribMethodCard", lang)}
            </button>
          </div>
        )}

        {/* Amount */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-white/50">
            {tr("contribAmountLabel", lang)}
          </label>
          <div className="mt-1 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 font-display text-lg pointer-events-none">
              R
            </span>
            <input
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
              value={amountText}
              onChange={(e) => {
                setAmountText(e.target.value);
                if (error) setError(null);
              }}
              placeholder="0"
              className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-bg-card border border-white/10 text-white font-display text-2xl font-bold tabular-nums outline-none focus:border-kasi-green"
            />
          </div>
        </div>

        {/* Note (optional) */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-white/50">
            {tr("contribNoteLabel", lang)}
          </label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={tr("contribNotePlaceholder", lang)}
            maxLength={80}
            className="mt-1 w-full px-4 py-3 rounded-2xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green"
          />
        </div>

        {/* Payment method disclosure. Each branch tells the user
            exactly what will happen when they tap the primary
            button — no silent side effects. */}
        {method === "bank" && bankAccount && (
          <div className="rounded-2xl border border-kasi-gold/30 bg-gradient-to-br from-kasi-gold/[0.08] to-transparent p-4 flex flex-col gap-3">
            <div className="flex items-start gap-2">
              <Landmark
                size={18}
                className="text-kasi-gold shrink-0 mt-0.5"
              />
              <div className="text-sm text-white/80 leading-relaxed">
                {tr("contribBankExplain", lang)}
              </div>
            </div>

            {/* Bank details grid */}
            <div className="flex flex-col gap-2 mt-1 rounded-xl bg-black/25 border border-white/5 px-3 py-3">
              {bankAccount.bankName && (
                <DetailRow
                  label={tr("bankName", lang)}
                  value={bankAccount.bankName}
                />
              )}
              {bankAccount.accountHolder && (
                <DetailRow
                  label={tr("bankAccountHolder", lang)}
                  value={bankAccount.accountHolder}
                />
              )}
              {bankAccount.accountNumber && (
                <DetailRow
                  label={tr("bankAccountNumber", lang)}
                  value={bankAccount.accountNumber}
                  mono
                />
              )}
              {bankAccount.branchCode && (
                <DetailRow
                  label={tr("bankBranchCode", lang)}
                  value={bankAccount.branchCode}
                  mono
                />
              )}
              {bankAccount.payshapPhone && (
                <DetailRow
                  label={tr("bankPayshapPhone", lang)}
                  value={bankAccount.payshapPhone}
                  mono
                />
              )}
              <div className="h-px bg-white/5 my-1" />
              <DetailRow
                label={tr("bankReference", lang)}
                value={reference}
                mono
                highlight
              />
            </div>

            {/* Copy + WhatsApp actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={copyBank}
                className={
                  "py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 border " +
                  (copied
                    ? "bg-kasi-green/15 border-kasi-green/40 text-kasi-green"
                    : "bg-bg-card border-white/10 text-white/80")
                }
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied
                  ? tr("bankCopied", lang)
                  : tr("bankCopyDetails", lang)}
              </button>
              <button
                onClick={shareViaWhatsApp}
                className="py-2.5 rounded-xl bg-emerald-500 text-bg text-sm font-semibold flex items-center justify-center gap-1.5"
              >
                <MessageCircle size={14} />
                WhatsApp
              </button>
            </div>
          </div>
        )}

        {method === "card" && (
          <div className="rounded-2xl border border-kasi-green/30 bg-kasi-green/[0.06] p-3 flex gap-3">
            <Zap size={18} className="text-kasi-green shrink-0 mt-0.5" />
            <div className="text-sm text-white/80 leading-relaxed">
              {tr("contribPayYocoHelp", lang)}
              {paymentIsTest && (
                <span className="ml-1 text-kasi-gold text-xs">
                  ({tr("payTestBadge", lang)})
                </span>
              )}
            </div>
          </div>
        )}

        {method === "legacy" && (
          <div className="rounded-2xl border border-kasi-gold/30 bg-kasi-gold/[0.06] p-3 flex gap-3">
            <Info size={18} className="text-kasi-gold shrink-0 mt-0.5" />
            <div className="text-sm text-white/80 leading-relaxed">
              {tr("contribManualExplain", lang)}
            </div>
          </div>
        )}

        {/* Admin nudge: neither bank nor Yoco set up. Only the admin
            can fix this, so only the admin sees the CTA. */}
        {method === "legacy" && isAdmin && (
          <div className="text-white/50 text-xs">
            {tr("contribSetupBankingCTA", lang)}
          </div>
        )}

        {error && <div className="text-kasi-coral text-sm">{error}</div>}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-2">
          <button
            onClick={submit}
            disabled={!canSubmit}
            className={
              "py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 " +
              (canSubmit
                ? method === "card"
                  ? "bg-kasi-green text-bg shadow-glow"
                  : "bg-kasi-gold text-bg shadow-gold"
                : "bg-white/5 text-white/30 cursor-not-allowed")
            }
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : method === "card" ? (
              <CreditCard size={18} />
            ) : method === "bank" ? (
              <Check size={18} />
            ) : (
              <Plus size={18} />
            )}
            {primaryLabel()}
          </button>
          <button
            onClick={onClose}
            disabled={submitting}
            className="py-3 rounded-2xl bg-bg-card border border-white/10 text-white/70"
          >
            {tr("contribCancel", lang)}
          </button>
        </div>
      </div>
    </SheetShell>
  );
}

// Compact label / value row used inside the bank-details card.
// Extracted here (not in a shared components file yet) because it's
// only used inside ContributeSheet today; will move when a second
// screen needs the same look.
function DetailRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wider text-white/45 shrink-0">
        {label}
      </span>
      <span
        className={
          "text-sm text-right break-all " +
          (mono ? "font-mono tabular-nums " : "") +
          (highlight ? "text-kasi-gold font-bold" : "text-white")
        }
      >
        {value}
      </span>
    </div>
  );
}


// ============================================================================
// RejectContributionSheet — admin confirms + adds an optional reason before
// rejecting a pending contribution. Reason is shown to the member on the
// rejected row in Recent Contributions so they know why it wasn't accepted.
// ============================================================================
function RejectContributionSheet({
  lang,
  contribution,
  busy,
  onClose,
  onConfirm,
}: {
  lang: Lang;
  contribution: Contribution;
  busy: boolean;
  onClose: () => void;
  onConfirm: (
    reason: string,
  ) => Promise<{ ok: true } | { ok: false; error: string } | undefined>;
}) {
  const [reason, setReason] = useState("");

  return (
    <SheetShell title={tr("verifyRejectPromptTitle", lang)} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-white/70 text-sm leading-relaxed">
          {tr("verifyRejectPromptBody", lang)}
        </p>

        {/* Summary of the contribution being rejected. */}
        <div className="rounded-2xl bg-bg-card border border-white/5 px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {contribution.memberName ?? "—"}
            </div>
            {contribution.reference && (
              <div className="text-[11px] text-white/50 font-mono">
                {contribution.reference}
              </div>
            )}
          </div>
          <div className="font-display font-semibold text-kasi-gold">
            {formatRand(contribution.amount)}
          </div>
        </div>

        {/* Optional reason */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-white/50">
            {tr("contribNoteLabel", lang)}
          </label>
          <input
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={tr("verifyRejectReasonPlaceholder", lang)}
            maxLength={120}
            className="mt-1 w-full px-4 py-3 rounded-2xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-coral"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-2">
          <button
            disabled={busy}
            onClick={() => onConfirm(reason.trim())}
            className={
              "py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 " +
              (busy
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-kasi-coral text-bg")
            }
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <X size={16} />
            )}
            {tr("verifyRejectBtn", lang)}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="py-3 rounded-2xl bg-bg-card border border-white/10 text-white/70"
          >
            {tr("contribCancel", lang)}
          </button>
        </div>
      </div>
    </SheetShell>
  );
}


// ============================================================================
// BankingSheet (PR #29)
//
// A bottom-sheet version of the banking form that lives inside the
// Stokvel screen. Same fields, same server-side save path, as the
// BankingBlock inside Settings — but reachable directly from the
// empty-state prompt so admins don't have to hunt through the
// Settings tab to find it.
//
// Rules for a "usable" account (mirrors the check in the parent):
//   * Bank name is required
//   * At least ONE of accountNumber / payshapPhone is required
//
// On successful save, the sheet closes automatically. The parent
// Stokvel screen re-renders with the empty-state prompt hidden
// (because hasBankingConfigured is now true) and the ContributeSheet
// picks up the new account details the next time a member taps a
// quick-amount tile.
// ============================================================================

function BankingSheet({
  lang,
  existing,
  onClose,
  onSave,
}: {
  lang: Lang;
  existing: StokvelBankAccount | null;
  onClose: () => void;
  onSave: (bank: {
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
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Same "usability" rules as Stokvel's hasBankingConfigured check.
  // Bank name is required; at least one destination (account number
  // OR PayShap phone) is required.
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
    if (result.ok) {
      setSaved(true);
      // Small beat so the user sees the "Saved ✓" state before we
      // pull the sheet away.
      window.setTimeout(onClose, 900);
    } else {
      setError(result.error);
    }
  };

  return (
    <SheetShell title={tr("stokvelBankingSheetTitle", lang)} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-white/60 text-sm leading-relaxed">
          {tr("stokvelBankingSheetSub", lang)}
        </p>

        <BankingSheetField
          label={tr("bankName", lang)}
          value={bankName}
          onChange={setBankName}
          placeholder={tr("settingsBankingPlaceholderBank", lang)}
        />
        <BankingSheetField
          label={tr("bankAccountHolder", lang)}
          value={accountHolder}
          onChange={setAccountHolder}
          placeholder={tr("settingsBankingPlaceholderHolder", lang)}
        />
        <BankingSheetField
          label={tr("bankAccountNumber", lang)}
          value={accountNumber}
          onChange={setAccountNumber}
          placeholder={tr("settingsBankingPlaceholderAccount", lang)}
          mono
          inputMode="numeric"
        />
        <BankingSheetField
          label={tr("bankBranchCode", lang)}
          value={branchCode}
          onChange={setBranchCode}
          placeholder={tr("settingsBankingPlaceholderBranch", lang)}
          mono
          inputMode="numeric"
        />
        <BankingSheetField
          label={tr("bankPayshapPhone", lang)}
          value={payshapPhone}
          onChange={setPayshapPhone}
          placeholder={tr("settingsBankingPlaceholderPayshap", lang)}
          mono
          inputMode="tel"
        />

        {error && (
          <div className="rounded-xl bg-kasi-coral/[0.08] border border-kasi-coral/25 text-kasi-coral text-xs px-3 py-2">
            {error}
          </div>
        )}
        {saved && (
          <div className="rounded-xl bg-kasi-green/[0.08] border border-kasi-green/25 text-kasi-green text-sm px-3 py-2 flex items-center gap-2">
            <Check size={14} />
            {tr("stokvelBankingSheetSaved", lang)}
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit}
          className={
            "mt-2 py-3.5 rounded-2xl font-semibold flex items-center justify-center gap-2 " +
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
          {tr("stokvelBankingSheetSave", lang)}
        </button>
      </div>
    </SheetShell>
  );
}

// Local field component. Kept private to the file because it's only
// used inside BankingSheet and its shape is slightly different from
// the one in Settings (mobile-first layout, tighter vertical rhythm
// suited to a sheet).
function BankingSheetField({
  label,
  value,
  onChange,
  placeholder,
  mono,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  inputMode?: "text" | "numeric" | "tel";
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
        autoCapitalize={mono ? "off" : "words"}
        autoCorrect="off"
        spellCheck={false}
        className={
          "px-4 py-3 rounded-xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green " +
          (mono ? "font-mono text-sm tracking-wide" : "")
        }
      />
    </label>
  );
}

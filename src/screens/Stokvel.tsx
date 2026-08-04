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
} from "lucide-react";
import { useEffect, useState } from "react";
import type { Lang } from "../i18n";
import { tr, trParams } from "../i18n";
import {
  formatRand,
  memberContributed,
  stokvelProgress,
  stokvelTotal,
  useStore,
} from "../store";
import type { StokvelInvite } from "../store";
import type { Screen } from "../App";

const QUICK_AMOUNTS = [50, 100, 250, 500];

type Sheet = null | "create" | "join" | "invite" | "leave";

export function Stokvel({
  lang,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const {
    state,
    userId,
    addContribution,
    createStokvelAsAdmin,
    joinStokvelByCode,
    generateInvite,
    getLatestInvite,
    leaveStokvel,
  } = useStore();
  const stokvel = state.stokvel;

  const [sheet, setSheet] = useState<Sheet>(null);
  const [flash, setFlash] = useState<number | null>(null);
  const [displayed, setDisplayed] = useState(0);

  const targetProgress = stokvelProgress(stokvel);
  const total = stokvelTotal(stokvel);
  const goalReached = Boolean(stokvel && targetProgress >= 1);
  const isAdmin = stokvel?.role === "admin";

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

  const contribute = (amount: number) => {
    addContribution(amount);
    setFlash(amount);
    setTimeout(() => setFlash(null), 1600);
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
              onClose={() => setSheet(null)}
              onSubmit={joinStokvelByCode}
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

      {/* Quick contribute */}
      <div className="mt-6">
        <div className="text-white/50 text-xs uppercase tracking-wider mb-3">
          {tr("quickAdd", lang)}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amt) => (
            <motion.button
              key={amt}
              whileTap={{ scale: 0.95 }}
              onClick={() => contribute(amt)}
              className="py-3.5 rounded-2xl bg-bg-card border border-white/5 flex flex-col items-center gap-0.5 hover:border-kasi-green/40 active:border-kasi-green transition-colors"
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
      </div>

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

      {/* Contribution history */}
      {stokvel.contributions.length > 0 && (
        <div className="mt-6">
          <div className="text-white/50 text-xs uppercase tracking-wider mb-3">
            {tr("recentContributions", lang)}
          </div>
          <div className="flex flex-col gap-2">
            {stokvel.contributions.slice(0, 10).map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between rounded-2xl bg-bg-card border border-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-kasi-gold/15 border border-kasi-gold/30 flex items-center justify-center shrink-0">
                    <Plus size={16} className="text-kasi-gold" />
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
                    <div className="text-[11px] text-white/50">
                      {daysAgo(c.createdAt) === 0
                        ? "Today"
                        : `${daysAgo(c.createdAt)} days ago`}
                    </div>
                  </div>
                </div>
                <div className="font-display font-semibold text-kasi-green">
                  +{formatRand(c.amount)}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

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
    goal: number;
    members: number;
  }) => Promise<string | null>;
}) {
  const [name, setName] = useState("");
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
}: {
  lang: Lang;
  onClose: () => void;
  onSubmit: (
    code: string,
  ) =>
    | Promise<{ ok: true; stokvelId: string } | { ok: false; error: string }>
    | { ok: false; error: string };
}) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const clean = code.trim();
    if (!clean) return;
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(clean);
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
              setCode(e.target.value.toUpperCase());
              if (error) setError(null);
            }}
            placeholder={tr("stokvelJoinCodePlaceholder", lang)}
            className="mt-1 w-full px-4 py-3.5 rounded-xl bg-bg-card border border-white/10 text-white text-lg font-mono tracking-wider outline-none focus:border-kasi-green"
          />
        </div>
        {error && <div className="text-kasi-coral text-sm">{error}</div>}
        <button
          onClick={submit}
          disabled={!code.trim() || submitting}
          className={
            "mt-2 py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 " +
            (code.trim() && !submitting
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

  const copy = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

  const shareWA = () => {
    if (!invite) return;
    const message = trParams("stokvelInviteWhatsAppMessage", lang, {
      code: invite.code,
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

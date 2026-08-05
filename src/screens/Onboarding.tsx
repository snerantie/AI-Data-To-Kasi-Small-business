import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  KeyRound,
  SkipForward,
} from "lucide-react";
import type { BusinessType } from "../store";
import { useStore } from "../store";
import type { Lang } from "../i18n";
import { LANGS, tr, trParams } from "../i18n";
import { Logo } from "../components/Logo";

type Step = 0 | 1 | 2 | 3;

const BUSINESS_TYPES: { code: BusinessType; icon: string }[] = [
  { code: "spaza", icon: "🏪" },
  { code: "salon", icon: "💇" },
  { code: "taxi", icon: "🚐" },
  { code: "tailor", icon: "🪡" },
  { code: "food", icon: "🍲" },
  { code: "other", icon: "✨" },
];

export function Onboarding() {
  const {
    state,
    setLang,
    setProfile,
    createStokvelAsAdmin,
    joinStokvelByCode,
    finishOnboarding,
  } = useStore();

  const initialStep: Step = useMemo(() => {
    if (!state.lang) return 0;
    if (!state.profile.ownerName) return 1;
    if (!state.profile.businessName || !state.profile.businessType) return 2;
    return 3;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStep] = useState<Step>(initialStep);
  const lang: Lang = state.lang ?? "en";

  // Steps 0-2
  const [langPick, setLangPick] = useState<Lang>(state.lang ?? "en");
  const [ownerName, setOwnerName] = useState(state.profile.ownerName ?? "");
  const [businessName, setBusinessName] = useState(
    state.profile.businessName ?? "",
  );
  const [businessType, setBusinessType] = useState<BusinessType | null>(
    state.profile.businessType,
  );

  // Step 3: stokvel choice
  type StokvelMode = "choose" | "create" | "join" | "skip";
  const [stokvelMode, setStokvelMode] = useState<StokvelMode>("choose");
  const [stokvelName, setStokvelName] = useState("");
  const [stokvelGoal, setStokvelGoal] = useState(5000);
  const [stokvelMembers, setStokvelMembers] = useState(4);
  const [joinCode, setJoinCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = 4;

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return ownerName.trim().length >= 1;
    // Step 2 (business) is fully optional: KasiKash is also used by
    // people who only want a stokvel with friends and don't run a
    // spaza/salon/etc. Users tap "I don't have a business" to skip,
    // or leave fields blank and tap Next.
    if (step === 2) return true;
    if (step === 3) {
      if (stokvelMode === "choose") return false;
      if (stokvelMode === "skip") return true;
      if (stokvelMode === "create") return stokvelName.trim().length >= 1;
      if (stokvelMode === "join") return joinCode.trim().length >= 4;
    }
    return false;
  };

  const skipBusiness = () => {
    setBusinessName("");
    setBusinessType(null);
    setProfile({ businessName: null, businessType: null });
    setStep(3);
  };

  const next = async () => {
    if (!canProceed() || submitting) return;
    if (step === 0) {
      setLang(langPick);
      setStep(1);
    } else if (step === 1) {
      setProfile({ ownerName: ownerName.trim() });
      setStep(2);
    } else if (step === 2) {
      // Only persist what the user actually filled in — either field
      // may be empty for stokvel-only users. Storing null explicitly
      // (rather than an empty string) keeps Home's `businessName &&`
      // conditionals working correctly.
      const bName = businessName.trim();
      setProfile({
        businessName: bName.length > 0 ? bName : null,
        businessType: businessType ?? null,
      });
      setStep(3);
    } else if (step === 3) {
      setError(null);
      setSubmitting(true);
      try {
        if (stokvelMode === "create") {
          const id = await createStokvelAsAdmin({
            name: stokvelName.trim(),
            goal: Number(stokvelGoal) || 5000,
            members: Number(stokvelMembers) || 1,
          });
          if (!id) {
            setError("Could not create stokvel — please try again.");
            return;
          }
        } else if (stokvelMode === "join") {
          const result = await joinStokvelByCode(joinCode.trim());
          if (!result.ok) {
            setError(
              result.error === "invalid_or_expired"
                ? tr("stokvelJoinInvalid", lang)
                : result.error,
            );
            return;
          }
        }
        // skip path: nothing to do
        finishOnboarding();
      } finally {
        setSubmitting(false);
      }
    }
  };

  const back = () => {
    if (step === 3 && stokvelMode !== "choose") {
      // On step 3, "Back" first returns to the choice screen
      setStokvelMode("choose");
      setError(null);
      return;
    }
    if (step > 0) setStep((step - 1) as Step);
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Ambient glow */}
      <motion.div
        className="pointer-events-none absolute top-10 -left-16 w-72 h-72 rounded-full bg-kasi-green/20 blur-3xl"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <motion.div
        className="pointer-events-none absolute bottom-24 -right-16 w-80 h-80 rounded-full bg-kasi-gold/15 blur-3xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 9, repeat: Infinity, delay: 1 }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between px-5 pt-6 pb-3">
        <Logo size={36} />
        <div className="text-[11px] text-white/50 tabular-nums">
          {trParams("onbStepOf", lang, { step: step + 1, total })}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative mx-5 mb-6 h-1 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-kasi-gold to-kasi-green"
          animate={{ width: `${((step + 1) / total) * 100}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 20 }}
        />
      </div>

      {/* Content */}
      <div className="relative flex-1 px-5 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${step}-${step === 3 ? stokvelMode : ""}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.22 }}
            className="flex flex-col gap-5"
          >
            {step === 0 && (
              <LanguageStep pick={langPick} setPick={setLangPick} lang={lang} />
            )}
            {step === 1 && (
              <NameStep
                name={ownerName}
                setName={setOwnerName}
                lang={lang}
              />
            )}
            {step === 2 && (
              <BusinessStep
                name={businessName}
                setName={setBusinessName}
                type={businessType}
                setType={setBusinessType}
                lang={lang}
                onSkip={skipBusiness}
              />
            )}
            {step === 3 && stokvelMode === "choose" && (
              <StokvelChoiceStep
                lang={lang}
                onPickCreate={() => setStokvelMode("create")}
                onPickJoin={() => setStokvelMode("join")}
                onPickSkip={() => setStokvelMode("skip")}
              />
            )}
            {step === 3 && stokvelMode === "create" && (
              <StokvelCreateStep
                name={stokvelName}
                setName={setStokvelName}
                goal={stokvelGoal}
                setGoal={setStokvelGoal}
                members={stokvelMembers}
                setMembers={setStokvelMembers}
                lang={lang}
              />
            )}
            {step === 3 && stokvelMode === "join" && (
              <StokvelJoinStep
                code={joinCode}
                setCode={setJoinCode}
                lang={lang}
              />
            )}
            {step === 3 && stokvelMode === "skip" && (
              <StokvelSkipStep lang={lang} />
            )}
            {error && (
              <div className="text-kasi-coral text-sm">{error}</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="relative px-5 pb-6 pt-2 flex items-center gap-3">
        {(step > 0 || (step === 3 && stokvelMode !== "choose")) && (
          <button
            onClick={back}
            disabled={submitting}
            className="px-4 py-3 rounded-2xl bg-bg-card border border-white/5 text-white/70 flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            {tr("onbBack", lang)}
          </button>
        )}
        {/* On the "choose" sub-step, the choice buttons ARE the primary action;
            we don't show a Next button. Otherwise show Next/Finish. */}
        {!(step === 3 && stokvelMode === "choose") && (
          <button
            onClick={next}
            disabled={!canProceed() || submitting}
            className={
              "flex-1 py-3 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 transition-all " +
              (canProceed() && !submitting
                ? "bg-kasi-green text-bg shadow-glow"
                : "bg-white/5 text-white/30 cursor-not-allowed")
            }
          >
            {submitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {tr("stokvelCreatingProgress", lang)}
              </>
            ) : step === 3 ? (
              <>
                {tr("onbFinish", lang)}
                <Check size={18} />
              </>
            ) : (
              <>
                {tr("onbNext", lang)}
                <ArrowRight size={18} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ---- Step components -------------------------------------------------------

function LanguageStep({
  pick,
  setPick,
  lang,
}: {
  pick: Lang;
  setPick: (l: Lang) => void;
  lang: Lang;
}) {
  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-semibold">
          {tr("onbChooseLang", lang)}
        </h2>
      </div>
      <div className="flex flex-col gap-3">
        {LANGS.map((l) => {
          const active = pick === l.code;
          return (
            <motion.button
              key={l.code}
              onClick={() => setPick(l.code)}
              whileTap={{ scale: 0.98 }}
              className={
                "w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all " +
                (active
                  ? "bg-kasi-green/15 border-kasi-green shadow-glow"
                  : "bg-bg-card border-white/5 hover:border-white/10")
              }
            >
              <div className="flex items-center gap-3">
                <div
                  className={
                    "w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-sm " +
                    (active
                      ? "bg-kasi-green text-bg"
                      : "bg-white/5 text-white/70")
                  }
                >
                  {l.flag}
                </div>
                <div className="text-left">
                  <div className="font-medium">{l.native}</div>
                  <div className="text-xs text-white/50">{l.label}</div>
                </div>
              </div>
              <div
                className={
                  "w-5 h-5 rounded-full border-2 " +
                  (active ? "border-kasi-green bg-kasi-green" : "border-white/20")
                }
              />
            </motion.button>
          );
        })}
      </div>
    </>
  );
}

function NameStep({
  name,
  setName,
  lang,
}: {
  name: string;
  setName: (n: string) => void;
  lang: Lang;
}) {
  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-semibold">
          {tr("onbNameTitle", lang)}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          {tr("onbNameSubtitle", lang)}
        </p>
      </div>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={tr("onbNamePlaceholder", lang)}
        maxLength={40}
        className="w-full px-4 py-4 rounded-2xl bg-bg-card border border-white/10 text-white text-lg outline-none focus:border-kasi-green"
      />
    </>
  );
}

function BusinessStep({
  name,
  setName,
  type,
  setType,
  lang,
  onSkip,
}: {
  name: string;
  setName: (n: string) => void;
  type: BusinessType | null;
  setType: (t: BusinessType) => void;
  lang: Lang;
  onSkip: () => void;
}) {
  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-semibold">
          {tr("onbBusinessTitle", lang)}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          {tr("onbBusinessSubtitle", lang)}
        </p>
        <p className="text-white/40 text-xs mt-2">
          {tr("onbBusinessOptionalHint", lang)}
        </p>
      </div>

      <div>
        <label className="text-[11px] uppercase tracking-wider text-white/50">
          {tr("onbBusinessNameLabel", lang)}
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tr("onbBusinessNamePlaceholder", lang)}
          maxLength={60}
          className="mt-1 w-full px-4 py-3 rounded-2xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green"
        />
      </div>

      <div>
        <label className="text-[11px] uppercase tracking-wider text-white/50">
          {tr("onbBusinessTypeLabel", lang)}
        </label>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {BUSINESS_TYPES.map((b) => {
            const active = type === b.code;
            return (
              <motion.button
                key={b.code}
                whileTap={{ scale: 0.97 }}
                onClick={() => setType(b.code)}
                className={
                  "flex items-center gap-2 px-3 py-3 rounded-2xl border transition-all " +
                  (active
                    ? "bg-kasi-green/15 border-kasi-green"
                    : "bg-bg-card border-white/5")
                }
              >
                <span className="text-lg">{b.icon}</span>
                <span className="text-sm text-left leading-tight">
                  {tr(
                    ("biz" +
                      b.code.charAt(0).toUpperCase() +
                      b.code.slice(1)) as
                      | "bizSpaza"
                      | "bizSalon"
                      | "bizTaxi"
                      | "bizTailor"
                      | "bizFood"
                      | "bizOther",
                    lang,
                  )}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Explicit skip affordance for people who only use KasiKash for a
          stokvel and have no business. Placed after the fields so users
          who intended to fill them in still see the form first. */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onSkip}
        className="mt-1 w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/10 text-white/70 hover:border-white/20 transition-colors"
      >
        <SkipForward size={18} className="text-white/50" />
        <span className="text-sm text-left flex-1">
          {tr("onbNoBusiness", lang)}
        </span>
        <span className="text-white/40">→</span>
      </motion.button>
    </>
  );
}

function StokvelChoiceStep({
  lang,
  onPickCreate,
  onPickJoin,
  onPickSkip,
}: {
  lang: Lang;
  onPickCreate: () => void;
  onPickJoin: () => void;
  onPickSkip: () => void;
}) {
  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-semibold">
          {tr("onbStokvelTitle", lang)}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          {tr("onbStokvelSubtitle", lang)}
        </p>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onPickCreate}
        className="w-full flex items-center gap-4 px-5 py-4 rounded-3xl bg-gradient-to-br from-kasi-gold/25 via-kasi-gold/10 to-transparent border border-kasi-gold/40 min-h-[72px]"
      >
        <div className="w-12 h-12 rounded-2xl bg-kasi-gold text-bg flex items-center justify-center shrink-0 shadow-gold">
          <Plus size={22} />
        </div>
        <div className="text-left flex-1">
          <div className="font-semibold">
            {tr("onbStokvelChoiceCreate", lang)}
          </div>
          <div className="text-white/60 text-xs">
            {tr("stokvelCreateCardDesc", lang)}
          </div>
        </div>
        <span className="text-kasi-gold">→</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onPickJoin}
        className="w-full flex items-center gap-4 px-5 py-4 rounded-3xl bg-gradient-to-br from-kasi-green/25 via-kasi-green/10 to-transparent border border-kasi-green/40 min-h-[72px]"
      >
        <div className="w-12 h-12 rounded-2xl bg-kasi-green text-bg flex items-center justify-center shrink-0 shadow-glow">
          <KeyRound size={22} />
        </div>
        <div className="text-left flex-1">
          <div className="font-semibold">
            {tr("onbStokvelChoiceJoin", lang)}
          </div>
          <div className="text-white/60 text-xs">
            {tr("stokvelJoinCardDesc", lang)}
          </div>
        </div>
        <span className="text-kasi-green">→</span>
      </motion.button>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onPickSkip}
        className="w-full flex items-center gap-4 px-5 py-4 rounded-3xl bg-bg-card border border-white/10 min-h-[72px]"
      >
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-white/60 flex items-center justify-center shrink-0">
          <SkipForward size={20} />
        </div>
        <div className="text-left flex-1">
          <div className="font-semibold text-white/80">
            {tr("onbStokvelChoiceSkip", lang)}
          </div>
        </div>
      </motion.button>
    </>
  );
}

function StokvelCreateStep({
  name,
  setName,
  goal,
  setGoal,
  members,
  setMembers,
  lang,
}: {
  name: string;
  setName: (n: string) => void;
  goal: number;
  setGoal: (n: number) => void;
  members: number;
  setMembers: (n: number) => void;
  lang: Lang;
}) {
  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
          <Plus size={22} className="text-kasi-gold" />
          {tr("stokvelCreateHeader", lang)}
        </h2>
      </div>

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
          className="mt-1 w-full px-4 py-3 rounded-2xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
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
            className="mt-1 w-full px-4 py-3 rounded-2xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green"
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
            className="mt-1 w-full px-4 py-3 rounded-2xl bg-bg-card border border-white/10 text-white outline-none focus:border-kasi-green"
          />
        </div>
      </div>
    </>
  );
}

function StokvelJoinStep({
  code,
  setCode,
  lang,
}: {
  code: string;
  setCode: (c: string) => void;
  lang: Lang;
}) {
  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
          <KeyRound size={22} className="text-kasi-green" />
          {tr("stokvelJoinHeader", lang)}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          {tr("stokvelJoinCardDesc", lang)}
        </p>
      </div>

      <div>
        <label className="text-[11px] uppercase tracking-wider text-white/50">
          {tr("stokvelJoinCodeLabel", lang)}
        </label>
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={tr("stokvelJoinCodePlaceholder", lang)}
          className="mt-1 w-full px-4 py-3.5 rounded-2xl bg-bg-card border border-white/10 text-white text-lg font-mono tracking-wider outline-none focus:border-kasi-green"
        />
      </div>
    </>
  );
}

function StokvelSkipStep({ lang }: { lang: Lang }) {
  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-semibold">
          {tr("onbStokvelChoiceSkip", lang)}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          {tr("stokvelEmptySub", lang)}
        </p>
      </div>
      <div className="rounded-2xl bg-bg-card border border-white/5 p-4 text-white/60 text-sm">
        You can create or join a stokvel any time from the Stokvel tab.
      </div>
    </>
  );
}

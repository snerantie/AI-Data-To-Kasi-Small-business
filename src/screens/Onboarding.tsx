import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Store } from "lucide-react";
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
  const { state, setLang, setProfile, setStokvelMeta, finishOnboarding } =
    useStore();

  // Resume from wherever the user left off if they closed the browser.
  const initialStep: Step = useMemo(() => {
    if (!state.lang) return 0;
    if (!state.profile.ownerName) return 1;
    if (!state.profile.businessName || !state.profile.businessType) return 2;
    return 3;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStep] = useState<Step>(initialStep);
  const lang: Lang = state.lang ?? "en";

  // Step-local form state (mirrors the store so we can save on Next)
  const [langPick, setLangPick] = useState<Lang>(state.lang ?? "en");
  const [ownerName, setOwnerName] = useState(state.profile.ownerName ?? "");
  const [businessName, setBusinessName] = useState(
    state.profile.businessName ?? "",
  );
  const [businessType, setBusinessType] = useState<BusinessType | null>(
    state.profile.businessType,
  );
  const [stokvelName, setStokvelName] = useState(state.stokvel.name);
  const [stokvelGoal, setStokvelGoal] = useState(state.stokvel.goal || 5000);
  const [stokvelMembers, setStokvelMembers] = useState(
    state.stokvel.members || 4,
  );

  const total = 4;

  const canProceed = () => {
    if (step === 0) return true;
    if (step === 1) return ownerName.trim().length >= 1;
    if (step === 2)
      return businessName.trim().length >= 1 && businessType !== null;
    if (step === 3) return true; // stokvel is optional
    return false;
  };

  const next = () => {
    if (!canProceed()) return;
    if (step === 0) {
      setLang(langPick);
      setStep(1);
    } else if (step === 1) {
      setProfile({ ownerName: ownerName.trim() });
      setStep(2);
    } else if (step === 2) {
      setProfile({
        businessName: businessName.trim(),
        businessType: businessType!,
      });
      setStep(3);
    } else if (step === 3) {
      if (stokvelName.trim().length > 0) {
        setStokvelMeta({
          name: stokvelName.trim(),
          goal: Number(stokvelGoal) || 5000,
          members: Number(stokvelMembers) || 1,
        });
      }
      finishOnboarding();
    }
  };

  const back = () => {
    if (step > 0) setStep((step - 1) as Step);
  };

  const skipStokvel = () => {
    // finishOnboarding without creating a stokvel; user can add later from Settings
    finishOnboarding();
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Ambient */}
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

      {/* Header: logo + step indicator */}
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

      {/* Step content */}
      <div className="relative flex-1 px-5 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
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
              />
            )}
            {step === 3 && (
              <StokvelStep
                name={stokvelName}
                setName={setStokvelName}
                goal={stokvelGoal}
                setGoal={setStokvelGoal}
                members={stokvelMembers}
                setMembers={setStokvelMembers}
                lang={lang}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer buttons */}
      <div className="relative px-5 pb-6 pt-2 flex items-center gap-3">
        {step > 0 && (
          <button
            onClick={back}
            className="px-4 py-3 rounded-2xl bg-bg-card border border-white/5 text-white/70 flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            {tr("onbBack", lang)}
          </button>
        )}
        {step === 3 && (
          <button
            onClick={skipStokvel}
            className="text-white/50 text-sm underline"
          >
            {tr("onbStokvelSkip", lang)}
          </button>
        )}
        <button
          onClick={next}
          disabled={!canProceed()}
          className={
            "flex-1 py-3 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 transition-all " +
            (canProceed()
              ? "bg-kasi-green text-bg shadow-glow"
              : "bg-white/5 text-white/30 cursor-not-allowed")
          }
        >
          {step === 3 ? tr("onbFinish", lang) : tr("onbNext", lang)}
          {step === 3 ? <Check size={18} /> : <ArrowRight size={18} />}
        </button>
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
}: {
  name: string;
  setName: (n: string) => void;
  type: BusinessType | null;
  setType: (t: BusinessType) => void;
  lang: Lang;
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
    </>
  );
}

function StokvelStep({
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
          <Store size={22} className="text-kasi-gold" />
          {tr("onbStokvelTitle", lang)}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          {tr("onbStokvelSubtitle", lang)}
        </p>
      </div>

      <div>
        <label className="text-[11px] uppercase tracking-wider text-white/50">
          {tr("onbStokvelNameLabel", lang)}
        </label>
        <input
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

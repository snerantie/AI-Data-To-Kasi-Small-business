import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  KeyRound,
  SkipForward,
} from "lucide-react";
import type { BusinessType, ServiceType, StokvelKind } from "../store";
import { useStore } from "../store";
import type { Lang } from "../i18n";
import { LANGS, tr, trParams } from "../i18n";
import { normalizeInviteCode } from "../lib/inviteLink";
import { Logo } from "../components/Logo";

type Step = 0 | 1 | 2 | 3;

export function Onboarding() {
  const {
    state,
    setLang,
    setProfile,
    createStokvelAsAdmin,
    joinStokvelByCode,
    finishOnboarding,
  } = useStore();

  const { setEnabledServices } = useStore();

  // PR #36 — ALWAYS start at the language step for a fresh onboarding.
  // Previously we resumed at a later step if `state.lang` was already
  // set (e.g. a returning tester whose language persisted in
  // localStorage). That made the app appear to "skip step 1" and jump
  // straight to the name step, which confused first-time users.
  // Onboarding is 4 short steps — always starting at the top is
  // predictable and worth more than resuming mid-flow.
  const [step, setStep] = useState<Step>(0);
  const lang: Lang = state.lang ?? "en";

  // Steps 0-1
  const [langPick, setLangPick] = useState<Lang>(state.lang ?? "en");
  const [ownerName, setOwnerName] = useState(state.profile.ownerName ?? "");

  // Step 2 — service selection. Multi-select across the service
  // categories. The user only ever sees the services they pick here;
  // e.g. a mashonisa-and-stokvel user never lands on a "Today's
  // takings" business dashboard.
  const [pickSpaza, setPickSpaza] = useState(false);
  const [pickFood, setPickFood] = useState(false);
  const [pickMashonisa, setPickMashonisa] = useState(false);
  const [pickStokvel, setPickStokvel] = useState(false);
  // PR #37 — burial society is a stokvel kind, so picking it enables
  // the stokvel service and seeds the group's kind to 'burial'.
  const [pickBurial, setPickBurial] = useState(false);

  // Either a regular stokvel or a burial society uses the stokvel
  // service + setup flow.
  const wantsStokvelService = pickStokvel || pickBurial;
  // Which kind to seed the onboarding stokvel creation with. Burial
  // wins only when the user picked burial but NOT a regular stokvel.
  const onboardingStokvelKind: StokvelKind =
    pickBurial && !pickStokvel ? "burial" : "savings";

  const businessChosen = pickSpaza || pickFood;
  // If both business options are picked we record 'spaza' as the
  // primary type — both map to the same 'business' service anyway,
  // the type is just a label used for personalisation.
  const chosenBusinessType: BusinessType | null = pickSpaza
    ? "spaza"
    : pickFood
      ? "food"
      : null;
  const chosenServices: ServiceType[] = [
    ...(businessChosen ? (["business"] as ServiceType[]) : []),
    ...(pickMashonisa ? (["mashonisa"] as ServiceType[]) : []),
    ...(wantsStokvelService ? (["stokvel"] as ServiceType[]) : []),
  ];
  const anyServiceChosen = chosenServices.length > 0;

  // Step 3: stokvel choice (only reached when the user picked the
  // stokvel service in step 2)
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
    // Step 2 — must pick at least one service.
    if (step === 2) return anyServiceChosen;
    if (step === 3) {
      // If the user didn't choose a stokvel/burial group, step 3 is a
      // simple "you're all set" summary — always proceedable.
      if (!wantsStokvelService) return true;
      if (stokvelMode === "choose") return false;
      if (stokvelMode === "skip") return true;
      if (stokvelMode === "create") return stokvelName.trim().length >= 1;
      if (stokvelMode === "join") return normalizeInviteCode(joinCode) !== null;
    }
    return false;
  };

  // Apply the service selection + business profile, then complete
  // onboarding. Called from the final step.
  const applyAndFinish = async () => {
    // Persist business profile (type + name fallback) only if a
    // business service was chosen; otherwise clear it so a
    // stokvel/mashonisa-only user isn't tagged as a business.
    setProfile({
      businessType: chosenBusinessType,
      businessName: businessChosen
        ? state.profile.businessName || ownerName.trim() || null
        : null,
    });
    await setEnabledServices(chosenServices);
    finishOnboarding();
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
      setStep(3);
    } else if (step === 3) {
      setError(null);
      setSubmitting(true);
      try {
        // Stokvel setup only runs if the user picked the stokvel
        // service AND chose create/join (not skip).
        if (wantsStokvelService && stokvelMode === "create") {
          const id = await createStokvelAsAdmin({
            name: stokvelName.trim(),
            kind: onboardingStokvelKind,
            goal: Number(stokvelGoal) || 5000,
            members: Number(stokvelMembers) || 1,
          });
          if (!id) {
            setError("Could not create stokvel — please try again.");
            return;
          }
        } else if (wantsStokvelService && stokvelMode === "join") {
          const canonical = normalizeInviteCode(joinCode);
          if (!canonical) {
            setError(tr("stokvelJoinInvalid", lang));
            return;
          }
          const result = await joinStokvelByCode(canonical);
          if (!result.ok) {
            setError(
              result.error === "invalid_or_expired"
                ? tr("stokvelJoinInvalid", lang)
                : result.error,
            );
            return;
          }
        }
        await applyAndFinish();
      } finally {
        setSubmitting(false);
      }
    }
  };

  const back = () => {
    if (step === 3 && wantsStokvelService && stokvelMode !== "choose") {
      // On the stokvel setup sub-step, "Back" first returns to the
      // choice screen.
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
              <ServicesStep
                lang={lang}
                pickSpaza={pickSpaza}
                setPickSpaza={setPickSpaza}
                pickFood={pickFood}
                setPickFood={setPickFood}
                pickMashonisa={pickMashonisa}
                setPickMashonisa={setPickMashonisa}
                pickStokvel={pickStokvel}
                setPickStokvel={setPickStokvel}
                pickBurial={pickBurial}
                setPickBurial={setPickBurial}
              />
            )}
            {/* Step 3 — stokvel setup ONLY if the user picked the
                stokvel service; otherwise a simple "you're set"
                summary of the services they chose. */}
            {step === 3 && wantsStokvelService && stokvelMode === "choose" && (
              <StokvelChoiceStep
                lang={lang}
                onPickCreate={() => setStokvelMode("create")}
                onPickJoin={() => setStokvelMode("join")}
                onPickSkip={() => setStokvelMode("skip")}
              />
            )}
            {step === 3 && wantsStokvelService && stokvelMode === "create" && (
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
            {step === 3 && wantsStokvelService && stokvelMode === "join" && (
              <StokvelJoinStep
                code={joinCode}
                setCode={setJoinCode}
                lang={lang}
              />
            )}
            {step === 3 && wantsStokvelService && stokvelMode === "skip" && (
              <StokvelSkipStep lang={lang} />
            )}
            {step === 3 && !wantsStokvelService && (
              <ReadyStep
                lang={lang}
                spaza={pickSpaza}
                food={pickFood}
                mashonisa={pickMashonisa}
              />
            )}
            {error && (
              <div className="text-kasi-coral text-sm">{error}</div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="relative px-5 pb-6 pt-2 flex items-center gap-3">
        {(step > 0 ||
          (step === 3 && pickStokvel && stokvelMode !== "choose")) && (
          <button
            onClick={back}
            disabled={submitting}
            className="px-4 py-3 rounded-2xl bg-bg-card border border-white/5 text-white/70 flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            {tr("onbBack", lang)}
          </button>
        )}
        {/* On the stokvel "choose" sub-step, the choice buttons ARE the
            primary action; we don't show a Next button. Otherwise show
            Next/Finish. */}
        {!(step === 3 && wantsStokvelService && stokvelMode === "choose") && (
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

/**
 * PR #36 — the service picker. Multi-select cards for what the user
 * uses KasiKash for. Only the picked services appear in the app
 * afterward. Burial Society is shown as "coming soon" so the vision
 * is visible without over-promising a screen that doesn't exist yet.
 */
function ServicesStep({
  lang,
  pickSpaza,
  setPickSpaza,
  pickFood,
  setPickFood,
  pickMashonisa,
  setPickMashonisa,
  pickStokvel,
  setPickStokvel,
  pickBurial,
  setPickBurial,
}: {
  lang: Lang;
  pickSpaza: boolean;
  setPickSpaza: (v: boolean) => void;
  pickFood: boolean;
  setPickFood: (v: boolean) => void;
  pickMashonisa: boolean;
  setPickMashonisa: (v: boolean) => void;
  pickStokvel: boolean;
  setPickStokvel: (v: boolean) => void;
  pickBurial: boolean;
  setPickBurial: (v: boolean) => void;
}) {
  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-semibold">
          {tr("onbServicesTitle", lang)}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          {tr("onbServicesSubtitle", lang)}
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <ServiceOption
          icon="🏪"
          title={tr("onbServiceSpaza", lang)}
          desc={tr("onbServiceSpazaDesc", lang)}
          selected={pickSpaza}
          onToggle={() => setPickSpaza(!pickSpaza)}
        />
        <ServiceOption
          icon="🍲"
          title={tr("onbServiceFood", lang)}
          desc={tr("onbServiceFoodDesc", lang)}
          selected={pickFood}
          onToggle={() => setPickFood(!pickFood)}
        />
        <ServiceOption
          icon="💰"
          title={tr("onbServiceMashonisa", lang)}
          desc={tr("onbServiceMashonisaDesc", lang)}
          selected={pickMashonisa}
          onToggle={() => setPickMashonisa(!pickMashonisa)}
        />
        <ServiceOption
          icon="🐷"
          title={tr("onbServiceStokvel", lang)}
          desc={tr("onbServiceStokvelDesc", lang)}
          selected={pickStokvel}
          onToggle={() => setPickStokvel(!pickStokvel)}
        />
        <ServiceOption
          icon="🕊️"
          title={tr("onbServiceBurial", lang)}
          desc={tr("onbServiceBurialDesc", lang)}
          selected={pickBurial}
          onToggle={() => setPickBurial(!pickBurial)}
        />
      </div>
    </>
  );
}

function ServiceOption({
  icon,
  title,
  desc,
  selected,
  onToggle,
  comingSoon,
}: {
  icon: string;
  title: string;
  desc: string;
  selected: boolean;
  onToggle: () => void;
  comingSoon?: string;
}) {
  const disabled = Boolean(comingSoon);
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={disabled ? undefined : onToggle}
      className={
        "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all " +
        (disabled
          ? "bg-white/[0.02] border-white/5 opacity-60 cursor-not-allowed"
          : selected
            ? "bg-kasi-green/15 border-kasi-green shadow-glow"
            : "bg-bg-card border-white/10 hover:border-white/20")
      }
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{title}</span>
          {comingSoon && (
            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-white/5 text-white/40">
              {comingSoon}
            </span>
          )}
        </div>
        <div className="text-white/55 text-xs mt-0.5 leading-tight">
          {desc}
        </div>
      </div>
      {!disabled && (
        <div
          className={
            "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 " +
            (selected
              ? "border-kasi-green bg-kasi-green text-bg"
              : "border-white/20")
          }
        >
          {selected && <Check size={14} />}
        </div>
      )}
    </motion.button>
  );
}

/**
 * Final step for users who did NOT pick the stokvel service (which
 * has its own setup sub-flow). Confirms the services they'll see.
 */
function ReadyStep({
  lang,
  spaza,
  food,
  mashonisa,
}: {
  lang: Lang;
  spaza: boolean;
  food: boolean;
  mashonisa: boolean;
}) {
  const rows: { icon: string; label: string }[] = [];
  if (spaza) rows.push({ icon: "🏪", label: tr("onbServiceSpaza", lang) });
  if (food) rows.push({ icon: "🍲", label: tr("onbServiceFood", lang) });
  if (mashonisa)
    rows.push({ icon: "💰", label: tr("onbServiceMashonisa", lang) });
  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-semibold">
          {tr("onbReadyTitle", lang)}
        </h2>
        <p className="text-white/60 text-sm mt-1">
          {tr("onbReadySubtitle", lang)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-kasi-green/[0.06] border border-kasi-green/25"
          >
            <span className="text-xl">{r.icon}</span>
            <span className="font-medium">{r.label}</span>
            <Check size={16} className="ml-auto text-kasi-green" />
          </div>
        ))}
      </div>
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

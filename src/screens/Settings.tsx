import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import {
  ArrowLeft,
  User,
  Store,
  PiggyBank,
  Database,
  ShieldAlert,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { Screen } from "../App";
import type { Lang, TKey } from "../i18n";
import { LANGS, tr } from "../i18n";
import type { BusinessType } from "../store";
import { formatRand, useStore } from "../store";

const BUSINESS_TYPES: BusinessType[] = [
  "spaza",
  "salon",
  "taxi",
  "tailor",
  "food",
  "other",
];

const bizKey = (t: BusinessType): TKey =>
  ("biz" + t.charAt(0).toUpperCase() + t.slice(1)) as TKey;

export function Settings({
  lang,
  onNavigate,
}: {
  lang: Lang;
  onNavigate: (s: Screen) => void;
}) {
  const {
    state,
    setLang,
    setProfile,
    setStokvelMeta,
    loadSampleData,
    resetAccount,
    isCloud,
    syncStatus,
  } = useStore();

  const [saved, setSaved] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [loadedSample, setLoadedSample] = useState(false);
  const [resetting, setResetting] = useState(false);

  const flashSaved = (key: string) => {
    setSaved(key);
    window.setTimeout(() => setSaved(null), 1400);
  };

  // -- Profile --
  const commitOwnerName = (v: string) => {
    const name = v.trim();
    if (name && name !== state.profile.ownerName) {
      setProfile({ ownerName: name });
      flashSaved("owner");
    }
  };
  const commitLang = (v: Lang) => {
    if (v !== state.lang) {
      setLang(v);
      flashSaved("lang");
    }
  };

  // -- Business --
  const commitBusinessName = (v: string) => {
    const name = v.trim();
    if (name && name !== state.profile.businessName) {
      setProfile({ businessName: name });
      flashSaved("bizName");
    }
  };
  const commitBusinessType = (t: BusinessType) => {
    if (t !== state.profile.businessType) {
      setProfile({ businessType: t });
      flashSaved("bizType");
    }
  };

  // -- Stokvel --
  const commitStokvelName = (v: string) => {
    const name = v.trim();
    if (name && name !== state.stokvel.name) {
      setStokvelMeta({ name });
      flashSaved("stkName");
    }
  };
  const commitStokvelGoal = (n: number) => {
    if (n > 0 && n !== state.stokvel.goal) {
      setStokvelMeta({ goal: n });
      flashSaved("stkGoal");
    }
  };
  const commitStokvelMembers = (n: number) => {
    if (n > 0 && n !== state.stokvel.members) {
      setStokvelMeta({ members: n });
      flashSaved("stkMembers");
    }
  };

  // -- Data --
  const doLoadSample = () => {
    loadSampleData();
    setLoadedSample(true);
    window.setTimeout(() => setLoadedSample(false), 2500);
  };

  // -- Account --
  const doReset = async () => {
    setResetting(true);
    await resetAccount();
    // After reset, App will detect needsOnboarding and route away — but if it
    // doesn't (e.g. race), send them home.
    setResetting(false);
    setConfirmReset(false);
    onNavigate("home");
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
        <h1 className="font-display text-2xl font-semibold">
          {tr("settingsTitle", lang)}
        </h1>
        {isCloud && syncStatus === "synced" && (
          <span className="ml-auto text-[10px] text-kasi-green">☁ Cloud</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-12 space-y-6">
        {/* ---- Profile ---- */}
        <Section
          icon={User}
          title={tr("sectionProfile", lang)}
          accent="green"
        >
          <Field
            label={tr("settingsOwnerLabel", lang)}
            value={state.profile.ownerName ?? ""}
            onCommit={commitOwnerName}
            saved={saved === "owner"}
          />
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1.5">
              {tr("settingsLanguageLabel", lang)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LANGS.map((l) => {
                const active = state.lang === l.code;
                return (
                  <button
                    key={l.code}
                    onClick={() => commitLang(l.code)}
                    className={
                      "py-2.5 rounded-xl text-sm font-medium transition-colors " +
                      (active
                        ? "bg-kasi-green text-bg"
                        : "bg-bg-card border border-white/5 text-white/70")
                    }
                  >
                    {l.native}
                  </button>
                );
              })}
            </div>
            {saved === "lang" && <SavedBadge />}
          </div>
        </Section>

        {/* ---- Business ---- */}
        <Section
          icon={Store}
          title={tr("sectionBusiness", lang)}
          accent="gold"
        >
          <Field
            label={tr("onbBusinessNameLabel", lang)}
            value={state.profile.businessName ?? ""}
            onCommit={commitBusinessName}
            saved={saved === "bizName"}
          />
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1.5">
              {tr("onbBusinessTypeLabel", lang)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {BUSINESS_TYPES.map((b) => {
                const active = state.profile.businessType === b;
                return (
                  <button
                    key={b}
                    onClick={() => commitBusinessType(b)}
                    className={
                      "py-2 rounded-xl text-xs font-medium transition-colors " +
                      (active
                        ? "bg-kasi-gold text-bg"
                        : "bg-bg-card border border-white/5 text-white/70")
                    }
                  >
                    {tr(bizKey(b), lang)}
                  </button>
                );
              })}
            </div>
            {saved === "bizType" && <SavedBadge />}
          </div>
        </Section>

        {/* ---- Stokvel ---- */}
        <Section
          icon={PiggyBank}
          title={tr("sectionStokvel", lang)}
          accent="coral"
        >
          <Field
            label={tr("onbStokvelNameLabel", lang)}
            value={state.stokvel.name}
            onCommit={commitStokvelName}
            saved={saved === "stkName"}
            placeholder={tr("onbStokvelNamePlaceholder", lang)}
          />
          <div className="grid grid-cols-2 gap-2 mt-3">
            <NumberField
              label={tr("onbStokvelGoalLabel", lang)}
              value={state.stokvel.goal}
              onCommit={commitStokvelGoal}
              saved={saved === "stkGoal"}
            />
            <NumberField
              label={tr("onbStokvelMembersLabel", lang)}
              value={state.stokvel.members}
              onCommit={commitStokvelMembers}
              saved={saved === "stkMembers"}
              min={1}
            />
          </div>
          {state.stokvel.name && (
            <div className="mt-3 text-xs text-white/50">
              Goal: <span className="text-kasi-gold font-semibold">
                {formatRand(state.stokvel.goal)}
              </span>
            </div>
          )}
        </Section>

        {/* ---- Data ---- */}
        <Section icon={Database} title={tr("sectionData", lang)} accent="cream">
          <div>
            <div className="font-medium">
              {tr("loadSampleDataTitle", lang)}
            </div>
            <div className="text-white/60 text-sm mt-1">
              {tr("loadSampleDataDesc", lang)}
            </div>
            <button
              onClick={doLoadSample}
              className="mt-3 px-4 py-2.5 rounded-xl bg-kasi-cream/10 border border-kasi-cream/20 text-kasi-cream text-sm font-medium flex items-center gap-2"
            >
              <Sparkles size={14} />
              {loadedSample
                ? tr("loadedSample", lang)
                : tr("loadSampleDataCta", lang)}
            </button>
          </div>
        </Section>

        {/* ---- Account ---- */}
        <Section
          icon={ShieldAlert}
          title={tr("sectionAccount", lang)}
          accent="coral"
        >
          <div>
            <div className="font-medium">{tr("accountAnonymous", lang)}</div>
            <div className="text-white/60 text-sm mt-1">
              {tr("accountAnonymousDesc", lang)}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-kasi-coral/20 bg-kasi-coral/[0.05] p-3">
            <div className="text-sm font-medium text-kasi-coral">
              {tr("accountReset", lang)}
            </div>
            <div className="text-white/60 text-xs mt-1 mb-3">
              {tr("accountResetDesc", lang)}
            </div>

            <AnimatePresence mode="wait">
              {!confirmReset ? (
                <motion.button
                  key="ask"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setConfirmReset(true)}
                  className="px-3 py-2 rounded-lg bg-kasi-coral/15 border border-kasi-coral/30 text-kasi-coral text-xs font-medium"
                >
                  {tr("accountReset", lang)}
                </motion.button>
              ) : (
                <motion.div
                  key="confirm"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-2"
                >
                  <button
                    onClick={doReset}
                    disabled={resetting}
                    className="px-3 py-2 rounded-lg bg-kasi-coral text-bg text-xs font-semibold flex items-center justify-center gap-1"
                  >
                    {resetting ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : null}
                    {tr("accountResetConfirm", lang)}
                  </button>
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="px-3 py-2 rounded-lg bg-bg-card border border-white/10 text-white/70 text-xs"
                  >
                    {tr("accountResetCancel", lang)}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Section>

        <div className="pt-2 text-center text-white/30 text-[10px]">
          {tr("appVersion", lang)} · v0.4
        </div>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: typeof User;
  title: string;
  accent: "green" | "gold" | "coral" | "cream";
  children: React.ReactNode;
}) {
  const color = {
    green: "text-kasi-green",
    gold: "text-kasi-gold",
    coral: "text-kasi-coral",
    cream: "text-kasi-cream",
  }[accent];
  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className={color} />
        <h2 className="text-[11px] uppercase tracking-wider text-white/60">
          {title}
        </h2>
      </div>
      <div className="rounded-2xl bg-bg-card border border-white/5 p-4">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onCommit,
  saved,
  placeholder,
}: {
  label: string;
  value: string;
  onCommit: (v: string) => void;
  saved: boolean;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  // Keep in sync when parent value changes (e.g. after reset)
  if (draft !== value && document.activeElement?.tagName !== "INPUT") {
    setDraft(value);
  }
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1.5">
        {label}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(draft)}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white outline-none focus:border-kasi-green"
      />
      {saved && <SavedBadge />}
    </div>
  );
}

function NumberField({
  label,
  value,
  onCommit,
  saved,
  min,
}: {
  label: string;
  value: number;
  onCommit: (n: number) => void;
  saved: boolean;
  min?: number;
}) {
  const [draft, setDraft] = useState(String(value || ""));
  if (String(value) !== draft && document.activeElement?.tagName !== "INPUT") {
    setDraft(String(value || ""));
  }
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-white/50 mb-1.5">
        {label}
      </div>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => onCommit(Number(draft))}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        className="w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white outline-none focus:border-kasi-green"
      />
      {saved && <SavedBadge />}
    </div>
  );
}

function SavedBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-kasi-green"
    >
      <Check size={10} />
      Saved
    </motion.div>
  );
}

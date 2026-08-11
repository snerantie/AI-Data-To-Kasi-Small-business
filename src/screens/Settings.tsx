import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  User,
  Store,
  PiggyBank,
  ShieldAlert,
  Check,
  Loader2,
  Bell,
  BellOff,
  ChevronDown,
  ChevronUp,
  Wrench,
  Mail,
  MessageSquare,
  MessageCircle,
  Phone,
  LogOut,
  Inbox,
  CreditCard,
  Zap,
  Eye,
  EyeOff,
  Landmark,
  Smartphone,
} from "lucide-react";
import type { Screen } from "../App";
import type { Lang, TKey } from "../i18n";
import { LANGS, tr, trParams } from "../i18n";
import type { BusinessType } from "../store";
import { formatRand, useStore } from "../store";
import { InstallSheet } from "../components/InstallSheet";
import { useInstallPrompt } from "../hooks/useInstallPrompt";

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
    resetAccount,
    isCloud,
    syncStatus,
    isAnonymous,
    pendingAuth,
  } = useStore();

  const [saved, setSaved] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
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

  // -- Stokvel (admin only) --
  const canEditStokvel = state.stokvel?.role === "admin";
  const commitStokvelName = (v: string) => {
    if (!canEditStokvel || !state.stokvel) return;
    const name = v.trim();
    if (name && name !== state.stokvel.name) {
      setStokvelMeta({ name });
      flashSaved("stkName");
    }
  };
  const commitStokvelGoal = (n: number) => {
    if (!canEditStokvel || !state.stokvel) return;
    if (n > 0 && n !== state.stokvel.goal) {
      setStokvelMeta({ goal: n });
      flashSaved("stkGoal");
    }
  };
  const commitStokvelMembers = (n: number) => {
    if (!canEditStokvel || !state.stokvel) return;
    if (n > 0 && n !== state.stokvel.members) {
      setStokvelMeta({ members: n });
      flashSaved("stkMembers");
    }
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
            {/* 2-column grid: fits any even number of supported languages
                cleanly (currently 4: en / zu / st / af). If we ever add a
                5th, revisit — grid-cols-2 with an odd count leaves one
                item spanning slightly wider on the last row, which is
                still nicer than the orphan we'd get from grid-cols-3. */}
            <div className="grid grid-cols-2 gap-2">
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

        {/* ---- Install on this phone (PR #29) ----
             Permanent access point for the install flow. The Home
             banner is dismissible; this Settings section is not, so
             users who tap Not-Now on the banner can still find their
             way back to install later. */}
        <Section
          icon={Smartphone}
          title={tr("installSettingsHeader", lang)}
          accent="green"
        >
          <InstallSettingsBlock lang={lang} />
        </Section>

        {/* ---- Stokvel ---- */}
        <Section
          icon={PiggyBank}
          title={tr("sectionStokvel", lang)}
          accent="coral"
        >
          {!state.stokvel ? (
            <div className="flex flex-col items-start gap-3">
              <div className="text-white/70 text-sm">
                {tr("settingsStokvelNone", lang)}
              </div>
              <button
                onClick={() => onNavigate("stokvel")}
                className="px-4 py-2 rounded-xl bg-kasi-gold text-bg font-semibold text-sm"
              >
                {tr("stokvelNav", lang)} →
              </button>
            </div>
          ) : canEditStokvel ? (
            <>
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
              <div className="mt-3 text-xs text-white/50">
                Goal:{" "}
                <span className="text-kasi-gold font-semibold">
                  {formatRand(state.stokvel.goal)}
                </span>{" "}
                &middot; {state.stokvel.memberships.length}/{state.stokvel.members}{" "}
                {tr("stokvelMembers", lang)}
              </div>
            </>
          ) : (
            // Non-admin (regular member): read-only view
            <div className="flex flex-col gap-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-white/50">
                  {tr("onbStokvelNameLabel", lang)}
                </div>
                <div className="text-base font-medium mt-1">
                  {state.stokvel.name}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/50">
                    {tr("onbStokvelGoalLabel", lang)}
                  </div>
                  <div className="text-base font-medium mt-1 text-kasi-gold">
                    {formatRand(state.stokvel.goal)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/50">
                    {tr("stokvelMembers", lang)}
                  </div>
                  <div className="text-base font-medium mt-1">
                    {state.stokvel.memberships.length} / {state.stokvel.members}
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-white/50 italic">
                {tr("settingsStokvelMemberOnly", lang)}
              </div>
            </div>
          )}
        </Section>

        {/* ---- Stokvel banking (admin only, only if stokvel exists) ----
             This section is the new default way to accept
             contributions — the admin's normal bank account. It
             shows above the Yoco Payments section because it works
             for everyone without any external signup. */}
        {state.stokvel && canEditStokvel && (
          <Section
            icon={Landmark}
            title={tr("settingsBankingHeader", lang)}
            accent="gold"
          >
            <BankingBlock lang={lang} />
          </Section>
        )}

        {/* ---- Payments (admin only, only if stokvel exists) ---- */}
        {state.stokvel && canEditStokvel && (
          <Section
            icon={CreditCard}
            title={tr("sectionPayments", lang)}
            accent="green"
          >
            <PaymentsBlock lang={lang} />
          </Section>
        )}

        {/* ---- Notifications (visible for cloud users only, since
             it only fires on Realtime events from Supabase) ---- */}
        {isCloud && (
          <Section
            icon={Bell}
            title={tr("settingsNotifications", lang)}
            accent="green"
          >
            <NotificationsBlock lang={lang} />
          </Section>
        )}

        {/* ---- Advanced (developer-only setup, hidden by default) ----
             Introduced in PR #24. Regular spaza/stokvel users have
             no business seeing "Phone Number ID / Access Token /
             Verify Token" — that's Meta Cloud API config for
             developers running their own WhatsApp Business
             integration. Wrapping it in a collapsed disclosure means
             everyday users never encounter it, but the option
             still exists for advanced users. */}
        {isCloud && <AdvancedSettingsSection lang={lang} />}

        {/* ---- Account ---- */}
        <Section
          icon={ShieldAlert}
          title={tr("sectionAccount", lang)}
          accent="coral"
        >
          <AccountAuthBlock lang={lang} />

          {isCloud && isAnonymous && !pendingAuth && (
            <div className="mt-4 rounded-2xl border border-kasi-coral/20 bg-kasi-coral/[0.05] p-3">
              <div className="text-sm font-medium text-kasi-coral">
                {tr("accountReset", lang)}
              </div>
              <div className="text-white/60 text-xs mt-1 mb-3">
                {tr("accountResetDesc", lang)}
              </div>
              <button
                onClick={() => setConfirmReset(true)}
                className="px-3 py-2 rounded-lg bg-kasi-coral/15 border border-kasi-coral/30 text-kasi-coral text-xs font-medium"
              >
                {tr("accountReset", lang)}
              </button>
            </div>
          )}
        </Section>

        {/* PR #33 — type-to-confirm reset modal. Renders as a full-
             screen overlay outside the scrolling Settings container
             so it sits above every other surface. Requires typing
             "DELETE" verbatim to enable the confirmation button,
             preventing accidental wipes on shared / borrowed phones
             or a curious child tapping around the app. */}
        <AnimatePresence>
          {confirmReset && (
            <ResetConfirmModal
              lang={lang}
              resetting={resetting}
              salesCount={state.sales.length}
              tabsCount={state.tabs.length}
              contributionsCount={
                state.stokvel?.contributions.length ?? 0
              }
              hasStokvel={!!state.stokvel}
              onCancel={() => setConfirmReset(false)}
              onConfirm={doReset}
            />
          )}
        </AnimatePresence>

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

// ---------------------------------------------------------------------------
// AccountAuthBlock
//
// Handles the four possible auth states in the Settings Account section:
//   1. Not cloud-configured (demo mode)  → informational note only
//   2. pendingAuth is set                → "check your inbox" panel
//   3. Signed in with an email           → email + Sign out button
//   4. Anonymous                         → two-mode form (save data / sign in)
// ---------------------------------------------------------------------------
function AccountAuthBlock({ lang }: { lang: Lang }) {
  const {
    isCloud,
    isSignedIn,
    email,
    phone,
    pendingAuth,
    pendingPhone,
    linkEmailToAccount,
    signInWithEmail,
    linkPhoneToAccount,
    signInWithPhone,
    verifyPhoneCode,
    signOut,
    clearPendingAuth,
  } = useStore();

  const [mode, setMode] = useState<"save" | "signin">("save");
  // Which channel the user is currently using in the anonymous form.
  //
  // PR #33: default to Phone on mobile devices because most kasi
  // users have WhatsApp + SMS but no consistently-checked email.
  // Desktop keeps Email as the default (laptop users typically
  // manage email actively). Users can still tap the other tab.
  const [channel, setChannel] = useState<"email" | "phone">(() => {
    if (typeof window === "undefined") return "email";
    const ua = window.navigator.userAgent || "";
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
    return isMobile ? "phone" : "email";
  });
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // -- Cloud not configured (should be rare in production) ----------------
  if (!isCloud) {
    return (
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          <Mail size={16} className="text-white/40" />
        </div>
        <div>
          <div className="font-medium">{tr("accountAnonymous", lang)}</div>
          <div className="text-white/60 text-sm mt-1">
            The cloud connection isn't set up on this build. Contact
            support to enable saving your account across devices.
          </div>
        </div>
      </div>
    );
  }

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

  const submit = async () => {
    if (channel === "email") {
      const clean = emailInput.trim();
      if (!isValidEmail(clean)) {
        setError(tr("authInvalidEmail", lang));
        return;
      }
      setError(null);
      setSubmitting(true);
      const result =
        mode === "save"
          ? await linkEmailToAccount(clean)
          : await signInWithEmail(clean);
      setSubmitting(false);
      if (result.ok) {
        setPendingEmail(clean);
        setEmailInput("");
      } else {
        const msg = result.error.toLowerCase();
        if (
          mode === "save" &&
          (msg.includes("already") ||
            msg.includes("registered") ||
            msg.includes("exists") ||
            msg.includes("taken"))
        ) {
          setError(null);
          setMode("signin");
          setEmailInput(clean);
        } else {
          setError(result.error);
        }
      }
    } else {
      // Phone flow. Validation happens both here (fast client feedback)
      // and inside the store call (canonical, uses normaliseSAPhone).
      const clean = phoneInput.trim();
      if (!/^(?:\+?27|0)\s*\d(?:[\s\d]){8,}\d$/.test(clean)) {
        setError(tr("authInvalidPhone", lang));
        return;
      }
      setError(null);
      setSubmitting(true);
      const result =
        mode === "save"
          ? await linkPhoneToAccount(clean)
          : await signInWithPhone(clean);
      setSubmitting(false);
      if (result.ok) {
        setPhoneInput("");
        setOtpInput("");
      } else if (result.error === "invalid_phone") {
        setError(tr("authInvalidPhone", lang));
      } else {
        setError(result.error);
      }
    }
  };

  const submitOtp = async () => {
    const clean = otpInput.replace(/\D/g, "");
    if (clean.length < 4) {
      setError(tr("authInvalidCode", lang));
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await verifyPhoneCode(clean);
    setSubmitting(false);
    if (result.ok) {
      setOtpInput("");
    } else if (result.error === "invalid_code") {
      setError(tr("authInvalidCode", lang));
    } else {
      setError(result.error);
    }
  };

  const resendOtp = async () => {
    if (!pendingPhone) return;
    setError(null);
    setSubmitting(true);
    const result =
      pendingAuth === "phone_link"
        ? await linkPhoneToAccount(pendingPhone)
        : await signInWithPhone(pendingPhone);
    setSubmitting(false);
    if (!result.ok) setError(result.error);
  };

  const dismiss = () => {
    clearPendingAuth();
    setPendingEmail(null);
    setError(null);
  };

  const doSignOut = async () => {
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  // -- Pending state: either email magic-link OR phone-OTP -----------------
  //
  // Email paths show a "check your inbox" panel. Phone paths show an
  // OTP entry form because the user needs to type the code from the
  // SMS back into the app — they don't just click a link.
  if (pendingAuth) {
    const isEmailVerification = pendingAuth === "verification";
    const isEmailSignin = pendingAuth === "signin";
    const isPhoneFlow =
      pendingAuth === "phone_link" || pendingAuth === "phone_signin";

    if (isPhoneFlow) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center gap-2 text-kasi-green">
            <MessageSquare size={18} />
            <span className="font-semibold text-sm">
              {tr("authOtpSentTitle", lang)}
            </span>
          </div>
          <div className="text-white/75 text-sm leading-relaxed">
            {trParams("authOtpSentBody", lang, {
              phone: pendingPhone ?? "…",
            })}
          </div>

          <label className="text-[11px] uppercase tracking-wider text-white/50 mt-1">
            {tr("authOtpLabel", lang)}
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={otpInput}
            onChange={(e) => {
              setOtpInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder={tr("authOtpPlaceholder", lang)}
            className="w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white font-mono text-lg tracking-widest text-center outline-none focus:border-kasi-green"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !submitting) submitOtp();
            }}
          />

          {error && <div className="text-xs text-kasi-coral">{error}</div>}

          <button
            onClick={submitOtp}
            disabled={submitting || otpInput.trim().length < 4}
            className={
              "w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 " +
              (otpInput.trim().length >= 4 && !submitting
                ? "bg-kasi-green text-bg shadow-glow"
                : "bg-white/5 text-white/30 cursor-not-allowed")
            }
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {submitting
              ? tr("authVerifying", lang)
              : tr("authVerifyCta", lang)}
          </button>

          <div className="flex gap-2 mt-1">
            <button
              onClick={dismiss}
              className="px-3 py-2 rounded-lg bg-bg border border-white/10 text-white/70 text-xs"
            >
              {tr("authDismiss", lang)}
            </button>
            <button
              onClick={resendOtp}
              disabled={submitting || !pendingPhone}
              className="px-3 py-2 rounded-lg text-kasi-gold text-xs"
            >
              {tr("authResendCta", lang)}
            </button>
          </div>
        </motion.div>
      );
    }

    // Email pending (unchanged from PR #5).
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-start gap-3"
      >
        <div className="flex items-center gap-2 text-kasi-green">
          <Inbox size={18} />
          <span className="font-semibold text-sm">
            {tr(
              isEmailVerification
                ? "authPendingVerificationTitle"
                : "authPendingSigninTitle",
              lang,
            )}
          </span>
        </div>
        <div className="text-white/75 text-sm leading-relaxed">
          {trParams(
            isEmailVerification
              ? "authPendingVerification"
              : "authPendingSignin",
            lang,
            { email: pendingEmail ?? "…" },
          )}
        </div>
        <div className="text-white/40 text-xs">
          {tr("authPendingExpires", lang)}
          {isEmailSignin ? "" : ""}
        </div>
        <div className="flex gap-2">
          <button
            onClick={dismiss}
            className="px-3 py-2 rounded-lg bg-bg border border-white/10 text-white/70 text-xs"
          >
            {tr("authDismiss", lang)}
          </button>
          <button
            onClick={() => {
              dismiss();
              setEmailInput("");
            }}
            className="px-3 py-2 rounded-lg text-kasi-gold text-xs"
          >
            {tr("authTryAnother", lang)}
          </button>
        </div>
      </motion.div>
    );
  }

  // -- Signed in via email OR phone ----------------------------------------
  //
  // The two channels share a signed-in view. Icon + displayed identity
  // (email address vs phone number) change based on which one is on
  // record. When a user has both (e.g. linked email and later linked
  // phone), we prefer email — a small display choice; either identity
  // is a valid way to sign back in later.
  if (isSignedIn && (email || phone)) {
    // PR #33: upgraded from a compact icon+text row to a green-tinted
    // reassurance card that clearly says "your data is safe". Real
    // pilot users needed positive confirmation that their backup
    // worked; the previous UI was too subtle.
    const displayEmail = email;
    const displayPhone = phone;
    const usingPhone = !displayEmail && displayPhone;
    return (
      <div>
        <div className="rounded-2xl bg-kasi-green/[0.06] border border-kasi-green/30 p-4">
          <div className="flex items-center gap-2 text-kasi-green font-semibold text-sm mb-2">
            <Check size={16} />
            {tr("accountBackedUpTitle", lang)}
          </div>
          <div className="flex items-center gap-2.5 mt-3">
            <div className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0">
              {usingPhone ? (
                <Phone size={14} className="text-white/80" />
              ) : (
                <Mail size={14} className="text-white/80" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-wider text-white/50">
                {tr("authSignedInAs", lang)}
              </div>
              <div className="text-white font-medium truncate text-sm">
                {displayEmail ?? displayPhone}
              </div>
            </div>
          </div>
          <div className="text-white/60 text-xs leading-relaxed mt-3">
            {tr("accountBackedUpSub", lang)}
          </div>
        </div>
        <button
          onClick={doSignOut}
          disabled={signingOut}
          className="mt-3 w-full py-2.5 rounded-xl bg-bg border border-white/10 text-white/70 text-sm font-medium flex items-center justify-center gap-2 hover:bg-white/[0.02]"
        >
          {signingOut ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <LogOut size={14} />
          )}
          {tr("authSignOut", lang)}
        </button>
      </div>
    );
  }

  // -- Anonymous: save data / sign in form ---------------------------------
  const isSaveMode = mode === "save";
  const inputHasValue =
    channel === "email" ? emailInput.trim().length > 0 : phoneInput.trim().length > 0;
  const primaryButtonKey =
    channel === "email"
      ? isSaveMode
        ? "authSaveDataCta"
        : "authSignInCta"
      : isSaveMode
        ? "authPhoneSaveCta"
        : "authPhoneSignInCta";

  return (
    <div>
      {/* Channel toggle — pick Email vs Phone. Kept at the top so the
          fields below always reflect the current channel and don't
          confuse users switching mid-flow. */}
      <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-bg-card border border-white/10 mb-3">
        <button
          onClick={() => {
            setChannel("email");
            setError(null);
          }}
          className={
            "py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors " +
            (channel === "email" ? "bg-kasi-green text-bg" : "text-white/60")
          }
        >
          <Mail size={14} />
          {tr("authChannelEmail", lang)}
        </button>
        <button
          onClick={() => {
            setChannel("phone");
            setError(null);
          }}
          className={
            "py-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-colors " +
            (channel === "phone" ? "bg-kasi-green text-bg" : "text-white/60")
          }
        >
          <Phone size={14} />
          {tr("authChannelPhone", lang)}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${channel}-${mode}`}
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-kasi-gold/15 border border-kasi-gold/25 flex items-center justify-center shrink-0">
              {channel === "email" ? (
                <Mail size={16} className="text-kasi-gold" />
              ) : (
                <Phone size={16} className="text-kasi-gold" />
              )}
            </div>
            <div>
              <div className="font-medium">
                {tr(
                  isSaveMode ? "accountAnonymous" : "authSignInHeader",
                  lang,
                )}
              </div>
              <div className="text-white/60 text-xs mt-1 leading-relaxed">
                {tr(
                  isSaveMode ? "accountAnonymousDesc" : "authSignInDesc",
                  lang,
                )}
              </div>
            </div>
          </div>

          {channel === "email" ? (
            <>
              <label className="text-[11px] uppercase tracking-wider text-white/50">
                {tr("authEmailLabel", lang)}
              </label>
              <input
                type="email"
                inputMode="email"
                autoCapitalize="off"
                autoCorrect="off"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={tr("authEmailPlaceholder", lang)}
                className="mt-1 w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white outline-none focus:border-kasi-green"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !submitting) submit();
                }}
              />
            </>
          ) : (
            <>
              <label className="text-[11px] uppercase tracking-wider text-white/50">
                {tr("authPhoneLabel", lang)}
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneInput}
                onChange={(e) => {
                  setPhoneInput(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={tr("authPhonePlaceholder", lang)}
                className="mt-1 w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white font-mono outline-none focus:border-kasi-green"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !submitting) submit();
                }}
              />
              <div className="mt-1 text-[11px] text-white/45">
                {tr("authPhoneHint", lang)}
              </div>
            </>
          )}

          {error && (
            <div className="mt-2 text-xs text-kasi-coral">{error}</div>
          )}

          <button
            onClick={submit}
            disabled={submitting || !inputHasValue}
            className={
              "mt-3 w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all " +
              (inputHasValue && !submitting
                ? isSaveMode
                  ? "bg-kasi-green text-bg shadow-glow"
                  : "bg-kasi-gold text-bg shadow-gold"
                : "bg-white/5 text-white/30 cursor-not-allowed")
            }
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : channel === "email" ? (
              <Mail size={14} />
            ) : (
              <MessageSquare size={14} />
            )}
            {submitting ? tr("authSending", lang) : tr(primaryButtonKey, lang)}
          </button>

          <button
            onClick={() => {
              setMode(isSaveMode ? "signin" : "save");
              setError(null);
            }}
            className="mt-2 w-full text-center text-xs text-white/50 underline"
          >
            {tr(isSaveMode ? "authAlreadyHaveAccount" : "authBackToSave", lang)}
          </button>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}



// ---------------------------------------------------------------------------
// PaymentsBlock
//
// Admin-only section that lets a stokvel admin plug in their Yoco
// secret key so members can contribute via automated PayShap/card
// payments instead of manual record-keeping.
//
// States:
//   - Not configured   → form: paste Yoco secret + test/live toggle
//   - Configured       → status pill (Live/Test) + option to update key
//   - Submitting       → loading spinner on Save button
//   - Success          → transient "Saved ✓" state
//   - Error            → inline coral message with the specific reason
// ---------------------------------------------------------------------------
function PaymentsBlock({ lang }: { lang: Lang }) {
  const { state, savePaymentConfig } = useStore();
  const config = state.paymentConfig;

  const [showForm, setShowForm] = useState(!config?.isActive);
  const [secret, setSecret] = useState("");
  const [reveal, setReveal] = useState(false);
  const [isTest, setIsTest] = useState<boolean>(config?.isTest ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const clean = secret.trim();
    if (clean.length < 10) {
      setError(tr("paySecretInvalid", lang));
      return;
    }
    setError(null);
    setSaving(true);
    const result = await savePaymentConfig(clean, isTest);
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setSecret("");
      setShowForm(false);
      window.setTimeout(() => setSaved(false), 2400);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header explanation */}
      <p className="text-white/70 text-sm leading-relaxed">
        {tr("payDescription", lang)}
      </p>

      {/* Current status */}
      {config?.isActive && !showForm && (
        <div className="rounded-2xl bg-kasi-green/[0.08] border border-kasi-green/25 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-kasi-green/20 border border-kasi-green/40 flex items-center justify-center shrink-0">
            <Zap size={16} className="text-kasi-green" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-kasi-green">
              {tr("payConfiguredTitle", lang)}
            </div>
            <div className="text-white/60 text-xs mt-0.5">
              {config.isTest
                ? tr("payConfiguredTest", lang)
                : tr("payConfiguredLive", lang)}
            </div>
          </div>
          <span
            className={
              "text-[10px] uppercase tracking-wider font-semibold px-2 py-1 rounded-full border " +
              (config.isTest
                ? "text-kasi-gold border-kasi-gold/30 bg-kasi-gold/[0.08]"
                : "text-kasi-green border-kasi-green/30 bg-kasi-green/[0.08]")
            }
          >
            {tr(config.isTest ? "payBadgeTest" : "payBadgeLive", lang)}
          </span>
        </div>
      )}

      {config?.isActive && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs text-white/50 underline self-start"
        >
          {tr("payUpdateKey", lang)}
        </button>
      )}

      {/* Not configured (or admin is updating) → form */}
      {(showForm || !config?.isActive) && (
        <>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              {tr("paySecretLabel", lang)}
            </label>
            <div className="mt-1 relative">
              <input
                type={reveal ? "text" : "password"}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                value={secret}
                onChange={(e) => {
                  setSecret(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={tr("paySecretPlaceholder", lang)}
                className="w-full px-4 py-3 pr-11 rounded-xl bg-bg border border-white/10 text-white font-mono text-sm outline-none focus:border-kasi-green"
              />
              <button
                type="button"
                onClick={() => setReveal((v) => !v)}
                aria-label={reveal ? "Hide" : "Show"}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/50 hover:text-white/80"
              >
                {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="mt-1 text-[11px] text-white/45">
              {tr("paySecretHint", lang)}
            </div>
          </div>

          {/* Test / Live toggle */}
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              {tr("payModeLabel", lang)}
            </label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsTest(true)}
                className={
                  "py-2.5 rounded-xl text-sm font-medium " +
                  (isTest
                    ? "bg-kasi-gold text-bg"
                    : "bg-bg-card border border-white/5 text-white/70")
                }
              >
                {tr("payModeTest", lang)}
              </button>
              <button
                onClick={() => setIsTest(false)}
                className={
                  "py-2.5 rounded-xl text-sm font-medium " +
                  (!isTest
                    ? "bg-kasi-green text-bg"
                    : "bg-bg-card border border-white/5 text-white/70")
                }
              >
                {tr("payModeLive", lang)}
              </button>
            </div>
          </div>

          {error && <div className="text-kasi-coral text-xs">{error}</div>}

          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={submit}
              disabled={saving || !secret.trim()}
              className={
                "w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 " +
                (secret.trim() && !saving
                  ? "bg-kasi-green text-bg shadow-glow"
                  : "bg-white/5 text-white/30 cursor-not-allowed")
              }
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              {saving ? tr("paySaving", lang) : tr("paySaveCta", lang)}
            </button>
            {config?.isActive && showForm && (
              <button
                onClick={() => {
                  setShowForm(false);
                  setSecret("");
                  setError(null);
                }}
                className="text-xs text-white/50 underline text-center"
              >
                {tr("payCancel", lang)}
              </button>
            )}
          </div>

          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-kasi-green text-xs flex items-center gap-1"
            >
              <Check size={12} />
              {tr("paySaved", lang)}
            </motion.div>
          )}
        </>
      )}

      <p className="text-white/40 text-[11px] leading-relaxed mt-1">
        {tr("payFeeNote", lang)}
      </p>
    </div>
  );
}


// ---------------------------------------------------------------------------
// BankingBlock
//
// Admin-only section that lets a stokvel admin enter (or update)
// their bank account details. This is the primary way members
// contribute — no external payment-provider signup required.
//
// UX shape mirrors PaymentsBlock:
//   - Not configured (or "Change details" tapped) → the form
//   - Configured                                  → summary card
//                                                    + "Change details"
//                                                    + "Clear all"
//   - Saving                                      → spinner on Save
//   - Success                                     → transient Saved badge
//   - Error                                       → inline coral message
// ---------------------------------------------------------------------------
function BankingBlock({ lang }: { lang: Lang }) {
  const { state, saveStokvelBanking } = useStore();
  const existing = state.stokvel?.bankAccount;
  const hasExisting = Boolean(
    existing &&
      (existing.bankName ||
        existing.accountHolder ||
        existing.accountNumber ||
        existing.branchCode ||
        existing.payshapPhone),
  );

  // Show the form immediately when there are no details yet — the
  // admin's whole reason for opening this section is to enter them.
  const [showForm, setShowForm] = useState(!hasExisting);
  const [bankName, setBankName] = useState(existing?.bankName ?? "");
  const [accountHolder, setAccountHolder] = useState(
    existing?.accountHolder ?? "",
  );
  const [accountNumber, setAccountNumber] = useState(
    existing?.accountNumber ?? "",
  );
  const [branchCode, setBranchCode] = useState(existing?.branchCode ?? "");
  const [payshapPhone, setPayshapPhone] = useState(existing?.payshapPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Both fields must be filled for the account to be usable at all.
  // Bank name + account number are the bare minimum.
  const canSubmit =
    bankName.trim().length > 0 &&
    accountNumber.trim().length > 0 &&
    !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSaving(true);
    const result = await saveStokvelBanking({
      bankName: bankName.trim(),
      accountHolder: accountHolder.trim(),
      accountNumber: accountNumber.trim(),
      branchCode: branchCode.trim(),
      payshapPhone: payshapPhone.trim(),
    });
    setSaving(false);
    if (result.ok) {
      setSaved(true);
      setShowForm(false);
      window.setTimeout(() => setSaved(false), 2400);
    } else {
      setError(result.error);
    }
  };

  const clearAll = async () => {
    setError(null);
    setSaving(true);
    const result = await saveStokvelBanking({
      bankName: "",
      accountHolder: "",
      accountNumber: "",
      branchCode: "",
      payshapPhone: "",
    });
    setSaving(false);
    if (result.ok) {
      setBankName("");
      setAccountHolder("");
      setAccountNumber("");
      setBranchCode("");
      setPayshapPhone("");
      setShowForm(true);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-white/70 text-sm leading-relaxed">
        {tr("settingsBankingSub", lang)}
      </p>

      {/* Summary card when details are already saved and we're not
          currently editing them. */}
      {hasExisting && !showForm && (
        <div className="rounded-2xl bg-kasi-gold/[0.06] border border-kasi-gold/25 p-3 flex flex-col gap-1.5">
          {existing?.bankName && (
            <BankingSummaryRow
              label={tr("bankName", lang)}
              value={existing.bankName}
            />
          )}
          {existing?.accountHolder && (
            <BankingSummaryRow
              label={tr("bankAccountHolder", lang)}
              value={existing.accountHolder}
            />
          )}
          {existing?.accountNumber && (
            <BankingSummaryRow
              label={tr("bankAccountNumber", lang)}
              value={existing.accountNumber}
              mono
            />
          )}
          {existing?.branchCode && (
            <BankingSummaryRow
              label={tr("bankBranchCode", lang)}
              value={existing.branchCode}
              mono
            />
          )}
          {existing?.payshapPhone && (
            <BankingSummaryRow
              label={tr("bankPayshapPhone", lang)}
              value={existing.payshapPhone}
              mono
            />
          )}
        </div>
      )}

      {hasExisting && !showForm && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="text-xs text-kasi-gold underline"
          >
            {tr("payUpdateKey", lang)}
          </button>
          <button
            onClick={clearAll}
            disabled={saving}
            className="text-xs text-kasi-coral underline"
          >
            {tr("settingsBankingClearAll", lang)}
          </button>
        </div>
      )}

      {/* Form: shown when no details exist, or admin tapped "Change". */}
      {showForm && (
        <>
          <BankingField
            label={tr("bankName", lang)}
            value={bankName}
            onChange={setBankName}
            placeholder={tr("settingsBankingPlaceholderBank", lang)}
          />
          <BankingField
            label={tr("bankAccountHolder", lang)}
            value={accountHolder}
            onChange={setAccountHolder}
            placeholder={tr("settingsBankingPlaceholderHolder", lang)}
          />
          <BankingField
            label={tr("bankAccountNumber", lang)}
            value={accountNumber}
            onChange={setAccountNumber}
            placeholder={tr("settingsBankingPlaceholderAccount", lang)}
            mono
            inputMode="numeric"
          />
          <BankingField
            label={tr("bankBranchCode", lang)}
            value={branchCode}
            onChange={setBranchCode}
            placeholder={tr("settingsBankingPlaceholderBranch", lang)}
            mono
            inputMode="numeric"
          />
          <BankingField
            label={tr("bankPayshapPhone", lang)}
            value={payshapPhone}
            onChange={setPayshapPhone}
            placeholder={tr("settingsBankingPlaceholderPayshap", lang)}
            mono
            inputMode="tel"
          />

          {error && <div className="text-kasi-coral text-xs">{error}</div>}

          <div className="flex flex-col gap-2 mt-1">
            <button
              onClick={submit}
              disabled={!canSubmit}
              className={
                "w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 " +
                (canSubmit
                  ? "bg-kasi-gold text-bg shadow-gold"
                  : "bg-white/5 text-white/30 cursor-not-allowed")
              }
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              {saving
                ? tr("paySaving", lang)
                : tr("settingsBankingSave", lang)}
            </button>
            {hasExisting && (
              <button
                onClick={() => {
                  setShowForm(false);
                  setBankName(existing?.bankName ?? "");
                  setAccountHolder(existing?.accountHolder ?? "");
                  setAccountNumber(existing?.accountNumber ?? "");
                  setBranchCode(existing?.branchCode ?? "");
                  setPayshapPhone(existing?.payshapPhone ?? "");
                  setError(null);
                }}
                className="text-xs text-white/50 underline text-center"
              >
                {tr("payCancel", lang)}
              </button>
            )}
          </div>

          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-kasi-green text-xs flex items-center gap-1"
            >
              <Check size={12} />
              {tr("settingsBankingSaved", lang)}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}

// Small helper to keep each row in the form to a consistent shape.
// Kept local because it's only ever used inside BankingBlock today.
function BankingField({
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
  inputMode?: "numeric" | "tel" | "text";
}) {
  return (
    <div>
      <label className="text-[11px] uppercase tracking-wider text-white/50">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        autoCapitalize={mono ? "none" : "words"}
        autoCorrect="off"
        spellCheck={false}
        className={
          "mt-1 w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white outline-none focus:border-kasi-gold " +
          (mono ? "font-mono text-sm tracking-wider" : "")
        }
      />
    </div>
  );
}

// Read-only label/value row used inside the saved-details summary card.
function BankingSummaryRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[10px] uppercase tracking-wider text-white/50 shrink-0">
        {label}
      </span>
      <span
        className={
          "text-sm text-right break-all text-white " +
          (mono ? "font-mono tabular-nums" : "")
        }
      >
        {value}
      </span>
    </div>
  );
}


// ---------------------------------------------------------------------------
// NotificationsBlock
//
// Handles the browser Notification API opt-in. In-app toast
// notifications work regardless (they use the notify pub/sub bus and
// don't need any permission); this toggle only controls the
// system-level notifications that fire when the app is backgrounded.
//
// States (in order of preference):
//   * "unsupported"        → no Notification API on this browser.
//                            Show a note, no toggle.
//   * "denied"             → user (or an extension / MDM policy)
//                            blocked notifications at the browser
//                            level. Show instructions.
//   * "granted" + optedIn  → showing "Disable" button.
//   * "granted" + !optedIn → showing "Enable" button (fires
//                            immediately since permission is already
//                            granted).
//   * "default"            → showing "Enable" button that triggers
//                            the browser prompt.
// ---------------------------------------------------------------------------
function NotificationsBlock({ lang }: { lang: Lang }) {
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    () => {
      // Compute the initial state synchronously so we don't flash a
      // wrong-looking button on first render. Deferred imports would
      // fire under React's strict-mode double-render and confuse users.
      if (typeof window === "undefined" || typeof Notification === "undefined") {
        return "unsupported";
      }
      return Notification.permission;
    },
  );
  const [optedIn, setOptedIn] = useState(false);
  const [busy, setBusy] = useState(false);

  // Read the persisted opt-in flag on mount. Kept in a small module
  // helper so tests / preview builds don't need to fake localStorage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const notify = await import("../lib/notify");
      if (!cancelled) setOptedIn(notify.isSystemNotificationsOptedIn());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const notify = await import("../lib/notify");
      const result = await notify.requestSystemNotifications();
      setPerm(result);
      setOptedIn(result === "granted");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const notify = await import("../lib/notify");
      notify.disableSystemNotifications();
      setOptedIn(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-white/70 text-sm leading-relaxed">
        {tr("settingsNotificationsDesc", lang)}
      </p>

      {perm === "unsupported" && (
        <div className="text-white/50 text-xs italic">
          {tr("settingsNotificationsUnsupported", lang)}
        </div>
      )}

      {perm === "denied" && (
        <div className="rounded-xl border border-kasi-coral/30 bg-kasi-coral/[0.06] p-3 text-kasi-coral text-xs">
          {tr("settingsNotificationsBlocked", lang)}
        </div>
      )}

      {perm !== "unsupported" && perm !== "denied" && (
        <button
          onClick={optedIn ? disable : enable}
          disabled={busy}
          className={
            "w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 " +
            (busy
              ? "bg-white/5 text-white/30 cursor-not-allowed"
              : optedIn
                ? "bg-bg border border-white/10 text-white/80"
                : "bg-kasi-green text-bg shadow-glow")
          }
        >
          {busy ? (
            <Loader2 size={14} className="animate-spin" />
          ) : optedIn ? (
            <BellOff size={14} />
          ) : (
            <Bell size={14} />
          )}
          {tr(
            optedIn
              ? "settingsNotificationsDisable"
              : "settingsNotificationsEnable",
            lang,
          )}
        </button>
      )}
    </div>
  );
}



// ---------------------------------------------------------------------------
// AdvancedSettingsSection (PR #24)
//
// Container for developer / technical setup that regular users
// (spaza owners, stokvel members) should never see by default. Sits
// collapsed at the bottom of Settings with a clear "for technical
// users" disclaimer; taps expand it to reveal the WhatsApp bot
// config (and, in future, any other Meta / integration / webhook
// settings). Nothing inside this section is required to use the
// core app — everything here is optional integration setup.
//
// Kept OUT of the top-level Settings sections list on purpose. The
// pilot audience is kasi hustlers, not developers, and 90% of them
// don't need to know that "Meta Cloud API credentials" exist as a
// concept.
// ---------------------------------------------------------------------------
function AdvancedSettingsSection({ lang }: { lang: Lang }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-3xl border border-white/5 bg-bg-card/60 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3.5"
      >
        <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-white/60 shrink-0">
          <Wrench size={16} />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="text-sm font-semibold text-white/85">
            {tr("settingsAdvancedHeader", lang)}
          </div>
          <div className="text-[11px] text-white/45 mt-0.5 leading-snug">
            {tr("settingsAdvancedHelp", lang)}
          </div>
        </div>
        <div className="text-white/50 shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/5 p-4 flex flex-col gap-4">
          {/* WhatsApp bot moved here from a top-level section.
              Prefaced with a short "you don't need this" note so
              any user who accidentally expands the advanced section
              still isn't confused about whether they should be
              filling it in. */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 text-[11px] text-white/60 leading-relaxed">
            {tr("settingsAdvancedWhatsAppExplain", lang)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle size={16} className="text-kasi-green" />
              <div className="text-sm font-semibold text-white/80">
                {tr("settingsWhatsApp", lang)}
              </div>
            </div>
            <WhatsAppBotBlock lang={lang} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// WhatsAppBotBlock
//
// Developer-only. Lets a user paste in their Meta Cloud API credentials
// so members can text natural-language sales into their KasiKash account.
//
// As of PR #24, this block is no longer rendered as a top-level
// Settings section. It's only reachable via AdvancedSettingsSection
// above. Regular users never see it.
//
// Two states:
//   * Not configured → form with 4 inputs + Generate-verify-token
//     helper + Save button.
//   * Configured     → active pill with sender phone + "Update
//     credentials" to reveal the form again.
//
// Depends on migration 009 + two Edge Functions (save-whatsapp-config,
// whatsapp-webhook) being deployed. If either is missing, the "save"
// call fails cleanly and the error is surfaced inline.
// ---------------------------------------------------------------------------
function WhatsAppBotBlock({ lang }: { lang: Lang }) {
  // PR #24: this block used to live at the top level of Settings
  // where every user saw it. Now it's tucked behind an "Advanced
  // setup" disclosure so casual users don't encounter Meta Cloud
  // API tokens by accident.
  const [status, setStatus] = useState<{
    isActive: boolean;
    senderPhone: string | null;
  } | null>(null);
  const [statusLoaded, setStatusLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [phoneId, setPhoneId] = useState("");
  const [token, setToken] = useState("");
  const [verify, setVerify] = useState("");
  const [sender, setSender] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Load current status on mount. Uses dynamic import so users who
  // never open Settings never pay for this module's tiny cost.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("../lib/whatsapp");
      const s = await mod.fetchWhatsAppStatus();
      if (cancelled) return;
      setStatus(s);
      setShowForm(!s || !s.isActive);
      setStatusLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const genVerify = async () => {
    const mod = await import("../lib/whatsapp");
    setVerify(mod.generateVerifyToken());
  };

  const submit = async () => {
    if (!phoneId.trim() || !token.trim() || !verify.trim()) {
      setError("Missing fields — every input is required.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const mod = await import("../lib/whatsapp");
      const result = await mod.saveWhatsAppConfig({
        wabaPhoneId: phoneId.trim(),
        wabaAccessToken: token.trim(),
        verifyToken: verify.trim(),
        senderPhone: sender.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      setShowForm(false);
      setStatus({
        isActive: true,
        senderPhone: sender.trim() || null,
      });
      window.setTimeout(() => setSaved(false), 2400);
    } finally {
      setSaving(false);
    }
  };

  if (!statusLoaded) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 size={16} className="animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-white/70 text-sm leading-relaxed">
        {tr("settingsWhatsAppDesc", lang)}
      </p>

      {/* Active pill */}
      {status?.isActive && !showForm && (
        <div className="rounded-2xl bg-kasi-green/[0.08] border border-kasi-green/25 p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-kasi-green/20 border border-kasi-green/40 flex items-center justify-center shrink-0">
            <MessageCircle size={16} className="text-kasi-green" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-kasi-green">
              {tr("settingsWhatsAppActive", lang)}
            </div>
            {status.senderPhone && (
              <div className="text-white/60 text-xs mt-0.5 font-mono">
                {status.senderPhone}
              </div>
            )}
          </div>
        </div>
      )}

      {status?.isActive && !showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="text-xs text-white/50 underline self-start"
        >
          {tr("settingsWhatsAppUpdateCta", lang)}
        </button>
      )}

      {/* Form */}
      {showForm && (
        <>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              {tr("settingsWhatsAppPhoneIdLabel", lang)}
            </label>
            <input
              value={phoneId}
              onChange={(e) => setPhoneId(e.target.value)}
              placeholder="123456789012345"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white font-mono text-sm outline-none focus:border-kasi-green"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              {tr("settingsWhatsAppTokenLabel", lang)}
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="EAAG..."
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white font-mono text-sm outline-none focus:border-kasi-green"
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              {tr("settingsWhatsAppVerifyLabel", lang)}
            </label>
            <div className="mt-1 flex gap-2">
              <input
                value={verify}
                onChange={(e) => setVerify(e.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-bg border border-white/10 text-white font-mono text-sm outline-none focus:border-kasi-green"
              />
              <button
                onClick={genVerify}
                className="px-3 py-3 rounded-xl bg-bg-card border border-white/10 text-white/80 text-xs font-semibold"
              >
                {tr("settingsWhatsAppGenerateVerify", lang)}
              </button>
            </div>
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-white/50">
              {tr("settingsWhatsAppSenderLabel", lang)}
            </label>
            <input
              type="tel"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="+27831234567"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 w-full px-4 py-3 rounded-xl bg-bg border border-white/10 text-white font-mono text-sm outline-none focus:border-kasi-green"
            />
          </div>

          {error && <div className="text-kasi-coral text-xs">{error}</div>}

          <button
            onClick={submit}
            disabled={saving}
            className={
              "w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 " +
              (saving
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-kasi-green text-bg shadow-glow")
            }
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <MessageCircle size={14} />
            )}
            {tr("settingsWhatsAppSaveCta", lang)}
          </button>

          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-kasi-green text-xs flex items-center gap-1"
            >
              <Check size={12} />
              {tr("settingsBankingSaved", lang)}
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// InstallSettingsBlock (PR #29)
//
// A tiny, always-available surface for the Add-to-Home-Screen flow.
// Complements the dismissible Home banner: users who tap "Not now"
// on the banner can still return here to install later. Also useful
// for users who onboarded on the desktop version and now open the
// app on their phone.
//
// If the browser reports the app as already installed (running in
// standalone display-mode), we show a friendly "already installed"
// state instead of an install button. Prevents duplicate installs
// and confirms to returning users that their earlier install stuck.
// ---------------------------------------------------------------------------
function InstallSettingsBlock({ lang }: { lang: Lang }) {
  const { isInstalled } = useInstallPrompt();
  const [sheetOpen, setSheetOpen] = useState(false);

  if (isInstalled) {
    return (
      <div className="rounded-2xl bg-kasi-green/[0.06] border border-kasi-green/25 text-kasi-green text-sm px-4 py-3 flex items-center gap-2">
        <Check size={16} />
        {tr("installSettingsAlreadyInstalled", lang)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-white/70 text-sm leading-relaxed">
        {tr("installSettingsSub", lang)}
      </p>
      <button
        onClick={() => setSheetOpen(true)}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-kasi-green text-bg font-semibold text-sm"
      >
        <Smartphone size={14} />
        {tr("installSettingsButton", lang)}
      </button>
      <AnimatePresence>
        {sheetOpen && (
          <InstallSheet
            lang={lang}
            onClose={() => setSheetOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


// ---------------------------------------------------------------------------
// ResetConfirmModal (PR #33)
//
// Full-screen overlay that gates the destructive reset behind two
// deliberate checks:
//   1. A summary of every record class that will be deleted, with
//      counts, so the user sees exactly what they're about to lose
//      (a spaza owner with 200 logged sales is going to think twice
//      when they see "200 sales will be deleted")
//   2. A text input that must contain the exact word DELETE before
//      the confirmation button is enabled
//
// Modelled on Stripe/GitHub's dangerous-action confirmation UX. The
// small friction is worth it because a reset is irrecoverable and
// pilot phones are often shared with family or borrowed briefly.
// ---------------------------------------------------------------------------
function ResetConfirmModal({
  lang,
  resetting,
  salesCount,
  tabsCount,
  contributionsCount,
  hasStokvel,
  onCancel,
  onConfirm,
}: {
  lang: Lang;
  resetting: boolean;
  salesCount: number;
  tabsCount: number;
  contributionsCount: number;
  hasStokvel: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState("");
  // Case-insensitive match so DELETE / delete / Delete all work.
  // The reporter-provided reference (GitHub / Stripe) accepts either
  // case; we follow the same convention because forcing exact caps
  // adds friction without adding safety.
  const canConfirm = typed.trim().toUpperCase() === "DELETE" && !resetting;

  return (
    <motion.div
      key="reset-confirm-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full md:max-w-md bg-bg-soft border-t md:border border-kasi-coral/30 md:rounded-3xl rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-kasi-coral/15 border border-kasi-coral/30 flex items-center justify-center text-kasi-coral shrink-0">
            <ShieldAlert size={16} />
          </div>
          <div className="font-display font-bold text-lg text-white">
            {tr("accountResetModalTitle", lang)}
          </div>
        </div>

        <p className="text-white/70 text-sm leading-relaxed mb-4">
          {tr("accountResetModalBody", lang)}
        </p>

        {/* Summary of records that will be deleted. Only rows with
             non-zero counts render, so an empty account doesn't show
             three "0 sales / 0 tabs / 0 contributions" lines that
             feel misleading. */}
        {(salesCount > 0 ||
          tabsCount > 0 ||
          contributionsCount > 0 ||
          hasStokvel) && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/10 p-3 mb-4">
            <div className="text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-2">
              {tr("accountResetModalSummaryTitle", lang)}
            </div>
            <ul className="flex flex-col gap-1.5 text-sm">
              {salesCount > 0 && (
                <SummaryRow
                  text={trParams("accountResetModalSummarySales", lang, {
                    count: salesCount,
                  })}
                />
              )}
              {tabsCount > 0 && (
                <SummaryRow
                  text={trParams("accountResetModalSummaryTabs", lang, {
                    count: tabsCount,
                  })}
                />
              )}
              {contributionsCount > 0 && (
                <SummaryRow
                  text={trParams(
                    "accountResetModalSummaryContribs",
                    lang,
                    { count: contributionsCount },
                  )}
                />
              )}
              {hasStokvel && (
                <SummaryRow
                  text={tr("accountResetModalSummaryStokvel", lang)}
                />
              )}
            </ul>
          </div>
        )}

        <label className="flex flex-col gap-1.5 mb-4">
          <span className="text-[11px] uppercase tracking-wider text-white/60">
            {tr("accountResetModalTypeToConfirm", lang)}
          </span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            placeholder="DELETE"
            className="px-4 py-3 rounded-xl bg-bg border border-kasi-coral/30 text-white font-mono tracking-widest outline-none focus:border-kasi-coral"
          />
        </label>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-bg-card border border-white/10 text-white/80 font-semibold text-sm"
          >
            {tr("accountResetModalCancelButton", lang)}
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm}
            className={
              "flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 " +
              (canConfirm
                ? "bg-kasi-coral text-bg"
                : "bg-white/5 text-white/30 cursor-not-allowed")
            }
          >
            {resetting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : null}
            {tr("accountResetModalConfirmButton", lang)}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SummaryRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-white/80">
      <span className="text-kasi-coral shrink-0 leading-relaxed">•</span>
      <span className="leading-relaxed">{text}</span>
    </li>
  );
}

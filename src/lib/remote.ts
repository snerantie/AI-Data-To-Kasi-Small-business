import { supabase } from "./supabase";
import { normalizeInviteCode } from "./inviteLink";
import type { Lang } from "../i18n";
import type {
  BankStatement,
  BankTransaction,
  Sale,
  Expense,
  Tab,
  Contribution,
  ContributionMethod,
  ContributionStatus,
  Stokvel,
  StokvelBankAccount,
  Profile,
  BusinessType,
  StokvelMember,
  MemberRole,
  StokvelInvite,
} from "../store";
import type {
  EventType,
  EvidenceTier,
  EvidenceType,
  Provenance,
} from "./evidence";
import {
  classifyLegacyContribution,
  classifyLegacySale,
  classifyLegacyTab,
} from "./evidence";
import type {
  BankId,
  ClassificationCategory,
  ClassificationSource,
  Direction as BankDirection,
} from "./bank/types";
import type { PersistableStatement } from "./bank/pipeline";

/**
 * Thin CRUD wrapper around Supabase for KasiKash.
 *
 * Every function is a no-op (or returns null) when Supabase isn't
 * configured, so callers can treat cloud sync as best-effort.
 */

// ---- Session ----------------------------------------------------------------

export async function ensureSession(): Promise<string | null> {
  if (!supabase) return null;

  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.user.id;

  const { data: anonData, error } = await supabase.auth.signInAnonymously();
  if (error || !anonData.user) {
    console.warn("[kasikash] anonymous sign-in failed:", error);
    return null;
  }
  return anonData.user.id;
}

export async function resetToFreshAnon(): Promise<string | null> {
  if (!supabase) return null;
  await supabase.auth.signOut();
  return ensureSession();
}

// ---- Auth (email magic link + phone OTP) -----------------------------------

export type AuthResult =
  | {
      ok: true;
      kind:
        | "verification_sent"
        | "signin_sent"
        | "signed_out"
        | "otp_sent"
        | "otp_verified";
    }
  | { ok: false; error: string };

export type CurrentAuth = {
  userId: string | null;
  email: string | null;
  phone: string | null;
  isAnonymous: boolean;
};

/**
 * Normalise a South African phone number to E.164 (+27...). Accepts:
 *   0831234567       -> +27831234567
 *   0 83 123 4567    -> +27831234567 (spaces stripped)
 *   +27 83 123 4567  -> +27831234567 (spaces stripped)
 *   27831234567      -> +27831234567 (prefix added)
 *   +27831234567     -> +27831234567 (passed through)
 * Returns null if the number doesn't plausibly look like a SA cell
 * (10 digits starting with 0, or 11 digits starting with 27).
 */
export function normaliseSAPhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  // Already in +27... form.
  if (/^\+27\d{9}$/.test(digits)) return digits;
  // 27... without plus.
  if (/^27\d{9}$/.test(digits)) return "+" + digits;
  // 0XX XXX XXXX local form → drop leading 0, prepend +27.
  if (/^0\d{9}$/.test(digits)) return "+27" + digits.slice(1);
  return null;
}

export async function getCurrentAuth(): Promise<CurrentAuth> {
  if (!supabase)
    return { userId: null, email: null, phone: null, isAnonymous: false };
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user)
    return { userId: null, email: null, phone: null, isAnonymous: false };
  const isAnon = Boolean(
    (user as unknown as { is_anonymous?: boolean }).is_anonymous,
  );
  return {
    userId: user.id,
    email: user.email ?? null,
    phone: user.phone ?? null,
    isAnonymous: isAnon,
  };
}

const redirectOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : undefined;

export async function linkEmail(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: redirectOrigin() },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, kind: "verification_sent" };
}

export async function sendSignInLink(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectOrigin(),
      shouldCreateUser: false,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, kind: "signin_sent" };
}

export async function signOut(): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: error.message };
  return { ok: true, kind: "signed_out" };
}

export function onAuthChange(cb: (event: string) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) => cb(event));
  return () => data.subscription.unsubscribe();
}

// ---- Phone OTP -------------------------------------------------------------

/**
 * Attach a phone number to the currently signed-in anonymous account.
 * Supabase sends a 6-digit SMS OTP; the user then submits that code
 * via `verifyPhoneOtp(...)` to complete the link. Preserves the same
 * user_id so all of the anonymous session's data carries over.
 *
 * Requires phone auth + an SMS provider (Twilio / MessageBird / etc.)
 * to be configured in the Supabase dashboard. See DEPLOY.md.
 */
export async function linkPhone(phone: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const normalised = normaliseSAPhone(phone);
  if (!normalised) {
    return { ok: false, error: "invalid_phone" };
  }
  const { error } = await supabase.auth.updateUser({ phone: normalised });
  if (error) return { ok: false, error: error.message };
  return { ok: true, kind: "otp_sent" };
}

/**
 * Sign in an existing user by phone. Used to move to a new device
 * after the account was linked with `linkPhone`. Signs out of any
 * current session (usually the fresh anonymous one) first, so
 * verifying the OTP replaces it with the returning-user's session.
 *
 * Passing `shouldCreateUser: false` means an unknown phone number
 * fails cleanly instead of silently creating a brand new account —
 * that's what we want for a "sign in on new device" flow.
 */
export async function sendPhoneSignInOtp(phone: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const normalised = normaliseSAPhone(phone);
  if (!normalised) return { ok: false, error: "invalid_phone" };
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithOtp({
    phone: normalised,
    options: { shouldCreateUser: false },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, kind: "otp_sent" };
}

/**
 * Verify a phone OTP. Handles both flows:
 *   - After `linkPhone`, verify with `type: 'phone_change'`.
 *   - After `sendPhoneSignInOtp`, verify with `type: 'sms'`.
 * The caller passes the flow it started via the `flow` argument.
 */
export async function verifyPhoneOtp(
  phone: string,
  token: string,
  flow: "link" | "signin",
): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const normalised = normaliseSAPhone(phone);
  if (!normalised) return { ok: false, error: "invalid_phone" };
  const cleanToken = token.replace(/\D/g, "");
  if (cleanToken.length < 4) return { ok: false, error: "invalid_code" };

  const { error } = await supabase.auth.verifyOtp({
    phone: normalised,
    token: cleanToken,
    type: flow === "link" ? "phone_change" : "sms",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, kind: "otp_verified" };
}

// ---- Profile ---------------------------------------------------------------

type ProfileRow = {
  id: string;
  language: Lang | null;
  onboarded: boolean | null;
  owner_name: string | null;
  business_name: string | null;
  business_type: BusinessType | null;
};

export type ProfileFetch = {
  language: Lang | null;
  onboarded: boolean;
  profile: Profile;
};

const rowToProfile = (r: ProfileRow): ProfileFetch => ({
  language: r.language,
  onboarded: Boolean(r.onboarded),
  profile: {
    ownerName: r.owner_name,
    businessName: r.business_name,
    businessType: r.business_type,
  },
});

export async function fetchProfile(userId: string): Promise<ProfileFetch | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, language, onboarded, owner_name, business_name, business_type")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[kasikash] fetchProfile:", error.message);
    return null;
  }
  if (!data) return null;
  return rowToProfile(data as ProfileRow);
}

export async function upsertProfile(
  userId: string,
  patch: {
    language?: Lang;
    onboarded?: boolean;
    ownerName?: string | null;
    businessName?: string | null;
    businessType?: BusinessType | null;
  },
): Promise<void> {
  if (!supabase) return;

  const row: Record<string, unknown> = {
    id: userId,
    updated_at: new Date().toISOString(),
  };
  if (patch.language !== undefined) row.language = patch.language;
  if (patch.onboarded !== undefined) row.onboarded = patch.onboarded;
  if (patch.ownerName !== undefined) row.owner_name = patch.ownerName;
  if (patch.businessName !== undefined) row.business_name = patch.businessName;
  if (patch.businessType !== undefined) row.business_type = patch.businessType;

  const { error } = await supabase
    .from("profiles")
    .upsert(row, { onConflict: "id" });
  if (error) console.warn("[kasikash] upsertProfile:", error.message);
}

// ---- Sales & Expenses -------------------------------------------------------
//
// Sales and expenses share the same shape. Historically, the sales
// table held everything (including receipt-sourced rows that were
// really expenses, hence the PR #22 reclassification). Going forward:
//   * sales table  → rows with event_type='sale' (revenue) OR the
//                    reclassified event_type='expense' rows (kept in
//                    place, per the "preserve raw" rule).
//   * expenses tbl → new expense rows only (from PR #22 onward).
//
// Callers fetch both and split by event_type client-side. This keeps
// the API surface small during the transition; a later PR can
// consolidate once every value-bearing path uses the new columns.

/**
 * Common column set for the evidence envelope. Nullable in DB during
 * the transition (migration 010 backfills), then defaulted here so
 * downstream code always has a tier to key on.
 */
type EvidenceCols = {
  event_type: EventType | null;
  evidence_type: EvidenceType | null;
  evidence_tier: EvidenceTier | null;
  provenance: Provenance | null;
};

type SaleRow = {
  id: string;
  item: string;
  qty: number;
  price: number | string;
  raw: string | null;
  source: Sale["source"] | null;
  created_at: string;
} & Partial<EvidenceCols>;

const rowToSale = (r: SaleRow): Sale => {
  // If the row hasn't been backfilled yet (migration 010 hasn't run
  // on this project, or a client wrote a legacy-shape row after 010
  // ran), synthesise the envelope from the legacy `source` field.
  const envelope = r.evidence_tier
    ? {
        eventType: (r.event_type ?? "sale") as EventType,
        evidenceType: (r.evidence_type ?? "manual_entry") as EvidenceType,
        evidenceTier: r.evidence_tier,
        provenance: (r.provenance ?? {}) as Provenance,
      }
    : classifyLegacySale((r.source ?? null) as "voice" | "manual" | "receipt" | null);
  return {
    id: r.id,
    item: r.item,
    qty: r.qty,
    price: typeof r.price === "string" ? parseFloat(r.price) : r.price,
    raw: r.raw ?? undefined,
    source: (r.source ?? "manual") as Sale["source"],
    createdAt: new Date(r.created_at).getTime(),
    eventType: envelope.eventType,
    evidenceType: envelope.evidenceType,
    evidenceTier: envelope.evidenceTier,
    provenance: envelope.provenance,
  };
};

export async function fetchSales(userId: string): Promise<Sale[] | null> {
  if (!supabase) return null;
  // Include the new evidence envelope columns. Fields are optional in
  // the DB (nullable), so backwards-compat with pre-migration rows is
  // handled by rowToSale's fallback classifier.
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, item, qty, price, raw, source, created_at, event_type, evidence_type, evidence_tier, provenance",
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[kasikash] fetchSales:", error.message);
    return null;
  }
  return (data as SaleRow[]).map(rowToSale);
}

/**
 * Fill in the evidence envelope for an outgoing insert. Prefers the
 * caller-supplied envelope; falls back to the classifier applied to
 * the legacy `source` field. This means every row we ever write from
 * PR #22 onward has all four evidence columns populated, even if the
 * caller forgot to set them.
 */
function saleInsertPayload(userId: string, s: Sale) {
  const legacy = classifyLegacySale(
    (s.source ?? null) as "voice" | "manual" | "receipt" | null,
  );
  return {
    id: s.id,
    owner_id: userId,
    item: s.item,
    qty: s.qty,
    price: s.price,
    raw: s.raw ?? null,
    source: s.source ?? "manual",
    event_type: s.eventType ?? legacy.eventType,
    evidence_type: s.evidenceType ?? legacy.evidenceType,
    evidence_tier: s.evidenceTier ?? legacy.evidenceTier,
    provenance: s.provenance ?? legacy.provenance,
    created_at: new Date(s.createdAt).toISOString(),
  };
}

export async function insertSale(userId: string, sale: Sale): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("sales").insert(saleInsertPayload(userId, sale));
  if (error) console.warn("[kasikash] insertSale:", error.message);
}

export async function insertSales(userId: string, sales: Sale[]): Promise<void> {
  if (!supabase || sales.length === 0) return;
  const { error } = await supabase
    .from("sales")
    .insert(sales.map((s) => saleInsertPayload(userId, s)));
  if (error) console.warn("[kasikash] insertSales:", error.message);
}

// ---- Expenses ---------------------------------------------------------------

type ExpenseRow = {
  id: string;
  item: string;
  qty: number;
  price: number | string;
  raw: string | null;
  created_at: string;
} & Partial<EvidenceCols>;

const rowToExpense = (r: ExpenseRow): Expense => ({
  id: r.id,
  item: r.item,
  qty: r.qty,
  price: typeof r.price === "string" ? parseFloat(r.price) : r.price,
  raw: r.raw ?? undefined,
  createdAt: new Date(r.created_at).getTime(),
  eventType: (r.event_type ?? "expense") as EventType,
  evidenceType: (r.evidence_type ?? "manual_entry") as EvidenceType,
  evidenceTier: (r.evidence_tier ?? "declared") as EvidenceTier,
  provenance: (r.provenance ?? {}) as Provenance,
});

export async function fetchExpenses(
  userId: string,
): Promise<Expense[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("expenses")
    .select(
      "id, item, qty, price, raw, created_at, event_type, evidence_type, evidence_tier, provenance",
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    // A missing table (migration 010 hasn't been applied yet) shows up
    // as 42P01. Treat that as "no expenses yet" rather than an error —
    // the client keeps working, just without expense signal.
    if ((error as unknown as { code?: string }).code !== "42P01") {
      console.warn("[kasikash] fetchExpenses:", error.message);
    }
    return null;
  }
  return (data as ExpenseRow[]).map(rowToExpense);
}

function expenseInsertPayload(userId: string, e: Expense) {
  return {
    id: e.id,
    owner_id: userId,
    item: e.item,
    qty: e.qty,
    price: e.price,
    raw: e.raw ?? null,
    event_type: e.eventType ?? "expense",
    evidence_type: e.evidenceType ?? "manual_entry",
    evidence_tier: e.evidenceTier ?? "declared",
    provenance: e.provenance ?? {},
    created_at: new Date(e.createdAt).toISOString(),
  };
}

export async function insertExpense(
  userId: string,
  expense: Expense,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("expenses")
    .insert(expenseInsertPayload(userId, expense));
  if (error) console.warn("[kasikash] insertExpense:", error.message);
}

export async function insertExpenses(
  userId: string,
  expenses: Expense[],
): Promise<void> {
  if (!supabase || expenses.length === 0) return;
  const { error } = await supabase
    .from("expenses")
    .insert(expenses.map((e) => expenseInsertPayload(userId, e)));
  if (error) console.warn("[kasikash] insertExpenses:", error.message);
}

// ---- Tabs -------------------------------------------------------------------

type TabRow = {
  id: string;
  customer: string;
  amount: number | string;
  paid: boolean;
  created_at: string;
} & Partial<EvidenceCols>;

const rowToTab = (r: TabRow): Tab => {
  const envelope = r.evidence_tier
    ? {
        eventType: (r.event_type ?? (r.paid ? "tab_settled" : "tab_created")) as EventType,
        evidenceType: (r.evidence_type ?? "manual_entry") as EvidenceType,
        evidenceTier: r.evidence_tier,
        provenance: (r.provenance ?? {}) as Provenance,
      }
    : classifyLegacyTab({ paid: r.paid ?? false });
  return {
    id: r.id,
    customer: r.customer,
    amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
    paid: r.paid,
    createdAt: new Date(r.created_at).getTime(),
    eventType: envelope.eventType,
    evidenceType: envelope.evidenceType,
    evidenceTier: envelope.evidenceTier,
    provenance: envelope.provenance,
  };
};

export async function fetchTabs(userId: string): Promise<Tab[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("tabs")
    .select(
      "id, customer, amount, paid, created_at, event_type, evidence_type, evidence_tier, provenance",
    )
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[kasikash] fetchTabs:", error.message);
    return null;
  }
  return (data as TabRow[]).map(rowToTab);
}

export async function insertTab(userId: string, tab: Tab): Promise<void> {
  if (!supabase) return;
  const legacy = classifyLegacyTab({ paid: tab.paid ?? false });
  const { error } = await supabase.from("tabs").insert({
    id: tab.id,
    owner_id: userId,
    customer: tab.customer,
    amount: tab.amount,
    paid: tab.paid ?? false,
    event_type: tab.eventType ?? legacy.eventType,
    evidence_type: tab.evidenceType ?? legacy.evidenceType,
    evidence_tier: tab.evidenceTier ?? legacy.evidenceTier,
    provenance: tab.provenance ?? legacy.provenance,
    created_at: new Date(tab.createdAt).toISOString(),
  });
  if (error) console.warn("[kasikash] insertTab:", error.message);
}

export async function updateTabPaid(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("tabs")
    .update({ paid: true, paid_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.warn("[kasikash] updateTabPaid:", error.message);
}

// ---- Bank statements + transactions (PR #23) ------------------------------
//
// Idempotent inserts:
//   * bank_statements is UNIQUE (owner_id, file_hash). We detect the
//     "same file re-uploaded" case by catching the 23505 error and
//     returning the existing row's id + duplicate=true instead of
//     surfacing a hard failure to the caller.
//   * bank_transactions is UNIQUE (owner_id, fingerprint). We use
//     UPSERT with `onConflict: 'owner_id,fingerprint', ignoreDuplicates: true`
//     which quietly skips any row that already exists — the shared
//     transactions across overlapping statement periods.
//
// A missing table (`42P01`) is treated the same as "no data" so a
// client running against a project where migration 011 hasn't been
// applied still functions in demo-mode fashion.

type BankStatementRow = {
  id: string;
  bank: string;
  filename: string;
  file_hash: string;
  account_ref: string | null;
  period_start: string | null;
  period_end: string | null;
  opening_balance: number | string | null;
  closing_balance: number | string | null;
  transaction_count: number;
  imported_at: string;
  created_at: string;
};

type BankTransactionRow = {
  id: string;
  statement_id: string;
  occurred_at: string;
  direction: BankDirection;
  amount: number | string;
  description: string;
  counterparty_name: string | null;
  counterparty_hash: string | null;
  reference: string | null;
  classification: ClassificationCategory;
  classification_confidence: number | string;
  classification_source: ClassificationSource;
  is_recurring: boolean;
  fingerprint: string;
  event_type: string;
  evidence_type: string;
  evidence_tier: string;
  provenance: Provenance | null;
  created_at: string;
};

const parseNum = (n: number | string | null): number | null => {
  if (n === null || n === undefined) return null;
  return typeof n === "string" ? parseFloat(n) : n;
};

const rowToBankStatement = (r: BankStatementRow): BankStatement => ({
  id: r.id,
  bank: r.bank as BankId,
  filename: r.filename,
  fileHash: r.file_hash,
  accountRef: r.account_ref,
  periodStart: r.period_start ? new Date(r.period_start).getTime() : null,
  periodEnd: r.period_end ? new Date(r.period_end).getTime() : null,
  openingBalance: parseNum(r.opening_balance),
  closingBalance: parseNum(r.closing_balance),
  transactionCount: r.transaction_count,
  importedAt: new Date(r.imported_at).getTime(),
  createdAt: new Date(r.created_at).getTime(),
});

const rowToBankTransaction = (r: BankTransactionRow): BankTransaction => ({
  id: r.id,
  statementId: r.statement_id,
  occurredAt: new Date(r.occurred_at).getTime(),
  direction: r.direction,
  amount: parseNum(r.amount) ?? 0,
  description: r.description,
  counterpartyName: r.counterparty_name,
  counterpartyHash: r.counterparty_hash ?? "",
  reference: r.reference,
  classification: r.classification,
  classificationConfidence: parseNum(r.classification_confidence) ?? 0,
  classificationSource: r.classification_source,
  isRecurring: r.is_recurring,
  fingerprint: r.fingerprint,
  // These three are DB-CHECK-constrained so parsing them back to their
  // literal types is safe. If someone changes the constraints, they'd
  // trigger a runtime narrowing failure here and the row falls back
  // to the default envelope.
  eventType: "bank_transaction",
  evidenceType: "bank_statement_line",
  evidenceTier: "observed",
  provenance: r.provenance ?? {},
  createdAt: new Date(r.created_at).getTime(),
});

export async function fetchBankStatements(
  userId: string,
): Promise<BankStatement[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("bank_statements")
    .select(
      "id, bank, filename, file_hash, account_ref, period_start, period_end, opening_balance, closing_balance, transaction_count, imported_at, created_at",
    )
    .eq("owner_id", userId)
    .order("imported_at", { ascending: false })
    .limit(50);
  if (error) {
    if ((error as unknown as { code?: string }).code !== "42P01") {
      console.warn("[kasikash] fetchBankStatements:", error.message);
    }
    return null;
  }
  return (data as BankStatementRow[]).map(rowToBankStatement);
}

export async function fetchBankTransactions(
  userId: string,
): Promise<BankTransaction[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("bank_transactions")
    .select(
      "id, statement_id, occurred_at, direction, amount, description, counterparty_name, counterparty_hash, reference, classification, classification_confidence, classification_source, is_recurring, fingerprint, event_type, evidence_type, evidence_tier, provenance, created_at",
    )
    .eq("owner_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(500);
  if (error) {
    if ((error as unknown as { code?: string }).code !== "42P01") {
      console.warn("[kasikash] fetchBankTransactions:", error.message);
    }
    return null;
  }
  return (data as BankTransactionRow[]).map(rowToBankTransaction);
}

/**
 * Try to insert a `bank_statements` row. If a row with the same
 * (owner_id, file_hash) already exists, returns { statementId, duplicate: true }
 * so the caller can short-circuit the transaction insert step.
 *
 * Returns `null` when Supabase isn't configured (demo-mode caller
 * handles the local case).
 */
export async function insertBankStatement(
  userId: string,
  parsed: PersistableStatement,
): Promise<
  | { statementId: string; duplicate: boolean }
  | null
> {
  if (!supabase) return null;

  const row = {
    owner_id: userId,
    bank: parsed.bank,
    filename: parsed.filename,
    file_hash: parsed.fileHash,
    account_ref: parsed.accountRef,
    period_start: parsed.periodStart
      ? new Date(parsed.periodStart).toISOString().slice(0, 10)
      : null,
    period_end: parsed.periodEnd
      ? new Date(parsed.periodEnd).toISOString().slice(0, 10)
      : null,
    opening_balance: parsed.openingBalance,
    closing_balance: parsed.closingBalance,
    transaction_count: parsed.transactions.length,
  };

  const { data, error } = await supabase
    .from("bank_statements")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    // 23505 = unique violation. Look up the existing row's id so the
    // caller has something usable to link to.
    if ((error as unknown as { code?: string }).code === "23505") {
      const { data: existing, error: lookupErr } = await supabase
        .from("bank_statements")
        .select("id")
        .eq("owner_id", userId)
        .eq("file_hash", parsed.fileHash)
        .single();
      if (lookupErr || !existing) {
        console.warn(
          "[kasikash] insertBankStatement: conflict but couldn't find existing row:",
          lookupErr?.message,
        );
        return null;
      }
      return { statementId: (existing as { id: string }).id, duplicate: true };
    }
    console.warn("[kasikash] insertBankStatement:", error.message);
    return null;
  }

  return { statementId: (data as { id: string }).id, duplicate: false };
}

/**
 * Bulk-insert bank transactions with idempotency. Any row whose
 * (owner_id, fingerprint) already exists is silently ignored, so
 * re-imports of overlapping statement periods don't double-count.
 *
 * Returns the counts of inserted vs duplicate rows. Since Supabase's
 * insert doesn't tell us per-row which were duplicates, we compute
 * duplicates as `total - inserted` after re-fetching.
 */
export async function insertBankTransactions(
  userId: string,
  statementId: string,
  txs: PersistableStatement["transactions"],
): Promise<{ inserted: number; duplicates: number } | null> {
  if (!supabase || txs.length === 0) {
    return { inserted: 0, duplicates: 0 };
  }

  // Build the insert payload. All CHECK-constrained envelope fields
  // are hard-coded here; if a future maintainer accidentally leaves
  // one out, the DB will reject the insert with a clear error rather
  // than silently allowing bad data through.
  const rows = txs.map((t) => ({
    owner_id: userId,
    statement_id: statementId,
    occurred_at: new Date(t.occurredAt).toISOString(),
    direction: t.direction,
    amount: t.amount,
    description: t.description,
    counterparty_name: t.counterpartyName,
    counterparty_hash: t.counterpartyHash,
    reference: t.reference,
    classification: t.classification,
    classification_confidence: t.classificationConfidence,
    classification_source: t.classificationSource,
    is_recurring: t.isRecurring,
    fingerprint: t.fingerprint,
    event_type: "bank_transaction" as const,
    evidence_type: "bank_statement_line" as const,
    evidence_tier: "observed" as const,
    provenance: t.parserMeta ?? {},
  }));

  const { data, error } = await supabase
    .from("bank_transactions")
    .upsert(rows, {
      onConflict: "owner_id,fingerprint",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    console.warn("[kasikash] insertBankTransactions:", error.message);
    return null;
  }

  const inserted = (data as unknown[])?.length ?? 0;
  return {
    inserted,
    duplicates: rows.length - inserted,
  };
}

// ---- Stokvel + memberships + contributions --------------------------------

type StokvelRow = {
  id: string;
  name: string;
  goal: number | string;
  members: number;
  // Bank account fields added by migration 007. All nullable — an
  // older stokvel row (or one whose admin hasn't set up banking yet)
  // simply has null everywhere.
  bank_name: string | null;
  bank_account_holder: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  payshap_phone: string | null;
};

type MembershipRow = {
  stokvel_id: string;
  user_id: string;
  role: MemberRole;
  display_name: string;
  joined_at: string;
};

type ContributionRow = {
  id: string;
  amount: number | string;
  note: string | null;
  owner_id: string;
  created_at: string;
  // Also added in migration 007. `status` / `method` may be null on
  // rows created before the migration ran; the store's isConfirmed
  // fallback covers that safely.
  status: ContributionStatus | null;
  method: ContributionMethod | null;
  reference: string | null;
  confirmed_at: string | null;
  rejected_reason: string | null;
  // PR #22 evidence envelope. Nullable — backwards-compat handled in
  // rowToContribution below.
  payment_id: string | null;
} & Partial<EvidenceCols>;

type InviteRow = {
  code: string;
  created_at: string;
  expires_at: string | null;
};

const rowToMembership = (r: MembershipRow): StokvelMember => ({
  userId: r.user_id,
  role: r.role,
  displayName: r.display_name,
  joinedAt: new Date(r.joined_at).getTime(),
});

const rowToContribution = (
  r: ContributionRow,
  members: Map<string, string>,
): Contribution => {
  const envelope = r.evidence_tier
    ? {
        eventType: (r.event_type ?? "contribution_in") as EventType,
        evidenceType: (r.evidence_type ?? "manual_entry") as EvidenceType,
        evidenceTier: r.evidence_tier,
        provenance: (r.provenance ?? {}) as Provenance,
      }
    : classifyLegacyContribution({
        method: r.method ?? null,
        status: r.status ?? null,
        payment_id: r.payment_id ?? null,
      });
  return {
    id: r.id,
    amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
    note: r.note ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
    memberName: members.get(r.owner_id),
    ownerId: r.owner_id,
    status: r.status ?? undefined,
    method: r.method ?? undefined,
    reference: r.reference ?? undefined,
    confirmedAt: r.confirmed_at ? new Date(r.confirmed_at).getTime() : undefined,
    rejectedReason: r.rejected_reason ?? undefined,
    eventType: envelope.eventType,
    evidenceType: envelope.evidenceType,
    evidenceTier: envelope.evidenceTier,
    provenance: envelope.provenance,
  };
};

const rowToBankAccount = (r: StokvelRow): StokvelBankAccount | null => {
  // If literally every bank field is null, treat the stokvel as
  // having no banking configured (so the UI can show the setup CTA).
  if (
    !r.bank_name &&
    !r.bank_account_holder &&
    !r.bank_account_number &&
    !r.bank_branch_code &&
    !r.payshap_phone
  ) {
    return null;
  }
  return {
    bankName: r.bank_name,
    accountHolder: r.bank_account_holder,
    accountNumber: r.bank_account_number,
    branchCode: r.bank_branch_code,
    payshapPhone: r.payshap_phone,
  };
};

/**
 * Fetch the user's primary stokvel (currently: the first membership they have),
 * including all its members and contributions with attribution.
 * Returns null if the user isn't in any stokvel yet.
 */
export async function fetchUserPrimaryStokvel(
  userId: string,
): Promise<{ stokvel: Stokvel; stokvelId: string; role: MemberRole } | null> {
  if (!supabase) return null;

  const { data: myMemberships, error: mErr } = await supabase
    .from("stokvel_memberships")
    .select("stokvel_id, role, joined_at")
    .eq("user_id", userId)
    .order("joined_at", { ascending: true })
    .limit(1);

  if (mErr) {
    console.warn("[kasikash] fetch memberships:", mErr.message);
    return null;
  }
  if (!myMemberships || myMemberships.length === 0) return null;

  const firstMembership = myMemberships[0] as {
    stokvel_id: string;
    role: MemberRole;
  };
  const stokvelId = firstMembership.stokvel_id;
  const myRole = firstMembership.role;

  const [{ data: stk }, { data: allMembers }, { data: contribs }] =
    await Promise.all([
      supabase
        .from("stokvels")
        .select(
          "id, name, kind, goal, members, bank_name, bank_account_holder, bank_account_number, bank_branch_code, payshap_phone",
        )
        .eq("id", stokvelId)
        .single(),
      supabase
        .from("stokvel_memberships")
        .select("stokvel_id, user_id, role, display_name, joined_at")
        .eq("stokvel_id", stokvelId),
      supabase
        .from("contributions")
        .select(
          "id, amount, note, owner_id, created_at, status, method, reference, confirmed_at, rejected_reason, payment_id, event_type, evidence_type, evidence_tier, provenance",
        )
        .eq("stokvel_id", stokvelId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

  if (!stk) return null;
  const skRow = stk as StokvelRow;

  const memberships = (allMembers ?? []).map((r) =>
    rowToMembership(r as MembershipRow),
  );
  const memberMap = new Map(
    memberships.map((m) => [m.userId, m.displayName]),
  );

  const contributions = (contribs ?? []).map((r) =>
    rowToContribution(r as ContributionRow, memberMap),
  );

  const stokvel: Stokvel = {
    id: skRow.id,
    name: skRow.name,
    // PR #35: existing stokvels created before this migration were
    // backfilled to 'savings'; new stokvels always have a kind. If
    // for some reason the field is missing we fall back to
    // 'savings' rather than throwing.
    kind:
      (skRow as { kind?: string }).kind === "groceries"
        ? "groceries"
        : (skRow as { kind?: string }).kind === "birthdays"
          ? "birthdays"
          : (skRow as { kind?: string }).kind === "burial"
            ? "burial"
            : "savings",
    goal:
      typeof skRow.goal === "string" ? parseFloat(skRow.goal) : skRow.goal,
    members: skRow.members,
    memberships,
    contributions,
    role: myRole,
    bankAccount: rowToBankAccount(skRow),
  };

  return { stokvel, stokvelId, role: myRole };
}

export async function createStokvel(
  _userId: string,
  s: { name: string; kind?: string; goal: number; members: number },
): Promise<string | null> {
  if (!supabase) return null;
  // We call a SECURITY DEFINER RPC instead of INSERT-ing directly because
  // on some Supabase projects auth.uid() returns NULL inside the RLS
  // WITH CHECK context (a known edge case), causing the owner_id check
  // to fail even when the JWT sub matches the payload. The RPC reads
  // auth.uid() from the session claims in a normal function context
  // (which works fine) and sets owner_id server-side, so clients can't
  // forge someone else's identity. See migration 006 for the diagnosis.
  const { data, error } = await supabase.rpc("create_stokvel", {
    p_name: s.name,
    p_goal: s.goal,
    p_members: s.members,
  });
  if (error) {
    console.warn("[kasikash] createStokvel:", error.message);
    return null;
  }
  const newId = typeof data === "string" ? data : null;
  // PR #35: the RPC doesn't yet accept a kind parameter (would need
  // its own migration + fn signature change). Set kind via a second
  // UPDATE from the client, protected by RLS on stokvels — only the
  // creator (now the admin) can update it. If kind is omitted or
  // 'savings' we skip the second call since 'savings' is the DB
  // default.
  if (newId && s.kind && s.kind !== "savings") {
    const { error: kindError } = await supabase
      .from("stokvels")
      .update({ kind: s.kind })
      .eq("id", newId);
    if (kindError) {
      console.warn(
        "[kasikash] createStokvel kind update:",
        kindError.message,
      );
      // Non-fatal — the stokvel exists, it just defaults to 'savings'
      // which the user can change later.
    }
  }
  // The DB trigger auto-adds the creator as an admin membership.
  return newId;
}

export async function updateStokvel(
  stokvelId: string,
  patch: Partial<{ name: string; goal: number; members: number }>,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("stokvels")
    .update(patch)
    .eq("id", stokvelId);
  if (error) console.warn("[kasikash] updateStokvel:", error.message);
}

export async function insertContribution(
  _userId: string,
  stokvelId: string,
  contribution: Contribution,
): Promise<void> {
  if (!supabase) return;
  // SECURITY DEFINER RPC to bypass the auth.uid()-in-RLS-WITH-CHECK
  // bug (see migration 006) and to enforce the pending/confirmed
  // lifecycle server-side (migration 007). The 5-arg overload is
  // safe to call even against a DB that only has the 3-arg version
  // (defaults just get used) — but for the pending status to take
  // effect the DB must have 007 applied.
  const { error } = await supabase.rpc("contribute_to_stokvel", {
    p_stokvel_id: stokvelId,
    p_amount: contribution.amount,
    p_note: contribution.note ?? null,
    p_method: contribution.method ?? "eft",
    p_reference: contribution.reference ?? null,
  });
  if (error) console.warn("[kasikash] insertContribution:", error.message);
}

// ---- Banking config + verification ----------------------------------------

/**
 * Save (or clear) the stokvel's bank account details. Admin-only —
 * enforced server-side by set_stokvel_banking RPC.
 *
 * Pass empty strings to clear individual fields; the RPC treats
 * empty / whitespace-only strings as null.
 */
export async function saveStokvelBanking(
  stokvelId: string,
  bank: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    branchCode: string;
    payshapPhone?: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const { error } = await supabase.rpc("set_stokvel_banking", {
    p_stokvel_id: stokvelId,
    p_bank_name: bank.bankName,
    p_holder: bank.accountHolder,
    p_account_number: bank.accountNumber,
    p_branch_code: bank.branchCode,
    p_payshap_phone: bank.payshapPhone ?? null,
  });
  if (error) {
    console.warn("[kasikash] saveStokvelBanking:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/**
 * Admin-only. Move a contribution to confirmed / rejected. Server-side
 * RPC verifies admin-ness on the contribution's stokvel.
 */
export async function setContributionStatus(
  contributionId: string,
  status: "confirmed" | "rejected",
  reason?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const { error } = await supabase.rpc("set_contribution_status", {
    p_contribution_id: contributionId,
    p_status: status,
    p_reason: reason ?? null,
  });
  if (error) {
    console.warn("[kasikash] setContributionStatus:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ---- Invites ---------------------------------------------------------------

/** Generate a short human-readable code like "K7-M9P2-XR". */
function generateInviteCode(): string {
  // Base32-ish without ambiguous chars
  const chars = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  const pick = () => chars[Math.floor(Math.random() * chars.length)];
  const seg = (n: number) => Array.from({ length: n }, pick).join("");
  return `K-${seg(4)}-${seg(4)}`;
}

export async function createInvite(
  userId: string,
  stokvelId: string,
  expiresInHours = 24 * 7,
): Promise<StokvelInvite | null> {
  if (!supabase) return null;
  // Retry a few times in the astronomically-unlikely case of collision.
  for (let i = 0; i < 3; i++) {
    const code = generateInviteCode();
    const expiresAt = new Date(
      Date.now() + expiresInHours * 3600 * 1000,
    ).toISOString();
    const { data, error } = await supabase
      .from("stokvel_invites")
      .insert({
        code,
        stokvel_id: stokvelId,
        created_by: userId,
        expires_at: expiresAt,
      })
      .select("code, created_at, expires_at")
      .single();
    if (!error && data) {
      const r = data as InviteRow;
      return {
        code: r.code,
        createdAt: new Date(r.created_at).getTime(),
        expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null,
      };
    }
    // If code collision (unique violation), retry with a new code
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      console.warn("[kasikash] createInvite:", error.message);
      return null;
    }
  }
  return null;
}

export async function fetchLatestInvite(
  stokvelId: string,
): Promise<StokvelInvite | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stokvel_invites")
    .select("code, created_at, expires_at")
    .eq("stokvel_id", stokvelId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.warn("[kasikash] fetchLatestInvite:", error.message);
    return null;
  }
  if (!data) return null;
  const r = data as InviteRow;
  return {
    code: r.code,
    createdAt: new Date(r.created_at).getTime(),
    expiresAt: r.expires_at ? new Date(r.expires_at).getTime() : null,
  };
}

/**
 * Attempt to join a stokvel using an invite code. Uses the SECURITY DEFINER
 * RPC on the server so we don't need direct read access to the invite table.
 */
export async function joinStokvelByCode(
  code: string,
): Promise<{ ok: true; stokvelId: string } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  // Defence in depth: even though the two upstream call-sites
  // (JoinStokvelSheet + Onboarding) both run `normalizeInviteCode`
  // before dispatching, we don't want a future caller (a test, a
  // deep-link handler, an experiment) to send `km9p2xr7a` and
  // silently 404 on the server. So re-normalise here and fall back
  // to the historical trim+upper behaviour if we can't produce a
  // canonical shape (e.g. an older non-standard code).
  const canonical = normalizeInviteCode(code) ?? code.trim().toUpperCase();
  const { data, error } = await supabase.rpc("join_stokvel", {
    invite_code: canonical,
  });
  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid_or_expired")) {
      return { ok: false, error: "invalid_or_expired" };
    }
    return { ok: false, error: error.message };
  }
  if (typeof data !== "string") {
    return { ok: false, error: "unexpected_response" };
  }
  return { ok: true, stokvelId: data };
}

/**
 * Leave a stokvel. Admins can leave only if another admin exists.
 * Returns { ok: false, error: 'sole_admin' } when refused for that reason.
 */
export async function leaveStokvel(
  userId: string,
  stokvelId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };

  // Guard: if the user is the only admin, refuse.
  const { data: admins, error: aErr } = await supabase
    .from("stokvel_memberships")
    .select("user_id")
    .eq("stokvel_id", stokvelId)
    .eq("role", "admin");
  if (aErr) return { ok: false, error: aErr.message };
  const isSoleAdmin =
    admins &&
    admins.length === 1 &&
    (admins[0] as { user_id: string }).user_id === userId;
  if (isSoleAdmin) {
    return { ok: false, error: "sole_admin" };
  }

  const { error } = await supabase
    .from("stokvel_memberships")
    .delete()
    .eq("stokvel_id", stokvelId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}


// ---------------------------------------------------------------------------
// PR #35 — Services + Mashonisa remote helpers
//
// user_services       — which services each profile has enabled
// mashonisa_loans     — one row per loan given out
// mashonisa_repayments — one row per repayment received
// ---------------------------------------------------------------------------

import type {
  UserService,
  MashonisaLoan,
  MashonisaRepayment,
  MashonisaLoanStatus,
  MashonisaRepaymentMethod,
  ServiceType,
} from "../store";

type UserServiceRow = {
  owner_id: string;
  service_type: string;
  enabled_at: string;
  config: Record<string, unknown> | null;
};

type MashonisaLoanRow = {
  id: string;
  owner_id: string;
  borrower_name: string;
  borrower_phone: string | null;
  amount_lent: string | number;
  interest_percentage: string | number | null;
  agreed_repayment_date: string | null;
  notes: string | null;
  status: string;
  amount_repaid: string | number | null;
  created_at: string;
  repaid_at: string | null;
  event_type: string;
  evidence_type: string | null;
  evidence_tier: string;
};

type MashonisaRepaymentRow = {
  id: string;
  loan_id: string;
  owner_id: string;
  amount: string | number;
  paid_at: string;
  method: string;
  notes: string | null;
  evidence_tier: string;
};

function toNum(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "string" ? parseFloat(v) : v;
}

function rowToUserService(r: UserServiceRow): UserService {
  return {
    serviceType: r.service_type as ServiceType,
    enabledAt: new Date(r.enabled_at).getTime(),
    config: r.config ?? {},
  };
}

function rowToLoan(
  r: MashonisaLoanRow,
  repayments: MashonisaRepayment[],
): MashonisaLoan {
  return {
    id: r.id,
    borrowerName: r.borrower_name,
    borrowerPhone: r.borrower_phone ?? undefined,
    amountLent: toNum(r.amount_lent),
    interestPercentage: toNum(r.interest_percentage),
    agreedRepaymentDate: r.agreed_repayment_date ?? undefined,
    notes: r.notes ?? undefined,
    status: r.status as MashonisaLoanStatus,
    amountRepaid: toNum(r.amount_repaid),
    createdAt: new Date(r.created_at).getTime(),
    repaidAt: r.repaid_at ? new Date(r.repaid_at).getTime() : undefined,
    repayments,
    eventType: "mashonisa_loan",
    evidenceType: r.evidence_type ?? undefined,
    evidenceTier: (r.evidence_tier as EvidenceTier) ?? "declared",
  };
}

function rowToRepayment(r: MashonisaRepaymentRow): MashonisaRepayment {
  return {
    id: r.id,
    loanId: r.loan_id,
    amount: toNum(r.amount),
    paidAt: new Date(r.paid_at).getTime(),
    method: r.method as MashonisaRepaymentMethod,
    notes: r.notes ?? undefined,
    evidenceTier: (r.evidence_tier as EvidenceTier) ?? "declared",
  };
}

// ---------- user_services ----------

export async function fetchUserServices(
  userId: string,
): Promise<UserService[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("user_services")
    .select("owner_id, service_type, enabled_at, config")
    .eq("owner_id", userId);
  if (error) {
    console.warn("[kasikash] fetchUserServices:", error.message);
    return [];
  }
  return (data ?? []).map((r) => rowToUserService(r as UserServiceRow));
}

export async function enableUserService(
  userId: string,
  serviceType: ServiceType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  // Upsert — if the row already exists we just refresh the row.
  const { error } = await supabase
    .from("user_services")
    .upsert(
      { owner_id: userId, service_type: serviceType },
      { onConflict: "owner_id,service_type" },
    );
  if (error) {
    console.warn("[kasikash] enableUserService:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export async function disableUserService(
  userId: string,
  serviceType: ServiceType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const { error } = await supabase
    .from("user_services")
    .delete()
    .eq("owner_id", userId)
    .eq("service_type", serviceType);
  if (error) {
    console.warn("[kasikash] disableUserService:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

// ---------- mashonisa loans + repayments ----------

/**
 * Fetch all of the user's loans + their repayments. Repayments are
 * nested into each loan on the way out so the client's UI can
 * iterate loans.repayments without a second join.
 */
export async function fetchMashonisaLoans(
  userId: string,
): Promise<MashonisaLoan[]> {
  if (!supabase) return [];
  const [{ data: loanRows, error: loanErr }, { data: repayRows, error: repayErr }] =
    await Promise.all([
      supabase
        .from("mashonisa_loans")
        .select(
          "id, owner_id, borrower_name, borrower_phone, amount_lent, interest_percentage, agreed_repayment_date, notes, status, amount_repaid, created_at, repaid_at, event_type, evidence_type, evidence_tier",
        )
        .eq("owner_id", userId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("mashonisa_repayments")
        .select(
          "id, loan_id, owner_id, amount, paid_at, method, notes, evidence_tier",
        )
        .eq("owner_id", userId)
        .order("paid_at", { ascending: false })
        .limit(2000),
    ]);
  if (loanErr) {
    console.warn("[kasikash] fetchMashonisaLoans loans:", loanErr.message);
    return [];
  }
  if (repayErr) {
    console.warn(
      "[kasikash] fetchMashonisaLoans repayments:",
      repayErr.message,
    );
    // Non-fatal — return loans with empty repayment arrays.
  }
  const repaymentsByLoan = new Map<string, MashonisaRepayment[]>();
  for (const r of (repayRows ?? []) as MashonisaRepaymentRow[]) {
    const list = repaymentsByLoan.get(r.loan_id) ?? [];
    list.push(rowToRepayment(r));
    repaymentsByLoan.set(r.loan_id, list);
  }
  return ((loanRows ?? []) as MashonisaLoanRow[]).map((r) =>
    rowToLoan(r, repaymentsByLoan.get(r.id) ?? []),
  );
}

export async function insertMashonisaLoan(
  userId: string,
  loan: MashonisaLoan,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("mashonisa_loans").insert({
    id: loan.id,
    owner_id: userId,
    borrower_name: loan.borrowerName,
    borrower_phone: loan.borrowerPhone ?? null,
    amount_lent: loan.amountLent,
    interest_percentage: loan.interestPercentage,
    agreed_repayment_date: loan.agreedRepaymentDate ?? null,
    notes: loan.notes ?? null,
    status: loan.status,
    amount_repaid: 0,
    event_type: "mashonisa_loan",
    evidence_type: loan.evidenceType ?? "manual_entry",
    evidence_tier: loan.evidenceTier,
    created_at: new Date(loan.createdAt).toISOString(),
  });
  if (error) console.warn("[kasikash] insertMashonisaLoan:", error.message);
}

export async function updateMashonisaLoanStatus(
  _userId: string,
  loanId: string,
  status: MashonisaLoanStatus,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("mashonisa_loans")
    .update({ status })
    .eq("id", loanId);
  if (error)
    console.warn("[kasikash] updateMashonisaLoanStatus:", error.message);
}

export async function deleteMashonisaLoan(
  _userId: string,
  loanId: string,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("mashonisa_loans")
    .delete()
    .eq("id", loanId);
  if (error) console.warn("[kasikash] deleteMashonisaLoan:", error.message);
}

export async function insertMashonisaRepayment(
  userId: string,
  repayment: MashonisaRepayment,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("mashonisa_repayments")
    .insert({
      id: repayment.id,
      loan_id: repayment.loanId,
      owner_id: userId,
      amount: repayment.amount,
      paid_at: new Date(repayment.paidAt).toISOString(),
      method: repayment.method,
      notes: repayment.notes ?? null,
      evidence_tier: repayment.evidenceTier,
    });
  if (error)
    console.warn("[kasikash] insertMashonisaRepayment:", error.message);
}

export async function deleteMashonisaRepayment(
  _userId: string,
  repaymentId: string,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("mashonisa_repayments")
    .delete()
    .eq("id", repaymentId);
  if (error)
    console.warn("[kasikash] deleteMashonisaRepayment:", error.message);
}


// ---------------------------------------------------------------------------
// PR #36 — Mashonisa receiving-banking (mashonisa_banking table)
//
// One row per lender. Lets borrowers pay loans back via the app —
// the lender stores where to pay once, each loan surfaces it.
// ---------------------------------------------------------------------------

import type { MashonisaBanking } from "../store";

type MashonisaBankingRow = {
  owner_id: string;
  bank_name: string | null;
  account_holder: string | null;
  account_number: string | null;
  branch_code: string | null;
  payshap_phone: string | null;
};

export async function fetchMashonisaBanking(
  userId: string,
): Promise<MashonisaBanking | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("mashonisa_banking")
    .select(
      "owner_id, bank_name, account_holder, account_number, branch_code, payshap_phone",
    )
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[kasikash] fetchMashonisaBanking:", error.message);
    return null;
  }
  if (!data) return null;
  const r = data as MashonisaBankingRow;
  return {
    bankName: r.bank_name,
    accountHolder: r.account_holder,
    accountNumber: r.account_number,
    branchCode: r.branch_code,
    payshapPhone: r.payshap_phone,
  };
}

export async function saveMashonisaBanking(
  userId: string,
  banking: {
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    branchCode: string;
    payshapPhone: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const { error } = await supabase.from("mashonisa_banking").upsert(
    {
      owner_id: userId,
      bank_name: banking.bankName || null,
      account_holder: banking.accountHolder || null,
      account_number: banking.accountNumber || null,
      branch_code: banking.branchCode || null,
      payshap_phone: banking.payshapPhone || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id" },
  );
  if (error) {
    console.warn("[kasikash] saveMashonisaBanking:", error.message);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

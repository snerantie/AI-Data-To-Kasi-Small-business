import { supabase } from "./supabase";
import type { Lang } from "../i18n";
import type {
  Sale,
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

// ---- Sales ------------------------------------------------------------------

type SaleRow = {
  id: string;
  item: string;
  qty: number;
  price: number | string;
  raw: string | null;
  source: Sale["source"] | null;
  created_at: string;
};

const rowToSale = (r: SaleRow): Sale => ({
  id: r.id,
  item: r.item,
  qty: r.qty,
  price: typeof r.price === "string" ? parseFloat(r.price) : r.price,
  raw: r.raw ?? undefined,
  source: (r.source ?? "manual") as Sale["source"],
  createdAt: new Date(r.created_at).getTime(),
});

export async function fetchSales(userId: string): Promise<Sale[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("sales")
    .select("id, item, qty, price, raw, source, created_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("[kasikash] fetchSales:", error.message);
    return null;
  }
  return (data as SaleRow[]).map(rowToSale);
}

export async function insertSale(userId: string, sale: Sale): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("sales").insert({
    id: sale.id,
    owner_id: userId,
    item: sale.item,
    qty: sale.qty,
    price: sale.price,
    raw: sale.raw ?? null,
    source: sale.source ?? "manual",
    created_at: new Date(sale.createdAt).toISOString(),
  });
  if (error) console.warn("[kasikash] insertSale:", error.message);
}

export async function insertSales(userId: string, sales: Sale[]): Promise<void> {
  if (!supabase || sales.length === 0) return;
  const { error } = await supabase.from("sales").insert(
    sales.map((s) => ({
      id: s.id,
      owner_id: userId,
      item: s.item,
      qty: s.qty,
      price: s.price,
      raw: s.raw ?? null,
      source: s.source ?? "manual",
      created_at: new Date(s.createdAt).toISOString(),
    })),
  );
  if (error) console.warn("[kasikash] insertSales:", error.message);
}

// ---- Tabs -------------------------------------------------------------------

type TabRow = {
  id: string;
  customer: string;
  amount: number | string;
  paid: boolean;
  created_at: string;
};

const rowToTab = (r: TabRow): Tab => ({
  id: r.id,
  customer: r.customer,
  amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
  paid: r.paid,
  createdAt: new Date(r.created_at).getTime(),
});

export async function fetchTabs(userId: string): Promise<Tab[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("tabs")
    .select("id, customer, amount, paid, created_at")
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
  const { error } = await supabase.from("tabs").insert({
    id: tab.id,
    owner_id: userId,
    customer: tab.customer,
    amount: tab.amount,
    paid: tab.paid ?? false,
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
};

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
): Contribution => ({
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
});

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
          "id, name, goal, members, bank_name, bank_account_holder, bank_account_number, bank_branch_code, payshap_phone",
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
          "id, amount, note, owner_id, created_at, status, method, reference, confirmed_at, rejected_reason",
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
  s: { name: string; goal: number; members: number },
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
  // The DB trigger auto-adds the creator as an admin membership.
  return typeof data === "string" ? data : null;
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
  const { data, error } = await supabase.rpc("join_stokvel", {
    invite_code: code.trim().toUpperCase(),
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

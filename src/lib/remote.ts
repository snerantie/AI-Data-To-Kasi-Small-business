import { supabase } from "./supabase";
import type { Lang } from "../i18n";
import type {
  Sale,
  Tab,
  Contribution,
  Stokvel,
  Profile,
  BusinessType,
} from "../store";

/**
 * Thin CRUD wrapper around Supabase for KasiKash.
 *
 * Every function is a no-op (or returns null) when Supabase isn't
 * configured, so callers can treat cloud sync as best-effort.
 */

// ---- Session ----------------------------------------------------------------

/**
 * Ensure the user has an auth session. If not, sign in anonymously.
 * Returns the user id, or null if Supabase is unavailable.
 */
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

/**
 * Sign the current user out and immediately create a fresh anonymous
 * session. Used by the Settings → "Reset account" flow.
 */
export async function resetToFreshAnon(): Promise<string | null> {
  if (!supabase) return null;
  await supabase.auth.signOut();
  return ensureSession();
}

// ---- Auth (email magic link) -----------------------------------------------

export type AuthResult =
  | { ok: true; kind: "verification_sent" | "signin_sent" | "signed_out" }
  | { ok: false; error: string };

export type CurrentAuth = {
  userId: string | null;
  email: string | null;
  isAnonymous: boolean;
};

/**
 * Snapshot of the current auth state — used by the store on boot and
 * whenever an auth event fires.
 */
export async function getCurrentAuth(): Promise<CurrentAuth> {
  if (!supabase) return { userId: null, email: null, isAnonymous: false };
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return { userId: null, email: null, isAnonymous: false };
  // Supabase's TS types don't officially expose is_anonymous yet, but
  // it's part of the user payload from the API.
  const isAnon = Boolean(
    (user as unknown as { is_anonymous?: boolean }).is_anonymous,
  );
  return {
    userId: user.id,
    email: user.email ?? null,
    isAnonymous: isAnon,
  };
}

const redirectOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : undefined;

/**
 * Attach an email to the current anonymous user. Sends a verification
 * email — after the user clicks, the anonymous account is upgraded to
 * a permanent email account. Same user_id, all data preserved.
 */
export async function linkEmail(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: redirectOrigin() },
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true, kind: "verification_sent" };
}

/**
 * Send a sign-in magic link to an existing account. Used when signing
 * in on a new device.
 *
 * We sign out of the anonymous session first so the click on the link
 * establishes a clean session for the existing user. If the user never
 * clicks, they'll be re-anonymised on next boot.
 */
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

/**
 * Sign the user out. Callers should immediately create a new anonymous
 * session (see ensureSession) so the app remains usable.
 */
export async function signOut(): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: error.message };
  return { ok: true, kind: "signed_out" };
}

/**
 * Subscribe to auth state changes (sign-in, sign-out, user-updated on
 * email verification, token refresh, etc.).
 * Returns an unsubscribe function.
 */
export function onAuthChange(
  cb: (event: string) => void,
): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) => cb(event));
  return () => data.subscription.unsubscribe();
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

// ---- Stokvel + contributions -----------------------------------------------

type StokvelRow = {
  id: string;
  name: string;
  goal: number | string;
  members: number;
};

type ContributionRow = {
  id: string;
  amount: number | string;
  note: string | null;
  created_at: string;
};

const rowToStokvel = (
  r: StokvelRow,
  contributions: Contribution[],
): Stokvel => ({
  name: r.name,
  goal: typeof r.goal === "string" ? parseFloat(r.goal) : r.goal,
  members: r.members,
  contributions,
});

const rowToContribution = (r: ContributionRow): Contribution => ({
  id: r.id,
  amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
  note: r.note ?? undefined,
  createdAt: new Date(r.created_at).getTime(),
});

/**
 * Read-only stokvel fetch. Returns null if the user has no stokvel yet.
 * Onboarding is expected to create one via createStokvel().
 */
export async function fetchStokvel(
  userId: string,
): Promise<{ stokvel: Stokvel; stokvelId: string } | null> {
  if (!supabase) return null;

  const { data: sk } = await supabase
    .from("stokvels")
    .select("id, name, goal, members")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!sk) return null;
  const skRow = sk as StokvelRow;

  const { data: contribs, error: cErr } = await supabase
    .from("contributions")
    .select("id, amount, note, created_at")
    .eq("stokvel_id", skRow.id)
    .order("created_at", { ascending: false })
    .limit(200);
  if (cErr) console.warn("[kasikash] fetch contributions:", cErr.message);

  const contributions = (contribs ?? []).map((row) =>
    rowToContribution(row as ContributionRow),
  );

  return {
    stokvel: rowToStokvel(skRow, contributions),
    stokvelId: skRow.id,
  };
}

export async function createStokvel(
  userId: string,
  s: { name: string; goal: number; members: number },
): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stokvels")
    .insert({
      owner_id: userId,
      name: s.name,
      goal: s.goal,
      members: s.members,
    })
    .select("id")
    .single();
  if (error) {
    console.warn("[kasikash] createStokvel:", error.message);
    return null;
  }
  return (data as { id: string }).id;
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
  userId: string,
  stokvelId: string,
  contribution: Contribution,
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("contributions").insert({
    id: contribution.id,
    stokvel_id: stokvelId,
    owner_id: userId,
    amount: contribution.amount,
    note: contribution.note ?? null,
    created_at: new Date(contribution.createdAt).toISOString(),
  });
  if (error) console.warn("[kasikash] insertContribution:", error.message);
}

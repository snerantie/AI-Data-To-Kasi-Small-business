import { supabase } from "./supabase";
import type { Lang } from "../i18n";
import type { Sale, Tab, Contribution, Stokvel } from "../store";

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

  // No session — create an anonymous one so the demo just works.
  const { data: anonData, error } = await supabase.auth.signInAnonymously();
  if (error || !anonData.user) {
    console.warn("[kasikash] anonymous sign-in failed:", error);
    return null;
  }
  return anonData.user.id;
}

// ---- Profile ---------------------------------------------------------------

type ProfileRow = {
  id: string;
  language: Lang | null;
  onboarded: boolean;
};

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, language, onboarded")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[kasikash] fetchProfile:", error.message);
    return null;
  }
  return data as ProfileRow | null;
}

export async function upsertProfile(
  userId: string,
  patch: { language?: Lang; onboarded?: boolean },
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("profiles")
    .upsert(
      { id: userId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "id" },
    );
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
 * Fetch the owner's stokvel + its contributions.
 * Ensures a stokvel row exists (creates the default one if missing) so
 * subsequent contribution inserts always have a parent.
 */
export async function fetchStokvel(
  userId: string,
  defaults: { name: string; goal: number; members: number },
): Promise<{ stokvel: Stokvel; stokvelId: string } | null> {
  if (!supabase) return null;

  let { data: sk } = await supabase
    .from("stokvels")
    .select("id, name, goal, members")
    .eq("owner_id", userId)
    .maybeSingle();

  if (!sk) {
    const { data: created, error } = await supabase
      .from("stokvels")
      .insert({
        owner_id: userId,
        name: defaults.name,
        goal: defaults.goal,
        members: defaults.members,
      })
      .select("id, name, goal, members")
      .single();
    if (error) {
      console.warn("[kasikash] create stokvel:", error.message);
      return null;
    }
    sk = created;
  }

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

import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./i18n";
import { isCloudConfigured } from "./lib/supabase";
import {
  createInvite as remoteCreateInvite,
  createStokvel as remoteCreateStokvel,
  ensureSession,
  fetchLatestInvite,
  fetchProfile,
  fetchSales,
  fetchTabs,
  fetchUserPrimaryStokvel,
  getCurrentAuth,
  insertContribution as remoteInsertContribution,
  insertSale as remoteInsertSale,
  insertSales as remoteInsertSales,
  insertTab as remoteInsertTab,
  joinStokvelByCode as remoteJoinStokvel,
  leaveStokvel as remoteLeaveStokvel,
  linkEmail as remoteLinkEmail,
  onAuthChange,
  resetToFreshAnon,
  sendSignInLink as remoteSendSignInLink,
  signOut as remoteSignOut,
  updateStokvel as remoteUpdateStokvel,
  updateTabPaid as remoteUpdateTabPaid,
  upsertProfile as remoteUpsertProfile,
} from "./lib/remote";
import type { AuthResult, CurrentAuth } from "./lib/remote";

// ---- Types -----------------------------------------------------------------

export type BusinessType =
  | "spaza"
  | "salon"
  | "taxi"
  | "tailor"
  | "food"
  | "other";

export type Profile = {
  ownerName: string | null;
  businessName: string | null;
  businessType: BusinessType | null;
};

export type Sale = {
  id: string;
  item: string;
  qty: number;
  price: number;
  createdAt: number;
  raw?: string;
  source?: "voice" | "manual";
};

export type Tab = {
  id: string;
  customer: string;
  amount: number;
  createdAt: number;
  paid?: boolean;
};

export type MemberRole = "admin" | "member";

export type StokvelMember = {
  userId: string;
  role: MemberRole;
  displayName: string;
  joinedAt: number;
};

export type Contribution = {
  id: string;
  amount: number;
  createdAt: number;
  note?: string;
  memberName?: string; // For display: who contributed
  ownerId?: string;
};

export type Stokvel = {
  id: string;
  name: string;
  goal: number;
  members: number; // Target member count set on creation
  memberships: StokvelMember[];
  contributions: Contribution[];
  role: MemberRole; // Current user's role in this stokvel
};

export type StokvelInvite = {
  code: string;
  createdAt: number;
  expiresAt: number | null;
};

export type AppState = {
  lang: Lang | null;
  profile: Profile;
  sales: Sale[];
  tabs: Tab[];
  stokvel: Stokvel | null;
  onboarded: boolean;
};

export type SyncStatus = "local" | "connecting" | "synced" | "error";

// ---- Empty starting state -------------------------------------------------

const emptyState: AppState = {
  lang: null,
  onboarded: false,
  profile: {
    ownerName: null,
    businessName: null,
    businessType: null,
  },
  sales: [],
  tabs: [],
  stokvel: null,
};

// ---- Persistence ----------------------------------------------------------

const KEY = "kasikash-state-v4";
const LEGACY_KEYS = ["kasikash-state-v3", "kasikash-state-v2"];

function loadInitial(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return {
        ...emptyState,
        ...parsed,
        profile: { ...emptyState.profile, ...(parsed.profile ?? {}) },
      };
    }
    // Migrate from older cache versions
    for (const legacyKey of LEGACY_KEYS) {
      const legacy = localStorage.getItem(legacyKey);
      if (legacy) {
        const parsed = JSON.parse(legacy) as Partial<AppState> & {
          stokvel?: { name?: string };
        };
        return {
          ...emptyState,
          lang: parsed.lang ?? null,
          onboarded: Boolean(parsed.onboarded),
          sales: parsed.sales ?? [],
          tabs: parsed.tabs ?? [],
          profile: { ...emptyState.profile, ...(parsed.profile ?? {}) },
          // Legacy stokvel shape is discarded; will be re-hydrated from server
          stokvel: null,
        };
      }
    }
  } catch {
    // ignore
  }
  return emptyState;
}

function saveLocal(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

// ---- Module-level state ---------------------------------------------------

let state: AppState = loadInitial();
let userId: string | null = null;
let stokvelId: string | null = null;
let syncStatus: SyncStatus = isCloudConfigured ? "connecting" : "local";
let authInfo: CurrentAuth = {
  userId: null,
  email: null,
  isAnonymous: false,
};
export type PendingAuth = "verification" | "signin" | null;
let pendingAuth: PendingAuth = null;
const subs = new Set<() => void>();

function notify() {
  subs.forEach((fn) => fn());
}

function setSync(next: SyncStatus) {
  if (syncStatus === next) return;
  syncStatus = next;
  notify();
}

function setState(
  patch: Partial<AppState> | ((s: AppState) => Partial<AppState>),
) {
  const delta = typeof patch === "function" ? patch(state) : patch;
  state = {
    ...state,
    ...delta,
    profile:
      delta.profile !== undefined
        ? { ...state.profile, ...delta.profile }
        : state.profile,
    // stokvel is either null or replaced wholesale
    stokvel:
      delta.stokvel !== undefined ? delta.stokvel : state.stokvel,
  };
  saveLocal(state);
  notify();
}

// ---- Cloud hydration ------------------------------------------------------

let hydrating: Promise<void> | null = null;

async function hydrateFromRemote(): Promise<void> {
  if (!isCloudConfigured) return;
  setSync("connecting");
  try {
    const uid = await ensureSession();
    if (!uid) {
      setSync("error");
      return;
    }
    userId = uid;
    authInfo = await getCurrentAuth();

    const [profileFetch, sales, tabs, stokvelRes] = await Promise.all([
      fetchProfile(uid),
      fetchSales(uid),
      fetchTabs(uid),
      fetchUserPrimaryStokvel(uid),
    ]);

    const merged: AppState = {
      ...state,
      lang: profileFetch?.language ?? state.lang,
      onboarded: profileFetch ? profileFetch.onboarded : state.onboarded,
      profile: profileFetch?.profile ?? state.profile,
      sales: sales ?? state.sales,
      tabs: tabs ?? state.tabs,
      stokvel: stokvelRes?.stokvel ?? null,
    };

    state = merged;
    stokvelId = stokvelRes?.stokvelId ?? null;
    saveLocal(state);
    setSync("synced");
    notify();
  } catch (err) {
    console.warn("[kasikash] hydrateFromRemote failed:", err);
    setSync("error");
  }
}

if (isCloudConfigured && typeof window !== "undefined") {
  hydrating = hydrateFromRemote();

  onAuthChange((event) => {
    if (
      event === "SIGNED_IN" ||
      event === "USER_UPDATED" ||
      event === "SIGNED_OUT"
    ) {
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        pendingAuth = null;
      }
      hydrateFromRemote();
    }
  });
}

function sync<T>(op: () => Promise<T>) {
  if (!isCloudConfigured) return;
  op().catch((err) => {
    console.warn("[kasikash] remote sync failed:", err);
  });
}

// ---- Hook -----------------------------------------------------------------

export function useStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);

  // -- Onboarding actions --

  const setLang = useCallback((lang: Lang) => {
    setState({ lang });
    if (userId) {
      sync(() => remoteUpsertProfile(userId!, { language: lang }));
    } else if (isCloudConfigured) {
      (async () => {
        await hydrating;
        if (userId) await remoteUpsertProfile(userId, { language: lang });
      })();
    }
  }, []);

  const setProfile = useCallback((patch: Partial<Profile>) => {
    setState({ profile: patch as Profile });
    if (userId) {
      sync(() =>
        remoteUpsertProfile(userId!, {
          ownerName: patch.ownerName,
          businessName: patch.businessName,
          businessType: patch.businessType,
        }),
      );
    } else if (isCloudConfigured) {
      (async () => {
        await hydrating;
        if (userId) {
          await remoteUpsertProfile(userId, {
            ownerName: patch.ownerName,
            businessName: patch.businessName,
            businessType: patch.businessType,
          });
        }
      })();
    }
  }, []);

  const finishOnboarding = useCallback(() => {
    setState({ onboarded: true });
    if (userId) {
      sync(() => remoteUpsertProfile(userId!, { onboarded: true }));
    }
  }, []);

  // -- Stokvel actions --

  /**
   * Create a new stokvel with the current user as admin. Returns the created
   * stokvel's id on success.
   */
  const createStokvelAsAdmin = useCallback(
    async (input: {
      name: string;
      goal: number;
      members: number;
    }): Promise<string | null> => {
      if (!userId) return null;
      const id = await remoteCreateStokvel(userId, input);
      if (id) {
        stokvelId = id;
        // Re-hydrate to pick up the new membership + stokvel row
        await hydrateFromRemote();
      }
      return id;
    },
    [],
  );

  /**
   * Join an existing stokvel using an invite code.
   */
  const joinStokvelByCode = useCallback(async (code: string) => {
    if (!isCloudConfigured) {
      return { ok: false, error: "Cloud not configured" } as const;
    }
    const result = await remoteJoinStokvel(code);
    if (result.ok) {
      stokvelId = result.stokvelId;
      await hydrateFromRemote();
    }
    return result;
  }, []);

  /**
   * Generate a fresh invite code (admin only). Returns the code on success.
   */
  const generateInvite = useCallback(async (): Promise<
    StokvelInvite | null
  > => {
    if (!userId || !stokvelId) return null;
    return await remoteCreateInvite(userId, stokvelId);
  }, []);

  /**
   * Fetch the most recent existing invite for the current stokvel (if any).
   */
  const getLatestInvite = useCallback(async (): Promise<
    StokvelInvite | null
  > => {
    if (!stokvelId) return null;
    return await fetchLatestInvite(stokvelId);
  }, []);

  /**
   * Leave the current stokvel. Refuses if the user is the sole admin.
   */
  const leaveStokvel = useCallback(async () => {
    if (!userId || !stokvelId) {
      return { ok: false, error: "no_stokvel" } as const;
    }
    const result = await remoteLeaveStokvel(userId, stokvelId);
    if (result.ok) {
      stokvelId = null;
      setState({ stokvel: null });
      await hydrateFromRemote();
    }
    return result;
  }, []);

  const setStokvelMeta = useCallback(
    (patch: Partial<Pick<Stokvel, "name" | "goal" | "members">>) => {
      if (!state.stokvel) return;
      // Optimistic local update (only admins should call this; UI enforces)
      setState({
        stokvel: {
          ...state.stokvel,
          ...patch,
        },
      });
      if (stokvelId) sync(() => remoteUpdateStokvel(stokvelId!, patch));
    },
    [],
  );

  // -- Sales --

  const addSale = useCallback((sale: Omit<Sale, "id" | "createdAt">) => {
    const full: Sale = {
      ...sale,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setState((s) => ({ sales: [full, ...s.sales] }));
    if (userId) sync(() => remoteInsertSale(userId!, full));
    return full;
  }, []);

  const addSales = useCallback((sales: Omit<Sale, "id" | "createdAt">[]) => {
    const now = Date.now();
    const full: Sale[] = sales.map((sale, i) => ({
      ...sale,
      id: crypto.randomUUID(),
      createdAt: now + i,
    }));
    setState((s) => ({ sales: [...full, ...s.sales] }));
    if (userId) sync(() => remoteInsertSales(userId!, full));
  }, []);

  const undoSale = useCallback((id: string) => {
    setState((s) => ({ sales: s.sales.filter((x) => x.id !== id) }));
    if (userId && isCloudConfigured) {
      sync(async () => {
        const { supabase } = await import("./lib/supabase");
        if (supabase) {
          await supabase.from("sales").delete().eq("id", id);
        }
      });
    }
  }, []);

  // -- Tabs --

  const addTab = useCallback((tab: Omit<Tab, "id" | "createdAt">) => {
    const full: Tab = {
      ...tab,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setState((s) => ({ tabs: [full, ...s.tabs] }));
    if (userId) sync(() => remoteInsertTab(userId!, full));
  }, []);

  const markTabPaid = useCallback((id: string) => {
    setState((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, paid: true } : t)),
    }));
    sync(() => remoteUpdateTabPaid(id));
  }, []);

  const addContribution = useCallback((amount: number, note?: string) => {
    if (!state.stokvel) return;
    const c: Contribution = {
      id: crypto.randomUUID(),
      amount,
      note,
      createdAt: Date.now(),
      memberName:
        state.stokvel.memberships.find((m) => m.userId === userId)
          ?.displayName ?? state.profile.ownerName ?? undefined,
      ownerId: userId ?? undefined,
    };
    setState((s) => ({
      stokvel: s.stokvel
        ? {
            ...s.stokvel,
            contributions: [c, ...s.stokvel.contributions],
          }
        : null,
    }));
    if (userId && stokvelId) {
      sync(() => remoteInsertContribution(userId!, stokvelId!, c));
    }
  }, []);

  // -- Email auth --

  const linkEmailToAccount = useCallback(
    async (email: string): Promise<AuthResult> => {
      const result = await remoteLinkEmail(email);
      if (result.ok) {
        pendingAuth = "verification";
        notify();
      }
      return result;
    },
    [],
  );

  const signInWithEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      const result = await remoteSendSignInLink(email);
      if (result.ok) {
        pendingAuth = "signin";
        notify();
        hydrateFromRemote();
      }
      return result;
    },
    [],
  );

  const clearPendingAuth = useCallback(() => {
    if (pendingAuth === null) return;
    pendingAuth = null;
    notify();
  }, []);

  const signOut = useCallback(async (): Promise<AuthResult> => {
    const result = await remoteSignOut();
    try {
      localStorage.removeItem(KEY);
      for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    } catch {
      // ignore
    }
    state = { ...emptyState };
    userId = null;
    stokvelId = null;
    authInfo = { userId: null, email: null, isAnonymous: false };
    pendingAuth = null;
    notify();
    await hydrateFromRemote();
    return result;
  }, []);

  const resetAccount = useCallback(async () => {
    try {
      localStorage.removeItem(KEY);
      for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    } catch {
      // ignore
    }
    state = { ...emptyState };
    stokvelId = null;
    userId = null;
    notify();

    if (isCloudConfigured) {
      const uid = await resetToFreshAnon();
      if (uid) {
        userId = uid;
        setSync("synced");
      } else {
        setSync("error");
      }
    }
  }, []);

  return {
    state,
    syncStatus,
    isCloud: isCloudConfigured,
    userId,
    email: authInfo.email,
    isSignedIn: Boolean(authInfo.email) && !authInfo.isAnonymous,
    isAnonymous: authInfo.isAnonymous,
    pendingAuth,
    // onboarding
    setLang,
    setProfile,
    finishOnboarding,
    // stokvel
    createStokvelAsAdmin,
    joinStokvelByCode,
    generateInvite,
    getLatestInvite,
    leaveStokvel,
    setStokvelMeta,
    // sales/tabs/contributions
    addSale,
    addSales,
    undoSale,
    addTab,
    markTabPaid,
    addContribution,
    // account
    resetAccount,
    linkEmailToAccount,
    signInWithEmail,
    signOut,
    clearPendingAuth,
  };
}

// ---- Derived selectors ----------------------------------------------------

export function todayRange(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function sumSalesToday(sales: Sale[]) {
  const from = todayRange();
  return sales
    .filter((s) => s.createdAt >= from)
    .reduce((acc, s) => acc + s.qty * s.price, 0);
}

export function estimatedProfitToday(sales: Sale[]) {
  return Math.round(sumSalesToday(sales) * 0.22);
}

export function sumWeekProfit(sales: Sale[]) {
  const from = Date.now() - 1000 * 60 * 60 * 24 * 7;
  const week = sales.filter((s) => s.createdAt >= from);
  const rev = week.reduce((a, s) => a + s.qty * s.price, 0);
  return Math.round(rev * 0.22);
}

export function totalOwed(tabs: Tab[]) {
  return tabs.filter((t) => !t.paid).reduce((a, t) => a + t.amount, 0);
}

export function topSeller(sales: Sale[]) {
  const totals: Record<string, number> = {};
  for (const s of sales) {
    totals[s.item] = (totals[s.item] || 0) + s.qty * s.price;
  }
  let best: { item: string; rev: number } | null = null;
  for (const [item, rev] of Object.entries(totals)) {
    if (!best || rev > best.rev) best = { item, rev };
  }
  return best;
}

export function stokvelTotal(stokvel: Stokvel | null) {
  if (!stokvel) return 0;
  return stokvel.contributions.reduce((a, c) => a + c.amount, 0);
}

export function stokvelProgress(stokvel: Stokvel | null) {
  if (!stokvel || !stokvel.goal || stokvel.goal <= 0) return 0;
  return Math.max(0, Math.min(1, stokvelTotal(stokvel) / stokvel.goal));
}

/** Sum of one member's contributions to a stokvel */
export function memberContributed(stokvel: Stokvel, userId: string) {
  return stokvel.contributions
    .filter((c) => c.ownerId === userId)
    .reduce((a, c) => a + c.amount, 0);
}

export function kasiScore(state: AppState): number {
  const activity = Math.min(state.sales.length * 6, 180);
  const paidTabs = state.tabs.filter((t) => t.paid).length;
  const unpaid = state.tabs.filter((t) => !t.paid).length;
  const discipline = paidTabs * 25 - unpaid * 10;
  const savings = Math.min(stokvelTotal(state.stokvel) / 25, 80);
  const base = 460;
  return Math.max(
    300,
    Math.min(850, Math.round(base + activity + discipline + savings)),
  );
}

export function formatRand(n: number) {
  return "R" + n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });
}

export function needsOnboarding(state: AppState): boolean {
  if (!state.onboarded) return true;
  if (!state.lang) return true;
  if (!state.profile.ownerName) return true;
  if (!state.profile.businessName) return true;
  if (!state.profile.businessType) return true;
  // Stokvel is no longer required — user can skip and add later
  return false;
}

// ---- Dynamic insights engine ---------------------------------------------

export type Insight = {
  id: string;
  key: string;
  accent: "green" | "gold" | "coral";
  priority: number;
  params: Record<string, string | number>;
};

const daysAgo = (ts: number) =>
  Math.max(0, Math.round((Date.now() - ts) / (1000 * 60 * 60 * 24)));

export function computeInsights(state: AppState): Insight[] {
  const insights: Insight[] = [];
  const now = Date.now();

  const oldTabs = state.tabs.filter((t) => !t.paid && daysAgo(t.createdAt) >= 7);
  if (oldTabs.length > 0) {
    const worst = [...oldTabs].sort((a, b) => a.createdAt - b.createdAt)[0];
    insights.push({
      id: "old-tabs",
      key: "insightOldTabs",
      accent: "coral",
      priority: 90,
      params: {
        count: oldTabs.length,
        name: worst.customer,
        days: daysAgo(worst.createdAt),
      },
    });
  }

  const last24h = state.sales.filter(
    (s) => now - s.createdAt < 1000 * 60 * 60 * 24,
  );
  const cnt: Record<string, number> = {};
  for (const s of last24h) cnt[s.item] = (cnt[s.item] || 0) + 1;
  const hot = Object.entries(cnt).find(([, c]) => c >= 3);
  if (hot) {
    insights.push({
      id: "hot-item",
      key: "insightHotItem",
      accent: "green",
      priority: 80,
      params: { item: hot[0], count: hot[1] },
    });
  }

  const today = sumSalesToday(state.sales);
  const weekRev =
    state.sales
      .filter((s) => now - s.createdAt < 1000 * 60 * 60 * 24 * 7)
      .reduce((a, s) => a + s.qty * s.price, 0) || 1;
  const avg = weekRev / 7;
  if (today > 0 && avg > 0) {
    const pct = Math.round(((today - avg) / avg) * 100);
    if (pct >= 15) {
      insights.push({
        id: "up-today",
        key: "insightUpToday",
        accent: "green",
        priority: 70,
        params: { pct },
      });
    } else if (pct <= -20 && new Date().getHours() >= 12) {
      insights.push({
        id: "down-today",
        key: "insightDownToday",
        accent: "gold",
        priority: 60,
        params: { pct: Math.abs(pct) },
      });
    }
  }

  if (today === 0 && new Date().getHours() >= 12) {
    insights.push({
      id: "silent-day",
      key: "insightSilentDay",
      accent: "gold",
      priority: 75,
      params: {},
    });
  }

  const score = kasiScore(state);
  if (score >= 700) {
    insights.push({
      id: "credit-unlocked",
      key: "insightCreditUnlocked",
      accent: "green",
      priority: 65,
      params: { amount: 2000 },
    });
  } else if (score >= 600) {
    insights.push({
      id: "score-climbing",
      key: "insightScoreClimbing",
      accent: "gold",
      priority: 50,
      params: { score, needed: 700 - score },
    });
  }

  const stokvel = state.stokvel;
  const potPct = stokvelProgress(stokvel) * 100;
  if (stokvel && potPct >= 80 && potPct < 100) {
    const remain = stokvel.goal - stokvelTotal(stokvel);
    insights.push({
      id: "stokvel-close",
      key: "insightStokvelClose",
      accent: "green",
      priority: 55,
      params: { remain, name: stokvel.name },
    });
  } else if (stokvel && potPct < 30) {
    insights.push({
      id: "stokvel-start",
      key: "insightStokvelStart",
      accent: "gold",
      priority: 40,
      params: { name: stokvel.name },
    });
  }

  const owed = totalOwed(state.tabs);
  if (owed >= 200) {
    insights.push({
      id: "big-owed",
      key: "insightBigOwed",
      accent: "coral",
      priority: 45,
      params: { owed, half: Math.round(owed / 2) },
    });
  }

  return insights.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

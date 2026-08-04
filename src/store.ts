import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./i18n";
import { isCloudConfigured } from "./lib/supabase";
import {
  createStokvel as remoteCreateStokvel,
  ensureSession,
  fetchProfile,
  fetchSales,
  fetchStokvel,
  fetchTabs,
  getCurrentAuth,
  insertContribution as remoteInsertContribution,
  insertSale as remoteInsertSale,
  insertSales as remoteInsertSales,
  insertTab as remoteInsertTab,
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

export type Contribution = {
  id: string;
  amount: number;
  createdAt: number;
  note?: string;
};

export type Stokvel = {
  name: string;
  goal: number;
  members: number;
  contributions: Contribution[];
};

export type AppState = {
  lang: Lang | null;
  profile: Profile;
  sales: Sale[];
  tabs: Tab[];
  stokvel: Stokvel;
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
  stokvel: {
    name: "",
    goal: 5000,
    members: 1,
    contributions: [],
  },
};

// ---- Persistence ----------------------------------------------------------

const KEY = "kasikash-state-v3";
const LEGACY_KEY = "kasikash-state-v2";

function loadInitial(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      return {
        ...emptyState,
        ...parsed,
        profile: { ...emptyState.profile, ...(parsed.profile ?? {}) },
        stokvel: { ...emptyState.stokvel, ...(parsed.stokvel ?? {}) },
      };
    }
    // Migrate from v2 cache (single-time compatibility with older builds)
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<AppState>;
      return {
        ...emptyState,
        lang: parsed.lang ?? null,
        onboarded: Boolean(parsed.onboarded),
        sales: parsed.sales ?? [],
        tabs: parsed.tabs ?? [],
        stokvel: { ...emptyState.stokvel, ...(parsed.stokvel ?? {}) },
      };
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
    stokvel:
      delta.stokvel !== undefined
        ? { ...state.stokvel, ...delta.stokvel }
        : state.stokvel,
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
      fetchStokvel(uid),
    ]);

    const merged: AppState = {
      ...state,
      lang: profileFetch?.language ?? state.lang,
      onboarded: profileFetch ? profileFetch.onboarded : state.onboarded,
      profile: profileFetch?.profile ?? state.profile,
      sales: sales ?? state.sales,
      tabs: tabs ?? state.tabs,
      stokvel: stokvelRes?.stokvel ?? state.stokvel,
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

  const setStokvelMeta = useCallback(
    (patch: Partial<Pick<Stokvel, "name" | "goal" | "members">>) => {
      setState((s) => ({
        stokvel: { ...s.stokvel, ...patch },
      }));
      if (userId) {
        if (stokvelId) {
          sync(() => remoteUpdateStokvel(stokvelId!, patch));
        } else {
          sync(async () => {
            const id = await remoteCreateStokvel(userId!, {
              name: (patch.name ?? state.stokvel.name) || "My Stokvel",
              goal: patch.goal ?? state.stokvel.goal,
              members: patch.members ?? state.stokvel.members,
            });
            if (id) stokvelId = id;
          });
        }
      }
    },
    [],
  );

  const finishOnboarding = useCallback(() => {
    setState({ onboarded: true });
    if (userId) {
      sync(() => remoteUpsertProfile(userId!, { onboarded: true }));
    }
  }, []);

  // -- Mutations --

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

  /** Undo an insert-only sale: remove it from local state + Supabase. */
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
    const c: Contribution = {
      id: crypto.randomUUID(),
      amount,
      note,
      createdAt: Date.now(),
    };
    setState((s) => ({
      stokvel: {
        ...s.stokvel,
        contributions: [c, ...s.stokvel.contributions],
      },
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
      localStorage.removeItem(LEGACY_KEY);
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

  // -- Account / reset --

  const resetAccount = useCallback(async () => {
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(LEGACY_KEY);
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
    setStokvelMeta,
    finishOnboarding,
    // mutations
    addSale,
    addSales,
    undoSale,
    addTab,
    markTabPaid,
    addContribution,
    // account
    resetAccount,
    // email auth
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

export function stokvelTotal(stokvel: Stokvel) {
  return stokvel.contributions.reduce((a, c) => a + c.amount, 0);
}

export function stokvelProgress(stokvel: Stokvel) {
  if (!stokvel.goal || stokvel.goal <= 0) return 0;
  return Math.max(0, Math.min(1, stokvelTotal(stokvel) / stokvel.goal));
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
  if (!state.stokvel.name) return true;
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

  const potPct = stokvelProgress(state.stokvel) * 100;
  if (potPct >= 80 && potPct < 100 && state.stokvel.name) {
    const remain = state.stokvel.goal - stokvelTotal(state.stokvel);
    insights.push({
      id: "stokvel-close",
      key: "insightStokvelClose",
      accent: "green",
      priority: 55,
      params: { remain, name: state.stokvel.name },
    });
  } else if (potPct < 30 && state.stokvel.name) {
    insights.push({
      id: "stokvel-start",
      key: "insightStokvelStart",
      accent: "gold",
      priority: 40,
      params: { name: state.stokvel.name },
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

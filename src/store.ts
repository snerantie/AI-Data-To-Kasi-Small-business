import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./i18n";

export type Sale = {
  id: string;
  item: string;
  qty: number;
  price: number; // per unit
  createdAt: number;
  raw?: string; // raw voice transcript
  source?: "voice" | "manual" | "receipt";
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
  sales: Sale[];
  tabs: Tab[];
  stokvel: Stokvel;
  onboarded: boolean;
};

const KEY = "kasikash-state-v2";

const seed: AppState = {
  lang: null,
  onboarded: false,
  sales: [
    { id: "s1", item: "Bread", qty: 4, price: 18, createdAt: Date.now() - 1000 * 60 * 60 * 3, source: "voice" },
    { id: "s2", item: "Airtime", qty: 2, price: 12, createdAt: Date.now() - 1000 * 60 * 60 * 2, source: "voice" },
    { id: "s3", item: "Cold drink", qty: 3, price: 15, createdAt: Date.now() - 1000 * 60 * 30, source: "voice" },
    { id: "s4", item: "Bread", qty: 6, price: 18, createdAt: Date.now() - 1000 * 60 * 60 * 24, source: "voice" },
    { id: "s5", item: "Bread", qty: 5, price: 18, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2, source: "voice" },
    { id: "s6", item: "Maize meal", qty: 2, price: 45, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3, source: "manual" },
    { id: "s7", item: "Sugar", qty: 3, price: 22, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4, source: "manual" },
  ],
  tabs: [
    { id: "t1", customer: "Sipho", amount: 85, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2 },
    { id: "t2", customer: "Thandi", amount: 42, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5 },
    { id: "t3", customer: "Bra Vusi", amount: 120, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14 },
  ],
  stokvel: {
    name: "Ma-Nomsa Stokvel",
    goal: 5000,
    members: 8,
    contributions: [
      { id: "c1", amount: 250, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30, note: "January" },
      { id: "c2", amount: 250, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60 },
      { id: "c3", amount: 500, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 90 },
      { id: "c4", amount: 300, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 45 },
      { id: "c5", amount: 400, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 15 },
    ],
  },
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...seed,
      ...parsed,
      stokvel: { ...seed.stokvel, ...(parsed.stokvel ?? {}) },
    };
  } catch {
    return seed;
  }
}

function save(s: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

// Simple global store using a module-level state + subscribers
let state: AppState = load();
const subs = new Set<() => void>();

function setState(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  const next = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...next };
  save(state);
  subs.forEach((fn) => fn());
}

export function useStore() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, []);

  const setLang = useCallback((lang: Lang) => {
    setState({ lang, onboarded: true });
  }, []);

  const addSale = useCallback((sale: Omit<Sale, "id" | "createdAt">) => {
    setState((s) => ({
      sales: [
        { ...sale, id: crypto.randomUUID(), createdAt: Date.now() },
        ...s.sales,
      ],
    }));
  }, []);

  const addSales = useCallback((sales: Omit<Sale, "id" | "createdAt">[]) => {
    setState((s) => ({
      sales: [
        ...sales.map((sale) => ({
          ...sale,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        })),
        ...s.sales,
      ],
    }));
  }, []);

  const addTab = useCallback((tab: Omit<Tab, "id" | "createdAt">) => {
    setState((s) => ({
      tabs: [
        { ...tab, id: crypto.randomUUID(), createdAt: Date.now() },
        ...s.tabs,
      ],
    }));
  }, []);

  const markTabPaid = useCallback((id: string) => {
    setState((s) => ({
      tabs: s.tabs.map((t) => (t.id === id ? { ...t, paid: true } : t)),
    }));
  }, []);

  const addContribution = useCallback((amount: number, note?: string) => {
    setState((s) => ({
      stokvel: {
        ...s.stokvel,
        contributions: [
          {
            id: crypto.randomUUID(),
            amount,
            createdAt: Date.now(),
            note,
          },
          ...s.stokvel.contributions,
        ],
      },
    }));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    state = { ...seed };
    subs.forEach((fn) => fn());
  }, []);

  return {
    state,
    setLang,
    addSale,
    addSales,
    addTab,
    markTabPaid,
    addContribution,
    reset,
  };
}

// ---- Derived selectors ----
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
  return Math.max(0, Math.min(1, stokvelTotal(stokvel) / stokvel.goal));
}

export function kasiScore(state: AppState): number {
  const activity = Math.min(state.sales.length * 6, 180);
  const paidTabs = state.tabs.filter((t) => t.paid).length;
  const unpaid = state.tabs.filter((t) => !t.paid).length;
  const discipline = paidTabs * 25 - unpaid * 10;
  const savings = Math.min(stokvelTotal(state.stokvel) / 25, 80);
  const base = 460;
  return Math.max(300, Math.min(850, Math.round(base + activity + discipline + savings)));
}

export function formatRand(n: number) {
  return "R" + n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });
}

// ---- Dynamic "AI" insights engine ----
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

  // 1. Old unpaid tabs
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

  // 2. Top-seller momentum: same item sold 3+ times in last 24h
  const last24h = state.sales.filter((s) => now - s.createdAt < 1000 * 60 * 60 * 24);
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

  // 3. Today's earnings vs week average
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

  // 4. No sales today, past noon
  if (today === 0 && new Date().getHours() >= 12) {
    insights.push({
      id: "silent-day",
      key: "insightSilentDay",
      accent: "gold",
      priority: 75,
      params: {},
    });
  }

  // 5. Score threshold — credit unlocked
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

  // 6. Stokvel — close to goal
  const potPct = stokvelProgress(state.stokvel) * 100;
  if (potPct >= 80 && potPct < 100) {
    const remain = state.stokvel.goal - stokvelTotal(state.stokvel);
    insights.push({
      id: "stokvel-close",
      key: "insightStokvelClose",
      accent: "green",
      priority: 55,
      params: { remain, name: state.stokvel.name },
    });
  } else if (potPct < 30) {
    insights.push({
      id: "stokvel-start",
      key: "insightStokvelStart",
      accent: "gold",
      priority: 40,
      params: { name: state.stokvel.name },
    });
  }

  // 7. Big total owed
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

  // Sort by priority desc and take top 3
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 3);
}

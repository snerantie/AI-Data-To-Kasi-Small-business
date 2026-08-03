import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./i18n";

export type Sale = {
  id: string;
  item: string;
  qty: number;
  price: number; // per unit
  createdAt: number;
  raw?: string; // raw voice transcript
};

export type Tab = {
  id: string;
  customer: string;
  amount: number;
  createdAt: number;
  paid?: boolean;
};

export type AppState = {
  lang: Lang | null;
  sales: Sale[];
  tabs: Tab[];
  onboarded: boolean;
};

const KEY = "kasikash-state-v1";

const seed: AppState = {
  lang: null,
  onboarded: false,
  sales: [
    { id: "s1", item: "Bread", qty: 4, price: 18, createdAt: Date.now() - 1000 * 60 * 60 * 3 },
    { id: "s2", item: "Airtime", qty: 2, price: 12, createdAt: Date.now() - 1000 * 60 * 60 * 2 },
    { id: "s3", item: "Cold drink", qty: 3, price: 15, createdAt: Date.now() - 1000 * 60 * 30 },
  ],
  tabs: [
    { id: "t1", customer: "Sipho", amount: 85, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2 },
    { id: "t2", customer: "Thandi", amount: 42, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 5 },
    { id: "t3", customer: "Bra Vusi", amount: 120, createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14 },
  ],
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as AppState;
    return { ...seed, ...parsed };
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

  const reset = useCallback(() => {
    localStorage.removeItem(KEY);
    state = { ...seed };
    subs.forEach((fn) => fn());
  }, []);

  return { state, setLang, addSale, addTab, markTabPaid, reset };
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
  // Rough 22% margin approximation for demo purposes.
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

export function kasiScore(state: AppState): number {
  // Toy but plausible: base + activity + tabs discipline
  const activity = Math.min(state.sales.length * 6, 180);
  const paidTabs = state.tabs.filter((t) => t.paid).length;
  const unpaid = state.tabs.filter((t) => !t.paid).length;
  const discipline = paidTabs * 25 - unpaid * 10;
  const base = 480;
  return Math.max(300, Math.min(850, base + activity + discipline));
}

export function formatRand(n: number) {
  return "R" + n.toLocaleString("en-ZA", { maximumFractionDigits: 0 });
}

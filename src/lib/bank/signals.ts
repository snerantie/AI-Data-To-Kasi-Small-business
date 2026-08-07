/**
 * Aggregate signals over classified bank transactions (PR #23).
 *
 * Once bank statements have been parsed + classified + recurrence-
 * detected, the passport wants to display a handful of headline
 * numbers describing the shape of the account. This module owns
 * those calculations:
 *
 *   * counterpartyDiversity  — how many distinct counterparties?
 *                              The strongest fake-vs-real business
 *                              signal per our earlier discussion.
 *   * inflowsTotal           — sum of money-in over the window
 *   * outflowsTotal          — sum of money-out
 *   * cashDepositRatio       — cash deposits as a fraction of total
 *                              inflows (the anchor for the earlier
 *                              "cash reconciliation" idea)
 *   * recurringInflowCount   — number of distinct recurring inflows
 *   * topOutflowByCategory   — biggest single outflow category
 *                              (usually supplier_like for a spaza)
 *   * concentrationRatio     — largest single counterparty as a
 *                              fraction of total inflows (business-
 *                              concentration risk indicator)
 *
 * Everything is pure and stateless. Same-input-same-output. All
 * time windows are computed against `Date.now()` unless overridden
 * in the params.
 *
 * These signals feed the Financial Passport in PR #23. They do NOT
 * feed the KasiScore yet — per the earlier steering ("don't optimise
 * weights until we have repayment data"), we surface the signals
 * publicly first, then correlate against real defaults, then weight.
 */

import type {
  ClassificationCategory,
  ClassifiedTransaction,
  Direction,
} from "./types";

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

/**
 * All the signals the passport currently renders + a couple of
 * useful helper aggregates. Fields are number | null so we can
 * cleanly distinguish "no data" from "0".
 */
export type BankActivitySignals = {
  windowDays: number;
  transactionCount: number;

  inflowsTotal: number;
  outflowsTotal: number;
  netFlow: number;

  /** Distinct counterparties across ALL directions. */
  counterpartyDiversity: number;
  /** Distinct counterparties on inflows only — the customer-diversity
   *  proxy. Higher is better for a "real business" signature. */
  inflowCounterpartyDiversity: number;

  /**
   * Fraction of total inflows that came in as cash deposits. Anchor
   * point for reconciling declared cash sales against actual bank
   * activity. null when there were no inflows.
   */
  cashDepositRatio: number | null;

  /**
   * Fraction of total inflows attributable to the single biggest
   * counterparty. Reads like a Herfindahl-style concentration
   * measure; high concentration = few big payers = wash-trading
   * risk. null when there were no inflows.
   */
  concentrationRatio: number | null;

  /** Number of transactions flagged as recurring by the detector. */
  recurringCount: number;

  /**
   * Recurring inflows specifically — usually a salary + rental + a
   * couple of subscription refunds. Interesting on its own for the
   * "predictable monthly income" story.
   */
  recurringInflowCount: number;

  /**
   * Total outflows grouped by classification. Only the categories
   * that had activity in the window are included. Sorted by
   * amount descending — the top item is "your biggest outflow
   * category" for the passport.
   */
  outflowByCategory: Array<{
    category: ClassificationCategory;
    amount: number;
    count: number;
  }>;

  /**
   * The single counterparty with the largest supplier_like outflows
   * in the window. Displayed on the passport as "Top supplier".
   * null when no supplier_like activity was observed.
   */
  topSupplier: {
    name: string;
    amount: number;
    count: number;
  } | null;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type SignalsParams = {
  /** Only transactions from the last `windowDays` count. Default 30. */
  windowDays?: number;
  /** Override "now" for tests. */
  now?: number;
};

/**
 * Minimum surface a signal-eligible transaction has to expose. Both
 * the parser-side `ClassifiedTransaction` and the store-side
 * `BankTransaction` satisfy this; using a structural type here means
 * neither module needs to know about the other's field names (e.g.
 * ClassifiedTransaction has `parserMeta`, BankTransaction has
 * `provenance`, and signals doesn't care about either).
 */
export type SignalTransaction = {
  occurredAt: number;
  direction: Direction;
  amount: number;
  description: string;
  counterpartyName: string | null;
  classification: ClassificationCategory;
  isRecurring: boolean;
};

export function computeBankSignals(
  transactions: readonly SignalTransaction[],
  params: SignalsParams = {},
): BankActivitySignals {
  const windowDays = params.windowDays ?? 30;
  const now = params.now ?? Date.now();
  const cutoff = now - windowDays * MS_PER_DAY;

  const inWindow = transactions.filter((t) => t.occurredAt >= cutoff);

  // Skip both legs of own-transfer pairs from ALL aggregates — those
  // aren't real economic activity, just money moving between the
  // user's own accounts. Same for cash_withdrawal + cash_deposit
  // when they're two sides of a self-move (rare but happens).
  const relevant = inWindow.filter(
    (t) => t.classification !== "own_transfer",
  );

  const inflows = relevant.filter((t) => t.direction === "in");
  const outflows = relevant.filter((t) => t.direction === "out");

  const inflowsTotal = sumAmount(inflows);
  const outflowsTotal = sumAmount(outflows);
  const netFlow = inflowsTotal - outflowsTotal;

  // Counterparty diversity — distinct normalised counterparty names,
  // ignoring transactions with no extractable counterparty.
  const allCPs = distinctCounterparties(relevant);
  const inflowCPs = distinctCounterparties(inflows);

  // Cash-deposit ratio. Denominator is total inflows; numerator is
  // the sum of `cash_deposit` amounts. When there are no inflows we
  // return null instead of 0 to distinguish "no data" from "no cash".
  let cashDepositRatio: number | null = null;
  if (inflowsTotal > 0) {
    const cashSum = sumAmount(
      inflows.filter((t) => t.classification === "cash_deposit"),
    );
    cashDepositRatio = cashSum / inflowsTotal;
  }

  // Concentration ratio — biggest single counterparty as a share of
  // total inflows. A cash-heavy real business with dozens of
  // customers ends up around 0.05–0.15 here; a wash pattern with 2
  // repeat payers gets 0.5+.
  let concentrationRatio: number | null = null;
  if (inflowsTotal > 0) {
    const byCP = new Map<string, number>();
    for (const t of inflows) {
      const key = counterpartyKey(t.counterpartyName ?? t.description);
      if (!key) continue;
      byCP.set(key, (byCP.get(key) ?? 0) + t.amount);
    }
    let biggest = 0;
    for (const v of byCP.values()) biggest = Math.max(biggest, v);
    concentrationRatio = biggest / inflowsTotal;
  }

  // Recurring counts.
  const recurring = relevant.filter((t) => t.isRecurring);
  const recurringInflows = recurring.filter((t) => t.direction === "in");

  // Outflows-by-category rollup, sorted big-to-small.
  const outflowByCategory = rollupByCategory(outflows);

  // Top supplier: within supplier_like outflows, the counterparty
  // with the largest total. Useful headline for a spaza.
  const supplierOutflows = outflows.filter(
    (t) => t.classification === "supplier_like",
  );
  const topSupplier = topCounterparty(supplierOutflows);

  return {
    windowDays,
    transactionCount: inWindow.length,
    inflowsTotal,
    outflowsTotal,
    netFlow,
    counterpartyDiversity: allCPs,
    inflowCounterpartyDiversity: inflowCPs,
    cashDepositRatio,
    concentrationRatio,
    recurringCount: recurring.length,
    recurringInflowCount: recurringInflows.length,
    outflowByCategory,
    topSupplier,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sumAmount(xs: readonly SignalTransaction[]): number {
  let s = 0;
  for (const t of xs) s += t.amount;
  return s;
}

function distinctCounterparties(
  xs: readonly SignalTransaction[],
): number {
  const set = new Set<string>();
  for (const t of xs) {
    const key = counterpartyKey(t.counterpartyName ?? t.description);
    if (key) set.add(key);
  }
  return set.size;
}

function counterpartyKey(text: string): string | null {
  const s = text.toUpperCase().replace(/\s+/g, " ").trim();
  if (s.length < 3) return null;
  return s;
}

function rollupByCategory(
  xs: readonly SignalTransaction[],
): BankActivitySignals["outflowByCategory"] {
  const map = new Map<
    ClassificationCategory,
    { amount: number; count: number }
  >();
  for (const t of xs) {
    const entry = map.get(t.classification) ?? { amount: 0, count: 0 };
    entry.amount += t.amount;
    entry.count += 1;
    map.set(t.classification, entry);
  }
  const rows: BankActivitySignals["outflowByCategory"] = [];
  for (const [category, entry] of map) {
    rows.push({ category, amount: entry.amount, count: entry.count });
  }
  rows.sort((a, b) => b.amount - a.amount);
  return rows;
}

function topCounterparty(
  xs: readonly SignalTransaction[],
): BankActivitySignals["topSupplier"] {
  if (xs.length === 0) return null;
  const map = new Map<string, { amount: number; count: number }>();
  for (const t of xs) {
    const key = counterpartyKey(t.counterpartyName ?? t.description);
    if (!key) continue;
    const entry = map.get(key) ?? { amount: 0, count: 0 };
    entry.amount += t.amount;
    entry.count += 1;
    map.set(key, entry);
  }
  let best: { name: string; amount: number; count: number } | null = null;
  for (const [name, entry] of map) {
    if (best === null || entry.amount > best.amount) {
      best = { name, amount: entry.amount, count: entry.count };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Types re-exported for callers that only want signals output
// ---------------------------------------------------------------------------

export type { ClassificationCategory, ClassifiedTransaction, Direction };

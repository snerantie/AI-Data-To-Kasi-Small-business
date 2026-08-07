import { describe, expect, it } from "vitest";

import { classifyTransactions } from "./classify";
import { detectRecurring, RECURRING_PARAMS_FOR_TESTS } from "./recurring";
import { computeBankSignals } from "./signals";
import type { ClassifiedTransaction, Direction, RawTransaction } from "./types";

/**
 * Fixtures + helpers. Tests build a small realistic batch of
 * transactions and assert the aggregator produces sensible numbers.
 */

const NOW = new Date("2026-08-15T12:00:00Z").getTime();
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d: number) => NOW - d * MS_PER_DAY;

function mkRaw(
  desc: string,
  direction: Direction,
  amount: number,
  daysBack: number,
  counterparty: string | null = null,
): RawTransaction {
  return {
    occurredAt: daysAgo(daysBack),
    direction,
    amount,
    description: desc,
    counterpartyName: counterparty,
    reference: null,
    parserMeta: { parser: "test" },
  };
}

// Helper: run the full pipeline (classify → detectRecurring) so the
// signals tests match how the code actually behaves in production.
function pipeline(raws: RawTransaction[]): ClassifiedTransaction[] {
  return detectRecurring(classifyTransactions(raws));
}

// ---------------------------------------------------------------------------
// Recurrence detection
// ---------------------------------------------------------------------------

describe("recurring: cadence detection", () => {
  it("flags two monthly-cadence payments to the same counterparty as recurring", () => {
    const raws = [
      mkRaw("EFT-OLD MUTUAL INSUR", "out", 800, 60),
      mkRaw("EFT-OLD MUTUAL INSUR", "out", 800, 30),
    ];
    const result = pipeline(raws);
    expect(result[0].isRecurring).toBe(true);
    expect(result[1].isRecurring).toBe(true);
  });

  it("does not flag two payments closer than the minimum gap", () => {
    // Two payments 10 days apart — not a monthly pattern.
    const raws = [
      mkRaw("EFT-OLD MUTUAL", "out", 800, 20),
      mkRaw("EFT-OLD MUTUAL", "out", 800, 10),
    ];
    const result = pipeline(raws);
    expect(result[0].isRecurring).toBe(false);
    expect(result[1].isRecurring).toBe(false);
  });

  it("tolerates amounts within the configured tolerance", () => {
    // 800 → 850 = 6.25% diff, inside 10% tolerance.
    const raws = [
      mkRaw("EFT-SANLAM POLICY", "out", 800, 60),
      mkRaw("EFT-SANLAM POLICY", "out", 850, 30),
    ];
    const result = pipeline(raws);
    expect(result[0].isRecurring).toBe(true);
  });

  it("rejects amounts outside the tolerance", () => {
    // 800 → 1200 = 50% diff, way outside 10% tolerance.
    const raws = [
      mkRaw("EFT-SANLAM POLICY", "out", 800, 60),
      mkRaw("EFT-SANLAM POLICY", "out", 1200, 30),
    ];
    const result = pipeline(raws);
    expect(result[0].isRecurring).toBe(false);
  });

  it("never manufactures classification changes via recurrence alone", () => {
    // Two similar-amount recurring inflows from an unknown counterparty.
    // Per the module contract, isRecurring flips to true but the
    // classification MUST stay 'unknown'. Recurrence is a signal on
    // its own, not permission to fabricate a category.
    const raws = [
      mkRaw("EFT-S DLAMINI", "in", 500, 60),
      mkRaw("EFT-S DLAMINI", "in", 500, 30),
    ];
    const result = pipeline(raws);
    expect(result[0].isRecurring).toBe(true);
    expect(result[0].classification).toBe("unknown");
    expect(result[1].classification).toBe("unknown");
  });

  it("boosts confidence of already-classified salary_like when recurring", () => {
    // Both rows match the "SALARY" description rule with 0.6
    // confidence. Detecting a monthly cadence bumps that to ≥0.85.
    const raws = [
      mkRaw("SALARY MEGA CORP", "in", 15000, 60),
      mkRaw("SALARY MEGA CORP", "in", 15000, 30),
    ];
    const result = pipeline(raws);
    expect(result[0].classification).toBe("salary_like");
    expect(result[0].classificationConfidence).toBeGreaterThanOrEqual(0.85);
  });
});

describe("recurring: own-transfer pairing", () => {
  it("pairs two opposite-direction own-transfer legs at the same time", () => {
    const t = daysAgo(3);
    // Build raws with identical times so both legs land in the
    // pair window.
    const raws: RawTransaction[] = [
      { ...mkRaw("IB TRANSFER TO SAVINGS", "out", 1000, 3), occurredAt: t },
      { ...mkRaw("IB TRANSFER FROM CHEQUE", "in", 1000, 3), occurredAt: t + 1000 },
    ];
    const result = pipeline(raws);
    expect(result[0].classification).toBe("own_transfer");
    expect(result[1].classification).toBe("own_transfer");
    // parserMeta should contain the pair link for at least one side.
    const hasLink = result.some(
      (r) => "own_transfer_pair_index" in r.parserMeta,
    );
    expect(hasLink).toBe(true);
  });

  it("does not pair own-transfers that are more than 5 minutes apart", () => {
    const t = daysAgo(3);
    const raws: RawTransaction[] = [
      { ...mkRaw("IB TRANSFER TO SAVINGS", "out", 1000, 3), occurredAt: t },
      // 10 minutes later — outside window.
      { ...mkRaw("IB TRANSFER FROM CHEQUE", "in", 1000, 3), occurredAt: t + 10 * 60 * 1000 },
    ];
    const result = pipeline(raws);
    const hasLink = result.some(
      (r) => "own_transfer_pair_index" in r.parserMeta,
    );
    expect(hasLink).toBe(false);
  });
});

describe("recurring: tunable parameters", () => {
  it("exports tunables at the values documented in the module header", () => {
    expect(RECURRING_PARAMS_FOR_TESTS.AMOUNT_TOLERANCE).toBe(0.1);
    expect(RECURRING_PARAMS_FOR_TESTS.MIN_GAP_DAYS).toBe(24);
    expect(RECURRING_PARAMS_FOR_TESTS.MAX_GAP_DAYS).toBe(45);
    expect(RECURRING_PARAMS_FOR_TESTS.OWN_TRANSFER_PAIR_WINDOW_MS).toBe(
      5 * 60 * 1000,
    );
  });
});

// ---------------------------------------------------------------------------
// Signals
// ---------------------------------------------------------------------------

describe("computeBankSignals: window filtering", () => {
  it("ignores transactions outside the 30-day window by default", () => {
    const raws = [
      // Old — should be excluded.
      mkRaw("BOXER CASH", "out", 500, 45),
      // Fresh — included.
      mkRaw("BOXER CASH", "out", 500, 5),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.transactionCount).toBe(1);
    expect(s.outflowsTotal).toBe(500);
  });

  it("honours a custom window", () => {
    const raws = [
      mkRaw("BOXER CASH", "out", 500, 90),
      mkRaw("BOXER CASH", "out", 500, 45),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW, windowDays: 60 });
    expect(s.transactionCount).toBe(1); // Only the 45-day-old row.
  });
});

describe("computeBankSignals: aggregates", () => {
  it("sums inflows and outflows correctly", () => {
    const raws = [
      mkRaw("SALARY MEGA CORP", "in", 15000, 15),
      mkRaw("BOXER CASH CARRY", "out", 5000, 10),
      mkRaw("MTN AIRTIME", "out", 100, 5),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.inflowsTotal).toBe(15000);
    expect(s.outflowsTotal).toBe(5100);
    expect(s.netFlow).toBe(15000 - 5100);
  });

  it("excludes own-transfer legs from ALL aggregates", () => {
    // Own transfers aren't real economic activity. Including them
    // would double-count everything.
    const t = daysAgo(3);
    const raws: RawTransaction[] = [
      { ...mkRaw("IB TRANSFER TO SAVINGS", "out", 2000, 3), occurredAt: t },
      { ...mkRaw("IB TRANSFER FROM CHEQUE", "in", 2000, 3), occurredAt: t + 1000 },
      mkRaw("BOXER CASH", "out", 500, 2),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.outflowsTotal).toBe(500); // BOXER only — own-transfer excluded
    expect(s.inflowsTotal).toBe(0);
    // But the raw transaction count from the parser is still 3.
    expect(s.transactionCount).toBe(3);
  });
});

describe("computeBankSignals: counterparty diversity", () => {
  it("counts distinct counterparties", () => {
    const raws = [
      mkRaw("EFT-N MKHIZE", "in", 200, 20),
      mkRaw("EFT-S DLAMINI", "in", 300, 15),
      mkRaw("EFT-B TSHABANGU", "in", 250, 10),
      // Repeat of the first one — not counted again.
      mkRaw("EFT-N MKHIZE", "in", 200, 5),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.inflowCounterpartyDiversity).toBe(3);
  });

  it("gives high concentration on a single-payer inflow pattern", () => {
    // Same 'customer' every time — very high concentration ratio.
    const raws = [
      mkRaw("EFT-N MKHIZE", "in", 1000, 20),
      mkRaw("EFT-N MKHIZE", "in", 1000, 10),
      mkRaw("EFT-N MKHIZE", "in", 1000, 5),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.concentrationRatio).toBe(1.0);
  });

  it("gives moderate concentration on a diverse pattern", () => {
    const raws = [
      mkRaw("EFT-N MKHIZE", "in", 100, 20),
      mkRaw("EFT-S DLAMINI", "in", 100, 15),
      mkRaw("EFT-B TSHABANGU", "in", 100, 10),
      mkRaw("EFT-M NAIDOO", "in", 100, 5),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    // 4 equal payers → concentration = 1/4 = 0.25.
    expect(s.concentrationRatio).toBeCloseTo(0.25, 2);
  });
});

describe("computeBankSignals: cash-deposit ratio", () => {
  it("returns null when there are no inflows (not zero)", () => {
    const raws = [mkRaw("BOXER CASH", "out", 500, 10)];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.cashDepositRatio).toBeNull();
  });

  it("returns 0 when there are inflows but no cash deposits", () => {
    const raws = [mkRaw("SALARY MEGA CORP", "in", 15000, 10)];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.cashDepositRatio).toBe(0);
  });

  it("computes the ratio correctly when there are cash deposits", () => {
    const raws = [
      mkRaw("SALARY MEGA CORP", "in", 8000, 15),
      mkRaw("CASH DEPOSIT ATM", "in", 2000, 10),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.cashDepositRatio).toBeCloseTo(0.2, 3);
  });
});

describe("computeBankSignals: top supplier", () => {
  it("finds the biggest supplier-like counterparty by amount", () => {
    const raws = [
      mkRaw("EFT-BOXER CASH", "out", 2000, 15),
      mkRaw("EFT-MAKRO WOODMEAD", "out", 5000, 10),
      mkRaw("EFT-BOXER CASH", "out", 1500, 5),
      mkRaw("MTN AIRTIME", "out", 100, 3),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.topSupplier).not.toBeNull();
    expect(s.topSupplier!.amount).toBe(5000);
    // Counterparty key is upper-cased, whitespace-collapsed.
    expect(s.topSupplier!.name).toContain("MAKRO");
  });

  it("returns null when there is no supplier-like activity", () => {
    const raws = [
      mkRaw("MTN AIRTIME", "out", 100, 3),
      mkRaw("MONTHLY ACCOUNT FEE", "out", 65, 1),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.topSupplier).toBeNull();
  });
});

describe("computeBankSignals: outflow by category", () => {
  it("rolls up categories and sorts descending by amount", () => {
    const raws = [
      mkRaw("EFT-BOXER CASH", "out", 2000, 15),
      mkRaw("EFT-MAKRO WOODMEAD", "out", 5000, 10),
      mkRaw("MTN AIRTIME", "out", 100, 3),
      mkRaw("MONTHLY ACCOUNT FEE", "out", 65, 1),
    ];
    const txs = pipeline(raws);
    const s = computeBankSignals(txs, { now: NOW });
    expect(s.outflowByCategory[0].category).toBe("supplier_like");
    expect(s.outflowByCategory[0].amount).toBe(7000);
    expect(s.outflowByCategory[0].count).toBe(2);
    // Airtime + bank fee sit at the tail.
    const cats = s.outflowByCategory.map((r) => r.category);
    expect(cats).toContain("airtime");
    expect(cats).toContain("bank_fee");
  });
});

describe("computeBankSignals: recurring counts", () => {
  it("counts recurring transactions and recurring inflows separately", () => {
    const raws = [
      // Recurring salary inflows (monthly)
      mkRaw("SALARY MEGA CORP", "in", 15000, 60),
      mkRaw("SALARY MEGA CORP", "in", 15000, 30),
      // Recurring rent outflows
      mkRaw("EFT-LANDLORD RENT", "out", 4000, 60),
      mkRaw("EFT-LANDLORD RENT", "out", 4000, 30),
      // Non-recurring one-off
      mkRaw("MTN AIRTIME", "out", 50, 10),
    ];
    const txs = pipeline(raws);
    // Use a 90-day window so all recurring pairs are captured.
    const s = computeBankSignals(txs, { now: NOW, windowDays: 90 });
    expect(s.recurringCount).toBe(4);
    expect(s.recurringInflowCount).toBe(2);
  });
});

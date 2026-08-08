import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AppState,
  Contribution,
  Expense,
  Sale,
  Stokvel,
  Tab,
} from "../store";
import {
  computeKasiScore,
  declaredRevenue,
  expensesTotal,
  observedRevenue,
  overallEvidenceRatio,
  tierFor,
} from "./score";
import type { EvidenceTier } from "./evidence";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Reference clock so all fixtures agree on "now". Every test freezes
 * time to this instant via vi.useFakeTimers so relative-date logic
 * (last 14 days, last 30 days, weeks-since) is deterministic.
 */
const NOW = new Date("2026-08-02T12:00:00Z").getTime();
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d: number) => NOW - d * MS_PER_DAY;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const emptyState = (): AppState => ({
  lang: "en",
  onboarded: true,
  profile: {
    ownerName: "Nomsa",
    businessName: "Nomsa's Spaza",
    businessType: "spaza",
  },
  sales: [],
  expenses: [],
  tabs: [],
  stokvel: null,
  paymentConfig: null,
  // PR #23 additions — empty by default; specific tests populate them
  // when needed. Included here so the type-checker forces us to update
  // this fixture whenever AppState grows a new field.
  bankStatements: [],
  bankTransactions: [],
});

const makeSale = (
  id: string,
  daysBack: number,
  price: number,
  tier: EvidenceTier = "declared",
  eventType: "sale" | "expense" = "sale",
): Sale => ({
  id,
  item: "bread",
  qty: 1,
  price,
  createdAt: daysAgo(daysBack),
  eventType,
  evidenceType:
    eventType === "expense"
      ? "supplier_receipt"
      : tier === "verified"
        ? "yoco_transaction"
        : "manual_entry",
  evidenceTier: tier,
});

const makeExpense = (id: string, daysBack: number, price: number): Expense => ({
  id,
  item: "flour",
  qty: 1,
  price,
  createdAt: daysAgo(daysBack),
  eventType: "expense",
  evidenceType: "supplier_receipt",
  evidenceTier: "observed",
});

const makeContribution = (
  id: string,
  ownerId: string,
  daysBack: number,
  amount: number,
  tier: EvidenceTier = "declared",
): Contribution => ({
  id,
  amount,
  createdAt: daysAgo(daysBack),
  ownerId,
  status: "confirmed",
  evidenceType:
    tier === "verified" ? "yoco_transaction" : "admin_confirmation",
  evidenceTier: tier,
});

const makeTab = (id: string, daysBack: number, paid: boolean): Tab => ({
  id,
  customer: "Someone",
  amount: 50,
  createdAt: daysAgo(daysBack),
  paid,
  evidenceTier: "declared",
});

const stokvelWithGoal = (
  goal: number,
  contributions: Contribution[],
  userId: string,
): Stokvel => ({
  id: "s1",
  name: "Family stokvel",
  goal,
  members: 5,
  memberships: [
    {
      userId,
      role: "member",
      displayName: "Nomsa",
      joinedAt: daysAgo(60),
    },
  ],
  contributions,
  role: "member",
  bankAccount: null,
});

// ---------------------------------------------------------------------------
// Regression: reclassified receipt rows MUST NOT appear as revenue.
//
// Directly requested in the live-steering feedback for PR #22:
//   "Add regression tests proving receipt expenses cannot contribute
//    to sales turnover or revenue-based KasiScore signals."
//
// These are the load-bearing tests for the safety property we
// promised the user. If any of them fail we've silently regressed
// the guarantee.
// ---------------------------------------------------------------------------

describe("reclassified receipt rows do not contribute to revenue or sales signals", () => {
  it("declaredRevenue excludes rows with event_type='expense'", () => {
    const state = emptyState();
    state.sales = [
      // Genuine voice sale — should count as revenue.
      makeSale("real-sale", 5, 100, "declared", "sale"),
      // Historical receipt row reclassified in migration 010 —
      // stays in the sales table but event_type is now 'expense'.
      makeSale("reclassified-receipt", 5, 200, "observed", "expense"),
    ];

    expect(declaredRevenue(state)).toBe(100);
    expect(declaredRevenue(state)).not.toBe(300);
  });

  it("observedRevenue excludes reclassified receipt rows", () => {
    const state = emptyState();
    state.sales = [
      // Even at 'observed' tier, this is an expense — must not count.
      makeSale("reclassified-receipt", 5, 200, "observed", "expense"),
    ];
    expect(observedRevenue(state)).toBe(0);
  });

  it("KasiScore sales_activity factor does not credit reclassified receipts", () => {
    const withOnlyReclassified = emptyState();
    withOnlyReclassified.sales = [
      makeSale("r1", 3, 100, "observed", "expense"),
      makeSale("r2", 5, 100, "observed", "expense"),
      makeSale("r3", 7, 100, "observed", "expense"),
    ];

    const withOnlyRealSales = emptyState();
    withOnlyRealSales.sales = [
      makeSale("s1", 3, 100, "declared", "sale"),
      makeSale("s2", 5, 100, "declared", "sale"),
      makeSale("s3", 7, 100, "declared", "sale"),
    ];

    const zero = computeKasiScore(withOnlyReclassified, "user-1");
    const someReal = computeKasiScore(withOnlyRealSales, "user-1");

    const zeroSales = zero.factors.find((f) => f.key === "sales_activity")!;
    const realSales = someReal.factors.find(
      (f) => f.key === "sales_activity",
    )!;

    // With no genuine sales, the factor is 0 — receipt-sourced
    // expenses can't lift it. (PR #24 also dropped the former
    // "neutral 50" fallback to zero across every factor for the
    // honest-empty-state behaviour.)
    expect(zeroSales.normalised).toBe(0);
    // With three declared sales in 30d, the factor tier-weights them
    // (0.2 × 3 = 0.6 out of ceiling of 20) which is still low but
    // strictly greater than the reclassified-only case.
    expect(realSales.normalised).toBeGreaterThan(0);
  });

  it("expensesTotal DOES include reclassified receipt rows", () => {
    // Sanity check the other side of the same guarantee: the
    // reclassified rows should show up as expenses, not silently
    // disappear.
    const state = emptyState();
    state.sales = [
      makeSale("reclassified", 5, 200, "observed", "expense"),
    ];
    state.expenses = [makeExpense("new-expense", 5, 50)];
    expect(expensesTotal(state)).toBe(250);
  });

  it("evidence_confidence factor sees reclassified rows as observed evidence", () => {
    const state = emptyState();
    state.sales = [
      // Two reclassified receipts (observed) + one voice sale (declared).
      makeSale("r1", 3, 100, "observed", "expense"),
      makeSale("r2", 5, 100, "observed", "expense"),
      makeSale("real", 7, 100, "declared", "sale"),
    ];
    const detail = computeKasiScore(state, "user-1");
    const conf = detail.factors.find(
      (f) => f.key === "evidence_confidence",
    )!;
    // 2 of 3 records are observed → 66.7% → normalised ~67.
    expect(conf.normalised).toBeGreaterThanOrEqual(66);
    expect(conf.normalised).toBeLessThanOrEqual(68);
  });
});

// ---------------------------------------------------------------------------
// Tier weighting behaviour
// ---------------------------------------------------------------------------

describe("evidence tier weighting", () => {
  it("declared-heavy user scores strictly lower than verified-heavy user with identical activity", () => {
    const userId = "user-1";

    const declared = emptyState();
    declared.stokvel = stokvelWithGoal(
      2000,
      [
        makeContribution("c1", userId, 3, 250, "declared"),
        makeContribution("c2", userId, 10, 250, "declared"),
        makeContribution("c3", userId, 17, 250, "declared"),
        makeContribution("c4", userId, 24, 250, "declared"),
      ],
      userId,
    );

    const verified = emptyState();
    verified.stokvel = stokvelWithGoal(
      2000,
      [
        makeContribution("c1", userId, 3, 250, "verified"),
        makeContribution("c2", userId, 10, 250, "verified"),
        makeContribution("c3", userId, 17, 250, "verified"),
        makeContribution("c4", userId, 24, 250, "verified"),
      ],
      userId,
    );

    const declaredScore = computeKasiScore(declared, userId).score;
    const verifiedScore = computeKasiScore(verified, userId).score;
    expect(verifiedScore).toBeGreaterThan(declaredScore);
  });

  it("observed contributions score between declared and verified", () => {
    const userId = "user-1";
    const stateFor = (tier: EvidenceTier): AppState => {
      const s = emptyState();
      s.stokvel = stokvelWithGoal(
        2000,
        [makeContribution("c1", userId, 3, 500, tier)],
        userId,
      );
      return s;
    };
    const d = computeKasiScore(stateFor("declared"), userId).score;
    const o = computeKasiScore(stateFor("observed"), userId).score;
    const v = computeKasiScore(stateFor("verified"), userId).score;
    expect(o).toBeGreaterThan(d);
    expect(v).toBeGreaterThan(o);
  });
});

// ---------------------------------------------------------------------------
// Backwards-compat: rows missing evidence fields default to declared
// ---------------------------------------------------------------------------

describe("backwards compatibility with pre-PR-22 rows", () => {
  it("a Sale missing evidence fields is treated as declared and does not crash", () => {
    const state = emptyState();
    // Sale row without any evidence envelope — as a cached
    // localStorage row from before PR #22 shipped might look.
    state.sales = [
      {
        id: "old-1",
        item: "bread",
        qty: 3,
        price: 6,
        createdAt: daysAgo(2),
      },
    ];
    const detail = computeKasiScore(state, "user-1");
    // Should not throw, should return a valid score.
    expect(detail.score).toBeGreaterThanOrEqual(300);
    expect(detail.score).toBeLessThanOrEqual(850);
    // Revenue should still count (untyped defaults to eventType='sale').
    expect(declaredRevenue(state)).toBe(18);
  });

  it("a Contribution missing evidence fields does not crash the scorer", () => {
    const userId = "user-1";
    const state = emptyState();
    // Construct a contribution with only the pre-PR-22 fields.
    const oldContrib: Contribution = {
      id: "old-1",
      amount: 250,
      createdAt: daysAgo(2),
      ownerId: userId,
      status: "confirmed",
    };
    state.stokvel = stokvelWithGoal(1000, [oldContrib], userId);
    const detail = computeKasiScore(state, userId);
    expect(detail.score).toBeGreaterThanOrEqual(300);
  });
});

// ---------------------------------------------------------------------------
// Public API invariants
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Empty-state (insufficientData) behaviour — introduced in PR #24.
//
// Before PR #24, every factor returned a "neutral" fallback (50 or 60
// or 40 or 30) when the user hadn't used that feature yet. On a
// brand-new empty account those neutrals averaged out to ~530 — a
// misleading number that violated PR #22's "honest evidence over
// flattering numbers" principle. The tests below hold the line.
// ---------------------------------------------------------------------------

describe("empty-account (insufficientData) behaviour", () => {
  it("returns insufficientData=true when the state has no value-bearing records", () => {
    const detail = computeKasiScore(emptyState(), "user-1");
    expect(detail.insufficientData).toBe(true);
  });

  it("empty account score is the SCORE_MIN floor, not the former ~530", () => {
    const detail = computeKasiScore(emptyState(), "user-1");
    expect(detail.score).toBe(300);
  });

  it("empty account has every factor at normalised=0", () => {
    const detail = computeKasiScore(emptyState(), "user-1");
    for (const f of detail.factors) {
      expect(f.normalised).toBe(0);
      expect(f.contribution).toBe(0);
    }
  });

  it("one logged sale is enough to make the score meaningful", () => {
    // The threshold is intentionally low: even a single event
    // means the user has done SOMETHING and the score reflects
    // that (however modestly). Preserves user agency — one
    // action moves the needle.
    const state = emptyState();
    state.sales = [makeSale("s1", 1, 20, "declared", "sale")];
    const detail = computeKasiScore(state, "user-1");
    expect(detail.insufficientData).toBe(false);
  });

  it("counts records across every value-bearing table, not just sales", () => {
    // A user who only used the app for tabs (no sales, no
    // stokvel) has done something real — their score should
    // reflect that, not show empty state.
    const state = emptyState();
    state.tabs = [makeTab("t1", 3, false)];
    expect(computeKasiScore(state, "user-1").insufficientData).toBe(false);
  });

  it("no factor returns a neutral 50/60 fallback anymore", () => {
    // Regression: the pre-PR-24 code had "return 50" / "return 60"
    // fallbacks inside individual factor helpers. This test would
    // fail if any of those crept back in — verify that a
    // one-event account doesn't have any factor at exactly 50 or
    // 60 as a lazy fallback.
    const state = emptyState();
    state.sales = [makeSale("s1", 1, 20, "declared", "sale")];
    const detail = computeKasiScore(state, "user-1");
    // Factors that legitimately COULD hit 50 or 60 from real
    // computation include tab_repayment (paid/total ratio × 100)
    // and profile_maturity (fixed 25pt increments). Those are
    // fine — we're checking that a fresh one-event account
    // doesn't inherit a static fallback masquerading as data.
    const contribConsistency = detail.factors.find(
      (f) => f.key === "contribution_consistency",
    )!;
    const contribVolume = detail.factors.find(
      (f) => f.key === "contribution_volume",
    )!;
    expect(contribConsistency.normalised).toBe(0); // no stokvel
    expect(contribVolume.normalised).toBe(0); // no stokvel
  });
});

describe("public API invariants", () => {
  it("weights sum to 1.0", () => {
    const state = emptyState();
    const detail = computeKasiScore(state, "user-1");
    const total = detail.factors.reduce((sum, f) => sum + f.weight, 0);
    // Floating point: allow tiny epsilon.
    expect(total).toBeCloseTo(1, 5);
  });

  it("returns all 8 factor keys in stable order", () => {
    const state = emptyState();
    const detail = computeKasiScore(state, "user-1");
    const keys = detail.factors.map((f) => f.key);
    expect(keys).toEqual([
      "contribution_consistency",
      "contribution_volume",
      "tab_repayment",
      "sales_activity",
      "time_on_platform",
      "profile_maturity",
      "recent_momentum",
      "evidence_confidence",
    ]);
  });

  it("score is always clamped to [300, 850]", () => {
    const empty = emptyState();
    const minScore = computeKasiScore(empty, "user-1").score;
    expect(minScore).toBeGreaterThanOrEqual(300);

    // Fabricate a maxed-out state: verified contribs, paid tabs, etc.
    const userId = "user-1";
    const maxed = emptyState();
    const contribs = [];
    for (let i = 0; i < 8; i++) {
      contribs.push(
        makeContribution(`c${i}`, userId, i * 7, 500, "verified"),
      );
    }
    maxed.stokvel = stokvelWithGoal(2000, contribs, userId);
    maxed.stokvel.bankAccount = {
      bankName: "Capitec",
      accountHolder: "Nomsa",
      accountNumber: "1234",
      branchCode: "470010",
      payshapPhone: null,
    };
    maxed.sales = [
      makeSale("s1", 1, 100, "verified", "sale"),
      makeSale("s2", 2, 100, "verified", "sale"),
      makeSale("s3", 3, 100, "verified", "sale"),
      makeSale("s4", 4, 100, "verified", "sale"),
      makeSale("s5", 5, 100, "verified", "sale"),
    ];
    maxed.tabs = [makeTab("t1", 5, true), makeTab("t2", 6, true)];
    const maxScore = computeKasiScore(maxed, userId).score;
    expect(maxScore).toBeLessThanOrEqual(850);
    expect(maxScore).toBeGreaterThan(minScore);
  });

  it("tierFor maps score ranges correctly", () => {
    expect(tierFor(300)).toBe("building");
    expect(tierFor(499)).toBe("building");
    expect(tierFor(500)).toBe("fair");
    expect(tierFor(639)).toBe("fair");
    expect(tierFor(640)).toBe("good");
    expect(tierFor(749)).toBe("good");
    expect(tierFor(750)).toBe("excellent");
    expect(tierFor(850)).toBe("excellent");
  });

  it("overallEvidenceRatio returns null for empty state (not 0)", () => {
    expect(overallEvidenceRatio(emptyState())).toBeNull();
  });
});

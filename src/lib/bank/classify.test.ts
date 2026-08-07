import { describe, expect, it } from "vitest";

import {
  classifyTransaction,
  classifyTransactions,
  ruleCountForTests,
  ruleNamesForTests,
} from "./classify";
import type {
  ClassificationCategory,
  Direction,
  RawTransaction,
} from "./types";
import { INFLOW_CATEGORIES, OUTFLOW_CATEGORIES } from "./types";

/**
 * Fixtures + helpers. Every test builds its RawTransaction via
 * `mk()` so we don't sprinkle boilerplate.
 */

const NOW = new Date("2026-08-15T12:00:00Z").getTime();

function mk(
  description: string,
  direction: Direction,
  amount: number,
  opts: Partial<Omit<RawTransaction, "description" | "direction" | "amount">> = {},
): RawTransaction {
  return {
    occurredAt: opts.occurredAt ?? NOW,
    direction,
    amount,
    description,
    counterpartyName: opts.counterpartyName ?? null,
    reference: opts.reference ?? null,
    parserMeta: opts.parserMeta ?? { parser: "test" },
  };
}

// ---------------------------------------------------------------------------
// The load-bearing invariant — cannot be over-emphasised
// ---------------------------------------------------------------------------

describe("safety invariant: bank inflows never become sales", () => {
  it("never emits a classification outside the allowed union", () => {
    // Enumerate every value in ClassificationCategory. If someone
    // adds a member in future (including, accidentally, 'customer_sale')
    // this list needs updating — and if they add it, at least one of
    // the OTHER tests below will still catch specific inflow-as-sale
    // regressions.
    const ALLOWED: ReadonlySet<ClassificationCategory> = new Set<ClassificationCategory>([
      "unknown",
      "own_transfer",
      "cash_deposit",
      "cash_withdrawal",
      "bank_fee",
      "airtime",
      "utility",
      "rent_or_subscription",
      "supplier_like",
      "salary_like",
      "stokvel_related",
      "loan_repayment",
      "refund",
    ]);

    const suspiciousInflows = [
      "R5000",
      "S. Dlamini",
      "PAYMENT RECEIVED",
      "N. Mkhize R1500",
      "IPFOOD",
      "TSHIRO PAYMENT",
      "CUSTOMER PAID",
      "CASH PAYMENT",
      "FROM BUSINESS",
      "SPAZA REVENUE",
    ];
    for (const desc of suspiciousInflows) {
      const result = classifyTransaction(mk(desc, "in", 5000));
      expect(ALLOWED.has(result.classification)).toBe(true);
      // A plain, unmarked inflow from a person is by design unknown.
      // If any of the strings above ever match a rule, be conservative
      // about which — they should NEVER match salary/refund/utility/etc.
      // If a rule genuinely fires, replace this assertion with a
      // documented mapping. Do NOT loosen it.
      if (
        result.classification !== "unknown" &&
        result.classification !== "stokvel_related"
      ) {
        // Force test to fail loudly with detail so a future maintainer
        // understands what changed.
        throw new Error(
          `Unexpected inflow classification for "${desc}": ${result.classification} (${result.classificationConfidence})`,
        );
      }
    }
  });

  it("no rule can produce an outflow-only category on an inflow", () => {
    // Iterate a wide range of inflow strings + confirm the returned
    // category is never in OUTFLOW_CATEGORIES.
    const inflowStrings = [
      "SALARY XYZ CORP",
      "REFUND OF PURCHASE",
      "STOKVEL PAYOUT",
      "CASH DEPOSIT",
      "PAYMENT FROM MOM",
      "M PESA IN",
      "IB TRANSFER FROM SAVINGS",
    ];
    for (const s of inflowStrings) {
      const r = classifyTransaction(mk(s, "in", 500));
      expect(OUTFLOW_CATEGORIES.includes(r.classification)).toBe(false);
    }
  });

  it("no rule can produce an inflow-only category on an outflow", () => {
    const outflowStrings = [
      "BOXER CASH CARRY",
      "ESKOM PREPAID",
      "MTN AIRTIME",
      "MONTHLY FEE",
      "OWN ACCT TRANSFER",
      "CASH WITHDRAWAL",
    ];
    for (const s of outflowStrings) {
      const r = classifyTransaction(mk(s, "out", 500));
      expect(INFLOW_CATEGORIES.includes(r.classification)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// The "no manufactured business meaning" case from the steering doc
// ---------------------------------------------------------------------------

describe("no manufactured business meaning", () => {
  it("does not turn an unadorned inflow from a named person into a sale", () => {
    // Directly from the user's PR #23 brief: `R5,000 — S. Dlamini`
    // should stay unknown/observed, not become "customer sale".
    const r = classifyTransaction(mk("EFT-S. DLAMINI R5000", "in", 5000));
    expect(r.classification).toBe("unknown");
    expect(r.classificationConfidence).toBe(0);
  });

  it("does not classify a plain unlabelled inflow as anything specific", () => {
    const r = classifyTransaction(mk("PAYMENT RECEIVED", "in", 1000));
    expect(r.classification).toBe("unknown");
  });

  it("still tags obvious salary-like descriptions but at LOW confidence", () => {
    // The single-transaction classifier tags this as salary_like on
    // description alone, but only at 0.6 — the recurrence detector
    // is the real signal.
    const r = classifyTransaction(mk("SAL DEP MEGA CORP", "in", 12000));
    expect(r.classification).toBe("salary_like");
    expect(r.classificationConfidence).toBeLessThanOrEqual(0.7);
  });
});

// ---------------------------------------------------------------------------
// Per-category positive matches
// ---------------------------------------------------------------------------

describe("own_transfer", () => {
  it("matches IB TRANSFER", () => {
    const r = classifyTransaction(mk("IB TRANSFER TO SAVINGS", "out", 1000));
    expect(r.classification).toBe("own_transfer");
    expect(r.classificationConfidence).toBeGreaterThan(0.8);
  });

  it("matches OWN ACCT", () => {
    const r = classifyTransaction(mk("TFR TO OWN ACCT", "out", 500));
    expect(r.classification).toBe("own_transfer");
  });

  it("wins even when description also contains a merchant name", () => {
    // Priority order: own_transfer rules come first, so this stays
    // labelled as an own-transfer and doesn't get misread as supplier
    // activity.
    const r = classifyTransaction(
      mk("IB TRANSFER — BOXER SAVINGS", "out", 1000),
    );
    expect(r.classification).toBe("own_transfer");
  });
});

describe("cash_deposit + cash_withdrawal", () => {
  it("matches ATM cash deposit", () => {
    const r = classifyTransaction(mk("CASH DEPOSIT ATM 123", "in", 500));
    expect(r.classification).toBe("cash_deposit");
  });

  it("matches ATM withdrawal", () => {
    const r = classifyTransaction(mk("ATM WITHDRAWAL VOSLOORUS", "out", 200));
    expect(r.classification).toBe("cash_withdrawal");
  });

  it("matches CASH SEND both directions", () => {
    expect(
      classifyTransaction(mk("CASH SEND RECEIVED", "in", 200)).classification,
    ).toBe("cash_deposit");
    expect(
      classifyTransaction(mk("CASH SEND SENT NOMSA", "out", 200)).classification,
    ).toBe("cash_withdrawal");
  });
});

describe("bank_fee", () => {
  it("matches monthly fee", () => {
    const r = classifyTransaction(mk("MONTHLY ACCOUNT FEE", "out", 65));
    expect(r.classification).toBe("bank_fee");
  });

  it("matches SMS alert", () => {
    const r = classifyTransaction(mk("SMS ALERT CHARGE", "out", 1.5));
    expect(r.classification).toBe("bank_fee");
  });

  it("does not match on inflow direction", () => {
    // "MONTHLY FEE" is direction=out per its rule; on an inflow it
    // should stay unknown rather than get force-matched.
    const r = classifyTransaction(mk("MONTHLY FEE REFUND", "in", 65));
    // The refund rule fires here (REFUND word), which is fine — it's
    // NOT bank_fee.
    expect(r.classification).not.toBe("bank_fee");
  });
});

describe("airtime", () => {
  it("matches Vodacom prepaid airtime", () => {
    const r = classifyTransaction(mk("VODACOM PREPAID AIRTIME", "out", 30));
    expect(r.classification).toBe("airtime");
  });

  it("matches MTN prepaid data", () => {
    const r = classifyTransaction(mk("MTN PREPAID DATA 2GB", "out", 99));
    expect(r.classification).toBe("airtime");
  });
});

describe("utility", () => {
  it("matches Eskom", () => {
    const r = classifyTransaction(mk("PP ELEC ESKOM 12KWH", "out", 150));
    expect(r.classification).toBe("utility");
  });

  it("matches municipal rates", () => {
    const r = classifyTransaction(
      mk("CITY OF JOHANNESBURG RATES", "out", 500),
    );
    expect(r.classification).toBe("utility");
  });
});

describe("supplier_like", () => {
  it("matches Boxer", () => {
    const r = classifyTransaction(mk("EFT-BOXER CASH CARRY", "out", 2500));
    expect(r.classification).toBe("supplier_like");
  });

  it("matches Makro", () => {
    const r = classifyTransaction(mk("MAKRO WOODMEAD", "out", 5000));
    expect(r.classification).toBe("supplier_like");
  });

  it("matches Elite Cash & Carry", () => {
    const r = classifyTransaction(mk("ELITE CASH AND CARRY", "out", 1200));
    expect(r.classification).toBe("supplier_like");
  });

  it("does NOT match on inflow direction", () => {
    // Even if "BOXER" appears in an inflow description, the rule is
    // direction-restricted to outflows so we don't accidentally
    // classify a refund from a supplier as a supplier expense.
    const r = classifyTransaction(mk("BOXER REFUND", "in", 100));
    expect(r.classification).not.toBe("supplier_like");
    expect(r.classification).toBe("refund");
  });
});

describe("loan_repayment", () => {
  it("matches Capfin", () => {
    const r = classifyTransaction(mk("CAPFIN LOAN INSTALMENT", "out", 500));
    expect(r.classification).toBe("loan_repayment");
  });

  it("matches Bayport", () => {
    const r = classifyTransaction(mk("BAYPORT DEBIT ORDER", "out", 1200));
    expect(r.classification).toBe("loan_repayment");
  });
});

describe("stokvel_related", () => {
  it("matches literal STOKVEL keyword either direction", () => {
    expect(
      classifyTransaction(mk("STOKVEL CONTRIBUTION", "out", 250)).classification,
    ).toBe("stokvel_related");
    expect(
      classifyTransaction(mk("STOKVEL PAYOUT DECEMBER", "in", 3000)).classification,
    ).toBe("stokvel_related");
  });
});

describe("refund", () => {
  it("matches REFUND on inflow", () => {
    const r = classifyTransaction(mk("REFUND OF PURCHASE", "in", 200));
    expect(r.classification).toBe("refund");
  });

  it("does NOT match REFUND word on outflow", () => {
    // "REFUND" outbound = you're paying a refund. That's rare but
    // the rule shouldn't fire; the transaction stays unknown.
    const r = classifyTransaction(mk("REFUND ISSUED", "out", 200));
    expect(r.classification).not.toBe("refund");
  });
});

describe("salary_like (weak, description-only)", () => {
  it("matches SALARY on inflow", () => {
    const r = classifyTransaction(mk("SALARY MEGA CORP", "in", 15000));
    expect(r.classification).toBe("salary_like");
  });

  it("does not match SALARY on outflow (paying someone else's salary)", () => {
    const r = classifyTransaction(mk("SALARY PAYMENT TO STAFF", "out", 15000));
    expect(r.classification).not.toBe("salary_like");
  });
});

describe("rent_or_subscription", () => {
  it("matches literal RENT", () => {
    const r = classifyTransaction(mk("RENT PAYMENT LANDLORD", "out", 4000));
    expect(r.classification).toBe("rent_or_subscription");
  });

  it("matches insurance debit orders", () => {
    const r = classifyTransaction(mk("OLD MUTUAL INSUR", "out", 800));
    expect(r.classification).toBe("rent_or_subscription");
  });

  it("matches Netflix / DSTV / streaming", () => {
    expect(
      classifyTransaction(mk("NETFLIX MONTHLY", "out", 99)).classification,
    ).toBe("rent_or_subscription");
    expect(
      classifyTransaction(mk("DSTV MULTICHOICE", "out", 899)).classification,
    ).toBe("rent_or_subscription");
  });
});

// ---------------------------------------------------------------------------
// Fallback + batch behaviours
// ---------------------------------------------------------------------------

describe("fallback behaviour", () => {
  it("truly novel descriptions stay unknown", () => {
    const r = classifyTransaction(mk("ZZQ42 XPTO GLARP", "out", 42));
    expect(r.classification).toBe("unknown");
  });

  it("empty description stays unknown", () => {
    const r = classifyTransaction(mk("", "out", 42));
    expect(r.classification).toBe("unknown");
  });

  it("classification source is always 'rules' from this module", () => {
    const r = classifyTransaction(mk("MTN AIRTIME", "out", 50));
    expect(r.classificationSource).toBe("rules");
  });

  it("isRecurring is always false coming out of the classifier", () => {
    // The recurrence detector sets this flag later. If the single-
    // transaction classifier ever sets it, the second pass gets
    // confused about which rows to promote.
    const r = classifyTransaction(mk("MTN AIRTIME", "out", 50));
    expect(r.isRecurring).toBe(false);
  });

  it("does not mutate the input transaction", () => {
    const input = mk("MTN AIRTIME", "out", 50);
    const snapshot = JSON.parse(JSON.stringify(input));
    classifyTransaction(input);
    expect(input).toEqual(snapshot);
  });
});

describe("classifyTransactions (batch)", () => {
  it("preserves input order + count", () => {
    const inputs = [
      mk("BOXER CASH", "out", 500),
      mk("SALARY MEGA CORP", "in", 15000),
      mk("UNKNOWN FROM SOMEONE", "in", 400),
      mk("ATM WITHDRAWAL", "out", 200),
    ];
    const result = classifyTransactions(inputs);
    expect(result).toHaveLength(inputs.length);
    for (let i = 0; i < inputs.length; i++) {
      expect(result[i].description).toBe(inputs[i].description);
      expect(result[i].amount).toBe(inputs[i].amount);
    }
  });

  it("mixed batch: unknowns coexist with confident classifications", () => {
    const [supplier, unknown] = classifyTransactions([
      mk("BOXER CASH", "out", 500),
      mk("PAYMENT FROM X", "in", 500),
    ]);
    expect(supplier.classification).toBe("supplier_like");
    expect(unknown.classification).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// Rule library sanity
// ---------------------------------------------------------------------------

describe("rule library sanity", () => {
  it("rule count is > 0", () => {
    expect(ruleCountForTests()).toBeGreaterThan(0);
  });

  it("all rule names are unique", () => {
    const names = ruleNamesForTests();
    expect(new Set(names).size).toBe(names.length);
  });
});

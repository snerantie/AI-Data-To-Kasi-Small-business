import { describe, expect, it } from "vitest";

import {
  classifyLegacyContribution,
  classifyLegacySale,
  classifyLegacyTab,
  confidenceFromRatio,
  observedOrBetterRatio,
  TIER_RANK,
  TIER_WEIGHT,
  weightedSum,
} from "./evidence";

/**
 * These tests double as the executable spec for the SQL backfill in
 * migration 010. If the SQL and the TypeScript classifier ever
 * diverge, at least one of these assertions should fail — treat that
 * as a red flag, not a "just tweak the test" moment.
 */

describe("classifyLegacySale", () => {
  it("voice-sourced rows stay as sales at declared tier", () => {
    const env = classifyLegacySale("voice");
    expect(env.eventType).toBe("sale");
    expect(env.evidenceType).toBe("voice_log");
    expect(env.evidenceTier).toBe("declared");
    expect(env.provenance).toEqual({ legacy_source: "voice" });
  });

  it("manual-sourced rows stay as sales at declared tier", () => {
    const env = classifyLegacySale("manual");
    expect(env.eventType).toBe("sale");
    expect(env.evidenceType).toBe("manual_entry");
    expect(env.evidenceTier).toBe("declared");
  });

  it("receipt-sourced rows are reclassified as expenses at observed tier", () => {
    // This is the core PR #22 acceptance criterion #4:
    // "Receipt OCR creates expense records → observed; it must not
    //  create fake sales." The classifier enforces it for both new
    // rows and any historical rows the migration touches.
    const env = classifyLegacySale("receipt");
    expect(env.eventType).toBe("expense");
    expect(env.eventType).not.toBe("sale");
    expect(env.evidenceType).toBe("supplier_receipt");
    expect(env.evidenceTier).toBe("observed");
    expect(env.provenance.reclassified_from).toBe("sales_v1_receipt");
  });

  it("null or undefined source falls back to manual/declared", () => {
    expect(classifyLegacySale(null).evidenceTier).toBe("declared");
    expect(classifyLegacySale(undefined).evidenceType).toBe("manual_entry");
    expect(classifyLegacySale(undefined).eventType).toBe("sale");
  });
});

describe("classifyLegacyContribution", () => {
  it("Yoco method → verified tier", () => {
    const env = classifyLegacyContribution({ method: "yoco", status: "confirmed" });
    expect(env.evidenceTier).toBe("verified");
    expect(env.evidenceType).toBe("yoco_transaction");
  });

  it("payment_id set (even without method=yoco) → verified tier", () => {
    // Old rows before migration 007 set method='manual' by default;
    // the presence of payment_id is the surer indicator that a Yoco
    // webhook wrote the row.
    const env = classifyLegacyContribution({
      method: "manual",
      status: "confirmed",
      payment_id: "abc123",
    });
    expect(env.evidenceTier).toBe("verified");
  });

  it("admin-confirmed non-Yoco EFT → observed tier", () => {
    const env = classifyLegacyContribution({
      method: "eft",
      status: "confirmed",
    });
    expect(env.evidenceTier).toBe("observed");
    expect(env.evidenceType).toBe("admin_confirmation");
  });

  it("pending contribution → declared tier", () => {
    const env = classifyLegacyContribution({
      method: "eft",
      status: "pending",
    });
    expect(env.evidenceTier).toBe("declared");
    expect(env.evidenceType).toBe("manual_entry");
  });

  it("rejected contribution → declared tier (never gains trust)", () => {
    // Rejected rows shouldn't ever score at observed+; even if the
    // admin later un-rejects them we'd re-classify at that point.
    const env = classifyLegacyContribution({
      method: "cash",
      status: "rejected",
    });
    expect(env.evidenceTier).toBe("declared");
  });

  it("missing status defaults to declared, not confirmed", () => {
    // Pre-migration-007 rows didn't have a status column; classifier
    // must not silently promote them. This is the security-critical
    // default.
    const env = classifyLegacyContribution({ method: "eft" });
    expect(env.evidenceTier).toBe("declared");
  });

  it("case-insensitive method/status", () => {
    const env = classifyLegacyContribution({
      method: "Yoco",
      status: "CONFIRMED",
    });
    expect(env.evidenceTier).toBe("verified");
  });
});

describe("classifyLegacyTab", () => {
  it("unpaid tab → tab_created event, declared tier", () => {
    const env = classifyLegacyTab({ paid: false });
    expect(env.eventType).toBe("tab_created");
    expect(env.evidenceTier).toBe("declared");
  });

  it("paid tab → tab_settled event, still declared tier", () => {
    // Peer-attested (customer says they paid) is not treated as
    // observed. See the friends-and-family conversation in the PR:
    // customer confirmations are too gameable to count as
    // independent evidence.
    const env = classifyLegacyTab({ paid: true });
    expect(env.eventType).toBe("tab_settled");
    expect(env.evidenceTier).toBe("declared");
  });

  it("null/undefined paid defaults to tab_created", () => {
    expect(classifyLegacyTab({}).eventType).toBe("tab_created");
    expect(classifyLegacyTab({ paid: null }).eventType).toBe("tab_created");
  });
});

describe("aggregate helpers", () => {
  it("observedOrBetterRatio returns null when empty (not zero)", () => {
    expect(observedOrBetterRatio([])).toBeNull();
  });

  it("observedOrBetterRatio counts observed + verified", () => {
    const records = [
      { evidenceTier: "declared" as const },
      { evidenceTier: "declared" as const },
      { evidenceTier: "observed" as const },
      { evidenceTier: "verified" as const },
    ];
    expect(observedOrBetterRatio(records)).toBe(0.5);
  });

  it("observedOrBetterRatio treats missing tier as declared", () => {
    // Backwards-compat: rows written before PR #22 don't carry a
    // tier. They should NOT default to observed.
    const records = [{ evidenceTier: undefined }, { evidenceTier: undefined }];
    expect(observedOrBetterRatio(records)).toBe(0);
  });

  it("confidenceFromRatio maps to labels", () => {
    expect(confidenceFromRatio(null)).toBe("unknown");
    expect(confidenceFromRatio(0)).toBe("low");
    expect(confidenceFromRatio(0.1)).toBe("low");
    expect(confidenceFromRatio(0.2)).toBe("medium");
    expect(confidenceFromRatio(0.49)).toBe("medium");
    expect(confidenceFromRatio(0.5)).toBe("high");
    expect(confidenceFromRatio(1)).toBe("high");
  });

  it("weightedSum applies TIER_WEIGHT correctly", () => {
    const records = [
      { evidenceTier: "declared" as const, amount: 100 }, // × 0.2 = 20
      { evidenceTier: "observed" as const, amount: 100 }, // × 0.7 = 70
      { evidenceTier: "verified" as const, amount: 100 }, // × 1.0 = 100
    ];
    expect(weightedSum(records, (r) => r.amount)).toBeCloseTo(190);
  });

  it("weightedSum treats missing tier as declared", () => {
    const records = [{ amount: 100 } as { evidenceTier?: undefined; amount: number }];
    expect(weightedSum(records, (r) => r.amount)).toBeCloseTo(20);
  });
});

describe("tier constants sanity", () => {
  it("declared < observed < verified in both weight and rank", () => {
    expect(TIER_WEIGHT.declared).toBeLessThan(TIER_WEIGHT.observed);
    expect(TIER_WEIGHT.observed).toBeLessThan(TIER_WEIGHT.verified);
    expect(TIER_RANK.declared).toBeLessThan(TIER_RANK.observed);
    expect(TIER_RANK.observed).toBeLessThan(TIER_RANK.verified);
  });
});

import type { AppState, Contribution, Expense, Sale, Tab } from "../store";
import {
  observedOrBetterRatio,
  TIER_RANK,
  TIER_WEIGHT,
  weightedSum,
  type EvidenceTier,
} from "./evidence";

/**
 * KasiScore v3 — evidence-tier-aware creditworthiness (introduced in PR #22).
 *
 * The v2 scorer treated a self-reported cash sale the same as a
 * bank-verified Yoco payment: a row in a table, worth the same weight.
 * That collapsed a richer question — "how independently can we
 * corroborate this business's claims?" — into a naive answer.
 *
 * v3 fixes this by weighting every value-bearing signal by the
 * `evidenceTier` on each record:
 *
 *   declared × 0.2   (self-report only)
 *   observed × 0.7   (real digital artefact, single-party)
 *   verified × 1.0   (independent third-party confirmation)
 *
 * A voice-logged R100 sale still contributes to the score, but ~5×
 * less than a Yoco-webhook R100 contribution. The user does not
 * lose visibility of their raw activity — the Insights screen and
 * the Financial Passport surface *both* declared and observed
 * numbers separately.
 *
 * ─────────────────────────────────────────────────────────────────
 * Weights are heuristic Phase-1 defaults
 * ─────────────────────────────────────────────────────────────────
 *
 * The specific per-factor weights (WEIGHTS below) and the tier
 * multipliers (TIER_WEIGHT in evidence.ts) are best-guess starting
 * points. They are NOT product commitments and MUST be replaced with
 * data-driven values once KasiKash has observed enough repayment
 * outcomes to correlate signals against actual credit performance.
 *
 * Do not treat these numbers as load-bearing. See the // TODO at the
 * top of WEIGHTS for the exact bar for revisiting them.
 *
 * Public API is unchanged from v2 — the ScoreDetail / ScoreFactor
 * shapes still fit callers in Insights + PassportPreview + passport.ts
 * without modification. Two new fields are appended to ScoreFactor:
 * `evidenceMix` and `tierWeightApplied`, both optional and ignored by
 * pre-PR-22 callers.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type ScoreTier = "building" | "fair" | "good" | "excellent";

export type ScoreFactorKey =
  | "contribution_consistency"
  | "contribution_volume"
  | "time_on_platform"
  | "sales_activity"
  | "tab_repayment"
  | "profile_maturity"
  | "recent_momentum"
  // New in PR #22 — a small standalone reward for having independently
  // verifiable data at all. Not a huge weight; deliberately kept
  // separate from any individual signal so it can move independently
  // as the app gets richer sources (bank statements, receipts).
  | "evidence_confidence";

/**
 * Distribution of a factor's underlying records across evidence tiers.
 * Fractions sum to 1. Passport + Insights render this as a small
 * stacked bar so a user (or lender) sees at a glance how much of the
 * factor is self-report vs. observed vs. verified.
 *
 * When a factor doesn't correspond to value-bearing records (e.g.
 * profile_maturity, time_on_platform) this is null.
 */
export type EvidenceMix = {
  declared: number;
  observed: number;
  verified: number;
} | null;

export type ScoreFactor = {
  key: ScoreFactorKey;
  weight: number; // Fraction of the overall score
  normalised: number; // 0–100
  contribution: number; // Points contributed to the 300–850 range
  rawValue: number; // Raw underlying count (for display)
  evidenceMix: EvidenceMix;
  // Effective tier multiplier applied to the factor's raw value, if
  // any. 1.0 for non-value-bearing factors (profile_maturity etc.).
  // Callers use this to explain why a factor's contribution differs
  // from the naive raw-value ratio.
  tierWeightApplied: number;
};

export type ScoreDetail = {
  score: number;
  tier: ScoreTier;
  factors: ScoreFactor[];
  computedAt: number;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SCORE_MIN = 300;
const SCORE_MAX = 850;
const SCORE_SPAN = SCORE_MAX - SCORE_MIN;

/**
 * TODO(post-pilot): replace with data-driven weights.
 *
 * These are Phase-1 heuristics. They embody two directional bets:
 *   1. Consistency + repayment discipline beat raw volume.
 *   2. A small standalone "do we have evidence at all?" signal keeps
 *      users who move to Yoco / receipt scans from being penalised
 *      relative to bigger cash-only users.
 *
 * They are NOT calibrated against actual default outcomes because we
 * don't have any yet. Once >= ~100 KasiKash-facilitated loans have
 * resolved (repaid or defaulted), rerun the correlation and replace
 * these numbers with what the data actually says.
 *
 * Weights must sum to 1.0. The unit test in score.test.ts asserts
 * this so you can't accidentally break it.
 */
const WEIGHTS: Record<ScoreFactorKey, number> = {
  contribution_consistency: 0.2,
  contribution_volume: 0.15,
  tab_repayment: 0.15,
  sales_activity: 0.1,
  time_on_platform: 0.08,
  profile_maturity: 0.1,
  recent_momentum: 0.12,
  evidence_confidence: 0.1,
};

const TIER_THRESHOLDS: Array<{ min: number; tier: ScoreTier }> = [
  { min: 750, tier: "excellent" },
  { min: 640, tier: "good" },
  { min: 500, tier: "fair" },
  { min: 300, tier: "building" },
];

// ---------------------------------------------------------------------------
// Helper metric computations
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

const daysAgo = (days: number) => Date.now() - days * MS_PER_DAY;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/**
 * Compute an EvidenceMix from a set of records. Returns null when
 * empty so the caller can render "no data" rather than a misleading
 * all-declared bar.
 */
function evidenceMixFrom(
  records: readonly { evidenceTier?: EvidenceTier }[],
): EvidenceMix {
  if (records.length === 0) return null;
  const counts = { declared: 0, observed: 0, verified: 0 };
  for (const r of records) {
    const tier = r.evidenceTier ?? "declared";
    counts[tier]++;
  }
  const total = records.length;
  return {
    declared: counts.declared / total,
    observed: counts.observed / total,
    verified: counts.verified / total,
  };
}

/**
 * Effective tier multiplier for a set of records: the average of the
 * per-record TIER_WEIGHT lookup. Callers pass this back on the
 * ScoreFactor so the passport can explain "your R14,800 sales weighed
 * as R3,000 for the score because it's all declared."
 */
function averageTierWeight(
  records: readonly { evidenceTier?: EvidenceTier }[],
): number {
  if (records.length === 0) return 1;
  let sum = 0;
  for (const r of records) {
    sum += TIER_WEIGHT[r.evidenceTier ?? "declared"];
  }
  return sum / records.length;
}

/**
 * Only rows that represent actual sales — i.e. event_type='sale' or
 * legacy rows we didn't reclassify. Historical receipt-sourced rows
 * that were reclassified by migration 010 have event_type='expense'
 * and are excluded here (they show up in expensesFrom instead).
 */
function salesOnly(sales: readonly Sale[]): Sale[] {
  return sales.filter((s) => (s.eventType ?? "sale") === "sale");
}

/**
 * Every expense-flavoured record the app knows about:
 *   * rows in the sales table that got reclassified as expenses
 *     (event_type='expense' in migration 010)
 *   * rows in the new expenses table (any row there is an expense
 *     by definition, but we filter defensively anyway)
 */
function expensesFrom(state: AppState): Array<Sale | Expense> {
  const reclassified = state.sales.filter(
    (s) => s.eventType === "expense",
  );
  const native = state.expenses.filter(
    (e) => (e.eventType ?? "expense") === "expense",
  );
  return [...reclassified, ...native];
}

function firstActivityMs(state: AppState): number {
  let earliest = Number.POSITIVE_INFINITY;
  for (const s of state.sales) {
    if (s.createdAt < earliest) earliest = s.createdAt;
  }
  for (const e of state.expenses) {
    if (e.createdAt < earliest) earliest = e.createdAt;
  }
  const stk = state.stokvel;
  if (stk) {
    for (const c of stk.contributions) {
      if ((c.status ?? "confirmed") !== "confirmed") continue;
      if (c.createdAt < earliest) earliest = c.createdAt;
    }
  }
  return Number.isFinite(earliest) ? earliest : Date.now();
}

// ---------------------------------------------------------------------------
// Individual factor scorers
// Each returns { normalised, rawValue, evidenceMix, tierWeightApplied }.
// ---------------------------------------------------------------------------

type FactorResult = {
  normalised: number;
  rawValue: number;
  evidenceMix: EvidenceMix;
  tierWeightApplied: number;
};

/**
 * Weeks in the last 8 that contained at least one contribution
 * (any status) from the user. Tier doesn't gate the count here —
 * consistency is a behavioural signal, not a money signal — but
 * we do surface the mix so the passport can show it.
 */
function contributionConsistency(
  state: AppState,
  userId: string | null,
): FactorResult {
  const stk = state.stokvel;
  if (!stk || !userId) {
    return {
      normalised: 50,
      rawValue: 0,
      evidenceMix: null,
      tierWeightApplied: 1,
    };
  }

  const mine = stk.contributions.filter((c) => c.ownerId === userId);
  const weeksBack = 8;
  const hits = new Set<number>();
  for (const c of mine) {
    if ((c.status ?? "confirmed") !== "confirmed") continue;
    const weeksSince = Math.floor((Date.now() - c.createdAt) / MS_PER_WEEK);
    if (weeksSince >= 0 && weeksSince < weeksBack) hits.add(weeksSince);
  }
  const normalised = (hits.size / weeksBack) * 100;
  return {
    normalised: clamp(normalised, 0, 100),
    rawValue: hits.size,
    evidenceMix: evidenceMixFrom(mine),
    tierWeightApplied: 1,
  };
}

/**
 * Weighted contribution volume. This is where tier weighting hits
 * hardest: a stokvel with all Yoco contributions can hit 100% at the
 * goal; one with pure self-report needs a very low goal or a lot of
 * over-payment to reach the same normalised score.
 */
function contributionVolume(
  state: AppState,
  userId: string | null,
): FactorResult {
  const stk = state.stokvel;
  if (!stk || !userId || !stk.goal || stk.goal <= 0) {
    return {
      normalised: 50,
      rawValue: 0,
      evidenceMix: null,
      tierWeightApplied: 1,
    };
  }
  const mine = stk.contributions.filter(
    (c) => c.ownerId === userId && (c.status ?? "confirmed") === "confirmed",
  );
  const rawTotal = mine.reduce((s, c) => s + c.amount, 0);
  const weightedTotal = weightedSum(mine, (c: Contribution) => c.amount);

  // Cap at 1.5× the goal so a wildly-over-contributor doesn't
  // dominate.
  const ratio = clamp(weightedTotal / stk.goal, 0, 1.5);
  const normalised = Math.min(100, (ratio / 1.5) * 100);

  return {
    normalised,
    rawValue: Math.round(rawTotal),
    evidenceMix: evidenceMixFrom(mine),
    tierWeightApplied: mine.length ? weightedTotal / (rawTotal || 1) : 1,
  };
}

/**
 * Ratio of paid tabs to total tabs. Tab settlements are all Declared
 * (customer confirmations are peer-attested, per the friends-and-
 * family concern) but the factor still contributes to the score
 * because *consistency* of settling — a behavioural signal — is real
 * regardless of what medium the money moved on.
 */
function tabRepayment(state: AppState): FactorResult {
  const tabs = state.tabs;
  if (tabs.length === 0) {
    return {
      normalised: 60,
      rawValue: 0,
      evidenceMix: null,
      tierWeightApplied: 1,
    };
  }
  const paid = tabs.filter((t: Tab) => t.paid).length;
  const ratio = paid / tabs.length;
  return {
    normalised: ratio * 100,
    rawValue: paid,
    evidenceMix: evidenceMixFrom(tabs),
    tierWeightApplied: 1,
  };
}

/**
 * Recent sales activity (last 30 days), tier-weighted. 20 verified
 * sales in a month hits the ceiling; 20 declared sales gets 20% of
 * that credit (tier weight 0.2).
 *
 * IMPORTANT: this filters by event_type='sale' — the reclassified
 * receipt-sourced expenses do NOT show up here. They contribute to
 * evidence_confidence + the expenses-only passport section instead.
 */
function salesActivity(state: AppState): FactorResult {
  const trueSales = salesOnly(state.sales);
  if (trueSales.length === 0) {
    return {
      normalised: 50,
      rawValue: 0,
      evidenceMix: null,
      tierWeightApplied: 1,
    };
  }
  const cutoff = daysAgo(30);
  const recent = trueSales.filter((s) => s.createdAt >= cutoff);
  const rawCount = recent.length;
  const weightedCount = weightedSum(recent, () => 1);
  const normalised = clamp((weightedCount / 20) * 100, 0, 100);
  return {
    normalised,
    rawValue: rawCount,
    evidenceMix: evidenceMixFrom(recent),
    tierWeightApplied: rawCount ? weightedCount / rawCount : 1,
  };
}

/**
 * Time-on-platform. Not tier-weighted (age isn't per-record).
 */
function timeOnPlatform(state: AppState): FactorResult {
  const days = Math.floor((Date.now() - firstActivityMs(state)) / MS_PER_DAY);
  const normalised = clamp((days / 180) * 100, 0, 100);
  return {
    normalised,
    rawValue: days,
    evidenceMix: null,
    tierWeightApplied: 1,
  };
}

/**
 * Profile completeness. Not tier-weighted.
 */
function profileMaturity(
  state: AppState,
  userId: string | null,
): FactorResult {
  let score = 0;
  let flags = 0;
  if (state.profile.ownerName && state.profile.ownerName.length > 0) {
    score += 25;
    flags++;
  }
  const hasBusiness = Boolean(
    state.profile.businessName && state.profile.businessName.length > 0,
  );
  const inStokvel = Boolean(state.stokvel);
  if (hasBusiness || inStokvel) {
    score += 25;
    flags++;
  }
  const stk = state.stokvel;
  if (stk?.bankAccount && stk.bankAccount.accountNumber) {
    score += 25;
    flags++;
  }
  if (userId && stk) {
    const hasConfirmed = stk.contributions.some(
      (c) => c.ownerId === userId && (c.status ?? "confirmed") === "confirmed",
    );
    if (hasConfirmed) {
      score += 25;
      flags++;
    }
  }
  return {
    normalised: score,
    rawValue: flags,
    evidenceMix: null,
    tierWeightApplied: 1,
  };
}

/**
 * Momentum in the last 14 days. Tier-weighted on both sides.
 */
function recentMomentum(
  state: AppState,
  userId: string | null,
): FactorResult {
  const cutoff = daysAgo(14);
  const recentSales = salesOnly(state.sales).filter(
    (s) => s.createdAt >= cutoff,
  );
  const stk = state.stokvel;
  const recentContribs: Contribution[] = [];
  if (stk && userId) {
    for (const c of stk.contributions) {
      if ((c.status ?? "confirmed") !== "confirmed") continue;
      if (c.ownerId !== userId) continue;
      if (c.createdAt >= cutoff) recentContribs.push(c);
    }
  }

  // Both sides get weighted by tier. 5 verified sales OR 2 verified
  // contributions in 14 days = full marks.
  const weightedSales = weightedSum(recentSales, () => 1);
  const weightedContribs = weightedSum(recentContribs, () => 1);
  const salesScore = clamp((weightedSales / 5) * 100, 0, 100);
  const contribScore = clamp((weightedContribs / 2) * 100, 0, 100);
  const combined = Math.max(salesScore, contribScore, 30); // 30 floor

  const combinedRecords = [...recentSales, ...recentContribs];

  return {
    normalised: combined,
    rawValue: recentSales.length + recentContribs.length,
    evidenceMix: evidenceMixFrom(combinedRecords),
    tierWeightApplied: combinedRecords.length
      ? averageTierWeight(combinedRecords)
      : 1,
  };
}

/**
 * NEW in PR #22. Standalone reward for having independently-verifiable
 * evidence at all. Looks at every value-bearing record the user has —
 * sales, expenses, contributions, tabs — and asks: what fraction is
 * observed-or-better tier?
 *
 * A user with 100 self-reported cash sales scores 0 here. A user with
 * even a handful of Yoco payments + a few scanned receipts starts
 * moving up. Provides a way for cash-heavy users to visibly grow
 * their score without needing to abandon cash entirely.
 */
function evidenceConfidence(state: AppState): FactorResult {
  const stk = state.stokvel;
  const allRecords: Array<{ evidenceTier?: EvidenceTier }> = [
    ...state.sales,
    ...state.expenses,
    ...state.tabs,
    ...(stk?.contributions ?? []),
  ];
  const ratio = observedOrBetterRatio(allRecords);
  if (ratio === null) {
    return {
      normalised: 40, // slight below-neutral: no data, no reward
      rawValue: 0,
      evidenceMix: null,
      tierWeightApplied: 1,
    };
  }
  return {
    normalised: clamp(ratio * 100, 0, 100),
    rawValue: allRecords.length,
    evidenceMix: evidenceMixFrom(allRecords),
    tierWeightApplied: 1,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function tierFor(score: number): ScoreTier {
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.min) return t.tier;
  }
  return "building";
}

/**
 * Compute the current KasiScore + factor breakdown for a given
 * `AppState` snapshot. Deterministic given fixed `Date.now()`, which
 * is why the tests in score.test.ts stub the clock.
 */
export function computeKasiScore(
  state: AppState,
  userId: string | null,
): ScoreDetail {
  const rawFactors: Array<{ key: ScoreFactorKey } & FactorResult> = [
    { key: "contribution_consistency", ...contributionConsistency(state, userId) },
    { key: "contribution_volume", ...contributionVolume(state, userId) },
    { key: "tab_repayment", ...tabRepayment(state) },
    { key: "sales_activity", ...salesActivity(state) },
    { key: "time_on_platform", ...timeOnPlatform(state) },
    { key: "profile_maturity", ...profileMaturity(state, userId) },
    { key: "recent_momentum", ...recentMomentum(state, userId) },
    { key: "evidence_confidence", ...evidenceConfidence(state) },
  ];

  const factors: ScoreFactor[] = rawFactors.map((f) => {
    const weight = WEIGHTS[f.key];
    const contribution = (f.normalised / 100) * weight * SCORE_SPAN;
    return {
      key: f.key,
      weight,
      normalised: Math.round(f.normalised),
      contribution: Math.round(contribution),
      rawValue: Math.round(f.rawValue),
      evidenceMix: f.evidenceMix,
      tierWeightApplied: Number(f.tierWeightApplied.toFixed(3)),
    };
  });

  const totalContribution = factors.reduce((s, f) => s + f.contribution, 0);
  const score = clamp(
    Math.round(SCORE_MIN + totalContribution),
    SCORE_MIN,
    SCORE_MAX,
  );

  return {
    score,
    tier: tierFor(score),
    factors,
    computedAt: Date.now(),
  };
}

// ---------------------------------------------------------------------------
// Aggregate helpers reused by Passport + Insights
// ---------------------------------------------------------------------------

/**
 * Sum of the *declared* rand value of a business's sales over the
 * period (last `days` days by default). This is the honest raw
 * turnover — no tier weighting applied. The passport displays this
 * alongside `observedRevenue` so a viewer sees both.
 */
export function declaredRevenue(state: AppState, days = 30): number {
  const cutoff = daysAgo(days);
  return salesOnly(state.sales)
    .filter((s) => s.createdAt >= cutoff)
    .reduce((sum, s) => sum + s.price * s.qty, 0);
}

/**
 * Sum of only observed-or-verified sale revenue. For a cash-only
 * business this is R0; for a Yoco-heavy business it approaches the
 * declared number.
 */
export function observedRevenue(state: AppState, days = 30): number {
  const cutoff = daysAgo(days);
  return salesOnly(state.sales)
    .filter(
      (s) =>
        s.createdAt >= cutoff &&
        TIER_RANK[s.evidenceTier ?? "declared"] >= TIER_RANK.observed,
    )
    .reduce((sum, s) => sum + s.price * s.qty, 0);
}

/**
 * Total expenses (in rands) over the period, drawn from BOTH the
 * expenses table AND the reclassified receipt-sourced sales rows.
 * Almost all of this will be `observed` tier (supplier receipts).
 */
export function expensesTotal(state: AppState, days = 30): number {
  const cutoff = daysAgo(days);
  return expensesFrom(state)
    .filter((e) => e.createdAt >= cutoff)
    .reduce((sum, e) => sum + e.price * e.qty, 0);
}

/**
 * Overall evidence-confidence ratio — the same signal the
 * `evidence_confidence` factor uses, exposed as a top-level helper so
 * the Passport can render "Financial activity confidence: Medium"
 * without recomputing.
 */
export function overallEvidenceRatio(state: AppState): number | null {
  const stk = state.stokvel;
  return observedOrBetterRatio([
    ...state.sales,
    ...state.expenses,
    ...state.tabs,
    ...(stk?.contributions ?? []),
  ]);
}

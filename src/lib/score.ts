import type { AppState } from "../store";

/**
 * KasiScore v2 — a transparent, multi-factor credit-worthiness score for
 * users of KasiKash.
 *
 * The old v1 score was a single-line sum: base 460 + sales*6 +
 * paidTabs*25 - unpaid*10 + savings/25. That worked for a demo but told
 * the user nothing about *why* the number moved. v2 replaces it with a
 * factor breakdown that:
 *
 *   1. Uses only real (server-verified where possible) data:
 *      - sales rows from the sales table
 *      - tabs with paid flag
 *      - stokvel contributions filtered to status='confirmed'
 *      - profile completeness
 *
 *   2. Weights each factor and returns per-factor scores + explanations
 *      so the Insights screen can show a bar chart of what's driving
 *      the score, and the PDF passport can reproduce it for lenders.
 *
 *   3. Handles missing-data users gracefully. A stokvel-only user with
 *      no sales still gets a meaningful score — the business-only
 *      factors just fall back to a neutral 50/100 (no penalty for
 *      unavailable data, no reward either).
 *
 * Score range: 300–850, matching the shape of familiar credit scores.
 * Tier bands are picked so an active, honest user reaches "Good" within
 * a few months of consistent use.
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
  | "recent_momentum";

export type ScoreFactor = {
  /** Stable identifier used to look up i18n copy for the factor. */
  key: ScoreFactorKey;
  /**
   * Weight of this factor toward the overall score. Weights sum to 1.
   * Represented as a fraction, not a percentage.
   */
  weight: number;
  /**
   * Factor score normalised to 0–100. Higher is better. A factor that
   * doesn't apply to the user (e.g. sales_activity for someone who
   * only uses KasiKash for a stokvel) returns a neutral 50 rather
   * than 0, so the overall score isn't punished for missing signals.
   */
  normalised: number;
  /**
   * The final points this factor contributes to the 300–850 score
   * range. Sum of every factor's `contribution` equals the score
   * minus the 300 baseline.
   */
  contribution: number;
  /**
   * Raw underlying metric (e.g. "8" for weeks with contributions).
   * Kept for display + PDF; not used in arithmetic elsewhere.
   */
  rawValue: number;
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

/**
 * Bottom of the score range. Anyone with the app installed gets at
 * least this much — matching the "you're on the map" floor of
 * traditional bureaus and giving users a psychologically reasonable
 * starting point.
 */
const SCORE_MIN = 300;
/** Top of the score range. */
const SCORE_MAX = 850;
const SCORE_SPAN = SCORE_MAX - SCORE_MIN;

/**
 * Factor weights. These sum to 1.0. Numbers deliberately favour the
 * two most predictive signals for informal-economy credit-worthiness:
 * consistent contributions (someone who reliably puts money aside
 * every month) and honest tab repayment (someone who honours
 * agreements to pay later). Business activity is meaningful but
 * volatile; profile maturity is a small reward for setting things up
 * properly; time-on-platform is a small tenure bonus.
 */
const WEIGHTS: Record<ScoreFactorKey, number> = {
  contribution_consistency: 0.22,
  contribution_volume: 0.15,
  tab_repayment: 0.18,
  sales_activity: 0.15,
  time_on_platform: 0.1,
  profile_maturity: 0.1,
  recent_momentum: 0.1,
};

/**
 * Tier thresholds. A newly onboarded user with just a profile lands
 * around 400–450 (Building). A user who has been contributing to a
 * stokvel weekly for two months and repaying tabs cleanly should
 * reach ~700 (Good).
 */
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

/** Milliseconds since epoch for "N days ago from now". */
const daysAgo = (days: number) => Date.now() - days * MS_PER_DAY;

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/**
 * Return the earliest observable activity timestamp for a user:
 * either their first sale or their first confirmed stokvel
 * contribution. Falls back to now (i.e. tenure = 0) if neither.
 */
function firstActivityMs(state: AppState): number {
  let earliest = Number.POSITIVE_INFINITY;
  for (const s of state.sales) {
    if (s.createdAt < earliest) earliest = s.createdAt;
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
// Each returns { normalised: 0–100, rawValue: number }
// ---------------------------------------------------------------------------

/**
 * How many of the last 8 weeks contained at least one confirmed
 * contribution from the current user? Rewards habit formation.
 * If the user isn't in a stokvel at all, returns neutral 50.
 */
function contributionConsistency(state: AppState, userId: string | null) {
  const stk = state.stokvel;
  if (!stk || !userId) return { normalised: 50, rawValue: 0 };

  const weeksBack = 8;
  const hits = new Set<number>();
  for (const c of stk.contributions) {
    if ((c.status ?? "confirmed") !== "confirmed") continue;
    if (c.ownerId !== userId) continue;
    const weeksSince = Math.floor((Date.now() - c.createdAt) / MS_PER_WEEK);
    if (weeksSince >= 0 && weeksSince < weeksBack) hits.add(weeksSince);
  }
  const normalised = (hits.size / weeksBack) * 100;
  return { normalised: clamp(normalised, 0, 100), rawValue: hits.size };
}

/**
 * Ratio of the user's confirmed contributions to the stokvel goal.
 * A full-goal contributor gets 100; someone who's contributed nothing
 * gets 0. If there's no goal set (or no stokvel), returns 50 neutral.
 */
function contributionVolume(state: AppState, userId: string | null) {
  const stk = state.stokvel;
  if (!stk || !userId || !stk.goal || stk.goal <= 0) {
    return { normalised: 50, rawValue: 0 };
  }
  let total = 0;
  for (const c of stk.contributions) {
    if ((c.status ?? "confirmed") !== "confirmed") continue;
    if (c.ownerId !== userId) continue;
    total += c.amount;
  }
  // Cap the ratio at 1.5 so someone who paid 150% of the goal doesn't
  // dominate; the marginal reward flattens once they hit the goal.
  const ratio = clamp(total / stk.goal, 0, 1.5);
  const normalised = Math.min(100, (ratio / 1.5) * 100);
  return { normalised, rawValue: total };
}

/**
 * Ratio of paid tabs to total tabs. Users with no tabs get a neutral
 * 60 — "we don't know, so we won't punish you, but we won't hand out
 * free full points either".
 */
function tabRepayment(state: AppState) {
  const tabs = state.tabs;
  if (tabs.length === 0) return { normalised: 60, rawValue: 0 };
  const paid = tabs.filter((t) => t.paid).length;
  const ratio = paid / tabs.length;
  return { normalised: ratio * 100, rawValue: paid };
}

/**
 * Sales in the last 30 days, capped. Someone with 20+ sales per month
 * hits the ceiling; below that scales linearly. No sales history at
 * all → neutral 50 (same logic as tabs).
 */
function salesActivity(state: AppState) {
  if (state.sales.length === 0) return { normalised: 50, rawValue: 0 };
  const cutoff = daysAgo(30);
  const recent = state.sales.filter((s) => s.createdAt >= cutoff).length;
  const normalised = clamp((recent / 20) * 100, 0, 100);
  return { normalised, rawValue: recent };
}

/**
 * Days between the user's first-ever activity and today, capped at
 * 180 days. Rewards a track record without penalising new users too
 * harshly — a fresh signup still starts around 50 for this factor.
 */
function timeOnPlatform(state: AppState) {
  const days = Math.floor((Date.now() - firstActivityMs(state)) / MS_PER_DAY);
  const normalised = clamp((days / 180) * 100, 0, 100);
  return { normalised, rawValue: days };
}

/**
 * Are the "table stakes" filled in? 25 points per completed:
 *   - Owner name
 *   - Business name OR stokvel membership (either is a valid path)
 *   - Bank details on the stokvel (only if user is admin)
 *   - At least one confirmed contribution
 */
function profileMaturity(state: AppState, userId: string | null) {
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
  return { normalised: score, rawValue: flags };
}

/**
 * Boost for users who've been active in the last 14 days. Prevents
 * dormant scores from staying artificially high forever, and rewards
 * active engagement. Combines recent sales + recent contributions.
 */
function recentMomentum(state: AppState, userId: string | null) {
  const cutoff = daysAgo(14);
  const recentSales = state.sales.filter((s) => s.createdAt >= cutoff).length;
  let recentContribs = 0;
  const stk = state.stokvel;
  if (stk && userId) {
    for (const c of stk.contributions) {
      if ((c.status ?? "confirmed") !== "confirmed") continue;
      if (c.ownerId !== userId) continue;
      if (c.createdAt >= cutoff) recentContribs++;
    }
  }
  // 5 sales OR 2 contributions in 14 days = full marks.
  const salesScore = clamp((recentSales / 5) * 100, 0, 100);
  const contribScore = clamp((recentContribs / 2) * 100, 0, 100);
  const combined = Math.max(salesScore, contribScore);
  // Small floor so total-dormancy doesn't zero out this factor
  // entirely — new users still get some baseline here.
  return {
    normalised: Math.max(combined, 30),
    rawValue: recentSales + recentContribs,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute the tier band for a given score.
 * Exported so display code doesn't have to know the thresholds.
 */
export function tierFor(score: number): ScoreTier {
  for (const t of TIER_THRESHOLDS) {
    if (score >= t.min) return t.tier;
  }
  return "building";
}

/**
 * The main entry point. Runs every factor scorer, applies weights,
 * projects onto the 300–850 range, and returns a fully explained
 * breakdown for the caller.
 */
export function computeKasiScore(
  state: AppState,
  userId: string | null,
): ScoreDetail {
  const rawFactors: Array<{
    key: ScoreFactorKey;
    normalised: number;
    rawValue: number;
  }> = [
    { key: "contribution_consistency", ...contributionConsistency(state, userId) },
    { key: "contribution_volume", ...contributionVolume(state, userId) },
    { key: "tab_repayment", ...tabRepayment(state) },
    { key: "sales_activity", ...salesActivity(state) },
    { key: "time_on_platform", ...timeOnPlatform(state) },
    { key: "profile_maturity", ...profileMaturity(state, userId) },
    { key: "recent_momentum", ...recentMomentum(state, userId) },
  ];

  const factors: ScoreFactor[] = rawFactors.map((f) => {
    const weight = WEIGHTS[f.key];
    // Each factor contributes (normalised / 100) × weight × SCORE_SPAN
    // to the range above the SCORE_MIN floor.
    const contribution = (f.normalised / 100) * weight * SCORE_SPAN;
    return {
      key: f.key,
      weight,
      normalised: Math.round(f.normalised),
      contribution: Math.round(contribution),
      rawValue: f.rawValue,
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

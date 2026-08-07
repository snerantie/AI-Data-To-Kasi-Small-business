/**
 * Recurrence + own-transfer pair detection (PR #23).
 *
 * The single-transaction classifier in `classify.ts` can only look
 * at one row at a time. That's enough for merchant-name matches
 * (BOXER, ESKOM, MTN) but not enough for patterns that only become
 * visible across a batch:
 *
 *   * Recurring payments — same counterparty, similar amount,
 *     monthly cadence. Rent, insurance, streaming, salary, and any
 *     debit order look like this. Merely-recurring-ness is a
 *     signal in its own right; the passport shows a count.
 *
 *   * Own-transfer pairs — every self-transfer has two legs. If we
 *     see both, we can pair them so the recurrence detector doesn't
 *     mis-flag the receiving leg as recurring supplier income.
 *
 * This module runs AFTER the classifier. It sets `is_recurring` on
 * matching transactions and, in narrow well-signposted cases, boosts
 * the confidence of an already-classified category.
 *
 * IMPORTANT: this module NEVER changes a classification's *category*.
 * It only refines confidence + sets the recurring flag. Promoting
 * `unknown` to something else based purely on recurrence would risk
 * manufacturing business meaning (e.g. treating a recurring inflow
 * from a family member as a "salary"), which is exactly the
 * behaviour PR #23 is designed to avoid.
 */

import type { ClassifiedTransaction, Direction } from "./types";

// ---------------------------------------------------------------------------
// Tunable parameters
// ---------------------------------------------------------------------------

/**
 * How similar two amounts must be, as a fraction, to count as
 * "the same payment recurring". 0.10 = within 10%. Bigger than typical
 * rent inflation adjustments but tighter than "any similar-magnitude
 * payment", which is where the false-positive risk starts.
 */
const AMOUNT_TOLERANCE = 0.1;

/**
 * Min / max gap between two occurrences to count as a monthly
 * cadence. Real rent + salary payments land 28–33 days apart
 * (calendar month + weekends); pushing the upper bound to 45 days
 * accommodates the "late-payer" case where money arrives a week
 * after the usual date.
 */
const MIN_GAP_DAYS = 24;
const MAX_GAP_DAYS = 45;

/**
 * Own-transfer pair window: two legs of the same self-transfer
 * usually land the same second, but some banks post the debit-side
 * a minute or two before the credit shows up. 5 minutes is safe.
 */
const OWN_TRANSFER_PAIR_WINDOW_MS = 5 * 60 * 1000;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Second-pass classifier: given a batch of already-classified
 * transactions, set `is_recurring` where a monthly cadence exists,
 * and pair own-transfer legs.
 *
 * Returns a NEW array; the input is untouched. Order is preserved.
 *
 * Note: the recurrence detector only ever sets the recurring flag
 * on transactions from the SAME statement batch. Cross-statement
 * recurrence (a Feb rent + a March rent from two separate uploads)
 * is a follow-up: it needs the classifier to read history back from
 * `bank_transactions`, which we haven't wired yet.
 */
export function detectRecurring(
  txs: readonly ClassifiedTransaction[],
): ClassifiedTransaction[] {
  // Group by counterparty key. The key normalises the counterparty
  // name (upper-cased, whitespace collapsed) or falls back to a
  // hash-safe fingerprint of the raw description.
  const buckets = groupByCounterparty(txs);

  const flagged = new Set<number>(); // indexes into txs marked recurring

  for (const [, groupIdxs] of buckets) {
    if (groupIdxs.length < 2) continue;

    // Sort by time so gap-checking works left-to-right.
    const items = groupIdxs
      .map((i) => ({ i, t: txs[i] }))
      .sort((a, b) => a.t.occurredAt - b.t.occurredAt);

    // Walk consecutive pairs; if the gap and amount tolerances hold
    // for ANY consecutive pair, flag both. This is lenient by
    // design — you shouldn't have to see 6 months of rent to call
    // it recurring.
    for (let i = 0; i < items.length - 1; i++) {
      const a = items[i].t;
      const b = items[i + 1].t;
      if (isRecurringPair(a, b)) {
        flagged.add(items[i].i);
        flagged.add(items[i + 1].i);
      }
    }
  }

  // Own-transfer pairing: for every `own_transfer`-classified txn,
  // look for a matching opposite-direction row within the pair
  // window. If found, tag both in parserMeta as `own_transfer_pair`
  // so the UI + score know they're the same underlying money
  // movement.
  const pairMap = pairOwnTransfers(txs);

  return txs.map((t, idx) => {
    const paired = pairMap.get(idx);
    const isRecurring = flagged.has(idx) || t.isRecurring;

    // Confidence boost only in narrow, safe cases. `unknown`
    // categories deliberately do NOT get boosted — see the module
    // header comment.
    let confidence = t.classificationConfidence;
    if (isRecurring) {
      switch (t.classification) {
        case "salary_like":
        case "rent_or_subscription":
        case "loan_repayment":
        case "utility":
          confidence = Math.max(confidence, 0.85);
          break;
        default:
          // No boost for any other category (including unknown).
          break;
      }
    }

    const parserMeta =
      paired !== undefined
        ? {
            ...t.parserMeta,
            own_transfer_pair_index: paired,
          }
        : t.parserMeta;

    return {
      ...t,
      isRecurring,
      classificationConfidence: confidence,
      parserMeta,
    };
  });
}

// ---------------------------------------------------------------------------
// Grouping + pair detection helpers
// ---------------------------------------------------------------------------

/**
 * Bucket transactions by a stable counterparty key. Prefers the
 * parser's extracted counterparty; falls back to the whole
 * description upper-cased and whitespace-collapsed.
 */
function groupByCounterparty(
  txs: readonly ClassifiedTransaction[],
): Map<string, number[]> {
  const buckets = new Map<string, number[]>();
  for (let i = 0; i < txs.length; i++) {
    const t = txs[i];
    const key = counterpartyKey(t.counterpartyName ?? t.description);
    if (!key) continue;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(i);
  }
  return buckets;
}

function counterpartyKey(text: string): string | null {
  const s = text.toUpperCase().replace(/\s+/g, " ").trim();
  if (s.length < 3) return null;
  return s;
}

/**
 * Two transactions form a "recurring pair" when:
 *   * same direction
 *   * amounts within AMOUNT_TOLERANCE of each other
 *   * gap between occurrences is in [MIN_GAP_DAYS, MAX_GAP_DAYS]
 *
 * The gap check is symmetric — we don't care which one is earlier.
 */
function isRecurringPair(
  a: ClassifiedTransaction,
  b: ClassifiedTransaction,
): boolean {
  if (a.direction !== b.direction) return false;

  const avgAmount = (a.amount + b.amount) / 2;
  if (avgAmount === 0) return false;
  const diff = Math.abs(a.amount - b.amount) / avgAmount;
  if (diff > AMOUNT_TOLERANCE) return false;

  const gapDays = Math.abs(a.occurredAt - b.occurredAt) / MS_PER_DAY;
  return gapDays >= MIN_GAP_DAYS && gapDays <= MAX_GAP_DAYS;
}

/**
 * For every transaction already classified as `own_transfer`, try
 * to find its matching opposite-direction leg. Returns a Map from
 * one leg's index → the paired leg's index (present on BOTH sides
 * of the pair for symmetry).
 *
 * Legs match when direction is opposite, amount is equal (to the
 * cent), and occurredAt is within `OWN_TRANSFER_PAIR_WINDOW_MS`.
 */
function pairOwnTransfers(
  txs: readonly ClassifiedTransaction[],
): Map<number, number> {
  const pairs = new Map<number, number>();
  const paired = new Set<number>();

  const ownTransferIdxs = txs
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.classification === "own_transfer");

  for (let i = 0; i < ownTransferIdxs.length; i++) {
    if (paired.has(ownTransferIdxs[i].i)) continue;
    const a = ownTransferIdxs[i].t;
    for (let j = i + 1; j < ownTransferIdxs.length; j++) {
      if (paired.has(ownTransferIdxs[j].i)) continue;
      const b = ownTransferIdxs[j].t;
      if (a.direction === b.direction) continue;
      if (a.amount !== b.amount) continue;
      if (
        Math.abs(a.occurredAt - b.occurredAt) > OWN_TRANSFER_PAIR_WINDOW_MS
      )
        continue;
      pairs.set(ownTransferIdxs[i].i, ownTransferIdxs[j].i);
      pairs.set(ownTransferIdxs[j].i, ownTransferIdxs[i].i);
      paired.add(ownTransferIdxs[i].i);
      paired.add(ownTransferIdxs[j].i);
      break;
    }
  }
  return pairs;
}

// ---------------------------------------------------------------------------
// Test hooks
// ---------------------------------------------------------------------------

export const RECURRING_PARAMS_FOR_TESTS = {
  AMOUNT_TOLERANCE,
  MIN_GAP_DAYS,
  MAX_GAP_DAYS,
  OWN_TRANSFER_PAIR_WINDOW_MS,
} as const;

// Type re-export for downstream modules that don't want to import
// from ./types directly.
export type { ClassifiedTransaction, Direction };

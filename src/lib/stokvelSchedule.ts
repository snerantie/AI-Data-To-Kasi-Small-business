/**
 * PR #51 — pure contribution-schedule + tracking maths for stokvels.
 *
 * Everything here is a pure function of a `Stokvel` plus a `now`
 * timestamp, so it's trivially unit-testable (see
 * `stokvelSchedule.test.ts`) and has zero dependency on the store,
 * React, or the network. The store re-exports thin wrappers and the
 * Stokvel screen imports these directly.
 *
 * Concepts:
 *   - "cycle"       — one calendar month. SA stokvels overwhelmingly
 *                     collect monthly, and a calendar month matches
 *                     the "Paid this month" mental model members
 *                     already have. (Weekly cadence is supported for
 *                     labelling but the money maths still buckets by
 *                     calendar month for the dashboard.)
 *   - contributionDay / payoutDay — day-of-month (1..31), clamped to
 *                     the real last day for short months (e.g. 31 in
 *                     February becomes the 28th/29th).
 *   - "on time"     — a confirmed contribution whose day-of-month is
 *                     on or before the contribution due day. This is
 *                     the honest, explainable heuristic behind the
 *                     green/red group-health indicator.
 */
import type { Contribution, Stokvel, StokvelPayout } from "../store";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Mirror of the store's private `isConfirmed`: a contribution counts
// toward totals only when verified (or grandfathered pre-migration-007
// rows with no status).
const isConfirmed = (c: Contribution) =>
  (c.status ?? "confirmed") === "confirmed";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Clamp a desired day-of-month to a real day in the given month. */
export function clampDayOfMonth(
  year: number,
  monthIndex: number,
  day: number,
): number {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(1, Math.round(day)), lastDay);
}

/** Local-midnight timestamp for the start of the day containing `now`. */
function startOfDay(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * The [start, end) timestamps of the calendar month containing `now`.
 * Used to bucket "paid this month" / "outstanding this month".
 */
export function monthWindow(now: number): { start: number; end: number } {
  const d = new Date(now);
  const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  return { start, end };
}

/**
 * Timestamp of the next occurrence (>= today) of a given day-of-month.
 * If today is already past this month's occurrence, rolls to next
 * month. Clamps to the real last day for short months.
 */
export function nextDateForDay(day: number, now = Date.now()): number {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = d.getMonth();
  const thisMonthDay = clampDayOfMonth(y, m, day);
  if (d.getDate() <= thisMonthDay) {
    return new Date(y, m, thisMonthDay).getTime();
  }
  const ny = m === 11 ? y + 1 : y;
  const nm = m === 11 ? 0 : m + 1;
  return new Date(ny, nm, clampDayOfMonth(ny, nm, day)).getTime();
}

// ---------------------------------------------------------------------------
// Schedule predicates
// ---------------------------------------------------------------------------

/** True when the admin has set an expected amount + a due day. */
export function hasContributionSchedule(stokvel: Stokvel): boolean {
  return Boolean(
    stokvel.monthlyAmount &&
      stokvel.monthlyAmount > 0 &&
      stokvel.contributionDay,
  );
}

/** True when any schedule field at all is configured. */
export function hasAnySchedule(stokvel: Stokvel): boolean {
  return Boolean(
    (stokvel.monthlyAmount && stokvel.monthlyAmount > 0) ||
      stokvel.contributionDay ||
      stokvel.payoutDay,
  );
}

// ---------------------------------------------------------------------------
// Money tracking (per cycle = per calendar month)
// ---------------------------------------------------------------------------

/** Sum of confirmed contributions made in the current calendar month. */
export function paidThisCycle(stokvel: Stokvel, now = Date.now()): number {
  const { start, end } = monthWindow(now);
  return stokvel.contributions
    .filter((c) => isConfirmed(c) && c.createdAt >= start && c.createdAt < end)
    .reduce((a, c) => a + c.amount, 0);
}

/** Sum of ONE member's confirmed contributions this calendar month. */
export function memberPaidThisCycle(
  stokvel: Stokvel,
  userId: string,
  now = Date.now(),
): number {
  const { start, end } = monthWindow(now);
  return stokvel.contributions
    .filter(
      (c) =>
        isConfirmed(c) &&
        c.ownerId === userId &&
        c.createdAt >= start &&
        c.createdAt < end,
    )
    .reduce((a, c) => a + c.amount, 0);
}

/**
 * Expected total for the cycle = per-member amount × live member count.
 * Zero when no monthlyAmount is set (caller should check
 * hasContributionSchedule first for a nicer empty state).
 */
export function expectedThisCycle(stokvel: Stokvel): number {
  const per = stokvel.monthlyAmount ?? 0;
  return per * stokvel.memberships.length;
}

/** Outstanding rand this cycle = max(0, expected − paid). */
export function outstandingThisCycle(
  stokvel: Stokvel,
  now = Date.now(),
): number {
  return Math.max(0, expectedThisCycle(stokvel) - paidThisCycle(stokvel, now));
}

/** How many members have met their full expected amount this cycle. */
export function membersPaidThisCycle(
  stokvel: Stokvel,
  now = Date.now(),
): number {
  const per = stokvel.monthlyAmount ?? 0;
  if (per <= 0) return 0;
  return stokvel.memberships.filter(
    (m) => memberPaidThisCycle(stokvel, m.userId, now) >= per,
  ).length;
}

/** How many members still owe (fully or partially) this cycle. */
export function membersOutstandingThisCycle(
  stokvel: Stokvel,
  now = Date.now(),
): number {
  return Math.max(
    0,
    stokvel.memberships.length - membersPaidThisCycle(stokvel, now),
  );
}

// ---------------------------------------------------------------------------
// Key dates
// ---------------------------------------------------------------------------

/** Next payout date (ms), or null if no payout day configured. */
export function nextPayoutDate(
  stokvel: Stokvel,
  now = Date.now(),
): number | null {
  if (!stokvel.payoutDay) return null;
  return nextDateForDay(stokvel.payoutDay, now);
}

/** Next contribution due date (ms), or null if no due day configured. */
export function nextContributionDate(
  stokvel: Stokvel,
  now = Date.now(),
): number | null {
  if (!stokvel.contributionDay) return null;
  return nextDateForDay(stokvel.contributionDay, now);
}

// ---------------------------------------------------------------------------
// Group health / on-time performance
// ---------------------------------------------------------------------------

export type OnTimeStats = {
  onTime: number;
  total: number;
  /** Whole-number percentage 0..100. */
  rate: number;
};

/**
 * On-time stats over a set of contributions relative to a due day.
 * "On time" = confirmed AND made on/before the due day-of-month.
 * Returns null when there's no due day or no confirmed contributions
 * (so the UI can show "not enough data yet" instead of a fake 0%/100%).
 */
export function onTimeStats(
  contributions: Contribution[],
  contributionDay: number | null | undefined,
): OnTimeStats | null {
  if (!contributionDay) return null;
  const confirmed = contributions.filter(isConfirmed);
  if (confirmed.length === 0) return null;
  let onTime = 0;
  for (const c of confirmed) {
    if (new Date(c.createdAt).getDate() <= contributionDay) onTime++;
  }
  return {
    onTime,
    total: confirmed.length,
    rate: Math.round((onTime / confirmed.length) * 100),
  };
}

/** Whole-group on-time stats. */
export function stokvelOnTimeStats(stokvel: Stokvel): OnTimeStats | null {
  return onTimeStats(stokvel.contributions, stokvel.contributionDay);
}

/** One member's on-time stats. */
export function memberOnTimeStats(
  stokvel: Stokvel,
  userId: string,
): OnTimeStats | null {
  return onTimeStats(
    stokvel.contributions.filter((c) => c.ownerId === userId),
    stokvel.contributionDay,
  );
}

export type HealthTier = "healthy" | "risk";

/**
 * Two-tier health indicator matching the product mockup (green vs
 * red): >= 80% on-time is healthy (green), below is at-risk (red).
 */
export const HEALTH_THRESHOLD = 80;

export function healthTier(rate: number): HealthTier {
  return rate >= HEALTH_THRESHOLD ? "healthy" : "risk";
}

// ---------------------------------------------------------------------------
// Payouts
// ---------------------------------------------------------------------------

/** Total rand paid out from the fund over all time. */
export function payoutsTotal(stokvel: Stokvel): number {
  return (stokvel.payouts ?? []).reduce((a, p) => a + p.amount, 0);
}

/** Payouts, newest first. */
export function sortedPayouts(stokvel: Stokvel): StokvelPayout[] {
  return (stokvel.payouts ?? []).slice().sort((a, b) => b.paidAt - a.paidAt);
}

/** Confirmed contributions total (mirrors store.stokvelTotal). */
export function confirmedTotal(stokvel: Stokvel): number {
  return stokvel.contributions
    .filter(isConfirmed)
    .reduce((a, c) => a + c.amount, 0);
}

/**
 * Cash currently in the fund = confirmed contributions − payouts.
 * This is the "Group balance" shown on the dashboard (distinct from
 * the all-time contributed total on the pot card).
 */
export function availableBalance(stokvel: Stokvel): number {
  return confirmedTotal(stokvel) - payoutsTotal(stokvel);
}

// ---------------------------------------------------------------------------
// Automatic reminders
// ---------------------------------------------------------------------------

export type ContributionReminder = {
  status: "upcoming" | "due" | "overdue";
  /** Due date for the current calendar month (ms). */
  dueAt: number;
  /** Whole days until due; 0 = due today, negative = overdue. */
  daysUntil: number;
  /** Expected per-member amount this cycle. */
  expectedAmount: number;
  /** How much this member has already paid this cycle. */
  paidThisCycle: number;
  /** True once the member has met their full expected amount. */
  alreadyPaid: boolean;
};

/**
 * Compute the current user's contribution reminder for this cycle, or
 * null when there's nothing to remind about (no schedule, not a
 * member, or no signed-in user). Pure — the caller decides whether to
 * actually surface a notification via `shouldRemind`.
 */
export function computeContributionReminder(
  stokvel: Stokvel,
  userId: string | null,
  now = Date.now(),
): ContributionReminder | null {
  if (!userId) return null;
  const day = stokvel.contributionDay;
  const per = stokvel.monthlyAmount ?? 0;
  if (!day || per <= 0) return null;
  if (!stokvel.memberships.some((m) => m.userId === userId)) return null;

  const paid = memberPaidThisCycle(stokvel, userId, now);
  const alreadyPaid = paid >= per;

  const d = new Date(now);
  const dueAt = new Date(
    d.getFullYear(),
    d.getMonth(),
    clampDayOfMonth(d.getFullYear(), d.getMonth(), day),
  ).getTime();
  const daysUntil = Math.round((dueAt - startOfDay(now)) / MS_PER_DAY);

  const status: ContributionReminder["status"] =
    daysUntil > 0 ? "upcoming" : daysUntil === 0 ? "due" : "overdue";

  return {
    status,
    dueAt,
    daysUntil,
    expectedAmount: per,
    paidThisCycle: paid,
    alreadyPaid,
  };
}

/**
 * Whether a reminder is worth surfacing right now. Fires when the
 * member hasn't fully paid AND the due date is today, overdue, or
 * within `windowDays` (default 3) upcoming.
 */
export function shouldRemind(
  reminder: ContributionReminder | null,
  windowDays = 3,
): boolean {
  if (!reminder) return false;
  if (reminder.alreadyPaid) return false;
  if (reminder.status === "due" || reminder.status === "overdue") return true;
  return reminder.daysUntil <= windowDays;
}

/**
 * Stable per-cycle-per-status key for de-duping reminders in
 * localStorage. Keying on the status (not just the month) lets the
 * reminder escalate: an early "upcoming" nudge no longer burns the
 * month's only slot, so the member still gets the "due"/"overdue"
 * nudge that matters most.
 */
export function reminderCycleKey(
  stokvelId: string,
  status: ContributionReminder["status"],
  now = Date.now(),
): string {
  const d = new Date(now);
  const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `kasikash:remind:${stokvelId}:${ym}:${status}`;
}

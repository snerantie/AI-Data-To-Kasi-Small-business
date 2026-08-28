import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Contribution,
  Stokvel,
  StokvelMember,
  StokvelPayout,
} from "../store";
import {
  availableBalance,
  clampDayOfMonth,
  computeContributionReminder,
  expectedThisCycle,
  hasContributionSchedule,
  healthTier,
  memberOnTimeStats,
  memberPaidThisCycle,
  membersOutstandingThisCycle,
  membersPaidThisCycle,
  monthWindow,
  nextContributionDate,
  nextDateForDay,
  nextPayoutDate,
  onTimeStats,
  outstandingThisCycle,
  paidThisCycle,
  payoutsTotal,
  reminderCycleKey,
  shouldRemind,
  sortedPayouts,
  stokvelOnTimeStats,
} from "./stokvelSchedule";

// Freeze "now" to Sat 15 Aug 2026, noon LOCAL time. Using local-time
// constructors everywhere keeps the day-of-month maths timezone-proof.
const NOW = new Date(2026, 7, 15, 12, 0, 0).getTime();
const at = (y: number, m: number, d: number, h = 12) =>
  new Date(y, m, d, h).getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
});

// --- fixture builders ------------------------------------------------------

function member(userId: string, role: "admin" | "member" = "member"): StokvelMember {
  return { userId, role, displayName: userId, joinedAt: at(2026, 0, 1) };
}

function contrib(
  ownerId: string,
  amount: number,
  createdAt: number,
  status: Contribution["status"] = "confirmed",
): Contribution {
  return { id: `${ownerId}-${createdAt}-${amount}`, amount, createdAt, ownerId, status };
}

function makeStokvel(overrides: Partial<Stokvel> = {}): Stokvel {
  return {
    id: "sk1",
    name: "Test Stokvel",
    kind: "savings",
    goal: 10000,
    members: 3,
    memberships: [member("u1", "admin"), member("u2"), member("u3")],
    contributions: [],
    role: "admin",
    bankAccount: null,
    monthlyAmount: 200,
    contributionDay: 25,
    payoutDay: 5,
    frequency: "monthly",
    payouts: [],
    ...overrides,
  };
}

// --- date helpers ----------------------------------------------------------

describe("clampDayOfMonth", () => {
  it("clamps day 31 in February to the real last day", () => {
    expect(clampDayOfMonth(2026, 1, 31)).toBe(28); // Feb 2026 (non-leap)
    expect(clampDayOfMonth(2024, 1, 31)).toBe(29); // Feb 2024 (leap)
  });
  it("passes through a valid day and floors below 1", () => {
    expect(clampDayOfMonth(2026, 7, 15)).toBe(15);
    expect(clampDayOfMonth(2026, 7, 0)).toBe(1);
  });
});

describe("nextDateForDay", () => {
  it("returns this month's day when today is before it", () => {
    expect(nextDateForDay(25)).toBe(at(2026, 7, 25, 0));
  });
  it("rolls to next month when today is past it", () => {
    expect(nextDateForDay(5)).toBe(at(2026, 8, 5, 0));
  });
  it("returns today when the day is today", () => {
    expect(nextDateForDay(15)).toBe(at(2026, 7, 15, 0));
  });
  it("rolls December -> January across the year boundary", () => {
    vi.setSystemTime(new Date(2026, 11, 20, 12).getTime());
    expect(nextDateForDay(5)).toBe(new Date(2027, 0, 5).getTime());
  });
});

describe("monthWindow", () => {
  it("spans the current calendar month", () => {
    const { start, end } = monthWindow(NOW);
    expect(start).toBe(at(2026, 7, 1, 0));
    expect(end).toBe(at(2026, 8, 1, 0));
  });
});

// --- money tracking --------------------------------------------------------

describe("paid / expected / outstanding", () => {
  it("counts only confirmed contributions in the current month", () => {
    const s = makeStokvel({
      contributions: [
        contrib("u1", 200, at(2026, 7, 10)), // this month, confirmed
        contrib("u2", 200, at(2026, 7, 12)), // this month, confirmed
        contrib("u3", 200, at(2026, 7, 8), "pending"), // pending -> excluded
        contrib("u3", 200, at(2026, 6, 20)), // last month -> excluded
      ],
    });
    expect(paidThisCycle(s)).toBe(400);
    expect(memberPaidThisCycle(s, "u1")).toBe(200);
    expect(memberPaidThisCycle(s, "u3")).toBe(0);
  });

  it("computes expected as amount x members and outstanding as the gap", () => {
    const s = makeStokvel({
      contributions: [contrib("u1", 200, at(2026, 7, 10))],
    });
    expect(expectedThisCycle(s)).toBe(600); // 200 x 3
    expect(outstandingThisCycle(s)).toBe(400); // 600 - 200
  });

  it("never goes negative when overpaid", () => {
    const s = makeStokvel({
      monthlyAmount: 100,
      contributions: [contrib("u1", 5000, at(2026, 7, 10))],
    });
    expect(outstandingThisCycle(s)).toBe(0);
  });

  it("counts members who met their full amount", () => {
    const s = makeStokvel({
      contributions: [
        contrib("u1", 200, at(2026, 7, 10)), // full
        contrib("u2", 150, at(2026, 7, 11)), // partial -> not counted
      ],
    });
    expect(membersPaidThisCycle(s)).toBe(1);
    expect(membersOutstandingThisCycle(s)).toBe(2);
  });
});

// --- key dates -------------------------------------------------------------

describe("next dates", () => {
  it("returns next payout + contribution dates", () => {
    const s = makeStokvel();
    expect(nextPayoutDate(s)).toBe(at(2026, 8, 5, 0)); // 5th already passed
    expect(nextContributionDate(s)).toBe(at(2026, 7, 25, 0)); // 25th upcoming
  });
  it("returns null when the day is not configured", () => {
    expect(nextPayoutDate(makeStokvel({ payoutDay: null }))).toBeNull();
    expect(
      nextContributionDate(makeStokvel({ contributionDay: null })),
    ).toBeNull();
  });
});

// --- on-time / health ------------------------------------------------------

describe("onTimeStats", () => {
  it("rates confirmed contributions on/before the due day", () => {
    const s = makeStokvel({
      contributionDay: 25,
      contributions: [
        contrib("u1", 200, at(2026, 7, 10)), // on time
        contrib("u2", 200, at(2026, 7, 20)), // on time
        contrib("u3", 200, at(2026, 7, 28)), // late
        contrib("u1", 200, at(2026, 6, 5), "pending"), // excluded
        contrib("u2", 200, at(2026, 6, 5), "rejected"), // excluded
      ],
    });
    const stats = stokvelOnTimeStats(s)!;
    expect(stats.total).toBe(3);
    expect(stats.onTime).toBe(2);
    expect(stats.rate).toBe(67);
  });

  it("returns null when there is no due day or no confirmed data", () => {
    expect(onTimeStats([], 25)).toBeNull();
    expect(
      onTimeStats([contrib("u1", 200, at(2026, 7, 10))], null),
    ).toBeNull();
  });

  it("computes per-member on-time stats", () => {
    const s = makeStokvel({
      contributionDay: 15,
      contributions: [
        contrib("u1", 200, at(2026, 7, 10)), // on time
        contrib("u1", 200, at(2026, 6, 20)), // late
      ],
    });
    const stats = memberOnTimeStats(s, "u1")!;
    expect(stats.total).toBe(2);
    expect(stats.onTime).toBe(1);
    expect(stats.rate).toBe(50);
  });
});

describe("healthTier", () => {
  it("is healthy at/above 80% and at-risk below", () => {
    expect(healthTier(95)).toBe("healthy");
    expect(healthTier(80)).toBe("healthy");
    expect(healthTier(78)).toBe("risk");
  });
});

// --- payouts + balance -----------------------------------------------------

describe("payouts + available balance", () => {
  const payout = (amount: number, paidAt: number): StokvelPayout => ({
    id: `p-${paidAt}`,
    amount,
    paidAt,
  });

  it("totals and sorts payouts newest-first", () => {
    const s = makeStokvel({
      payouts: [payout(500, at(2026, 5, 1)), payout(300, at(2026, 7, 1))],
    });
    expect(payoutsTotal(s)).toBe(800);
    expect(sortedPayouts(s).map((p) => p.amount)).toEqual([300, 500]);
  });

  it("computes available balance as confirmed contributions minus payouts", () => {
    const s = makeStokvel({
      contributions: [
        contrib("u1", 1000, at(2026, 7, 2)),
        contrib("u2", 500, at(2026, 7, 3), "pending"), // excluded
      ],
      payouts: [payout(400, at(2026, 7, 5))],
    });
    expect(availableBalance(s)).toBe(600); // 1000 - 400
  });

  it("treats a missing payouts array as empty", () => {
    const s = makeStokvel({ payouts: undefined });
    expect(payoutsTotal(s)).toBe(0);
    expect(sortedPayouts(s)).toEqual([]);
  });
});

// --- reminders -------------------------------------------------------------

describe("computeContributionReminder + shouldRemind", () => {
  it("returns null without a schedule, user, or membership", () => {
    expect(computeContributionReminder(makeStokvel(), null)).toBeNull();
    expect(
      computeContributionReminder(
        makeStokvel({ contributionDay: null }),
        "u1",
      ),
    ).toBeNull();
    expect(
      computeContributionReminder(makeStokvel(), "stranger"),
    ).toBeNull();
  });

  it("flags an upcoming due date and respects the window", () => {
    const s = makeStokvel({ contributionDay: 25 }); // 10 days away
    const r = computeContributionReminder(s, "u1")!;
    expect(r.status).toBe("upcoming");
    expect(r.daysUntil).toBe(10);
    expect(shouldRemind(r, 3)).toBe(false);
    expect(shouldRemind(r, 15)).toBe(true);
  });

  it("flags overdue when the due day has passed and unpaid", () => {
    const s = makeStokvel({ contributionDay: 10 }); // 5 days ago
    const r = computeContributionReminder(s, "u1")!;
    expect(r.status).toBe("overdue");
    expect(r.daysUntil).toBe(-5);
    expect(shouldRemind(r)).toBe(true);
  });

  it("flags due today", () => {
    const s = makeStokvel({ contributionDay: 15 });
    const r = computeContributionReminder(s, "u1")!;
    expect(r.status).toBe("due");
    expect(r.daysUntil).toBe(0);
    expect(shouldRemind(r)).toBe(true);
  });

  it("does not remind once the member has fully paid this cycle", () => {
    const s = makeStokvel({
      contributionDay: 10, // overdue timing
      monthlyAmount: 200,
      contributions: [contrib("u1", 200, at(2026, 7, 3))],
    });
    const r = computeContributionReminder(s, "u1")!;
    expect(r.alreadyPaid).toBe(true);
    expect(shouldRemind(r)).toBe(false);
  });
});

describe("reminderCycleKey", () => {
  it("is stable per stokvel per calendar month per status", () => {
    expect(reminderCycleKey("sk1", "upcoming")).toBe(
      "kasikash:remind:sk1:2026-08:upcoming",
    );
    expect(reminderCycleKey("sk1", "overdue")).toBe(
      "kasikash:remind:sk1:2026-08:overdue",
    );
    // Different statuses get different slots so reminders can escalate.
    expect(reminderCycleKey("sk1", "upcoming")).not.toBe(
      reminderCycleKey("sk1", "due"),
    );
  });
});

describe("hasContributionSchedule", () => {
  it("requires both an amount and a due day", () => {
    expect(hasContributionSchedule(makeStokvel())).toBe(true);
    expect(
      hasContributionSchedule(makeStokvel({ monthlyAmount: 0 })),
    ).toBe(false);
    expect(
      hasContributionSchedule(makeStokvel({ contributionDay: null })),
    ).toBe(false);
  });
});

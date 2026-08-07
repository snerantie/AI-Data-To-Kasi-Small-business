/**
 * Rules-based classifier for bank-statement transactions (PR #23).
 *
 * Given a `RawTransaction` from the parser, emit a
 * `ClassifiedTransaction` — same shape plus:
 *
 *   * classification         — one of the ClassificationCategory values
 *   * classificationConfidence — 0–1
 *   * classificationSource   — always 'rules' from this module
 *   * isRecurring            — always false here; the recurrence
 *                              detector (`recurring.ts`) fills it in
 *                              on a second pass.
 *
 * ─────────────────────────────────────────────────────────────
 * The load-bearing invariant
 * ─────────────────────────────────────────────────────────────
 *
 * Enforced structurally by the types:
 *
 *   * `ClassificationCategory` (in `types.ts`) has no
 *     `customer_sale` member, so no code path here can produce one.
 *
 *   * Every Rule below emits a category from
 *     `Exclude<ClassificationCategory, "unknown">`, and the *default*
 *     when no rule matches is `unknown`. That means we can never
 *     accidentally "guess up" — a transaction we don't recognise
 *     goes to `unknown` and stays there until the user reclassifies
 *     it or a community-learned rule matches.
 *
 * ─────────────────────────────────────────────────────────────
 * Rule design
 * ─────────────────────────────────────────────────────────────
 *
 * Each rule is:
 *
 *   * A pattern (regex, or a function of the description +
 *     direction + amount).
 *   * A category to assign on match.
 *   * A confidence score. Confident rules (e.g. exact
 *     merchant-name match) get 0.9+; heuristic rules (e.g.
 *     "description contains 'salary'") get 0.6–0.7.
 *
 * Rules are ordered by priority: the first rule that matches wins.
 * Rules that require specific direction won't fire on the wrong side.
 *
 * When adding a new merchant / bank fee / utility pattern:
 *   1. Add it below with a comment naming the specific SA business.
 *   2. Add a test case in classify.test.ts.
 *   3. Verify the test passes and no other tests regressed.
 *
 * DO NOT ever add a rule that classifies inflows as customer_sale.
 * It's not just conservative product policy — the type system will
 * reject it. If someone genuinely needs a business-inflow signal,
 * expose a separate mechanism (e.g. user-tap-to-reclassify).
 */

import type {
  ClassificationCategory,
  ClassifiedTransaction,
  Direction,
  RawTransaction,
} from "./types";
import { INFLOW_CATEGORIES, OUTFLOW_CATEGORIES } from "./types";

// ---------------------------------------------------------------------------
// Rule definition
// ---------------------------------------------------------------------------

type NonUnknownCategory = Exclude<ClassificationCategory, "unknown">;

type Rule = {
  /**
   * Human-readable name that shows up in the confidence explanation
   * on the passport ("Matched supplier rule: BOXER"). Kept out of
   * production build size — we only emit it in tests.
   */
  name: string;

  category: NonUnknownCategory;

  /**
   * Restricts the rule to one direction, both, or unspecified
   * (matches whichever). Directional restrictions matter for safety:
   * a "salary" rule that fires on outflows would be a bug.
   */
  direction?: Direction;

  /**
   * Match against the *upper-cased, whitespace-normalised* raw
   * description AND (if extracted by the parser) the counterparty.
   * The Rule sees both concatenated.
   */
  pattern: RegExp;

  /**
   * Confidence between 0 and 1 when this rule matches. Higher means
   * "I'm very sure this is what it says on the tin".
   */
  confidence: number;
};

// ---------------------------------------------------------------------------
// Rule library
//
// Ordered by priority — the FIRST match wins. If two rules could
// arguably match the same string, order them from most-specific to
// most-general.
// ---------------------------------------------------------------------------

/**
 * Explicit "OWN TRANSFER" markers used by SA banks. These are unique
 * enough that we take them at very high confidence and short-
 * circuit — otherwise the recurring detector might mis-flag both
 * legs of a self-transfer as recurring supplier payments.
 */
const OWN_TRANSFER_RULES: Rule[] = [
  {
    name: "self-transfer:ib_transfer",
    category: "own_transfer",
    pattern: /\bIB\s*TRANSFER\b|\bINTERNET\s*TRANSFER\b/,
    confidence: 0.95,
  },
  {
    name: "self-transfer:own_acct",
    category: "own_transfer",
    pattern: /\bOWN\s*ACC(?:T|OUNT)?\b|\bTFR\s*TO\s*ACC\b|\bTFR\s*FROM\s*ACC\b/,
    confidence: 0.95,
  },
  {
    name: "self-transfer:savings",
    category: "own_transfer",
    pattern: /TRANSFER\s+(?:TO|FROM)\s+SAVINGS|SAVINGS\s+TRANSFER/,
    confidence: 0.85,
  },
];

const CASH_MOVEMENT_RULES: Rule[] = [
  {
    name: "cash_deposit:atm",
    category: "cash_deposit",
    direction: "in",
    pattern: /\bCASH\s+DEP(?:OSIT)?\b|\bATM\s+DEP\b|\bDEPOSIT\s+CASH\b/,
    confidence: 0.95,
  },
  {
    name: "cash_deposit:cash_send_in",
    category: "cash_deposit",
    direction: "in",
    pattern: /\bCASH\s+SEND\s+RECEIVED\b|\bCASH\s+RECEIVED\b/,
    confidence: 0.9,
  },
  {
    name: "cash_withdrawal:atm",
    category: "cash_withdrawal",
    direction: "out",
    pattern: /\bATM\s+WITHDRAWAL\b|\bCASH\s+WITHDRAWAL\b|\bWITHDRAWAL\s+CASH\b/,
    confidence: 0.95,
  },
  {
    name: "cash_withdrawal:cash_send_out",
    category: "cash_withdrawal",
    direction: "out",
    pattern: /\bCASH\s+SEND\s+SENT\b|\bCASH\s+SENT\b/,
    confidence: 0.9,
  },
];

const BANK_FEE_RULES: Rule[] = [
  {
    // Explicit fee markers — high confidence.
    name: "bank_fee:explicit",
    category: "bank_fee",
    direction: "out",
    // Allows one or two intervening words: "MONTHLY FEE", "MONTHLY
    // ACCOUNT FEE", "SERVICE FEE", "BANKING CHARGE" etc.
    pattern:
      /\b(?:MONTHLY|ADMIN|SERVICE|TRANSACTION|BANKING|BANKSERV)(?:\s+\w+){0,2}\s+(?:FEE|CHARGE)S?\b/,
    confidence: 0.95,
  },
  {
    name: "bank_fee:sms",
    category: "bank_fee",
    direction: "out",
    pattern: /\bSMS\s*(?:ALERT|NOTIFICATION|CHARGE|FEE)\b|\bINSMS\b/,
    confidence: 0.9,
  },
  {
    name: "bank_fee:card",
    category: "bank_fee",
    direction: "out",
    pattern: /\bCARD\s*(?:REPL|REPLACEMENT|DELIVERY|FEE)\b/,
    confidence: 0.85,
  },
];

const AIRTIME_RULES: Rule[] = [
  {
    // Prepaid airtime — matches merchant + product keywords.
    name: "airtime:prepaid",
    category: "airtime",
    direction: "out",
    pattern:
      /\bAIRTIME\b|\bPREPAID\s+(?:MTN|VODA|CELL|TELKOM|RAIN)\b|\bPP\s+AIRTIME\b/,
    confidence: 0.9,
  },
  {
    name: "airtime:vodacom",
    category: "airtime",
    direction: "out",
    pattern: /\bVODACOM\s+PREPAID\b|\bVODAPAY\b|\bVODACOM\s+AIRTIME\b/,
    confidence: 0.9,
  },
  {
    name: "airtime:mtn",
    category: "airtime",
    direction: "out",
    pattern: /\bMTN\s+(?:PREPAID|AIRTIME|DATA)\b/,
    confidence: 0.9,
  },
];

const UTILITY_RULES: Rule[] = [
  {
    name: "utility:electricity",
    category: "utility",
    direction: "out",
    pattern:
      /\bESKOM\b|\bELECTRICITY\b|\bPREPAID\s+ELEC\b|\bELECTRIC\s+PREP\b|\bPP\s+ELEC\b/,
    confidence: 0.9,
  },
  {
    name: "utility:municipal",
    category: "utility",
    direction: "out",
    pattern:
      /\b(?:CITY\s+OF|MUNICIPALITY\s+OF)\s+\w+\b|\bJOBURG\s+WATER\b|\bETHEKWINI\s+MUNICIPALITY\b|\bMUNICIPAL(?:ITY)?\s+ACCOUNT\b/,
    confidence: 0.85,
  },
  {
    name: "utility:water_refuse",
    category: "utility",
    direction: "out",
    pattern: /\bWATER\s+AND\s+RATES\b|\bRATES\s+AND\s+TAXES\b|\bREFUSE\s+REMOVAL\b/,
    confidence: 0.85,
  },
];

/**
 * SA wholesalers + cash-and-carry names commonly used by kasi
 * spaza owners for stock. Match on the counterparty portion of the
 * description. Kept as a broad OR so new outlets can be added
 * without restructuring.
 */
const SUPPLIER_LIKE_RULES: Rule[] = [
  {
    name: "supplier:wholesale",
    category: "supplier_like",
    direction: "out",
    pattern:
      /\b(?:BOXER|MAKRO|ELITE\s+CASH|CAMBRIDGE\s+FOOD|USAVE|PICK\s?N\s?PAY\s+WHOLESALE|METRO\s+CASH|MASSMART|MASSCASH|SHIELD\s+CASH|JUMBO\s+CASH|SPARTAN|WEST\s+PACK|SAVEMOR)\b/,
    confidence: 0.9,
  },
  {
    name: "supplier:bread_meat",
    category: "supplier_like",
    direction: "out",
    pattern:
      /\b(?:SASKO|ALBANY|BOKOMO|ENTERPRISE\s+FOODS|IN2FOOD|COUNTRY\s+RANGE|EPIC\s+FOODS|COMBRINCK|TIGER\s+BRANDS|PIONEER\s+FOODS)\b/,
    confidence: 0.85,
  },
];

const LOAN_REPAYMENT_RULES: Rule[] = [
  {
    name: "loan:known_lender",
    category: "loan_repayment",
    direction: "out",
    pattern:
      /\b(?:CAPFIN|BAYPORT|AFRICAN\s+BANK|BLUE\s+LABEL|WONGA|LULALEND|GETBUCKS|FINCHOICE|IZWE|MOBIMONEY|EDCON)\b/,
    confidence: 0.9,
  },
  {
    name: "loan:generic",
    category: "loan_repayment",
    direction: "out",
    // "LOAN" as a standalone token, or "DR ORDER" with a loan-like
    // counterparty. Kept moderate-confidence because "LOAN" alone
    // is a bit ambiguous.
    pattern: /\bLOAN\s+REPAYMENT\b|\bLOAN\s+INSTAL(?:MENT)?\b|\bPAY\s+LOAN\b/,
    confidence: 0.75,
  },
];

const STOKVEL_RULES: Rule[] = [
  {
    // No direction restriction — a stokvel payout is in, a
    // contribution is out.
    name: "stokvel:literal",
    category: "stokvel_related",
    pattern: /\bSTOKVEL\b|\bGOOISA\b|\bBURIAL\s+SOCIETY\b/,
    confidence: 0.85,
  },
];

const REFUND_RULES: Rule[] = [
  {
    name: "refund:literal",
    category: "refund",
    direction: "in",
    pattern: /\bREFUND\b|\bREVERSAL\b|\bREVERSED\s+PAYMENT\b/,
    confidence: 0.85,
  },
];

/**
 * Salary detection from a SINGLE transaction is deliberately weak.
 * A word like "SALARY" or "SAL" in the description is a hint, but
 * the recurrence detector in `recurring.ts` is the real signal
 * (regular monthly inflow, same counterparty, similar amount).
 * When only description matches, we tag as `salary_like` but at
 * low confidence — the recurrence detector may or may not confirm.
 */
const SALARY_RULES: Rule[] = [
  {
    name: "salary:literal",
    category: "salary_like",
    direction: "in",
    pattern: /\bSALARY\b|\bSAL\s+DEP\b|\bWAGES\b|\bPAY\s+FROM\b/,
    confidence: 0.6,
  },
];

/**
 * Rent + subscription markers used by SA landlords + subscription
 * businesses. Same caveat as salary: the recurrence detector is the
 * real signal.
 */
const RENT_SUB_RULES: Rule[] = [
  {
    name: "rent_or_sub:rent_word",
    category: "rent_or_subscription",
    direction: "out",
    pattern: /\bRENT\b|\bLEASE\s+PAYMENT\b|\bLANDLORD\b/,
    confidence: 0.7,
  },
  {
    name: "rent_or_sub:streaming",
    category: "rent_or_subscription",
    direction: "out",
    pattern:
      /\b(?:NETFLIX|SHOWMAX|SPOTIFY|APPLE\.COM(?:\/BILL)?|YOUTUBE|DSTV|MULTICHOICE|AMAZON\s+PRIME|DEBIT\s+ORDER\s+INSUR|OLD\s+MUTUAL(?:\s+INSUR)?|SANLAM|LIBERTY|DISCOVERY\s+INSUR|MOMENTUM|1LIFE)\b/,
    confidence: 0.75,
  },
];

/**
 * Full ordered rule list. Priority = position in this array. Own-
 * transfer wins over anything else so a "self transfer to savings"
 * doesn't get misread as a supplier payment because it happens to
 * contain a merchant-name substring.
 */
const RULES: readonly Rule[] = [
  ...OWN_TRANSFER_RULES,
  ...CASH_MOVEMENT_RULES,
  ...BANK_FEE_RULES,
  ...AIRTIME_RULES,
  ...UTILITY_RULES,
  ...SUPPLIER_LIKE_RULES,
  ...LOAN_REPAYMENT_RULES,
  ...STOKVEL_RULES,
  ...REFUND_RULES,
  ...SALARY_RULES,
  ...RENT_SUB_RULES,
];

// ---------------------------------------------------------------------------
// Runtime safety net
// ---------------------------------------------------------------------------

// Category-vs-direction sanity: if a rule ever emits a category
// that's outflow-only on an inflow transaction (or vice versa),
// something is wrong with the rule library. This module-level
// assertion catches such bugs at load time in dev.
for (const rule of RULES) {
  const outflowOnly = OUTFLOW_CATEGORIES.includes(rule.category);
  const inflowOnly = INFLOW_CATEGORIES.includes(rule.category);
  if (outflowOnly && rule.direction === "in") {
    throw new Error(
      `bank/classify: rule ${rule.name} matches an outflow-only category but has direction='in'`,
    );
  }
  if (inflowOnly && rule.direction === "out") {
    throw new Error(
      `bank/classify: rule ${rule.name} matches an inflow-only category but has direction='out'`,
    );
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify a single transaction. Never throws; returns an
 * `unknown`-classified result if nothing matches.
 */
export function classifyTransaction(t: RawTransaction): ClassifiedTransaction {
  // Combine description + counterparty into the haystack the rules
  // pattern-match against. Upper-case for case-insensitive matching
  // without inflating pattern strings.
  const haystack = normaliseForMatch(
    [t.description, t.counterpartyName ?? ""].join(" "),
  );

  for (const rule of RULES) {
    if (rule.direction && rule.direction !== t.direction) continue;

    // Additional sanity: if the rule's category is inflow-only but
    // the transaction is outflow (or vice versa), skip. Belt and
    // braces given the load-time assertion above.
    if (
      OUTFLOW_CATEGORIES.includes(rule.category) &&
      t.direction === "in"
    )
      continue;
    if (
      INFLOW_CATEGORIES.includes(rule.category) &&
      t.direction === "out"
    )
      continue;

    if (rule.pattern.test(haystack)) {
      return {
        ...t,
        classification: rule.category,
        classificationConfidence: rule.confidence,
        classificationSource: "rules",
        isRecurring: false,
      };
    }
  }

  // No rule matched → unknown. Explicit low confidence to make it
  // easy for the passport to flag "we don't know what this is".
  return {
    ...t,
    classification: "unknown",
    classificationConfidence: 0.0,
    classificationSource: "rules",
    isRecurring: false,
  };
}

/**
 * Batch helper. Same as mapping `classifyTransaction` but written
 * as a separate function so tests can assert "this API never
 * mutates or reorders the input".
 */
export function classifyTransactions(
  txs: readonly RawTransaction[],
): ClassifiedTransaction[] {
  return txs.map((t) => classifyTransaction(t));
}

// ---------------------------------------------------------------------------
// Test hooks (exported for direct unit testing; not part of the
// stable module contract)
// ---------------------------------------------------------------------------

/** Number of rules loaded — sanity check for the test suite. */
export function ruleCountForTests(): number {
  return RULES.length;
}

/** Names of all rules, for coverage assertions. */
export function ruleNamesForTests(): readonly string[] {
  return RULES.map((r) => r.name);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Uppercase + collapse whitespace so all rule patterns can be
 * written in a canonical form. Doesn't strip anything else — the
 * matching regexes are the source of truth for what to ignore.
 */
function normaliseForMatch(s: string): string {
  return s.toUpperCase().replace(/\s+/g, " ").trim();
}

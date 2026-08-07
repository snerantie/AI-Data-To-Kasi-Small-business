/**
 * Client-side CSV parser for SA bank statements (PR #23).
 *
 * Every major SA bank offers a CSV export from their online banking.
 * Column layouts vary — some use signed amount columns, some use
 * paired Debit/Credit columns, date formats differ. This module:
 *
 *   1. Reads the file with papaparse (streaming, tolerant to weird
 *      encodings — we let papaparse guess the delimiter and
 *      normalise line endings).
 *
 *   2. Sniffs the header row to detect which bank produced the
 *      export. If detection fails, falls back to a "generic" column
 *      mapper that fuzzy-matches likely column names.
 *
 *   3. Maps each row into a `RawTransaction`. Rows where direction
 *      or amount can't be determined unambiguously are DROPPED (not
 *      guessed) and counted in `ParsedStatement.dropped`.
 *
 * The parser is stateless and side-effect-free. It doesn't classify,
 * doesn't dedupe, doesn't touch localStorage or Supabase — it just
 * turns bytes into `RawTransaction[]`. The classifier
 * (`classify.ts`), the recurrence detector (`recurring.ts`) and the
 * store's `addBankStatement` handle the rest.
 */

import Papa from "papaparse";

import type {
  BankId,
  Direction,
  RawParsedStatement,
  RawTransaction,
} from "./types";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a CSV bank statement file. Runs entirely in the browser;
 * `file.text()` is streamed via papaparse.
 *
 * Callers (usually the ImportStatement screen) should:
 *   1. Compute the SHA-256 file hash on the raw bytes BEFORE calling
 *      this (so re-uploads of the same file can short-circuit).
 *   2. Pass the hash + filename in; we bundle them into the returned
 *      `ParsedStatement` so callers don't have to plumb them through
 *      themselves.
 */
export async function parseCsvStatement(
  file: File,
  fileHash: string,
): Promise<RawParsedStatement> {
  const text = await file.text();
  const warnings: string[] = [];

  // Papaparse handles delimiter detection and quoted values. `header:
  // true` uses the first row as keys; falsy trims spaces from header
  // names so different capitalisations across banks parse the same.
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false, // We do our own numeric parsing.
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    const shown = result.errors.slice(0, 3).map((e) => e.message);
    warnings.push(
      `CSV had ${result.errors.length} parse warnings: ${shown.join("; ")}`,
    );
  }

  if (!result.data || result.data.length === 0) {
    return emptyStatement(file.name, fileHash, [
      "CSV had no data rows — is this the right file?",
    ]);
  }

  // Detect the bank by looking at the columns present. The header
  // fingerprint is the sorted list of column names, lowercased.
  const headers = Object.keys(result.data[0] ?? {});
  const bank = detectBankFromHeaders(headers);
  if (bank === "unknown") {
    warnings.push(
      `Unrecognised CSV column layout — using generic parser. Columns seen: ${headers.slice(0, 8).join(", ")}`,
    );
  }

  const mapper = getMapper(bank, headers);
  const transactions: RawTransaction[] = [];
  let dropped = 0;

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const parsed = mapper(row, i);
    if (parsed) {
      transactions.push(parsed);
    } else {
      dropped++;
    }
  }

  // Bounds of the transaction period (if any transactions parsed).
  let periodStart: number | null = null;
  let periodEnd: number | null = null;
  for (const t of transactions) {
    if (periodStart === null || t.occurredAt < periodStart) periodStart = t.occurredAt;
    if (periodEnd === null || t.occurredAt > periodEnd) periodEnd = t.occurredAt;
  }

  return {
    bank,
    filename: file.name,
    fileHash,
    accountRef: null, // CSVs rarely include the account number in a
    // machine-readable spot; PDF parsers try harder.
    periodStart,
    periodEnd,
    openingBalance: null,
    closingBalance: null,
    transactions,
    dropped,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Bank detection from CSV headers
// ---------------------------------------------------------------------------

/**
 * Signature-based bank detection: given the header row of a CSV,
 * return a BankId. Signatures are conservative — if a required set
 * of columns is missing, fall back to 'unknown' (which routes to the
 * generic mapper).
 *
 * Column name matching is case-insensitive and tolerates variations
 * like "Money In" vs "Money in" vs "MONEY IN".
 */
export function detectBankFromHeaders(headers: readonly string[]): BankId {
  const norm = headers.map((h) => h.trim().toLowerCase());
  const has = (name: string) => norm.includes(name.toLowerCase());
  const hasAny = (names: string[]) => names.some((n) => has(n));

  // Capitec: two separate money-in/money-out columns is the tell.
  if (
    has("date") &&
    hasAny(["money in", "moneyin"]) &&
    hasAny(["money out", "moneyout"])
  ) {
    return "capitec";
  }

  // Absa / Nedbank: separate Debit / Credit columns.
  if (has("date") && has("debit") && has("credit")) {
    // Ambiguous between Absa and Nedbank on headers alone. We label
    // 'absa' as the more common one; the classifier doesn't need to
    // know the difference, and the account-detail extractor is the
    // same for both.
    return "absa";
  }

  // FNB: single "Amount" column, signed. Description column.
  if (
    has("date") &&
    (has("amount") || has("transaction amount")) &&
    (has("description") || has("transaction description"))
  ) {
    return "fnb";
  }

  // Standard Bank: often uses "Value" for the amount.
  if (
    has("date") &&
    (has("value") || has("transaction value")) &&
    has("description")
  ) {
    return "standard";
  }

  // TymeBank / Discovery / others tend to use "Amount"/"Description"
  // pairs; if we got here we haven't matched more specific
  // signatures.
  if (has("date") && has("amount") && has("description")) {
    return "tymebank";
  }

  return "unknown";
}

// ---------------------------------------------------------------------------
// Per-bank row mappers
// ---------------------------------------------------------------------------

type RowMapper = (
  row: Record<string, string>,
  index: number,
) => RawTransaction | null;

function getMapper(bank: BankId, headers: readonly string[]): RowMapper {
  switch (bank) {
    case "capitec":
      return capitecMapper;
    case "absa":
    case "nedbank":
      return debitCreditMapper;
    case "fnb":
      return signedAmountMapper("amount");
    case "standard":
      return signedAmountMapper("value");
    case "tymebank":
    case "discovery":
      return signedAmountMapper("amount");
    default:
      return genericMapper(headers);
  }
}

/**
 * Capitec: `Date`, `Description`, `Money In`, `Money Out`, `Balance`.
 * Direction is unambiguous (only one of Money In / Money Out is
 * populated per row).
 */
const capitecMapper: RowMapper = (row, i) => {
  const dateStr = pickField(row, ["date", "transaction date"]);
  const desc = pickField(row, ["description", "transaction description", "detail"]);
  const inAmount = parseAmount(pickField(row, ["money in", "moneyin", "credit"]));
  const outAmount = parseAmount(pickField(row, ["money out", "moneyout", "debit"]));

  const occurredAt = parseDate(dateStr);
  if (occurredAt === null || !desc) return null;

  let direction: Direction;
  let amount: number;
  if (inAmount !== null && inAmount > 0 && (outAmount === null || outAmount === 0)) {
    direction = "in";
    amount = inAmount;
  } else if (outAmount !== null && outAmount > 0 && (inAmount === null || inAmount === 0)) {
    direction = "out";
    amount = outAmount;
  } else {
    // Both empty or both filled → ambiguous, drop it.
    return null;
  }

  return {
    occurredAt,
    direction,
    amount,
    description: normaliseWhitespace(desc),
    counterpartyName: extractCounterparty(desc),
    reference: pickField(row, ["reference", "ref"]) || null,
    parserMeta: {
      parser: "csv:capitec",
      source_line_index: i + 2, // +1 for header, +1 for 1-based lines
    },
  };
};

/**
 * Absa / Nedbank shape: `Date`, `Description`, `Debit`, `Credit`,
 * `Balance`. Same disambiguation logic as Capitec.
 */
const debitCreditMapper: RowMapper = (row, i) => {
  const dateStr = pickField(row, ["date", "transaction date"]);
  const desc = pickField(row, ["description", "transaction description", "narrative"]);
  const debit = parseAmount(pickField(row, ["debit", "amount debited"]));
  const credit = parseAmount(pickField(row, ["credit", "amount credited"]));

  const occurredAt = parseDate(dateStr);
  if (occurredAt === null || !desc) return null;

  let direction: Direction;
  let amount: number;
  if (credit !== null && credit > 0 && (debit === null || debit === 0)) {
    direction = "in";
    amount = credit;
  } else if (debit !== null && debit > 0 && (credit === null || credit === 0)) {
    direction = "out";
    amount = debit;
  } else {
    return null;
  }

  return {
    occurredAt,
    direction,
    amount,
    description: normaliseWhitespace(desc),
    counterpartyName: extractCounterparty(desc),
    reference: pickField(row, ["reference", "ref"]) || null,
    parserMeta: {
      parser: "csv:debit_credit",
      source_line_index: i + 2,
    },
  };
};

/**
 * FNB / Standard / TymeBank shape: a single signed amount column
 * (positive = credit / in, negative = debit / out). Column name
 * varies by bank; we take it as a parameter.
 */
function signedAmountMapper(amountCol: string): RowMapper {
  return (row, i) => {
    const dateStr = pickField(row, ["date", "transaction date", "posting date"]);
    const desc = pickField(row, [
      "description",
      "transaction description",
      "narrative",
      "details",
    ]);
    const rawAmount = parseAmount(pickField(row, [amountCol, "amount", "value"]));

    const occurredAt = parseDate(dateStr);
    if (occurredAt === null || !desc || rawAmount === null) return null;
    if (rawAmount === 0) return null; // zero-value rows are typically metadata

    const direction: Direction = rawAmount >= 0 ? "in" : "out";
    return {
      occurredAt,
      direction,
      amount: Math.abs(rawAmount),
      description: normaliseWhitespace(desc),
      counterpartyName: extractCounterparty(desc),
      reference: pickField(row, ["reference", "ref"]) || null,
      parserMeta: {
        parser: `csv:signed:${amountCol}`,
        source_line_index: i + 2,
      },
    };
  };
}

/**
 * Generic fallback used when we couldn't identify the bank. Tries a
 * best-effort match against likely column names. This is the parser
 * of last resort — if it can't find both a date column and either a
 * signed amount OR a debit/credit pair, the row is dropped.
 */
function genericMapper(headers: readonly string[]): RowMapper {
  const norm = headers.map((h) => h.trim().toLowerCase());
  const has = (name: string) => norm.includes(name);

  // Guess whether we're in signed-amount land or debit/credit land.
  const hasDebitCredit = has("debit") && has("credit");
  const hasSignedAmount =
    has("amount") || has("value") || has("transaction amount");

  if (hasDebitCredit) return debitCreditMapper;
  if (hasSignedAmount) {
    const col = norm.find((n) => n === "amount" || n === "value" || n === "transaction amount");
    return signedAmountMapper(col ?? "amount");
  }

  // Absolute worst case: return a mapper that drops every row.
  // The warning we set earlier already tells the user we didn't
  // understand the layout.
  return () => null;
}

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Case-insensitive column lookup. Returns the first non-empty value
 * for any of the candidate column names.
 */
function pickField(
  row: Record<string, string>,
  candidates: readonly string[],
): string {
  for (const key of Object.keys(row)) {
    const lower = key.trim().toLowerCase();
    if (candidates.some((c) => lower === c.toLowerCase())) {
      const val = (row[key] ?? "").trim();
      if (val) return val;
    }
  }
  return "";
}

/**
 * Parse an amount cell into a number, or null if it doesn't look
 * like a number. Handles:
 *   * commas as thousand separators   ("1,234.56")
 *   * European decimals                ("1.234,56")
 *   * trailing/leading whitespace
 *   * negatives written as "(123.45)"  (parentheses)
 *   * negative sign either side        ("-100", "100-")
 *   * empty strings                    → null
 */
export function parseAmount(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  let cleaned = s;
  let negative = false;

  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    negative = true;
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.endsWith("-")) {
    negative = true;
    cleaned = cleaned.slice(0, -1);
  }
  if (cleaned.startsWith("-")) {
    negative = true;
    cleaned = cleaned.slice(1);
  }

  // Strip currency symbols + spaces.
  cleaned = cleaned.replace(/[R$€£\s]/g, "");

  // Decide between "1,234.56" and "1.234,56" heuristically: if the
  // last separator is a period, we're in en-ZA style; if it's a
  // comma, European style.
  const lastDot = cleaned.lastIndexOf(".");
  const lastComma = cleaned.lastIndexOf(",");
  if (lastDot > lastComma) {
    // period is decimal → strip commas
    cleaned = cleaned.replace(/,/g, "");
  } else if (lastComma > lastDot) {
    // comma is decimal → strip periods, then swap comma → period
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }

  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

/**
 * Parse a date cell into a UTC millisecond timestamp. Tries several
 * common SA bank formats in order of preference; returns null if
 * none match.
 *
 * Deliberately does NOT trust the browser's `new Date(str)` for
 * anything except ISO 8601 — that constructor accepts too many
 * formats and silently returns wrong values on ambiguity (e.g.
 * "01/03/2024" is 1 March or March 1st depending on locale).
 */
export function parseDate(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // ISO 8601: 2024-03-15 or 2024-03-15T10:20:30Z
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(
    s,
  );
  if (iso) {
    const [, y, m, d, hh = "0", mm = "0", ss = "0"] = iso;
    return Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss);
  }

  // Slashes: 15/03/2024 or 2024/03/15
  const slash = /^(\d{1,4})[\/.](\d{1,2})[\/.](\d{1,4})$/.exec(s);
  if (slash) {
    const [, a, b, c] = slash;
    // Pick which of a/c is the year by length.
    if (a.length === 4) {
      // yyyy/mm/dd
      return Date.UTC(+a, +b - 1, +c);
    }
    if (c.length === 4) {
      // dd/mm/yyyy (SA convention)
      return Date.UTC(+c, +b - 1, +a);
    }
  }

  // Named-month: "15 Mar 2024" or "15 March 2024"
  const named = /^(\d{1,2})\s+([a-z]{3,})\s+(\d{4})$/i.exec(s);
  if (named) {
    const [, d, monthName, y] = named;
    const m = MONTH_LOOKUP[monthName.toLowerCase().slice(0, 3)];
    if (m !== undefined) return Date.UTC(+y, m, +d);
  }

  return null;
}

const MONTH_LOOKUP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/**
 * Collapse runs of whitespace and trim, preserving the original
 * casing (banks capitalise inconsistently and the classifier's
 * pattern matching is case-insensitive anyway).
 */
export function normaliseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Best-effort counterparty extraction from a description string.
 * Strips known SA banking-jargon prefixes ("EFT-", "DEBIT ORDER",
 * "POS PURCHASE ", "ATM WITHDRAWAL", "PAYMENT TO") and returns
 * whatever's left. Returns null if the description is too short or
 * appears to be pure banking metadata with no counterparty.
 *
 * The classifier still gets the full description too, so a bad
 * extraction here doesn't lose signal — it just means the
 * `counterpartyName` field on the transaction is null.
 */
export function extractCounterparty(desc: string): string | null {
  let s = normaliseWhitespace(desc).toUpperCase();

  const PREFIXES = [
    "EFT PAYMENT TO",
    "EFT PAYMENT FROM",
    "EFT-",
    "EFT ",
    "DEBIT ORDER",
    "DR ORDER",
    "DEBORDER",
    "PAYMENT TO",
    "PAYMENT FROM",
    "POS PURCHASE",
    "POS ",
    "PURCHASE",
    "CARD PURCHASE",
    "IB TRANSFER TO",
    "IB TRANSFER FROM",
    "IB TRANSFER",
    "INTERNET TRANSFER",
    "IMMEDIATE PMT",
    "IMMEDIATE PAYMENT",
    "PAYSHAP TO",
    "PAYSHAP FROM",
    "PAYSHAP",
    "ATM WITHDRAWAL",
    "ATM CASH DEP",
    "CASH DEPOSIT",
    "CASH WITHDRAWAL",
    "CASH SEND",
  ];

  for (const p of PREFIXES) {
    if (s.startsWith(p)) {
      s = s.slice(p.length).replace(/^[-\s]+/, "").trim();
      break;
    }
  }

  // Common SUFFIXES that are payment metadata, not counterparty info.
  const SUFFIX_TOKENS = [
    /\b[A-Z]{3}\d+\s*$/, // reference codes like "REF12345"
    /\s+\d{6,}\s*$/, // trailing long digit strings
    /\s+\d{2}\/\d{2}\/\d{4}\s*$/, // dates appended
  ];
  for (const rx of SUFFIX_TOKENS) {
    s = s.replace(rx, "").trim();
  }

  // Too short after stripping → nothing useful left.
  if (s.length < 2) return null;

  return s;
}

// ---------------------------------------------------------------------------
// Empty-statement helper
// ---------------------------------------------------------------------------

function emptyStatement(
  filename: string,
  fileHash: string,
  warnings: string[],
): RawParsedStatement {
  return {
    bank: "unknown",
    filename,
    fileHash,
    accountRef: null,
    periodStart: null,
    periodEnd: null,
    openingBalance: null,
    closingBalance: null,
    transactions: [],
    dropped: 0,
    warnings,
  };
}

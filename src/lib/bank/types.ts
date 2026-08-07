/**
 * Shared vocabulary for the bank-statement importer (PR #23).
 *
 * The types in this file are the shape the parser (`csv.ts`, `pdf.ts`)
 * hands to the classifier (`classify.ts`), the classifier hands to the
 * recurring-detection pass (`recurring.ts`), and the store finally
 * persists (via `remote.ts`) into `public.bank_transactions`.
 *
 * Every value-bearing field carries the *evidence envelope* introduced
 * in PR #22:
 *
 *   event_type    = 'bank_transaction'  (constant, enforced by DB CHECK)
 *   evidence_type = 'bank_statement_line' (constant)
 *   evidence_tier = 'observed'          (constant — never verified)
 *
 * The single most important invariant this file encodes:
 *
 *   ClassificationCategory has no `customer_sale` value. The type
 *   system makes it impossible to write code that infers a customer
 *   sale from a bank line — the row from "S. Dlamini — R5,000" can
 *   only be `unknown` (or one of the other explicit categories); it
 *   cannot be promoted into revenue.
 */

// ---------------------------------------------------------------------------
// Money movement direction
// ---------------------------------------------------------------------------

/**
 * Direction of the transaction from the account holder's perspective:
 *   'in'  — money arrived in the account (deposit, incoming EFT,
 *           salary, cash deposit, ...)
 *   'out' — money left the account (payment, purchase, withdrawal,
 *           bank fee, ...)
 *
 * The parser MUST determine this unambiguously from the statement
 * data — either from a "Debit" / "Credit" column, from the sign of
 * the amount, or from a bank-specific formatting convention. Rows
 * where direction can't be pinned down are dropped by the parser and
 * counted in `ParsedStatement.dropped`.
 */
export type Direction = "in" | "out";

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Categories the rules-based classifier can emit. Kept intentionally
 * conservative — better to leave something as `unknown` than to
 * pretend we know its business meaning.
 *
 * IMPORTANT: `customer_sale` is NOT in this list, and must not be.
 * If a future maintainer is tempted to add it, the correct move is
 * to leave those transactions as `unknown` and expose a user-tap-
 * to-reclassify affordance in the UI. The Financial Passport, the
 * KasiScore, and every future decision derived from bank data must
 * be able to trust that the classifier is not manufacturing revenue.
 */
export type ClassificationCategory =
  // No rule matched. This is the default landing spot for anything
  // the classifier isn't confident about — including all incoming
  // amounts from unknown counterparties. Never promoted anywhere
  // downstream without explicit user intervention.
  | "unknown"

  // Both legs of a transfer between the user's own accounts. Detected
  // via description patterns like "IB TRANSFER TO SAVINGS", "OWN
  // ACCT", "TFR TO ACC", plus (in `recurring.ts`) a matching-amount
  // pair in the opposite direction near the same timestamp.
  | "own_transfer"

  // Cash into the account (ATM cash deposit, retailer cash-send
  // received, over-the-counter deposit). Direction is always 'in'.
  | "cash_deposit"

  // Cash out of the account (ATM withdrawal, retailer cash-send sent,
  // over-the-counter withdrawal). Direction is always 'out'.
  | "cash_withdrawal"

  // Any bank-charged fee: monthly account fee, transaction fee, SMS
  // alerts, cash handling. Direction is always 'out'. Amounts are
  // typically small.
  | "bank_fee"

  // Prepaid airtime / mobile data purchase. MTN / Vodacom / Cell C /
  // Telkom Mobile / Rain, plus their prepaid vendor codes.
  | "airtime"

  // Utility payment: electricity (Eskom / prepaid meters), water
  // (municipality by name), rates, refuse.
  | "utility"

  // A payment that repeats on a monthly-ish cadence and looks like
  // rent, insurance, streaming, gym, or a subscription. Not always
  // right — the point is to flag "regular monthly cost" so the score
  // and passport can reason about it.
  | "rent_or_subscription"

  // Payment out to something that looks like a supplier/wholesaler:
  // Boxer, Makro, Elite Cash & Carry, Cambridge Food, Shoprite USave,
  // Pick n Pay Wholesale, Metro Cash & Carry, etc. This is the
  // strongest expense-side signal for a small kasi business.
  | "supplier_like"

  // Regular monthly inflow that looks like a salary. Only fires when
  // both the amount is >= a threshold AND the counterparty repeats
  // month-on-month. Deliberately conservative — mislabelling an
  // occasional big customer payment as "salary" would bias the score.
  | "salary_like"

  // Stokvel-related activity: description contains "STOKVEL",
  // "GOOISA", or matches a known stokvel bank reference from within
  // KasiKash (future — for now, description-match only).
  | "stokvel_related"

  // Debit orders / EFTs to known SA lenders: Capfin, Bayport, African
  // Bank, Blue Label, Wonga, ..., or descriptions containing "LOAN".
  | "loan_repayment"

  // Money coming back into the account: refunds, reversed payments,
  // salary corrections. Amount is 'in'.
  | "refund";

/**
 * All classifications that represent OUTFLOWS. The classifier + the
 * scorer + the passport all use this to sanity-check that we never
 * accidentally read a `bank_fee` on the inflow side.
 */
export const OUTFLOW_CATEGORIES: readonly ClassificationCategory[] = [
  "bank_fee",
  "airtime",
  "utility",
  "rent_or_subscription",
  "supplier_like",
  "loan_repayment",
  "cash_withdrawal",
] as const;

/**
 * Classifications that can only be INFLOWS.
 */
export const INFLOW_CATEGORIES: readonly ClassificationCategory[] = [
  "cash_deposit",
  "salary_like",
  "refund",
] as const;

/**
 * Classifications that may be either direction (own transfer either
 * side; stokvel could be a contribution or a payout; unknown is
 * either by default).
 */
export const AMBIGUOUS_DIRECTION_CATEGORIES: readonly ClassificationCategory[] = [
  "unknown",
  "own_transfer",
  "stokvel_related",
] as const;

/**
 * The source that emitted a classification. Only 'rules' is in scope
 * for PR #23; 'user' and 'community' land in follow-up PRs.
 */
export type ClassificationSource = "rules" | "user" | "community";

/**
 * Bank identifier used to pick a PDF-format-specific extractor.
 * Kept as a union type so callers get autocomplete and typos fail at
 * compile time.
 */
export type BankId =
  | "capitec"
  | "fnb"
  | "absa"
  | "standard"
  | "nedbank"
  | "tymebank"
  | "discovery"
  | "investec"
  | "african_bank"
  | "unknown";

// ---------------------------------------------------------------------------
// Parser output
// ---------------------------------------------------------------------------

/**
 * A single parsed line from a statement, before classification.
 * Represents "the bank says this thing happened, on this date, for
 * this amount, described as X, from/to this counterparty".
 *
 * Parsers are expected to produce this shape and no more. They do
 * NOT run the classifier or the recurrence detector — those are
 * separate passes so each can be unit-tested independently.
 */
export type RawTransaction = {
  /**
   * When the bank reports the transaction occurred. Some statements
   * give only a date (in which case timestamp is midnight of that
   * date in the local timezone); others give a full datetime.
   */
  occurredAt: number; // ms since epoch

  direction: Direction;

  /** Always positive. Direction carries the sign. */
  amount: number;

  /**
   * Verbatim description from the statement, subject only to
   * whitespace normalisation. Preserved for audit + future
   * re-classification.
   */
  description: string;

  /**
   * The counterparty the parser was able to pull out of the
   * description. May be null when the description is too opaque
   * (e.g. "PAYMENT" alone) — the classifier will still see the raw
   * description and can make a best-effort guess.
   */
  counterpartyName: string | null;

  /** Optional sub-reference / payment note. Bank-specific. */
  reference: string | null;

  /**
   * Parser-provenance metadata. Typical keys:
   *   parser: 'capitec_pdf' | 'fnb_pdf' | 'generic_pdf' | 'csv'
   *   source_line_index: number  (which row/line in the original)
   *   raw_columns: Record<string,string> (CSV only)
   *   pdf_page: number
   *   confidence: number (parser confidence, 0–1)
   */
  parserMeta: Record<string, unknown>;
};

/**
 * A `RawTransaction` after the classifier has looked at it.
 * Deliberately additive — nothing on the raw shape is mutated.
 */
export type ClassifiedTransaction = RawTransaction & {
  classification: ClassificationCategory;
  classificationConfidence: number; // 0–1
  classificationSource: ClassificationSource;
  /** True after the recurrence detector links this to a repeating pattern. */
  isRecurring: boolean;
};

/**
 * Metadata about a parsed statement that's constant across the raw
 * and classified stages. Kept as a base type so `RawParsedStatement`
 * and `ParsedStatement` don't duplicate 6 fields.
 */
type ParsedStatementBase = {
  bank: BankId;
  filename: string;
  /**
   * SHA-256 hex digest of the uploaded file bytes. Used for the
   * `UNIQUE (owner_id, file_hash)` idempotency check on
   * `bank_statements`. Computed by the caller (the import screen)
   * from the raw file — parsers don't touch the file bytes directly.
   */
  fileHash: string;

  /** Masked (last 4 digits) — never the full account number. */
  accountRef: string | null;

  periodStart: number | null; // ms
  periodEnd: number | null; // ms

  openingBalance: number | null;
  closingBalance: number | null;

  /**
   * Parser diagnostics — a count of rows that were seen but couldn't
   * be unambiguously turned into a `RawTransaction`. Surfaced in the
   * import screen so the user knows if a statement was only partially
   * imported.
   */
  dropped: number;

  /**
   * Optional warnings the parser wants to surface to the user
   * (e.g. "Unknown bank layout — using generic parser"). Kept short
   * and human-readable; not machine-consumed.
   */
  warnings: string[];
};

/**
 * Raw parser output. Every transaction is still unclassified. This
 * is the shape both `csv.ts` and `pdf.ts` return. An intermediate
 * `classifyStatement()` step (in `classify.ts`) turns this into a
 * `ParsedStatement` by classifying + detecting recurrence on each
 * transaction. Splitting the type in two makes it impossible to
 * accidentally persist a batch that skipped the classifier.
 */
export type RawParsedStatement = ParsedStatementBase & {
  transactions: RawTransaction[];
};

/**
 * A fully-classified parsed statement ready to hand to the store's
 * `addBankStatement` action. Contains everything needed to insert
 * one `bank_statements` row + N `bank_transactions` rows in one call.
 */
export type ParsedStatement = ParsedStatementBase & {
  /**
   * Successfully-parsed AND classified transactions in the order the
   * parser produced them. Callers should not rely on any particular
   * ordering; the store persists by occurred_at.
   */
  transactions: ClassifiedTransaction[];
};

// ---------------------------------------------------------------------------
// Idempotency
// ---------------------------------------------------------------------------

/**
 * Fingerprint input. The store's `addBankStatement` computes the
 * SHA-256 hash of the canonicalised concatenation of these fields
 * and stores it in `bank_transactions.fingerprint`. Because Postgres
 * has UNIQUE (owner_id, fingerprint), re-importing an overlapping
 * statement upserts onto the existing rows instead of duplicating.
 *
 * Small but important: the counterparty *hash*, not the raw name,
 * feeds the fingerprint. That way, whitespace / capitalisation
 * differences ("Boxer Cash", "BOXER CASH", "boxer  cash") produce
 * the same fingerprint.
 */
export type FingerprintInput = {
  occurredAt: number;
  amount: number;
  direction: Direction;
  counterpartyHash: string; // SHA-256 hex of normalised counterparty
  descriptionHash: string; // SHA-256 hex of trimmed raw description
};

/**
 * The result of a `addBankStatement` call. The UI uses these numbers
 * to render a "we imported N transactions, K were duplicates, M were
 * dropped" summary after the upload succeeds.
 */
export type ImportSummary = {
  statementId: string; // uuid of the bank_statements row
  totalTransactions: number; // rows the parser emitted
  inserted: number; // brand-new rows the DB accepted
  duplicates: number; // rows already present via fingerprint
  dropped: number; // rows the parser couldn't understand
  warnings: string[];
};

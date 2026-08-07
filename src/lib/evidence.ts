/**
 * Evidence taxonomy for KasiKash (introduced in PR #22).
 *
 * The old data model treated every "value-bearing" record — a sale, a
 * contribution, a receipt — as an equally-trusted fact once it landed
 * in the database. That collapsed a rich question ("what evidence do
 * we actually have that this business earned R32,400 last month?")
 * into a poor answer ("we have 500 rows in the sales table, so yes").
 *
 * This module introduces three orthogonal facets that every
 * value-bearing record now carries:
 *
 *   1. eventType     — what happened in the business?
 *                      e.g. `sale`, `expense`, `contribution_in`,
 *                           `tab_created`, `tab_settled`.
 *
 *   2. evidenceType  — what artefact do we have as proof?
 *                      e.g. `voice_log`, `manual_entry`,
 *                           `supplier_receipt`, `yoco_transaction`,
 *                           `admin_confirmation`.
 *
 *   3. evidenceTier  — how independent is that artefact?
 *                      `declared`  = self-reported, no external trace
 *                      `observed`  = real digital artefact, single-party
 *                      `verified`  = independent third-party confirmation
 *
 * The KasiScore weighs signals by tier. The Financial Passport shows
 * declared vs observed side-by-side instead of collapsing them into a
 * single "turnover" number. Future features (bank-statement import,
 * open banking) plug in as new evidenceType values without touching
 * the scorer or passport.
 *
 * A fourth field, `provenance`, stores free-form metadata about how
 * the record got here — image hash for a receipt, webhook id for a
 * Yoco payment, statement upload id for a bank line. Never used in
 * scoring; kept so a future audit / debugging session has everything
 * available.
 *
 * IMPORTANT: this module is intentionally free of runtime dependencies
 * on any other KasiKash module. It's a small, pure classifier so it
 * can be exercised by tests in isolation, and its shape can move to
 * the server-side (for the SQL backfill migration 010) without
 * dragging half the frontend along.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Business-level event types. Answers "what actually happened?".
 *
 * When you add a value: also add SQL backfill logic in migration 010
 * for any existing rows that should carry the new value, and update
 * the score / passport code paths that filter by event_type.
 */
export type EventType =
  | "sale" // business owner sold something to a customer
  | "expense" // business owner bought something (supplies, rent, ...)
  | "contribution_in" // money into stokvel (member -> pot)
  | "contribution_out" // money out of stokvel (payout / withdrawal). Future.
  | "tab_created" // customer bought on credit
  | "tab_settled" // customer paid off their tab
  | "cash_deposit" // owner deposited cash into their bank. Future (PR #23+).
  | "loan_disbursement" // future — KasiKash-issued credit
  | "loan_repayment"; // future

/**
 * Evidence types. Answers "what artefact do we hold as proof?".
 *
 * These are technology-agnostic labels for the SOURCE of the record,
 * not the event. A Yoco card transaction and a Yoco PayShap request
 * would both be `yoco_transaction` because the underlying artefact is
 * the same webhook payload.
 */
export type EvidenceType =
  | "voice_log" // owner spoke a sentence into the app
  | "manual_entry" // owner typed values into a form
  | "supplier_receipt" // OCR-parsed image of a physical receipt
  | "yoco_transaction" // Yoco webhook (card / PayShap)
  | "bank_statement_line" // parsed line from an uploaded bank statement. PR #23.
  | "whatsapp_bot_message" // parsed WhatsApp inbound text
  | "admin_confirmation" // a stokvel admin verified this event happened
  | "kasikash_ledger"; // KasiKash-owned money movement (future loans)

/**
 * Evidence tiers. Answers "how independent is that proof?".
 *
 * The tier does *not* say "we've cryptographically verified the
 * underlying claim" — even a `verified` Yoco transaction could,
 * theoretically, be gamed. It says "this data came from a source
 * outside the user's direct self-report". Higher tier means more
 * things had to be true for the record to exist.
 */
export type EvidenceTier = "declared" | "observed" | "verified";

/**
 * Provenance is a free-form JSON blob that carries source-specific
 * metadata. Not used in scoring; kept for audit + debug + future
 * ML training.
 *
 * Typical shapes (all optional, all extensible):
 *
 *   voice_log:         { spoken_language: 'zu', raw_transcript: '...' }
 *   supplier_receipt:  { ocr_confidence: 0.87, image_hash: '...',
 *                        edited_fields: ['qty'], user_removed_lines: 2 }
 *   yoco_transaction:  { webhook_id: '...', charge_id: '...',
 *                        signature_verified: true, is_test: false }
 *   admin_confirmation:{ confirmed_by: 'uuid', confirmed_at_ms: 1690... }
 *   bank_statement_line:{ statement_id: '...', bank: 'capitec',
 *                         counterparty_hash: '...', category: 'supplier' }
 */
export type Provenance = Record<string, unknown>;

/**
 * Every value-bearing record now carries this envelope. Callers should
 * treat all four fields as required going forward. For backwards
 * compatibility with rows written before PR #22, `classifyLegacySale`
 * / `classifyLegacyContribution` / `classifyLegacyTab` return the same
 * shape from the pre-migration source fields.
 */
export type EvidenceEnvelope = {
  eventType: EventType;
  evidenceType: EvidenceType;
  evidenceTier: EvidenceTier;
  provenance: Provenance;
};

// ---------------------------------------------------------------------------
// Tier weights
// ---------------------------------------------------------------------------

/**
 * Multiplicative weights applied to any signal that references a
 * value-bearing record. See `src/lib/score.ts` for consumers.
 *
 * IMPORTANT: these numbers are Phase-1 heuristics — reasonable
 * starting points, not conclusions. Once KasiKash has enough
 * repayment data to correlate signals against real defaults, these
 * weights should be replaced with data-driven values. Do not treat
 * them as load-bearing product logic.
 */
export const TIER_WEIGHT: Record<EvidenceTier, number> = {
  declared: 0.2,
  observed: 0.7,
  verified: 1.0,
};

/**
 * Human-readable ordinal for tier comparison. Higher = more
 * independent. Used by aggregate helpers such as
 * `overallConfidence`.
 */
export const TIER_RANK: Record<EvidenceTier, number> = {
  declared: 0,
  observed: 1,
  verified: 2,
};

// ---------------------------------------------------------------------------
// Classifiers — pre-migration legacy field -> new taxonomy
//
// These are the same rules the migration 010 SQL uses to backfill
// historical rows. Kept in TypeScript too so the client can
// gracefully upgrade rows fetched from a not-yet-migrated backend, and
// so the logic is unit-testable in isolation.
// ---------------------------------------------------------------------------

/**
 * Legacy sale.source values before PR #22.
 */
export type LegacySaleSource = "voice" | "manual" | "receipt";

/**
 * Classify a legacy sale row (identified by its `source` field) into
 * the new evidence taxonomy.
 *
 * Notable rule: a `receipt`-sourced row is NOT classified as a sale.
 * Historically these rows represented items OCR'd from a supplier
 * receipt — evidence that the owner BOUGHT stock, not that they SOLD
 * anything to a customer. PR #22 fixes this by reclassifying them as
 * `event_type = 'expense'` in place (the row is preserved, only
 * re-labelled). See migration 010 for the DB-side backfill.
 *
 * Voice- and manual-sourced rows keep event_type = 'sale' with
 * `declared` tier, which honestly reflects that they were
 * self-reported with no external corroboration.
 */
export function classifyLegacySale(
  source: LegacySaleSource | null | undefined,
): EvidenceEnvelope {
  switch (source) {
    case "voice":
      return {
        eventType: "sale",
        evidenceType: "voice_log",
        evidenceTier: "declared",
        provenance: { legacy_source: "voice" },
      };
    case "receipt":
      // Reclassification: this row was miscategorised as a sale by
      // the pre-PR-22 ScanReceipt flow. It's really an expense.
      // Preserving the row (per the "don't overwrite raw events" rule)
      // but re-labelling its event type.
      return {
        eventType: "expense",
        evidenceType: "supplier_receipt",
        evidenceTier: "observed",
        provenance: {
          legacy_source: "receipt",
          reclassified_from: "sales_v1_receipt",
          reclassified_at: "PR22",
        },
      };
    case "manual":
    case null:
    case undefined:
    default:
      return {
        eventType: "sale",
        evidenceType: "manual_entry",
        evidenceTier: "declared",
        provenance: { legacy_source: source ?? "manual" },
      };
  }
}

/**
 * Legacy contribution row shape needed for classification. Fields
 * come from migration 007's `contributions` schema.
 */
export type LegacyContributionSource = {
  method?: string | null;
  status?: string | null;
  payment_id?: string | null;
};

/**
 * Classify a legacy contribution row into the new taxonomy.
 *
 * Rules:
 *   - Yoco-originated contributions (method='yoco' or has payment_id)
 *     are Verified: they came from a card processor's webhook, so
 *     the money movement actually happened at a third party.
 *   - Admin-confirmed non-Yoco contributions are Observed: an
 *     independent party (the stokvel admin) inspected an EFT / cash
 *     handover and marked it real. Not tamper-proof, but not purely
 *     self-report either.
 *   - Everything else — pending, rejected, unclassified — is Declared.
 *     The member said they paid, but nobody outside them has confirmed
 *     it yet.
 */
export function classifyLegacyContribution(
  row: LegacyContributionSource,
): EvidenceEnvelope {
  const method = (row.method ?? "").toLowerCase();
  const status = (row.status ?? "").toLowerCase();
  const hasYocoTrace = method === "yoco" || Boolean(row.payment_id);

  if (hasYocoTrace) {
    return {
      eventType: "contribution_in",
      evidenceType: "yoco_transaction",
      evidenceTier: "verified",
      provenance: {
        legacy_method: row.method ?? null,
        legacy_payment_id: row.payment_id ?? null,
      },
    };
  }

  if (status === "confirmed") {
    return {
      eventType: "contribution_in",
      evidenceType: "admin_confirmation",
      evidenceTier: "observed",
      provenance: {
        legacy_method: row.method ?? null,
        legacy_status: "confirmed",
      },
    };
  }

  return {
    eventType: "contribution_in",
    evidenceType: "manual_entry",
    evidenceTier: "declared",
    provenance: {
      legacy_method: row.method ?? null,
      legacy_status: row.status ?? null,
    },
  };
}

/**
 * Legacy tab row shape.
 */
export type LegacyTabSource = {
  paid?: boolean | null;
};

/**
 * Classify a legacy tab.
 *
 * A tab existing at all is a `tab_created` event; a tab flipped to
 * paid=true is `tab_settled`. Both are Declared tier — the owner
 * says the customer bought on credit / paid off their debt, and we
 * have no independent proof (the customer confirming would still be
 * peer-attested, which per the friends-and-family concern doesn't
 * warrant a higher tier).
 */
export function classifyLegacyTab(row: LegacyTabSource): EvidenceEnvelope {
  if (row.paid === true) {
    return {
      eventType: "tab_settled",
      evidenceType: "manual_entry",
      evidenceTier: "declared",
      provenance: { legacy_paid: true },
    };
  }
  return {
    eventType: "tab_created",
    evidenceType: "manual_entry",
    evidenceTier: "declared",
    provenance: { legacy_paid: false },
  };
}

// ---------------------------------------------------------------------------
// Aggregate helpers
// ---------------------------------------------------------------------------

/**
 * Given a collection of records with envelopes, return the fraction
 * whose tier is >= `observed`. This is the raw signal behind the
 * "evidence confidence" number shown on the Financial Passport.
 *
 * Returns null (not 0!) when there are no records — the caller can
 * decide whether to render "no data" or a default. Returning 0 would
 * imply "100% low-tier evidence", which is wrong.
 */
export function observedOrBetterRatio(
  records: readonly { evidenceTier?: EvidenceTier }[],
): number | null {
  if (records.length === 0) return null;
  let hits = 0;
  for (const r of records) {
    const tier = r.evidenceTier ?? "declared";
    if (TIER_RANK[tier] >= TIER_RANK.observed) hits++;
  }
  return hits / records.length;
}

/**
 * Roll up a ratio into a coarse confidence label used by the passport
 * badge. Bands are picked so a spaza with mostly-declared data lands
 * on "low", a mix of declared + admin-confirmed contributions on
 * "medium", and a Yoco-heavy account on "high".
 */
export type ConfidenceLabel = "unknown" | "low" | "medium" | "high";

export function confidenceFromRatio(
  ratio: number | null,
): ConfidenceLabel {
  if (ratio === null) return "unknown";
  if (ratio >= 0.5) return "high";
  if (ratio >= 0.2) return "medium";
  return "low";
}

/**
 * Sum the tier-weighted value of a set of records. Callers pass in a
 * value-extractor so the same function works for revenue rands, tab
 * amounts, contribution rands, etc.
 *
 * A record missing `evidenceTier` is treated as `declared` — the
 * safest default for score computation.
 */
export function weightedSum<T extends { evidenceTier?: EvidenceTier }>(
  records: readonly T[],
  valueOf: (r: T) => number,
): number {
  let total = 0;
  for (const r of records) {
    const tier = r.evidenceTier ?? "declared";
    total += TIER_WEIGHT[tier] * valueOf(r);
  }
  return total;
}

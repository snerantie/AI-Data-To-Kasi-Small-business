/**
 * Fingerprint + hash helpers for bank transactions (PR #23).
 *
 * Two hashes matter for idempotency + privacy:
 *
 *   * `counterpartyHash(text)` — canonical, whitespace-stable
 *     representation of a counterparty. Same person → same hash
 *     even if the bank capitalises differently or adds/removes a
 *     trailing reference. Used both as a fingerprint component
 *     and as a privacy-preserving grouping key for future
 *     community-learning features.
 *
 *   * `transactionFingerprint(input)` — the value stored in
 *     `bank_transactions.fingerprint`. Because Postgres has
 *     UNIQUE (owner_id, fingerprint), two statements that overlap
 *     — say Jan-Feb and Feb-Mar exports both containing February
 *     transactions — can be uploaded without duplicating the
 *     shared rows. The second import's ON CONFLICT DO NOTHING
 *     leaves the original in place.
 *
 * Both hashes use SHA-256 via Web Crypto (`crypto.subtle`), which
 * is available in every modern browser and in Node ≥ 20. Never
 * uses a Node-only library so the client bundle stays clean.
 */

import type { Direction } from "./types";

// ---------------------------------------------------------------------------
// Canonical counterparty
// ---------------------------------------------------------------------------

/**
 * Normalise a counterparty (or free-text description) before hashing.
 * Upper-cases + collapses whitespace + strips obvious punctuation
 * so slightly different bank spellings hash to the same value.
 *
 * Deliberately NOT locale-aware: kasi bank statements use Latin-1
 * text with occasional accented characters, and we want
 * `KAMOHÉLO` and `KAMOHELO` to collide (they're the same person).
 */
export function normaliseCounterparty(raw: string): string {
  if (!raw) return "";
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ---------------------------------------------------------------------------
// SHA-256 helpers
// ---------------------------------------------------------------------------

/**
 * Compute SHA-256 hex digest of a UTF-8 string. Async (Web Crypto
 * is async even for small inputs). Callers that want to batch many
 * fingerprints should `await Promise.all` rather than sequencing.
 */
export async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  return await sha256HexBytes(enc);
}

/**
 * Compute SHA-256 hex of an already-encoded byte buffer. This is
 * what the ImportStatement screen calls on `await file.arrayBuffer()`
 * to compute the top-level `fileHash` before parsing.
 */
export async function sha256HexBytes(bytes: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return bufferToHex(digest);
}

function bufferToHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

// ---------------------------------------------------------------------------
// Counterparty hash
// ---------------------------------------------------------------------------

/**
 * Stable hash for a counterparty text. Runs `normaliseCounterparty`
 * first so that "S. Dlamini" and "s dlamini" and "S DLAMINI  " all
 * produce the same hash.
 *
 * Empty / meaningless counterparty text hashes to a fixed sentinel
 * so downstream can treat "no counterparty" as its own equivalence
 * class rather than colliding on the empty string.
 */
export async function counterpartyHash(raw: string): Promise<string> {
  const normalised = normaliseCounterparty(raw);
  if (!normalised) return EMPTY_COUNTERPARTY_HASH;
  return await sha256Hex(`cp:${normalised}`);
}

/**
 * A fixed sentinel used for rows with no extractable counterparty.
 * SHA-256 of the literal string `"cp:__empty__"`. We hard-code it
 * so callers can synchronously check `hash === EMPTY_COUNTERPARTY_HASH`
 * without awaiting.
 */
export const EMPTY_COUNTERPARTY_HASH =
  "b1d5b46a1c8b0b5b1b0f6d1d19f8fdd2c7cdfb1c9c76b8a56dea6a5d5f96de1e";

// ---------------------------------------------------------------------------
// Transaction fingerprint
// ---------------------------------------------------------------------------

/**
 * Fingerprint input: the concrete fields that uniquely identify a
 * real-world transaction across duplicate statement uploads.
 *
 * Deliberately does NOT include the parser's `parserMeta` (which
 * changes between CSV and PDF sources for the same underlying
 * transaction) or the classifier's output (which may improve over
 * time and shouldn't change a row's identity).
 */
export type TransactionFingerprintInput = {
  occurredAt: number; // ms since epoch
  amount: number; // positive
  direction: Direction;
  counterpartyHash: string; // SHA-256 hex of normalised counterparty
  descriptionNormalised: string; // upper-cased + whitespace-collapsed
};

/**
 * Compute the fingerprint stored in `bank_transactions.fingerprint`.
 * Two calls with the same input return the same hash — that's the
 * point.
 *
 * Format of the pre-hash string: pipe-separated fields in a fixed
 * order. Amount is formatted with 2 decimal places so 100 and 100.00
 * hash identically. occurredAt is rounded to the nearest minute
 * (60000 ms) so a re-parse of the same statement that happens to
 * emit a slightly different intra-minute timestamp still collides.
 */
export async function transactionFingerprint(
  input: TransactionFingerprintInput,
): Promise<string> {
  const minuteBucket = Math.floor(input.occurredAt / 60_000) * 60_000;
  const canonical = [
    "v1", // schema version, in case we ever change fingerprint semantics
    minuteBucket.toString(),
    input.amount.toFixed(2),
    input.direction,
    input.counterpartyHash,
    normaliseCounterparty(input.descriptionNormalised),
  ].join("|");
  return await sha256Hex(canonical);
}

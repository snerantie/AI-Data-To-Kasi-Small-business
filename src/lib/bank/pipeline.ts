/**
 * Statement-processing pipeline (PR #23).
 *
 * A single entry point the ImportStatement screen calls after the
 * user picks a file. Runs the parser → classifier → recurrence
 * detector → fingerprinter as one composed step so the screen
 * doesn't need to know about the individual modules.
 *
 * The pipeline is intentionally split from `csv.ts` and `pdf.ts`
 * because parsing is stateless data-shape work but the pipeline
 * couples it with hashing (Web Crypto, async) and classification
 * (rule library, synchronous) in a specific order.
 */

import { classifyTransactions } from "./classify";
import { detectRecurring } from "./recurring";
import {
  counterpartyHash,
  sha256Hex,
  transactionFingerprint,
} from "./fingerprint";
import type {
  ClassifiedTransaction,
  ParsedStatement,
  RawParsedStatement,
} from "./types";

/**
 * A ClassifiedTransaction plus the hashes needed to persist it.
 * `counterpartyHash` matches the `counterparty_hash` column and
 * `fingerprint` matches the `fingerprint` column of
 * `bank_transactions`.
 */
export type PersistableTransaction = ClassifiedTransaction & {
  counterpartyHash: string;
  fingerprint: string;
};

/**
 * The fully-processed statement handed to the store's
 * `addBankStatement` action. Same-shape-as `ParsedStatement` but
 * with the persistence hashes filled in.
 */
export type PersistableStatement = Omit<ParsedStatement, "transactions"> & {
  transactions: PersistableTransaction[];
};

/**
 * Full pipeline. Runs synchronously except for the SHA-256 hashes,
 * which need Web Crypto. Total time on a 200-transaction statement
 * is typically under 100 ms on a mid-range phone.
 *
 * Any parser (CSV or PDF) can feed this — it works off the shared
 * `RawParsedStatement` shape.
 */
export async function processStatement(
  raw: RawParsedStatement,
): Promise<PersistableStatement> {
  // 1. Classify each transaction. Synchronous.
  const classified = classifyTransactions(raw.transactions);

  // 2. Second-pass recurrence + own-transfer pairing. Also sync.
  const withRecurrence = detectRecurring(classified);

  // 3. Compute the two hashes each row needs before it can be
  //    inserted. Awaited in parallel — SHA-256 is CPU-bound but the
  //    subtle API is async, and doing them one at a time on a 200-
  //    row statement can add a few ms of latency.
  const persistable = await Promise.all(
    withRecurrence.map(async (t) => {
      const cpHash = await counterpartyHash(
        t.counterpartyName ?? t.description,
      );
      const descHash = await sha256Hex(t.description);
      const fp = await transactionFingerprint({
        occurredAt: t.occurredAt,
        amount: t.amount,
        direction: t.direction,
        counterpartyHash: cpHash,
        descriptionNormalised: descHash,
      });
      return {
        ...t,
        counterpartyHash: cpHash,
        fingerprint: fp,
      };
    }),
  );

  return {
    ...raw,
    transactions: persistable,
  };
}

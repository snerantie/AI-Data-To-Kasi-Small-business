/**
 * Client-side PDF bank-statement parser (PR #23).
 *
 * SA bank statements are typically distributed as PDFs. Their
 * layouts are inconsistent across banks and even across statement
 * types within a bank, so we do this in three passes:
 *
 *   1. Extract every text line from every page using pdfjs-dist.
 *      Runs entirely in the browser; the PDF bytes never leave the
 *      device.
 *
 *   2. Detect which bank produced the file by sniffing distinctive
 *      strings in the header ("CAPITEC BANK", "First National Bank",
 *      etc.). Falls back to 'unknown' + a generic line parser.
 *
 *   3. Run a bank-specific line-to-transaction extractor. Each
 *      extractor is a small state machine that walks the text lines,
 *      recognises "this looks like a transaction row" patterns, and
 *      emits `RawTransaction`s. Rows that don't match cleanly are
 *      dropped and counted in `RawParsedStatement.dropped`.
 *
 * The parser is intentionally conservative. It's better to drop 5%
 * of transactions than to invent them, because a mis-parsed row
 * ends up as data the KasiScore trusts. The classifier downstream
 * treats every emitted row as `observed` tier evidence — high stakes.
 *
 * pdfjs-dist is dynamically imported so it doesn't bloat the initial
 * bundle. Users who never open the import screen never pay for it.
 */

import type {
  BankId,
  Direction,
  RawParsedStatement,
  RawTransaction,
} from "./types";
import {
  extractCounterparty,
  normaliseWhitespace,
  parseAmount,
  parseDate,
} from "./csv";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function parsePdfStatement(
  file: File,
  fileHash: string,
): Promise<RawParsedStatement> {
  const warnings: string[] = [];

  // Dynamic import — see the module comment above.
  const pdfjs = await import("pdfjs-dist");

  // Vite bundles the worker as a separate chunk. `import.meta.url`
  // resolves relative to this module at build time so the worker's
  // path stays correct after asset hashing.
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      // Explicit .mjs — pdfjs-dist 6.x ships an ES module worker.
      "pdfjs-dist/build/pdf.worker.mjs",
      import.meta.url,
    ).toString();
  }

  let text: PageText[];
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    text = await extractPagesText(pdfjs, buf);
  } catch (e) {
    return emptyStatement(file.name, fileHash, [
      `Could not read the PDF: ${e instanceof Error ? e.message : String(e)}`,
    ]);
  }

  if (text.length === 0) {
    return emptyStatement(file.name, fileHash, [
      "PDF contained no readable text. It may be a scanned image — try the CSV export from your bank app instead.",
    ]);
  }

  const bank = detectBankFromPdfText(text);
  if (bank === "unknown") {
    warnings.push(
      "Unrecognised statement layout — using the generic PDF parser. Some transactions may be missed. If you have a CSV export from your banking app, that usually parses more reliably.",
    );
  }

  const accountRef = extractAccountRef(text);

  // Delegate to the bank-specific extractor.
  const { transactions, dropped: extractDropped, additionalWarnings } =
    extractTransactions(bank, text);
  warnings.push(...additionalWarnings);

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
    accountRef,
    periodStart,
    periodEnd,
    openingBalance: null,
    closingBalance: null,
    transactions,
    dropped: extractDropped,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

type PageText = {
  page: number;
  /** Text lines in reading order. */
  lines: string[];
};

/**
 * Pull the text off every page in the PDF and reassemble it into
 * ordered lines. pdfjs returns per-item positioned text; we
 * reconstruct rows by grouping items whose Y-coordinate is within
 * a small band, then joining them left-to-right by X. This works
 * for most bank PDFs which are effectively laid-out text (not scans).
 */
async function extractPagesText(
  pdfjs: typeof import("pdfjs-dist"),
  bytes: Uint8Array,
): Promise<PageText[]> {
  const loadingTask = pdfjs.getDocument({ data: bytes });
  const doc = await loadingTask.promise;
  const pages: PageText[] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();

    // Each item has a `transform` array [a,b,c,d,e,f] where (e,f) is
    // the position. We're only interested in `f` (Y) for grouping
    // and `e` (X) for horizontal ordering. Bigger `f` == higher on
    // page (PDF coordinate system).
    type Item = { str: string; x: number; y: number };
    const items: Item[] = [];
    for (const raw of content.items as Array<{
      str?: string;
      transform?: number[];
    }>) {
      if (typeof raw.str !== "string" || !raw.str.trim()) continue;
      const t = raw.transform;
      if (!t || t.length < 6) continue;
      items.push({ str: raw.str, x: t[4], y: t[5] });
    }

    // Sort by y descending (top-down), then x ascending. Group into
    // rows by y proximity — items within 3pt of each other are the
    // same "line".
    items.sort((a, b) => (b.y - a.y) || a.x - b.x);
    const rows: string[] = [];
    let currentRow: Item[] = [];
    let currentY = Number.NaN;
    for (const it of items) {
      if (
        currentRow.length === 0 ||
        Math.abs(it.y - currentY) < 3
      ) {
        currentRow.push(it);
        currentY = currentY || it.y;
        if (currentRow.length === 1) currentY = it.y;
      } else {
        rows.push(joinRow(currentRow));
        currentRow = [it];
        currentY = it.y;
      }
    }
    if (currentRow.length > 0) rows.push(joinRow(currentRow));

    pages.push({ page: p, lines: rows });
  }

  return pages;
}

function joinRow(items: Array<{ str: string; x: number }>): string {
  items.sort((a, b) => a.x - b.x);
  return normaliseWhitespace(items.map((i) => i.str).join(" "));
}

// ---------------------------------------------------------------------------
// Bank detection from PDF text
// ---------------------------------------------------------------------------

export function detectBankFromPdfText(pages: PageText[]): BankId {
  // Scan the first 2 pages for distinctive strings.
  const preview = pages
    .slice(0, 2)
    .flatMap((p) => p.lines)
    .join("\n")
    .toUpperCase();

  if (/\bCAPITEC(\s+BANK)?\b/.test(preview)) return "capitec";
  if (/\bFIRST NATIONAL BANK\b/.test(preview) || /\bFNB\b/.test(preview))
    return "fnb";
  if (/\bABSA\b/.test(preview)) return "absa";
  if (/\bSTANDARD BANK\b/.test(preview)) return "standard";
  if (/\bNEDBANK\b/.test(preview)) return "nedbank";
  if (/\bTYMEBANK\b/.test(preview) || /\bTYME BANK\b/.test(preview))
    return "tymebank";
  if (/\bDISCOVERY BANK\b/.test(preview)) return "discovery";
  if (/\bINVESTEC\b/.test(preview)) return "investec";
  if (/\bAFRICAN BANK\b/.test(preview)) return "african_bank";

  return "unknown";
}

/**
 * Extract the account number from the statement header and return
 * only the last 4 digits (privacy-preserving). Returns null if we
 * can't find a plausible account number.
 */
function extractAccountRef(pages: PageText[]): string | null {
  const preview = pages
    .slice(0, 2)
    .flatMap((p) => p.lines)
    .join("\n");

  // "Account Number: 1234567890" or "Acc No 1234567890"
  const m = /(?:account|acc)\s*(?:number|no|nr|#)?\s*[:\-]?\s*(\d{6,12})/i.exec(
    preview,
  );
  if (m) {
    const digits = m[1];
    return `****${digits.slice(-4)}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Bank-specific transaction extractors
// ---------------------------------------------------------------------------

type ExtractResult = {
  transactions: RawTransaction[];
  dropped: number;
  additionalWarnings: string[];
};

function extractTransactions(bank: BankId, pages: PageText[]): ExtractResult {
  switch (bank) {
    case "capitec":
      return extractCapitec(pages);
    case "fnb":
      return extractFnb(pages);
    default:
      return extractGeneric(pages);
  }
}

/**
 * Capitec statement rows typically look like:
 *
 *   15 Mar 2024  EFT-BOXER CASH        250.00                500.00 Cr
 *   16 Mar 2024  CASH DEPOSIT                    1,000.00   1,500.00 Cr
 *
 * The date is at the start; description is next; then a Debit column
 * and a Credit column (only one populated). Balance is last, followed
 * by Dr/Cr indicator.
 */
function extractCapitec(pages: PageText[]): ExtractResult {
  const transactions: RawTransaction[] = [];
  let dropped = 0;
  const dateAtStart = /^(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/;

  for (const page of pages) {
    for (const line of page.lines) {
      if (!dateAtStart.test(line)) continue;

      // Grab all numbers at the end of the line; typical Capitec
      // shape has 2-3 trailing amounts (debit, credit, balance).
      const amounts = extractTrailingAmounts(line);
      if (amounts.count < 2) {
        // Not enough numeric columns to be a transaction row.
        continue;
      }

      const dateStr = dateAtStart.exec(line)![0];
      const occurredAt = parseDate(dateStr);
      if (occurredAt === null) {
        dropped++;
        continue;
      }

      const descText = line
        .slice(dateStr.length, amounts.startIndex)
        .trim();
      if (!descText) {
        dropped++;
        continue;
      }

      // Capitec row: [debit, credit, balance] OR [debit/credit, balance].
      // In practice the balance is the last one. The transaction
      // amount is the non-zero of debit/credit.
      const [maybeDebit, maybeCredit] = amounts.values;
      let direction: Direction;
      let amount: number;
      if (
        maybeDebit !== null &&
        maybeCredit !== null &&
        maybeDebit > 0 &&
        maybeCredit === 0
      ) {
        direction = "out";
        amount = maybeDebit;
      } else if (
        maybeCredit !== null &&
        maybeDebit !== null &&
        maybeCredit > 0 &&
        maybeDebit === 0
      ) {
        direction = "in";
        amount = maybeCredit;
      } else if (amounts.count === 2 && maybeDebit !== null) {
        // Only one txn amount + balance. Direction: infer from
        // description prefix — cash deposit, EFT received → in;
        // otherwise out. Conservative default: drop, don't guess.
        if (/DEPOSIT|CREDIT|SALARY|REFUND|EFT\s+FROM/i.test(descText)) {
          direction = "in";
          amount = maybeDebit;
        } else {
          direction = "out";
          amount = maybeDebit;
        }
      } else {
        dropped++;
        continue;
      }

      transactions.push({
        occurredAt,
        direction,
        amount,
        description: normaliseWhitespace(descText),
        counterpartyName: extractCounterparty(descText),
        reference: null,
        parserMeta: {
          parser: "pdf:capitec",
          pdf_page: page.page,
        },
      });
    }
  }

  return { transactions, dropped, additionalWarnings: [] };
}

/**
 * FNB statement rows typically look like:
 *
 *   01 Mar 2024  DR ORDER: OLD MUTUAL           -450.00           1,234.56
 *   03 Mar 2024  CREDIT SALARY XYZ CO           25,000.00        26,234.56
 *
 * A single signed amount + balance. Debits are negative.
 */
function extractFnb(pages: PageText[]): ExtractResult {
  const transactions: RawTransaction[] = [];
  let dropped = 0;
  const dateAtStart = /^(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})/;

  for (const page of pages) {
    for (const line of page.lines) {
      if (!dateAtStart.test(line)) continue;
      const amounts = extractTrailingAmounts(line);
      if (amounts.count < 2) continue;

      const dateStr = dateAtStart.exec(line)![0];
      const occurredAt = parseDate(dateStr);
      if (occurredAt === null) {
        dropped++;
        continue;
      }

      const descText = line
        .slice(dateStr.length, amounts.startIndex)
        .trim();
      if (!descText) {
        dropped++;
        continue;
      }

      // FNB: signed amount + running balance (2 numbers total).
      const [signed] = amounts.values;
      if (signed === null || signed === 0) {
        dropped++;
        continue;
      }

      transactions.push({
        occurredAt,
        direction: signed >= 0 ? "in" : "out",
        amount: Math.abs(signed),
        description: normaliseWhitespace(descText),
        counterpartyName: extractCounterparty(descText),
        reference: null,
        parserMeta: {
          parser: "pdf:fnb",
          pdf_page: page.page,
        },
      });
    }
  }

  return { transactions, dropped, additionalWarnings: [] };
}

/**
 * Generic PDF extractor. Applied when we couldn't identify the bank.
 * Very best-effort: looks for any line that starts with a date and
 * ends with 1-3 monetary values.
 *
 * Deliberately more likely to drop than mis-parse. If this parser
 * struggles, we surface a warning telling the user to try the CSV
 * export instead.
 */
function extractGeneric(pages: PageText[]): ExtractResult {
  const transactions: RawTransaction[] = [];
  let dropped = 0;
  const dateAtStart = /^(\d{1,2}\s+[A-Za-z]{3,}\s+\d{4}|\d{1,2}[\/.]\d{1,2}[\/.]\d{2,4}|\d{4}-\d{2}-\d{2})/;

  for (const page of pages) {
    for (const line of page.lines) {
      if (!dateAtStart.test(line)) continue;
      const amounts = extractTrailingAmounts(line);
      if (amounts.count < 2) continue;

      const dateStr = dateAtStart.exec(line)![0];
      const occurredAt = parseDate(dateStr);
      if (occurredAt === null) {
        dropped++;
        continue;
      }

      const descText = line
        .slice(dateStr.length, amounts.startIndex)
        .trim();
      if (!descText) {
        dropped++;
        continue;
      }

      // Generic assumption: last number is balance; first non-zero
      // is transaction amount. If we can't tell direction from the
      // sign OR the description, drop the row.
      const first = amounts.values[0];
      if (first === null || first === 0) {
        dropped++;
        continue;
      }
      let direction: Direction | null = null;
      if (first < 0) direction = "out";
      else if (first > 0 && /DEPOSIT|CREDIT|SALARY|REFUND|RECEIVED/i.test(descText)) {
        direction = "in";
      } else if (first > 0 && /PAYMENT|PURCHASE|WITHDRAWAL|DEBIT|EFT/i.test(descText)) {
        direction = "out";
      }
      if (direction === null) {
        dropped++;
        continue;
      }

      transactions.push({
        occurredAt,
        direction,
        amount: Math.abs(first),
        description: normaliseWhitespace(descText),
        counterpartyName: extractCounterparty(descText),
        reference: null,
        parserMeta: {
          parser: "pdf:generic",
          pdf_page: page.page,
        },
      });
    }
  }

  const additionalWarnings: string[] = [];
  if (transactions.length === 0 && dropped > 0) {
    additionalWarnings.push(
      "The generic PDF parser couldn't recognise any transaction rows. Try uploading the CSV export instead.",
    );
  }
  return { transactions, dropped, additionalWarnings };
}

// ---------------------------------------------------------------------------
// Amount-extraction helpers
// ---------------------------------------------------------------------------

/**
 * Find all monetary numbers at the tail of a text line. Returns the
 * numbers in order plus the index at which they start (used to
 * separate the description prefix from the trailing amounts).
 *
 * Recognises:
 *   * plain numbers        "250.00"
 *   * with thousand seps   "1,234.56"
 *   * signed               "-450.00"
 *   * parenthesised        "(450.00)"
 *   * with Dr/Cr suffix    "500.00 Cr"
 */
function extractTrailingAmounts(line: string): {
  values: Array<number | null>;
  startIndex: number;
  count: number;
} {
  // Regex trick: match runs like "1,234.56", "(200.00)", "500.00 Cr"
  // anchored at word boundaries, from right to left.
  const rx =
    /(?:^|[\s])([\-(]?[\d,]+(?:\.\d{1,2})?[\)]?(?:\s?[CDcd]r)?)(?=\s|$)/g;
  const matches: Array<{ raw: string; index: number; parsed: number | null }> = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(line)) !== null) {
    const raw = m[1];
    matches.push({
      raw,
      index: m.index + (m[0].startsWith(" ") ? 1 : 0),
      parsed: parseAmountWithCrDr(raw),
    });
  }

  // Keep only trailing matches (nothing but whitespace + amounts
  // after the first one we accept). Walk right-to-left: as long as
  // this match is trailed only by more matches or whitespace, keep
  // it; otherwise stop.
  const trailing: Array<{ raw: string; index: number; parsed: number | null }> = [];
  for (let i = matches.length - 1; i >= 0; i--) {
    const mth = matches[i];
    const after = line.slice(mth.index + mth.raw.length).trim();
    if (
      after === "" ||
      trailing.length === 0 ||
      trailing[trailing.length - 1].index >= mth.index + mth.raw.length
    ) {
      trailing.unshift(mth);
    } else {
      break;
    }
  }

  return {
    values: trailing.map((t) => t.parsed),
    startIndex: trailing.length > 0 ? trailing[0].index : line.length,
    count: trailing.length,
  };
}

/**
 * Like `parseAmount` from csv.ts but also handles the "500.00 Cr"
 * (credit) / "500.00 Dr" (debit) suffix common in SA bank PDFs.
 * "Cr" doesn't change the magnitude; the caller decides direction
 * from column context.
 */
function parseAmountWithCrDr(raw: string): number | null {
  const stripped = raw.replace(/\s?[CDcd]r$/, "");
  return parseAmount(stripped);
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

import type { LoggerMessage } from "tesseract.js";

/**
 * Client-side receipt OCR using Tesseract.js.
 *
 * SA township spaza owners typically get printed receipts from
 * suppliers (Metro, Makro, wholesalers, cash-and-carry). This
 * module handles the "photograph a receipt → get a list of items
 * and prices you can save as sales" flow.
 *
 * Everything runs in the browser via WASM — no image ever leaves the
 * device, no OCR API fees, works offline once the language pack has
 * been fetched once.
 *
 * The module is deliberately isolated so the heavy Tesseract.js code
 * only loads when the receipt scanner is actually opened (dynamic
 * import in ScanReceipt.tsx keeps it out of the main bundle).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OcrItem = {
  /** The item description as recognised, cleaned up but not translated. */
  name: string;
  /** Detected quantity. Defaults to 1 if no `xN` / `N x` pattern found. */
  qty: number;
  /** Line-item price in ZAR. */
  price: number;
  /** Original raw line the parser worked from, kept for debugging. */
  raw: string;
};

export type OcrProgress = {
  /** 0–1 completion. `undefined` while Tesseract is still warming up. */
  progress?: number;
  /** Human-readable status. Not translated — surfaced by the UI. */
  status: string;
};

// ---------------------------------------------------------------------------
// Line filtering: strings that clearly aren't line items.
// ---------------------------------------------------------------------------

/**
 * Any receipt line containing one of these words is a header / total /
 * VAT summary / cashier footer, not a purchasable item. Kept
 * case-insensitive; comparison is against the lowercased line.
 *
 * The list is chosen for South African receipt vocabulary — the same
 * words show up on Metro, Shoprite, Pick n Pay, Boxer, and most spaza
 * wholesalers.
 */
const NON_ITEM_KEYWORDS = [
  "total",
  "subtotal",
  "sub total",
  "vat",
  "tax",
  "change",
  "tendered",
  "cash",
  "card",
  "credit",
  "debit",
  "eft",
  "balance",
  "amount due",
  "amount paid",
  "receipt",
  "invoice",
  "till",
  "cashier",
  "operator",
  "date",
  "time",
  "till slip",
  "www.",
  "http",
  "www ",
  "trading",
  "tel:",
  "phone",
  "customer",
  "thank you",
  "thanks",
  "purchases",
  "items",
  "qty",
  "unit price",
  "description",
];

const looksLikeItemLine = (line: string): boolean => {
  const lower = line.toLowerCase();
  for (const kw of NON_ITEM_KEYWORDS) {
    if (lower.includes(kw)) return false;
  }
  // Must have at least one letter (rules out lines that are only
  // dates, totals, or barcode numbers).
  if (!/[a-z]/i.test(line)) return false;
  // Must have a number that looks like a price (n.nn or n,nn).
  return /\d+[.,]\d{2}/.test(line);
};

// ---------------------------------------------------------------------------
// Line parsing
// ---------------------------------------------------------------------------

/**
 * Extract the price from a line. Assumes the price is the LAST number
 * on the line that matches n.nn / n,nn (possibly with an R prefix and
 * thousands separators). Returns null if no plausible price found.
 */
function extractPrice(line: string): number | null {
  // We use a global regex and take the last match. Common shapes:
  //   12.50 / 12,50 / R12.50 / R 12.50 / 1,234.56 / 1 234.56
  const matches = [...line.matchAll(/[Rr]?\s*\d{1,3}(?:[\s,]\d{3})*[.,]\d{2}/g)];
  if (matches.length === 0) return null;
  const last = matches[matches.length - 1][0];
  // Normalise: strip R, strip spaces + thousands separators, ensure
  // decimal is a dot.
  const cleaned = last
    .replace(/[Rr\s]/g, "")
    .replace(/,(\d{2})$/, ".$1") // ", 50" → ". 50" when comma is the decimal
    .replace(/,/g, ""); // strip any remaining thousands commas
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

/**
 * Try to find a quantity in the line. Returns { qty, cleanedLine }
 * where cleanedLine has the quantity token removed so the item name
 * doesn't include it. If nothing found, qty is 1.
 *
 * Patterns handled:
 *   "3 x BREAD"       → qty=3
 *   "BREAD x 3"       → qty=3
 *   "BREAD x3"        → qty=3
 *   "2 BREAD 12.50"   → qty=2 when a bare small integer leads the line
 */
function extractQty(desc: string): { qty: number; cleaned: string } {
  let cleaned = desc.trim();

  // "N x " at start (English + Afrikaans-flavoured "N maal")
  let m = cleaned.match(/^(\d+)\s*[x×]\s+/i);
  if (m) return { qty: parseInt(m[1], 10), cleaned: cleaned.slice(m[0].length) };

  // "xN " or " x N" anywhere
  m = cleaned.match(/\s[x×]\s*(\d+)$/i);
  if (m) return { qty: parseInt(m[1], 10), cleaned: cleaned.slice(0, -m[0].length).trim() };

  // Bare small integer at start (BUT only if it's 1–20, otherwise
  // it's more likely a SKU or a weight)
  m = cleaned.match(/^(\d{1,2})\s+([A-Za-z])/);
  if (m && parseInt(m[1], 10) >= 1 && parseInt(m[1], 10) <= 20) {
    return { qty: parseInt(m[1], 10), cleaned: cleaned.slice(m[1].length).trim() };
  }

  return { qty: 1, cleaned };
}

/**
 * Parse one plausible-item receipt line into a structured item.
 * Returns null if the line doesn't have both a name and a price
 * after cleanup.
 */
function parseLine(line: string): OcrItem | null {
  const trimmed = line.trim();
  if (!looksLikeItemLine(trimmed)) return null;

  const price = extractPrice(trimmed);
  if (price === null || price <= 0) return null;

  // Drop the price token(s) from the description end. Keep any leading
  // punctuation off the description too.
  const priceIndex = trimmed.search(/[Rr]?\s*\d{1,3}(?:[\s,]\d{3})*[.,]\d{2}(?!.*\d)/);
  const desc = (priceIndex >= 0 ? trimmed.slice(0, priceIndex) : trimmed).trim();
  if (desc.length < 2) return null;

  const { qty, cleaned } = extractQty(desc);

  // Final tidy: collapse whitespace, title-case very small words that
  // came through as ALL CAPS (Tesseract sees receipts as uppercase),
  // strip leftover trailing "@" or "x" tokens.
  const name = cleaned
    .replace(/\s{2,}/g, " ")
    .replace(/\s*[@x×]\s*$/, "")
    .trim();
  if (!name) return null;

  return {
    name,
    qty: Math.max(1, Math.floor(qty)),
    price,
    raw: trimmed,
  };
}

/**
 * Given the full raw OCR text of a receipt, extract every line that
 * plausibly represents a purchased line item, deduped by (name, price)
 * so a smudged double-recognition doesn't create phantom rows.
 */
export function parseReceiptText(rawText: string): OcrItem[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const parsed: OcrItem[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const item = parseLine(line);
    if (!item) continue;
    const key = `${item.name.toLowerCase()}|${item.price.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    parsed.push(item);
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Tesseract.js wrapper
// ---------------------------------------------------------------------------

type TesseractLike = {
  recognize: (
    image: File | Blob | HTMLImageElement | HTMLCanvasElement | string,
    lang: string,
    options?: { logger?: (m: LoggerMessage) => void },
  ) => Promise<{ data: { text: string } }>;
};

/**
 * Run OCR on a receipt image and return the parsed line items.
 *
 * Loads tesseract.js lazily and hands the caller a progress feed so
 * the UI can show a percentage while the WASM binary + language pack
 * are being fetched and the recognition runs.
 *
 * Language is fixed to English; SA receipts are near-universally in
 * English regardless of the shop owner's home language. This keeps
 * the language-pack download small (~10MB one-time, then cached by
 * the browser).
 */
export async function recognizeReceipt(
  image: File | Blob,
  onProgress?: (p: OcrProgress) => void,
): Promise<{ text: string; items: OcrItem[] }> {
  onProgress?.({ status: "Loading OCR engine..." });

  // Dynamic import so this only fires the first time a user actually
  // scans a receipt. Vite will code-split the tesseract chunk.
  const t = (await import("tesseract.js")) as unknown as TesseractLike;

  const result = await t.recognize(image, "eng", {
    logger: (m) => {
      // Tesseract emits messages like:
      //   { status: 'loading language traineddata', progress: 0.42 }
      //   { status: 'initializing api',             progress: 0.5  }
      //   { status: 'recognizing text',             progress: 0.7  }
      onProgress?.({
        status: m.status,
        progress: typeof m.progress === "number" ? m.progress : undefined,
      });
    },
  });

  const text = result.data.text ?? "";
  return { text, items: parseReceiptText(text) };
}

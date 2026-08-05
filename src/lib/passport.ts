import jsPDF from "jspdf";

import type { Lang, TKey } from "../i18n";
import { tr, trParams } from "../i18n";
import type { AppState, Sale, Tab } from "../store";
import type { ScoreDetail, ScoreFactorKey } from "./score";

/**
 * KasiKash "Financial Passport" — a one-page PDF summary of the user's
 * KasiScore, business activity, tab discipline, and stokvel savings.
 * Designed to be shared with lenders / suppliers / community funders
 * who need a snapshot of the person's credit-worthiness before
 * extending informal credit.
 *
 * The document is generated entirely client-side using jsPDF, in the
 * user's currently selected language (en / zu / st / af). No data
 * ever leaves the device to build it, so users can share their
 * passport without a network connection.
 */

// ---------------------------------------------------------------------------
// Layout constants — everything in millimetres unless suffixed.
// ---------------------------------------------------------------------------

// A4 portrait: 210 × 297 mm.
const PAGE_W = 210;
const MARGIN_X = 15;
const MARGIN_Y_TOP = 30; // leave room for the green header band
const HEADER_H = 22;
const CONTENT_X = MARGIN_X;
const CONTENT_W = PAGE_W - 2 * MARGIN_X;

// KasiKash brand colours as [r, g, b] tuples.
const COLOR_GREEN: [number, number, number] = [34, 197, 94]; // #22C55E
const COLOR_GOLD: [number, number, number] = [251, 191, 36]; // #FBBF24
const COLOR_CORAL: [number, number, number] = [255, 105, 97];
const COLOR_INK: [number, number, number] = [17, 24, 39]; // near-black
const COLOR_MUTED: [number, number, number] = [107, 114, 128]; // slate-500
const COLOR_HAIRLINE: [number, number, number] = [229, 231, 235]; // grey-200

// ---------------------------------------------------------------------------
// Text-friendly currency + date formatters used inside the PDF.
// jsPDF's default Helvetica supports the Rand symbol via "R" prefix.
// ---------------------------------------------------------------------------

const formatR = (n: number) =>
  "R" +
  Math.round(n).toLocaleString("en-ZA", { maximumFractionDigits: 0 });

const formatPct = (n: number) => `${Math.round(n)}%`;

const formatDate = (ts: number, lang: Lang) => {
  const d = new Date(ts);
  // Map our Lang codes to BCP-47 locales for toLocaleDateString.
  // Some locales (zu-ZA, st-ZA) aren't universally supported in every
  // JS runtime; en-ZA is the safe fallback.
  const localeMap: Record<Lang, string> = {
    en: "en-ZA",
    zu: "zu-ZA",
    st: "st-ZA",
    af: "af-ZA",
  };
  try {
    return d.toLocaleDateString(localeMap[lang], {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d.toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }
};

// ---------------------------------------------------------------------------
// Business-metric helpers. These are local to the PDF because the
// numbers we want here (last-30-day totals, active-day counts, top
// seller) aren't already exposed as first-class selectors on the
// store. Kept small and pure so tests are trivial to add later.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const cutoff30 = () => Date.now() - 30 * MS_PER_DAY;

const salesInLast30 = (sales: Sale[]) =>
  sales.filter((s) => s.createdAt >= cutoff30());

const activeDaysCount = (sales: Sale[]): number => {
  const days = new Set<number>();
  const c = cutoff30();
  for (const s of sales) {
    if (s.createdAt >= c) {
      days.add(Math.floor(s.createdAt / MS_PER_DAY));
    }
  }
  return days.size;
};

const revenue30d = (sales: Sale[]): number =>
  salesInLast30(sales).reduce((sum, s) => sum + s.price * s.qty, 0);

const topSellerName = (sales: Sale[]): string | null => {
  const counts = new Map<string, number>();
  for (const s of salesInLast30(sales)) {
    const key = s.item.trim().toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + s.qty);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [name, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      best = name;
    }
  }
  // Return the original casing of the top item, not the lowercase key.
  if (!best) return null;
  const canonical = sales.find(
    (s) => s.item.trim().toLowerCase() === best,
  );
  return canonical ? canonical.item : best;
};

const tabsPaidCount = (tabs: Tab[]) => tabs.filter((t) => t.paid).length;
const tabsOpenCount = (tabs: Tab[]) => tabs.filter((t) => !t.paid).length;
const tabsRepaymentRate = (tabs: Tab[]) => {
  if (tabs.length === 0) return null;
  return (tabsPaidCount(tabs) / tabs.length) * 100;
};

// Aggregate user's own confirmed contributions to the stokvel.
const userConfirmedContribTotal = (
  state: AppState,
  userId: string | null,
): number => {
  const stk = state.stokvel;
  if (!stk || !userId) return 0;
  return stk.contributions
    .filter(
      (c) =>
        c.ownerId === userId && (c.status ?? "confirmed") === "confirmed",
    )
    .reduce((s, c) => s + c.amount, 0);
};

// ---------------------------------------------------------------------------
// PDF drawing primitives
// ---------------------------------------------------------------------------

type Doc = jsPDF;

function setColorText(doc: Doc, c: [number, number, number]) {
  doc.setTextColor(c[0], c[1], c[2]);
}
function setColorFill(doc: Doc, c: [number, number, number]) {
  doc.setFillColor(c[0], c[1], c[2]);
}
function setColorDraw(doc: Doc, c: [number, number, number]) {
  doc.setDrawColor(c[0], c[1], c[2]);
}

function drawHeader(doc: Doc, lang: Lang) {
  setColorFill(doc, COLOR_GREEN);
  doc.rect(0, 0, PAGE_W, HEADER_H, "F");

  // KasiKash wordmark.
  setColorText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("KasiKash", MARGIN_X, 12);

  // Subtitle: "Financial Passport".
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(tr("pdfDocTitle", lang), MARGIN_X, 18);

  // Right-side small label.
  doc.setFontSize(8);
  doc.text(tr("pdfIssuedBy", lang), PAGE_W - MARGIN_X, 12, {
    align: "right",
  });
  setColorText(doc, COLOR_INK);
}

/** Draw a section title bar. Returns the y-coordinate to draw beneath. */
function drawSectionTitle(doc: Doc, y: number, title: string): number {
  setColorText(doc, COLOR_INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), CONTENT_X, y);
  // Thin underline.
  setColorDraw(doc, COLOR_HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(CONTENT_X, y + 1.5, CONTENT_X + CONTENT_W, y + 1.5);
  return y + 6;
}

/**
 * Render a two-column label/value row. Label muted, value normal.
 * Returns the y-coordinate for the next row.
 */
function drawLabelValue(
  doc: Doc,
  y: number,
  label: string,
  value: string,
): number {
  setColorText(doc, COLOR_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(label, CONTENT_X, y);

  setColorText(doc, COLOR_INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(value, CONTENT_X + CONTENT_W, y, { align: "right" });

  return y + 6;
}

/**
 * Draw the big KasiScore + tier block on the top-right of the first
 * content section. Left column: label + tier. Right column: big
 * number. Kept compact so both fit on a single page.
 */
function drawScoreBlock(
  doc: Doc,
  y: number,
  score: number,
  tierLabel: string,
): number {
  const boxW = CONTENT_W;
  const boxH = 26;
  setColorFill(doc, [249, 250, 251]);
  doc.rect(CONTENT_X, y, boxW, boxH, "F");
  setColorDraw(doc, COLOR_HAIRLINE);
  doc.setLineWidth(0.3);
  doc.rect(CONTENT_X, y, boxW, boxH);

  // Label.
  setColorText(doc, COLOR_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("KASISCORE", CONTENT_X + 5, y + 8);

  // Tier.
  setColorText(doc, COLOR_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(tierLabel, CONTENT_X + 5, y + 17);

  // Big number.
  setColorText(doc, COLOR_INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(String(score), CONTENT_X + boxW - 5, y + 18, { align: "right" });

  // Small "/850" beneath the number.
  setColorText(doc, COLOR_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("/ 850", CONTENT_X + boxW - 5, y + 22, { align: "right" });

  return y + boxH + 6;
}

/**
 * Draw a factor bar. Left side: name + weight, right side: mini
 * progress bar showing normalised score. Compact — fits ~7 factors
 * inside the available space.
 */
function drawFactorRow(
  doc: Doc,
  y: number,
  name: string,
  weightPct: number,
  normalised: number,
): number {
  const rowH = 6;

  // Name (left).
  setColorText(doc, COLOR_INK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(name, CONTENT_X, y);

  // Weight label (small, muted, next to name).
  setColorText(doc, COLOR_MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(` (${Math.round(weightPct * 100)}%)`, CONTENT_X + textWidth(doc, name, 9), y);

  // Progress bar on the right (~40mm wide).
  const barX = CONTENT_X + CONTENT_W - 42;
  const barY = y - 3;
  const barW = 40;
  const barH = 4;
  setColorFill(doc, COLOR_HAIRLINE);
  doc.rect(barX, barY, barW, barH, "F");
  const filled = Math.max(0, Math.min(barW, (normalised / 100) * barW));
  const barColor =
    normalised >= 75 ? COLOR_GREEN : normalised >= 50 ? COLOR_GOLD : COLOR_CORAL;
  setColorFill(doc, barColor);
  doc.rect(barX, barY, filled, barH, "F");

  // Number to the right of the bar.
  setColorText(doc, COLOR_INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(String(Math.round(normalised)), barX + barW + 2, y);

  return y + rowH;
}

/**
 * jsPDF's `getTextWidth` requires the current font state; we set it
 * temporarily to `sz` and return the value plus a tiny padding.
 */
function textWidth(doc: Doc, str: string, sz: number): number {
  const prev = doc.getFontSize();
  doc.setFontSize(sz);
  const w = doc.getTextWidth(str);
  doc.setFontSize(prev);
  return w;
}

/**
 * Wrapping helper for the disclaimer paragraph at the bottom. Uses
 * jsPDF's splitTextToSize to break a long string into lines that fit
 * inside CONTENT_W at the given font size.
 */
function drawWrappedText(
  doc: Doc,
  y: number,
  text: string,
  sz: number,
  color: [number, number, number],
): number {
  setColorText(doc, color);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(sz);
  const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
  for (const line of lines) {
    doc.text(line, CONTENT_X, y);
    y += sz * 0.38;
  }
  return y;
}

/**
 * Map a ScoreFactorKey → the corresponding i18n key for its display
 * name. Kept as a lookup so the scorer stays i18n-free.
 */
const FACTOR_NAME_KEY: Record<ScoreFactorKey, TKey> = {
  contribution_consistency: "factorContribConsistency",
  contribution_volume: "factorContribVolume",
  tab_repayment: "factorTabRepayment",
  sales_activity: "factorSalesActivity",
  time_on_platform: "factorTimeOnPlatform",
  profile_maturity: "factorProfileMaturity",
  recent_momentum: "factorRecentMomentum",
};

/**
 * Map a ScoreTier → its i18n key. Legacy score-label keys are
 * reused for fair / good / excellent since they already exist across
 * every language.
 */
function tierI18nKey(tier: ScoreDetail["tier"]): TKey {
  switch (tier) {
    case "excellent":
      return "scoreLabelExcellent";
    case "good":
      return "scoreLabelGood";
    case "fair":
      return "scoreLabelFair";
    case "building":
      return "scoreTierBuilding";
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type PassportInput = {
  state: AppState;
  detail: ScoreDetail;
  lang: Lang;
  userId: string | null;
};

/**
 * Render the passport to a jsPDF instance. Returns the finished
 * document, ready to be turned into a Blob, saved to disk, or
 * handed to the Web Share API.
 *
 * Splits the drawing into named steps so a future refactor can
 * swap layouts (multi-page, landscape, PDF/A) without touching
 * the section renderers.
 */
export function renderPassport(input: PassportInput): jsPDF {
  const { state, detail, lang, userId } = input;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  // Header band.
  drawHeader(doc, lang);
  let y = MARGIN_Y_TOP;

  // --- Owner + business identification --------------------------------
  y = drawSectionTitle(doc, y, tr("pdfSectionOwner", lang));
  const ownerName = state.profile.ownerName ?? "—";
  y = drawLabelValue(doc, y, tr("pdfSectionOwner", lang), ownerName);
  y = drawLabelValue(doc, y, tr("passportGeneratedOn", lang).replace(/\{date\}/, "").trim() || "Generated", formatDate(detail.computedAt, lang));

  if (state.profile.businessName) {
    y += 2;
    y = drawSectionTitle(doc, y, tr("pdfSectionBusiness", lang));
    y = drawLabelValue(doc, y, tr("pdfSectionBusiness", lang), state.profile.businessName);
    if (state.profile.businessType) {
      const bizKey =
        ("biz" +
          state.profile.businessType.charAt(0).toUpperCase() +
          state.profile.businessType.slice(1)) as TKey;
      y = drawLabelValue(doc, y, "Type", tr(bizKey, lang));
    }
  }

  // --- KasiScore --------------------------------------------------------
  y += 4;
  y = drawSectionTitle(doc, y, tr("pdfSectionScore", lang));
  y = drawScoreBlock(doc, y, detail.score, tr(tierI18nKey(detail.tier), lang));

  // Factor breakdown (compact).
  y = drawSectionTitle(doc, y, tr("pdfSectionFactors", lang));
  for (const f of detail.factors) {
    y = drawFactorRow(
      doc,
      y,
      tr(FACTOR_NAME_KEY[f.key], lang),
      f.weight,
      f.normalised,
    );
  }

  // --- Business activity (last 30 days) --------------------------------
  if (state.sales.length > 0) {
    y += 3;
    y = drawSectionTitle(doc, y, tr("pdfSectionSalesActivity", lang));
    y = drawLabelValue(
      doc,
      y,
      tr("pdfLabelSalesLogged", lang),
      String(salesInLast30(state.sales).length),
    );
    y = drawLabelValue(
      doc,
      y,
      tr("pdfLabelActiveDays", lang),
      `${activeDaysCount(state.sales)} / 30`,
    );
    y = drawLabelValue(
      doc,
      y,
      tr("pdfLabelRevenue30d", lang),
      formatR(revenue30d(state.sales)),
    );
    const top = topSellerName(state.sales);
    if (top) {
      y = drawLabelValue(doc, y, tr("pdfLabelTopSeller", lang), top);
    }
  }

  // --- Tab discipline --------------------------------------------------
  if (state.tabs.length > 0) {
    y += 3;
    y = drawSectionTitle(doc, y, tr("pdfSectionTabDiscipline", lang));
    y = drawLabelValue(
      doc,
      y,
      tr("pdfLabelTabsPaid", lang),
      String(tabsPaidCount(state.tabs)),
    );
    y = drawLabelValue(
      doc,
      y,
      tr("pdfLabelTabsOpen", lang),
      String(tabsOpenCount(state.tabs)),
    );
    const rate = tabsRepaymentRate(state.tabs);
    if (rate !== null) {
      y = drawLabelValue(
        doc,
        y,
        tr("pdfLabelRepaymentRate", lang),
        formatPct(rate),
      );
    }
  }

  // --- Stokvel savings --------------------------------------------------
  y += 3;
  y = drawSectionTitle(doc, y, tr("pdfSectionStokvelSavings", lang));
  const stk = state.stokvel;
  if (!stk) {
    setColorText(doc, COLOR_MUTED);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(tr("pdfNoStokvel", lang), CONTENT_X, y);
    y += 5;
  } else {
    y = drawLabelValue(doc, y, tr("pdfLabelStokvel", lang), stk.name);
    y = drawLabelValue(
      doc,
      y,
      tr("pdfLabelRole", lang),
      tr(
        stk.role === "admin" ? "stokvelRoleAdmin" : "stokvelRoleMember",
        lang,
      ),
    );
    y = drawLabelValue(
      doc,
      y,
      tr("pdfLabelYourContribution", lang),
      formatR(userConfirmedContribTotal(state, userId)),
    );
    y = drawLabelValue(
      doc,
      y,
      tr("pdfLabelStokvelGoal", lang),
      formatR(stk.goal),
    );
    // Total pot balance = sum of confirmed contributions across ALL
    // members, which is what stokvelTotal returns; we compute it
    // inline to keep the PDF module free of store imports beyond types.
    const potTotal = stk.contributions
      .filter((c) => (c.status ?? "confirmed") === "confirmed")
      .reduce((s, c) => s + c.amount, 0);
    y = drawLabelValue(doc, y, tr("pdfLabelStokvelSaved", lang), formatR(potTotal));
  }

  // --- Footer + disclaimer ---------------------------------------------
  // Sit at ~270mm from top regardless of where the content ended — the
  // page is fixed A4 and we want the footer anchored to the bottom.
  const footerY = 270;
  setColorDraw(doc, COLOR_HAIRLINE);
  doc.setLineWidth(0.3);
  doc.line(CONTENT_X, footerY - 4, CONTENT_X + CONTENT_W, footerY - 4);

  setColorText(doc, COLOR_GREEN);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(tr("pdfFooter", lang), CONTENT_X, footerY);

  drawWrappedText(
    doc,
    footerY + 6,
    tr("pdfDisclaimer", lang),
    7,
    COLOR_MUTED,
  );

  // Timestamp on far right of the footer.
  setColorText(doc, COLOR_MUTED);
  doc.setFontSize(7);
  doc.text(
    trParams("passportGeneratedOn", lang, {
      date: formatDate(detail.computedAt, lang),
    }),
    CONTENT_X + CONTENT_W,
    footerY,
    { align: "right" },
  );

  return doc;
}

/**
 * Produce a Blob of the rendered passport. Suitable for downloading
 * via a temporary anchor, or handing to the Web Share API.
 */
export function passportBlob(input: PassportInput): Blob {
  return renderPassport(input).output("blob");
}

/**
 * Produce a filename the app can suggest when saving the PDF.
 * Format: "kasikash-passport-{owner}-{yyyy-mm-dd}.pdf" with owner
 * sanitised to a-z0-9 (falls back to "user" if the owner name is
 * empty or all-punctuation).
 */
export function passportFilename(input: PassportInput): string {
  const owner = (input.state.profile.ownerName ?? "user")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const d = new Date(input.detail.computedAt);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `kasikash-passport-${owner || "user"}-${yyyy}-${mm}-${dd}.pdf`;
}

/**
 * Trigger a browser download of the passport. Handles the setup +
 * teardown of a temporary object URL / anchor element internally so
 * callers don't have to know about the DOM plumbing.
 */
export function downloadPassport(input: PassportInput): void {
  const blob = passportBlob(input);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = passportFilename(input);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Free the object URL on the next tick so the click has time to
  // finish handing the resource to the browser.
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

/**
 * Share the passport via the Web Share API on browsers that support
 * it (mostly mobile). Falls back to a plain download otherwise. The
 * boolean return tells the caller which path we took so the UI can
 * show an appropriate confirmation.
 */
export async function sharePassport(input: PassportInput): Promise<
  | { ok: true; via: "share" | "download" }
  | { ok: false; error: string }
> {
  const blob = passportBlob(input);
  const filename = passportFilename(input);
  const file = new File([blob], filename, { type: "application/pdf" });

  // navigator.canShare exists on Chrome/Android; Safari has share but
  // limited file support. Feature-detect both.
  const canShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function" &&
    navigator.canShare({ files: [file] });

  if (canShare) {
    try {
      await navigator.share({
        files: [file],
        title: "KasiKash Financial Passport",
        text: tr("passportSubtitle", input.lang),
      });
      return { ok: true, via: "share" };
    } catch (e) {
      // The user cancelling the share dialog raises an AbortError. We
      // treat that as a no-op rather than an error the UI should
      // surface. Any other failure gets surfaced properly.
      if (e instanceof DOMException && e.name === "AbortError") {
        return { ok: true, via: "share" };
      }
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // No Web Share API (or no file support): plain download.
  downloadPassport(input);
  return { ok: true, via: "download" };
}

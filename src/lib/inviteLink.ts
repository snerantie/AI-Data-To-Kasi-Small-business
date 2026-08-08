/**
 * Invite-link helpers (PR #25).
 *
 * A stokvel invite is a short alphanumeric code (e.g. `KX7QAP`)
 * plus a URL that carries the code as a query parameter. Members
 * tap the URL from a WhatsApp message and land in KasiKash with
 * the code already applied — no manual typing.
 *
 * The URL shape is: `<origin>/?invite=<CODE>`
 * e.g. `https://kasikash.co.za/?invite=KX7QAP`
 *
 * On app load, `parseInviteFromUrl()` extracts the code (if
 * present). Once the app has consumed it (successfully joined or
 * shown a suitable prompt), `clearInviteUrl()` strips the
 * parameter so a refresh doesn't re-trigger the flow.
 *
 * Deliberately in its own module because both `App.tsx` (parsing +
 * clearing) and `Stokvel.tsx` (building share URLs) use these
 * helpers, and it's small enough that keeping them close to a
 * consumer screen would only spread the logic across files.
 */

/**
 * Build the full URL a member taps to join a stokvel.
 * Includes the current app origin so the same helper works in
 * dev (localhost), Vercel previews, and the production custom
 * domain without config changes.
 */
export function buildInviteUrl(code: string): string {
  if (typeof window === "undefined") {
    // SSR / test path — return a sentinel URL. In practice this
    // code only runs in the browser, but tests + type-checking
    // benefit from a defined return.
    return `https://kasikash.example/?invite=${encodeURIComponent(code)}`;
  }
  const origin = window.location.origin;
  return `${origin}/?invite=${encodeURIComponent(code)}`;
}

/**
 * Extract an invite code from the current URL's `?invite=...`
 * query parameter. Case-insensitive on the parameter name so a
 * user or WhatsApp-side tweak to `Invite`, `INVITE`, or `invite`
 * still works.
 *
 * Rules:
 *   * Returns null when no invite parameter is present.
 *   * Trims whitespace + upper-cases the code. Real invite codes
 *     are 6-8 upper-case alphanumeric chars; normalising here
 *     means the caller doesn't need to.
 *   * Returns null if the code is obviously invalid (empty,
 *     wrong length, non-alphanumeric) — a defensive check to
 *     stop us pinging the server with garbage.
 */
export function parseInviteFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  let raw: string | null = null;
  for (const [key, value] of params) {
    if (key.toLowerCase() === "invite" && value) {
      raw = value;
      break;
    }
  }
  if (!raw) return null;

  const normalised = raw.trim().toUpperCase();
  // Valid codes are alphanumeric, roughly 4-12 characters. Reject
  // anything outside that range so we don't try to submit "abc def"
  // or a full URL that was accidentally pasted as the value.
  if (!/^[A-Z0-9]{4,12}$/.test(normalised)) return null;
  return normalised;
}

/**
 * Remove `?invite=...` from the URL without triggering a reload.
 * Mirrors the shape of `clearPaymentReturnUrl()` in
 * PaymentReturn.tsx so the two feel consistent.
 *
 * Called after the app has consumed the invite (successful join,
 * or the user dismissed the join prompt). Any other query
 * parameters in the URL are preserved.
 */
export function clearInviteUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  // Delete every case-variation of the parameter to be safe.
  for (const name of Array.from(url.searchParams.keys())) {
    if (name.toLowerCase() === "invite") {
      url.searchParams.delete(name);
    }
  }
  const cleaned =
    url.pathname +
    (url.searchParams.toString() ? "?" + url.searchParams.toString() : "") +
    url.hash;
  window.history.replaceState({}, "", cleaned);
}

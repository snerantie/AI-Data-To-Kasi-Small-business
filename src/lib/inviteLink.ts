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
 * Normalise any user-typed or URL-supplied invite code into the
 * canonical `K-XXXX-XXXX` shape that `generateInviteCode()` in
 * `src/lib/remote.ts` produces.
 *
 * We accept a bunch of things a real human would type and treat
 * them all as the same code:
 *   * lower / mixed case: `k-m9p2-xr7a` → `K-M9P2-XR7A`
 *   * missing hyphens:    `KM9P2XR7A`   → `K-M9P2-XR7A`
 *   * extra spaces:       `K M9P2 XR7A` → `K-M9P2-XR7A`
 *   * junk punctuation:   `K.M9P2.XR7A` → `K-M9P2-XR7A`
 *
 * The reporter's exact request:
 * > "let it be automate not manual that people have to click the
 * >  code as is such as this "-" or capital letter, can they just
 * >  click any letter capitornsmall as long as it align with the
 * >  letter"
 *
 * Returns null when the compact form isn't exactly the 9-char
 * shape `generateInviteCode()` emits (a `K` followed by 8
 * unambiguous alnum chars). Callers use the null to disable the
 * submit button and skip the network round-trip on obvious
 * garbage.
 *
 * Note: this only handles codes issued after invite generation
 * settled on the `K-XXXX-XXXX` shape. Any legacy row in the DB
 * with a different shape would fail here — none exist today.
 */
export function normalizeInviteCode(raw: string): string | null {
  if (!raw) return null;
  const compact = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!/^K[A-Z0-9]{8}$/.test(compact)) return null;
  return `${compact.slice(0, 1)}-${compact.slice(1, 5)}-${compact.slice(5, 9)}`;
}

/**
 * Extract an invite code from the current URL's `?invite=...`
 * query parameter. Case-insensitive on the parameter name so a
 * user or WhatsApp-side tweak to `Invite`, `INVITE`, or `invite`
 * still works.
 *
 * Delegates all code normalisation to `normalizeInviteCode`, so
 * the exact same lenient parsing applies whether the code came
 * from a tapped WhatsApp link or the manual-entry input in
 * JoinStokvelSheet. Returns null when the parameter is missing or
 * the value can't be normalised to a valid code.
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
  return normalizeInviteCode(raw);
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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildInviteUrl,
  clearInviteUrl,
  normalizeInviteCode,
  parseInviteFromUrl,
} from "./inviteLink";

/**
 * These tests use vi.stubGlobal to simulate `window.location` /
 * `window.history` since we're in the Node test environment (no
 * DOM by default). The helpers under test are pure functions
 * apart from those two globals, so this covers 100% of their
 * behaviour.
 *
 * Invite code shape matches `generateInviteCode()` in
 * `src/lib/remote.ts`: `K-XXXX-XXXX` where each X is drawn from
 * the unambiguous alphabet ABCDEFGHJKMNPQRSTVWXYZ23456789. Real
 * examples used below: `K-M9P2-XR7A`, `K-D8VN-P7CQ`, etc.
 */

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/**
 * Install a fake `window` with a mutable location + history. Each
 * `setLocation` call replaces the URL, mirroring what the browser
 * does on navigation. Tests use this to simulate a user landing on
 * the app via various URLs.
 */
function installFakeWindow(initialUrl: string) {
  const state = { url: initialUrl };
  const fake = {
    get location() {
      const parsed = new URL(state.url);
      return {
        href: state.url,
        origin: parsed.origin,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
      };
    },
    history: {
      replaceState(_: unknown, __: string, newUrl: string) {
        // The browser's replaceState accepts either a relative or
        // absolute URL. Our clearInviteUrl uses the pathname+search
        // form so we resolve relative to the current origin.
        try {
          state.url = new URL(newUrl, state.url).href;
        } catch {
          state.url = newUrl;
        }
      },
    },
  };
  vi.stubGlobal("window", fake);
  return {
    getUrl: () => state.url,
    setUrl: (u: string) => {
      state.url = u;
    },
  };
}

beforeEach(() => {
  // Fresh stub per test.
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// normalizeInviteCode
// ---------------------------------------------------------------------------

describe("normalizeInviteCode", () => {
  it("passes a canonical code through unchanged", () => {
    expect(normalizeInviteCode("K-M9P2-XR7A")).toBe("K-M9P2-XR7A");
  });

  it("upper-cases a lower-case code", () => {
    expect(normalizeInviteCode("k-m9p2-xr7a")).toBe("K-M9P2-XR7A");
  });

  it("inserts hyphens when the user typed the compact form", () => {
    expect(normalizeInviteCode("KM9P2XR7A")).toBe("K-M9P2-XR7A");
  });

  it("recovers from stray spaces (paste from WhatsApp)", () => {
    expect(normalizeInviteCode(" K M9P2 XR7A ")).toBe("K-M9P2-XR7A");
  });

  it("recovers from misplaced hyphens (paste on Android keyboard)", () => {
    expect(normalizeInviteCode("K-M9-P2-XR7A")).toBe("K-M9P2-XR7A");
    expect(normalizeInviteCode("KM9-P2XR7A")).toBe("K-M9P2-XR7A");
  });

  it("recovers from a mix of casing, spaces, and punctuation", () => {
    // The reporter's exact ask: "any letter capital or small as
    // long as it align with the letter".
    expect(normalizeInviteCode("k.m9p2.xr7a")).toBe("K-M9P2-XR7A");
    expect(normalizeInviteCode("K/M9P2/XR7A")).toBe("K-M9P2-XR7A");
  });

  it("returns null for empty input", () => {
    expect(normalizeInviteCode("")).toBeNull();
    expect(normalizeInviteCode("   ")).toBeNull();
  });

  it("returns null for a code that doesn't start with K", () => {
    // The compact shape must begin with K to match what
    // `generateInviteCode()` emits. Bare 8-char strings are not
    // valid invite codes.
    expect(normalizeInviteCode("M9P2XR7AB")).toBeNull();
  });

  it("returns null when the compact form is too short", () => {
    expect(normalizeInviteCode("K-M9P2")).toBeNull();
    expect(normalizeInviteCode("KM9P2")).toBeNull();
  });

  it("returns null when the compact form is too long", () => {
    expect(normalizeInviteCode("K-M9P2-XR7A-EXTRA")).toBeNull();
    expect(normalizeInviteCode("KM9P2XR7AEXTRA")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// buildInviteUrl
// ---------------------------------------------------------------------------

describe("buildInviteUrl", () => {
  it("prepends the current origin + /?invite= to the given code", () => {
    installFakeWindow("https://kasikash.co.za/");
    expect(buildInviteUrl("K-M9P2-XR7A")).toBe(
      "https://kasikash.co.za/?invite=K-M9P2-XR7A",
    );
  });

  it("uses the same origin for a Vercel preview URL", () => {
    installFakeWindow("https://kasi-abc123.vercel.app/some/path");
    expect(buildInviteUrl("K-D8VN-P7CQ")).toBe(
      "https://kasi-abc123.vercel.app/?invite=K-D8VN-P7CQ",
    );
  });

  it("URL-encodes weird codes so they don't break the query string", () => {
    // Real invite codes are alphanumeric + hyphens so this
    // shouldn't happen in practice, but if some future format
    // includes an ampersand or space we don't want the URL to
    // break silently.
    installFakeWindow("https://kasikash.co.za/");
    expect(buildInviteUrl("A B&C")).toContain("?invite=A%20B%26C");
  });

  it("has a sensible fallback when window is undefined (SSR path)", () => {
    // Deliberately do NOT install a fake window so `typeof window ===
    // 'undefined'` is true. The helper must still return something
    // — a placeholder URL — instead of crashing.
    const result = buildInviteUrl("K-M9P2-XR7A");
    expect(result).toContain("?invite=K-M9P2-XR7A");
  });
});

// ---------------------------------------------------------------------------
// parseInviteFromUrl
// ---------------------------------------------------------------------------

describe("parseInviteFromUrl", () => {
  it("returns null when there's no invite param", () => {
    installFakeWindow("https://kasikash.co.za/");
    expect(parseInviteFromUrl()).toBeNull();
  });

  it("returns the canonical code from ?invite=K-XXXX-XXXX", () => {
    installFakeWindow("https://kasikash.co.za/?invite=K-M9P2-XR7A");
    expect(parseInviteFromUrl()).toBe("K-M9P2-XR7A");
  });

  it("normalises a lower-case URL (whatsapp mangling)", () => {
    installFakeWindow("https://kasikash.co.za/?invite=k-m9p2-xr7a");
    expect(parseInviteFromUrl()).toBe("K-M9P2-XR7A");
  });

  it("normalises a compact-form value (no hyphens) back to canonical", () => {
    // Some WhatsApp link previews strip hyphens when they render
    // the URL as a tappable button. Getting the compact form here
    // should still succeed.
    installFakeWindow("https://kasikash.co.za/?invite=KM9P2XR7A");
    expect(parseInviteFromUrl()).toBe("K-M9P2-XR7A");
  });

  it("recognises the parameter case-insensitively", () => {
    installFakeWindow("https://kasikash.co.za/?Invite=K-M9P2-XR7A");
    expect(parseInviteFromUrl()).toBe("K-M9P2-XR7A");
  });

  it("survives other query params sitting alongside", () => {
    installFakeWindow(
      "https://kasikash.co.za/?utm_source=whatsapp&invite=K-M9P2-XR7A&other=x",
    );
    expect(parseInviteFromUrl()).toBe("K-M9P2-XR7A");
  });

  it("rejects a value that's too short (defensive)", () => {
    installFakeWindow("https://kasikash.co.za/?invite=K-M9");
    expect(parseInviteFromUrl()).toBeNull();
  });

  it("rejects a value that doesn't start with K", () => {
    installFakeWindow("https://kasikash.co.za/?invite=M9P2XR7AB");
    expect(parseInviteFromUrl()).toBeNull();
  });

  it("rejects a full URL accidentally pasted as the value", () => {
    installFakeWindow(
      "https://kasikash.co.za/?invite=https%3A%2F%2Fexample.com",
    );
    expect(parseInviteFromUrl()).toBeNull();
  });

  it("returns null when window is undefined", () => {
    // SSR-safe: no crash, just null.
    expect(parseInviteFromUrl()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clearInviteUrl
// ---------------------------------------------------------------------------

describe("clearInviteUrl", () => {
  it("strips the invite param from the URL", () => {
    const handle = installFakeWindow(
      "https://kasikash.co.za/?invite=K-M9P2-XR7A",
    );
    clearInviteUrl();
    expect(handle.getUrl()).toBe("https://kasikash.co.za/");
  });

  it("preserves other query params", () => {
    const handle = installFakeWindow(
      "https://kasikash.co.za/?utm_source=whatsapp&invite=K-M9P2-XR7A",
    );
    clearInviteUrl();
    expect(handle.getUrl()).toBe(
      "https://kasikash.co.za/?utm_source=whatsapp",
    );
  });

  it("preserves the pathname + hash", () => {
    const handle = installFakeWindow(
      "https://kasikash.co.za/some/path?invite=K-M9P2-XR7A#fragment",
    );
    clearInviteUrl();
    // URL constructor may normalise trailing bits differently across
    // Node versions — check the essential structure instead of an
    // exact-string comparison.
    const cleaned = handle.getUrl();
    expect(cleaned).toContain("/some/path");
    expect(cleaned).toContain("#fragment");
    expect(cleaned).not.toContain("invite");
  });

  it("no-ops when no invite param is present", () => {
    const handle = installFakeWindow("https://kasikash.co.za/");
    clearInviteUrl();
    expect(handle.getUrl()).toBe("https://kasikash.co.za/");
  });

  it("strips case-variations of the parameter name", () => {
    // WhatsApp on some devices/versions may re-case query params
    // when rendering the URL. clearInviteUrl must handle any case
    // variant so we don't leak a lingering `?Invite=...` after
    // consuming the invite.
    const handle = installFakeWindow(
      "https://kasikash.co.za/?Invite=K-M9P2-XR7A",
    );
    clearInviteUrl();
    expect(handle.getUrl()).toBe("https://kasikash.co.za/");
  });
});

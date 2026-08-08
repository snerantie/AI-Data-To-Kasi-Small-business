import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildInviteUrl,
  clearInviteUrl,
  parseInviteFromUrl,
} from "./inviteLink";

/**
 * These tests use vi.stubGlobal to simulate `window.location` /
 * `window.history` since we're in the Node test environment (no
 * DOM by default). The helpers under test are pure functions
 * apart from those two globals, so this covers 100% of their
 * behaviour.
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
// buildInviteUrl
// ---------------------------------------------------------------------------

describe("buildInviteUrl", () => {
  it("prepends the current origin + /?invite= to the given code", () => {
    installFakeWindow("https://kasikash.co.za/");
    expect(buildInviteUrl("KX7QAP")).toBe(
      "https://kasikash.co.za/?invite=KX7QAP",
    );
  });

  it("uses the same origin for a Vercel preview URL", () => {
    installFakeWindow("https://kasi-abc123.vercel.app/some/path");
    expect(buildInviteUrl("HELLO")).toBe(
      "https://kasi-abc123.vercel.app/?invite=HELLO",
    );
  });

  it("URL-encodes weird codes so they don't break the query string", () => {
    // Real invite codes are alphanumeric so this shouldn't happen
    // in practice, but if some future format includes an ampersand
    // or space we don't want the URL to break silently.
    installFakeWindow("https://kasikash.co.za/");
    expect(buildInviteUrl("A B&C")).toContain(
      "?invite=A%20B%26C",
    );
  });

  it("has a sensible fallback when window is undefined (SSR path)", () => {
    // Deliberately do NOT install a fake window so `typeof window ===
    // 'undefined'` is true. The helper must still return something
    // — a placeholder URL — instead of crashing.
    const result = buildInviteUrl("KX7QAP");
    expect(result).toContain("?invite=KX7QAP");
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

  it("returns the code from ?invite=CODE", () => {
    installFakeWindow("https://kasikash.co.za/?invite=KX7QAP");
    expect(parseInviteFromUrl()).toBe("KX7QAP");
  });

  it("upper-cases the code to normalise a typo-y URL", () => {
    installFakeWindow("https://kasikash.co.za/?invite=kx7qap");
    expect(parseInviteFromUrl()).toBe("KX7QAP");
  });

  it("recognises the parameter case-insensitively", () => {
    installFakeWindow("https://kasikash.co.za/?Invite=ABC123");
    expect(parseInviteFromUrl()).toBe("ABC123");
  });

  it("survives other query params sitting alongside", () => {
    installFakeWindow(
      "https://kasikash.co.za/?utm_source=whatsapp&invite=KX7QAP&other=x",
    );
    expect(parseInviteFromUrl()).toBe("KX7QAP");
  });

  it("rejects a value that's too short (defensive)", () => {
    installFakeWindow("https://kasikash.co.za/?invite=A");
    expect(parseInviteFromUrl()).toBeNull();
  });

  it("rejects a value with non-alphanumerics", () => {
    installFakeWindow("https://kasikash.co.za/?invite=A%20B");
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
      "https://kasikash.co.za/?invite=KX7QAP",
    );
    clearInviteUrl();
    expect(handle.getUrl()).toBe("https://kasikash.co.za/");
  });

  it("preserves other query params", () => {
    const handle = installFakeWindow(
      "https://kasikash.co.za/?utm_source=whatsapp&invite=KX7QAP",
    );
    clearInviteUrl();
    expect(handle.getUrl()).toBe(
      "https://kasikash.co.za/?utm_source=whatsapp",
    );
  });

  it("preserves the pathname + hash", () => {
    const handle = installFakeWindow(
      "https://kasikash.co.za/some/path?invite=KX7QAP#fragment",
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
      "https://kasikash.co.za/?Invite=KX7QAP",
    );
    clearInviteUrl();
    expect(handle.getUrl()).toBe("https://kasikash.co.za/");
  });
});

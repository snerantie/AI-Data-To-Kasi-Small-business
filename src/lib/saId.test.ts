import { describe, it, expect } from "vitest";
import { validateSaId, isValidSaId, maskSaId } from "./saId";

// 8001015009087 — a Luhn-valid SA ID (DOB 1980-01-01). Widely used as
// a test fixture; the checksum is verified independently below.
const VALID = "8001015009087";

describe("validateSaId", () => {
  it("accepts a valid 13-digit SA ID and extracts the date of birth", () => {
    const r = validateSaId(VALID);
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.dateOfBirth).toBe("1980-01-01");
  });

  it("tolerates spaces in the input", () => {
    expect(isValidSaId("8001 0150 09087")).toBe(true);
  });

  it("rejects the wrong length", () => {
    expect(validateSaId("123")).toEqual({ valid: false, reason: "length" });
    expect(validateSaId("80010150090877")).toEqual({
      valid: false,
      reason: "length",
    });
  });

  it("rejects non-digit characters", () => {
    expect(validateSaId("80010150090X7")).toEqual({
      valid: false,
      reason: "digits",
    });
  });

  it("rejects an impossible date (month 13)", () => {
    expect(validateSaId("8013015009087")).toEqual({
      valid: false,
      reason: "date",
    });
  });

  it("rejects an impossible day (32nd)", () => {
    expect(validateSaId("8001325009087")).toEqual({
      valid: false,
      reason: "date",
    });
  });

  it("rejects a bad Luhn checksum", () => {
    // Same as VALID but with the check digit flipped 7 -> 8.
    expect(validateSaId("8001015009088")).toEqual({
      valid: false,
      reason: "checksum",
    });
  });
});

describe("maskSaId", () => {
  it("keeps the first 4 and last 3 digits", () => {
    expect(maskSaId(VALID)).toBe("8001••••••087");
  });

  it("masks a normalised (spaced) value the same way", () => {
    expect(maskSaId("8001 0150 09087")).toBe("8001••••••087");
  });
});

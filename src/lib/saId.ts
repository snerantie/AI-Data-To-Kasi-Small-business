// South African ID number validation.
//
// Used to bind a mashonisa loan to the borrower's real, self-entered
// identity: the borrower types their ID, we validate it on the phone,
// and the loan is linked to it. This is a *structural* check only
// (does this look like a genuine SA ID number?) — it runs entirely on
// the device, needs no network, and works offline. Confirming the ID
// belongs to a real registered person (Home Affairs / bureau) is a
// separate, paid step we deliberately defer.
//
// Format (13 digits): YYMMDD SSSS C A Z
//   YYMMDD — date of birth
//   SSSS   — gender sequence (0000–4999 female, 5000–9999 male)
//   C      — citizenship (0 = SA citizen, 1 = permanent resident)
//   A      — historically a race digit, now usually 8 or 9
//   Z      — Luhn check digit over the preceding 12

export type SaIdResult =
  | { valid: true; dateOfBirth: string }
  | { valid: false; reason: "length" | "digits" | "date" | "checksum" };

const DIGITS_ONLY = /^\d+$/;

/** Strip spaces so "8001 0150 09087" and "8001015009087" both work. */
function normalize(raw: string): string {
  return raw.replace(/\s+/g, "");
}

/** Standard Luhn checksum over a string of digits. */
function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function validateSaId(raw: string): SaIdResult {
  const id = normalize(raw);
  if (id.length !== 13) return { valid: false, reason: "length" };
  if (!DIGITS_ONLY.test(id)) return { valid: false, reason: "digits" };

  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));

  if (mm < 1 || mm > 12) return { valid: false, reason: "date" };
  // Pick the century that yields a non-future birth year: a YY at or
  // below the current year's last two digits is read as 2000s, else
  // 1900s. Good enough for a living borrower.
  const nowYY = new Date().getFullYear() % 100;
  const year = (yy <= nowYY ? 2000 : 1900) + yy;
  const daysInMonth = new Date(year, mm, 0).getDate();
  if (dd < 1 || dd > daysInMonth) return { valid: false, reason: "date" };

  if (!luhnValid(id)) return { valid: false, reason: "checksum" };

  const dob = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  return { valid: true, dateOfBirth: dob };
}

export function isValidSaId(raw: string): boolean {
  return validateSaId(raw).valid;
}

/**
 * Mask an SA ID for display — keep the first 4 and last 3 digits,
 * hide the middle: "8001015009087" -> "8001••••••087". Enough to feel
 * real to the borrower without exposing the full number on screen.
 */
export function maskSaId(raw: string): string {
  const id = normalize(raw);
  if (id.length !== 13) {
    if (id.length <= 3) return id;
    return "•".repeat(Math.max(0, id.length - 3)) + id.slice(-3);
  }
  return id.slice(0, 4) + "•".repeat(6) + id.slice(-3);
}

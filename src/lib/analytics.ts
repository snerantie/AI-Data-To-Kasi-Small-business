// Thin wrapper around Vercel Web Analytics custom events.
//
// The <Analytics/> component (src/main.tsx) already counts VISITS.
// track() lets us also see real USAGE — people actually doing things —
// in the Vercel dashboard's "Events" view: onboarding completed, a
// service turned on, a stokvel created, a loan recorded, a borrower
// confirmed.
//
// Rules:
//  - NEVER send PII. No names, ID numbers, phone numbers, or amounts
//    tied to a person — only safe, categorical properties (service
//    type, stokvel kind, confirmation method).
//  - Analytics must NEVER break the app: every call is guarded.
//  - It no-ops in dev / when Analytics isn't active; events only count
//    once deployed on Vercel with Analytics enabled.

import { track } from "@vercel/analytics";

export type UsageEvent =
  | "onboarding_completed"
  | "service_enabled"
  | "stokvel_created"
  | "stokvel_joined"
  | "loan_created"
  | "loan_repayment"
  | "borrower_confirmed";

export function trackEvent(
  event: UsageEvent,
  props?: Record<string, string | number | boolean | null>,
): void {
  try {
    track(event, props);
  } catch {
    // Swallow — analytics should never interfere with app logic.
  }
}

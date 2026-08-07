import { defineConfig } from "vitest/config";

/**
 * Vitest config for KasiKash.
 *
 * Introduced with PR #22 (Evidence Tier Foundations). We only test
 * pure-logic modules today: the evidence classifier and the KasiScore
 * calculator. UI screens and Supabase-integrated code are not covered
 * yet — they'd need @testing-library/react + a Supabase mock layer,
 * which is a follow-up.
 *
 * Any *.test.ts file placed next to the module it tests is picked up
 * automatically. Node environment is sufficient (nothing under test
 * touches the DOM).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    // Keep output terse so it's easy to scan in CI logs.
    reporters: ["default"],
    // Fail on unhandled promise rejections and unhandled errors, so a
    // silent bug in async code doesn't slip past a green test run.
    dangerouslyIgnoreUnhandledErrors: false,
  },
});

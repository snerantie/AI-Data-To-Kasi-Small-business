import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Nullable Supabase singleton.
 *
 * If both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set at build
 * time, we create a client. Otherwise `supabase` is null and the app
 * falls back to localStorage-only mode (the offline demo).
 */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const isCloudConfigured = supabase !== null;

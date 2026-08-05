// Shared Supabase client factory for KasiKash Edge Functions.
//
// Two roles:
//   - service()  = service_role, bypasses RLS. Use for reading secrets from
//                  stokvel_payment_config, updating payment rows, etc.
//   - forUser(jwt) = authenticated as the caller. Use for permission checks
//                    (e.g. verifying a user is admin/member of a stokvel).

// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

export function service() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Return a Supabase client acting as the calling user.
 * Extracts the JWT from the Authorization header on the request.
 */
export function forUser(req: Request) {
  const authHeader = req.headers.get("Authorization") ?? "";
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: authHeader } },
  });
}

export async function getCallerId(req: Request): Promise<string | null> {
  const supabase = forUser(req);
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function isStokvelMember(
  stokvelId: string,
  userId: string,
): Promise<boolean> {
  const svc = service();
  const { data, error } = await svc
    .from("stokvel_memberships")
    .select("user_id")
    .eq("stokvel_id", stokvelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function isStokvelAdmin(
  stokvelId: string,
  userId: string,
): Promise<boolean> {
  const svc = service();
  const { data, error } = await svc
    .from("stokvel_memberships")
    .select("role")
    .eq("stokvel_id", stokvelId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return (data as any).role === "admin";
}

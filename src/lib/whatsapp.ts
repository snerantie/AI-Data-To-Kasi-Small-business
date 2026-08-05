import { supabase } from "./supabase";

/**
 * Client wrappers for WhatsApp Bot configuration (PR #20).
 *
 * Admins can plug in their own Meta Cloud API credentials so
 * members (identified by their WhatsApp sender number) can text
 * natural-language sales into their KasiKash account. The heavy
 * lifting happens in the `whatsapp-webhook` Edge Function; this
 * module just handles config storage.
 *
 * All the raw secrets (`waba_access_token`, `verify_token`) are
 * write-only from the client's perspective — the whatsapp_bot_configs
 * table has RLS locked down to service_role. We upsert via a
 * dedicated Edge Function (`save-whatsapp-config`, deployed
 * separately) so client-side JS never handles the token directly
 * in localStorage or state.
 *
 * Read-side uses the whatsapp_bot_status VIEW, which only exposes
 * the client-safe subset: is_active + sender_phone.
 */

export type WhatsAppStatus = {
  isActive: boolean;
  senderPhone: string | null;
};

/**
 * Get the current WhatsApp bot status for the signed-in user. Returns
 * null if no config exists yet.
 */
export async function fetchWhatsAppStatus(): Promise<WhatsAppStatus | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("whatsapp_bot_status")
    .select("is_active, sender_phone")
    .maybeSingle();
  if (error || !data) return null;
  return {
    isActive: Boolean((data as { is_active: boolean }).is_active),
    senderPhone: (data as { sender_phone: string | null }).sender_phone,
  };
}

/**
 * Random-ish verify token to save the admin from thinking one up.
 * Meta requires this to be a string; a URL-safe base32-ish string
 * of a few characters is plenty.
 */
export function generateVerifyToken(): string {
  const chars = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  const bits = 32;
  let out = "";
  for (let i = 0; i < bits; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export type SaveWhatsAppInput = {
  wabaPhoneId: string;
  wabaAccessToken: string;
  verifyToken: string;
  senderPhone: string;
};

/**
 * Save (or clear) the WhatsApp bot config for the signed-in user.
 * Passes through to the `save-whatsapp-config` Edge Function which
 * runs with the service role key and can write the sensitive
 * columns. The function also flips `is_active` after a live-check.
 *
 * Not deployed by default — see DEPLOY.md for how to enable.
 */
export async function saveWhatsAppConfig(
  input: SaveWhatsAppInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  const { data, error } = await supabase.functions.invoke(
    "save-whatsapp-config",
    { body: input },
  );
  if (error) {
    return { ok: false, error: error.message ?? "Function invocation failed" };
  }
  const payload = data as { ok?: boolean; error?: string };
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "Unknown error" };
  }
  return { ok: true };
}

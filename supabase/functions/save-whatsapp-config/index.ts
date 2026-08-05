/**
 * save-whatsapp-config Edge Function (PR #20).
 *
 * Authenticated endpoint that the admin's Settings screen calls to
 * write WhatsApp Cloud API credentials into whatsapp_bot_configs.
 * Uses the service role key server-side so the writes bypass the
 * "no access" RLS on that table. The auth check is done in-function
 * via the caller's JWT.
 *
 * Deploy:  supabase functions deploy save-whatsapp-config
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type SaveBody = {
  wabaPhoneId?: string;
  wabaAccessToken?: string;
  verifyToken?: string;
  senderPhone?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  // -- Auth: get caller's user_id from their JWT ---------------------
  const authz = req.headers.get("authorization") ?? "";
  const jwt = authz.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return new Response(JSON.stringify({ ok: false, error: "unauthenticated" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }
  const { data: userData, error: userError } = await admin.auth.getUser(jwt);
  if (userError || !userData?.user?.id) {
    return new Response(JSON.stringify({ ok: false, error: "unauthenticated" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }
  const userId = userData.user.id;

  let body: SaveBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "bad_json" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  const { wabaPhoneId, wabaAccessToken, verifyToken, senderPhone } = body;
  if (!wabaPhoneId || !wabaAccessToken || !verifyToken) {
    return new Response(JSON.stringify({ ok: false, error: "missing_fields" }), {
      status: 400,
      headers: { ...CORS_HEADERS, "content-type": "application/json" },
    });
  }

  // -- Sanity-check the token by hitting Meta's Graph API ------------
  // We call /me on the token; a 200 means the token is valid, and
  // gives us a sense that the admin actually copied the right thing.
  // Live phone-number verification is a follow-up: the token could be
  // valid but tied to a different WABA account. For MVP, catching the
  // "pasted the wrong string" case is enough.
  try {
    const r = await fetch(
      `https://graph.facebook.com/v18.0/${encodeURIComponent(wabaPhoneId)}?fields=verified_name,display_phone_number`,
      { headers: { authorization: `Bearer ${wabaAccessToken}` } },
    );
    if (!r.ok) {
      const errText = await r.text();
      return new Response(
        JSON.stringify({ ok: false, error: `meta_check_failed: ${errText.slice(0, 200)}` }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "content-type": "application/json" },
        },
      );
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: `meta_unreachable: ${(e as Error).message}` }),
      {
        status: 502,
        headers: { ...CORS_HEADERS, "content-type": "application/json" },
      },
    );
  }

  // -- Upsert config -------------------------------------------------
  const { error: upsertError } = await admin.from("whatsapp_bot_configs").upsert(
    {
      user_id: userId,
      waba_phone_id: wabaPhoneId,
      waba_access_token: wabaAccessToken,
      verify_token: verifyToken,
      sender_phone: senderPhone ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertError) {
    return new Response(
      JSON.stringify({ ok: false, error: upsertError.message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "content-type": "application/json" },
      },
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
});

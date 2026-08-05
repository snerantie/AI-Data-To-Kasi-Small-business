/**
 * WhatsApp Cloud API webhook (PR #20).
 *
 * Meta calls this endpoint two ways:
 *
 *   1. GET  → verification challenge when the admin first hooks up the
 *      webhook. We reply with hub.challenge if hub.verify_token
 *      matches the value stored in whatsapp_bot_configs.
 *
 *   2. POST → an incoming message from a WhatsApp user. We look up
 *      which KasiKash user owns the sender phone number, parse the
 *      message body as a natural-language sale ("3 bread R18") and
 *      insert a sales row on their behalf.
 *
 * Deploy with `--no-verify-jwt` (Meta doesn't send a Supabase JWT):
 *
 *     supabase functions deploy whatsapp-webhook --no-verify-jwt
 *
 * See DEPLOY.md for the full Meta Business Manager walkthrough.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// CORS (mainly for the OPTIONS preflight — Meta itself doesn't send
// browser CORS headers, but a dev might hit this URL manually).
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-hub-signature-256",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Message parsing. Deliberately duplicated from src/voice.ts because
// the client is a Vite-built browser bundle and this is a Deno Edge
// Function — different runtimes, different module resolution.
//
// Keep this in sync with parseSale() in the client. When one changes,
// port the change over.
// ---------------------------------------------------------------------------

type ParsedSale = {
  item: string;
  qty: number;
  price: number;
};

const ITEM_WORDS: Array<{ canonical: string; matches: RegExp }> = [
  { canonical: "Bread", matches: /\b(bread|isinkwa|bohobe)\b/i },
  { canonical: "Milk", matches: /\b(milk|ubisi|lebese)\b/i },
  { canonical: "Coke", matches: /\b(coke|coca[-\s]?cola)\b/i },
  { canonical: "Airtime", matches: /\b(airtime|nako)\b/i },
  { canonical: "Sugar", matches: /\b(sugar|ushukela|tsoekere)\b/i },
  { canonical: "Rice", matches: /\b(rice|irayisi|raese)\b/i },
  { canonical: "Chips", matches: /\b(chips|amashipsi|litchips)\b/i },
];

// Word→digit mapping so "three" becomes "3", etc. Small set focused on
// SA township vocab; enough for the "3 bread R18" case.
const NUM_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5",
  six: "6", seven: "7", eight: "8", nine: "9", ten: "10",
};

function wordsToNumbers(s: string): string {
  return s.replace(/\b([a-z]+)\b/gi, (m, w) => {
    const key = String(w).toLowerCase();
    return NUM_WORDS[key] ?? m;
  });
}

function parseSale(raw: string): ParsedSale | null {
  if (!raw || !raw.trim()) return null;
  const normalized = wordsToNumbers(raw);

  let item = "Item";
  for (const w of ITEM_WORDS) {
    if (w.matches.test(raw)) {
      item = w.canonical;
      break;
    }
  }

  const nums = Array.from(normalized.matchAll(/\b(\d+(?:\.\d+)?)\b/g)).map(
    (m) => parseFloat(m[1]),
  );
  if (nums.length === 0) return null;

  let qty = 1;
  let price = nums[0];

  if (nums.length >= 2) {
    const [a, b] = nums;
    if (a <= 20 && b > a) {
      qty = a; price = b;
    } else if (b <= 20 && a > b) {
      qty = b; price = a;
    } else {
      qty = 1; price = Math.max(a, b);
    }
  }

  const perUnitHint = /\b(at|each|per|ngo|nge|ka|kaofela|e nngwe)\b/i.test(raw);
  if (!perUnitHint && nums.length === 1) {
    price = nums[0];
    qty = 1;
  }

  return { item, qty, price };
}

// ---------------------------------------------------------------------------
// Normalise a WhatsApp-supplied phone (the "from" field). Meta gives
// numbers as E.164 without the plus prefix (e.g. "27831234567"). We
// prepend '+' to match how normaliseSAPhone stores them in profiles.
// ---------------------------------------------------------------------------
function normaliseWaFrom(from: string): string {
  const digits = from.replace(/[^\d]/g, "");
  return "+" + digits;
}

// ---------------------------------------------------------------------------
// Send an outgoing WhatsApp text using the admin's access token and
// phone_id. Used for auto-replies (confirmation of a logged sale,
// "please link your account first" error, etc).
// ---------------------------------------------------------------------------
async function sendWaText(
  phoneId: string,
  accessToken: string,
  to: string,
  body: string,
): Promise<void> {
  await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  }).catch(() => {
    // Never fail the webhook because we couldn't send an auto-reply.
    // Meta will happily retry the incoming message otherwise.
  });
}

// ---------------------------------------------------------------------------
// Extract the admin config that owns this webhook. We do this by
// looking at which phone_number_id Meta included in the payload; each
// admin has a unique phone_number_id.
// ---------------------------------------------------------------------------
async function loadConfigForPhoneId(phoneId: string) {
  const { data } = await admin
    .from("whatsapp_bot_configs")
    .select("user_id, waba_access_token, verify_token, is_active")
    .eq("waba_phone_id", phoneId)
    .maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  // -- Verification challenge (GET) -----------------------------------
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode !== "subscribe" || !token || !challenge) {
      return new Response("Bad request", { status: 400, headers: CORS_HEADERS });
    }
    // Any admin config with a matching verify_token completes the
    // handshake. This lets multiple admins share one webhook URL.
    const { data } = await admin
      .from("whatsapp_bot_configs")
      .select("user_id")
      .eq("verify_token", token)
      .maybeSingle();
    if (!data) {
      return new Response("Forbidden", { status: 403, headers: CORS_HEADERS });
    }
    return new Response(challenge, {
      status: 200,
      headers: { ...CORS_HEADERS, "content-type": "text/plain" },
    });
  }

  // -- Incoming message (POST) ---------------------------------------
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad JSON", { status: 400, headers: CORS_HEADERS });
  }

  // Meta's payload shape (as of v18):
  // {
  //   object: 'whatsapp_business_account',
  //   entry: [
  //     {
  //       changes: [
  //         {
  //           value: {
  //             metadata: { phone_number_id: "1234567890" },
  //             messages: [{ from, id, type, text: { body }, ... }]
  //           }
  //         }
  //       ]
  //     }
  //   ]
  // }
  const entries = (payload as any)?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      const phoneId = value?.metadata?.phone_number_id as string | undefined;
      if (!phoneId) continue;

      const config = await loadConfigForPhoneId(phoneId);
      if (!config || !config.is_active) continue;

      const messages = value?.messages ?? [];
      for (const msg of messages) {
        if (msg?.type !== "text") continue;
        const body = msg?.text?.body as string | undefined;
        const from = msg?.from as string | undefined;
        if (!body || !from) continue;

        const phone = normaliseWaFrom(from);

        // Look up the sender's KasiKash user_id by their phone number.
        const { data: uidRow } = await admin.rpc("user_id_from_whatsapp_phone", {
          p_phone: phone,
        });
        const userId = uidRow as string | null;

        if (!userId) {
          await sendWaText(
            phoneId,
            config.waba_access_token,
            from,
            "👋 KasiKash: We don't recognise this number yet. Sign in to KasiKash and link your phone under Settings → Account first.",
          );
          continue;
        }

        // Parse the message body as a sale.
        const parsed = parseSale(body);
        if (!parsed) {
          await sendWaText(
            phoneId,
            config.waba_access_token,
            from,
            "🤔 KasiKash: I couldn't work out what you sold. Try 'sold 3 bread R18'.",
          );
          continue;
        }

        // Log the sale via the SECURITY DEFINER helper so it lands
        // owned by the correct user despite service_role driving.
        const { data: saleId, error } = await admin.rpc("log_sale_via_bot", {
          p_user_id: userId,
          p_item: parsed.item,
          p_qty: parsed.qty,
          p_price: parsed.price,
          p_raw: body,
        });

        if (error || !saleId) {
          await sendWaText(
            phoneId,
            config.waba_access_token,
            from,
            "⚠️ KasiKash: Something went wrong logging that sale. Try again or open the app.",
          );
          continue;
        }

        const total = parsed.qty * parsed.price;
        await sendWaText(
          phoneId,
          config.waba_access_token,
          from,
          `✅ KasiKash: Logged ${parsed.qty} × ${parsed.item} @ R${parsed.price}. Total R${total}.`,
        );
      }
    }
  }

  // Meta expects a 200 OK within a few seconds even if we're still
  // processing internally. Always return quickly here.
  return new Response("ok", { status: 200, headers: CORS_HEADERS });
});

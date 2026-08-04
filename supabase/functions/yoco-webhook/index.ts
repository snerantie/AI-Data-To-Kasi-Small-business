// Edge Function: yoco-webhook
//
// Public HTTPS endpoint that Yoco calls with payment status events.
// URL format: https://<project>.supabase.co/functions/v1/yoco-webhook
//
// Flow:
//   1. Read raw body (needed for signature verification)
//   2. Parse event, extract checkout_id from payload
//   3. Look up which stokvel this checkout belongs to via
//      stokvel_payments.yoco_checkout_id
//   4. Get that stokvel's webhook_secret from stokvel_payment_config
//   5. Compute HMAC-SHA256 signature and compare against Yoco's header
//   6. Map Yoco event type to our internal status and update the payment
//   7. The DB trigger then auto-inserts the contribution row
//
// Yoco webhook signature scheme (based on Yoco developer docs):
//   Header: webhook-signature: v1,<timestamp>,<signature>
//   Body used for signing: <webhook-id>.<timestamp>.<payload>
//   Signature: HMAC-SHA256 with the webhook secret, base64-encoded
// The exact scheme is version-tolerant here \u2014 we accept the payload if
// the signature matches EITHER of the two documented variants.

// deno-lint-ignore-file no-explicit-any
import { errorResponse, jsonResponse } from "../_shared/cors.ts";
import { service } from "../_shared/supabase.ts";

interface YocoWebhookEvent {
  id: string;
  type: string;
  createdDate?: string;
  payload: {
    id: string; // checkout id
    status?: string;
    amount?: number;
    metadata?: Record<string, string>;
  };
}

// ---- Signature helpers ----------------------------------------------------

function b64FromArrayBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64FromString(s: string): string {
  return btoa(s);
}

async function hmacSha256Base64(
  secret: string,
  message: string,
): Promise<string> {
  const enc = new TextEncoder();
  const rawSecret = (() => {
    // Yoco webhook secrets are prefixed with "whsec_" then base64. If we see
    // that shape we strip and decode; otherwise treat as raw string.
    if (secret.startsWith("whsec_")) {
      const b64 = secret.slice("whsec_".length);
      const bin = atob(b64);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    }
    return enc.encode(secret);
  })();

  const key = await crypto.subtle.importKey(
    "raw",
    rawSecret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return b64FromArrayBuffer(sig);
}

// Constant-time-ish compare (short strings, fine here)
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(
  secret: string,
  webhookId: string | null,
  timestamp: string | null,
  headerSig: string | null,
  rawBody: string,
): Promise<boolean> {
  if (!headerSig) return false;

  // Header format examples we handle:
  //   "v1,<ts>,<sig>"       (some Yoco docs)
  //   "t=<ts>,v1=<sig>"     (Stripe-like)
  //   Plain "<sig>"          (fallback)
  const parts = headerSig.split(",").map((s) => s.trim());
  let sig: string | null = null;
  let ts = timestamp;
  for (const p of parts) {
    if (p.startsWith("t=")) ts = p.slice(2);
    else if (p.startsWith("v1=")) sig = p.slice(3);
    else if (p.startsWith("v1")) {
      // "v1" alone means the next field is the signature (positional)
    } else if (!sig && p.length > 10) sig = p;
  }
  if (!sig) return false;

  // Try both signing schemes:
  //   Scheme A: HMAC(secret, `${webhookId}.${ts}.${rawBody}`)
  //   Scheme B: HMAC(secret, `${ts}.${rawBody}`)
  const candidates: string[] = [];
  if (webhookId && ts) {
    candidates.push(await hmacSha256Base64(secret, `${webhookId}.${ts}.${rawBody}`));
  }
  if (ts) {
    candidates.push(await hmacSha256Base64(secret, `${ts}.${rawBody}`));
  }
  candidates.push(await hmacSha256Base64(secret, rawBody));

  // Yoco sometimes returns hex-encoded signatures; also try comparing raw
  for (const cand of candidates) {
    if (safeEqual(sig, cand)) return true;
    // Also try base64url variant
    const b64url = cand.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (safeEqual(sig, b64url)) return true;
  }
  return false;
}

// ---- Handler --------------------------------------------------------------

function mapStatus(eventType: string): "succeeded" | "failed" | null {
  const t = eventType.toLowerCase();
  if (t.includes("succeed") || t.includes("success")) return "succeeded";
  if (t.includes("fail") || t.includes("error")) return "failed";
  return null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return errorResponse(405, "Method not allowed");

  const rawBody = await req.text();

  let event: YocoWebhookEvent;
  try {
    event = JSON.parse(rawBody) as YocoWebhookEvent;
  } catch {
    return errorResponse(400, "Invalid JSON");
  }

  const checkoutId = event.payload?.id;
  if (!checkoutId) {
    // Not a payment event we care about (e.g. test ping)
    return jsonResponse({ ok: true, ignored: true });
  }

  const svc = service();

  // Look up payment row + stokvel config
  const { data: paymentRow } = await svc
    .from("stokvel_payments")
    .select("id, stokvel_id, status")
    .eq("yoco_checkout_id", checkoutId)
    .maybeSingle();

  if (!paymentRow) {
    // Could be a payment from before our system, or a duplicate call.
    return jsonResponse({ ok: true, unknown_checkout: true });
  }
  const payment = paymentRow as any;

  const { data: cfgRow } = await svc
    .from("stokvel_payment_config")
    .select("yoco_webhook_secret, yoco_webhook_id")
    .eq("stokvel_id", payment.stokvel_id)
    .maybeSingle();

  const webhookSecret = (cfgRow as any)?.yoco_webhook_secret;
  const webhookId = (cfgRow as any)?.yoco_webhook_id ?? null;

  if (webhookSecret) {
    const headerSig =
      req.headers.get("webhook-signature") ??
      req.headers.get("Webhook-Signature") ??
      req.headers.get("x-yoco-signature");
    const headerTs =
      req.headers.get("webhook-timestamp") ??
      req.headers.get("Webhook-Timestamp");
    const ok = await verifySignature(
      webhookSecret,
      webhookId,
      headerTs,
      headerSig,
      rawBody,
    );
    if (!ok) {
      return errorResponse(401, "Signature verification failed");
    }
  }

  const nextStatus = mapStatus(event.type);
  if (nextStatus === null) {
    // Ignored event (e.g. informational)
    return jsonResponse({ ok: true, ignored_event: event.type });
  }

  // Idempotency: don't downgrade a succeeded payment
  if (payment.status === "succeeded" && nextStatus !== "succeeded") {
    return jsonResponse({ ok: true, no_change: true });
  }

  const { error: updateErr } = await svc
    .from("stokvel_payments")
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (updateErr) {
    return errorResponse(500, `Update failed: ${updateErr.message}`);
  }

  return jsonResponse({ ok: true, status: nextStatus });
});

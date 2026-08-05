// Edge Function: create-checkout
//
// Called by a stokvel member when they tap Contribute Rxxx.
// Body: { stokvel_id, amount, app_url }
//
// Flow:
//   1. Verify caller is authenticated
//   2. Verify caller is a member of the stokvel
//   3. Read the stokvel's Yoco config (service_role, bypasses RLS)
//   4. Insert a pending stokvel_payments row (returns our payment id)
//   5. Call Yoco POST /checkouts with the amount + our return URLs +
//      metadata (payment_id, stokvel_id, user_id)
//   6. Update the pending row with the Yoco checkout_id
//   7. Return { checkout_url, payment_id } to the client
//
// The client then window.location.href = checkout_url so the user
// completes payment on Yoco's hosted page. When Yoco finishes it POSTs
// to /yoco-webhook and redirects the user back to app_url with
// ?payment_return=success|cancel|failed&pid={payment_id}.

// deno-lint-ignore-file no-explicit-any
import {
  errorResponse,
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";
import { getCallerId, isStokvelMember, service } from "../_shared/supabase.ts";

interface RequestBody {
  stokvel_id: string;
  amount: number; // in Rand (we'll convert to cents for Yoco)
  app_url: string; // e.g. https://kasikash.vercel.app
}

interface YocoCheckoutResponse {
  id: string;
  redirectUrl: string;
  status: string;
}

const YOCO_BASE = "https://payments.yoco.com/api";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "POST") return errorResponse(405, "Method not allowed");

  const callerId = await getCallerId(req);
  if (!callerId) return errorResponse(401, "Unauthorized");

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return errorResponse(400, "Invalid JSON");
  }

  if (
    typeof body.stokvel_id !== "string" ||
    typeof body.amount !== "number" ||
    body.amount <= 0 ||
    body.amount > 100000
  ) {
    return errorResponse(400, "Missing or invalid fields");
  }
  const appUrl = (body.app_url || "").replace(/\/$/, "");
  if (!appUrl.startsWith("http")) {
    return errorResponse(400, "Missing app_url");
  }

  // Verify membership
  const isMember = await isStokvelMember(body.stokvel_id, callerId);
  if (!isMember) {
    return errorResponse(403, "You must be a stokvel member to contribute");
  }

  const svc = service();

  // Fetch Yoco config
  const { data: config, error: cfgErr } = await svc
    .from("stokvel_payment_config")
    .select("yoco_secret_key, is_active, is_test")
    .eq("stokvel_id", body.stokvel_id)
    .maybeSingle();

  if (cfgErr) {
    return errorResponse(500, `Config lookup failed: ${cfgErr.message}`);
  }
  if (!config || !(config as any).is_active) {
    return errorResponse(400, "Payments are not configured for this stokvel");
  }

  const isTest = Boolean((config as any).is_test);

  // Insert pending payment row
  const { data: paymentRow, error: insertErr } = await svc
    .from("stokvel_payments")
    .insert({
      stokvel_id: body.stokvel_id,
      user_id: callerId,
      amount: body.amount,
      status: "pending",
      is_test: isTest,
    })
    .select("id")
    .single();

  if (insertErr || !paymentRow) {
    return errorResponse(
      500,
      `Failed to create payment row: ${insertErr?.message ?? "unknown"}`,
    );
  }

  const paymentId = (paymentRow as { id: string }).id;

  // Build Yoco checkout request
  const returnBase = `${appUrl}/?payment_return`;
  const yocoBody = {
    amount: Math.round(body.amount * 100), // ZAR cents
    currency: "ZAR",
    successUrl: `${returnBase}=success&pid=${paymentId}`,
    cancelUrl: `${returnBase}=cancel&pid=${paymentId}`,
    failureUrl: `${returnBase}=failed&pid=${paymentId}`,
    metadata: {
      payment_id: paymentId,
      stokvel_id: body.stokvel_id,
      user_id: callerId,
    },
  };

  const res = await fetch(`${YOCO_BASE}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${(config as any).yoco_secret_key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(yocoBody),
  });

  if (!res.ok) {
    const text = await res.text();
    await svc
      .from("stokvel_payments")
      .update({
        status: "failed",
        error_message: `Yoco error ${res.status}: ${text.slice(0, 500)}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    return errorResponse(502, `Yoco rejected the checkout: ${res.status}`);
  }

  const checkout = (await res.json()) as YocoCheckoutResponse;

  // Update payment row with the Yoco checkout id
  await svc
    .from("stokvel_payments")
    .update({
      yoco_checkout_id: checkout.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);

  return jsonResponse({
    payment_id: paymentId,
    checkout_url: checkout.redirectUrl,
    is_test: isTest,
  });
});

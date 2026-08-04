// Edge Function: save-payment-config
//
// Called by a stokvel admin from the KasiKash Settings > Payments panel.
// Body: { stokvel_id, yoco_secret_key, is_test, app_url }
//
// Flow:
//   1. Verify the caller is authenticated
//   2. Verify the caller is an admin of the given stokvel
//   3. Validate the Yoco secret key by attempting to register a webhook
//      pointing at our /yoco-webhook Edge Function URL
//   4. Store secret + webhook secret + webhook id + is_test in
//      stokvel_payment_config
//   5. Return { ok: true }
//
// If the admin had a previous webhook registered we replace it so there
// aren't stale endpoints.

import {
  corsHeaders,
  errorResponse,
  handleOptions,
  jsonResponse,
} from "../_shared/cors.ts";
import { getCallerId, isStokvelAdmin, service } from "../_shared/supabase.ts";

interface RequestBody {
  stokvel_id: string;
  yoco_secret_key: string;
  is_test: boolean;
}

interface YocoWebhookResponse {
  id: string;
  secret: string;
  url: string;
}

const YOCO_BASE = "https://payments.yoco.com/api";

function webhookUrl(): string {
  const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
  // Function is served at /functions/v1/yoco-webhook
  return `${projectUrl}/functions/v1/yoco-webhook`;
}

async function registerYocoWebhook(
  secretKey: string,
): Promise<YocoWebhookResponse | { error: string }> {
  try {
    const res = await fetch(`${YOCO_BASE}/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "kasikash-webhook",
        url: webhookUrl(),
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: `Yoco webhook registration failed (${res.status}): ${text}` };
    }
    const data = (await res.json()) as YocoWebhookResponse;
    return data;
  } catch (err) {
    return { error: `Network error calling Yoco: ${String(err)}` };
  }
}

async function deleteYocoWebhook(
  secretKey: string,
  webhookId: string,
): Promise<void> {
  try {
    await fetch(`${YOCO_BASE}/webhooks/${webhookId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${secretKey}` },
    });
  } catch {
    // Best effort — if deletion fails the webhook is still there,
    // but registered against the previous secret which is now unused.
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "POST") {
    return errorResponse(405, "Method not allowed");
  }

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
    typeof body.yoco_secret_key !== "string" ||
    body.yoco_secret_key.length < 10
  ) {
    return errorResponse(400, "Missing or invalid fields");
  }

  const isTest = Boolean(body.is_test);

  const admin = await isStokvelAdmin(body.stokvel_id, callerId);
  if (!admin) {
    return errorResponse(403, "Only stokvel admins can configure payments");
  }

  // Look up any existing config so we can revoke the old webhook
  const svc = service();
  const { data: existing } = await svc
    .from("stokvel_payment_config")
    .select("yoco_secret_key, yoco_webhook_id")
    .eq("stokvel_id", body.stokvel_id)
    .maybeSingle();

  if (existing && (existing as any).yoco_webhook_id) {
    await deleteYocoWebhook(
      (existing as any).yoco_secret_key ?? body.yoco_secret_key,
      (existing as any).yoco_webhook_id,
    );
  }

  const webhook = await registerYocoWebhook(body.yoco_secret_key.trim());
  if ("error" in webhook) {
    return errorResponse(400, webhook.error);
  }

  const { error: upsertErr } = await svc
    .from("stokvel_payment_config")
    .upsert(
      {
        stokvel_id: body.stokvel_id,
        yoco_secret_key: body.yoco_secret_key.trim(),
        yoco_webhook_secret: webhook.secret,
        yoco_webhook_id: webhook.id,
        is_active: true,
        is_test: isTest,
        configured_by: callerId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stokvel_id" },
    );

  if (upsertErr) {
    return errorResponse(500, `Failed to save config: ${upsertErr.message}`);
  }

  return jsonResponse({
    ok: true,
    is_active: true,
    is_test: isTest,
    webhook_registered: true,
  });
});

// deno-lint-ignore no-unused-vars
const _cors = corsHeaders; // keep reference to avoid unused import warning

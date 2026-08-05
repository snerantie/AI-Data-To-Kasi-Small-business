// Shared CORS helpers for all KasiKash Edge Functions.
//
// Same-origin from the deployed app is enough here; wildcard is fine for
// authenticated endpoints because auth is JWT-bearer-based, not cookie-based.

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
} as const;

export function handleOptions(): Response {
  return new Response("ok", { headers: corsHeaders });
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

export function errorResponse(
  status: number,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return jsonResponse({ error: message, ...extra }, { status });
}

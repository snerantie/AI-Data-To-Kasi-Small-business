import { supabase } from "./supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Client-side wrappers for the KasiKash payment flow.
 *
 * These functions invoke Supabase Edge Functions (save-payment-config,
 * create-checkout) and provide a Realtime subscription helper for
 * watching a pending payment through to success/failure.
 *
 * All functions are best-effort: if Supabase isn't configured (demo
 * mode), they return typed error results without throwing.
 */

// ---- Types -----------------------------------------------------------------

export type PaymentStatus = "pending" | "succeeded" | "failed" | "cancelled";

export type PaymentConfigStatus = {
  isActive: boolean;
  isTest: boolean;
};

export type SavePaymentConfigResult =
  | { ok: true; isActive: boolean; isTest: boolean }
  | { ok: false; error: string };

export type CreateCheckoutResult =
  | { ok: true; paymentId: string; checkoutUrl: string; isTest: boolean }
  | { ok: false; error: string };

export type PaymentRow = {
  id: string;
  stokvelId: string;
  userId: string;
  amount: number;
  status: PaymentStatus;
  yocoCheckoutId: string | null;
  isTest: boolean;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
};

// ---- Payment config --------------------------------------------------------

/**
 * Fetch the client-safe payment config status for a stokvel.
 * Returns null if the stokvel has no config or the user has no access.
 */
export async function fetchPaymentConfigStatus(
  stokvelId: string,
): Promise<PaymentConfigStatus | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stokvel_payment_status")
    .select("is_active, is_test")
    .eq("stokvel_id", stokvelId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    isActive: Boolean((data as { is_active: boolean }).is_active),
    isTest: Boolean((data as { is_test: boolean }).is_test),
  };
}

/**
 * Admin-only. Save the Yoco secret for a stokvel. The Edge Function
 * validates the key by registering a webhook against it and stores
 * both the secret and the webhook signing secret.
 */
export async function savePaymentConfig(
  stokvelId: string,
  yocoSecretKey: string,
  isTest: boolean,
): Promise<SavePaymentConfigResult> {
  if (!supabase) {
    return { ok: false, error: "Cloud not configured" };
  }
  const { data, error } = await supabase.functions.invoke(
    "save-payment-config",
    {
      body: {
        stokvel_id: stokvelId,
        yoco_secret_key: yocoSecretKey.trim(),
        is_test: isTest,
      },
    },
  );
  if (error) {
    return { ok: false, error: error.message ?? "Function invocation failed" };
  }
  const payload = data as {
    ok?: boolean;
    error?: string;
    is_active?: boolean;
    is_test?: boolean;
  };
  if (!payload?.ok) {
    return { ok: false, error: payload?.error ?? "Unknown error" };
  }
  return {
    ok: true,
    isActive: Boolean(payload.is_active),
    isTest: Boolean(payload.is_test),
  };
}

// ---- Checkout --------------------------------------------------------------

/**
 * Create a Yoco checkout session for a contribution. On success returns
 * the URL the caller should navigate the user to.
 */
export async function createCheckout(
  stokvelId: string,
  amount: number,
): Promise<CreateCheckoutResult> {
  if (!supabase) return { ok: false, error: "Cloud not configured" };
  if (typeof window === "undefined") {
    return { ok: false, error: "No window context" };
  }

  const appUrl = window.location.origin;
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: {
      stokvel_id: stokvelId,
      amount,
      app_url: appUrl,
    },
  });
  if (error) {
    return { ok: false, error: error.message ?? "Function invocation failed" };
  }
  const payload = data as {
    payment_id?: string;
    checkout_url?: string;
    is_test?: boolean;
    error?: string;
  };
  if (!payload?.payment_id || !payload?.checkout_url) {
    return { ok: false, error: payload?.error ?? "Bad response" };
  }
  return {
    ok: true,
    paymentId: payload.payment_id,
    checkoutUrl: payload.checkout_url,
    isTest: Boolean(payload.is_test),
  };
}

// ---- Payment status --------------------------------------------------------

type PaymentDbRow = {
  id: string;
  stokvel_id: string;
  user_id: string;
  amount: number | string;
  status: PaymentStatus;
  yoco_checkout_id: string | null;
  is_test: boolean;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

const rowToPayment = (r: PaymentDbRow): PaymentRow => ({
  id: r.id,
  stokvelId: r.stokvel_id,
  userId: r.user_id,
  amount: typeof r.amount === "string" ? parseFloat(r.amount) : r.amount,
  status: r.status,
  yocoCheckoutId: r.yoco_checkout_id,
  isTest: r.is_test,
  errorMessage: r.error_message,
  createdAt: new Date(r.created_at).getTime(),
  updatedAt: new Date(r.updated_at).getTime(),
});

export async function fetchPayment(paymentId: string): Promise<PaymentRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("stokvel_payments")
    .select(
      "id, stokvel_id, user_id, amount, status, yoco_checkout_id, is_test, error_message, created_at, updated_at",
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToPayment(data as PaymentDbRow);
}

/**
 * Subscribe to status changes for a single payment. Returns an
 * unsubscribe function.
 *
 * The callback is invoked whenever the row is updated (typically when
 * the webhook flips status from pending -> succeeded / failed).
 */
export function subscribeToPayment(
  paymentId: string,
  onChange: (payment: PaymentRow) => void,
): () => void {
  const client = supabase;
  if (!client) return () => {};
  const channel: RealtimeChannel = client
    .channel(`payment-${paymentId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "stokvel_payments",
        filter: `id=eq.${paymentId}`,
      },
      (payload) => {
        onChange(rowToPayment(payload.new as PaymentDbRow));
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

/**
 * Subscribe to all payment rows on a stokvel (both INSERT + UPDATE).
 * Used to refresh contributions in near real-time when any member's
 * payment completes.
 */
export function subscribeToStokvelPayments(
  stokvelId: string,
  onChange: (payment: PaymentRow) => void,
): () => void {
  const client = supabase;
  if (!client) return () => {};
  const channel: RealtimeChannel = client
    .channel(`stokvel-payments-${stokvelId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "stokvel_payments",
        filter: `stokvel_id=eq.${stokvelId}`,
      },
      (payload) => {
        const row = (payload.new ?? payload.old) as PaymentDbRow;
        if (row) onChange(rowToPayment(row));
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

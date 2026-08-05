import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "./supabase";

/**
 * Realtime subscription for a stokvel's contributions table. Required
 * for the notifications flow (PR #19) — admins get pinged when
 * members log new pending contributions, and members get pinged when
 * the admin verifies or rejects them.
 *
 * Requires migration 008 to have run (it adds contributions to the
 * supabase_realtime publication). RLS policies still apply — users
 * only see events for stokvels they belong to.
 *
 * The payload shape mirrors what Supabase's Realtime feed emits:
 * {new, old, eventType}. We pass it through raw so callers can act
 * on both INSERT (a new pending row) and UPDATE (status flip).
 */

export type ContribRealtimeRow = {
  id: string;
  stokvel_id: string;
  owner_id: string;
  amount: number | string;
  note: string | null;
  status: "pending" | "confirmed" | "rejected" | null;
  method: string | null;
  reference: string | null;
  created_at: string;
  confirmed_at: string | null;
  rejected_reason: string | null;
};

export type ContribRealtimeEvent = {
  kind: "insert" | "update" | "delete";
  new: ContribRealtimeRow | null;
  old: ContribRealtimeRow | null;
};

export function subscribeToStokvelContributions(
  stokvelId: string,
  onEvent: (event: ContribRealtimeEvent) => void,
): () => void {
  const client = supabase;
  if (!client) return () => {};
  const channel: RealtimeChannel = client
    .channel(`stokvel-contribs-${stokvelId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "contributions",
        filter: `stokvel_id=eq.${stokvelId}`,
      },
      (payload) => {
        const kind =
          payload.eventType === "INSERT"
            ? "insert"
            : payload.eventType === "UPDATE"
              ? "update"
              : "delete";
        onEvent({
          kind,
          new: (payload.new ?? null) as ContribRealtimeRow | null,
          old: (payload.old ?? null) as ContribRealtimeRow | null,
        });
      },
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

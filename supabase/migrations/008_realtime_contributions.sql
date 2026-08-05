-- Migration 008: enable Realtime on the contributions table.
--
-- PR #19 (notifications) wires the client to react in near-real-time
-- when a contribution is added or its verification status changes:
--   * Admin gets an in-app notification when a member logs a pending
--     contribution ("1 payment from Nomsa to verify").
--   * Member gets an in-app notification when their pending row is
--     confirmed or rejected by the admin.
--
-- For the client's postgres_changes subscription to receive those
-- events, the table must be part of the supabase_realtime publication.
-- Adding it here is idempotent (guarded so a re-run doesn't error).
--
-- Row Level Security on public.contributions is unchanged — Realtime
-- events are gated by the same SELECT policy, so a user only sees
-- notifications for stokvels they belong to.

do $$
begin
  begin
    alter publication supabase_realtime add table public.contributions;
  exception
    when duplicate_object then
      -- Already added on a previous run of this migration; nothing to do.
      null;
    when others then
      -- If the publication doesn't exist on this project (very rare —
      -- typically only happens on custom Supabase setups), don't fail
      -- the whole migration. The user can enable Realtime for the
      -- contributions table via the dashboard UI as a fallback.
      raise notice 'Could not add public.contributions to supabase_realtime: %', SQLERRM;
  end;
end
$$;

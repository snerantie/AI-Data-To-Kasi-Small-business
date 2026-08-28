-- Migration 018: stokvel contribution schedule + payout tracking
--
-- Product feature (PR #51). A stokvel needs more than a single lump
-- "goal": members want to know the monthly contribution amount, the
-- day it's due, the payout day, who has paid this cycle, what's
-- outstanding, and a history of payouts made from the pooled fund.
--
-- Schema changes:
--   1. stokvels: monthly_amount / contribution_day / payout_day /
--      frequency (all nullable except frequency which defaults to
--      'monthly'). A stokvel with no schedule set simply shows the
--      "set up a schedule" CTA in the app.
--   2. stokvel_payouts: one row per payout made from the fund back to
--      a member (or external beneficiary), with an admin audit trail.
--
-- Behavioural changes:
--   - record_stokvel_payout(...) SECURITY DEFINER RPC — admin only —
--     mirrors the set_contribution_status / set_stokvel_banking
--     pattern from migration 007.
--   - The contribution schedule itself is written with a plain UPDATE
--     from the client, gated by the existing stokvels_admin_update RLS
--     policy (migration 003) — no new RPC needed.
--
-- Reuses is_stokvel_admin(uuid) / is_stokvel_member(uuid) from the
-- earlier migrations. Run in the Supabase SQL editor AFTER
-- 017_mashonisa_remote_confirmation.sql. Idempotent; safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. stokvels: contribution schedule columns
-- ---------------------------------------------------------------------------
alter table public.stokvels
  add column if not exists monthly_amount numeric
    check (monthly_amount is null or monthly_amount >= 0),
  add column if not exists contribution_day int
    check (contribution_day is null or (contribution_day between 1 and 31)),
  add column if not exists payout_day int
    check (payout_day is null or (payout_day between 1 and 31)),
  add column if not exists frequency text
    default 'monthly'
    check (frequency in ('weekly', 'monthly'));

-- ---------------------------------------------------------------------------
-- 2. stokvel_payouts: payouts made from the pooled fund
-- ---------------------------------------------------------------------------
create table if not exists public.stokvel_payouts (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references public.stokvels(id) on delete cascade,
  amount numeric not null check (amount > 0),
  -- The member who received the payout, if it went to a member. Null
  -- for external beneficiaries (e.g. a funeral parlour for a burial
  -- society). recipient_name is the display label either way.
  recipient_id uuid references public.profiles(id) on delete set null,
  recipient_name text,
  note text,
  paid_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists stokvel_payouts_stokvel_idx
  on public.stokvel_payouts (stokvel_id, paid_at desc);

-- ---------------------------------------------------------------------------
-- 3. RLS: members read their stokvel's payouts; writes go via the RPC
-- ---------------------------------------------------------------------------
alter table public.stokvel_payouts enable row level security;

drop policy if exists "payouts_members_read" on public.stokvel_payouts;
create policy "payouts_members_read" on public.stokvel_payouts
  for select
  using (public.is_stokvel_member(stokvel_id));

-- Admins can delete a mistaken payout entry directly (rare, but useful).
drop policy if exists "payouts_admin_delete" on public.stokvel_payouts;
create policy "payouts_admin_delete" on public.stokvel_payouts
  for delete
  using (public.is_stokvel_admin(stokvel_id));

-- ---------------------------------------------------------------------------
-- 4. record_stokvel_payout(stokvel_id, amount, recipient_id?, name?, note?)
--    Admin-only. Inserts a payout row and returns its id.
-- ---------------------------------------------------------------------------
create or replace function public.record_stokvel_payout(
  p_stokvel_id uuid,
  p_amount numeric,
  p_recipient_id uuid default null,
  p_recipient_name text default null,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_payout_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  if not public.is_stokvel_admin(p_stokvel_id) then
    raise exception 'not_admin';
  end if;

  -- If a recipient_id is supplied, it must be a member of this stokvel.
  if p_recipient_id is not null and not exists (
    select 1 from public.stokvel_memberships m
    where m.stokvel_id = p_stokvel_id
      and m.user_id = p_recipient_id
  ) then
    raise exception 'recipient_not_a_member';
  end if;

  insert into public.stokvel_payouts
    (stokvel_id, amount, recipient_id, recipient_name, note, created_by)
    values (
      p_stokvel_id,
      p_amount,
      p_recipient_id,
      nullif(trim(coalesce(p_recipient_name, '')), ''),
      nullif(trim(coalesce(p_note, '')), ''),
      auth.uid()
    )
    returning id into new_payout_id;

  return new_payout_id;
end;
$$;

grant execute on function public.record_stokvel_payout(uuid, numeric, uuid, text, text)
  to authenticated;

-- End of migration 018.

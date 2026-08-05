-- Migration 005: fix RLS infinite recursion on stokvel_memberships
--
-- Postgres surfaced this error the moment a user tried to create or read
-- a stokvel:
--
--   infinite recursion detected in policy for relation "stokvel_memberships"
--
-- Root cause: the policies in 003_multiuser_stokvel.sql check "is the
-- caller a member of this stokvel?" by running a subquery against
-- stokvel_memberships. That subquery is itself gated by the same
-- policy \u2192 infinite recursion.
--
-- Fix: replace the recursive subqueries with SECURITY DEFINER helper
-- functions that bypass RLS internally.
--
-- Run this in the Supabase SQL editor AFTER 004_yoco_payments.sql.
-- Idempotent, safe to re-run.

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------
create or replace function public.is_stokvel_member(sid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.stokvel_memberships
    where stokvel_id = sid and user_id = auth.uid()
  );
$$;

create or replace function public.is_stokvel_admin(sid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.stokvel_memberships
    where stokvel_id = sid and user_id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_stokvel_member(uuid) to authenticated;
grant execute on function public.is_stokvel_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Rewrite policies to use the helpers
-- ---------------------------------------------------------------------------

-- stokvel_memberships: members can see each other; users can see their own
drop policy if exists "memberships_read" on public.stokvel_memberships;
create policy "memberships_read" on public.stokvel_memberships
  for select using (
    user_id = auth.uid()
    or public.is_stokvel_member(stokvel_id)
  );

drop policy if exists "memberships_delete" on public.stokvel_memberships;
create policy "memberships_delete" on public.stokvel_memberships
  for delete using (
    user_id = auth.uid()
    or public.is_stokvel_admin(stokvel_id)
  );

-- stokvels
drop policy if exists "stokvels_members_read" on public.stokvels;
create policy "stokvels_members_read" on public.stokvels
  for select using (public.is_stokvel_member(stokvels.id));

drop policy if exists "stokvels_admin_update" on public.stokvels;
create policy "stokvels_admin_update" on public.stokvels
  for update
  using (public.is_stokvel_admin(stokvels.id))
  with check (public.is_stokvel_admin(stokvels.id));

-- contributions
drop policy if exists "contributions_members_read" on public.contributions;
create policy "contributions_members_read" on public.contributions
  for select using (
    public.is_stokvel_member(contributions.stokvel_id)
  );

drop policy if exists "contributions_members_insert" on public.contributions;
create policy "contributions_members_insert" on public.contributions
  for insert with check (
    auth.uid() = owner_id
    and public.is_stokvel_member(contributions.stokvel_id)
  );

-- stokvel_invites
drop policy if exists "invites_member_read" on public.stokvel_invites;
create policy "invites_member_read" on public.stokvel_invites
  for select using (
    public.is_stokvel_member(stokvel_invites.stokvel_id)
  );

drop policy if exists "invites_admin_create" on public.stokvel_invites;
create policy "invites_admin_create" on public.stokvel_invites
  for insert with check (
    public.is_stokvel_admin(stokvel_invites.stokvel_id)
  );

drop policy if exists "invites_admin_delete" on public.stokvel_invites;
create policy "invites_admin_delete" on public.stokvel_invites
  for delete using (
    public.is_stokvel_admin(stokvel_invites.stokvel_id)
  );

-- stokvel_payments (from migration 004)
drop policy if exists "stokvel_payments_members_read" on public.stokvel_payments;
create policy "stokvel_payments_members_read" on public.stokvel_payments
  for select using (
    public.is_stokvel_member(stokvel_payments.stokvel_id)
  );

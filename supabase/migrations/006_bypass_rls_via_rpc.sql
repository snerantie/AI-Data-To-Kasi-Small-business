-- Migration 006: bypass RLS-on-INSERT bug via SECURITY DEFINER RPC functions
--
-- Real-user report: after running migrations 001\u2013005 and confirming
-- policies + grants + profile all correct, INSERTs into stokvels still
-- returned 42501 "new row violates row-level security policy".
--
-- Diagnosis showed:
--   \u2022 auth.uid() returns the correct sub in a normal SELECT context
--   \u2022 auth.uid() returns NULL inside the RLS WITH CHECK context
--   \u2022 Disabling RLS lets the insert succeed
--   \u2022 The client sends the right owner_id and JWT sub matches
--
-- Root cause is a Supabase/PostgREST edge case where auth.uid() gets
-- inlined into the policy plan and resolves NULL. Rewriting the policy
-- (with (select auth.uid())) does not help on this project.
--
-- Fix: expose a SECURITY DEFINER RPC that does the INSERT. It reads
-- auth.uid() in a normal function context (works fine there) and does
-- the INSERT with elevated privilege \u2014 bypassing the buggy policy
-- entirely. Same pattern already proven to work for join_stokvel from
-- migration 003.
--
-- No client-side security regression: the RPC sets owner_id from
-- auth.uid() itself, so callers can't forge someone else's identity.

-- Run in the Supabase SQL editor AFTER 005_fix_rls_recursion.sql.
-- Idempotent (create or replace). Safe to re-run.

-- ---------------------------------------------------------------------------
-- create_stokvel(p_name, p_goal, p_members) \u2192 uuid
-- ---------------------------------------------------------------------------
create or replace function public.create_stokvel(
  p_name text,
  p_goal numeric default 5000,
  p_members integer default 1
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_stokvel_id uuid;
  caller_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  insert into public.stokvels (owner_id, name, goal, members)
    values (
      caller_id,
      coalesce(nullif(trim(p_name), ''), 'My Stokvel'),
      coalesce(p_goal, 5000),
      coalesce(p_members, 1)
    )
    returning id into new_stokvel_id;

  -- The handle_new_stokvel trigger from migration 003 auto-creates
  -- the admin membership. Nothing more to do here.
  return new_stokvel_id;
end;
$$;

grant execute on function public.create_stokvel(text, numeric, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- contribute_to_stokvel(p_stokvel_id, p_amount, p_note) \u2192 uuid
-- ---------------------------------------------------------------------------
create or replace function public.contribute_to_stokvel(
  p_stokvel_id uuid,
  p_amount numeric,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_contribution_id uuid;
  caller_id uuid;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  -- Defense in depth: SECURITY DEFINER bypasses RLS, so we check
  -- membership explicitly here to stop callers contributing to
  -- stokvels they don't belong to.
  if not public.is_stokvel_member(p_stokvel_id) then
    raise exception 'not_a_member';
  end if;

  insert into public.contributions (stokvel_id, owner_id, amount, note)
    values (p_stokvel_id, caller_id, p_amount, p_note)
    returning id into new_contribution_id;

  return new_contribution_id;
end;
$$;

grant execute on function public.contribute_to_stokvel(uuid, numeric, text)
  to authenticated;

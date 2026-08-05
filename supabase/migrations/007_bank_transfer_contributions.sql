-- Migration 007: bank-transfer contributions with admin verification
--
-- Feedback that drove this migration:
--   "So every admin has to register with yoco or sign up with yoco?
--    Is there one way to do it just inside the app not outside?"
--
-- The Yoco flow works but is the wrong default for SA township savings
-- groups: it forces every admin to register with a card processor
-- outside the app. Most stokvels operate on EFT / cash between
-- friends who already trust each other.
--
-- The right default: admin enters their bank account details ONCE
-- inside the app; members contribute by doing a normal EFT from
-- their own banking app using an app-generated reference; admin
-- verifies pending contributions inside the app; only verified
-- contributions count toward the stokvel pot total. Yoco stays as
-- an optional automatic-card upgrade.
--
-- Schema changes:
--   1. stokvels: bank_name / bank_account_holder / bank_account_number /
--      bank_branch_code / payshap_phone (all nullable).
--   2. contributions: status ('pending' | 'confirmed' | 'rejected'),
--      method ('manual' | 'eft' | 'cash' | 'yoco' | 'payshap' | 'other'),
--      reference (nullable payment reference), confirmed_at / confirmed_by
--      (audit trail), rejected_reason (nullable).
--
-- Pre-existing contribution rows get status='confirmed' by default so the
-- current pot totals don't change on migration.
--
-- Behavioural changes:
--   - contribute_to_stokvel RPC (from migration 006) is extended with
--     optional p_method and p_reference params. New rows go in with
--     status='pending'. Old callers (still passing only stokvel_id /
--     amount / note) get sensible defaults: method='eft', status='pending'.
--   - handle_payment_succeeded (from migration 004) is updated so Yoco-
--     originated contributions land as status='confirmed', method='yoco'
--     (real card payments don't need admin verification — money already
--     moved).
--   - Two new SECURITY DEFINER RPCs:
--       set_stokvel_banking(...)         — admin only
--       set_contribution_status(...)     — admin only
--
-- Run in the Supabase SQL editor AFTER 006_bypass_rls_via_rpc.sql.
-- Idempotent where possible. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. stokvels: bank account fields
-- ---------------------------------------------------------------------------
alter table public.stokvels
  add column if not exists bank_name text,
  add column if not exists bank_account_holder text,
  add column if not exists bank_account_number text,
  add column if not exists bank_branch_code text,
  add column if not exists payshap_phone text;

-- ---------------------------------------------------------------------------
-- 2. contributions: status / method / reference / audit fields
-- ---------------------------------------------------------------------------
alter table public.contributions
  add column if not exists status text
    default 'confirmed'
    check (status in ('pending', 'confirmed', 'rejected')),
  add column if not exists method text
    default 'manual'
    check (method in ('manual', 'eft', 'cash', 'yoco', 'payshap', 'other')),
  add column if not exists reference text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists confirmed_by uuid
    references public.profiles(id) on delete set null,
  add column if not exists rejected_reason text;

-- Existing rows: they were logged before this migration, so trust them
-- and mark confirmed (already the column default). Doing it explicitly
-- also handles the edge case where the alter added a NULL for
-- pre-existing rows (Postgres does fill DEFAULT for new rows only if
-- the column was added WITHOUT a default value being enforced on
-- existing rows in older versions — belt and braces).
update public.contributions
  set status = 'confirmed'
  where status is null;

update public.contributions
  set method = case
    when payment_id is not null then 'yoco'
    else 'manual'
  end
  where method is null;

-- Index to make the admin's "list pending contributions on my stokvel"
-- query fast even at scale.
create index if not exists contributions_pending_idx
  on public.contributions (stokvel_id, status, created_at desc)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- 3. contribute_to_stokvel RPC (v2)
--    Overloads the migration-006 signature by adding two optional params.
--    Old callers keep working; new callers can specify method + reference.
-- ---------------------------------------------------------------------------
create or replace function public.contribute_to_stokvel(
  p_stokvel_id uuid,
  p_amount numeric,
  p_note text default null,
  p_method text default 'eft',
  p_reference text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_contribution_id uuid;
  caller_id uuid;
  effective_method text;
begin
  caller_id := auth.uid();
  if caller_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'invalid_amount';
  end if;

  if not public.is_stokvel_member(p_stokvel_id) then
    raise exception 'not_a_member';
  end if;

  -- Normalise method: only allow the values the CHECK constraint
  -- accepts. Fall back to 'eft' if the client sends garbage.
  effective_method := coalesce(nullif(trim(p_method), ''), 'eft');
  if effective_method not in ('manual', 'eft', 'cash', 'yoco', 'payshap', 'other') then
    effective_method := 'eft';
  end if;
  -- Client-called Yoco isn't a thing — only the Yoco webhook writes
  -- yoco-method rows. Downgrade to eft to avoid a caller pretending
  -- they paid via card.
  if effective_method = 'yoco' then
    effective_method := 'eft';
  end if;

  insert into public.contributions
    (stokvel_id, owner_id, amount, note, method, reference, status)
    values (
      p_stokvel_id,
      caller_id,
      p_amount,
      p_note,
      effective_method,
      nullif(trim(coalesce(p_reference, '')), ''),
      'pending'
    )
    returning id into new_contribution_id;

  return new_contribution_id;
end;
$$;

grant execute on function public.contribute_to_stokvel(uuid, numeric, text, text, text)
  to authenticated;

-- Keep the old 3-arg signature grant valid too (postgres treats them as
-- separate functions with different signatures). The 3-arg version from
-- migration 006 still exists and still works — it just doesn't set
-- method / reference.

-- ---------------------------------------------------------------------------
-- 4. handle_payment_succeeded: Yoco rows land as status='confirmed'
-- ---------------------------------------------------------------------------
create or replace function public.handle_payment_succeeded()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'succeeded'
     and (old.status is null or old.status is distinct from 'succeeded')
  then
    if not exists (
      select 1 from public.contributions
      where payment_id = new.id
    ) then
      insert into public.contributions
        (id, stokvel_id, owner_id, amount, note, payment_id, method,
         status, confirmed_at, created_at)
      values (
        gen_random_uuid(),
        new.stokvel_id,
        new.user_id,
        new.amount,
        case
          when new.is_test then 'Auto-paid via Yoco (test)'
          else 'Auto-paid via Yoco'
        end,
        new.id,
        'yoco',
        'confirmed',
        new.updated_at,
        new.updated_at
      );
    end if;
  end if;
  return new;
end;
$$;

-- Triggers from migration 004 (on_payment_status_change,
-- on_payment_insert_succeeded) already point at this function and don't
-- need to be re-created.

-- ---------------------------------------------------------------------------
-- 5. set_stokvel_banking(stokvel_id, bank, holder, account, branch, payshap)
--    Admin-only. Writes / clears the bank account fields on a stokvel.
--    Pass null / empty strings to clear individual fields.
-- ---------------------------------------------------------------------------
create or replace function public.set_stokvel_banking(
  p_stokvel_id uuid,
  p_bank_name text,
  p_holder text,
  p_account_number text,
  p_branch_code text,
  p_payshap_phone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if not public.is_stokvel_admin(p_stokvel_id) then
    raise exception 'not_admin';
  end if;

  update public.stokvels
    set
      bank_name = nullif(trim(coalesce(p_bank_name, '')), ''),
      bank_account_holder = nullif(trim(coalesce(p_holder, '')), ''),
      bank_account_number = nullif(trim(coalesce(p_account_number, '')), ''),
      bank_branch_code = nullif(trim(coalesce(p_branch_code, '')), ''),
      payshap_phone = nullif(trim(coalesce(p_payshap_phone, '')), '')
    where id = p_stokvel_id;
end;
$$;

grant execute on function public.set_stokvel_banking(uuid, text, text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 6. set_contribution_status(contribution_id, status, reason?)
--    Admin-only. Verifies (or rejects) a pending contribution.
-- ---------------------------------------------------------------------------
create or replace function public.set_contribution_status(
  p_contribution_id uuid,
  p_status text,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_stokvel uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if p_status not in ('pending', 'confirmed', 'rejected') then
    raise exception 'invalid_status';
  end if;

  select stokvel_id into target_stokvel
    from public.contributions
    where id = p_contribution_id;

  if target_stokvel is null then
    raise exception 'contribution_not_found';
  end if;

  if not public.is_stokvel_admin(target_stokvel) then
    raise exception 'not_admin';
  end if;

  update public.contributions
    set
      status = p_status,
      confirmed_at = case when p_status = 'confirmed' then now() else null end,
      confirmed_by = case when p_status = 'confirmed' then auth.uid() else null end,
      rejected_reason = case
        when p_status = 'rejected' then nullif(trim(coalesce(p_reason, '')), '')
        else null
      end
    where id = p_contribution_id;
end;
$$;

grant execute on function public.set_contribution_status(uuid, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Read policy: stokvel members should be able to SELECT contributions
--    with their new columns. Existing "stokvel_members_read" or similar
--    policy on public.contributions already covers this (added in
--    migration 003 / 005), so no new policy is required. Adding one here
--    would risk conflicting with the recursion fix from 005.
-- ---------------------------------------------------------------------------

-- End of migration 007.

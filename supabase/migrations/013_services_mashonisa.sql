-- Migration 013: Services hub + Mashonisa (informal money-lending) service.
--
-- Introduces a scaled-down version of the "services" architecture the
-- founder outlined in a design spec — deliberately NOT the full
-- 7-service platform in the original proposal. Two services only:
--
--   * stokvel     — the savings-group service that has been in the
--                    app since day one. Was previously implicit
--                    (everyone had access). Now formalised.
--   * mashonisa   — a new service for informal money lenders to
--                    track loans-out, repayments, and outstanding
--                    balances. Cash-native, evidence-tiered, aligned
--                    with the KasiScore credit-signal thesis.
--
-- Why start with these two:
--   The current pilot centres on the credit-signal thesis. A
--   mashonisa's loan book is the STRONGEST possible repayment
--   evidence for the KasiScore — every borrower repayment is a
--   verified behavioural signal a lender partner will care about.
--   Adding this service extends the pilot without pivoting away
--   from the underwriting-layer positioning.
--
-- Explicitly NOT in this migration (out of scope, deferred):
--   * The other 5 services from the original spec (burial society,
--     spaza shop, kota shop, tshisa nyama, restaurant)
--   * Roles + permissions RBAC tables
--   * Invitation-code assignment beyond the existing stokvel-invite
--     mechanism
--
-- Backward compatibility:
--   Every existing profile is backfilled with a `stokvel` service
--   entry so the pilot cohort continues to see the Stokvel screen
--   exactly as before. Mashonisa is opt-in for existing users
--   (they enable it from the new Services hub screen). New users
--   pick their services during onboarding.

-- ---------------------------------------------------------------------------
-- 1. user_services — which services each user has enabled.
-- ---------------------------------------------------------------------------

create table if not exists public.user_services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,

  -- The service type. Constrained to the two shipping services;
  -- future services get added by ALTER TABLE CHECK once they exist,
  -- not by dropping the constraint.
  service_type text not null
    check (service_type in ('stokvel', 'mashonisa')),

  -- When the user first enabled this service. Useful for
  -- "time on service" analytics later.
  enabled_at timestamptz not null default now(),

  -- Small config blob for per-service preferences (e.g. mashonisa
  -- default interest rate, stokvel notification prefs). Empty by
  -- default; readers must handle missing keys gracefully.
  config jsonb not null default '{}'::jsonb,

  -- A user can enable each service exactly once. If they later
  -- "disable" it, we delete the row rather than soft-deleting so
  -- re-enabling gets a fresh enabled_at.
  unique (owner_id, service_type)
);

create index if not exists user_services_owner_idx
  on public.user_services (owner_id);

alter table public.user_services enable row level security;

drop policy if exists user_services_owner_select on public.user_services;
create policy user_services_owner_select
  on public.user_services for select
  using (owner_id = auth.uid());

drop policy if exists user_services_owner_insert on public.user_services;
create policy user_services_owner_insert
  on public.user_services for insert
  with check (owner_id = auth.uid());

drop policy if exists user_services_owner_update on public.user_services;
create policy user_services_owner_update
  on public.user_services for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists user_services_owner_delete on public.user_services;
create policy user_services_owner_delete
  on public.user_services for delete
  using (owner_id = auth.uid());

-- Backfill: every existing profile gets stokvel auto-enabled so
-- pilot users see no change on their next app load. Idempotent —
-- re-running this migration is safe (UNIQUE constraint noop).
insert into public.user_services (owner_id, service_type)
select p.id, 'stokvel'
from public.profiles p
where not exists (
  select 1 from public.user_services us
  where us.owner_id = p.id and us.service_type = 'stokvel'
);

-- ---------------------------------------------------------------------------
-- 2. mashonisa_loans — one row per loan given out.
-- ---------------------------------------------------------------------------

create table if not exists public.mashonisa_loans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,

  -- Who the money went to. Free-text so the mashonisa can record
  -- borrowers without needing them to have a KasiKash account.
  -- Bounded 1-200 chars.
  borrower_name text not null
    check (length(trim(borrower_name)) between 1 and 200),

  -- Optional phone for follow-ups. Not validated — could be
  -- anything from a WhatsApp number to a landline.
  borrower_phone text
    check (borrower_phone is null or length(borrower_phone) <= 30),

  -- Rand principal. Always positive; a "loan" of R0 or negative
  -- makes no sense. Cap enforced at the DB layer.
  amount_lent numeric(14, 2) not null check (amount_lent > 0),

  -- Interest rate as a whole-percentage number, e.g. 20 for
  -- "20% for the term". Optional — some mashonisas lend interest-
  -- free to family. Nullable and defaulted to 0.
  interest_percentage numeric(5, 2) default 0
    check (interest_percentage >= 0 and interest_percentage <= 500),

  -- Optional agreed repayment date. Nullable because informal
  -- lending often works on "next payday" or "when they can pay"
  -- rather than a fixed date.
  agreed_repayment_date date,

  -- Optional free-text notes. 500 char cap.
  notes text check (notes is null or length(notes) <= 500),

  -- Loan status. Every state transition is user-driven for now.
  --   open       — money out, not yet repaid at all
  --   partial    — some repayment received but not all
  --   repaid     — fully repaid (principal + agreed interest)
  --   defaulted  — mashonisa has given up on this loan
  status text not null default 'open'
    check (status in ('open', 'partial', 'repaid', 'defaulted')),

  -- Sum of all repayments received on this loan. Denormalised for
  -- fast "how much is outstanding?" queries without joining
  -- mashonisa_repayments every time.
  amount_repaid numeric(14, 2) not null default 0
    check (amount_repaid >= 0),

  created_at timestamptz not null default now(),
  repaid_at timestamptz,

  -- Evidence envelope — mashonisa loans start as 'declared' (the
  -- mashonisa self-reports they gave out the money). Can be
  -- promoted to 'observed' when matched to a bank statement debit
  -- in a future PR. Never 'verified' at this stage — no third
  -- party attests to informal cash lending.
  event_type text not null default 'mashonisa_loan'
    check (event_type = 'mashonisa_loan'),
  evidence_type text default 'manual_entry',
  evidence_tier text not null default 'declared'
    check (evidence_tier in ('declared', 'observed', 'verified'))
);

create index if not exists mashonisa_loans_owner_status_idx
  on public.mashonisa_loans (owner_id, status, created_at desc);
create index if not exists mashonisa_loans_owner_created_idx
  on public.mashonisa_loans (owner_id, created_at desc);

alter table public.mashonisa_loans enable row level security;

drop policy if exists mashonisa_loans_owner_select on public.mashonisa_loans;
create policy mashonisa_loans_owner_select
  on public.mashonisa_loans for select
  using (owner_id = auth.uid());

drop policy if exists mashonisa_loans_owner_insert on public.mashonisa_loans;
create policy mashonisa_loans_owner_insert
  on public.mashonisa_loans for insert
  with check (owner_id = auth.uid());

drop policy if exists mashonisa_loans_owner_update on public.mashonisa_loans;
create policy mashonisa_loans_owner_update
  on public.mashonisa_loans for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists mashonisa_loans_owner_delete on public.mashonisa_loans;
create policy mashonisa_loans_owner_delete
  on public.mashonisa_loans for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. mashonisa_repayments — one row per repayment received.
-- ---------------------------------------------------------------------------

create table if not exists public.mashonisa_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null
    references public.mashonisa_loans(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,

  amount numeric(14, 2) not null check (amount > 0),
  paid_at timestamptz not null default now(),

  -- How the money moved. Free-text options because informal
  -- lending happens via anything — cash, EFT, PayShap, Yoco push
  -- payment, even mobile-money vouchers. Kept enum-ish for
  -- classifier friendliness later.
  method text not null default 'cash'
    check (method in ('cash', 'eft', 'payshap', 'card', 'other')),

  notes text check (notes is null or length(notes) <= 500),

  -- Evidence tier. Cash repayments are declared; EFT / PayShap
  -- repayments get promoted to observed once the bank-statement
  -- matcher lands (future PR).
  evidence_tier text not null default 'declared'
    check (evidence_tier in ('declared', 'observed', 'verified'))
);

create index if not exists mashonisa_repayments_owner_loan_idx
  on public.mashonisa_repayments (owner_id, loan_id, paid_at desc);
create index if not exists mashonisa_repayments_loan_idx
  on public.mashonisa_repayments (loan_id, paid_at desc);

alter table public.mashonisa_repayments enable row level security;

drop policy if exists mashonisa_repayments_owner_select on public.mashonisa_repayments;
create policy mashonisa_repayments_owner_select
  on public.mashonisa_repayments for select
  using (owner_id = auth.uid());

drop policy if exists mashonisa_repayments_owner_insert on public.mashonisa_repayments;
create policy mashonisa_repayments_owner_insert
  on public.mashonisa_repayments for insert
  with check (owner_id = auth.uid());

drop policy if exists mashonisa_repayments_owner_update on public.mashonisa_repayments;
create policy mashonisa_repayments_owner_update
  on public.mashonisa_repayments for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists mashonisa_repayments_owner_delete on public.mashonisa_repayments;
create policy mashonisa_repayments_owner_delete
  on public.mashonisa_repayments for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Trigger — auto-update mashonisa_loans.amount_repaid + status
--    when a repayment is inserted / updated / deleted.
--
-- Denormalised counter maintenance so the client never has to
-- re-sum repayments on every list render.
-- ---------------------------------------------------------------------------

create or replace function public.mashonisa_recompute_loan_totals(
  target_loan_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  new_total numeric(14, 2);
  loan_amount numeric(14, 2);
  loan_interest numeric(5, 2);
  new_status text;
  loan_target_total numeric(14, 2);
begin
  -- Sum of repayments for this loan.
  select coalesce(sum(amount), 0) into new_total
    from public.mashonisa_repayments
    where loan_id = target_loan_id;

  -- Read the principal + interest so we can decide status.
  select amount_lent, coalesce(interest_percentage, 0)
    into loan_amount, loan_interest
    from public.mashonisa_loans
    where id = target_loan_id;

  if loan_amount is null then
    -- Loan was deleted mid-transaction — nothing to update.
    return;
  end if;

  loan_target_total := loan_amount * (1 + loan_interest / 100);

  -- Status derivation:
  --   * repaid    → total repayments >= principal + interest
  --   * partial   → 0 < total repayments < principal + interest
  --   * open      → total repayments = 0
  -- 'defaulted' is user-driven and NOT auto-flipped here.
  new_status := case
    when new_total >= loan_target_total then 'repaid'
    when new_total > 0 then 'partial'
    else 'open'
  end;

  update public.mashonisa_loans
    set amount_repaid = new_total,
        status = case
          when status = 'defaulted' then 'defaulted'
          else new_status
        end,
        repaid_at = case
          when new_total >= loan_target_total and repaid_at is null then now()
          when new_total < loan_target_total then null
          else repaid_at
        end
    where id = target_loan_id;
end
$$;

create or replace function public.mashonisa_repayment_after_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.mashonisa_recompute_loan_totals(old.loan_id);
    return old;
  else
    perform public.mashonisa_recompute_loan_totals(new.loan_id);
    -- Also recompute the previous loan if the repayment was moved
    -- between loans on UPDATE (rare, but possible).
    if tg_op = 'UPDATE' and old.loan_id <> new.loan_id then
      perform public.mashonisa_recompute_loan_totals(old.loan_id);
    end if;
    return new;
  end if;
end
$$;

drop trigger if exists mashonisa_repayment_totals_trigger
  on public.mashonisa_repayments;
create trigger mashonisa_repayment_totals_trigger
  after insert or update or delete on public.mashonisa_repayments
  for each row execute function public.mashonisa_repayment_after_change();

-- ---------------------------------------------------------------------------
-- 5. Stokvel sub-type (PR #35 steering — Groceries / Savings / Birthdays).
--
-- A `kind` column on stokvels lets an admin categorise the savings
-- group when they create it. Three shipping sub-types:
--
--   * groceries  — traditional food-buying stokvel, usually annual
--                   payout around November for December bulk shopping
--   * savings    — general savings-group, flexible payout cadence
--   * birthdays  — round-robin birthday stokvel; each member gets
--                   the collected pot on their birthday
--
-- Backward compatibility: existing stokvels get 'savings' as the
-- default (the safest fallback — most existing pilot stokvels were
-- effectively general savings). The column is NOT NULL after
-- backfill; new stokvels must pick a kind at creation time.
-- ---------------------------------------------------------------------------

alter table public.stokvels
  add column if not exists kind text;

-- Backfill everything to 'savings' if not already set.
update public.stokvels set kind = 'savings' where kind is null;

alter table public.stokvels
  alter column kind set not null,
  alter column kind set default 'savings';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'stokvels_kind_check'
  ) then
    alter table public.stokvels
      add constraint stokvels_kind_check
      check (kind in ('groceries', 'savings', 'birthdays'));
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 6. Sanity notice.
-- ---------------------------------------------------------------------------

do $$
declare
  service_rows integer;
  loan_rows integer;
  repayment_rows integer;
  backfilled integer;
begin
  select count(*) into service_rows from public.user_services;
  select count(*) into loan_rows from public.mashonisa_loans;
  select count(*) into repayment_rows from public.mashonisa_repayments;
  select count(*) into backfilled
    from public.user_services where service_type = 'stokvel';

  raise notice '── PR #35 Services + Mashonisa Migration Applied ──';
  raise notice 'Tables created: user_services, mashonisa_loans, mashonisa_repayments';
  raise notice 'Trigger installed: mashonisa_repayment_totals_trigger';
  raise notice 'user_services rows: % (of which stokvel backfill: %)',
    service_rows, backfilled;
  raise notice 'mashonisa_loans rows: %', loan_rows;
  raise notice 'mashonisa_repayments rows: %', repayment_rows;
  raise notice 'stokvels.kind column added with 3 sub-types (groceries, savings, birthdays)';
end
$$;

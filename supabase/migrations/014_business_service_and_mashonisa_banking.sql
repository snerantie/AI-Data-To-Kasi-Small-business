-- Migration 014: 'business' service + Mashonisa receiving-banking.
--
-- Two changes that make KasiKash properly service-scoped, following
-- founder feedback:
--
--   1. The sales/takings dashboard (Home + Log + Skoroskoro + Insights)
--      is a BUSINESS feature. A user who only runs a stokvel or a
--      mashonisa loan book shouldn't be dropped into a "Today's
--      takings" screen. So we formalise a third service, 'business',
--      that gates that whole dashboard. The Services launcher becomes
--      the landing screen; the business dashboard is entered like any
--      other service.
--
--   2. Mashonisa borrowers should be able to pay back via the app —
--      i.e. the lender records their receiving bank / PayShap details
--      once, and each loan can surface a "pay me here" screen with a
--      reference. This mirrors the stokvel bank-account model.
--
-- Backward compatibility is the priority: existing users who ALREADY
-- use the business dashboard (they have a business profile or have
-- logged sales/tabs/expenses) get the 'business' service backfilled
-- so they don't lose access to their own data.

-- ---------------------------------------------------------------------------
-- 1. Add 'business' to the user_services service_type CHECK.
-- ---------------------------------------------------------------------------

alter table public.user_services
  drop constraint if exists user_services_service_type_check;

alter table public.user_services
  add constraint user_services_service_type_check
  check (service_type in ('stokvel', 'mashonisa', 'business'));

-- ---------------------------------------------------------------------------
-- 2. Backfill 'business' for existing users who actually use it.
--
-- "Uses the business dashboard" = has a business name/type on their
-- profile, OR has logged any sales / expenses / tabs. Those users
-- must keep seeing the takings dashboard, so we enable the service
-- for them. Stokvel-only / mashonisa-only users are deliberately
-- NOT given the business service — that's the whole point of the
-- change (no more forced takings screen).
--
-- Idempotent via the UNIQUE(owner_id, service_type) constraint.
-- ---------------------------------------------------------------------------

insert into public.user_services (owner_id, service_type)
select distinct p.id, 'business'
from public.profiles p
where (
    (p.business_name is not null and length(trim(p.business_name)) > 0)
    or p.business_type is not null
    or exists (select 1 from public.sales s where s.owner_id = p.id)
    or exists (select 1 from public.expenses e where e.owner_id = p.id)
    or exists (select 1 from public.tabs t where t.owner_id = p.id)
  )
  and not exists (
    select 1 from public.user_services us
    where us.owner_id = p.id and us.service_type = 'business'
  );

-- ---------------------------------------------------------------------------
-- 3. mashonisa_banking — one receiving account per lender.
--
-- Mirrors the stokvel bank-account columns exactly so the client can
-- reuse the same banking form + "pay here" display component. A
-- mashonisa sets this up once; then every loan can show borrowers
-- where to pay. One row per owner (the lender).
-- ---------------------------------------------------------------------------

create table if not exists public.mashonisa_banking (
  owner_id uuid primary key references public.profiles(id) on delete cascade,
  bank_name text,
  account_holder text,
  account_number text,
  branch_code text,
  payshap_phone text,
  updated_at timestamptz not null default now()
);

alter table public.mashonisa_banking enable row level security;

drop policy if exists mashonisa_banking_owner_select on public.mashonisa_banking;
create policy mashonisa_banking_owner_select
  on public.mashonisa_banking for select
  using (owner_id = auth.uid());

drop policy if exists mashonisa_banking_owner_insert on public.mashonisa_banking;
create policy mashonisa_banking_owner_insert
  on public.mashonisa_banking for insert
  with check (owner_id = auth.uid());

drop policy if exists mashonisa_banking_owner_update on public.mashonisa_banking;
create policy mashonisa_banking_owner_update
  on public.mashonisa_banking for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists mashonisa_banking_owner_delete on public.mashonisa_banking;
create policy mashonisa_banking_owner_delete
  on public.mashonisa_banking for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 4. Sanity notice.
-- ---------------------------------------------------------------------------

do $$
declare
  business_rows integer;
begin
  select count(*) into business_rows
    from public.user_services where service_type = 'business';
  raise notice '── PR #36 Business service + Mashonisa banking Applied ──';
  raise notice 'business service enabled for % existing users (backfill)', business_rows;
  raise notice 'mashonisa_banking table created with owner-only RLS';
end
$$;

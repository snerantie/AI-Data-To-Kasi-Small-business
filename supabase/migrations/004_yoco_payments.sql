-- Migration 004: Yoco payments
--
-- Adds real automated stokvel contributions via the Yoco Checkout API.
-- Each stokvel admin plugs in their own Yoco secret; money lands in
-- their own Yoco account. KasiKash never touches funds.
--
-- Run this in the Supabase SQL editor AFTER 003_multiuser_stokvel.sql.

-- ---------------------------------------------------------------------------
-- Per-stokvel Yoco configuration (secrets — locked to service_role only)
-- ---------------------------------------------------------------------------
create table if not exists public.stokvel_payment_config (
  stokvel_id uuid primary key references public.stokvels(id) on delete cascade,
  yoco_secret_key text not null,
  yoco_webhook_secret text,
  yoco_webhook_id text,
  yoco_public_key text,
  is_active boolean not null default false,
  is_test boolean not null default true,
  configured_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security: NO client access. Only service_role (via Edge
-- Functions) may read/write this table. Clients get a redacted view.
alter table public.stokvel_payment_config enable row level security;
-- No policies created \u2192 no access for authenticated/anon roles.

-- ---------------------------------------------------------------------------
-- Client-safe view: exposes only "is this stokvel Yoco-active" to members
-- ---------------------------------------------------------------------------
create or replace view public.stokvel_payment_status as
  select
    c.stokvel_id,
    c.is_active,
    c.is_test
  from public.stokvel_payment_config c
  where exists (
    select 1 from public.stokvel_memberships m
    where m.stokvel_id = c.stokvel_id
      and m.user_id = auth.uid()
  );

grant select on public.stokvel_payment_status to authenticated;

-- ---------------------------------------------------------------------------
-- stokvel_payments: state tracking for in-flight and completed payments
-- ---------------------------------------------------------------------------
create table if not exists public.stokvel_payments (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references public.stokvels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  yoco_checkout_id text unique,
  is_test boolean not null default false,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stokvel_payments_stokvel_idx
  on public.stokvel_payments (stokvel_id, created_at desc);

create index if not exists stokvel_payments_yoco_checkout_idx
  on public.stokvel_payments (yoco_checkout_id);

alter table public.stokvel_payments enable row level security;

-- Members can read payments for their own stokvel (great for Realtime UI)
create policy "stokvel_payments_members_read" on public.stokvel_payments
  for select
  using (
    exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = stokvel_payments.stokvel_id
        and m.user_id = auth.uid()
    )
  );

-- No client INSERT/UPDATE: all writes happen via Edge Functions using
-- the service_role key.

-- ---------------------------------------------------------------------------
-- Contributions: add payment_id link so we can distinguish auto vs manual
-- ---------------------------------------------------------------------------
alter table public.contributions
  add column if not exists payment_id uuid
    references public.stokvel_payments(id) on delete set null;

create index if not exists contributions_payment_idx
  on public.contributions (payment_id);

-- ---------------------------------------------------------------------------
-- Trigger: when a payment succeeds, auto-insert the corresponding contribution
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
    -- Only insert if we haven't already (idempotency for webhook retries)
    if not exists (
      select 1 from public.contributions
      where payment_id = new.id
    ) then
      insert into public.contributions
        (id, stokvel_id, owner_id, amount, note, payment_id, created_at)
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
        new.updated_at
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_payment_status_change on public.stokvel_payments;
create trigger on_payment_status_change
  after update on public.stokvel_payments
  for each row execute function public.handle_payment_succeeded();

-- Also handle INSERT case (in case an event lands with status=succeeded
-- immediately, though this should be rare)
drop trigger if exists on_payment_insert_succeeded on public.stokvel_payments;
create trigger on_payment_insert_succeeded
  after insert on public.stokvel_payments
  for each row
  when (new.status = 'succeeded')
  execute function public.handle_payment_succeeded();

-- ---------------------------------------------------------------------------
-- Enable Supabase Realtime for stokvel_payments so clients can subscribe
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.stokvel_payments;

-- Note: adding to publication requires that the table already exist and
-- that the publication supports it. If your project doesn't have the
-- default supabase_realtime publication, this line will error \u2014 in that
-- case, safely skip it and enable via the Supabase dashboard UI instead.

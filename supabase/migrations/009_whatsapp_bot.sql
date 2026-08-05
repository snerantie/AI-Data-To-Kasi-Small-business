-- Migration 009: WhatsApp Business API integration (PR #20).
--
-- Adds per-user WhatsApp Business credentials so admins can wire up
-- their own Meta Cloud API phone number. When configured, members
-- (identified by their WhatsApp sender phone number) can text natural-
-- language sales lines like "sold 3 bread R18" to the admin's number
-- and have them logged automatically.
--
-- This migration is idempotent. Run it AFTER 008_realtime_contributions.

-- ---------------------------------------------------------------------------
-- Per-user WhatsApp bot configuration.
--
-- Kept separate from stokvel_payment_config because WhatsApp is a
-- personal / business integration (one per user), whereas Yoco is a
-- per-stokvel setup. A single user might use both.
--
-- All secret fields are locked to service_role only via RLS (no
-- authenticated / anon read/write) — the Edge Function does all
-- writes with the service role key. Clients see the redacted status
-- via the whatsapp_bot_status VIEW below.
-- ---------------------------------------------------------------------------
create table if not exists public.whatsapp_bot_configs (
  user_id uuid primary key references public.profiles(id) on delete cascade,

  -- Meta Cloud API "Phone Number ID" (numeric string, ~15 digits).
  waba_phone_id text not null,

  -- Long-lived system-user access token from Meta Business Manager.
  -- Store as-is; Postgres row-level access to the whole table is
  -- restricted to service_role.
  waba_access_token text not null,

  -- Verify token the admin chose when setting up the webhook in
  -- Meta's dashboard. Used to answer Meta's GET verification challenge.
  verify_token text not null,

  -- E.164 of the admin's WhatsApp Business phone (the FROM number for
  -- outgoing messages, and the destination that members text INTO).
  sender_phone text,

  is_active boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.whatsapp_bot_configs enable row level security;
-- No policies created → no access for authenticated / anon roles.

-- ---------------------------------------------------------------------------
-- Client-safe VIEW: exposes only "is my WhatsApp bot active" to the
-- current user. Nothing sensitive leaks; the client never sees the
-- token or verify_token.
-- ---------------------------------------------------------------------------
create or replace view public.whatsapp_bot_status as
  select
    user_id,
    is_active,
    sender_phone
  from public.whatsapp_bot_configs
  where user_id = auth.uid();

grant select on public.whatsapp_bot_status to authenticated;

-- ---------------------------------------------------------------------------
-- Helper: from a sender's WhatsApp phone (E.164), look up the
-- KasiKash user who owns that number. Used by the webhook to
-- attribute incoming messages to the right account.
--
-- Matches against profiles.phone (added in PR #18) because that's the
-- canonical "how the user identifies themselves to the world"
-- reference. If profiles.phone is null (user never linked their
-- phone), incoming WhatsApp messages from that number are unknown
-- and get a "please link your account first" auto-reply.
-- ---------------------------------------------------------------------------
create or replace function public.user_id_from_whatsapp_phone(p_phone text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.profiles
  where phone = p_phone
  limit 1;
$$;

grant execute on function public.user_id_from_whatsapp_phone(text) to service_role;

-- ---------------------------------------------------------------------------
-- Helper: given a user_id + parsed sale, insert a sale row on their
-- behalf. SECURITY DEFINER because the webhook runs as service_role
-- but we want the row to end up owned by the correct user.
-- ---------------------------------------------------------------------------
create or replace function public.log_sale_via_bot(
  p_user_id uuid,
  p_item text,
  p_qty integer,
  p_price numeric,
  p_raw text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_user_id is null then
    raise exception 'user_not_found';
  end if;
  if p_qty <= 0 or p_price <= 0 then
    raise exception 'invalid_sale';
  end if;

  insert into public.sales
    (id, owner_id, item, qty, price, raw, source, created_at)
  values (
    gen_random_uuid(),
    p_user_id,
    coalesce(nullif(trim(p_item), ''), 'Item'),
    p_qty,
    p_price,
    p_raw,
    'whatsapp',
    now()
  )
  returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.log_sale_via_bot(uuid, text, integer, numeric, text) to service_role;

-- Extend the sales.source check-constraint (added in 001_init.sql) to
-- accept 'whatsapp' alongside 'voice' / 'manual' / 'receipt'.
-- Uses a do-block so re-running doesn't error if the constraint has
-- already been updated.
do $$
begin
  begin
    alter table public.sales drop constraint if exists sales_source_check;
    alter table public.sales
      add constraint sales_source_check
      check (source in ('voice','manual','receipt','whatsapp') or source is null);
  exception when others then
    raise notice 'Could not update sales.source constraint: %', SQLERRM;
  end;
end
$$;

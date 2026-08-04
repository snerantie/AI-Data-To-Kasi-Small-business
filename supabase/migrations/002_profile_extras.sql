-- Migration 002: profile + stokvel polish for real-product onboarding
--
-- Run this in the Supabase SQL editor AFTER 001_init.sql.
--
-- - Adds `business_type` to profiles (nullable, constrained to known kinds).
-- - Drops the demo-mode defaults on owner_name / business_name so new
--   signups get NULL and are forced through onboarding.
-- - Drops the "My Stokvel" default so real users pick their own name.
-- Existing rows keep whatever they had; only future inserts see the change.

-- ---------------------------------------------------------------------------
-- profiles: add business_type
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists business_type text
    check (
      business_type is null
      or business_type in ('spaza', 'salon', 'taxi', 'tailor', 'food', 'other')
    );

-- ---------------------------------------------------------------------------
-- profiles: drop demo defaults on name fields
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter table public.profiles alter column owner_name drop default;
  exception when others then null;
  end;
  begin
    alter table public.profiles alter column business_name drop default;
  exception when others then null;
  end;
end$$;

-- ---------------------------------------------------------------------------
-- stokvels: drop the demo default so onboarding names the pot
-- ---------------------------------------------------------------------------
do $$
begin
  begin
    alter table public.stokvels alter column name drop default;
  exception when others then null;
  end;
end$$;

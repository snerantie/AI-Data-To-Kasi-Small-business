-- Migration 015: add 'burial' as a stokvel sub-type.
--
-- A burial society is mechanically the same as a stokvel — members
-- contribute regularly into a pooled fund, an admin manages it, and
-- the money pays out (for a funeral, instead of a savings goal). So
-- rather than build a whole separate service, burial societies are a
-- fourth stokvel `kind`, reusing all the existing stokvel machinery:
-- members, contributions, invites, banking, verification.
--
-- The one limitation this inherits: the current model supports one
-- stokvel group per user. Running BOTH a regular stokvel AND a
-- separate burial society at the same time would need multi-group
-- support (a larger change, deferred). For the pilot, a user's group
-- is either a savings/groceries/birthday stokvel OR a burial society.
--
-- Idempotent: safe to re-run.

alter table public.stokvels
  drop constraint if exists stokvels_kind_check;

alter table public.stokvels
  add constraint stokvels_kind_check
  check (kind in ('groceries', 'savings', 'birthdays', 'burial'));

do $$
begin
  raise notice '── PR #37 Burial stokvel kind Applied ──';
  raise notice 'stokvels.kind now allows: groceries, savings, birthdays, burial';
end
$$;

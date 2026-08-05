-- Migration 003: real multi-user stokvels
--
-- Turns the single-user savings tracker into a group stokvel with
-- proper admin/member roles, shared visibility, and invite codes.
-- Run this in the Supabase SQL editor AFTER 002_profile_extras.sql.

-- ---------------------------------------------------------------------------
-- Allow a user to belong to multiple stokvels (drop the singleton index)
-- ---------------------------------------------------------------------------
drop index if exists public.stokvels_owner_singleton_idx;

-- ---------------------------------------------------------------------------
-- stokvel_memberships: many-to-many between users and stokvels
-- ---------------------------------------------------------------------------
create table if not exists public.stokvel_memberships (
  stokvel_id uuid not null references public.stokvels(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('admin', 'member')),
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (stokvel_id, user_id)
);

create index if not exists stokvel_memberships_user_idx
  on public.stokvel_memberships (user_id);

-- ---------------------------------------------------------------------------
-- stokvel_invites: short codes that let new members join
-- ---------------------------------------------------------------------------
create table if not exists public.stokvel_invites (
  code text primary key,
  stokvel_id uuid not null references public.stokvels(id) on delete cascade,
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists stokvel_invites_stokvel_idx
  on public.stokvel_invites (stokvel_id);

-- ---------------------------------------------------------------------------
-- Trigger: when a stokvel is created, its creator becomes the admin member
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_stokvel()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  creator_name text;
begin
  select coalesce(nullif(trim(owner_name), ''), 'Owner')
    into creator_name
    from public.profiles
    where id = new.owner_id;

  insert into public.stokvel_memberships
    (stokvel_id, user_id, role, display_name)
    values (new.id, new.owner_id, 'admin', creator_name)
    on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_stokvel_created on public.stokvels;
create trigger on_stokvel_created
  after insert on public.stokvels
  for each row execute function public.handle_new_stokvel();

-- ---------------------------------------------------------------------------
-- Backfill: every existing stokvel becomes admin membership for its owner
-- ---------------------------------------------------------------------------
insert into public.stokvel_memberships (stokvel_id, user_id, role, display_name)
select
  s.id,
  s.owner_id,
  'admin',
  coalesce(nullif(trim(p.owner_name), ''), 'Owner')
from public.stokvels s
left join public.profiles p on p.id = s.owner_id
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- join_stokvel RPC: validates code + adds membership + returns stokvel_id
-- ---------------------------------------------------------------------------
create or replace function public.join_stokvel(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_stokvel uuid;
  member_name text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select stokvel_id into target_stokvel
    from public.stokvel_invites
    where code = invite_code
      and (expires_at is null or expires_at > now())
    limit 1;

  if target_stokvel is null then
    raise exception 'invalid_or_expired_invite';
  end if;

  select coalesce(nullif(trim(owner_name), ''), 'Member')
    into member_name
    from public.profiles
    where id = auth.uid();

  insert into public.stokvel_memberships
    (stokvel_id, user_id, role, display_name)
    values (target_stokvel, auth.uid(), 'member', member_name)
    on conflict (stokvel_id, user_id) do nothing;

  return target_stokvel;
end;
$$;

grant execute on function public.join_stokvel to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: update policies so members (not just creator) see the stokvel
-- ---------------------------------------------------------------------------

-- Stokvels: members read, admins update, anyone creates their own
drop policy if exists "stokvels_owner_all" on public.stokvels;
drop policy if exists "stokvels_members_read" on public.stokvels;
drop policy if exists "stokvels_admin_update" on public.stokvels;
drop policy if exists "stokvels_owner_insert" on public.stokvels;

create policy "stokvels_members_read" on public.stokvels
  for select
  using (
    exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = stokvels.id
        and m.user_id = auth.uid()
    )
  );

create policy "stokvels_admin_update" on public.stokvels
  for update
  using (
    exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = stokvels.id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = stokvels.id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

create policy "stokvels_owner_insert" on public.stokvels
  for insert
  with check (auth.uid() = owner_id);

-- Contributions: members read, members insert
drop policy if exists "contributions_owner_all" on public.contributions;
drop policy if exists "contributions_members_read" on public.contributions;
drop policy if exists "contributions_members_insert" on public.contributions;

create policy "contributions_members_read" on public.contributions
  for select
  using (
    exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = contributions.stokvel_id
        and m.user_id = auth.uid()
    )
  );

create policy "contributions_members_insert" on public.contributions
  for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = contributions.stokvel_id
        and m.user_id = auth.uid()
    )
  );

-- Memberships RLS
alter table public.stokvel_memberships enable row level security;

drop policy if exists "memberships_read" on public.stokvel_memberships;
drop policy if exists "memberships_self_insert" on public.stokvel_memberships;
drop policy if exists "memberships_delete" on public.stokvel_memberships;

-- Members can see each other within a stokvel; users can see their own memberships
create policy "memberships_read" on public.stokvel_memberships
  for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = stokvel_memberships.stokvel_id
        and m.user_id = auth.uid()
    )
  );

-- Users insert their own membership (join flow uses SECURITY DEFINER function
-- but this policy backs it up)
create policy "memberships_self_insert" on public.stokvel_memberships
  for insert with check (user_id = auth.uid());

-- Admins can remove members; users can remove themselves
create policy "memberships_delete" on public.stokvel_memberships
  for delete using (
    user_id = auth.uid()
    or exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = stokvel_memberships.stokvel_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

-- Invites RLS
alter table public.stokvel_invites enable row level security;

drop policy if exists "invites_member_read" on public.stokvel_invites;
drop policy if exists "invites_admin_create" on public.stokvel_invites;
drop policy if exists "invites_admin_delete" on public.stokvel_invites;

create policy "invites_member_read" on public.stokvel_invites
  for select
  using (
    exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = stokvel_invites.stokvel_id
        and m.user_id = auth.uid()
    )
  );

create policy "invites_admin_create" on public.stokvel_invites
  for insert
  with check (
    exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = stokvel_invites.stokvel_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

create policy "invites_admin_delete" on public.stokvel_invites
  for delete
  using (
    exists (
      select 1 from public.stokvel_memberships m
      where m.stokvel_id = stokvel_invites.stokvel_id
        and m.user_id = auth.uid()
        and m.role = 'admin'
    )
  );

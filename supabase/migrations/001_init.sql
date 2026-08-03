-- KasiKash initial schema
-- Run this in the Supabase SQL editor for a new project.
-- All tables are protected by Row Level Security so every owner can
-- only see their own data.

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  owner_name text default 'Mama Nomsa',
  business_name text default 'My Spaza',
  language text default 'en' check (language in ('en', 'zu', 'st')),
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up (any provider,
-- including anonymous).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Sales
-- ---------------------------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  item text not null,
  qty integer not null check (qty > 0),
  price numeric(12, 2) not null check (price >= 0),
  raw text,
  source text not null default 'manual' check (source in ('voice', 'manual', 'receipt')),
  created_at timestamptz not null default now()
);

create index if not exists sales_owner_created_idx
  on public.sales (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Skoroskoro (customer tabs)
-- ---------------------------------------------------------------------------
create table if not exists public.tabs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  customer text not null,
  amount numeric(12, 2) not null check (amount > 0),
  paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tabs_owner_created_idx
  on public.tabs (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Stokvels
-- ---------------------------------------------------------------------------
create table if not exists public.stokvels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null default 'My Stokvel',
  goal numeric(12, 2) not null default 5000 check (goal > 0),
  members integer not null default 1 check (members > 0),
  created_at timestamptz not null default now()
);

create unique index if not exists stokvels_owner_singleton_idx
  on public.stokvels (owner_id);

-- ---------------------------------------------------------------------------
-- Contributions to stokvels
-- ---------------------------------------------------------------------------
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  stokvel_id uuid not null references public.stokvels(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists contributions_stokvel_idx
  on public.contributions (stokvel_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.sales          enable row level security;
alter table public.tabs           enable row level security;
alter table public.stokvels       enable row level security;
alter table public.contributions  enable row level security;

drop policy if exists "profiles_owner_all" on public.profiles;
create policy "profiles_owner_all" on public.profiles
  for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "sales_owner_all" on public.sales;
create policy "sales_owner_all" on public.sales
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "tabs_owner_all" on public.tabs;
create policy "tabs_owner_all" on public.tabs
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "stokvels_owner_all" on public.stokvels;
create policy "stokvels_owner_all" on public.stokvels
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "contributions_owner_all" on public.contributions;
create policy "contributions_owner_all" on public.contributions
  for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

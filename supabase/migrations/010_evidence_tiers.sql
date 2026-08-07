-- Migration 010: Evidence tier foundations (PR #22).
--
-- Reshapes the data model around the three orthogonal facets we
-- discussed:
--
--   event_type      — what happened in the business
--   evidence_type   — what artefact do we hold as proof
--   evidence_tier   — how independent is that proof
--
-- Plus a `provenance` JSONB blob for source-specific metadata.
--
-- The KasiScore no longer collapses "many rows in the sales table" into
-- "high creditworthiness". Instead, it weighs signals by tier:
-- self-reported cash sales stay in the record but score much lower
-- than a Yoco-webhook-confirmed contribution.
--
-- Historical rows are RE-LABELLED (never deleted or rewritten). The
-- reclassification of receipt-sourced "sales" into `event_type =
-- 'expense'` is the most visible change: those rows always represented
-- what the owner BOUGHT, not what they SOLD, and the old ScanReceipt
-- flow was miscategorising them. The migration fixes the label without
-- destroying the evidence.
--
-- This migration is idempotent — safe to re-run. Every ADD COLUMN uses
-- IF NOT EXISTS; the CREATE TABLE uses IF NOT EXISTS; the UPDATE
-- statements are gated on `evidence_tier IS NULL` so a second run
-- doesn't clobber values written by client code between runs.
--
-- Run AFTER 009_whatsapp_bot.sql.

-- ---------------------------------------------------------------------------
-- 1. Add evidence envelope columns to existing value-bearing tables.
--    Nullable at first (so we can backfill in a separate step); we
--    could tighten to NOT NULL in a future migration once every
--    client path has been proven to always set them.
-- ---------------------------------------------------------------------------

alter table public.sales
  add column if not exists event_type text,
  add column if not exists evidence_type text,
  add column if not exists evidence_tier text
    check (evidence_tier is null
           or evidence_tier in ('declared', 'observed', 'verified')),
  add column if not exists provenance jsonb;

alter table public.contributions
  add column if not exists event_type text,
  add column if not exists evidence_type text,
  add column if not exists evidence_tier text
    check (evidence_tier is null
           or evidence_tier in ('declared', 'observed', 'verified')),
  add column if not exists provenance jsonb;

alter table public.tabs
  add column if not exists event_type text,
  add column if not exists evidence_type text,
  add column if not exists evidence_tier text
    check (evidence_tier is null
           or evidence_tier in ('declared', 'observed', 'verified')),
  add column if not exists provenance jsonb;

-- ---------------------------------------------------------------------------
-- 2. Create the `expenses` table.
--
-- Shape mirrors `sales` (item / qty / price / raw / owner_id / created_at)
-- but with the evidence envelope baked in from birth. This is where
-- new ScanReceipt scans land as of PR #22.
--
-- Historical receipt-sourced rows in the `sales` table are NOT copied
-- here — they're re-labelled in place (see step 3) to preserve the
-- original row identity. Downstream code queries expenses via
-- `event_type = 'expense'` across both tables during the transition.
-- Once every path is fully cut over, we can consider consolidating.
-- ---------------------------------------------------------------------------

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  item text not null,
  qty integer not null default 1 check (qty > 0),
  price numeric(12, 2) not null check (price >= 0),
  raw text,
  event_type text not null default 'expense'
    check (event_type = 'expense'),
  evidence_type text not null default 'manual_entry',
  evidence_tier text not null default 'declared'
    check (evidence_tier in ('declared', 'observed', 'verified')),
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists expenses_owner_created_idx
  on public.expenses (owner_id, created_at desc);

alter table public.expenses enable row level security;

-- RLS: an owner can see + write their own expense rows only. Mirrors
-- the sales table policies from migration 001.
drop policy if exists expenses_owner_select on public.expenses;
create policy expenses_owner_select
  on public.expenses for select
  using (owner_id = auth.uid());

drop policy if exists expenses_owner_insert on public.expenses;
create policy expenses_owner_insert
  on public.expenses for insert
  with check (owner_id = auth.uid());

drop policy if exists expenses_owner_update on public.expenses;
create policy expenses_owner_update
  on public.expenses for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists expenses_owner_delete on public.expenses;
create policy expenses_owner_delete
  on public.expenses for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Backfill historical rows with evidence envelope.
--
-- These UPDATEs mirror `src/lib/evidence.ts`'s classifiers exactly.
-- If the two ever diverge, the TypeScript tests in evidence.test.ts
-- act as the executable spec.
--
-- Each UPDATE is gated on `evidence_tier IS NULL` so a re-run is a
-- no-op — critical because the SQL editor can partially apply a long
-- script if it hits a transient error.
-- ---------------------------------------------------------------------------

-- 3a. sales: voice-sourced rows → sale / voice_log / declared.
update public.sales
  set
    event_type = 'sale',
    evidence_type = 'voice_log',
    evidence_tier = 'declared',
    provenance = jsonb_build_object('legacy_source', 'voice')
  where evidence_tier is null
    and source = 'voice';

-- 3b. sales: manual-sourced rows → sale / manual_entry / declared.
update public.sales
  set
    event_type = 'sale',
    evidence_type = 'manual_entry',
    evidence_tier = 'declared',
    provenance = jsonb_build_object('legacy_source', 'manual')
  where evidence_tier is null
    and (source = 'manual' or source is null);

-- 3c. sales: receipt-sourced rows → expense / supplier_receipt / observed.
--
-- This is the reclassification described in PR #22: those rows were
-- never really sales; they represented stock the owner purchased from
-- a supplier. The row is preserved (nothing deleted), only re-labelled.
-- Downstream code queries revenue via `WHERE event_type = 'sale'`
-- which now correctly excludes them.
update public.sales
  set
    event_type = 'expense',
    evidence_type = 'supplier_receipt',
    evidence_tier = 'observed',
    provenance = jsonb_build_object(
      'legacy_source', 'receipt',
      'reclassified_from', 'sales_v1_receipt',
      'reclassified_at', 'PR22'
    )
  where evidence_tier is null
    and source = 'receipt';

-- 3d. contributions: Yoco / payment_id → contribution_in / verified.
update public.contributions
  set
    event_type = 'contribution_in',
    evidence_type = 'yoco_transaction',
    evidence_tier = 'verified',
    provenance = jsonb_build_object(
      'legacy_method', method,
      'legacy_payment_id', payment_id
    )
  where evidence_tier is null
    and (lower(coalesce(method, '')) = 'yoco' or payment_id is not null);

-- 3e. contributions: admin-confirmed non-Yoco → observed.
update public.contributions
  set
    event_type = 'contribution_in',
    evidence_type = 'admin_confirmation',
    evidence_tier = 'observed',
    provenance = jsonb_build_object(
      'legacy_method', method,
      'legacy_status', 'confirmed'
    )
  where evidence_tier is null
    and lower(coalesce(status, '')) = 'confirmed'
    and lower(coalesce(method, '')) <> 'yoco'
    and payment_id is null;

-- 3f. contributions: everything else (pending / rejected / unknown)
--                    → declared. Explicitly not confirmed.
update public.contributions
  set
    event_type = 'contribution_in',
    evidence_type = 'manual_entry',
    evidence_tier = 'declared',
    provenance = jsonb_build_object(
      'legacy_method', method,
      'legacy_status', status
    )
  where evidence_tier is null;

-- 3g. tabs: paid=true → tab_settled / manual_entry / declared.
--            paid=false or null → tab_created / manual_entry / declared.
--
-- Both stay at declared tier. Customer confirmations are peer-attested
-- and per the friends-and-family concern, they can't be trusted as
-- independent evidence.
update public.tabs
  set
    event_type = 'tab_settled',
    evidence_type = 'manual_entry',
    evidence_tier = 'declared',
    provenance = jsonb_build_object('legacy_paid', true)
  where evidence_tier is null
    and paid = true;

update public.tabs
  set
    event_type = 'tab_created',
    evidence_type = 'manual_entry',
    evidence_tier = 'declared',
    provenance = jsonb_build_object('legacy_paid', paid)
  where evidence_tier is null;

-- ---------------------------------------------------------------------------
-- 4. Sanity indexes for common filter paths.
--
-- The score / passport code queries by (owner_id, event_type,
-- created_at). Postgres will use the existing (owner_id, created_at)
-- index for that already; adding a compound index that includes
-- event_type is marginal and can wait until row counts justify it.
-- ---------------------------------------------------------------------------

create index if not exists sales_event_type_idx
  on public.sales (event_type)
  where event_type is not null;

create index if not exists contributions_event_type_idx
  on public.contributions (event_type)
  where event_type is not null;

-- ---------------------------------------------------------------------------
-- 5. Post-migration audit report.
--
-- Idempotency alone isn't enough — the operator (usually the KasiKash
-- admin running this in Supabase SQL editor) needs to see, at a
-- glance, how many rows were touched vs skipped vs missing. This
-- block RAISES NOTICE with a compact table of counts so a copy-pasted
-- run leaves a clean audit trail in the SQL editor output.
--
-- The reclassification of receipt-sourced "sales" gets its own line
-- because it's the most consequential change the migration makes —
-- those rows change event_type, which affects revenue / turnover
-- queries downstream.
--
-- No EXCEPTION is raised even if stragglers are found; the operator
-- can inspect and re-run. The migration is idempotent.
-- ---------------------------------------------------------------------------

do $$
declare
  sale_total integer;
  sale_untiered integer;
  sales_reclassified_expense integer;
  sales_kept_as_sale integer;

  contrib_total integer;
  contrib_untiered integer;
  contrib_verified integer;
  contrib_observed integer;
  contrib_declared integer;

  tab_total integer;
  tab_untiered integer;
begin
  -- Sales table
  select count(*) into sale_total from public.sales;
  select count(*) into sale_untiered
    from public.sales where evidence_tier is null;
  select count(*) into sales_reclassified_expense
    from public.sales
    where event_type = 'expense'
      and provenance ->> 'reclassified_from' = 'sales_v1_receipt';
  select count(*) into sales_kept_as_sale
    from public.sales where event_type = 'sale';

  -- Contributions table
  select count(*) into contrib_total from public.contributions;
  select count(*) into contrib_untiered
    from public.contributions where evidence_tier is null;
  select count(*) into contrib_verified
    from public.contributions where evidence_tier = 'verified';
  select count(*) into contrib_observed
    from public.contributions where evidence_tier = 'observed';
  select count(*) into contrib_declared
    from public.contributions where evidence_tier = 'declared';

  -- Tabs table
  select count(*) into tab_total from public.tabs;
  select count(*) into tab_untiered
    from public.tabs where evidence_tier is null;

  raise notice '── PR #22 Evidence-Tier Migration Audit ──';
  raise notice 'Sales table:       total=%, untiered=%',
    sale_total, sale_untiered;
  raise notice '  → reclassified as expense (receipt-sourced): %',
    sales_reclassified_expense;
  raise notice '  → kept as sale (voice/manual): %', sales_kept_as_sale;
  raise notice 'Contributions:     total=%, untiered=%',
    contrib_total, contrib_untiered;
  raise notice '  → verified (Yoco): %, observed (admin-confirmed EFT): %, declared: %',
    contrib_verified, contrib_observed, contrib_declared;
  raise notice 'Tabs:              total=%, untiered=%',
    tab_total, tab_untiered;

  if sale_untiered + contrib_untiered + tab_untiered > 0 then
    raise notice
      '⚠  Some rows were not backfilled. Review classifier logic in evidence.ts and re-run.';
  else
    raise notice '✓  All rows carry an evidence tier. Migration idempotent — safe to re-run.';
  end if;
end
$$;

-- End of migration 010.

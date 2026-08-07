-- Migration 011: Bank statement intelligence (PR #23).
--
-- Adds two tables that hold user-imported bank-statement data:
--
--   * bank_statements     — one row per uploaded file (a monthly
--                            PDF or CSV export from Capitec / FNB /
--                            Absa / Standard / Nedbank / TymeBank /
--                            Discovery / etc.)
--
--   * bank_transactions   — one row per parsed line inside a
--                            statement. Every row is
--                            evidence_tier = 'observed'. Never
--                            'verified' — we don't have a
--                            cryptographic proof that the bank line
--                            represents what its description
--                            suggests, only that the bank's own
--                            record system emitted it.
--
-- The classifier that populates the `classification` column runs
-- entirely in the browser (src/lib/bank/classify.ts). Bank statement
-- files themselves are NOT uploaded — the parser tears them apart
-- on the device. Only the extracted per-transaction data lands here.
--
-- Load-bearing invariant enforced by a CHECK constraint below:
--   bank_transactions.classification NEVER contains a value that
--   would auto-imply a customer sale. A R5,000 inflow from
--   "S. Dlamini" stays as classification='unknown', direction='in';
--   the classifier is deliberately incapable of promoting it to
--   revenue.
--
-- Idempotency:
--   * bank_statements: UNIQUE (owner_id, file_hash) — re-uploading
--                       the same file byte-for-byte is a no-op.
--   * bank_transactions: UNIQUE (owner_id, fingerprint) — re-imports
--                        of overlapping periods (e.g. Jan-Feb and
--                        Feb-Mar statements sharing February) don't
--                        double-count.
--
-- This migration is idempotent. Run AFTER 010_evidence_tiers.sql.

-- ---------------------------------------------------------------------------
-- 1. Bank statements — one row per uploaded file.
-- ---------------------------------------------------------------------------

create table if not exists public.bank_statements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,

  -- Which bank the file came from. Free-text with a soft check so we
  -- can add new banks without a schema migration; unknown banks get
  -- 'unknown' and a generic parser.
  bank text not null default 'unknown'
    check (bank in (
      'capitec','fnb','absa','standard','nedbank',
      'tymebank','discovery','investec','african_bank','unknown'
    )),

  -- Displayed to the user in the "my imports" list.
  filename text not null,

  -- SHA-256 hex digest of the uploaded file's bytes. Idempotency:
  -- the same file uploaded twice hits the unique index and short-
  -- circuits without re-parsing.
  file_hash text not null,

  -- Masked account reference. The parser is expected to store ONLY
  -- the last 4 digits (or an empty string if it couldn't extract
  -- them). Never the full account number.
  account_ref text,

  -- Bounds of the statement's transaction range. Nullable when the
  -- parser can't confidently detect them from the file.
  period_start date,
  period_end date,

  -- Opening + closing balance from the statement header/footer, when
  -- available. Numeric so we can render them but nullable so parsers
  -- don't need to invent values.
  opening_balance numeric(14, 2),
  closing_balance numeric(14, 2),

  transaction_count integer not null default 0 check (transaction_count >= 0),

  imported_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- One statement per (owner, file). Reuploads of the exact same file
-- become UPDATE-or-skip on the client side.
create unique index if not exists bank_statements_owner_file_hash_uniq
  on public.bank_statements (owner_id, file_hash);

create index if not exists bank_statements_owner_imported_idx
  on public.bank_statements (owner_id, imported_at desc);

alter table public.bank_statements enable row level security;

-- RLS — owner-only access. Same policy shape as the other value-
-- bearing tables introduced in earlier migrations.
drop policy if exists bank_statements_owner_select on public.bank_statements;
create policy bank_statements_owner_select
  on public.bank_statements for select
  using (owner_id = auth.uid());

drop policy if exists bank_statements_owner_insert on public.bank_statements;
create policy bank_statements_owner_insert
  on public.bank_statements for insert
  with check (owner_id = auth.uid());

drop policy if exists bank_statements_owner_update on public.bank_statements;
create policy bank_statements_owner_update
  on public.bank_statements for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists bank_statements_owner_delete on public.bank_statements;
create policy bank_statements_owner_delete
  on public.bank_statements for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. Bank transactions — one row per parsed statement line.
-- ---------------------------------------------------------------------------

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  statement_id uuid not null
    references public.bank_statements(id) on delete cascade,

  -- When the bank says the transaction occurred.
  occurred_at timestamptz not null,

  -- Money-in / money-out. Never null; the parser rejects rows where
  -- the sign is ambiguous.
  direction text not null check (direction in ('in', 'out')),

  -- Always positive rand amount. Direction carries the sign.
  amount numeric(14, 2) not null check (amount > 0),

  -- Raw description string as extracted from the statement. Kept
  -- verbatim (subject to whitespace normalisation) for audit + for
  -- letting a user re-classify later if the automated classifier got
  -- it wrong.
  description text not null,

  -- The counterparty the parser was able to pull out of the
  -- description. May be null when the description is too opaque
  -- (e.g. "PAYMENT" alone). counterparty_hash is SHA-256 of the
  -- normalised counterparty and is used both for idempotency and
  -- for future community-learning without exposing raw names.
  counterparty_name text,
  counterparty_hash text,

  -- Optional bank reference / payment note.
  reference text,

  -- Classifier output. See the CHECK constraint below for the
  -- allowed values. Note: 'customer_sale' does NOT exist as a
  -- classification. That is the load-bearing PR #23 invariant.
  classification text not null default 'unknown'
    check (classification in (
      'unknown',
      'own_transfer',
      'cash_deposit',
      'cash_withdrawal',
      'bank_fee',
      'airtime',
      'utility',
      'rent_or_subscription',
      'supplier_like',
      'salary_like',
      'stokvel_related',
      'loan_repayment',
      'refund'
    )),

  classification_confidence numeric(3, 2) not null default 0.00
    check (classification_confidence between 0 and 1),

  -- 'rules'  — deterministic rules-based classifier (the only source
  --            for PR #23)
  -- 'user'   — the user tapped-to-reclassify (future PR)
  -- 'community' — matched a hash-based community tag (future PR)
  classification_source text not null default 'rules'
    check (classification_source in ('rules', 'user', 'community')),

  -- Recurrence detection (same counterparty + similar amount + monthly
  -- cadence). Populated by src/lib/bank/recurring.ts.
  is_recurring boolean not null default false,

  -- Idempotency: SHA-256 of the normalised
  -- (occurred_at | amount | direction | counterparty_hash | description)
  -- tuple. Two statements that overlap by a few days will produce
  -- identical fingerprints for the shared transactions, so the
  -- second import UPSERTs onto the existing rows rather than
  -- duplicating.
  fingerprint text not null,

  -- Evidence envelope. bank_transactions are ALWAYS observed tier
  -- and always the same evidence_type. The check constraints make
  -- future bugs (a stray insert with wrong values) impossible.
  event_type text not null default 'bank_transaction'
    check (event_type = 'bank_transaction'),
  evidence_type text not null default 'bank_statement_line'
    check (evidence_type = 'bank_statement_line'),
  evidence_tier text not null default 'observed'
    check (evidence_tier = 'observed'),
  provenance jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

-- Fingerprint uniqueness → per-transaction idempotency across
-- statement re-uploads that overlap.
create unique index if not exists bank_transactions_owner_fingerprint_uniq
  on public.bank_transactions (owner_id, fingerprint);

-- Common query paths for the passport + score:
create index if not exists bank_transactions_owner_occurred_idx
  on public.bank_transactions (owner_id, occurred_at desc);

create index if not exists bank_transactions_owner_classification_idx
  on public.bank_transactions (owner_id, classification, occurred_at desc);

create index if not exists bank_transactions_statement_idx
  on public.bank_transactions (statement_id);

-- Counterparty-diversity queries hit this index.
create index if not exists bank_transactions_owner_counterparty_hash_idx
  on public.bank_transactions (owner_id, counterparty_hash)
  where counterparty_hash is not null;

alter table public.bank_transactions enable row level security;

drop policy if exists bank_transactions_owner_select on public.bank_transactions;
create policy bank_transactions_owner_select
  on public.bank_transactions for select
  using (owner_id = auth.uid());

drop policy if exists bank_transactions_owner_insert on public.bank_transactions;
create policy bank_transactions_owner_insert
  on public.bank_transactions for insert
  with check (owner_id = auth.uid());

drop policy if exists bank_transactions_owner_update on public.bank_transactions;
create policy bank_transactions_owner_update
  on public.bank_transactions for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists bank_transactions_owner_delete on public.bank_transactions;
create policy bank_transactions_owner_delete
  on public.bank_transactions for delete
  using (owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Sanity: the bank_transaction event_type must never appear on
--    other tables. This isn't strictly enforced (event_type is a
--    plain text column on sales/expenses/contributions/tabs), but a
--    NOTICE at the end of the migration flags any bug that leaked
--    the value into the wrong table so we catch it fast.
-- ---------------------------------------------------------------------------

do $$
declare
  leaked_sales integer;
  leaked_expenses integer;
  leaked_contribs integer;
begin
  select count(*) into leaked_sales
    from public.sales where event_type = 'bank_transaction';
  select count(*) into leaked_expenses
    from public.expenses where event_type = 'bank_transaction';
  select count(*) into leaked_contribs
    from public.contributions where event_type = 'bank_transaction';

  raise notice '── PR #23 Bank-Statement Migration Applied ──';
  raise notice 'New tables: bank_statements + bank_transactions with RLS.';
  raise notice 'Existing bank_statements: %',
    (select count(*) from public.bank_statements);
  raise notice 'Existing bank_transactions: %',
    (select count(*) from public.bank_transactions);
  if leaked_sales + leaked_expenses + leaked_contribs > 0 then
    raise notice
      '⚠  Detected event_type=bank_transaction leaked into legacy tables — sales=%, expenses=%, contribs=%.',
      leaked_sales, leaked_expenses, leaked_contribs;
  else
    raise notice '✓  No cross-table event_type leaks. Schema clean.';
  end if;
end
$$;

-- End of migration 011.

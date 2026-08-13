-- Migration 016: bind a mashonisa loan to the borrower's identity.
--
-- Until now a loan carried only a borrower NAME typed by the lender —
-- nothing tied it to a real, accountable person. This adds the
-- borrower's self-entered SA ID number and a record that they agreed
-- to the loan, so the loan (and its repayment behaviour) attaches to a
-- real identity: it holds the borrower accountable and builds their
-- credit history.
--
--   borrower_id_number    — the SA ID the borrower entered (validated
--                           for format + checksum on the device).
--   borrower_consent_at   — when the borrower tapped "I agree".
--   borrower_confirmation — how identity was captured:
--                             in_person  — entered + agreed on the
--                                          lender's phone
--                             awaiting   — a confirmation link was sent,
--                                          not completed yet (Phase 2)
--                             unverified — no ID captured (cash only)
--
-- Existing rows default to 'unverified' — they simply predate the
-- feature. Idempotent: safe to re-run.

alter table public.mashonisa_loans
  add column if not exists borrower_id_number text,
  add column if not exists borrower_consent_at timestamptz,
  add column if not exists borrower_confirmation text not null default 'unverified';

alter table public.mashonisa_loans
  drop constraint if exists mashonisa_loans_borrower_confirmation_check;

alter table public.mashonisa_loans
  add constraint mashonisa_loans_borrower_confirmation_check
  check (borrower_confirmation in ('in_person', 'awaiting', 'unverified'));

do $$
begin
  raise notice '── Mashonisa borrower identity applied ──';
  raise notice 'mashonisa_loans now carries borrower_id_number, borrower_consent_at, borrower_confirmation';
end
$$;

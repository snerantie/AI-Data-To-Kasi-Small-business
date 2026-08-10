-- Migration 012: Contact form submissions from the marketing landing page.
--
-- Introduced alongside the kasikash.com landing site (PR #28). The
-- landing has a contact form for lenders, partners, journalists,
-- and anyone else who wants to reach the founder without opening
-- the app itself.
--
-- Design goals:
--   * Public unauthenticated visitors can submit.
--   * Only the service_role (i.e. the founder via the Supabase
--     dashboard) can read submissions. No anon or authenticated
--     read policy exists — RLS defaults deny.
--   * Content bounds enforced by CHECK constraints so a botspam
--     attempt with a 1MB message is rejected at the database.
--   * Status column so submissions can be triaged (new → read →
--     replied → archived) without a separate CRM.
--
-- No JOIN with profiles / auth.users — a submitter doesn't need to
-- have a KasiKash account. The email column is the only contact
-- channel we retain.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),

  -- Sender fields. All required apart from `organization`.
  name text not null
    check (length(trim(name)) between 1 and 200),
  email text not null
    check (
      length(email) between 3 and 320
      and position('@' in email) > 1
    ),
  organization text
    check (
      organization is null
      or length(trim(organization)) between 1 and 200
    ),
  message text not null
    check (length(trim(message)) between 1 and 5000),

  -- Where the submission came from. Currently only 'landing_page'
  -- but the column exists so future channels (in-app feedback,
  -- press page) can share the same table.
  source text not null default 'landing_page'
    check (source in ('landing_page', 'in_app', 'other')),

  -- Triage state. Founder toggles this via the Supabase dashboard.
  status text not null default 'new'
    check (status in ('new', 'read', 'replied', 'archived')),

  -- Optional context for spam-hygiene later. Both nullable —
  -- privacy-preserving defaults for anyone who declines them.
  user_agent text
    check (user_agent is null or length(user_agent) <= 500),

  created_at timestamptz not null default now()
);

-- Latest-first ordering when the founder opens the table.
create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

-- Fast triage query: "show me only new messages".
create index if not exists contact_messages_status_created_idx
  on public.contact_messages (status, created_at desc);

alter table public.contact_messages enable row level security;

-- Anyone — anon or authenticated — can insert a contact submission.
-- The CHECK constraints above defend against oversized / malformed
-- payloads at the DB layer, so no additional server-side validation
-- is needed for basic hygiene.
drop policy if exists contact_messages_public_insert on public.contact_messages;
create policy contact_messages_public_insert
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

-- NO select / update / delete policies. RLS defaults deny, so
-- reading the table requires the service_role key. Practically
-- that means the founder sees submissions in:
--   * The Supabase dashboard (Table Editor uses service_role)
--   * The Supabase SQL editor
--   * A future admin-only server endpoint using SUPABASE_SERVICE_ROLE_KEY
-- Anonymous visitors, other KasiKash users, and even the submitter
-- themselves cannot read the row back after inserting.

comment on table public.contact_messages is
  'Contact form submissions from the KasiKash marketing site. '
  'Insert allowed to anon; read/update/delete only via service_role.';

do $$
begin
  raise notice '── PR #28 Contact-form Migration Applied ──';
  raise notice 'New table: contact_messages (RLS: anon insert, service_role read).';
  raise notice 'Existing rows: %',
    (select count(*) from public.contact_messages);
end
$$;

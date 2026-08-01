-- ════════════════════════════════════════════════════════════════
-- Migration 0004: activity call-tracking, multiple addresses per
-- branch, multiple emails per contact, branch-level legal/company
-- details tab.
--
-- All additive — nothing dropped, so existing data / running app
-- keeps working until the frontend switches over.
-- ════════════════════════════════════════════════════════════════

-- ─── Activity log: significant/insignificant + reschedule date+time ──
-- Each logged call/note can now carry its own significance and an
-- optional reschedule datetime, rather than one global field on the
-- contact. The dashboard's "call delayed by" indicator reads the
-- nearest reschedule_at per branch from this table.
alter table contact_activities
  add column if not exists call_significance text
    check (call_significance in ('significant', 'insignificant')),
  add column if not exists reschedule_at timestamptz;

create index if not exists idx_contact_activities_reschedule_at
  on contact_activities (reschedule_at);

-- ─── Multiple addresses per branch (Billing / Mailing / Other) ───────
-- Replaces the single set of address columns on `branches` with a
-- repeatable list, one of which can be flagged as the default. The
-- old columns on `branches` are left in place (unused going forward)
-- so nothing breaks mid-rollout; a follow-up migration can drop them
-- once the new table is confirmed as the source of truth.
--
-- NOTE: no "area/locality" column here per the client's "only keep
-- town" note — Town is kept, Locality/Area is dropped.
create table if not exists branch_addresses (
  id            uuid primary key default uuid_generate_v4(),
  branch_id     uuid not null references branches(id) on delete cascade,
  address_type  text default 'Billing',   -- Billing | Mailing | Other
  is_default    boolean default false,
  shop_no       text,
  building_name text,
  lane_street   text,
  landmark      text,
  town          text,
  pin           text,
  taluka        text,
  district      text,
  state         text,
  position      int default 0,
  created_at    timestamptz default now()
);

create unique index if not exists one_default_address_per_branch
  on branch_addresses (branch_id)
  where is_default = true;

create index if not exists idx_branch_addresses_branch_id on branch_addresses (branch_id);

-- Backfill one address row per existing branch from its current columns.
insert into branch_addresses (branch_id, address_type, is_default, shop_no, building_name, lane_street, landmark, town, pin, taluka, district, state)
select id, coalesce(address_type, 'Billing'), true, shop_no, building_name, lane_street, landmark, town, pin, taluka, district, state
from branches b
where not exists (select 1 from branch_addresses a where a.branch_id = b.id);

-- ─── Multiple emails per contact (mirrors contact_phones) ────────────
create table if not exists contact_emails (
  id          uuid primary key default uuid_generate_v4(),
  contact_id  uuid not null references contacts(id) on delete cascade,
  label       text not null default 'Email',
  email       text not null,
  position    int default 0,
  created_at  timestamptz default now()
);

create index if not exists idx_contact_emails_contact_id on contact_emails (contact_id);

-- Backfill from the existing email / email_2 columns.
insert into contact_emails (contact_id, label, email, position)
select id, 'Email-1', email, 0 from contacts where email is not null and email <> ''
union all
select id, 'Email-2', email_2, 1 from contacts where email_2 is not null and email_2 <> '';

-- ─── Branch-level Legal tab: GST, Aadhar, company details ────────────
-- Distinct from the per-person gst_no/pan_no/aadhar_no already on
-- `contacts` — these are the company/branch's own registration details.
alter table branches
  add column if not exists legal_gst_no      text,
  add column if not exists legal_pan_no      text,
  add column if not exists legal_aadhar_no   text,
  add column if not exists company_reg_no    text,   -- CIN / registration number
  add column if not exists company_legal_name text;  -- registered legal name, if different from trade name

-- ─── RLS ───────────────────────────────────────────────────────────
alter table branch_addresses enable row level security;
alter table contact_emails   enable row level security;

create policy "auth_all_branch_addresses" on branch_addresses for all to authenticated using (true) with check (true);
create policy "auth_all_contact_emails"   on contact_emails   for all to authenticated using (true) with check (true);

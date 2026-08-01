-- ════════════════════════════════════════════════════════════════
-- Migration 0005: Legal tab -> repeatable document list, and a new
-- Social tab (Instagram / Facebook / WhatsApp / LinkedIn / X /
-- Threads / Google / Other), both per branch.
--
-- Additive: the fixed legal_gst_no / legal_pan_no / legal_aadhar_no /
-- company_reg_no columns added in migration 0004 are left in place
-- and backfilled into the new table below, then no longer edited from
-- the UI going forward.
-- ════════════════════════════════════════════════════════════════

create table if not exists branch_legal_docs (
  id         uuid primary key default uuid_generate_v4(),
  branch_id  uuid not null references branches(id) on delete cascade,
  doc_type   text not null default 'Other', -- PAN | Aadhar | Driving License | Passport | GST | Govt ID | Company ID | Other
  label      text,                          -- custom label, used when doc_type = 'Other'
  value      text,
  position   int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_branch_legal_docs_branch_id on branch_legal_docs (branch_id);

create table if not exists branch_socials (
  id         uuid primary key default uuid_generate_v4(),
  branch_id  uuid not null references branches(id) on delete cascade,
  platform   text not null default 'Other', -- Instagram | Facebook | WhatsApp | LinkedIn | X | Threads | Google | Other
  label      text,                          -- custom label, used when platform = 'Other'
  value      text,                          -- handle, phone, or URL
  position   int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_branch_socials_branch_id on branch_socials (branch_id);

-- Backfill from the fixed columns added in 0004, so nothing already
-- entered is lost when the Legal tab switches to this repeatable list.
insert into branch_legal_docs (branch_id, doc_type, value, position)
select id, 'GST', legal_gst_no, 0 from branches where legal_gst_no is not null and legal_gst_no <> ''
union all
select id, 'PAN', legal_pan_no, 1 from branches where legal_pan_no is not null and legal_pan_no <> ''
union all
select id, 'Aadhar', legal_aadhar_no, 2 from branches where legal_aadhar_no is not null and legal_aadhar_no <> ''
union all
select id, 'Company ID', company_reg_no, 3 from branches where company_reg_no is not null and company_reg_no <> '';

alter table branch_legal_docs enable row level security;
alter table branch_socials    enable row level security;

create policy "auth_all_branch_legal_docs" on branch_legal_docs for all to authenticated using (true) with check (true);
create policy "auth_all_branch_socials"    on branch_socials    for all to authenticated using (true) with check (true);

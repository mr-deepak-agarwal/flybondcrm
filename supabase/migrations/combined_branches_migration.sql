-- ════════════════════════════════════════════════════════════════
-- COMBINED MIGRATION — paste this whole file into the Supabase
-- SQL Editor and run it once.
--
-- Wrapped in a transaction: if anything fails partway through,
-- everything rolls back rather than leaving the DB half-migrated.
--
-- Run this on a staging copy of your project first if you have one.
-- ════════════════════════════════════════════════════════════════

begin;

-- ════════════════════════════════════════════════════════════════
-- Migration 0002: branch/account-first data model
--
-- Restructures the CRM from "one flat person record" to
-- "a branch/account record with N contact-people underneath",
-- per the client's wireframes (Identity/About, Address, More Contacts).
--
-- IMPORTANT NAMING NOTE: this is called `branches`, not `companies`,
-- because the wireframe shows the SAME company name (e.g. "Canara
-- Bank") appearing twice with different Branch Codes. Treating each
-- row as a branch/location avoids incorrectly merging two real
-- branches into one record.
--
-- This migration is ADDITIVE ONLY. It does not drop any existing
-- column on `contacts` (phone, phone_2, mobile, whatsapp, company,
-- address_line, etc.). Those are left in place so the current app
-- keeps working until the frontend is updated to read from the new
-- tables. A follow-up migration should drop them once that's done.
-- ════════════════════════════════════════════════════════════════

-- ─── Branches (the primary record shown in Images 1/2/4) ──────────
create table if not exists branches (
  id             uuid primary key default uuid_generate_v4(),
  customer_id    bigserial unique,              -- auto-number shown as "Customer ID"

  -- Identity
  name           text not null,                 -- "Company Name"
  branch_code    text,

  -- Classification (dropdown-backed; see notes below on option lists)
  contact_type   text,                           -- Manufacturer | Trader | Wholesaler | Company | Free Lancer | Service Provider
  category       text,                           -- Civil Engineer | Hospital | Healthcare | Individual | Clinic | Resort | Lodge | Restaurant | Bank | Financial Institute
  segment        text,                           -- Healthcare | Hospitality | Hotel | Financial Institute
  status         text default 'Suspect',         -- Dump | Suspect | Prospect | Customer 1 | Customer 2 | Customer+ | Regular | Loyal | 5 Star
  assigned_to    text,                           -- executive/staff name

  about          text,                           -- "About Company"
  default_calling text,                          -- placeholder — meaning TBC with client

  -- Address
  address_type   text default 'Billing',         -- Billing | Mailing | Other
  shop_no        text,
  building_name  text,
  lane_street    text,
  landmark       text,
  area           text,                           -- "Locality / Area"
  town           text,                           -- "Place / Town"
  pin            text,
  taluka         text,
  district       text,
  state          text,

  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

comment on table branches is
  'Branch/account-level record. NOTE: "Primary Contact" shown in the UI is NOT a column here — '
  'it is computed by looking up the contacts row for this branch where is_primary = true.';

-- ─── Link contacts (people) to a branch ────────────────────────────
alter table contacts
  add column if not exists company_id  uuid references branches(id) on delete cascade,
  add column if not exists is_primary  boolean default false,
  add column if not exists designation text;  -- Owner | Partner | Assistant | Officer | Manager | Senior Manager | Director | Authorised

comment on column contacts.designation is
  'Per-person designation at their branch (distinct from the legacy job_title free-text field).';

-- Enforce at most one primary person per branch at the DB level.
create unique index if not exists one_primary_contact_per_branch
  on contacts (company_id)
  where is_primary = true;

-- ─── Contact phones (unlimited, replaces phone/phone_2/mobile/whatsapp going forward) ─
create table if not exists contact_phones (
  id          uuid primary key default uuid_generate_v4(),
  contact_id  uuid not null references contacts(id) on delete cascade,
  label       text not null default 'Mobile',   -- e.g. "Mobile-1", "Mobile-2", "WhatsApp"
  number      text not null,
  position    int default 0,                     -- display order
  created_at  timestamptz default now()
);

create index if not exists idx_contact_phones_contact_id on contact_phones (contact_id);

-- ─── RLS (same pattern as the rest of the schema) ──────────────────
alter table branches       enable row level security;
alter table contact_phones enable row level security;

create policy "auth_all_branches"       on branches       for all to authenticated using (true) with check (true);
create policy "auth_all_contact_phones" on contact_phones for all to authenticated using (true) with check (true);

create index if not exists idx_contacts_company_id on contacts (company_id);
-- ════════════════════════════════════════════════════════════════
-- Migration 0003: backfill branches + contact_phones from existing
-- `contacts` rows.
--
-- Approach: since the OLD data has no concept of "branch" at all,
-- we create exactly ONE branch per existing contact (never merging
-- by company name — see the note in 0002 about Canara Bank having
-- two distinct branches with the same name). That new branch takes
-- the contact's company/address/classification fields, and the
-- contact is linked to it as the primary person.
--
-- Safe to re-run: skips any contact that already has a company_id.
-- ════════════════════════════════════════════════════════════════

do $$
declare
  r          contacts%rowtype;
  new_branch_id uuid;
begin
  for r in select * from contacts where company_id is null loop

    insert into branches (
      name, contact_type, category, segment, status, assigned_to,
      about, address_type, area, town, pin, taluka, district, state
    ) values (
      coalesce(nullif(r.company, ''), r.first_name || ' ' || coalesce(r.last_name, '')), -- fall back to person's name if no company on file
      r.contact_type,
      r.category,
      r.segment,
      -- old `status` values (suspect/prospect/unassigned/active/loyal/blacklisted) don't map 1:1
      -- onto the new set (Dump/Suspect/Prospect/Customer 1/Customer 2/Customer+/Regular/Loyal/5 Star).
      -- Mapped conservatively below; review after migration and adjust in bulk if needed.
      case r.status
        when 'prospect'     then 'Prospect'
        when 'active'       then 'Customer 1'
        when 'loyal'        then 'Loyal'
        when 'blacklisted'  then 'Dump'
        else 'Suspect'
      end,
      r.assigned_to,
      r.notes,
      'Billing',
      r.area,
      null, -- old schema had no separate "town" field distinct from area
      r.pin,
      r.taluka,
      r.district,
      r.state
    )
    returning id into new_branch_id;

    update contacts
      set company_id = new_branch_id,
          is_primary = true,
          designation = r.job_title
      where id = r.id;

    -- Move any populated legacy phone columns into contact_phones.
    if r.mobile is not null and r.mobile <> '' then
      insert into contact_phones (contact_id, label, number, position) values (r.id, 'Mobile-1', r.mobile, 1);
    end if;
    if r.phone is not null and r.phone <> '' then
      insert into contact_phones (contact_id, label, number, position) values (r.id, 'Phone', r.phone, 2);
    end if;
    if r.phone_2 is not null and r.phone_2 <> '' then
      insert into contact_phones (contact_id, label, number, position) values (r.id, 'Phone-2', r.phone_2, 3);
    end if;
    if r.whatsapp is not null and r.whatsapp <> '' then
      insert into contact_phones (contact_id, label, number, position) values (r.id, 'WhatsApp', r.whatsapp, 4);
    end if;

  end loop;
end $$;

commit;

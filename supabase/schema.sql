-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── Products ────────────────────────────────────────────
create table if not exists products (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  price       numeric(10,2),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ─── Contacts ────────────────────────────────────────────
create table if not exists contacts (
  id              uuid primary key default uuid_generate_v4(),

  -- Identity
  title           text,                          -- Mr / Ms / Dr etc.
  first_name      text not null,
  middle_name     text,
  last_name       text,
  company         text,
  job_title       text,

  -- Contact type / classification
  contact_type    text default 'customer',       -- customer | vendor | supplier | agent
  category        text,
  segment         text,
  status          text default 'prospect',       -- suspect | prospect | unassigned | active | loyal | blacklisted
  frequency_type  text default 'unassigned',     -- 1time | regular | loyal | blacklisted
  star_rating     numeric(2,1) default 0,        -- 0..5 in 0.5 steps
  assigned_to     text,

  -- Address
  address_line    text,
  area            text,
  taluka          text,
  district        text,
  state           text,
  pin             text,

  -- Communication
  phone           text,
  phone_2         text,
  mobile          text,
  whatsapp        text,
  email           text,
  email_2         text,

  -- Social / Online
  website         text,
  instagram       text,
  facebook        text,
  google_review   text,

  -- Legal / IDs
  gst_no          text,
  pan_no          text,
  aadhar_no       text,
  driving_license text,

  -- Owner / Proprietor (secondary contact person)
  owner_name      text,
  owner_mobile    text,
  owner_whatsapp  text,

  -- Call scheduling
  next_call_date  date,
  call_significance text default 'significant',  -- significant | insignificant

  -- Misc
  notes           text,
  pending_status  text,                           -- quote | order | bill | null

  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ─── Projects / Orders ───────────────────────────────────
create table if not exists projects (
  id               uuid primary key default uuid_generate_v4(),
  client_name      text not null,
  contact_id       uuid references contacts(id) on delete set null,
  address          text,
  work_description text,
  product_id       uuid references products(id) on delete set null,
  product_name     text,
  status           text default 'active',        -- active | completed | on-hold

  -- Order pipeline stages (timestamp = completed, null = pending)
  stage_artwork     timestamptz,
  stage_production  timestamptz,
  stage_billing     timestamptz,
  stage_delivery    timestamptz,
  stage_proof       timestamptz,
  stage_followup    timestamptz,
  stage_feedback    timestamptz,
  stage_review      timestamptz,

  bill_no          text,
  amount           numeric(12,2),

  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ─── Activity Log (notes / calls) ────────────────────────
create table if not exists contact_activities (
  id          uuid primary key default uuid_generate_v4(),
  contact_id  uuid references contacts(id) on delete cascade,
  note        text not null,
  created_at  timestamptz default now()
);

-- ─── Campaigns ───────────────────────────────────────────
create table if not exists campaigns (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  created_at  timestamptz default now()
);

create table if not exists contact_campaigns (
  contact_id  uuid references contacts(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete cascade,
  primary key (contact_id, campaign_id)
);

-- ─── RLS ─────────────────────────────────────────────────
alter table products          enable row level security;
alter table contacts          enable row level security;
alter table projects          enable row level security;
alter table contact_activities enable row level security;
alter table campaigns         enable row level security;
alter table contact_campaigns enable row level security;

create policy "auth_all_products"           on products           for all to authenticated using (true) with check (true);
create policy "auth_all_contacts"           on contacts           for all to authenticated using (true) with check (true);
create policy "auth_all_projects"           on projects           for all to authenticated using (true) with check (true);
create policy "auth_all_activities"         on contact_activities for all to authenticated using (true) with check (true);
create policy "auth_all_campaigns"          on campaigns          for all to authenticated using (true) with check (true);
create policy "auth_all_contact_campaigns"  on contact_campaigns  for all to authenticated using (true) with check (true);

-- Enable RLS
create extension if not exists "uuid-ossp";

-- Products table
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  price numeric(10,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contacts table
create table if not exists contacts (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text,
  phone text,
  company text,
  address text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Projects table
create table if not exists projects (
  id uuid primary key default uuid_generate_v4(),
  client_name text not null,
  address text,
  work_description text,
  product_id uuid references products(id) on delete set null,
  product_name text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS Policies (enable after setting up auth)
alter table products enable row level security;
alter table contacts enable row level security;
alter table projects enable row level security;

-- Allow authenticated users full access
create policy "Authenticated users can do everything on products"
  on products for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on contacts"
  on contacts for all to authenticated using (true) with check (true);

create policy "Authenticated users can do everything on projects"
  on projects for all to authenticated using (true) with check (true);

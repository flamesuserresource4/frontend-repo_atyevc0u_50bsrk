-- Supabase schema for Smart Ledger dashboard
-- Run this in the Supabase SQL editor for your project

-- Enable required extensions (usually enabled by default)
create extension if not exists "pgcrypto";

-- Helper function to auto-update updated_at
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- bank_balance: one row per user
create table if not exists public.bank_balance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- expenses: one row per user (latest value)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2),
  month text,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- sales: one row per user
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(14,2),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- orders: one row per user
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  total_orders integer,
  pending integer,
  completed integer,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- reminders: one row per user (single upcoming reminder)
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  due_date date,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

-- Triggers to update updated_at on update
create or replace trigger set_updated_at_bank
before update on public.bank_balance
for each row execute procedure set_updated_at();

create or replace trigger set_updated_at_expenses
before update on public.expenses
for each row execute procedure set_updated_at();

create or replace trigger set_updated_at_sales
before update on public.sales
for each row execute procedure set_updated_at();

create or replace trigger set_updated_at_orders
before update on public.orders
for each row execute procedure set_updated_at();

create or replace trigger set_updated_at_reminders
before update on public.reminders
for each row execute procedure set_updated_at();

-- RLS policies: enable and restrict to own user_id
alter table public.bank_balance enable row level security;
alter table public.expenses enable row level security;
alter table public.sales enable row level security;
alter table public.orders enable row level security;
alter table public.reminders enable row level security;

-- Select
create policy if not exists select_own_bank on public.bank_balance
for select using ( auth.uid() = user_id );
create policy if not exists select_own_expenses on public.expenses
for select using ( auth.uid() = user_id );
create policy if not exists select_own_sales on public.sales
for select using ( auth.uid() = user_id );
create policy if not exists select_own_orders on public.orders
for select using ( auth.uid() = user_id );
create policy if not exists select_own_reminders on public.reminders
for select using ( auth.uid() = user_id );

-- Insert
create policy if not exists insert_own_bank on public.bank_balance
for insert with check ( auth.uid() = user_id );
create policy if not exists insert_own_expenses on public.expenses
for insert with check ( auth.uid() = user_id );
create policy if not exists insert_own_sales on public.sales
for insert with check ( auth.uid() = user_id );
create policy if not exists insert_own_orders on public.orders
for insert with check ( auth.uid() = user_id );
create policy if not exists insert_own_reminders on public.reminders
for insert with check ( auth.uid() = user_id );

-- Update
create policy if not exists update_own_bank on public.bank_balance
for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
create policy if not exists update_own_expenses on public.expenses
for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
create policy if not exists update_own_sales on public.sales
for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
create policy if not exists update_own_orders on public.orders
for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );
create policy if not exists update_own_reminders on public.reminders
for update using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- Realtime: Supabase Realtime works when the table is in the publication. Run once:
-- (You can do this from SQL editor if not already set)
-- alter publication supabase_realtime add table public.bank_balance, public.expenses, public.sales, public.orders, public.reminders;

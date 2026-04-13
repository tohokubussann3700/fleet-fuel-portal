-- ===========================================================
--  社用車管理社圠ポータル — Supabase テーブル定匲--  Supabase > SQL Editor で実行してください
-- ===========================================================

create table if not exists public.fuel_records (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  date          text        not null,
  vehicle       text        not null,
  employee      text        not null,
  odometer      numeric,
  distance      numeric,
  liters        numeric,
  amount        numeric,
  price_per_l   numeric,
  kmpl          numeric,
  station       text default ''
);

create index if not exists idx_fuel_records_vehicle on public.fuel_records(vehicle);
create index if not exists idx_fuel_records_date    on public.fuel_records(date);

alter table public.fuel_records enable row level security;

create policy "allow_all_read"
  on public.fuel_records for select
  using (true);

create policy "allow_all_insert"
  on public.fuel_records for insert
  with check (true);

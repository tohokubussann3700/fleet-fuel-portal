-- ============================================================
--  社用車管理ポータル — Supabase テーブル定義
--  Supabase > SQL Editor で実行してください
-- ============================================================

create table if not exists public.fuel_records (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),
  date          text        not null,          -- "2025-04-13"
  vehicle       text        not null,          -- 車種・ナンバー
  employee      text        not null,          -- 社員名
  odometer      numeric,                       -- オドメーター (km)
  distance      numeric,                       -- 走行距離 (km)
  liters        numeric,                       -- 給油量 (L)
  amount        numeric,                       -- 給油金額 (円)
  price_per_l   numeric,                       -- 単価 (円/L)
  kmpl          numeric,                       -- 燃費 (km/L)
  station       text default ''               -- スタンド名
);

-- インデックス（車両・日付での検索を高速化）
create index if not exists idx_fuel_records_vehicle on public.fuel_records(vehicle);
create index if not exists idx_fuel_records_date    on public.fuel_records(date);

-- RLS（Row Level Security）を有効化 — 全員読み書き可（社内共有ユース）
alter table public.fuel_records enable row level security;

create policy "allow_all_read"
  on public.fuel_records for select
  using (true);

create policy "allow_all_insert"
  on public.fuel_records for insert
  with check (true);

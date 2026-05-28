-- Closed Days Table
-- Run this migration in Supabase SQL Editor

create table if not exists public.closed_days (
  id         uuid primary key default gen_random_uuid(),
  date       text not null,         -- YYYY-MM-DD
  city_id    uuid,                  -- null = applies to all cities
  reason     text not null default '',
  created_at timestamptz not null default now(),
  unique(date, city_id)
);

alter table public.closed_days enable row level security;

drop policy if exists "closed_days_select" on public.closed_days;
drop policy if exists "closed_days_insert" on public.closed_days;
drop policy if exists "closed_days_delete" on public.closed_days;

create policy "closed_days_select" on public.closed_days for select using (true);
create policy "closed_days_insert" on public.closed_days for insert with check (true);
create policy "closed_days_delete" on public.closed_days for delete using (true);

-- Workshop Registrations Table
-- Run this migration in Supabase SQL Editor

create table if not exists public.workshop_registrations (
  id            uuid primary key default gen_random_uuid(),
  workshop_id   uuid not null references public.workshops(id) on delete cascade,
  user_id       uuid not null,
  user_email    text not null,
  user_name     text not null default '',
  user_surname  text not null default '',
  registered_at timestamptz not null default now(),
  unique(workshop_id, user_id)
);

alter table public.workshop_registrations enable row level security;

drop policy if exists "workshop_registrations_select" on public.workshop_registrations;
drop policy if exists "workshop_registrations_insert" on public.workshop_registrations;
drop policy if exists "workshop_registrations_delete" on public.workshop_registrations;

create policy "workshop_registrations_select"
  on public.workshop_registrations for select using (true);

create policy "workshop_registrations_insert"
  on public.workshop_registrations for insert with check (true);

create policy "workshop_registrations_delete"
  on public.workshop_registrations for delete using (true);

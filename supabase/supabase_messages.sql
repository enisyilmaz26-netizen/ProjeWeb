-- Messaging System Tables
-- Run this migration in Supabase SQL Editor

-- conversations: each row is a thread between two parties
create table if not exists public.conversations (
  id                   uuid primary key default gen_random_uuid(),
  sender_type          text not null check (sender_type in ('user', 'city_admin')),
  sender_id            uuid not null,
  sender_email         text not null,
  sender_name          text not null default '',
  city_id              uuid,
  recipient_type       text not null check (recipient_type in ('city_admin', 'global_admin')),
  last_message_at      timestamptz not null default now(),
  unread_for_sender    int not null default 0,
  unread_for_recipient int not null default 0,
  created_at           timestamptz not null default now(),
  unique(sender_id, recipient_type)
);

-- messages: individual messages in a conversation
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  authored_by     text not null check (authored_by in ('sender', 'recipient')),
  author_name     text not null default '',
  body            text not null,
  created_at      timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversations_select" on public.conversations;
drop policy if exists "conversations_insert" on public.conversations;
drop policy if exists "conversations_update" on public.conversations;
drop policy if exists "messages_select" on public.messages;
drop policy if exists "messages_insert" on public.messages;

create policy "conversations_select" on public.conversations for select using (true);
create policy "conversations_insert" on public.conversations for insert with check (true);
create policy "conversations_update" on public.conversations for update using (true);

create policy "messages_select" on public.messages for select using (true);
create policy "messages_insert" on public.messages for insert with check (true);

-- Enable realtime on these tables (run in Supabase dashboard → Database → Replication if needed)
-- alter publication supabase_realtime add table conversations;
-- alter publication supabase_realtime add table messages;

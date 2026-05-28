-- Waitlist (Bekleme Listesi) table
-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.waitlist (
  id              serial PRIMARY KEY,
  lab_id          integer NOT NULL,
  lab_name        text,
  city_id         integer NOT NULL,
  city_name       text,
  date            text NOT NULL,
  time_slot       text NOT NULL,
  user_id         integer NOT NULL,
  user_email      text NOT NULL,
  user_name       text,
  user_surname    text,
  user_phone      text,
  user_branch     text,
  user_work_location text,
  user_city       text,
  user_district   text,
  status          text NOT NULL DEFAULT 'WAITING',
  created_at      timestamptz DEFAULT now() NOT NULL,
  UNIQUE(lab_id, date, time_slot, user_email)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_slot ON public.waitlist (lab_id, date, time_slot, status);
CREATE INDEX IF NOT EXISTS idx_waitlist_user ON public.waitlist (user_email);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "waitlist_select" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_insert" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_update" ON public.waitlist;
DROP POLICY IF EXISTS "waitlist_delete" ON public.waitlist;

CREATE POLICY "waitlist_select" ON public.waitlist FOR SELECT USING (true);
CREATE POLICY "waitlist_insert" ON public.waitlist FOR INSERT WITH CHECK (true);
CREATE POLICY "waitlist_update" ON public.waitlist FOR UPDATE USING (true);
CREATE POLICY "waitlist_delete" ON public.waitlist FOR DELETE USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist TO anon;
GRANT USAGE, SELECT ON SEQUENCE public.waitlist_id_seq TO anon;

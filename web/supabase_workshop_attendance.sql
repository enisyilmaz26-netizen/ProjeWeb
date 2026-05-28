-- Workshop attendance tracking
-- Run this in Supabase SQL Editor.

ALTER TABLE public.workshop_registrations
  ADD COLUMN IF NOT EXISTS attended boolean DEFAULT false;

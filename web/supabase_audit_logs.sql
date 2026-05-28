-- Audit log table for admin actions
-- Run this in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now() NOT NULL,
  actor_email text,
  actor_name  text,
  actor_role  text,
  action      text        NOT NULL,
  target_type text,
  target_id   text,
  details     text
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs FOR SELECT USING (true);
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT WITH CHECK (true);

GRANT INSERT, SELECT ON public.audit_logs TO anon;

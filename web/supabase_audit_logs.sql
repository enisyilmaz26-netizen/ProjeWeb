-- ─────────────────────────────────────────────────────────────────────────────
-- Audit log table for admin actions
-- Run this once in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at  timestamptz DEFAULT now() NOT NULL,
  actor_email text,
  actor_name  text,
  actor_role  text,
  action      text        NOT NULL,
  target_type text,
  target_id   uuid,
  details     text
);

-- Index for fast recent-first queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Allow the anon role to insert and read audit logs
GRANT INSERT, SELECT ON public.audit_logs TO anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- Server-side rate limiting for login attempts
-- Run this once in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.login_attempts (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email       text        NOT NULL,
  attempted_at timestamptz DEFAULT now() NOT NULL,
  success     boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts (email, attempted_at DESC);

-- Auto-clean entries older than 1 hour to keep table small
CREATE OR REPLACE FUNCTION public.prune_login_attempts() RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '1 hour';
$$;

-- RPC: check_rate_limit(p_email) → returns TRUE if allowed, FALSE if locked
-- Locked = 5+ failed attempts in last 60 seconds
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_email text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  recent_failures int;
BEGIN
  PERFORM public.prune_login_attempts();
  SELECT COUNT(*) INTO recent_failures
    FROM public.login_attempts
   WHERE email = lower(p_email)
     AND success = false
     AND attempted_at > now() - interval '60 seconds';
  RETURN recent_failures < 5;
END;
$$;

-- RPC: record_login_attempt(p_email, p_success)
CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean)
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.login_attempts (email, success) VALUES (lower(p_email), p_success);
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text) TO anon;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) TO anon;
GRANT INSERT, SELECT, DELETE ON public.login_attempts TO anon;

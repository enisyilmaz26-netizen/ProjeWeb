-- ============================================================================
-- HOTFIX — security_hardening migration eksik bağımlılık (check_rate_limit)
-- ============================================================================
-- Sorun: supabase_security_hardening_2026_06.sql, login_user/login_admin'i
-- check_rate_limit() ve record_login_attempt()'i çağıracak şekilde yeniden
-- yazıyor. Ancak eski supabase_rate_limiting.sql migration'ı uygulanmamış.
-- Bu durumda login_user her aramada "function check_rate_limit does not exist"
-- hatasıyla başarısız oluyor → kullanıcı sisteme giriş yapamıyor.
--
-- Bu hotfix önce rate-limit altyapısını kurar, sonra emin olmak için
-- login fonksiyonlarını tekrar yaratır. Idempotent — birden fazla çalıştırılabilir.
-- ============================================================================

-- ─── 1) Rate limit altyapısı ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  email        text        NOT NULL,
  attempted_at timestamptz DEFAULT now() NOT NULL,
  success      boolean     NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts (email, attempted_at DESC);

CREATE OR REPLACE FUNCTION public.prune_login_attempts() RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.login_attempts WHERE attempted_at < now() - interval '1 hour';
$$;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_email text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE recent_failures int;
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

CREATE OR REPLACE FUNCTION public.record_login_attempt(p_email text, p_success boolean)
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO public.login_attempts (email, success) VALUES (lower(p_email), p_success);
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text) TO anon;
GRANT EXECUTE ON FUNCTION public.record_login_attempt(text, boolean) TO anon;
GRANT INSERT, SELECT, DELETE ON public.login_attempts TO anon;

-- ─── 2) login_user / login_admin'i tekrar yarat (idempotent) ─────────────────
DROP FUNCTION IF EXISTS public.login_user(text, text);
DROP FUNCTION IF EXISTS public.login_admin(text, text);

CREATE FUNCTION public.login_user(p_email text, p_password text)
RETURNS TABLE(
  id integer, name text, surname text, email text,
  is_approved boolean, city_id integer, city_name text,
  phone text, branch text, work_location text, district text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_normalized text := lower(trim(p_email));
  v_allowed boolean;
BEGIN
  SELECT public.check_rate_limit(v_normalized) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'err_rate_limited';
  END IF;

  RETURN QUERY
    SELECT u.id, u.name, u.surname, u.email, u.is_approved,
           u.city_id, u.city_name, u.phone, u.branch, u.work_location, u.district
    FROM public.users u
    WHERE u.email = v_normalized
      AND u.password_hash LIKE '$2%'
      AND crypt(p_password, u.password_hash) = u.password_hash
    LIMIT 1;

  IF FOUND THEN
    PERFORM public.record_login_attempt(v_normalized, true);
  ELSE
    PERFORM public.record_login_attempt(v_normalized, false);
  END IF;
END;
$$;

CREATE FUNCTION public.login_admin(p_email text, p_password text)
RETURNS TABLE(
  id integer, name text, email text, role text, city_id integer, phone text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_normalized text := lower(trim(p_email));
  v_allowed boolean;
BEGIN
  SELECT public.check_rate_limit(v_normalized) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'err_rate_limited';
  END IF;

  RETURN QUERY
    SELECT a.id, a.name, a.email, a.role, a.city_id, a.phone
    FROM public.admins a
    WHERE a.email = v_normalized
      AND a.password_hash LIKE '$2%'
      AND crypt(p_password, a.password_hash) = a.password_hash
    LIMIT 1;

  IF FOUND THEN
    PERFORM public.record_login_attempt(v_normalized, true);
  ELSE
    PERFORM public.record_login_attempt(v_normalized, false);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_user(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.login_admin(text, text) TO anon;

NOTIFY pgrst, 'reload schema';

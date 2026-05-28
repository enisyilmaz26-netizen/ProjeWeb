-- ─────────────────────────────────────────────────────────────────────────────
-- Server-side password hashing (bcrypt via pgcrypto)
-- Run this once in Supabase SQL Editor.
--
-- IMPORTANT: Tables use integer (not uuid) for id and city_id columns.
-- Functions use LANGUAGE sql (not plpgsql) for PostgREST compatibility.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop old versions to avoid conflicts
DROP FUNCTION IF EXISTS public.login_user(text, text);
DROP FUNCTION IF EXISTS public.login_admin(text, text);
DROP FUNCTION IF EXISTS public.hash_password_bcrypt(text);
DROP FUNCTION IF EXISTS public.change_user_password(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.change_admin_password(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.change_user_password(integer, text, text, text);
DROP FUNCTION IF EXISTS public.change_admin_password(integer, text, text, text);

-- ─── HASH PASSWORD (bcrypt) ───────────────────────────────────────────────────
CREATE FUNCTION public.hash_password_bcrypt(p_password text)
RETURNS text LANGUAGE sql SECURITY DEFINER AS $$
  SELECT crypt(p_password, gen_salt('bf', 10));
$$;

-- ─── USER LOGIN ──────────────────────────────────────────────────────────────
CREATE FUNCTION public.login_user(p_email text, p_password text)
RETURNS TABLE(
  id integer, name text, surname text, email text,
  is_approved boolean, city_id integer, city_name text,
  phone text, branch text, work_location text, district text
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT u.id, u.name, u.surname, u.email, u.is_approved,
         u.city_id, u.city_name, u.phone, u.branch, u.work_location, u.district
  FROM public.users u
  WHERE u.email = lower(trim(p_email))
    AND u.password_hash LIKE '$2%'
    AND crypt(p_password, u.password_hash) = u.password_hash
  LIMIT 1;
$$;

-- ─── ADMIN LOGIN ─────────────────────────────────────────────────────────────
CREATE FUNCTION public.login_admin(p_email text, p_password text)
RETURNS TABLE(
  id integer, name text, email text, role text, city_id integer, phone text
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT a.id, a.name, a.email, a.role, a.city_id, a.phone
  FROM public.admins a
  WHERE a.email = lower(trim(p_email))
    AND a.password_hash LIKE '$2%'
    AND crypt(p_password, a.password_hash) = a.password_hash
  LIMIT 1;
$$;

-- ─── CHANGE USER PASSWORD ────────────────────────────────────────────────────
CREATE FUNCTION public.change_user_password(
  p_user_id integer, p_email text, p_current_password text, p_new_password text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_hash text;
BEGIN
  SELECT password_hash INTO v_hash FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF NOT (v_hash LIKE '$2%' AND crypt(p_current_password, v_hash) = v_hash) THEN RETURN FALSE; END IF;
  UPDATE public.users SET password_hash = crypt(p_new_password, gen_salt('bf', 10)) WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- ─── CHANGE ADMIN PASSWORD ───────────────────────────────────────────────────
CREATE FUNCTION public.change_admin_password(
  p_admin_id integer, p_email text, p_current_password text, p_new_password text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_hash text;
BEGIN
  SELECT password_hash INTO v_hash FROM public.admins WHERE id = p_admin_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF NOT (v_hash LIKE '$2%' AND crypt(p_current_password, v_hash) = v_hash) THEN RETURN FALSE; END IF;
  UPDATE public.admins SET password_hash = crypt(p_new_password, gen_salt('bf', 10)) WHERE id = p_admin_id;
  RETURN TRUE;
END;
$$;

-- ─── GRANT ANON ACCESS ───────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.hash_password_bcrypt(text)                           TO anon;
GRANT EXECUTE ON FUNCTION public.login_user(text, text)                               TO anon;
GRANT EXECUTE ON FUNCTION public.login_admin(text, text)                              TO anon;
GRANT EXECUTE ON FUNCTION public.change_user_password(integer, text, text, text)      TO anon;
GRANT EXECUTE ON FUNCTION public.change_admin_password(integer, text, text, text)     TO anon;

NOTIFY pgrst, 'reload schema';

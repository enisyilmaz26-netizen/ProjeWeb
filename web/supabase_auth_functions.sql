-- ─────────────────────────────────────────────────────────────────────────────
-- Server-side password hashing (bcrypt via pgcrypto)
-- Run this once in Supabase SQL Editor.
--
-- What this does:
--   • login_user / login_admin  → verify credentials on DB, never return hash
--   • Auto-migrates SHA-256 hashes to bcrypt on first successful login
--   • hash_password_bcrypt      → bcrypt for register / addUser / resetPassword
--   • change_user/admin_password → verify current password server-side, then update
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── USER LOGIN ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.login_user(p_email TEXT, p_password TEXT)
RETURNS TABLE(
  id            uuid,
  name          text,
  surname       text,
  email         text,
  is_approved   boolean,
  city_id       uuid,
  city_name     text,
  phone         text,
  branch        text,
  work_location text,
  district      text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id       uuid;
  v_name     text;
  v_surname  text;
  v_email    text;
  v_hash     text;
  v_approved boolean;
  v_city_id  uuid;
  v_city_nm  text;
  v_phone    text;
  v_branch   text;
  v_work_loc text;
  v_district text;
  v_new_hash text;
BEGIN
  SELECT u.id, u.name, u.surname, u.email, u.password_hash, u.is_approved,
         u.city_id, u.city_name, u.phone, u.branch, u.work_location, u.district
  INTO   v_id, v_name, v_surname, v_email, v_hash, v_approved,
         v_city_id, v_city_nm, v_phone, v_branch, v_work_loc, v_district
  FROM   public.users u
  WHERE  u.email = lower(trim(p_email))
  LIMIT  1;

  IF NOT FOUND THEN RETURN; END IF;

  IF v_hash LIKE '$2%' THEN
    -- bcrypt
    IF crypt(p_password, v_hash) <> v_hash THEN RETURN; END IF;
  ELSE
    -- Legacy SHA-256: client did encode(email + password + 'lab_rezervasyon_2024')
    IF encode(digest(p_email || p_password || 'lab_rezervasyon_2024', 'sha256'), 'hex') <> v_hash THEN RETURN; END IF;
    -- Auto-migrate to bcrypt
    v_new_hash := crypt(p_password, gen_salt('bf', 10));
    UPDATE public.users SET password_hash = v_new_hash WHERE users.id = v_id;
  END IF;

  RETURN QUERY
    SELECT v_id, v_name, v_surname, v_email, v_approved,
           v_city_id, v_city_nm, v_phone, v_branch, v_work_loc, v_district;
END;
$$;

-- ─── ADMIN LOGIN ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.login_admin(p_email TEXT, p_password TEXT)
RETURNS TABLE(
  id      uuid,
  name    text,
  email   text,
  role    text,
  city_id uuid,
  phone   text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_id      uuid;
  v_name    text;
  v_email   text;
  v_hash    text;
  v_role    text;
  v_city_id uuid;
  v_phone   text;
  v_new_hash text;
BEGIN
  SELECT a.id, a.name, a.email, a.password_hash, a.role, a.city_id, a.phone
  INTO   v_id, v_name, v_email, v_hash, v_role, v_city_id, v_phone
  FROM   public.admins a
  WHERE  a.email = lower(trim(p_email))
  LIMIT  1;

  IF NOT FOUND THEN RETURN; END IF;

  IF v_hash LIKE '$2%' THEN
    IF crypt(p_password, v_hash) <> v_hash THEN RETURN; END IF;
  ELSE
    IF encode(digest(p_email || p_password || 'lab_rezervasyon_2024', 'sha256'), 'hex') <> v_hash THEN RETURN; END IF;
    v_new_hash := crypt(p_password, gen_salt('bf', 10));
    UPDATE public.admins SET password_hash = v_new_hash WHERE admins.id = v_id;
  END IF;

  RETURN QUERY SELECT v_id, v_name, v_email, v_role, v_city_id, v_phone;
END;
$$;

-- ─── HASH PASSWORD (bcrypt) ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.hash_password_bcrypt(p_password TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN crypt(p_password, gen_salt('bf', 10));
END;
$$;

-- ─── CHANGE USER PASSWORD ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.change_user_password(
  p_user_id          uuid,
  p_email            text,
  p_current_password text,
  p_new_password     text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT password_hash INTO v_hash FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF v_hash LIKE '$2%' THEN
    IF crypt(p_current_password, v_hash) <> v_hash THEN RETURN FALSE; END IF;
  ELSE
    IF encode(digest(p_email || p_current_password || 'lab_rezervasyon_2024', 'sha256'), 'hex') <> v_hash THEN RETURN FALSE; END IF;
  END IF;

  UPDATE public.users SET password_hash = crypt(p_new_password, gen_salt('bf', 10)) WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

-- ─── CHANGE ADMIN PASSWORD ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.change_admin_password(
  p_admin_id         uuid,
  p_email            text,
  p_current_password text,
  p_new_password     text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_hash text;
BEGIN
  SELECT password_hash INTO v_hash FROM public.admins WHERE id = p_admin_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF v_hash LIKE '$2%' THEN
    IF crypt(p_current_password, v_hash) <> v_hash THEN RETURN FALSE; END IF;
  ELSE
    IF encode(digest(p_email || p_current_password || 'lab_rezervasyon_2024', 'sha256'), 'hex') <> v_hash THEN RETURN FALSE; END IF;
  END IF;

  UPDATE public.admins SET password_hash = crypt(p_new_password, gen_salt('bf', 10)) WHERE id = p_admin_id;
  RETURN TRUE;
END;
$$;

-- ─── GRANT ANON ACCESS ───────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.login_user(text, text)                            TO anon;
GRANT EXECUTE ON FUNCTION public.login_admin(text, text)                           TO anon;
GRANT EXECUTE ON FUNCTION public.hash_password_bcrypt(text)                        TO anon;
GRANT EXECUTE ON FUNCTION public.change_user_password(uuid, text, text, text)      TO anon;
GRANT EXECUTE ON FUNCTION public.change_admin_password(uuid, text, text, text)     TO anon;

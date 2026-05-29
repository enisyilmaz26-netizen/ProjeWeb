-- Fix: add search_path so crypt() from pgcrypto is found inside the function
CREATE OR REPLACE FUNCTION public.change_admin_password(
  p_admin_id integer, p_email text, p_current_password text, p_new_password text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_hash text;
BEGIN
  SELECT password_hash INTO v_hash FROM public.admins WHERE id = p_admin_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF NOT (v_hash LIKE '$2%' AND crypt(p_current_password, v_hash) = v_hash) THEN RETURN FALSE; END IF;
  UPDATE public.admins SET password_hash = crypt(p_new_password, gen_salt('bf', 10)) WHERE id = p_admin_id;
  RETURN TRUE;
END;
$$;

-- Apply same fix to change_user_password for consistency
CREATE OR REPLACE FUNCTION public.change_user_password(
  p_user_id integer, p_email text, p_current_password text, p_new_password text
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_hash text;
BEGIN
  SELECT password_hash INTO v_hash FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  IF NOT (v_hash LIKE '$2%' AND crypt(p_current_password, v_hash) = v_hash) THEN RETURN FALSE; END IF;
  UPDATE public.users SET password_hash = crypt(p_new_password, gen_salt('bf', 10)) WHERE id = p_user_id;
  RETURN TRUE;
END;
$$;

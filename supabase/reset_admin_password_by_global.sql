-- Global admin tarafından başka bir adminin şifresini sıfırlamak için RPC.
-- SECURITY DEFINER: RLS'i bypass eder, anon key ile çalışır.
-- Hedef admine zorunlu şifre değiştirme (must_change_password = true) atar.
-- Supabase SQL Editor'da çalıştır.

CREATE OR REPLACE FUNCTION public.reset_admin_password_by_global(
  p_admin_id integer,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.admins
  SET
    password_hash      = crypt(p_new_password, gen_salt('bf', 10)),
    must_change_password = true
  WHERE id = p_admin_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_admin_password_by_global(integer, text) TO anon;

NOTIFY pgrst, 'reload schema';

-- Global admin tarafından başka bir adminin şifresini sıfırlamak için RPC.
-- Hash client'ta hesaplanıp gönderilir, fonksiyon sadece UPDATE yapar.
-- Supabase SQL Editor'da çalıştır.

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

DROP FUNCTION IF EXISTS public.reset_admin_password_by_global(integer, text);

CREATE FUNCTION public.reset_admin_password_by_global(
  p_admin_id    integer,
  p_password_hash text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.admins
  SET
    password_hash        = p_password_hash,
    must_change_password = true
  WHERE id = p_admin_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_admin_password_by_global(integer, text) TO anon;

NOTIFY pgrst, 'reload schema';

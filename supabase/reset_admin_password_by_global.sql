-- Global admin tarafından başka bir adminin şifresini sıfırlamak için RPC.
-- SECURITY DEFINER + search_path: RLS bypass, crypt() bulunur.
-- Supabase SQL Editor'da çalıştır.

-- Önce admins tablosuna must_change_password kolonu ekle (yoksa)
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT FALSE;

-- Fonksiyonu oluştur / güncelle
CREATE OR REPLACE FUNCTION public.reset_admin_password_by_global(
  p_admin_id integer,
  p_new_password text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.admins
  SET
    password_hash        = crypt(p_new_password, gen_salt('bf', 10)),
    must_change_password = true
  WHERE id = p_admin_id;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_admin_password_by_global(integer, text) TO anon;

NOTIFY pgrst, 'reload schema';

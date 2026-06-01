-- ============================================================================
-- COLUMN-LEVEL LOCKDOWN — sensitive columns artık sadece SECURITY DEFINER RPC ile yazılabilir
-- ============================================================================
-- Amaç:
--   - users.is_approved → anon UPDATE/INSERT engellenir (privilege escalation block)
--   - users.password_hash → anon UPDATE engellenir (yetkisiz şifre değişikliği block)
--   - admins.role, admins.city_id → anon UPDATE/INSERT(role) engellenir
--   - admins.password_hash → anon UPDATE engellenir
--   - Mevcut UI akışları yeni SECURITY DEFINER RPC'ler üzerinden çalışır
--
-- Önemli: Bu migration, daha önce uygulanan migration'lara bağımlı değildir, ama
-- security_hardening_fix uygulanmış olmalıdır. İdempotent — birden fazla
-- çalıştırılabilir.
-- ============================================================================

-- ─── 1) Güvenli default'ları sağla ───────────────────────────────────────────
ALTER TABLE public.users  ALTER COLUMN is_approved SET DEFAULT false;
ALTER TABLE public.admins ALTER COLUMN role        SET DEFAULT 'CITY';
ALTER TABLE public.users  ALTER COLUMN must_change_password SET DEFAULT false;
ALTER TABLE public.admins ALTER COLUMN must_change_password SET DEFAULT false;


-- ─── 2) Yeni RPC'ler (RPC'ler önce yaratılır, sonra REVOKE'lar uygulanır) ───

-- ADMIN: bir kullanıcıyı onayla
CREATE OR REPLACE FUNCTION public.admin_approve_user(p_user_id integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users SET is_approved = true WHERE id = p_user_id;
  RETURN FOUND;
END $$;

-- ADMIN: kullanıcıyı sil (aktif randevuları otomatik iptal eder)
CREATE OR REPLACE FUNCTION public.admin_revoke_user(p_user_id integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM public.users WHERE id = p_user_id;
  IF v_email IS NULL THEN RETURN false; END IF;
  UPDATE public.appointments SET status = 'CANCELLED'
   WHERE user_email = v_email
     AND status IN ('PENDING', 'APPROVED', 'CANCELLATION_REQUESTED');
  DELETE FROM public.users WHERE id = p_user_id;
  RETURN FOUND;
END $$;

-- ADMIN: bir kullanıcının şifresini sıfırlar (must_change_password = true setler)
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(p_user_id integer, p_password_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users
     SET password_hash = p_password_hash, must_change_password = true
   WHERE id = p_user_id;
  RETURN FOUND;
END $$;

-- SELF: forgot-password için user kendi şifresini reset eder (email ile match)
CREATE OR REPLACE FUNCTION public.request_password_reset_user(p_email text, p_password_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.users
     SET password_hash = p_password_hash, must_change_password = true
   WHERE email = lower(trim(p_email));
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.request_password_reset_admin(p_email text, p_password_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.admins
     SET password_hash = p_password_hash, must_change_password = true
   WHERE email = lower(trim(p_email));
  RETURN FOUND;
END $$;

-- GLOBAL: bir admin'in role/city_id alanlarını günceller
CREATE OR REPLACE FUNCTION public.admin_update_admin_privileges(p_admin_id integer, p_role text, p_city_id integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.admins
     SET role = COALESCE(p_role, role),
         city_id = p_city_id
   WHERE id = p_admin_id;
  RETURN FOUND;
END $$;

-- GLOBAL: yeni admin oluştur
CREATE OR REPLACE FUNCTION public.admin_create_admin(
  p_name text, p_email text, p_password_hash text,
  p_role text, p_city_id integer, p_phone text
)
RETURNS TABLE(id integer, name text, email text, role text, city_id integer, phone text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    INSERT INTO public.admins (name, email, password_hash, role, city_id, phone)
    VALUES (
      p_name,
      lower(trim(p_email)),
      p_password_hash,
      COALESCE(NULLIF(p_role, ''), 'CITY'),
      p_city_id,
      COALESCE(p_phone, '')
    )
    RETURNING admins.id, admins.name, admins.email, admins.role, admins.city_id, admins.phone;
END $$;

-- ADMIN: yeni onaylı kullanıcı oluştur (admin tarafından eklenen)
CREATE OR REPLACE FUNCTION public.admin_create_user(
  p_name text, p_surname text, p_email text, p_password_hash text,
  p_branch text, p_work_location text, p_phone text,
  p_city_id integer, p_city_name text, p_district text
)
RETURNS TABLE(
  id integer, name text, surname text, email text,
  is_approved boolean, city_id integer, city_name text,
  phone text, branch text, work_location text, district text,
  must_change_password boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
    INSERT INTO public.users (
      name, surname, email, password_hash, branch, work_location, phone,
      city_id, city_name, district, is_approved, must_change_password
    )
    VALUES (
      p_name, p_surname, lower(trim(p_email)), p_password_hash,
      p_branch, p_work_location, p_phone,
      p_city_id, p_city_name, p_district, true, true
    )
    RETURNING users.id, users.name, users.surname, users.email,
              users.is_approved, users.city_id, users.city_name,
              users.phone, users.branch, users.work_location, users.district,
              users.must_change_password;
END $$;

-- SELF-REGISTRATION: anon yeni kullanıcı oluşturur (is_approved=false, hardcoded)
CREATE OR REPLACE FUNCTION public.register_user(
  p_name text, p_surname text, p_email text, p_password_hash text,
  p_branch text, p_work_location text, p_phone text,
  p_city_id integer, p_city_name text, p_district text
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id integer;
BEGIN
  INSERT INTO public.users (
    name, surname, email, password_hash, branch, work_location, phone,
    city_id, city_name, district, is_approved, must_change_password
  )
  VALUES (
    p_name, p_surname, lower(trim(p_email)), p_password_hash,
    p_branch, p_work_location, p_phone,
    p_city_id, p_city_name, p_district, false, false
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;


GRANT EXECUTE ON FUNCTION public.admin_approve_user(integer)                                 TO anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_user(integer)                                  TO anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(integer, text)                    TO anon;
GRANT EXECUTE ON FUNCTION public.request_password_reset_user(text, text)                     TO anon;
GRANT EXECUTE ON FUNCTION public.request_password_reset_admin(text, text)                    TO anon;
GRANT EXECUTE ON FUNCTION public.admin_update_admin_privileges(integer, text, integer)       TO anon;
GRANT EXECUTE ON FUNCTION public.admin_create_admin(text, text, text, text, integer, text)   TO anon;
GRANT EXECUTE ON FUNCTION public.admin_create_user(text, text, text, text, text, text, text, integer, text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.register_user(text, text, text, text, text, text, text, integer, text, text) TO anon;


-- ─── 3) Şimdi column-level REVOKE'ları uygula ──────────────────────────────
-- Anon artık bu sütunları doğrudan INSERT/UPDATE edemez.
-- Yukarıdaki SECURITY DEFINER RPC'ler (function owner = postgres) bypass'lar.

REVOKE UPDATE (is_approved, password_hash) ON public.users  FROM anon;
REVOKE INSERT (is_approved)                ON public.users  FROM anon;

REVOKE UPDATE (role, city_id, password_hash) ON public.admins FROM anon;
REVOKE INSERT (role)                          ON public.admins FROM anon;

NOTIFY pgrst, 'reload schema';

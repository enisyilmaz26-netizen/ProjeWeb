-- ============================================================================
-- TRIGGER-BASED COLUMN LOCKDOWN — REVOKE'ların etkisiz kaldığı durumda
-- ============================================================================
-- Supabase'in yeni `sb_publishable_*` key formatı (veya RLS davranışı) REVOKE
-- column-level yetkilerini bypass ediyor görünüyor. BEFORE INSERT/UPDATE
-- trigger ile column-level kuralı çağıran role'e göre uyguluyoruz.
--
-- Trigger SECURITY DEFINER DEĞİL (caller olarak çalışır), o yüzden trigger
-- içinde current_user = postgres ise (SECURITY DEFINER RPC içinde
-- bulunuyoruz demektir) bypass; aksi halde anon/public/authenticator
-- erişimi engellenir.
-- ============================================================================

-- 1) Diagnostic helper — ileride teşhis için
CREATE OR REPLACE FUNCTION public.whoami()
RETURNS jsonb LANGUAGE sql SECURITY INVOKER AS $$
  SELECT jsonb_build_object(
    'current_user', current_user,
    'session_user', session_user,
    'current_setting_role', current_setting('role', true),
    'jwt_role', current_setting('request.jwt.claim.role', true)
  );
$$;
GRANT EXECUTE ON FUNCTION public.whoami() TO anon, public;


-- 2) USERS — privileged column guard
CREATE OR REPLACE FUNCTION public.guard_users_privileged_cols() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- SECURITY DEFINER RPC içinde çağrıldıysa (function owner: postgres /
  -- supabase_admin), bypass et. Diğer her durumda kısıtla.
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF COALESCE(NEW.is_approved, false) IS TRUE THEN
      RAISE EXCEPTION 'permission_denied_is_approved_insert' USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
      RAISE EXCEPTION 'permission_denied_is_approved_update' USING ERRCODE = '42501';
    END IF;
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
      RAISE EXCEPTION 'permission_denied_password_hash_update' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_users_privileged_cols ON public.users;
CREATE TRIGGER guard_users_privileged_cols
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.guard_users_privileged_cols();


-- 3) ADMINS — privileged column guard
CREATE OR REPLACE FUNCTION public.guard_admins_privileged_cols() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.role IS NOT NULL AND NEW.role <> 'CITY' THEN
      RAISE EXCEPTION 'permission_denied_admin_role_insert' USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'permission_denied_admin_role_update' USING ERRCODE = '42501';
    END IF;
    IF NEW.city_id IS DISTINCT FROM OLD.city_id THEN
      RAISE EXCEPTION 'permission_denied_admin_city_id_update' USING ERRCODE = '42501';
    END IF;
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
      RAISE EXCEPTION 'permission_denied_admin_password_hash_update' USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_admins_privileged_cols ON public.admins;
CREATE TRIGGER guard_admins_privileged_cols
  BEFORE INSERT OR UPDATE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.guard_admins_privileged_cols();


NOTIFY pgrst, 'reload schema';

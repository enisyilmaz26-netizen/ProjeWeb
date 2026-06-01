-- ============================================================================
-- TRIGGER LOGIC FIX — bypass kontrolünü tersine çevir
-- ============================================================================
-- Önceki versiyon `current_user IN ('postgres','supabase_admin')` bypass ediyordu.
-- Ama bazı RPC fonksiyonlarının owner'ı bu iki rol değil (Supabase bazen başka
-- internal rol kullanıyor), bu yüzden SECURITY DEFINER çağrılarında trigger
-- yanlışlıkla tetiklenip legitimate password change/admin işlemlerini engelliyor.
--
-- Doğru yaklaşım: sadece anon/authenticated (PostgREST REST-API rolleri) blok et.
-- Diğer her şey (postgres, supabase_admin, service_role, function owner — ne
-- olursa olsun) bypass. Bu, SECURITY DEFINER call'larını owner'dan bağımsız
-- olarak doğru tanır.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_users_privileged_cols() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
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

CREATE OR REPLACE FUNCTION public.guard_admins_privileged_cols() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
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

CREATE OR REPLACE FUNCTION public.guard_appointment_status_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_valid boolean;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_valid := CASE OLD.status
      WHEN 'PENDING'                THEN NEW.status IN ('APPROVED', 'CANCELLED', 'CANCELLATION_REQUESTED')
      WHEN 'APPROVED'               THEN NEW.status IN ('COMPLETED', 'CANCELLED', 'CANCELLATION_REQUESTED', 'PENDING')
      WHEN 'CANCELLATION_REQUESTED' THEN NEW.status IN ('APPROVED', 'CANCELLED')
      WHEN 'CANCELLED'              THEN false
      WHEN 'COMPLETED'              THEN false
      ELSE false
    END;
    IF NOT v_valid THEN
      RAISE EXCEPTION 'invalid_status_transition_% _to_%', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.guard_anon_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'permission_denied_direct_delete' USING ERRCODE = '42501';
END $$;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- STATUS STATE-MACHINE + DELETE LOCKDOWN
-- ============================================================================
-- 1) appointments.status için server-side state machine doğrulama:
--    geçersiz geçişler (örn. CANCELLED → APPROVED, COMPLETED → PENDING) bloklanır.
-- 2) closed_days / laboratories / city_time_slots / workshops için anon DELETE
--    engellenir; legitimate DELETE'ler SECURITY DEFINER RPC üzerinden.
-- Tüm trigger'lar `current_user IN ('postgres','supabase_admin')` ile bypass —
-- yani RPC'ler güvenli, anon direct yazımlar bloklanır.
-- ============================================================================

-- ─── 1) APPOINTMENTS — status state machine ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_appointment_status_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v_valid boolean;
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    v_valid := CASE OLD.status
      WHEN 'PENDING'                THEN NEW.status IN ('APPROVED', 'CANCELLED', 'CANCELLATION_REQUESTED')
      WHEN 'APPROVED'               THEN NEW.status IN ('COMPLETED', 'CANCELLED', 'CANCELLATION_REQUESTED', 'PENDING')
      WHEN 'CANCELLATION_REQUESTED' THEN NEW.status IN ('APPROVED', 'CANCELLED')
      WHEN 'CANCELLED'              THEN false  -- terminal
      WHEN 'COMPLETED'              THEN false  -- terminal
      ELSE false
    END;
    IF NOT v_valid THEN
      RAISE EXCEPTION 'invalid_status_transition_% _to_%', OLD.status, NEW.status USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_appointment_status_transition ON public.appointments;
CREATE TRIGGER guard_appointment_status_transition
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.guard_appointment_status_transition();


-- ─── 2) Generic anon DELETE blocker ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_anon_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'permission_denied_direct_delete' USING ERRCODE = '42501';
END $$;

DROP TRIGGER IF EXISTS guard_delete_closed_days ON public.closed_days;
CREATE TRIGGER guard_delete_closed_days
  BEFORE DELETE ON public.closed_days FOR EACH ROW EXECUTE FUNCTION public.guard_anon_delete();

DROP TRIGGER IF EXISTS guard_delete_laboratories ON public.laboratories;
CREATE TRIGGER guard_delete_laboratories
  BEFORE DELETE ON public.laboratories FOR EACH ROW EXECUTE FUNCTION public.guard_anon_delete();

DROP TRIGGER IF EXISTS guard_delete_city_time_slots ON public.city_time_slots;
CREATE TRIGGER guard_delete_city_time_slots
  BEFORE DELETE ON public.city_time_slots FOR EACH ROW EXECUTE FUNCTION public.guard_anon_delete();

DROP TRIGGER IF EXISTS guard_delete_workshops ON public.workshops;
CREATE TRIGGER guard_delete_workshops
  BEFORE DELETE ON public.workshops FOR EACH ROW EXECUTE FUNCTION public.guard_anon_delete();


-- ─── 3) DELETE RPC'leri (SECURITY DEFINER → trigger bypass) ────────────────

CREATE OR REPLACE FUNCTION public.admin_delete_lab(p_id integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.laboratories WHERE id = p_id;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_workshop(p_id bigint)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.workshops WHERE id = p_id;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_closed_day(p_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.closed_days WHERE id = p_id;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_time_slot(p_id integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.city_time_slots WHERE id = p_id;
  RETURN FOUND;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_delete_lab(integer)       TO anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_workshop(bigint)   TO anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_closed_day(uuid)   TO anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_time_slot(integer) TO anon;

NOTIFY pgrst, 'reload schema';

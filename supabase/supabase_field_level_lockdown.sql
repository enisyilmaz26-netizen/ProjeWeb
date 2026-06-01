-- ============================================================================
-- FIELD-LEVEL UPDATE LOCKDOWN — notifications + appointments
-- ============================================================================
-- Önceki migration'lar status transition ve column-level INSERT'i kısıtladı,
-- ama anon hâlâ:
--   - notifications.title/message/type/timestamp direkt UPDATE edebiliyor
--     (read-state hariç hassas alanlar)
--   - appointments.date/time_slot/lab_id/user_* alanlarını direkt UPDATE
--     edebiliyor (status hariç tüm payload)
-- Bu migration BEFORE UPDATE trigger'larıyla anon caller'ı sadece güvenli
-- alanlarla sınırlar. SECURITY DEFINER RPC'ler (privileged path) bypass eder.
-- Yeni reschedule_appointment RPC ile anon legitimate yeniden planlama yapar.
-- ============================================================================

-- ─── 1) notifications: anon UPDATE sadece is_read değiştirebilir ─────────────
CREATE OR REPLACE FUNCTION public.guard_notifications_anon_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF NEW.title     IS DISTINCT FROM OLD.title
     OR NEW.message  IS DISTINCT FROM OLD.message
     OR NEW.type     IS DISTINCT FROM OLD.type
     OR NEW.timestamp IS DISTINCT FROM OLD.timestamp THEN
    RAISE EXCEPTION 'permission_denied_notifications_field_update' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_notifications_update ON public.notifications;
CREATE TRIGGER guard_notifications_update
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notifications_anon_update();


-- ─── 2) appointments: anon UPDATE sadece status ve note değiştirebilir ──────
-- Reschedule (date/time_slot değişimi) reschedule_appointment RPC üzerinden.
CREATE OR REPLACE FUNCTION public.guard_appointments_anon_field_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF NEW.date            IS DISTINCT FROM OLD.date
     OR NEW.time_slot      IS DISTINCT FROM OLD.time_slot
     OR NEW.lab_id         IS DISTINCT FROM OLD.lab_id
     OR NEW.lab_name       IS DISTINCT FROM OLD.lab_name
     OR NEW.city_id        IS DISTINCT FROM OLD.city_id
     OR NEW.city_name      IS DISTINCT FROM OLD.city_name
     OR NEW.user_email     IS DISTINCT FROM OLD.user_email
     OR NEW.user_name      IS DISTINCT FROM OLD.user_name
     OR NEW.user_surname   IS DISTINCT FROM OLD.user_surname
     OR NEW.user_phone     IS DISTINCT FROM OLD.user_phone
     OR NEW.user_branch    IS DISTINCT FROM OLD.user_branch
     OR NEW.user_work_location IS DISTINCT FROM OLD.user_work_location
     OR NEW.user_city      IS DISTINCT FROM OLD.user_city
     OR NEW.user_district  IS DISTINCT FROM OLD.user_district
     OR NEW.created_timestamp IS DISTINCT FROM OLD.created_timestamp THEN
    RAISE EXCEPTION 'permission_denied_appointments_field_update' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS guard_appointments_field_update ON public.appointments;
CREATE TRIGGER guard_appointments_field_update
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.guard_appointments_anon_field_update();


-- ─── 3) reschedule_appointment — token-aware, sadece owner veya yetkili admin ─
DROP FUNCTION IF EXISTS public.reschedule_appointment(uuid, integer, text, text);
CREATE FUNCTION public.reschedule_appointment(
  p_session_token uuid,
  p_appt_id integer,
  p_new_date text,
  p_new_time_slot text
)
RETURNS TABLE(id integer, status text, date text, time_slot text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id integer;
  v_admin_id integer;
  v_appt record;
  v_admin record;
  v_max_capacity integer;
  v_current_count bigint;
  v_new_status text;
BEGIN
  SELECT s.user_id, s.admin_id INTO v_user_id, v_admin_id
    FROM public.validate_session(p_session_token) s
   LIMIT 1;
  IF v_user_id IS NULL AND v_admin_id IS NULL THEN
    RAISE EXCEPTION 'err_unauthenticated';
  END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE appointments.id = p_appt_id;
  IF v_appt.id IS NULL THEN RAISE EXCEPTION 'err_appointment_not_found'; END IF;

  -- Yetki: owner (user_id session ile match) veya admin (GLOBAL ya da appt'in şehri)
  IF v_user_id IS NOT NULL THEN
    -- session user'ın email'iyle appt.user_email karşılaştırılır
    PERFORM 1 FROM public.users u WHERE u.id = v_user_id AND u.email = v_appt.user_email;
    IF NOT FOUND THEN RAISE EXCEPTION 'err_not_authorized'; END IF;
  ELSE
    SELECT * INTO v_admin FROM public.admins WHERE admins.id = v_admin_id;
    IF v_admin.id IS NULL THEN RAISE EXCEPTION 'err_not_authorized'; END IF;
    IF v_admin.role <> 'GLOBAL' AND v_admin.city_id <> v_appt.city_id THEN
      RAISE EXCEPTION 'err_not_authorized';
    END IF;
  END IF;

  -- Hedef slot kapasitesi (mevcut randevu hariç)
  PERFORM pg_advisory_xact_lock(hashtext(v_appt.lab_id::text || '|' || p_new_date || '|' || p_new_time_slot));
  SELECT COALESCE(capacity_per_slot, 1) INTO v_max_capacity
    FROM public.laboratories WHERE laboratories.id = v_appt.lab_id;
  SELECT COUNT(*) INTO v_current_count
    FROM public.appointments
   WHERE lab_id = v_appt.lab_id
     AND date = p_new_date
     AND time_slot = p_new_time_slot
     AND status IN ('PENDING', 'APPROVED')
     AND appointments.id <> p_appt_id;
  IF v_current_count >= v_max_capacity THEN RAISE EXCEPTION 'err_slot_full'; END IF;

  -- APPROVED → PENDING (re-approval gerekli); PENDING aynı kalır
  v_new_status := CASE WHEN v_appt.status = 'APPROVED' THEN 'PENDING' ELSE v_appt.status END;

  UPDATE public.appointments
     SET date = p_new_date,
         time_slot = p_new_time_slot,
         status = v_new_status
   WHERE appointments.id = p_appt_id;

  RETURN QUERY SELECT p_appt_id, v_new_status, p_new_date, p_new_time_slot;
END $$;

GRANT EXECUTE ON FUNCTION public.reschedule_appointment(uuid, integer, text, text) TO anon;

NOTIFY pgrst, 'reload schema';

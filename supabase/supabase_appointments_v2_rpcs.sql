-- ============================================================================
-- APPOINTMENTS STATUS LOCKDOWN — token-aware RPC'ler + trigger kapatma
-- ============================================================================
-- Önceki field-level lockdown (supabase_field_level_lockdown.sql) anon'u
-- date/time_slot/lab_id/user_* alanlarını değiştirmekten engelliyor ama
-- status ve note hâlâ açık. Bir saldırgan anon key + REST API ile
--   UPDATE appointments SET status='CANCELLED' WHERE id=<X>
-- çağırarak başka bir kullanıcının randevusunu iptal edebiliyor.
--
-- Çözüm: Trigger'ı sıkılaştır → anon HİÇBİR alanı UPDATE edemez (status + note
-- dahil). Tüm meşru status değişimleri SECURITY DEFINER token-aware RPC
-- üzerinden yapılır. RPC sahibi (postgres) trigger'ı bypass eder.
--
-- Eklenen RPC'ler:
--   - cancel_own_appointment_v2          (user, PENDING → CANCELLED)
--   - submit_cancellation_request_v2     (user, APPROVED → CANCELLATION_REQUESTED + note)
--   - approve_appointment_v2             (admin, PENDING/CANCELLATION_REQUESTED → APPROVED + optional reschedule)
--   - cancel_appointment_admin_v2        (admin, PENDING/APPROVED/CANCELLATION_REQUESTED → CANCELLED)
--   - deny_cancellation_request_v2       (admin, CANCELLATION_REQUESTED → APPROVED)
--   - mark_appointment_completed_v2      (admin, APPROVED → COMPLETED)
--   - cancel_user_active_appointments_v2 (admin, bulk cancel during user revoke)
--
-- reschedule_appointment zaten v2 idi (supabase_field_level_lockdown.sql).
-- ============================================================================

-- ─── 1) Trigger'ı sıkılaştır: anon HİÇBİR şeyi UPDATE edemez ────────────────
CREATE OR REPLACE FUNCTION public.guard_appointments_anon_field_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  -- Anon caller hiçbir alanı değiştiremez. Tüm meşru güncellemeler
  -- SECURITY DEFINER RPC'leri üzerinden yapılır.
  RAISE EXCEPTION 'permission_denied_appointments_direct_update' USING ERRCODE = '42501';
END $$;
-- Trigger zaten field_level_lockdown'da DROP+CREATE edilmiş, fonksiyonu
-- REPLACE etmek yeterli; bağlı trigger güncel mantığı kullanacak.


-- ─── Yardımcı: oturumdan user/admin id'sini al ───────────────────────────────
-- validate_session(uuid) RETURNS TABLE(user_id int, admin_id int) — mevcut.

-- ─── Yardımcı: admin yetki kontrolü (GLOBAL veya appt'in şehri) ──────────────
-- Inline kullanılacak.


-- ─── 2) cancel_own_appointment_v2 ──────────────────────────────────────────
DROP FUNCTION IF EXISTS public.cancel_own_appointment_v2(uuid, integer);
CREATE FUNCTION public.cancel_own_appointment_v2(
  p_session_token uuid,
  p_appt_id integer
)
RETURNS TABLE(id integer, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id integer;
  v_admin_id integer;
  v_appt record;
BEGIN
  SELECT s.user_id, s.admin_id INTO v_user_id, v_admin_id
    FROM public.validate_session(p_session_token) s LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'err_unauthenticated'; END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE appointments.id = p_appt_id;
  IF v_appt.id IS NULL THEN RAISE EXCEPTION 'err_appointment_not_found'; END IF;

  -- Ownership: session user'ın email'i appt.user_email ile eşleşmeli
  PERFORM 1 FROM public.users u WHERE u.id = v_user_id AND u.email = v_appt.user_email;
  IF NOT FOUND THEN RAISE EXCEPTION 'err_not_authorized'; END IF;

  IF v_appt.status <> 'PENDING' THEN RAISE EXCEPTION 'err_invalid_state'; END IF;

  UPDATE public.appointments SET status = 'CANCELLED' WHERE appointments.id = p_appt_id;
  RETURN QUERY SELECT p_appt_id, 'CANCELLED'::text;
END $$;
GRANT EXECUTE ON FUNCTION public.cancel_own_appointment_v2(uuid, integer) TO anon;


-- ─── 3) submit_cancellation_request_v2 ─────────────────────────────────────
DROP FUNCTION IF EXISTS public.submit_cancellation_request_v2(uuid, integer, text);
CREATE FUNCTION public.submit_cancellation_request_v2(
  p_session_token uuid,
  p_appt_id integer,
  p_note text
)
RETURNS TABLE(id integer, status text, note text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id integer;
  v_admin_id integer;
  v_appt record;
  v_note text;
BEGIN
  SELECT s.user_id, s.admin_id INTO v_user_id, v_admin_id
    FROM public.validate_session(p_session_token) s LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'err_unauthenticated'; END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE appointments.id = p_appt_id;
  IF v_appt.id IS NULL THEN RAISE EXCEPTION 'err_appointment_not_found'; END IF;

  PERFORM 1 FROM public.users u WHERE u.id = v_user_id AND u.email = v_appt.user_email;
  IF NOT FOUND THEN RAISE EXCEPTION 'err_not_authorized'; END IF;

  IF v_appt.status <> 'APPROVED' THEN RAISE EXCEPTION 'err_invalid_state'; END IF;

  v_note := COALESCE(NULLIF(TRIM(p_note), ''), '');

  UPDATE public.appointments
     SET status = 'CANCELLATION_REQUESTED', note = v_note
   WHERE appointments.id = p_appt_id;
  RETURN QUERY SELECT p_appt_id, 'CANCELLATION_REQUESTED'::text, v_note;
END $$;
GRANT EXECUTE ON FUNCTION public.submit_cancellation_request_v2(uuid, integer, text) TO anon;


-- ─── Yardımcı: admin scope check (GLOBAL veya city_id match) ────────────────
CREATE OR REPLACE FUNCTION public.assert_admin_can_manage_appt(
  p_admin_id integer, p_appt_city_id integer
) RETURNS void
LANGUAGE plpgsql AS $$
DECLARE v_admin record;
BEGIN
  SELECT * INTO v_admin FROM public.admins WHERE admins.id = p_admin_id;
  IF v_admin.id IS NULL THEN RAISE EXCEPTION 'err_not_authorized'; END IF;
  IF v_admin.role <> 'GLOBAL' AND v_admin.city_id <> p_appt_city_id THEN
    RAISE EXCEPTION 'err_not_authorized';
  END IF;
END $$;


-- ─── 4) approve_appointment_v2 (opsiyonel reschedule ile) ───────────────────
DROP FUNCTION IF EXISTS public.approve_appointment_v2(uuid, integer, text, text);
CREATE FUNCTION public.approve_appointment_v2(
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
  v_max_capacity integer;
  v_current_count bigint;
  v_final_date text;
  v_final_slot text;
BEGIN
  SELECT s.user_id, s.admin_id INTO v_user_id, v_admin_id
    FROM public.validate_session(p_session_token) s LIMIT 1;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'err_not_authorized'; END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE appointments.id = p_appt_id;
  IF v_appt.id IS NULL THEN RAISE EXCEPTION 'err_appointment_not_found'; END IF;

  PERFORM public.assert_admin_can_manage_appt(v_admin_id, v_appt.city_id);

  IF v_appt.status NOT IN ('PENDING', 'CANCELLATION_REQUESTED') THEN
    RAISE EXCEPTION 'err_invalid_state';
  END IF;

  v_final_date := COALESCE(NULLIF(TRIM(p_new_date), ''), v_appt.date);
  v_final_slot := COALESCE(NULLIF(TRIM(p_new_time_slot), ''), v_appt.time_slot);

  -- Tarih/slot değişiyorsa kapasite kontrolü
  IF v_final_date <> v_appt.date OR v_final_slot <> v_appt.time_slot THEN
    PERFORM pg_advisory_xact_lock(hashtext(v_appt.lab_id::text || '|' || v_final_date || '|' || v_final_slot));
    SELECT COALESCE(capacity_per_slot, 1) INTO v_max_capacity
      FROM public.laboratories WHERE laboratories.id = v_appt.lab_id;
    SELECT COUNT(*) INTO v_current_count
      FROM public.appointments
     WHERE lab_id = v_appt.lab_id
       AND date = v_final_date
       AND time_slot = v_final_slot
       AND status IN ('PENDING', 'APPROVED')
       AND appointments.id <> p_appt_id;
    IF v_current_count >= v_max_capacity THEN RAISE EXCEPTION 'err_slot_full'; END IF;
  END IF;

  UPDATE public.appointments
     SET status = 'APPROVED', date = v_final_date, time_slot = v_final_slot
   WHERE appointments.id = p_appt_id;
  RETURN QUERY SELECT p_appt_id, 'APPROVED'::text, v_final_date, v_final_slot;
END $$;
GRANT EXECUTE ON FUNCTION public.approve_appointment_v2(uuid, integer, text, text) TO anon;


-- ─── 5) cancel_appointment_admin_v2 ────────────────────────────────────────
DROP FUNCTION IF EXISTS public.cancel_appointment_admin_v2(uuid, integer);
CREATE FUNCTION public.cancel_appointment_admin_v2(
  p_session_token uuid,
  p_appt_id integer
)
RETURNS TABLE(id integer, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id integer;
  v_admin_id integer;
  v_appt record;
BEGIN
  SELECT s.user_id, s.admin_id INTO v_user_id, v_admin_id
    FROM public.validate_session(p_session_token) s LIMIT 1;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'err_not_authorized'; END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE appointments.id = p_appt_id;
  IF v_appt.id IS NULL THEN RAISE EXCEPTION 'err_appointment_not_found'; END IF;

  PERFORM public.assert_admin_can_manage_appt(v_admin_id, v_appt.city_id);

  IF v_appt.status NOT IN ('PENDING', 'APPROVED', 'CANCELLATION_REQUESTED') THEN
    RAISE EXCEPTION 'err_invalid_state';
  END IF;

  UPDATE public.appointments SET status = 'CANCELLED' WHERE appointments.id = p_appt_id;
  RETURN QUERY SELECT p_appt_id, 'CANCELLED'::text;
END $$;
GRANT EXECUTE ON FUNCTION public.cancel_appointment_admin_v2(uuid, integer) TO anon;


-- ─── 6) deny_cancellation_request_v2 ───────────────────────────────────────
DROP FUNCTION IF EXISTS public.deny_cancellation_request_v2(uuid, integer);
CREATE FUNCTION public.deny_cancellation_request_v2(
  p_session_token uuid,
  p_appt_id integer
)
RETURNS TABLE(id integer, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id integer;
  v_admin_id integer;
  v_appt record;
BEGIN
  SELECT s.user_id, s.admin_id INTO v_user_id, v_admin_id
    FROM public.validate_session(p_session_token) s LIMIT 1;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'err_not_authorized'; END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE appointments.id = p_appt_id;
  IF v_appt.id IS NULL THEN RAISE EXCEPTION 'err_appointment_not_found'; END IF;

  PERFORM public.assert_admin_can_manage_appt(v_admin_id, v_appt.city_id);

  IF v_appt.status <> 'CANCELLATION_REQUESTED' THEN RAISE EXCEPTION 'err_invalid_state'; END IF;

  UPDATE public.appointments SET status = 'APPROVED' WHERE appointments.id = p_appt_id;
  RETURN QUERY SELECT p_appt_id, 'APPROVED'::text;
END $$;
GRANT EXECUTE ON FUNCTION public.deny_cancellation_request_v2(uuid, integer) TO anon;


-- ─── 7) mark_appointment_completed_v2 ──────────────────────────────────────
DROP FUNCTION IF EXISTS public.mark_appointment_completed_v2(uuid, integer);
CREATE FUNCTION public.mark_appointment_completed_v2(
  p_session_token uuid,
  p_appt_id integer
)
RETURNS TABLE(id integer, status text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id integer;
  v_admin_id integer;
  v_appt record;
BEGIN
  SELECT s.user_id, s.admin_id INTO v_user_id, v_admin_id
    FROM public.validate_session(p_session_token) s LIMIT 1;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'err_not_authorized'; END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE appointments.id = p_appt_id;
  IF v_appt.id IS NULL THEN RAISE EXCEPTION 'err_appointment_not_found'; END IF;

  PERFORM public.assert_admin_can_manage_appt(v_admin_id, v_appt.city_id);

  IF v_appt.status <> 'APPROVED' THEN RAISE EXCEPTION 'err_invalid_state'; END IF;

  UPDATE public.appointments SET status = 'COMPLETED' WHERE appointments.id = p_appt_id;
  RETURN QUERY SELECT p_appt_id, 'COMPLETED'::text;
END $$;
GRANT EXECUTE ON FUNCTION public.mark_appointment_completed_v2(uuid, integer) TO anon;


-- ─── 8) cancel_user_active_appointments_v2 (revoke user'da bulk cancel) ─────
DROP FUNCTION IF EXISTS public.cancel_user_active_appointments_v2(uuid, integer);
CREATE FUNCTION public.cancel_user_active_appointments_v2(
  p_session_token uuid,
  p_user_id integer
)
RETURNS TABLE(cancelled_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id integer;
  v_admin_id integer;
  v_admin record;
  v_target_email text;
  v_target_city_id integer;
  v_count integer;
BEGIN
  SELECT s.user_id, s.admin_id INTO v_user_id, v_admin_id
    FROM public.validate_session(p_session_token) s LIMIT 1;
  IF v_admin_id IS NULL THEN RAISE EXCEPTION 'err_not_authorized'; END IF;

  SELECT email, city_id INTO v_target_email, v_target_city_id
    FROM public.users WHERE users.id = p_user_id;
  IF v_target_email IS NULL THEN RAISE EXCEPTION 'err_user_not_found'; END IF;

  SELECT * INTO v_admin FROM public.admins WHERE admins.id = v_admin_id;
  IF v_admin.role <> 'GLOBAL' AND v_admin.city_id <> v_target_city_id THEN
    RAISE EXCEPTION 'err_not_authorized';
  END IF;

  WITH upd AS (
    UPDATE public.appointments
       SET status = 'CANCELLED'
     WHERE user_email = v_target_email
       AND status IN ('PENDING', 'APPROVED', 'CANCELLATION_REQUESTED')
    RETURNING 1
  )
  SELECT COUNT(*)::int INTO v_count FROM upd;

  RETURN QUERY SELECT v_count;
END $$;
GRANT EXECUTE ON FUNCTION public.cancel_user_active_appointments_v2(uuid, integer) TO anon;


NOTIFY pgrst, 'reload schema';

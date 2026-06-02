-- ============================================================================
-- HOTFIX — submit_appointment_v2 + reschedule_appointment "ambiguous column" fix
-- ============================================================================
-- RETURNS TABLE(... status text ...) ile WHERE status IN (...) çakışıyor;
-- PostgreSQL output column adını gövdedeki kolonla aynı görüp ambiguity hatası
-- veriyor (42702). Tüm appointments tablo referanslarını `a` alias ile prefix'le.
-- Diğer mantık aynı; sadece COUNT sorgusu ve INSERT/UPDATE bütününde alias kullanıldı.
-- ============================================================================

DROP FUNCTION IF EXISTS public.submit_appointment_v2(uuid, integer, text, integer, text, text, text, text);
CREATE FUNCTION public.submit_appointment_v2(
  p_session_token uuid,
  p_lab_id integer,
  p_lab_name text,
  p_city_id integer,
  p_city_name text,
  p_date text,
  p_time_slot text,
  p_note text DEFAULT ''
)
RETURNS TABLE(id integer, status text, created_timestamp bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_session_user_id integer;
  v_session_admin_id integer;
  v_lab_city_id integer;
  v_max_capacity integer;
  v_current_count bigint;
  v_appt_id integer;
  v_ts bigint;
  v_user record;
BEGIN
  SELECT s.user_id, s.admin_id INTO v_session_user_id, v_session_admin_id
    FROM public.validate_session(p_session_token) s
   LIMIT 1;
  IF v_session_user_id IS NULL THEN
    RAISE EXCEPTION 'err_unauthenticated';
  END IF;

  SELECT u.* INTO v_user FROM public.users u WHERE u.id = v_session_user_id;
  IF v_user.id IS NULL THEN
    RAISE EXCEPTION 'err_user_not_found';
  END IF;
  IF NOT v_user.is_approved THEN
    RAISE EXCEPTION 'err_not_approved';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(p_lab_id::text || '|' || p_date || '|' || p_time_slot)
  );

  SELECT l.city_id, COALESCE(l.capacity_per_slot, 1)
    INTO v_lab_city_id, v_max_capacity
    FROM public.laboratories l
   WHERE l.id = p_lab_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'err_lab_not_found'; END IF;
  IF v_lab_city_id <> p_city_id THEN RAISE EXCEPTION 'err_lab_city_mismatch'; END IF;

  SELECT COUNT(*) INTO v_current_count
    FROM public.appointments a
   WHERE a.lab_id = p_lab_id AND a.date = p_date AND a.time_slot = p_time_slot
     AND a.status IN ('PENDING', 'APPROVED', 'CANCELLATION_REQUESTED');
  IF v_current_count >= v_max_capacity THEN RAISE EXCEPTION 'err_slot_full'; END IF;

  v_ts := EXTRACT(EPOCH FROM now())::bigint * 1000;

  BEGIN
    INSERT INTO public.appointments (
      lab_id, lab_name, city_id, city_name, date, time_slot,
      user_name, user_surname, user_branch, user_work_location,
      user_phone, user_email, user_city, user_district, note,
      status, created_timestamp
    ) VALUES (
      p_lab_id, p_lab_name, p_city_id, p_city_name, p_date, p_time_slot,
      v_user.name, v_user.surname, v_user.branch, v_user.work_location,
      v_user.phone, v_user.email, v_user.city_name, v_user.district, COALESCE(p_note, ''),
      'PENDING', v_ts
    )
    RETURNING appointments.id INTO v_appt_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'err_duplicate_appointment';
  END;

  INSERT INTO public.notifications (title, message, type, timestamp, is_read)
  VALUES (
    '[' || p_city_name || '] Yeni Randevu Başvurusu',
    v_user.name || ' ' || v_user.surname || ', ' || p_lab_name ||
      ' için ' || p_date || ' tarihli randevu başvurusu yaptı.',
    'APPOINTMENT', v_ts, false
  );

  RETURN QUERY SELECT v_appt_id, 'PENDING'::text, v_ts;
END $$;

GRANT EXECUTE ON FUNCTION public.submit_appointment_v2(uuid, integer, text, integer, text, text, text, text) TO anon;


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

  SELECT a.* INTO v_appt FROM public.appointments a WHERE a.id = p_appt_id;
  IF v_appt.id IS NULL THEN RAISE EXCEPTION 'err_appointment_not_found'; END IF;

  IF v_user_id IS NOT NULL THEN
    PERFORM 1 FROM public.users u WHERE u.id = v_user_id AND u.email = v_appt.user_email;
    IF NOT FOUND THEN RAISE EXCEPTION 'err_not_authorized'; END IF;
  ELSE
    SELECT * INTO v_admin FROM public.admins WHERE admins.id = v_admin_id;
    IF v_admin.id IS NULL THEN RAISE EXCEPTION 'err_not_authorized'; END IF;
    IF v_admin.role <> 'GLOBAL' AND v_admin.city_id <> v_appt.city_id THEN
      RAISE EXCEPTION 'err_not_authorized';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(v_appt.lab_id::text || '|' || p_new_date || '|' || p_new_time_slot));
  SELECT COALESCE(l.capacity_per_slot, 1) INTO v_max_capacity
    FROM public.laboratories l WHERE l.id = v_appt.lab_id;
  SELECT COUNT(*) INTO v_current_count
    FROM public.appointments a
   WHERE a.lab_id = v_appt.lab_id
     AND a.date = p_new_date
     AND a.time_slot = p_new_time_slot
     AND a.status IN ('PENDING', 'APPROVED')
     AND a.id <> p_appt_id;
  IF v_current_count >= v_max_capacity THEN RAISE EXCEPTION 'err_slot_full'; END IF;

  v_new_status := CASE WHEN v_appt.status = 'APPROVED' THEN 'PENDING' ELSE v_appt.status END;

  UPDATE public.appointments a
     SET date = p_new_date,
         time_slot = p_new_time_slot,
         status = v_new_status
   WHERE a.id = p_appt_id;

  RETURN QUERY SELECT p_appt_id, v_new_status, p_new_date, p_new_time_slot;
END $$;

GRANT EXECUTE ON FUNCTION public.reschedule_appointment(uuid, integer, text, text) TO anon;

NOTIFY pgrst, 'reload schema';

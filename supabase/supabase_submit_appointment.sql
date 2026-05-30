-- Server-side appointment submission with capacity enforcement
-- Run this in Supabase SQL Editor.
-- NOTE: All ID columns are integer (not uuid).

-- Unique index to prevent duplicate active appointments
CREATE UNIQUE INDEX IF NOT EXISTS idx_appt_no_dup
ON public.appointments (user_email, lab_id, date, time_slot)
WHERE status IN ('PENDING', 'APPROVED', 'CANCELLATION_REQUESTED');

-- Drop old versions (uuid and integer signatures)
DROP FUNCTION IF EXISTS public.submit_appointment(uuid,text,uuid,text,text,text,text,text,text,text,text,text,text,text,text);
DROP FUNCTION IF EXISTS public.submit_appointment(integer,text,integer,text,text,text,text,text,text,text,text,text,text,text,text);

CREATE FUNCTION public.submit_appointment(
  p_lab_id             integer,
  p_lab_name           text,
  p_city_id            integer,
  p_city_name          text,
  p_date               text,
  p_time_slot          text,
  p_user_name          text,
  p_user_surname       text,
  p_user_branch        text,
  p_user_work_location text,
  p_user_phone         text,
  p_user_email         text,
  p_user_city          text,
  p_user_district      text,
  p_note               text DEFAULT ''
)
RETURNS TABLE(id integer, status text, created_timestamp bigint)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_lab_city_id   integer;
  v_max_capacity  integer;
  v_current_count bigint;
  v_appt_id       integer;
  v_ts            bigint;
BEGIN
  -- Serialize concurrent bookings for the same lab+date+slot to prevent race conditions
  PERFORM pg_advisory_xact_lock(
    hashtext(p_lab_id::text || '|' || p_date || '|' || p_time_slot)
  );

  SELECT city_id, COALESCE(capacity_per_slot, 1)
    INTO v_lab_city_id, v_max_capacity
  FROM public.laboratories
  WHERE id = p_lab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'err_lab_not_found';
  END IF;

  IF v_lab_city_id <> p_city_id THEN
    RAISE EXCEPTION 'err_lab_city_mismatch';
  END IF;

  SELECT COUNT(*) INTO v_current_count
  FROM public.appointments
  WHERE lab_id = p_lab_id
    AND date = p_date
    AND time_slot = p_time_slot
    AND status IN ('PENDING', 'APPROVED', 'CANCELLATION_REQUESTED');

  IF v_current_count >= v_max_capacity THEN
    RAISE EXCEPTION 'err_slot_full';
  END IF;

  v_ts := EXTRACT(EPOCH FROM now())::bigint * 1000;

  BEGIN
    INSERT INTO public.appointments (
      lab_id, lab_name, city_id, city_name, date, time_slot,
      user_name, user_surname, user_branch, user_work_location,
      user_phone, user_email, user_city, user_district, note,
      status, created_timestamp
    ) VALUES (
      p_lab_id, p_lab_name, p_city_id, p_city_name, p_date, p_time_slot,
      p_user_name, p_user_surname, p_user_branch, p_user_work_location,
      p_user_phone, p_user_email, p_user_city, p_user_district, COALESCE(p_note, ''),
      'PENDING', v_ts
    )
    RETURNING appointments.id INTO v_appt_id;
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'err_duplicate_appointment';
  END;

  INSERT INTO public.notifications (title, message, type, timestamp, is_read)
  VALUES (
    '[' || p_city_name || '] Yeni Randevu Başvurusu',
    p_user_name || ' ' || p_user_surname || ', ' || p_lab_name ||
      ' için ' || p_date || ' tarihli randevu başvurusu yaptı.',
    'APPOINTMENT',
    v_ts,
    false
  );

  RETURN QUERY SELECT v_appt_id, 'PENDING'::text, v_ts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_appointment(
  integer,text,integer,text,text,text,text,text,text,text,text,text,text,text,text
) TO anon;

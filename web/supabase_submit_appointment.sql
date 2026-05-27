-- ─────────────────────────────────────────────────────────────────────────────
-- Server-side appointment submission with authorization
-- Run this once in Supabase SQL Editor.
--
-- What this does:
--   • Partial unique index  → prevents duplicate active appointments (no race condition)
--   • submit_appointment()  → verifies lab belongs to claimed city (server-side),
--                             inserts appointment + notification atomically
-- ─────────────────────────────────────────────────────────────────────────────

-- Prevent duplicate active appointments at DB level (handles race conditions).
-- If this fails with "could not create unique index", duplicate rows exist —
-- clean them first with the query in the comment below, then re-run.
--
-- Cleanup query (only if needed):
--   DELETE FROM public.appointments a USING public.appointments b
--   WHERE a.id < b.id
--     AND a.user_email = b.user_email AND a.lab_id = b.lab_id
--     AND a.date = b.date AND a.time_slot = b.time_slot
--     AND a.status IN ('PENDING','APPROVED','CANCELLATION_REQUESTED')
--     AND b.status IN ('PENDING','APPROVED','CANCELLATION_REQUESTED');

CREATE UNIQUE INDEX IF NOT EXISTS idx_appt_no_dup
ON public.appointments (user_email, lab_id, date, time_slot)
WHERE status IN ('PENDING', 'APPROVED', 'CANCELLATION_REQUESTED');

-- ─── SUBMIT APPOINTMENT ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.submit_appointment(
  p_lab_id             uuid,
  p_lab_name           text,
  p_city_id            uuid,
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
RETURNS TABLE(id uuid, status text, created_timestamp bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lab_city_id uuid;
  v_appt_id     uuid;
  v_ts          bigint;
BEGIN
  -- Verify lab actually belongs to the claimed city (prevents cross-city booking)
  SELECT city_id INTO v_lab_city_id
  FROM public.laboratories
  WHERE laboratories.id = p_lab_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'err_lab_not_found';
  END IF;

  IF v_lab_city_id <> p_city_id THEN
    RAISE EXCEPTION 'err_lab_city_mismatch';
  END IF;

  v_ts := EXTRACT(EPOCH FROM now())::bigint * 1000;

  -- Insert appointment; unique index raises unique_violation on duplicate
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

  -- Create admin notification atomically with the insert
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
  uuid, text, uuid, text, text, text,
  text, text, text, text, text, text, text, text, text
) TO anon;

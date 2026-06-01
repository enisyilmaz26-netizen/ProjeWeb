-- ============================================================================
-- SESSION TOKENS — server-side caller identity for forgery-prone RPCs
-- ============================================================================
-- Custom auth (Supabase Auth değil) kullandığımız için PostgREST tarafında
-- session_user = "authenticator" + current_user = "anon" — yani RPC çağıran
-- gerçekte kim, sunucu bunu bilmiyor. Bu da `submit_appointment`,
-- `register_for_workshop` ve mesaj yazımı gibi RPC'lerde p_user_email /
-- p_user_id parametre olarak client'tan geliyor → forgery (başkası adına
-- işlem yapma) mümkün.
--
-- Bu migration `sessions` tablosu + 4 RPC ekler:
--   create_session, validate_session, revoke_session, prune_sessions
--
-- Login RPC'leri (login_user, login_admin) opaque bir token üretip döner.
-- Client localStorage'da saklar; her hassas RPC'de `p_session_token`
-- parametresi olarak geçirir. Hassas RPC içinde validate_session ile
-- token'in user_id/admin_id'si karşılaştırılır.
--
-- Apply order:
--   1) Bu migration → sessions tablosu + 4 yeni RPC + login RPC'leri token döner
--   2) Aşağıdaki RPC'ler (submit_appointment, register_for_workshop)
--      session token isteyen yeni signature ile yeniden yaratılır
--   3) Client yeni signature'ı kullanmaya başlar; eski signature (param yok)
--      bir süre fallback olarak kalır ama session-aware path tercih edilir.
-- ============================================================================

-- ─── 1) sessions tablosu ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sessions (
  token         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       integer     REFERENCES public.users(id)  ON DELETE CASCADE,
  admin_id      integer     REFERENCES public.admins(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_used_at  timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  CONSTRAINT sessions_subject_check CHECK (
    (user_id IS NOT NULL AND admin_id IS NULL) OR
    (user_id IS NULL     AND admin_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id  ON public.sessions (user_id)  WHERE user_id  IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_admin_id ON public.sessions (admin_id) WHERE admin_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires  ON public.sessions (expires_at);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
-- Anon hiçbir şekilde sessions tablosuna direkt erişemez. Sadece SECURITY
-- DEFINER RPC'ler üzerinden okunup yazılır.
DROP POLICY IF EXISTS "sessions_no_anon" ON public.sessions;
-- (politika tanımlamıyoruz = tüm erişim engellendi)


-- ─── 2) create_session — başarılı login sonrası SECURITY DEFINER ile çağrılır ──
DROP FUNCTION IF EXISTS public.create_session(integer, integer);
CREATE FUNCTION public.create_session(p_user_id integer, p_admin_id integer)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_token uuid;
BEGIN
  IF (p_user_id IS NULL AND p_admin_id IS NULL) OR (p_user_id IS NOT NULL AND p_admin_id IS NOT NULL) THEN
    RAISE EXCEPTION 'invalid_session_subject';
  END IF;
  -- Aynı subject için aktif eski session'ları temizle (single-device politikası).
  -- Eğer multi-device istenirse bu DELETE kaldırılabilir.
  IF p_user_id IS NOT NULL THEN
    DELETE FROM public.sessions WHERE user_id = p_user_id;
  ELSE
    DELETE FROM public.sessions WHERE admin_id = p_admin_id;
  END IF;
  INSERT INTO public.sessions (user_id, admin_id) VALUES (p_user_id, p_admin_id)
  RETURNING token INTO v_token;
  RETURN v_token;
END $$;

GRANT EXECUTE ON FUNCTION public.create_session(integer, integer) TO anon;


-- ─── 3) validate_session — token → {user_id, admin_id, role} veya null ────────
DROP FUNCTION IF EXISTS public.validate_session(uuid);
CREATE FUNCTION public.validate_session(p_token uuid)
RETURNS TABLE(user_id integer, admin_id integer, role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_token IS NULL THEN RETURN; END IF;
  -- Eski expired session'ları temizle (her validate'de hafif maintenance).
  DELETE FROM public.sessions WHERE expires_at < now();
  -- last_used_at'i güncelle ve aynı row'u dön.
  RETURN QUERY
    UPDATE public.sessions s
       SET last_used_at = now()
     WHERE s.token = p_token
       AND s.expires_at > now()
    RETURNING s.user_id, s.admin_id,
              CASE WHEN s.admin_id IS NOT NULL THEN 'ADMIN' ELSE 'USER' END;
END $$;

GRANT EXECUTE ON FUNCTION public.validate_session(uuid) TO anon;


-- ─── 4) revoke_session — logout ─────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.revoke_session(uuid);
CREATE FUNCTION public.revoke_session(p_token uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.sessions WHERE token = p_token;
  RETURN FOUND;
END $$;

GRANT EXECUTE ON FUNCTION public.revoke_session(uuid) TO anon;


-- ─── 5) prune_sessions — periyodik temizlik için ─────────────────────────────
CREATE OR REPLACE FUNCTION public.prune_sessions()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deleted integer;
BEGIN
  DELETE FROM public.sessions WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END $$;

GRANT EXECUTE ON FUNCTION public.prune_sessions() TO anon;


-- ─── 6) login_user/login_admin → token döndüren versiyon ────────────────────
-- Yeni RPC adları: login_user_with_token, login_admin_with_token.
-- Eski login_user/login_admin geriye uyum için bir süre korunur.

DROP FUNCTION IF EXISTS public.login_user_with_token(text, text);
CREATE FUNCTION public.login_user_with_token(p_email text, p_password text)
RETURNS TABLE(
  id integer, name text, surname text, email text,
  is_approved boolean, city_id integer, city_name text,
  phone text, branch text, work_location text, district text,
  session_token uuid
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_normalized text := lower(trim(p_email));
  v_allowed boolean;
  v_user record;
  v_token uuid;
BEGIN
  SELECT public.check_rate_limit(v_normalized) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'err_rate_limited';
  END IF;

  SELECT u.id, u.name, u.surname, u.email, u.is_approved,
         u.city_id, u.city_name, u.phone, u.branch, u.work_location, u.district
    INTO v_user
    FROM public.users u
   WHERE u.email = v_normalized
     AND u.password_hash LIKE '$2%'
     AND crypt(p_password, u.password_hash) = u.password_hash
   LIMIT 1;

  IF v_user.id IS NULL THEN
    PERFORM public.record_login_attempt(v_normalized, false);
    RETURN;
  END IF;

  PERFORM public.record_login_attempt(v_normalized, true);
  v_token := public.create_session(v_user.id, NULL);

  RETURN QUERY SELECT
    v_user.id, v_user.name, v_user.surname, v_user.email, v_user.is_approved,
    v_user.city_id, v_user.city_name, v_user.phone, v_user.branch, v_user.work_location, v_user.district,
    v_token;
END $$;

GRANT EXECUTE ON FUNCTION public.login_user_with_token(text, text) TO anon;


DROP FUNCTION IF EXISTS public.login_admin_with_token(text, text);
CREATE FUNCTION public.login_admin_with_token(p_email text, p_password text)
RETURNS TABLE(
  id integer, name text, email text, role text, city_id integer, phone text,
  session_token uuid
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_normalized text := lower(trim(p_email));
  v_allowed boolean;
  v_admin record;
  v_token uuid;
BEGIN
  SELECT public.check_rate_limit(v_normalized) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'err_rate_limited';
  END IF;

  SELECT a.id, a.name, a.email, a.role, a.city_id, a.phone
    INTO v_admin
    FROM public.admins a
   WHERE a.email = v_normalized
     AND a.password_hash LIKE '$2%'
     AND crypt(p_password, a.password_hash) = a.password_hash
   LIMIT 1;

  IF v_admin.id IS NULL THEN
    PERFORM public.record_login_attempt(v_normalized, false);
    RETURN;
  END IF;

  PERFORM public.record_login_attempt(v_normalized, true);
  v_token := public.create_session(NULL, v_admin.id);

  RETURN QUERY SELECT
    v_admin.id, v_admin.name, v_admin.email, v_admin.role, v_admin.city_id, v_admin.phone,
    v_token;
END $$;

GRANT EXECUTE ON FUNCTION public.login_admin_with_token(text, text) TO anon;


-- ─── 7) Hassas RPC'lere session-token doğrulamalı yeni signature'lar ────────

-- submit_appointment_v2 — token + user_id verify edilir; user_email/name DB'den okunur (forgery imkansız)
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

  SELECT city_id, COALESCE(capacity_per_slot, 1)
    INTO v_lab_city_id, v_max_capacity
    FROM public.laboratories
   WHERE laboratories.id = p_lab_id;

  IF NOT FOUND THEN RAISE EXCEPTION 'err_lab_not_found'; END IF;
  IF v_lab_city_id <> p_city_id THEN RAISE EXCEPTION 'err_lab_city_mismatch'; END IF;

  SELECT COUNT(*) INTO v_current_count
    FROM public.appointments
   WHERE lab_id = p_lab_id AND date = p_date AND time_slot = p_time_slot
     AND status IN ('PENDING', 'APPROVED', 'CANCELLATION_REQUESTED');
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

  -- Auto-notification (existing pattern)
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


-- register_for_workshop_v2 — token'dan user_id alınır; client param geçemez
DROP FUNCTION IF EXISTS public.register_for_workshop_v2(uuid, bigint);
CREATE FUNCTION public.register_for_workshop_v2(p_session_token uuid, p_workshop_id bigint)
RETURNS TABLE(id uuid, registered_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_session_user_id integer;
  v_user record;
  v_cap integer;
  v_count bigint;
  v_reg_id uuid;
  v_ts timestamptz := now();
BEGIN
  SELECT s.user_id INTO v_session_user_id
    FROM public.validate_session(p_session_token) s
   LIMIT 1;
  IF v_session_user_id IS NULL THEN
    RAISE EXCEPTION 'err_unauthenticated';
  END IF;

  SELECT u.* INTO v_user FROM public.users u WHERE u.id = v_session_user_id;
  IF v_user.id IS NULL THEN RAISE EXCEPTION 'err_user_not_found'; END IF;

  PERFORM pg_advisory_xact_lock(hashtext('workshop:' || p_workshop_id::text));

  SELECT COALESCE(capacity, 0) INTO v_cap FROM public.workshops WHERE workshops.id = p_workshop_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'err_workshop_not_found'; END IF;

  IF EXISTS (
    SELECT 1 FROM public.workshop_registrations
     WHERE workshop_id = p_workshop_id AND user_id = v_session_user_id
  ) THEN
    RAISE EXCEPTION 'err_already_registered';
  END IF;

  IF v_cap > 0 THEN
    SELECT COUNT(*) INTO v_count FROM public.workshop_registrations WHERE workshop_id = p_workshop_id;
    IF v_count >= v_cap THEN RAISE EXCEPTION 'err_workshop_full'; END IF;
  END IF;

  INSERT INTO public.workshop_registrations
    (workshop_id, user_id, user_email, user_name, user_surname, registered_at)
  VALUES
    (p_workshop_id, v_user.id, v_user.email, v_user.name, v_user.surname, v_ts)
  RETURNING workshop_registrations.id INTO v_reg_id;

  RETURN QUERY SELECT v_reg_id, v_ts;
END $$;

GRANT EXECUTE ON FUNCTION public.register_for_workshop_v2(uuid, bigint) TO anon;


-- send_message — token validate + author identity belirleme
DROP FUNCTION IF EXISTS public.send_message(uuid, uuid, text);
CREATE FUNCTION public.send_message(p_session_token uuid, p_conversation_id uuid, p_body text)
RETURNS TABLE(id uuid, conversation_id uuid, authored_by text, author_name text, body text, created_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id integer;
  v_admin_id integer;
  v_conv record;
  v_author_name text;
  v_authored_by text;
  v_msg_id uuid;
  v_msg_ts timestamptz := now();
BEGIN
  SELECT s.user_id, s.admin_id INTO v_user_id, v_admin_id
    FROM public.validate_session(p_session_token) s
   LIMIT 1;
  IF v_user_id IS NULL AND v_admin_id IS NULL THEN
    RAISE EXCEPTION 'err_unauthenticated';
  END IF;

  SELECT * INTO v_conv FROM public.conversations WHERE id = p_conversation_id;
  IF v_conv.id IS NULL THEN RAISE EXCEPTION 'err_conversation_not_found'; END IF;

  -- Yazar kim? Conversation sender_id ile session user_id eşleşirse 'sender',
  -- aksi halde admin caller → 'recipient'.
  IF v_user_id IS NOT NULL AND v_conv.sender_id::text = v_user_id::text THEN
    v_authored_by := 'sender';
    SELECT name || ' ' || surname INTO v_author_name FROM public.users WHERE id = v_user_id;
  ELSIF v_admin_id IS NOT NULL THEN
    v_authored_by := 'recipient';
    SELECT name INTO v_author_name FROM public.admins WHERE id = v_admin_id;
  ELSE
    RAISE EXCEPTION 'err_not_authorized';
  END IF;

  INSERT INTO public.messages (conversation_id, authored_by, author_name, body)
  VALUES (p_conversation_id, v_authored_by, COALESCE(v_author_name, ''), p_body)
  RETURNING messages.id INTO v_msg_id;

  -- Atomic unread counter bump
  IF v_authored_by = 'sender' THEN
    UPDATE public.conversations
       SET unread_for_recipient = unread_for_recipient + 1, last_message_at = v_msg_ts
     WHERE id = p_conversation_id;
  ELSE
    UPDATE public.conversations
       SET unread_for_sender = unread_for_sender + 1, last_message_at = v_msg_ts
     WHERE id = p_conversation_id;
  END IF;

  RETURN QUERY SELECT v_msg_id, p_conversation_id, v_authored_by, COALESCE(v_author_name, ''), p_body, v_msg_ts;
END $$;

GRANT EXECUTE ON FUNCTION public.send_message(uuid, uuid, text) TO anon;


NOTIFY pgrst, 'reload schema';

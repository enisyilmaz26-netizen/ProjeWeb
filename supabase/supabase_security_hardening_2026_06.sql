-- ============================================================================
-- SECURITY HARDENING — Run in Supabase SQL Editor
-- ============================================================================
-- Bu migration aşağıdaki güvenlik/tutarlılık iyileştirmelerini ekler:
--   1) login_user/login_admin'e server-side rate limiting
--   2) atomic conversation unread counter (race condition fix)
--   3) workshop registration RPC (advisory lock + kapasite enforce)
--   4) audit log SECURITY DEFINER RPC (actor spoofing'i zorlaştırır)
--   5) email normalization constraint (case-sensitive dup'ı önler)
--   6) closed_days unique constraint (city_id NULL davranışı düzeltmesi)
-- ============================================================================

-- ─── 1) Server-side rate limit — login_user / login_admin RPC'lerine entegre ──
DROP FUNCTION IF EXISTS public.login_user(text, text);
DROP FUNCTION IF EXISTS public.login_admin(text, text);

CREATE FUNCTION public.login_user(p_email text, p_password text)
RETURNS TABLE(
  id integer, name text, surname text, email text,
  is_approved boolean, city_id integer, city_name text,
  phone text, branch text, work_location text, district text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_normalized text := lower(trim(p_email));
  v_allowed boolean;
BEGIN
  -- Server-side rate limit (5 fail / 60sn → blok)
  SELECT public.check_rate_limit(v_normalized) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'err_rate_limited';
  END IF;

  RETURN QUERY
    SELECT u.id, u.name, u.surname, u.email, u.is_approved,
           u.city_id, u.city_name, u.phone, u.branch, u.work_location, u.district
    FROM public.users u
    WHERE u.email = v_normalized
      AND u.password_hash LIKE '$2%'
      AND crypt(p_password, u.password_hash) = u.password_hash
    LIMIT 1;

  -- Başarı/başarısızlık kaydı (FOUND, RETURN QUERY'den sonra doğru sonucu verir)
  IF FOUND THEN
    PERFORM public.record_login_attempt(v_normalized, true);
  ELSE
    PERFORM public.record_login_attempt(v_normalized, false);
  END IF;
END;
$$;

CREATE FUNCTION public.login_admin(p_email text, p_password text)
RETURNS TABLE(
  id integer, name text, email text, role text, city_id integer, phone text
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_normalized text := lower(trim(p_email));
  v_allowed boolean;
BEGIN
  SELECT public.check_rate_limit(v_normalized) INTO v_allowed;
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'err_rate_limited';
  END IF;

  RETURN QUERY
    SELECT a.id, a.name, a.email, a.role, a.city_id, a.phone
    FROM public.admins a
    WHERE a.email = v_normalized
      AND a.password_hash LIKE '$2%'
      AND crypt(p_password, a.password_hash) = a.password_hash
    LIMIT 1;

  IF FOUND THEN
    PERFORM public.record_login_attempt(v_normalized, true);
  ELSE
    PERFORM public.record_login_attempt(v_normalized, false);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.login_user(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.login_admin(text, text) TO anon;


-- ─── 2) Atomic conversation unread counter ───────────────────────────────────
-- sendMessage'da read-modify-write yerine atomic increment.
DROP FUNCTION IF EXISTS public.increment_conversation_unread(uuid, text);

CREATE FUNCTION public.increment_conversation_unread(p_conv_id uuid, p_side text)
RETURNS conversations
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.conversations;
BEGIN
  IF p_side = 'recipient' THEN
    UPDATE public.conversations
       SET unread_for_recipient = unread_for_recipient + 1,
           last_message_at = now()
     WHERE id = p_conv_id
    RETURNING * INTO v_row;
  ELSIF p_side = 'sender' THEN
    UPDATE public.conversations
       SET unread_for_sender = unread_for_sender + 1,
           last_message_at = now()
     WHERE id = p_conv_id
    RETURNING * INTO v_row;
  ELSE
    RAISE EXCEPTION 'invalid_side';
  END IF;
  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_conversation_unread(uuid, text) TO anon;


-- ─── 3) Workshop registration — advisory lock + kapasite kontrolü ────────────
-- Client-side regCount yarış koşulunu kapatır (submit_appointment ile aynı pattern).
DROP FUNCTION IF EXISTS public.register_for_workshop(bigint, integer, text, text, text);

CREATE FUNCTION public.register_for_workshop(
  p_workshop_id bigint,
  p_user_id     integer,
  p_user_email  text,
  p_user_name   text,
  p_user_surname text
)
RETURNS TABLE(id uuid, registered_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cap     integer;
  v_count   bigint;
  v_reg_id  uuid;
  v_ts      timestamptz := now();
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('workshop:' || p_workshop_id::text));

  SELECT COALESCE(capacity, 0) INTO v_cap
    FROM public.workshops WHERE workshops.id = p_workshop_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'err_workshop_not_found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.workshop_registrations
     WHERE workshop_id = p_workshop_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'err_already_registered';
  END IF;

  IF v_cap > 0 THEN
    SELECT COUNT(*) INTO v_count
      FROM public.workshop_registrations
     WHERE workshop_id = p_workshop_id;
    IF v_count >= v_cap THEN
      RAISE EXCEPTION 'err_workshop_full';
    END IF;
  END IF;

  INSERT INTO public.workshop_registrations
    (workshop_id, user_id, user_email, user_name, user_surname, registered_at)
  VALUES
    (p_workshop_id, p_user_id, lower(trim(p_user_email)), p_user_name, p_user_surname, v_ts)
  RETURNING workshop_registrations.id INTO v_reg_id;

  RETURN QUERY SELECT v_reg_id, v_ts;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_workshop(bigint, integer, text, text, text) TO anon;


-- ─── 4) Email normalization constraint ───────────────────────────────────────
-- Mevcut data'yı önce normalize et:
UPDATE public.users  SET email = lower(trim(email)) WHERE email <> lower(trim(email));
UPDATE public.admins SET email = lower(trim(email)) WHERE email <> lower(trim(email));

-- Constraint: email her zaman lowercase ve trim'lenmiş olmalı
ALTER TABLE public.users  DROP CONSTRAINT IF EXISTS users_email_normalized;
ALTER TABLE public.admins DROP CONSTRAINT IF EXISTS admins_email_normalized;
ALTER TABLE public.users
  ADD CONSTRAINT users_email_normalized
  CHECK (email = lower(trim(email)));
ALTER TABLE public.admins
  ADD CONSTRAINT admins_email_normalized
  CHECK (email = lower(trim(email)));

-- Mevcut unique index'ler yoksa ekle
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique  ON public.users  (email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_email_unique ON public.admins (email);


-- ─── 5) Audit logging via SECURITY DEFINER ───────────────────────────────────
-- Anon role audit_logs'a direkt INSERT yapamaz; sadece bu RPC üzerinden.
-- Bu RPC, oturum doğrulamasını yapmaz (custom auth nedeniyle) ama en azından
-- normalize edilmiş bir alan setiyle yazılır ve tablo INSERT permission'ı revoke edilir.
DROP FUNCTION IF EXISTS public.write_audit(text, text, text, text, text, text, text);

CREATE FUNCTION public.write_audit(
  p_actor_email text, p_actor_name text, p_actor_role text,
  p_action text, p_target_type text, p_target_id text, p_details text
)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.audit_logs (actor_email, actor_name, actor_role, action, target_type, target_id, details)
  VALUES (
    NULLIF(lower(trim(p_actor_email)), ''),
    NULLIF(trim(p_actor_name), ''),
    NULLIF(p_actor_role, ''),
    p_action,
    NULLIF(p_target_type, ''),
    NULLIF(p_target_id, ''),
    p_details
  );
$$;

GRANT EXECUTE ON FUNCTION public.write_audit(text, text, text, text, text, text, text) TO anon;

-- Doğrudan INSERT'i kaldır — anon artık SECURITY DEFINER RPC üzerinden yazsın.
REVOKE INSERT ON public.audit_logs FROM anon;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;


-- ─── 6) Closed days unique constraint — NULL davranışı ───────────────────────
-- (date, city_id) UNIQUE PostgreSQL'de city_id NULL ise unique kabul edilmez.
-- Aynı tarih için "tüm şehirler"i (NULL) birden fazla eklemeyi engellemek için
-- partial unique index ekleyelim.
CREATE UNIQUE INDEX IF NOT EXISTS idx_closed_days_global_unique
  ON public.closed_days (date)
  WHERE city_id IS NULL;


-- ─── 7) Notifications: city prefix immutable on UPDATE (defense-in-depth) ───
-- CITY admin'in başka bir city tag'i ile bildirim güncellemesini engellemek için
-- güncelleme sınırlandırması. (Read-only — UPDATE policy zaten permissive ama
-- başlık değişikliği audit'lenmemiş bir bypass yolu olabilir.)
-- Notlar: UI'da edit yok şu an; sadece is_read ve delete kullanılıyor. Bu
-- nedenle UPDATE policy'sini sadece is_read alanına izin verecek şekilde
-- sıkılaştırmak idealdir ama bu, mevcut policy modelini bozar. Şimdilik
-- migration'da bunu opsiyonel bıraktım — uygulamaya hazır olunca aç:
-- DROP POLICY IF EXISTS "anon_update_notifications" ON public.notifications;
-- CREATE POLICY "anon_update_is_read_only" ON public.notifications
--   FOR UPDATE TO anon USING (true) WITH CHECK (
--     (title, message, type, timestamp) IS NOT DISTINCT FROM
--     (OLD.title, OLD.message, OLD.type, OLD.timestamp)
--   );

NOTIFY pgrst, 'reload schema';

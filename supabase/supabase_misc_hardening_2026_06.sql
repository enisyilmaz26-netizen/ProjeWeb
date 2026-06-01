-- ============================================================================
-- MISC HARDENING — küçük ama anlamlı sıkılaştırmalar
-- ============================================================================
-- Bağımsız çalıştırılabilir; column_lockdown'dan sonra gelmek zorunda değil.
-- ============================================================================

-- ─── 1) Audit log retention — eski kayıtları prune et ────────────────────────
-- audit_logs aksi halde sınırsız büyür. 180 günden eski kayıtları silen RPC.
CREATE OR REPLACE FUNCTION public.prune_audit_logs(p_days integer DEFAULT 180)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.audit_logs
   WHERE created_at < now() - (p_days || ' days')::interval;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.prune_audit_logs(integer) TO anon;


-- ─── 2) Server-side input length limits ──────────────────────────────────────
-- Çok uzun değerlerle spam'i önlemek için makul üst sınırlar.
-- Mevcut data sınırı aşıyorsa migration patlar; o yüzden önce uzun değerleri trunc'la.

UPDATE public.appointments SET note = left(note, 2000) WHERE length(note) > 2000;
UPDATE public.users SET
  name           = left(name, 100),
  surname        = left(surname, 100),
  branch         = left(branch, 100),
  work_location  = left(work_location, 200),
  district       = left(district, 100),
  phone          = left(phone, 20),
  city_name      = left(city_name, 100)
WHERE length(name) > 100
   OR length(surname) > 100
   OR length(COALESCE(branch, '')) > 100
   OR length(COALESCE(work_location, '')) > 200
   OR length(COALESCE(district, '')) > 100
   OR length(COALESCE(phone, '')) > 20
   OR length(COALESCE(city_name, '')) > 100;

UPDATE public.notifications SET
  title   = left(title, 200),
  message = left(message, 2000)
WHERE length(COALESCE(title, '')) > 200
   OR length(COALESCE(message, '')) > 2000;

UPDATE public.messages SET body = left(body, 4000) WHERE length(body) > 4000;

-- Şimdi CHECK constraint ekle (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_note_max_len') THEN
    ALTER TABLE public.appointments ADD CONSTRAINT appointments_note_max_len CHECK (length(note) <= 2000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_name_max_len') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_name_max_len CHECK (length(name) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_surname_max_len') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_surname_max_len CHECK (length(surname) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_branch_max_len') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_branch_max_len CHECK (length(COALESCE(branch, '')) <= 100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_work_loc_max_len') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_work_loc_max_len CHECK (length(COALESCE(work_location, '')) <= 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_max_len') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_phone_max_len CHECK (length(COALESCE(phone, '')) <= 20);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_title_max_len') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_title_max_len CHECK (length(COALESCE(title, '')) <= 200);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notifications_message_max_len') THEN
    ALTER TABLE public.notifications ADD CONSTRAINT notifications_message_max_len CHECK (length(COALESCE(message, '')) <= 2000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_body_max_len') THEN
    ALTER TABLE public.messages ADD CONSTRAINT messages_body_max_len CHECK (length(body) <= 4000);
  END IF;
END $$;


-- ─── 3) Server-side phone format validation ──────────────────────────────────
-- Sadece Türk telefon formatı (0?5XXXXXXXXX, 10 ya da 11 hane); boş izinli.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_format') THEN
    ALTER TABLE public.users ADD CONSTRAINT users_phone_format
      CHECK (phone IS NULL OR phone = '' OR phone ~ '^0?5[0-9]{9}$' OR phone ~ '^[0-9]{10,11}$');
  END IF;
END $$;


-- ─── 4) Audit log type check — yalnızca beklenen action'lar ────────────────
-- (Defansif: client'tan tamamen yanlış action stringi gelirse audit kirlenmesin.
--  Action listesi kapalı tutulmaz, ama uzunluk sınırı eklenir.)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_action_max_len') THEN
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_max_len CHECK (length(action) <= 64);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_details_max_len') THEN
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_details_max_len CHECK (length(COALESCE(details, '')) <= 1000);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

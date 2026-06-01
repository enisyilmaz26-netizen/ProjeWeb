-- ============================================================================
-- NOTIFICATIONS — anon direct INSERT engelle, SECURITY DEFINER RPC ile yaz
-- ============================================================================
-- Bu migration anon'un direkt `notifications` tablosuna INSERT etmesini
-- BEFORE INSERT trigger ile engeller. Tüm legitimate akışlar
-- `write_notification` RPC üzerinden geçer; SECURITY DEFINER olduğu için
-- trigger'ı bypass eder.
--
-- Bu çalıştırılmadan önce client tarafının write_notification RPC'sini
-- (eğer mevcutsa) kullanıyor olması gerekir; aksi takdirde tüm bildirim
-- INSERT'leri 42501 hatası alır. Client kod RPC-first + fallback pattern
-- kullanıyor — RPC yoksa fallback'le direkt INSERT denenir.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.write_notification(
  p_title text, p_message text, p_type text DEFAULT 'SYSTEM'
)
RETURNS public.notifications
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.notifications;
BEGIN
  INSERT INTO public.notifications (title, message, type, timestamp, is_read)
  VALUES (
    NULLIF(trim(p_title), ''),
    NULLIF(trim(p_message), ''),
    COALESCE(NULLIF(p_type, ''), 'SYSTEM'),
    EXTRACT(EPOCH FROM now())::bigint * 1000,
    false
  )
  RETURNING * INTO v_row;
  RETURN v_row;
END $$;

GRANT EXECUTE ON FUNCTION public.write_notification(text, text, text) TO anon;


-- Trigger: anon ve authenticated INSERT'leri reddedilir; postgres/supabase_admin
-- (SECURITY DEFINER call context'i) ve diğer privileged role'ler bypass eder.
CREATE OR REPLACE FUNCTION public.guard_notifications_anon_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'permission_denied_notifications_direct_insert' USING ERRCODE = '42501';
END $$;

DROP TRIGGER IF EXISTS guard_notifications_insert ON public.notifications;
CREATE TRIGGER guard_notifications_insert
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.guard_notifications_anon_insert();

NOTIFY pgrst, 'reload schema';

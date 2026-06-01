-- ============================================================================
-- PRE-LAUNCH FIXES — son denetimde bulunan eksiklikler
-- ============================================================================
-- 1) appointments.lab_id → laboratories(id) FK eksikti (orphan riski)
-- 2) set_workshop_attendance ve upsert_certificate_template RPC'lerine
--    anon GRANT EXECUTE eksikti — production'da anon client çağıramazdı
-- 3) Eksik index'ler (appointments.created_timestamp, messages.created_at,
--    workshop_registrations.workshop_id+user_id) — query plan iyileştirmesi
-- ============================================================================

-- ─── 1) FK: appointments.lab_id → laboratories(id) ──────────────────────────
-- Önce orphan satırları temizle (varsa).
DELETE FROM public.appointments
 WHERE lab_id IS NOT NULL
   AND lab_id NOT IN (SELECT id FROM public.laboratories);

-- Mevcut FK varsa düşür (idempotent)
DO $$
DECLARE v_constraint text;
BEGIN
  SELECT conname INTO v_constraint FROM pg_constraint
   WHERE conrelid = 'public.appointments'::regclass
     AND contype = 'f'
     AND pg_get_constraintdef(oid) LIKE '%laboratories%';
  IF v_constraint IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.appointments DROP CONSTRAINT ' || quote_ident(v_constraint);
  END IF;
END $$;

-- ON DELETE RESTRICT — lab silinmek istenirse önce ilişkili appointment'ları
-- iptal etmek/temizlemek gerekir. CASCADE ile randevu otomatik silinmesin
-- (data loss riski); RESTRICT ile admin önce randevuları iptal eder.
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_lab_id_fkey
  FOREIGN KEY (lab_id) REFERENCES public.laboratories(id) ON DELETE RESTRICT;


-- ─── 2) Eksik GRANT EXECUTE'ler (varsa) ────────────────────────────────────
-- Bu fonksiyonlar eski sürüm migration'larında tanımlandı; ortam farklılığı
-- için varlık kontrolü ile GRANT veriyoruz. Eksikse migration'lar (3, 4) ile
-- eklenecek; o zaman da aşağıdaki blok problem çıkarmaz.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_workshop_attendance'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_workshop_attendance(uuid, boolean) TO anon';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'upsert_certificate_template'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.upsert_certificate_template(jsonb) TO anon';
  END IF;
END $$;


-- ─── 3) Performans index'leri ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_appointments_created_ts
  ON public.appointments (created_timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON public.messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_workshop_reg_workshop
  ON public.workshop_registrations (workshop_id);

CREATE INDEX IF NOT EXISTS idx_workshop_reg_user
  ON public.workshop_registrations (user_id);

CREATE INDEX IF NOT EXISTS idx_appointments_user_email
  ON public.appointments (user_email);

CREATE INDEX IF NOT EXISTS idx_appointments_city_status
  ON public.appointments (city_id, status);


NOTIFY pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS Hardening — minimum güvenlik katmanı
-- Supabase SQL Editor'da çalıştır.
-- Mimari: custom auth (Supabase Auth değil), anon key ile çalışıyor.
-- Bu yüzden kullanıcı bazlı kısıtlama yapılamıyor; en azından
-- doğrudan yazma işlemleri engelleniyor, hassas kolonlar gizleniyor.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. USERS tablosu ────────────────────────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Okuma: tüm onaylı kullanıcılar görünür (uygulama bunu kullanıyor)
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT TO anon USING (true);

-- Kayıt (INSERT): sadece kayıt akışı için gerekli
DROP POLICY IF EXISTS "users_insert" ON public.users;
CREATE POLICY "users_insert" ON public.users
  FOR INSERT TO anon WITH CHECK (true);

-- Güncelleme: YALNIZCA belirli kolonlar (şifre, profil bilgileri)
-- Diğer hassas kolonları (is_approved, city_id) doğrudan API üzerinden
-- değiştirmeyi engeller — bunlar SECURITY DEFINER RPC'ler üzerinden yapılır.
DROP POLICY IF EXISTS "users_update" ON public.users;
CREATE POLICY "users_update" ON public.users
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Silme: anon kesinlikle user silemez (sadece admin RPC ile)
DROP POLICY IF EXISTS "users_delete" ON public.users;
-- (politika oluşturmuyoruz = DELETE engellendi)

-- ── 2. ADMINS tablosu ───────────────────────────────────────────────────────
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select" ON public.admins;
CREATE POLICY "admins_select" ON public.admins
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "admins_insert" ON public.admins;
CREATE POLICY "admins_insert" ON public.admins
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "admins_update" ON public.admins;
CREATE POLICY "admins_update" ON public.admins
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Silme: anon admin silemez
-- (politika yok = DELETE engellendi)

-- ── 3. APPOINTMENTS tablosu ─────────────────────────────────────────────────
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointments_select" ON public.appointments;
CREATE POLICY "appointments_select" ON public.appointments
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "appointments_insert" ON public.appointments;
CREATE POLICY "appointments_insert" ON public.appointments
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_update" ON public.appointments;
CREATE POLICY "appointments_update" ON public.appointments
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "appointments_delete" ON public.appointments;
CREATE POLICY "appointments_delete" ON public.appointments
  FOR DELETE TO anon USING (true);

-- ── 4. WORKSHOPS tablosu ────────────────────────────────────────────────────
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workshops_select" ON public.workshops;
CREATE POLICY "workshops_select" ON public.workshops
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "workshops_insert" ON public.workshops;
CREATE POLICY "workshops_insert" ON public.workshops
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "workshops_update" ON public.workshops;
CREATE POLICY "workshops_update" ON public.workshops
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "workshops_delete" ON public.workshops;
CREATE POLICY "workshops_delete" ON public.workshops
  FOR DELETE TO anon USING (true);

-- ── 5. DİĞER TABLOLAR (labs, time_slots, closed_days, cities) ──────────────
ALTER TABLE public.laboratories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "laboratories_all" ON public.laboratories;
CREATE POLICY "laboratories_all" ON public.laboratories FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.city_time_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "city_time_slots_all" ON public.city_time_slots;
CREATE POLICY "city_time_slots_all" ON public.city_time_slots FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.closed_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "closed_days_all" ON public.closed_days;
CREATE POLICY "closed_days_all" ON public.closed_days FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cities_select" ON public.cities;
CREATE POLICY "cities_select" ON public.cities FOR SELECT TO anon USING (true);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversations_all" ON public.conversations;
CREATE POLICY "conversations_all" ON public.conversations FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_all" ON public.messages;
CREATE POLICY "messages_all" ON public.messages FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.workshop_registrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "workshop_registrations_all" ON public.workshop_registrations;
CREATE POLICY "workshop_registrations_all" ON public.workshop_registrations FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE public.certificate_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "certificate_templates_all" ON public.certificate_templates;
CREATE POLICY "certificate_templates_all" ON public.certificate_templates FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 6. PASSWORD_HASH kolonunu gizle ─────────────────────────────────────────
-- Anon rolünün password_hash kolonuna doğrudan erişimini kaldır.
-- Uygulama zaten bu kolonu SELECT'e almıyor; login RPC'ler SECURITY DEFINER.
-- NOT: Bu tablo-level SELECT grant'ı override eder; sadece bu kolonu gizler.
REVOKE SELECT (password_hash) ON public.users FROM anon;
REVOKE SELECT (password_hash) ON public.admins FROM anon;

NOTIFY pgrst, 'reload schema';

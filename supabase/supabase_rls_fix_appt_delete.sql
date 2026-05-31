-- Randevu DELETE politikasını kaldır.
-- Uygulama hiçbir zaman randevuyu direkt silmiyor; yalnızca status
-- güncelliyor (CANCELLED, COMPLETED). Bu policy gereksiz ve anon'un
-- herhangi bir randevuyu silmesine izin veriyordu.
-- Supabase SQL Editor'da çalıştır.

DROP POLICY IF EXISTS "appointments_delete" ON public.appointments;

-- Güvenlik doğrulama: anon artık appointments tablosunda DELETE yapamaz.
-- Mevcut akışlar (iptal, tamamlama) yalnızca UPDATE kullanır.

NOTIFY pgrst, 'reload schema';

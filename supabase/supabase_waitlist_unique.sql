-- Waitlist için DB-level unique constraint
-- Aynı kullanıcının aynı lab+tarih+saat için iki kez bekleme listesine
-- girmesini önler (race condition koruması).
-- Supabase SQL Editor'da çalıştır.

CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_no_dup
ON public.waitlist (lab_id, date, time_slot, user_email)
WHERE status = 'WAITING';

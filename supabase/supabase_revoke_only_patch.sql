-- ============================================================================
-- REVOKE-ONLY PATCH — column-level lockdown'ı zorla uygula
-- ============================================================================
-- Önceki column_lockdown migration'ında REVOKE bölümü etkin olmamış görünüyor
-- (diagnostic, anon'un hâlâ is_approved/role/password_hash UPDATE/INSERT
-- yapabildiğini gösterdi). Bu dosya sadece REVOKE komutlarını içerir;
-- hiçbir RPC/constraint eklemez, yalnızca yetkileri geri çeker.
-- ============================================================================

REVOKE UPDATE (is_approved, password_hash) ON public.users  FROM anon;
REVOKE INSERT (is_approved)                ON public.users  FROM anon;

REVOKE UPDATE (role, city_id, password_hash) ON public.admins FROM anon;
REVOKE INSERT (role)                          ON public.admins FROM anon;

-- public ve authenticated rollerinde de bu sütunlara izin varsa kaldır
-- (Supabase varsayılan GRANT'lerine karşı belt-and-suspenders).
REVOKE UPDATE (is_approved, password_hash) ON public.users  FROM PUBLIC;
REVOKE INSERT (is_approved)                ON public.users  FROM PUBLIC;
REVOKE UPDATE (role, city_id, password_hash) ON public.admins FROM PUBLIC;
REVOKE INSERT (role)                          ON public.admins FROM PUBLIC;

-- authenticated rolü Supabase Auth kullansaydı önemli olurdu; bu projede
-- aktif değil ama defense-in-depth olarak yine kaldıralım.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'REVOKE UPDATE (is_approved, password_hash) ON public.users  FROM authenticated';
    EXECUTE 'REVOKE INSERT (is_approved)                ON public.users  FROM authenticated';
    EXECUTE 'REVOKE UPDATE (role, city_id, password_hash) ON public.admins FROM authenticated';
    EXECUTE 'REVOKE INSERT (role)                          ON public.admins FROM authenticated';
  END IF;
END $$;

-- Şema cache yenile
NOTIFY pgrst, 'reload schema';

-- Doğrulama için aşağıdaki sorguyu da çalıştırabilirsin:
-- Beklenen: anon için sadece is_approved/password_hash/role/city_id dışındaki
-- sütunlarda INSERT/UPDATE görünmeli.
--
-- SELECT grantee, column_name, privilege_type
-- FROM information_schema.column_privileges
-- WHERE table_schema='public'
--   AND table_name IN ('users','admins')
--   AND column_name IN ('is_approved','password_hash','role','city_id')
-- ORDER BY table_name, column_name, grantee, privilege_type;

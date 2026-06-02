-- ============================================================================
-- REVOKE LEGACY LOGIN RPC'LERİ — rate-limit bypass kapatma
-- ============================================================================
-- Token-aware login_user_with_token + login_admin_with_token check_rate_limit
-- ile sınırlandırılmış (supabase_session_tokens.sql). Ama eski sürümlerden
-- kalan login_user ve login_admin RPC'leri anon'a açık ve rate-limit YOK.
-- Saldırgan v2'yi atlatıp /rest/v1/rpc/login_user'a doğrudan POST atarak
-- sınırsız parola dener.
--
-- Bu migration legacy RPC'leri anon'dan REVOKE eder. Frontend'in eski
-- fallback yolu (AuthContext.jsx) bu commit'te kaldırıldı; herkes v2'den
-- geçer.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.login_user(text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.login_admin(text, text) FROM anon;

NOTIFY pgrst, 'reload schema';

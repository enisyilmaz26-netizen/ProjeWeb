# MEB ÖGEDEP — Deployment Guide

Bu dokümanı sistemi sıfırdan production'a kurmak için izlenmesi gereken sıralı talimat olarak kullanın.

## 1. Önkoşullar

- Supabase projesi (https://supabase.com)
- Production sunucusu — nginx + Node 22+ (web/build için lokal de yeterli)
- SSH anahtarı (rsync deploy için) — `Enis.pem` repo'da değil
- Brevo (https://brevo.com) hesabı — transactional email için

## 2. Supabase setup

### 2.1 Yeni proje oluştur
- Dashboard → New Project → bölge: `eu-central-1` veya yakın
- Database password güçlü olmalı, password manager'a kaydet
- Project ref'ini (`xxxxxxxx`) not al

### 2.2 SQL migration'ları sırayla çalıştır

**Sıra önemli — bağımlılıklara göre dizilmiştir.** Her dosyayı SQL Editor'da çalıştırın.

#### Temel schema + auth
1. `supabase_auth_functions.sql` — bcrypt + login RPC'leri
2. `supabase_rate_limiting.sql` — `check_rate_limit`, `record_login_attempt`
3. `supabase_fix_admin_password.sql` — `change_admin_password` search_path fix
4. `supabase_must_change_password.sql` — flag kolonu

#### RLS tabanı
5. `supabase_rls_hardening.sql` — tablo bazlı temel RLS

#### Tablolar ve özellikler
6. `supabase_avatars.sql` + `supabase_avatars_fix.sql` — avatar bucket + RLS
7. `supabase_audit_logs.sql` — audit table
8. `supabase_messages.sql` — conversations + messages
9. `supabase_closed_days.sql`
10. `supabase_workshop_registrations.sql` + `supabase_workshop_attendance.sql`
11. `supabase_waitlist.sql` + `supabase_waitlist_unique.sql`
12. `supabase_certificates.sql` + `supabase_certificate_rpc.sql`
13. `supabase_notification_rls.sql`
14. `supabase_set_attendance.sql`

#### Güvenlik sertleştirmesi (sırayla)
15. `supabase_security_hardening_2026_06.sql` — server-side rate limit + atomic ops
16. `supabase_security_hardening_2026_06_fix.sql` — login_user fix (eksik dep eklendi)
17. `supabase_misc_hardening_2026_06.sql` — length CHECK + retention
18. `supabase_column_lockdown_2026_06.sql` — column lockdown + CASCADE FK
19. `supabase_revoke_only_patch.sql` — REVOKE patch (eski yöntem; idempotent)
20. `supabase_trigger_lockdown.sql` — trigger-based column guards
21. `supabase_trigger_fix.sql` — trigger bypass condition fix
22. `supabase_status_delete_lockdown.sql` — status state machine + DELETE triggers
23. `supabase_notifications_lockdown.sql` — notifications INSERT trigger
24. `supabase_field_level_lockdown.sql` — notifications/appointments field UPDATE
25. `supabase_session_tokens.sql` — sessions + token-aware v2 RPCs
26. `supabase_v2_rpc_ambiguity_fix.sql` — ambiguity hotfix
27. `supabase_prelaunch_fixes.sql` — son FK + GRANT EXECUTE + index'ler
28. `supabase_rls_fix_appt_delete.sql` — appointments anon DELETE policy kaldır
29. `reset_admin_password_by_global.sql` — global admin reset RPC

### 2.3 Doğrulama
Aşağıdaki RPC'ler tanımlı olmalı (SQL Editor):

```sql
SELECT proname FROM pg_proc WHERE proname IN (
  'login_user_with_token','login_admin_with_token','validate_session',
  'submit_appointment_v2','register_for_workshop_v2','send_message',
  'reschedule_appointment','write_notification','write_audit',
  'admin_approve_user','admin_revoke_user','admin_delete_lab',
  'set_workshop_attendance','upsert_certificate_template'
) ORDER BY proname;
```

### 2.4 İlk admin kaydı
Production'da test seed user'ları yok. İlk GLOBAL admin'i manuel oluştur:

```sql
-- Şifre üret
SELECT public.hash_password_bcrypt('GüçlüŞifre_123!');

-- Yukarıdan dönen hash ile insert:
INSERT INTO public.admins (name, email, password_hash, role, city_id, phone, must_change_password)
VALUES ('Merkez Yönetici', 'admin@meb.gov.tr', '<hash>', 'GLOBAL', NULL, '05XXXXXXXXX', true);
```

### 2.5 Şehir verileri
`cities` tablosuna ülkenizdeki illeri ekle (örnek):

```sql
INSERT INTO public.cities (name) VALUES ('Ankara'), ('İstanbul'), ('İzmir'), ...;
```

## 3. Edge Function — send-email (Brevo)

### 3.1 Brevo setup
- Brevo Dashboard → Senders → yeni sender ekle (domain doğrulanmış olmalı)
- API Keys → yeni v3 key oluştur

### 3.2 Edge Function deploy
```bash
cd supabase
npx supabase functions deploy send-email --project-ref <project-ref>

# Secret'ları set et
npx supabase secrets set BREVO_API_KEY=<your-key> --project-ref <ref>
npx supabase secrets set FROM_EMAIL=<sender-email> --project-ref <ref>
```

## 4. Web app — production build & deploy

### 4.1 Environment variables
```bash
cd web
cp .env.example .env
# .env'i düzenle:
# VITE_SUPABASE_URL=https://<project-ref>.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon-publishable-key>
```

### 4.2 Build
```bash
npm install
npm run build
# dist/ dizinine production bundle
```

### 4.3 Nginx config
`nginx/meb-security-headers.conf` dosyasını `/etc/nginx/conf.d/` altına kopyalayın.

Server bloğu (`/etc/nginx/sites-available/ogedep`):

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.tld;

    ssl_certificate /etc/letsencrypt/live/your-domain.tld/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.tld/privkey.pem;

    root /var/www/ogedep;
    index index.html;

    # SPA shell — cache yok
    location = /index.html {
      add_header Cache-Control "no-store, no-cache, must-revalidate" always;
    }

    # Static hash'li asset'ler — 1 yıl immutable
    location /assets/ {
      add_header Cache-Control "public, max-age=31536000, immutable" always;
    }

    # SPA fallback
    location / {
      try_files $uri /index.html;
    }
}
```

### 4.4 Deploy
```bash
# Kök dizinden
./deploy.sh
# rsync ile dist/ → sunucudaki /var/www/ogedep
# Aynı zamanda meb-security-headers.conf'u günceller ve nginx reload eder.
```

## 5. Doğrulama checklist

### 5.1 Sayfa açılışı
- [ ] HTTPS açılıyor, sertifika geçerli
- [ ] Console'da hata yok
- [ ] Security header'ları curl ile kontrol: `curl -I https://your-domain.tld | grep -E "Strict|X-Frame|CSP"`

### 5.2 Auth akışları
- [ ] İlk GLOBAL admin login → ForcePasswordChange çıkıyor, şifre değiştirme çalışıyor
- [ ] Hatalı şifre 5x → 6. denemede `err_rate_limited`
- [ ] Kullanıcı kayıt + admin onayı + login akışı çalışıyor

### 5.3 Veri akışları
- [ ] Randevu açma → notification görünüyor
- [ ] Admin randevu onaylama → kullanıcı email + bildirim alıyor
- [ ] Atölye kayıt → onay
- [ ] Mesajlaşma çift yönlü çalışıyor

### 5.4 Güvenlik smoke test
```bash
# Browser console'da anon key ile:
await supabase.from('users').update({is_approved: true}).eq('id', 1).select('id')
# Beklenen: 42501 permission_denied_is_approved_update
```

## 6. Operational tasks

### 6.1 Periyodik temizlik
Audit log retention manuel (cron yok). Aylık olarak SQL Editor'da:
```sql
SELECT public.prune_audit_logs(180);  -- 180+ gün eski logları sil
```

### 6.2 Backup
Supabase free tier: günlük backup (7 gün retention). Production için Pro plan + PITR önerilir.

### 6.3 Monitoring
Şu an external error tracking yok. Önerilen: Sentry React SDK ile bağlantı (`SENTRY_DSN` env var).

## 7. Sorun giderme

| Sorun | Olası neden | Çözüm |
|---|---|---|
| Login fail "function check_rate_limit not found" | Migration #2 atlanmış | `supabase_rate_limiting.sql` çalıştır |
| Bildirim INSERT 42501 | Trigger aktif ama RPC yok | `supabase_notifications_lockdown.sql` çalıştır |
| Email gitmiyor | BREVO secret eksik | Section 3.2 |
| Avatar yüklenmiyor | Bucket policy yok | `supabase_avatars_fix.sql` çalıştır |

## 8. Versiyon notları

- Şu an sadece **Türkçe** destekli (İngilizce çevirileri kaldırıldı)
- Mobile responsive — admin paneli `<sm` için dropdown
- PWA desteği yok (gelecek versiyon)
- Sentry/Datadog integration yok (gelecek versiyon)

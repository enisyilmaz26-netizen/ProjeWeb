import { test, expect } from '@playwright/test'

// Bu smoke test:
//  - Landing → Auth navigasyonu kırık değil
//  - Login formu render oluyor (email, password, submit)
//  - Form gerçekten submit ediliyor → backend RPC ulaşılıyor → hata mesajı UI'da görünüyor
//  - Tab switcher çalışıyor (login ↔ register)
//
// Submit edilen kullanıcı 'e2e-ci-smoke@example.com' — DB'de mevcut DEĞİL
// (audit_logs'a kullanıcı bulunamadı kaydı düşer, başka yan etki yok).
// Bunu denetimde temizlerken filtrelemek için ayırt edici email kullanıldı.

const BAD_EMAIL = 'e2e-ci-smoke@example.com'
const BAD_PASSWORD = 'wrong-password-12345'

test.describe('Login flow smoke', () => {
  test('landing → auth → bad creds error → register tab visible', async ({ page }) => {
    await page.goto('/')

    // Landing page renders, has "Giriş Yap" entry-point button.
    const loginButton = page.getByRole('button', { name: 'Giriş Yap' }).first()
    await expect(loginButton).toBeVisible({ timeout: 10_000 })

    await loginButton.click()

    // Auth screen — login form active by default
    await expect(page.getByRole('heading', { name: 'Giriş Yap', level: 2 })).toBeVisible({ timeout: 5_000 })

    const emailInput = page.locator('input[type="email"][autocomplete="email"]')
    const passwordInput = page.locator('input[autocomplete="current-password"]')
    const submitButton = page.locator('form button[type="submit"]').first()

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(submitButton).toBeVisible()

    // Bad creds → backend returns err_user_not_found → UI surfaces TR mesajı
    await emailInput.fill(BAD_EMAIL)
    await passwordInput.fill(BAD_PASSWORD)
    await submitButton.click()

    // Hata banner'ı görünür olmalı. 'err_user_not_found' = 'Geçersiz E-posta veya Şifre!'
    // 'err_rate_limited' ihtimaline karşı esnek match: ya tipik hata ya rate-limit.
    const errorBanner = page.getByRole('status').filter({
      hasText: /geçersiz e-posta veya şifre|çok fazla hatalı deneme/i,
    })
    await expect(errorBanner).toBeVisible({ timeout: 10_000 })

    // Tab switcher: Kayıt Ol sekmesine geç → başlık "Yeni Üye" olmalı (register_title)
    await page.getByRole('button', { name: 'Kayıt Ol' }).first().click()
    await expect(page.getByRole('heading', { name: 'Yeni Üye', level: 2 })).toBeVisible({ timeout: 5_000 })
  })
})

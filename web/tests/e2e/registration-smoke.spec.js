import { test, expect } from '@playwright/test'

// Bu smoke testi gerçek bir kayıt ÜRETMEZ — şifre zayıflığı client-side
// validation'ı tarafından submit'ten önce reddedildiği için backend hiç
// çağrılmaz, users tablosuna satır yazılmaz, admin onay bildirimi tetiklenmez.
//
// Kapsam:
//  - Landing → Auth → "Kayıt Ol" tab geçişi
//  - Tüm zorunlu form alanları render oluyor ve doldurulabiliyor
//  - İl dropdown'ı async yüklenip seçilebiliyor (cities anon SELECT'i sağlam)
//  - KVKK + bilgi doğruluğu checkbox'ları submit'i unlock ediyor
//  - Zayıf şifre client-side validation hatasını tetikliyor (err_password_weak)

test.describe('Registration flow smoke', () => {
  test('register tab → fill form → weak password rejected client-side', async ({ page }) => {
    await page.goto('/')

    await page.getByRole('button', { name: 'Giriş Yap' }).first().click()
    await expect(page.getByRole('heading', { name: 'Giriş Yap', level: 2 })).toBeVisible({ timeout: 5_000 })

    await page.getByRole('button', { name: 'Kayıt Ol' }).first().click()
    await expect(page.getByRole('heading', { name: 'Yeni Üye', level: 2 })).toBeVisible({ timeout: 5_000 })

    // Form locator — register form'a scope'la, landing'deki Kayıt Ol butonuyla
    // karışmamak için.
    const form = page.locator('form').filter({ has: page.locator('select') })

    // Sıralı doldurma — required işaretli her alan
    await form.locator('input[type="text"]').nth(0).fill('E2E')                       // name
    await form.locator('input[type="text"]').nth(1).fill('Test')                      // surname
    await form.locator('input[type="email"]').fill('e2e-ci-reg-smoke@example.com')    // email
    await form.locator('input[type="text"]').nth(2).fill('Bilişim')                   // branch
    await form.locator('input[type="text"]').nth(3).fill('Test Okulu')                // work_location
    await form.locator('input[type="tel"]').fill('05551234567')                       // phone

    // İl dropdown'ı async yükleniyor — ilk gerçek option görünene kadar bekle, seç.
    const citySelect = form.locator('select')
    await expect(citySelect.locator('option').nth(1)).toBeAttached({ timeout: 10_000 })
    await citySelect.selectOption({ index: 1 })

    await form.locator('input[type="text"]').nth(4).fill('Test İlçe')                 // district

    // Zayıf şifre: 8+ karakter ama özel karakter/rakam yok → isPasswordStrong false döner
    const passwordInputs = form.locator('input[type="password"], input[type="text"]:has(+ button)')
    await form.locator('input[autocomplete="new-password"]').nth(0).fill('weakpassword')
    await form.locator('input[autocomplete="new-password"]').nth(1).fill('weakpassword')

    // İki onay kutusunu işaretle — submit butonu disabled iken yapılmıyor.
    const checkboxes = form.locator('input[type="checkbox"]')
    await checkboxes.nth(0).check()  // KVKK
    await checkboxes.nth(1).check()  // confirmInfo

    // Submit
    const submit = form.locator('button[type="submit"]')
    await expect(submit).toBeEnabled()
    await submit.click()

    // Beklenti: 'err_password_weak' = 'Şifreniz en az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermelidir.'
    const errorBanner = page.getByRole('status').filter({
      hasText: /şifreniz en az 8 karakter/i,
    })
    await expect(errorBanner).toBeVisible({ timeout: 5_000 })
  })
})

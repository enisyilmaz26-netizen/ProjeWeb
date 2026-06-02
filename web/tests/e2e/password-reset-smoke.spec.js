import { test, expect } from '@playwright/test'

// Bu sistemde self-service "şifremi unuttum" akışı yoktur. Şifre sıfırlama
// admin tarafından tetiklenir: admin user'ın şifresini sıfırlar →
// user (must_change_password=true) bir sonraki login'de ForcePasswordChange
// ekranıyla karşılaşır ve devam etmek için yeni şifre belirlemek zorundadır.
//
// Bu smoke test must_change_password durumunu localStorage'a mock'lar,
// App.jsx routing'inin ForcePasswordChange'i render ettiğini ve client-side
// validation'ın (isPasswordStrong) zayıf şifreyi RPC'den önce reddettiğini
// doğrular. Zero DB write.

test.describe('Password reset (force-change) smoke', () => {
  test('must_change_password=true → ForcePasswordChange renders, weak pw rejected', async ({ page }) => {
    const mockUser = {
      id: 99998,
      name: 'E2E',
      surname: 'ForceChange',
      email: 'e2e-force-change@example.com',
      city_id: 2,
      city_name: 'Erzurum',
      is_approved: true,
      must_change_password: true,
      phone: '05551234567',
      branch: 'Test',
      work_location: 'Test',
      district: 'Test',
      avatar_url: '',
    }

    await page.addInitScript((user) => {
      localStorage.setItem('session_user', JSON.stringify(user))
    }, mockUser)

    await page.goto('/')

    // ForcePasswordChange başlık + alt yazı görünmeli — App.jsx routing'i
    // must_change_password'ü yakalayıp doğru bileşeni render ettiğinin kanıtı.
    await expect(
      page.getByRole('heading', { name: 'Şifrenizi Değiştirin', level: 2 }),
    ).toBeVisible({ timeout: 10_000 })

    await expect(page.getByText(/yöneticiniz şifrenizi sıfırladı/i)).toBeVisible()

    // Üç input + submit alanları render olmalı
    const currentInput = page.locator('input[autocomplete="current-password"]')
    const newInputs = page.locator('input[autocomplete="new-password"]')
    const submit = page.getByRole('button', { name: 'Şifreyi Güncelle' })

    await expect(currentInput).toBeVisible()
    await expect(newInputs).toHaveCount(2)
    await expect(submit).toBeVisible()

    // Zayıf şifre ile submit → isPasswordStrong false → backend hiç çağrılmaz
    await currentInput.fill('temp-password-from-admin')
    await newInputs.nth(0).fill('weakpassword')
    await newInputs.nth(1).fill('weakpassword')
    await submit.click()

    // Hata mesajı: 'Şifreniz en az 8 karakter, büyük/küçük harf, rakam ve özel karakter içermelidir.'
    await expect(
      page.getByRole('status').filter({ hasText: /şifreniz en az 8 karakter/i }),
    ).toBeVisible({ timeout: 5_000 })
  })
})

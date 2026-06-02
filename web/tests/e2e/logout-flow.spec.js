import { test, expect } from '@playwright/test'

// Regression: önce App.jsx'te local showAuth state'i login sonrası true kalıyordu;
// Çıkış yapınca isLoggedIn=false oluyor ama showAuth=true olduğu için AuthScreen
// render ediliyordu, LandingPage değil. Kullanıcı "çıkış çalışmıyor" diye algılıyordu.
// Fix (App.jsx): isLoggedIn true olduğunda useEffect ile showAuth false'a çekilir.
//
// Bu test bug'ı tam olarak repro etmek için Supabase RPC'lerini network seviyesinde
// mock'lar — gerçek login akışı tetiklenir (reload yok), showAuth=true KALIR, sonra
// çıkış'ın gerçekten LandingPage'e döndüğünü doğrular.

const FAKE_USER = {
  id: 99994,
  name: 'E2E',
  surname: 'Logout',
  email: 'e2e-logout-flow@example.com',
  city_id: 2,
  city_name: 'Erzurum',
  is_approved: true,
  phone: '05551234567',
  branch: 'Test',
  work_location: 'Test',
  district: 'Test',
}

test.describe('Logout flow', () => {
  test('login → logout without reload reverts to LandingPage', async ({ page }) => {
    // login_user_with_token → başarılı login response (session_token dahil)
    await page.route('**/rest/v1/rpc/login_user_with_token', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ ...FAKE_USER, session_token: 'fake-token-uuid' }]),
      }),
    )

    // login akışı sonrası AuthContext.loginUser users.select(must_change_password,avatar_url) yapar
    await page.route('**/rest/v1/users?select=must_change_password*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ must_change_password: false, avatar_url: '' }),
      }),
    )

    // help_seen flag — yardım ekranı ilk-girişte ana sayfayı saklamasın
    await page.addInitScript(({ id }) => {
      localStorage.setItem('help_seen_v1', JSON.stringify({ [`user:${id}`]: true }))
    }, { id: FAKE_USER.id })

    await page.goto('/')

    // 1) Landing → Giriş Yap → showAuth=true → AuthScreen
    await page.getByRole('button', { name: /giriş yap/i }).first().click()
    await expect(page.getByRole('heading', { name: 'Giriş Yap', level: 2 })).toBeVisible()

    // 2) Login formunu doldur, gönder → mock RPC yanıt verir → MainAppContainer render
    await page.locator('input[type="email"][autocomplete="email"]').fill(FAKE_USER.email)
    await page.locator('input[autocomplete="current-password"]').fill('any-password')
    await page.locator('form button[type="submit"]').first().click()

    // MainAppContainer açılmalı (showAuth hâlâ true ama isLoggedIn=true önce render)
    const logoutBtn = page.getByRole('button', { name: /çıkış/i }).first()
    await expect(logoutBtn).toBeVisible({ timeout: 10_000 })

    // 3) Çıkış'a tıkla — eski kodda showAuth=true olduğu için AuthScreen'e dönerdi.
    // Fix sonrası: isLoggedIn=true tetiklendiğinde useEffect showAuth'u false'a çekti,
    // bu yüzden çıkış'ta LandingPage render edilir.
    await logoutBtn.click()

    // 4) LandingPage'in hero CTA'sı — bug olsaydı bunun yerine "Giriş Yap" h2 görünürdü
    await expect(page.getByText('Hemen Randevu Al')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByRole('heading', { name: 'Giriş Yap', level: 2 })).toHaveCount(0)
  })
})

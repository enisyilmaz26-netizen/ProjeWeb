import { test, expect } from '@playwright/test'

const SUPABASE_URL = 'https://nspircxgtrhdcxtnvodz.supabase.co'
const ANON_KEY = 'sb_publishable_w6ogDn_vc2hgu1okx92j1w_yE0cctpZ'

async function pickCity() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cities?select=id,name&order=id&limit=1`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  const [city] = await res.json()
  if (!city) throw new Error('No cities found in DB')
  return city
}

test.describe('UserReservationScreen — single-city auto-skip', () => {
  let city

  test.beforeAll(async () => {
    city = await pickCity()
  })

  test('skips city step, lands on lab selection, breadcrumb omits "Şehir Seç"', async ({ page }) => {
    const userId = 99999
    const mockUser = {
      id: userId,
      name: 'E2E',
      surname: 'Test',
      email: 'e2e-mock@example.com',
      city_id: city.id,
      city_name: city.name,
      is_approved: true,
      must_change_password: false,
      phone: '05551234567',
      branch: 'Test',
      work_location: 'Test',
      district: 'Test',
      avatar_url: '',
    }

    // Pre-seed localStorage BEFORE app boots:
    //  - session_user  → AuthContext loads as logged-in user
    //  - help_seen_v1  → bypass first-login "Nasıl Kullanırım" screen so initial tab is 'book'
    await page.addInitScript(
      ({ user, helpKey, userKey }) => {
        localStorage.setItem('session_user', JSON.stringify(user))
        localStorage.setItem(helpKey, JSON.stringify({ [`user:${userKey}`]: true }))
      },
      { user: mockUser, helpKey: 'help_seen_v1', userKey: userId },
    )

    await page.goto('/')

    // Lab selection heading "Alan Seçiniz" must appear (means auto-skip fired)
    await expect(
      page.getByRole('heading', { name: /alan seçiniz/i, level: 2 }),
    ).toBeVisible({ timeout: 10_000 })

    // City-selection heading must NOT be present
    await expect(
      page.getByRole('heading', { name: /bulunduğunuz ili seçiniz/i, level: 2 }),
    ).toHaveCount(0)

    // Breadcrumb nav must contain the city name and must NOT contain the "Şehir Seç" label
    const nav = page.getByRole('navigation').filter({ hasText: city.name })
    await expect(nav).toBeVisible()
    await expect(nav.getByText(/bulunduğunuz ili seçiniz/i)).toHaveCount(0)
  })
})

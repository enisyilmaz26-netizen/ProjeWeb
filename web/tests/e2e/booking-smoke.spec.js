import { test, expect } from '@playwright/test'

// Bu test randevu OLUŞTURMAZ — confirm modal'ında "Vazgeç" ile çıkar.
// Asıl submit (doSubmit → submitAppointment v2 RPC) tetiklenmez,
// appointments tablosuna yazılmaz, admin'e bildirim/mail gitmez.
//
// Kapsam:
//  - Mock user (city_id=2 Erzurum) → MainAppContainer render
//  - Reservation tab auto-skip → step 2 (lab list)
//  - Labs DB'den anon SELECT ile yüklendi
//  - Lab seç → step 3 (calendar)
//  - CalendarView render + ilk uygun (Sunday/holiday/closed olmayan) günü seç
//  - Step 4 (time slots) — city_time_slots yüklendi
//  - Slot seç → step 5 (özet + kullanıcı bilgileri)
//  - Submit butonuna bas → showConfirm modal açılır
//  - "Vazgeç" → modal kapanır, randevu kaydedilmez

const SUPABASE_URL = 'https://nspircxgtrhdcxtnvodz.supabase.co'
const ANON_KEY = 'sb_publishable_w6ogDn_vc2hgu1okx92j1w_yE0cctpZ'

async function pickCityWithLabsAndSlots() {
  // Erzurum (id=2) repoda smoke için sabit bilinen şehir.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/cities?select=id,name&id=eq.2`, {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  const [city] = await res.json()
  if (!city) throw new Error('Expected city_id=2 (Erzurum) in DB')
  return city
}

async function pickEligibleDate(page) {
  // Bugünden başlayarak +1..+30 gün arası, Pazar dışı, takvimde enabled bir gün ara.
  for (let offset = 1; offset <= 30; offset++) {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    if (d.getDay() === 0) continue // Pazar
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const dateStr = `${yyyy}-${mm}-${dd}`
    const btn = page.getByRole('button', { name: dateStr })
    // getByRole, ay görünür değilse veya disabled ise bulamayabilir — try/catch:
    try {
      if (await btn.isEnabled({ timeout: 100 })) {
        return { dateStr, btn }
      }
    } catch {
      // Düğme görünür değilse (sonraki ay), continue
    }
  }
  throw new Error('30 gün içinde uygun bir tarih bulunamadı')
}

test.describe('Appointment booking smoke', () => {
  let city

  test.beforeAll(async () => {
    city = await pickCityWithLabsAndSlots()
  })

  test('mock user → pick lab → pick date → pick slot → confirm modal opens → cancel', async ({ page }) => {
    const userId = 99997
    const mockUser = {
      id: userId,
      name: 'E2E',
      surname: 'Booking',
      email: 'e2e-booking-smoke@example.com',
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

    await page.addInitScript(
      ({ user, helpKey, userKey }) => {
        localStorage.setItem('session_user', JSON.stringify(user))
        localStorage.setItem(helpKey, JSON.stringify({ [`user:${userKey}`]: true }))
      },
      { user: mockUser, helpKey: 'help_seen_v1', userKey: userId },
    )

    await page.goto('/')

    // Auto-skip → step 2 (lab seç başlığı)
    await expect(
      page.getByRole('heading', { name: /alan seçiniz/i, level: 2 }),
    ).toBeVisible({ timeout: 10_000 })

    // Lab list yüklendi → ilk lab kartına tıkla. Lab kartları <button> ve içlerinde
    // "Kapasite" yazar — heading'i hedeflemek için ilk button after heading'i alıyoruz.
    const labCard = page
      .locator('button')
      .filter({ hasText: /kapasite/i })
      .first()
    await expect(labCard).toBeVisible({ timeout: 10_000 })
    await labCard.click()

    // Step 3: tarih seçimi
    await expect(
      page.getByRole('heading', { name: /tarih seçiniz/i, level: 2 }),
    ).toBeVisible({ timeout: 5_000 })

    const { dateStr, btn: dateBtn } = await pickEligibleDate(page)
    await dateBtn.click()

    // Step 4: slot seçimi (heading: 'Saat Dilimi Seçiniz')
    await expect(
      page.getByRole('heading', { name: /saat dilimi seçiniz/i, level: 2 }),
    ).toBeVisible({ timeout: 5_000 })

    // Dolu olmayan ilk slot — slot kartı bir buton, full ise disabled.
    const slotButton = page
      .locator('button:not([disabled])')
      .filter({ hasText: /\d{2}:\d{2}\s*-\s*\d{2}:\d{2}/ })
      .first()
    await expect(slotButton).toBeVisible({ timeout: 5_000 })
    await slotButton.click()

    // Step 5: özet + submit (heading: 'Kişisel ve Rezervasyon Bilgileri')
    await expect(
      page.getByRole('heading', { name: /kişisel ve rezervasyon/i, level: 2 }),
    ).toBeVisible({ timeout: 5_000 })

    // Özet kartında seçilen tarih (DD.MM.YYYY) en az bir yerde görünmeli
    const [yyyy, mm, dd] = dateStr.split('-')
    const formattedDate = `${dd}.${mm}.${yyyy}`
    await expect(page.getByText(formattedDate).first()).toBeVisible({ timeout: 5_000 })

    // Form submit → showConfirm modal açılır (henüz RPC çağrılmadı)
    const submitBtn = page.locator('form button[type="submit"]').first()
    await submitBtn.click()

    // Confirm modal görünmeli
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible({ timeout: 5_000 })
    await expect(dialog.getByRole('heading')).toBeVisible()

    // "Vazgeç" / "Geri Dön" — modal kapanır, hiç randevu oluşmaz.
    const cancelBtn = dialog.getByRole('button', { name: /vazgeç|geri dön/i })
    await cancelBtn.click()

    await expect(dialog).toBeHidden({ timeout: 5_000 })
  })
})

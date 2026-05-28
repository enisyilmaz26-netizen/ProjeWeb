// Fixed Turkish public holidays (MM-DD, repeat every year)
const FIXED_MM_DD = ['01-01','04-23','05-01','05-19','08-30','10-29']

// Variable religious holidays (YYYY-MM-DD)
const VARIABLE = [
  // 2025 Ramazan Bayramı
  '2025-03-30','2025-03-31','2025-04-01',
  // 2025 Kurban Bayramı
  '2025-06-06','2025-06-07','2025-06-08','2025-06-09',
  // 2026 Ramazan Bayramı
  '2026-03-19','2026-03-20','2026-03-21',
  // 2026 Kurban Bayramı
  '2026-05-27','2026-05-28','2026-05-29','2026-05-30',
  // 2027 Ramazan Bayramı
  '2027-03-09','2027-03-10','2027-03-11',
  // 2027 Kurban Bayramı
  '2027-05-16','2027-05-17','2027-05-18','2027-05-19',
]

export function isTurkishHoliday(dateStr) {
  const mmdd = dateStr.slice(5)
  return FIXED_MM_DD.includes(mmdd) || VARIABLE.includes(dateStr)
}

export function isSunday(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDay() === 0
}

export function isSaturday(dateStr) {
  return new Date(dateStr + 'T12:00:00').getDay() === 6
}

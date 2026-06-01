import { STATUS_LABELS, t, getLocale } from './languages'

export const PAGE_SIZE = 50

export function statusLabel(status) {
  return STATUS_LABELS[status] || status
}

// CSV formula injection guard: Excel/LibreOffice, hücre değeri =, +, -, @ ile
// başlıyorsa formül olarak yorumlar. Bu, user-supplied alanlar (note vb.)
// üzerinden komut çalıştırılmasına izin verir. Tüm değerleri tek tırnakla
// (apostrof) prefix'leyerek başlatınca Excel literal string kabul eder.
function csvSafe(val) {
  const s = String(val ?? '')
  if (s.length === 0) return ''
  const first = s.charAt(0)
  if (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t' || first === '\r') {
    return `'${s}`
  }
  return s
}

export function exportToCSV(appts, language) {
  const headers = [
    t('input_name', language), t('input_surname', language), t('input_email', language),
    t('lbl_phone', language), t('lbl_branch', language), t('lbl_institution', language),
    t('lbl_province', language), t('lbl_district', language), t('lbl_studio', language),
    t('lbl_date', language), t('lbl_time', language), t('lbl_status', language),
    t('lbl_note', language), t('lbl_created', language),
  ]
  const rows = appts.map(a => [
    a.user_name, a.user_surname, a.user_email, a.user_phone,
    a.user_branch, a.user_work_location, a.city_name, a.user_district,
    a.lab_name, a.date, a.time_slot,
    STATUS_LABELS[a.status] || a.status,
    a.note || '',
    a.created_timestamp ? new Date(Number(a.created_timestamp)).toLocaleDateString(getLocale(language)) : '',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${csvSafe(c).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `randevular_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

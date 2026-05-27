import { STATUS_LABELS } from './languages'

export const PAGE_SIZE = 50

export function statusLabel(status, lang) {
  return STATUS_LABELS[status]?.[lang] || status
}

export function exportToCSV(appts, language) {
  const headers = language === 'TR'
    ? ['Ad', 'Soyad', 'E-posta', 'Telefon', 'Branş', 'Kurum', 'İl', 'İlçe', 'Stüdyo', 'Tarih', 'Saat', 'Durum', 'Not', 'Oluşturma']
    : ['First Name', 'Last Name', 'Email', 'Phone', 'Branch', 'Institution', 'Province', 'District', 'Studio', 'Date', 'Time', 'Status', 'Note', 'Created']
  const rows = appts.map(a => [
    a.user_name, a.user_surname, a.user_email, a.user_phone,
    a.user_branch, a.user_work_location, a.city_name, a.user_district,
    a.lab_name, a.date, a.time_slot,
    STATUS_LABELS[a.status]?.[language] || a.status,
    a.note || '',
    a.created_timestamp ? new Date(Number(a.created_timestamp)).toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB') : '',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `randevular_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { PAGE_SIZE } from '../../lib/adminHelpers'
import { t } from '../../lib/languages'
import { ShieldCheck, RefreshCw, Search, Download } from 'lucide-react'

const ACTION_LABELS = {
  APPROVE_APPOINTMENT:  { TR: 'Randevu Onaylandı',        EN: 'Appointment Approved' },
  CANCEL_APPOINTMENT:   { TR: 'Randevu İptal Edildi',     EN: 'Appointment Cancelled' },
  COMPLETE_APPOINTMENT: { TR: 'Randevu Tamamlandı',       EN: 'Appointment Completed' },
  APPROVE_USER:         { TR: 'Üye Onaylandı',            EN: 'User Approved' },
  REVOKE_USER:          { TR: 'Üye Silindi',              EN: 'User Revoked' },
  RESET_USER_PASSWORD:  { TR: 'Kullanıcı Şifresi Sıfırlandı', EN: 'User Password Reset' },
  ADD_ADMIN:            { TR: 'Yönetici Eklendi',         EN: 'Admin Added' },
  DELETE_ADMIN:         { TR: 'Yönetici Silindi',         EN: 'Admin Deleted' },
  RESET_ADMIN_PASSWORD:    { TR: 'Yönetici Şifresi Sıfırlandı', EN: 'Admin Password Reset' },
  DENY_CANCELLATION:       { TR: 'İptal Talebi Reddedildi',   EN: 'Cancellation Denied' },
  USER_CANCEL_APPOINTMENT: { TR: 'Kullanıcı Randevu İptal',   EN: 'User Cancelled Appointment' },
  USER_REQUEST_CANCELLATION: { TR: 'Kullanıcı İptal Talebi',  EN: 'User Requested Cancellation' },
  CLEAR_NOTIFICATIONS:       { TR: 'Bildirimler Temizlendi',  EN: 'Notifications Cleared' },
}

const ACTION_COLORS = {
  APPROVE_APPOINTMENT:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  CANCEL_APPOINTMENT:   'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  COMPLETE_APPOINTMENT: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  APPROVE_USER:         'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  REVOKE_USER:          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  RESET_USER_PASSWORD:  'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  ADD_ADMIN:            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  DELETE_ADMIN:         'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  RESET_ADMIN_PASSWORD:    'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  DENY_CANCELLATION:       'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400',
  USER_CANCEL_APPOINTMENT: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  USER_REQUEST_CANCELLATION: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  CLEAR_NOTIFICATIONS:       'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400',
}

function formatDateTime(iso, language) {
  if (!iso) return '—'
  const d = new Date(iso)
  const locale = language === 'TR' ? 'tr-TR' : 'en-GB'
  return d.toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AuditTab({ language }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filterAction, setFilterAction] = useState('')
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
    if (data) setLogs(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = logs.filter(l => {
    if (filterAction && l.action !== filterAction) return false
    if (dateFrom && l.created_at && l.created_at.substring(0, 10) < dateFrom) return false
    if (dateTo && l.created_at && l.created_at.substring(0, 10) > dateTo) return false
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      if (
        !(l.actor_name || '').toLowerCase().includes(q) &&
        !(l.actor_email || '').toLowerCase().includes(q) &&
        !(l.details || '').toLowerCase().includes(q)
      ) return false
    }
    return true
  })

  const downloadCSV = () => {
    const escapeField = (val) => {
      const str = val == null ? '' : String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }
    const headers = language === 'TR'
      ? ['Tarih', 'İşlem', 'Detay', 'Yetkili', 'Rol', 'E-posta']
      : ['Date', 'Action', 'Details', 'Actor', 'Role', 'Email']
    const rows = filtered.map(l => [
      formatDateTime(l.created_at, language),
      ACTION_LABELS[l.action]?.[language] || l.action,
      l.details || '',
      l.actor_name || '',
      l.actor_role || '',
      l.actor_email || '',
    ].map(escapeField).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            {language === 'TR' ? 'Denetim Kaydı' : 'Audit Log'}
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">({filtered.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCSV}
            disabled={filtered.length === 0}
            className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            {language === 'TR' ? 'CSV İndir' : 'Download CSV'}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition inline-flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {language === 'TR' ? 'Yenile' : 'Refresh'}
          </button>
        </div>
      </div>

      <select
        className="w-full mb-3 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC]"
        value={filterAction}
        onChange={e => { setFilterAction(e.target.value); setVisibleCount(PAGE_SIZE) }}
      >
        <option value="">{language === 'TR' ? 'Tüm İşlemler' : 'All Actions'}</option>
        {Object.entries(ACTION_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label[language]}</option>
        ))}
      </select>

      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">{language === 'TR' ? 'Tarih:' : 'Date:'}</span>
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={e => { setDateFrom(e.target.value); setVisibleCount(PAGE_SIZE) }}
          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC]"
        />
        <span className="text-xs text-gray-400">—</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={e => { setDateTo(e.target.value); setVisibleCount(PAGE_SIZE) }}
          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC]"
        />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setVisibleCount(PAGE_SIZE) }} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline">
            {language === 'TR' ? 'Temizle' : 'Clear'}
          </button>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder={t('audit_search_placeholder', language)}
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setVisibleCount(PAGE_SIZE) }}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC]"
        />
      </div>

      {loading ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-400 text-sm">
          {language === 'TR' ? 'Yükleniyor...' : 'Loading...'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
          {language === 'TR' ? 'Kayıt bulunamadı.' : 'No records found.'}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.slice(0, visibleCount).map(log => (
              <div key={log.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-lg flex-shrink-0 ${ACTION_COLORS[log.action] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                    {ACTION_LABELS[log.action]?.[language] || log.action}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {formatDateTime(log.created_at, language)}
                  </span>
                </div>
                {log.details && (
                  <p className="text-xs text-gray-700 dark:text-gray-300 mb-1 truncate">{log.details}</p>
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {log.actor_name}
                  {log.actor_role && ` · ${log.actor_role}`}
                  {log.actor_email && ` · ${log.actor_email}`}
                </p>
              </div>
            ))}
          </div>
          {filtered.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
              className="w-full mt-3 py-3 border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 text-[#1565C0] dark:text-[#7DD4FC] rounded-xl text-sm font-medium hover:bg-[#1565C0]/5 transition"
            >
              {t('show_more', language)} ({filtered.length - visibleCount} {t('remaining', language)})
            </button>
          )}
        </>
      )}
    </div>
  )
}

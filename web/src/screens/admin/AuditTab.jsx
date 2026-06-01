import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { PAGE_SIZE } from '../../lib/adminHelpers'
import { t, getLocale } from '../../lib/languages'
import { ShieldCheck, RefreshCw, Search, Download } from 'lucide-react'

const ACTION_LABELS = {
  APPROVE_APPOINTMENT:       'Randevu Onaylandı',
  CANCEL_APPOINTMENT:        'Randevu İptal Edildi',
  COMPLETE_APPOINTMENT:      'Randevu Tamamlandı',
  APPROVE_USER:              'Üye Onaylandı',
  REVOKE_USER:               'Üye Silindi',
  RESET_USER_PASSWORD:       'Kullanıcı Şifresi Sıfırlandı',
  ADD_ADMIN:                 'Yönetici Eklendi',
  DELETE_ADMIN:              'Yönetici Silindi',
  RESET_ADMIN_PASSWORD:      'Yönetici Şifresi Sıfırlandı',
  DENY_CANCELLATION:         'İptal Talebi Reddedildi',
  USER_CANCEL_APPOINTMENT:   'Kullanıcı Randevu İptal',
  USER_REQUEST_CANCELLATION: 'Kullanıcı İptal Talebi',
  CLEAR_NOTIFICATIONS:       'Bildirimler Temizlendi',
  RESCHEDULE_APPOINTMENT:    'Randevu Yeniden Planlandı',
  EDIT_ADMIN:                'Yönetici Güncellendi',
  ADD_USER_BY_ADMIN:         'Kullanıcı Oluşturuldu (Admin)',
  ADD_LAB:                   'Lab Oluşturuldu',
  UPDATE_LAB:                'Lab Güncellendi',
  ADD_WORKSHOP:              'Atölye Oluşturuldu',
  UPDATE_WORKSHOP:           'Atölye Güncellendi',
  DELETE_WORKSHOP:           'Atölye Silindi',
  ADD_CLOSED_DAY:            'Kapalı Gün Eklendi',
  REMOVE_CLOSED_DAY:         'Kapalı Gün Kaldırıldı',
  ADD_TIME_SLOT:             'Saat Dilimi Eklendi',
  REMOVE_TIME_SLOT:          'Saat Dilimi Kaldırıldı',
  REGISTER_WORKSHOP:         'Atölye Kaydı Oluşturuldu',
  UNREGISTER_WORKSHOP:       'Atölye Kaydı İptal Edildi',
  REMOVE_WORKSHOP_REG:       'Atölye Kaydı Silindi (Admin)',
  DELETE_LAB:                'Lab Silindi',
  EMAIL_FAILED:              'E-posta Gönderilemedi',
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
  RESCHEDULE_APPOINTMENT:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  EDIT_ADMIN:                'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  ADD_USER_BY_ADMIN:         'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  ADD_LAB:                   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  UPDATE_LAB:                'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  ADD_WORKSHOP:              'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  UPDATE_WORKSHOP:           'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  DELETE_WORKSHOP:           'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  ADD_CLOSED_DAY:            'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  REMOVE_CLOSED_DAY:         'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400',
  ADD_TIME_SLOT:             'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  REMOVE_TIME_SLOT:          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  REGISTER_WORKSHOP:         'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  UNREGISTER_WORKSHOP:       'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  REMOVE_WORKSHOP_REG:       'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  DELETE_LAB:                'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
}

function formatDateTime(iso, language) {
  if (!iso) return '-'
  const d = new Date(iso)
  const locale = getLocale(language)
  return d.toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const SERVER_PAGE = 200

export default function AuditTab({ language }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filterAction, setFilterAction] = useState('')
  const [searchText, setSearchText] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [totalCount, setTotalCount] = useState(0)
  const [fetchingMore, setFetchingMore] = useState(false)
  const [reachedEnd, setReachedEnd] = useState(false)

  const load = async () => {
    setLoading(true)
    setLoadError(false)
    setReachedEnd(false)
    try {
      const { data, error, count } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(0, SERVER_PAGE - 1)
      if (error) { console.error('[AuditTab] load failed:', error); setLoadError(true); return }
      if (data) {
        setLogs(data)
        if (data.length < SERVER_PAGE) setReachedEnd(true)
      }
      if (typeof count === 'number') setTotalCount(count)
    } catch (err) {
      console.error('[AuditTab] load exception:', err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  const loadMoreFromServer = async () => {
    if (fetchingMore || reachedEnd) return
    setFetchingMore(true)
    try {
      const from = logs.length
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + SERVER_PAGE - 1)
      if (error) { console.error('[AuditTab] loadMore failed:', error); return }
      if (data) {
        setLogs(prev => [...prev, ...data])
        if (data.length < SERVER_PAGE) setReachedEnd(true)
      }
    } finally {
      setFetchingMore(false)
    }
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
      let str = val == null ? '' : String(val)
      // CSV formula injection guard
      if (str.length > 0) {
        const first = str.charAt(0)
        if (first === '=' || first === '+' || first === '-' || first === '@' || first === '\t' || first === '\r') {
          str = `'${str}`
        }
      }
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"'
      }
      return str
    }
    const headers = [
      t('lbl_date', language), t('lbl_action', language), t('lbl_details', language),
      t('lbl_actor', language), t('lbl_role', language), t('input_email', language),
    ]
    const rows = filtered.map(l => [
      formatDateTime(l.created_at, language),
      ACTION_LABELS[l.action] || l.action,
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
          <ShieldCheck className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" aria-hidden="true" />
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
            {t('lbl_audit_log', language)}
          </h3>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            ({filtered.length}{totalCount > logs.length ? ` / ${totalCount}` : ''})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadCSV}
            disabled={filtered.length === 0}
            className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition inline-flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            {t('export_csv', language)}
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition inline-flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            {t('btn_refresh', language)}
          </button>
        </div>
      </div>

      {loadError && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-3">
          {t('err_load_audit', language)}
        </p>
      )}

      <select
        aria-label={t('filter_all_actions', language)}
        className="w-full mb-3 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC]"
        value={filterAction}
        onChange={e => { setFilterAction(e.target.value); setVisibleCount(PAGE_SIZE) }}
      >
        <option value="">{t('filter_all_actions', language)}</option>
        {Object.entries(ACTION_LABELS).map(([key, label]) => (
          <option key={key} value={key}>{label[language]}</option>
        ))}
      </select>

      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <span className="text-xs text-gray-500 dark:text-gray-400">{t('lbl_date_colon', language)}</span>
        <input
          type="date"
          aria-label={t('filter_date_from', language)}
          value={dateFrom}
          max={dateTo || undefined}
          onChange={e => { setDateFrom(e.target.value); setVisibleCount(PAGE_SIZE) }}
          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC]"
        />
        <span className="text-xs text-gray-400">—</span>
        <input
          type="date"
          aria-label={t('filter_date_to', language)}
          value={dateTo}
          min={dateFrom || undefined}
          onChange={e => { setDateTo(e.target.value); setVisibleCount(PAGE_SIZE) }}
          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC]"
        />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setVisibleCount(PAGE_SIZE) }} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline">
            {t('btn_clear', language)}
          </button>
        )}
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
        <input
          type="text"
          aria-label={t('audit_search_placeholder', language)}
          placeholder={t('audit_search_placeholder', language)}
          value={searchText}
          onChange={e => { setSearchText(e.target.value); setVisibleCount(PAGE_SIZE) }}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC]"
        />
      </div>

      {loading ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-400 text-sm">
          {t('loading', language)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-400 dark:text-gray-500 text-sm">
          {t('no_records_found', language)}
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {filtered.slice(0, visibleCount).map(log => (
              <div key={log.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-lg flex-shrink-0 ${ACTION_COLORS[log.action] || 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                    {ACTION_LABELS[log.action] || log.action}
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
          {!reachedEnd && filtered.length === logs.length && (
            <button
              onClick={loadMoreFromServer}
              disabled={fetchingMore}
              className="w-full mt-2 py-2.5 border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 rounded-xl text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
            >
              {fetchingMore ? '...' : t('audit_fetch_more_from_server', language)}
            </button>
          )}
        </>
      )}
    </div>
  )
}

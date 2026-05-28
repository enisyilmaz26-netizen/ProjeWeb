import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { PAGE_SIZE } from '../../lib/adminHelpers'
import { t } from '../../lib/languages'
import { ShieldCheck, RefreshCw } from 'lucide-react'

const ACTION_LABELS = {
  APPROVE_APPOINTMENT:  { TR: 'Randevu Onaylandı',        EN: 'Appointment Approved' },
  CANCEL_APPOINTMENT:   { TR: 'Randevu İptal Edildi',     EN: 'Appointment Cancelled' },
  COMPLETE_APPOINTMENT: { TR: 'Randevu Tamamlandı',       EN: 'Appointment Completed' },
  APPROVE_USER:         { TR: 'Üye Onaylandı',            EN: 'User Approved' },
  REVOKE_USER:          { TR: 'Üye Silindi',              EN: 'User Revoked' },
  RESET_USER_PASSWORD:  { TR: 'Kullanıcı Şifresi Sıfırlandı', EN: 'User Password Reset' },
  ADD_ADMIN:            { TR: 'Yönetici Eklendi',         EN: 'Admin Added' },
  DELETE_ADMIN:         { TR: 'Yönetici Silindi',         EN: 'Admin Deleted' },
  RESET_ADMIN_PASSWORD: { TR: 'Yönetici Şifresi Sıfırlandı', EN: 'Admin Password Reset' },
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
  RESET_ADMIN_PASSWORD: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AuditTab({ language }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [filterAction, setFilterAction] = useState('')

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

  const filtered = filterAction ? logs.filter(l => l.action === filterAction) : logs

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
        <button
          onClick={load}
          disabled={loading}
          className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition inline-flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {language === 'TR' ? 'Yenile' : 'Refresh'}
        </button>
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
                    {formatDateTime(log.created_at)}
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

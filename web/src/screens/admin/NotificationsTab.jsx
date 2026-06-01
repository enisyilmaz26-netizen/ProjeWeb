import { useState, useRef, useEffect, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { t, getLocale } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { Trash2, Mail } from 'lucide-react'

const TYPE_COLORS = {
  SYSTEM:   'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  REMINDER: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  ALERT:    'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
}

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

export default function NotificationsTab({ language, isGlobal, adminCityId }) {
  const { cities, users, notifications, createNotification, deleteNotification, sendEmail } = useApp()
  const inputClass = INPUT_BASE

  const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'SYSTEM' })
  const [notifCity, setNotifCity] = useState('')
  const [sendAsEmail, setSendAsEmail] = useState(true)
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifSuccess, setNotifSuccess] = useState('')
  const successTimerRef = useRef(null)
  const [notifError, setNotifError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const targetRecipients = useMemo(() => {
    return users.filter(u => {
      if (!u.is_approved || !u.email) return false
      if (isGlobal) {
        if (!notifCity) return true
        return String(u.city_id) === String(notifCity)
      }
      return String(u.city_id) === String(adminCityId)
    })
  }, [users, isGlobal, notifCity, adminCityId])

  useEffect(() => () => clearTimeout(successTimerRef.current), [])

  const handleCreateNotification = async (e) => {
    e.preventDefault()
    setNotifError('')
    if (!notifForm.title.trim() || !notifForm.message.trim()) {
      setNotifError(t('notif_required_fields', language))
      return
    }
    setNotifLoading(true)
    // Strip ALL [...] occurrences so admins can't spoof any city tag
    const rawTitle = notifForm.title.replace(/\[[^\]]*\]/g, '').trim()
    const rawMessage = notifForm.message.trim()
    let finalTitle = rawTitle
    if (isGlobal && notifCity) {
      const cityObj = cities.find(c => String(c.id) === String(notifCity))
      if (cityObj) finalTitle = `[${cityObj.name}] ${rawTitle}`
    } else if (!isGlobal && adminCityId) {
      const cityObj = cities.find(c => String(c.id) === String(adminCityId))
      if (cityObj) finalTitle = `[${cityObj.name}] ${rawTitle}`
    }
    try {
      const result = await createNotification({ ...notifForm, title: finalTitle, message: rawMessage })
      if (!result.success) {
        setNotifError(t('err_generic', language))
        return
      }

      let emailResultText = ''
      if (sendAsEmail && targetRecipients.length > 0) {
        const recipients = targetRecipients.map(u => ({
          email: u.email,
          name: `${u.name || ''} ${u.surname || ''}`.trim() || u.email,
        }))
        const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px;color:#1a1a1a;padding:32px;max-width:600px;margin:0 auto">
          <div style="border-top:4px solid #1565C0;padding-top:20px;margin-bottom:24px">
            <p style="font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.1em;margin:0">MEB ÖGEDEP</p>
          </div>
          <h2 style="font-size:18px;color:#1a1a1a;margin:0 0 16px 0">${escapeHtml(rawTitle)}</h2>
          <p style="white-space:pre-wrap;line-height:1.6">${escapeHtml(rawMessage)}</p>
          <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px">
            <p style="font-size:11px;color:#9ca3af;margin:0">${t('email_footer_auto', language)}</p>
          </div>
        </body></html>`

        setNotifSuccess(t('notif_email_sending', language))
        const emailRes = await sendEmail({ recipients, subject: rawTitle, html })
        if (emailRes.success) {
          emailResultText = ' — ' + t('notif_email_result', language)
            .replace('{sent}', emailRes.sent ?? 0)
            .replace('{failed}', emailRes.failed ?? 0)
        }
      }

      setNotifForm({ title: '', message: '', type: 'SYSTEM' })
      setNotifCity('')
      setNotifSuccess(t('notif_sent', language) + emailResultText)
      clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setNotifSuccess(''), 5000)
    } catch {
      setNotifError(t('err_generic', language))
    } finally {
      setNotifLoading(false)
    }
  }

  const handleDeleteNotification = async (id) => {
    setDeletingId(id)
    try {
      await deleteNotification(id)
    } finally {
      setDeletingId(null)
    }
  }

  const visibleHistory = notifications.filter(n => {
    if (!isGlobal && adminCityId) {
      const city = cities.find(c => String(c.id) === String(adminCityId))
      if (city) return (n.title || '').includes(city.name) || !(n.title || '').includes('[')
    }
    return true
  })

  return (
    <div>
      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('notif_new', language)}</h3>
      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
        <form onSubmit={handleCreateNotification} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_lbl_type', language)}</label>
            <select aria-label={t('notif_lbl_type', language)} className={`${inputClass} w-full`} value={notifForm.type} onChange={e => setNotifForm(p => ({ ...p, type: e.target.value }))}>
              <option value="SYSTEM">{t('notif_type_system', language)}</option>
              <option value="REMINDER">{t('notif_type_reminder', language)}</option>
              <option value="ALERT">{t('notif_type_alert', language)}</option>
            </select>
          </div>
          {isGlobal && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_target_city', language)}</label>
              <select aria-label={t('notif_target_city', language)} className={`${inputClass} w-full`} value={notifCity} onChange={e => setNotifCity(e.target.value)}>
                <option value="">{t('notif_target_all', language)}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {notifCity && (
                <p className="text-xs text-[#1565C0] dark:text-[#7DD4FC] mt-1">{t('notif_city_only_hint', language)}</p>
              )}
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_lbl_title', language)} *</label>
            <input type="text" aria-label={t('notif_lbl_title', language)} className={`${inputClass} w-full`} value={notifForm.title} onChange={e => setNotifForm(p => ({ ...p, title: e.target.value }))} required placeholder={t('notif_title_placeholder', language)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_lbl_message', language)} *</label>
            <textarea aria-label={t('notif_lbl_message', language)} className={`${inputClass} w-full resize-none`} rows={4} value={notifForm.message} onChange={e => setNotifForm(p => ({ ...p, message: e.target.value }))} required placeholder={t('notif_msg_placeholder', language)} />
          </div>

          <label className="flex items-start gap-2 cursor-pointer p-3 rounded-xl bg-[#1565C0]/5 dark:bg-[#7DD4FC]/5 border border-[#1565C0]/20 dark:border-[#7DD4FC]/20">
            <input
              type="checkbox"
              checked={sendAsEmail}
              onChange={e => setSendAsEmail(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#1565C0] dark:accent-[#7DD4FC] cursor-pointer"
            />
            <span className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                {t('notif_send_email_label', language)}
              </span>
              <span className="block text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {targetRecipients.length > 0
                  ? t('notif_email_recipients_count', language).replace('{n}', targetRecipients.length)
                  : t('notif_email_no_recipients', language)}
              </span>
            </span>
          </label>

          {notifError && <p role="status" aria-live="polite" className="text-red-500 dark:text-red-400 text-xs">{notifError}</p>}
          {notifSuccess && <p role="status" aria-live="polite" className="text-green-600 dark:text-green-400 text-xs font-medium">{notifSuccess}</p>}
          <button type="submit" disabled={notifLoading} className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-60">
            {notifLoading ? '...' : t('notif_send_btn', language)}
          </button>
        </form>
      </div>

      <div className="mt-6">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">
          {t('notif_history_title', language)}
          <span className="ml-1.5 text-gray-400 dark:text-gray-500 font-normal">({visibleHistory.length})</span>
        </h3>
        {visibleHistory.length === 0 ? (
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
            {t('notif_history_empty', language)}
          </div>
        ) : (
          <div className="space-y-2">
            {visibleHistory.map(n => (
              <div key={n.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${TYPE_COLORS[n.type] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}`}>
                      {n.type}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {n.timestamp ? new Date(n.timestamp).toLocaleString(getLocale(language), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{n.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
                </div>
                <button
                  onClick={() => handleDeleteNotification(n.id)}
                  disabled={deletingId === n.id}
                  className="flex-shrink-0 p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition disabled:opacity-40"
                  aria-label={t('btn_delete', language)}
                  title={t('btn_delete', language)}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

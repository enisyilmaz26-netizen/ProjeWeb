import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'

export default function NotificationsTab({ language, isGlobal, adminCityId }) {
  const { cities, createNotification } = useApp()
  const inputClass = INPUT_BASE

  const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'SYSTEM' })
  const [notifCity, setNotifCity] = useState('')
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifSuccess, setNotifSuccess] = useState('')
  const [notifError, setNotifError] = useState('')

  const handleCreateNotification = async (e) => {
    e.preventDefault()
    setNotifError('')
    if (!notifForm.title.trim() || !notifForm.message.trim()) {
      setNotifError(t('notif_required_fields', language))
      return
    }
    setNotifLoading(true)
    let finalTitle = notifForm.title
    if (isGlobal && notifCity) {
      const cityObj = cities.find(c => String(c.id) === String(notifCity))
      if (cityObj) finalTitle = `[${cityObj.name}] ${notifForm.title}`
    } else if (!isGlobal && adminCityId) {
      const cityObj = cities.find(c => String(c.id) === String(adminCityId))
      if (cityObj) finalTitle = `[${cityObj.name}] ${notifForm.title}`
    }
    const result = await createNotification({ ...notifForm, title: finalTitle })
    setNotifLoading(false)
    if (result.success) {
      setNotifForm({ title: '', message: '', type: 'SYSTEM' })
      setNotifCity('')
      setNotifSuccess(t('notif_sent', language))
      setTimeout(() => setNotifSuccess(''), 3000)
    } else {
      setNotifError(result.error || 'Error')
    }
  }

  return (
    <div>
      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('notif_new', language)}</h3>
      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
        <form onSubmit={handleCreateNotification} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_lbl_type', language)}</label>
            <select className={`${inputClass} w-full`} value={notifForm.type} onChange={e => setNotifForm(p => ({ ...p, type: e.target.value }))}>
              <option value="SYSTEM">{t('notif_type_system', language)}</option>
              <option value="REMINDER">{t('notif_type_reminder', language)}</option>
              <option value="ALERT">{t('notif_type_alert', language)}</option>
            </select>
          </div>
          {isGlobal && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_target_city', language)}</label>
              <select className={`${inputClass} w-full`} value={notifCity} onChange={e => setNotifCity(e.target.value)}>
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
            <input type="text" className={`${inputClass} w-full`} value={notifForm.title} onChange={e => setNotifForm(p => ({ ...p, title: e.target.value }))} required placeholder={t('notif_title_placeholder', language)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_lbl_message', language)} *</label>
            <textarea className={`${inputClass} w-full resize-none`} rows={4} value={notifForm.message} onChange={e => setNotifForm(p => ({ ...p, message: e.target.value }))} required placeholder={t('notif_msg_placeholder', language)} />
          </div>
          {notifError && <p className="text-red-500 dark:text-red-400 text-xs">{notifError}</p>}
          {notifSuccess && <p className="text-green-600 dark:text-green-400 text-xs font-medium">{notifSuccess}</p>}
          <button type="submit" disabled={notifLoading} className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-60">
            {notifLoading ? '...' : t('notif_send_btn', language)}
          </button>
        </form>
      </div>
    </div>
  )
}

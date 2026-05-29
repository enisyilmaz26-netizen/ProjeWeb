import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { t, formatTimestamp } from '../lib/languages'
import { AlertTriangle, Clock, Lightbulb, Bell, Calendar, Search, Trash2 } from 'lucide-react'

export default function NotificationCenterScreen() {
  const { notifications, loggedInAdmin, loggedInUser, clearNotifications, markNotificationsRead, deleteNotification, language, cities } = useApp()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [notifSearch, setNotifSearch] = useState('')
  const [notifType, setNotifType] = useState('')

  // Filtering is handled in AppContext (visibleNotifications); notifications here is already
  // scoped to the current user's city. We only need the city name for the clear action.
  const adminCity = cities.find(c => String(c.id) === String(loggedInAdmin?.city_id))
  const cityName = (loggedInAdmin?.role === 'CITY' && adminCity) ? adminCity.name : null

  const visibleNotifications = notifications.filter(n => {
    if (notifType && n.type !== notifType) return false
    if (notifSearch.trim()) {
      const q = notifSearch.toLowerCase()
      return (n.title || '').toLowerCase().includes(q) || (n.message || '').toLowerCase().includes(q)
    }
    return true
  })

  useEffect(() => {
    const unreadIds = visibleNotifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length > 0) markNotificationsRead(unreadIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications])

  const handleClearAll = async () => {
    await clearNotifications(cityName)
    setShowClearConfirm(false)
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    await deleteNotification(id)
    setDeletingId(null)
  }

  useEffect(() => {
    if (!showClearConfirm) return
    const handler = (e) => { if (e.key === 'Escape') setShowClearConfirm(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showClearConfirm])

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ALERT': return <AlertTriangle className="w-5 h-5 text-red-500" />
      case 'REMINDER': return <Clock className="w-5 h-5 text-orange-500" />
      case 'SYSTEM': return <Lightbulb className="w-5 h-5 text-blue-500" />
      case 'APPOINTMENT': return <Calendar className="w-5 h-5 text-green-500" />
      default: return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('notifications_header', language)}</h2>
        {notifications.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs text-red-500 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium"
          >
            {t('clear_notifications', language)}
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t('notif_search_placeholder', language)}
            value={notifSearch}
            onChange={e => setNotifSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC]"
          />
        </div>
        <select
          value={notifType}
          onChange={e => setNotifType(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0D1E3D] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC]"
        >
          <option value="">{language === 'TR' ? 'Tüm Türler' : 'All Types'}</option>
          <option value="APPOINTMENT">{language === 'TR' ? 'Randevu' : 'Appointment'}</option>
          <option value="SYSTEM">{language === 'TR' ? 'Sistem' : 'System'}</option>
          <option value="ALERT">{language === 'TR' ? 'Uyarı' : 'Alert'}</option>
          <option value="REMINDER">{language === 'TR' ? 'Hatırlatma' : 'Reminder'}</option>
        </select>
      </div>

      {visibleNotifications.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-12 text-center">
          <div className="mb-3 flex justify-center text-gray-400 dark:text-gray-500"><Bell className="w-10 h-10" /></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('notifications_empty', language)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleNotifications.map(notif => (
            <div
              key={notif.id}
              className={`rounded-2xl shadow p-4 border-l-4 ${
                notif.type === 'ALERT'
                  ? 'bg-red-50 dark:bg-red-900/10 border-red-500'
                  : notif.type === 'REMINDER'
                  ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500'
                  : 'bg-white dark:bg-[#0D1E3D] border-[#1565C0] dark:border-[#7DD4FC]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 mt-0.5" aria-hidden="true">{getTypeIcon(notif.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm ${notif.type === 'ALERT' ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                      {(notif.title || '').replace(/^\[[^\]]+\]\s*/, '')}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatTimestamp(notif.timestamp)}</span>
                      <button
                        onClick={() => handleDelete(notif.id)}
                        disabled={deletingId === notif.id}
                        className="text-gray-400 hover:text-red-500 transition disabled:opacity-50"
                        title={language === 'TR' ? 'Sil' : 'Delete'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className={`text-xs mt-1 ${notif.type === 'ALERT' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    {notif.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Clear confirm modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-2">
              {t('clear_notifications', language)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {cityName
                ? (language === 'TR'
                    ? `Yalnızca "${cityName}" iline ait bildirimler kalıcı olarak silinecek. Emin misiniz?`
                    : `Only notifications for "${cityName}" will be permanently deleted. Are you sure?`)
                : t('clear_notifications_confirm', language)}
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClearAll}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition"
              >
                {t('btn_yes', language)}, {t('clear_notifications', language)}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {t('btn_nevermind', language)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

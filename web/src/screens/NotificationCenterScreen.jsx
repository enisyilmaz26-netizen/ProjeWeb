import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { t, formatTimestamp } from '../lib/languages'

export default function NotificationCenterScreen() {
  const { notifications, loggedInAdmin, loggedInUser, clearNotifications, markNotificationsRead, language, cities } = useApp()
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  // Filtering is handled in AppContext (visibleNotifications); notifications here is already
  // scoped to the current user's city. We only need the city name for the clear action.
  const adminCity = cities.find(c => String(c.id) === String(loggedInAdmin?.city_id))
  const cityName = (loggedInAdmin?.role === 'CITY' && adminCity) ? adminCity.name : null

  const visibleNotifications = notifications

  useEffect(() => {
    const unreadIds = visibleNotifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length > 0) markNotificationsRead(unreadIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClearAll = async () => {
    await clearNotifications(cityName)
    setShowClearConfirm(false)
  }

  useEffect(() => {
    if (!showClearConfirm) return
    const handler = (e) => { if (e.key === 'Escape') setShowClearConfirm(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showClearConfirm])

  const getTypeIcon = (type) => {
    switch (type) {
      case 'ALERT': return '🚨'
      case 'REMINDER': return '⏰'
      case 'SYSTEM': return '💡'
      default: return '🔔'
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('notifications_header', language)}</h2>
        {visibleNotifications.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-xs text-red-500 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium"
          >
            {t('clear_notifications', language)}
          </button>
        )}
      </div>

      {visibleNotifications.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-12 text-center">
          <div className="text-4xl mb-3">🔔</div>
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
                <span className="text-xl flex-shrink-0 mt-0.5" aria-hidden="true">{getTypeIcon(notif.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm ${notif.type === 'ALERT' ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                      {(notif.title || '').replace(/^\[[^\]]+\]\s*/, '')}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{formatTimestamp(notif.timestamp)}</span>
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
              {t('clear_notifications_confirm', language)}
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

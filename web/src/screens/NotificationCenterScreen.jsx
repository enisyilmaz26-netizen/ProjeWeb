import React, { useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { t, formatTimestamp } from '../lib/languages'

export default function NotificationCenterScreen() {
  const { notifications, loggedInAdmin, clearNotifications, markNotificationsRead, language } = useApp()

  const cityName = (loggedInAdmin?.role === 'CITY' && loggedInAdmin?.city_name) ? loggedInAdmin.city_name : null

  let visibleNotifications = notifications
  if (cityName) {
    visibleNotifications = notifications.filter(n =>
      (n.title || '').includes(cityName) || (n.message || '').includes(cityName)
    )
  }

  // Mark visible unread notifications as read when screen opens
  useEffect(() => {
    const unreadIds = visibleNotifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length > 0) {
      markNotificationsRead(unreadIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleClearAll = async () => {
    if (!window.confirm(language === 'TR' ? 'Tüm bildirimler silinsin mi?' : 'Clear all notifications?')) return
    await clearNotifications(cityName)
  }

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
            onClick={handleClearAll}
            className="text-xs text-red-500 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition font-medium"
          >
            {t('clear_notifications', language)}
          </button>
        )}
      </div>

      {visibleNotifications.length === 0 ? (
        <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-12 text-center">
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
                  : 'bg-white dark:bg-[#1D1B20] border-[#6750A4] dark:border-[#D0BCFF]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{getTypeIcon(notif.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`font-semibold text-sm ${notif.type === 'ALERT' ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'}`}>
                      {notif.title}
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
    </div>
  )
}

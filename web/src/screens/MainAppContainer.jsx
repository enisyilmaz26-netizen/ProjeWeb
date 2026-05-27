import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { t } from '../lib/languages'
import UserReservationScreen from './UserReservationScreen'
import AdminPanelScreen from './AdminPanelScreen'
import MyProfileScreen from './MyProfileScreen'
import NotificationCenterScreen from './NotificationCenterScreen'

export default function MainAppContainer() {
  const { loggedInUser, loggedInAdmin, language, isDarkMode, toggleDarkMode, toggleLanguage, logout, notifications, loading, loadError } = useApp()
  const isAdmin = loggedInAdmin !== null
  const [activeTab, setActiveTab] = useState(isAdmin ? 'admin' : 'book')

  const displayName = isAdmin
    ? (loggedInAdmin.name || loggedInAdmin.email)
    : (loggedInUser ? `${loggedInUser.name} ${loggedInUser.surname}` : '')

  const unreadCount = notifications.filter(n => !n.is_read).length

  const userTabs = [
    { key: 'book', label: t('tab_book', language), icon: '📅' },
    { key: 'profile', label: t('tab_profile', language), icon: '👤' },
    { key: 'notifications', label: t('tab_notifications', language), icon: '🔔' },
  ]
  const adminTabs = [
    { key: 'admin', label: t('tab_admin', language), icon: '⚙️' },
    { key: 'notifications', label: t('tab_notifications', language), icon: '🔔' },
  ]
  const tabs = isAdmin ? adminTabs : userTabs

  return (
    <div className="min-h-screen flex flex-col bg-[#EFF8FF] dark:bg-[#060E26]">
      {/* Top Navigation Bar */}
      <header className="bg-[#1565C0] dark:bg-[#061A3A] shadow sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          {/* Left: user info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-white text-xs font-medium truncate hidden sm:block max-w-[120px]">{displayName}</span>
          </div>

          {/* Center: title */}
          <div className="text-center flex-1 min-w-0">
            <h1 className="text-white font-bold text-sm leading-tight truncate">{t('app_title', language)}</h1>
            <p className="text-blue-200 dark:text-[#7DD4FC] text-xs truncate hidden sm:block">{t('app_subtitle', language)}</p>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={toggleLanguage}
              aria-label={t('toggle_lang', language)}
              className="text-white border border-white/40 rounded-lg px-2 py-0.5 text-xs font-medium hover:bg-white/20 transition"
            >
              {language === 'TR' ? 'EN' : 'TR'}
            </button>
            <button
              onClick={toggleDarkMode}
              aria-label={t('toggle_dark', language)}
              className="text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition"
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            <button
              onClick={logout}
              aria-label={t('btn_logout', language)}
              className="text-white border border-white/40 rounded-lg px-2 py-1 text-xs font-medium hover:bg-white/20 transition"
            >
              {t('btn_logout', language)}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-white/10" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              aria-label={tab.label}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition relative ${
                activeTab === tab.key
                  ? 'text-white border-b-2 border-white'
                  : 'text-white/60 hover:text-white/90'
              }`}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === 'notifications' && unreadCount > 0 && (
                <span aria-label={language === 'TR' ? `${unreadCount} okunmamış bildirim` : `${unreadCount} unread notifications`} className="absolute top-1.5 right-1/4 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Loading indicator */}
      {loading && (
        <div className="h-0.5 bg-[#1565C0]/20 dark:bg-[#7DD4FC]/20 overflow-hidden">
          <div className="h-full bg-[#1565C0] dark:bg-[#7DD4FC] animate-pulse w-full" />
        </div>
      )}

      {/* Load error banner */}
      {loadError && (
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-4 py-2 text-red-700 dark:text-red-300 text-xs text-center">
          {language === 'TR' ? 'Veriler yüklenemedi. Lütfen sayfayı yenileyin.' : 'Failed to load data. Please refresh the page.'}
        </div>
      )}

      {/* Screen Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto w-full">
          {activeTab === 'book' && !isAdmin && <UserReservationScreen />}
          {activeTab === 'profile' && !isAdmin && <MyProfileScreen />}
          {activeTab === 'admin' && isAdmin && <AdminPanelScreen />}
          {activeTab === 'notifications' && <NotificationCenterScreen />}
        </div>
      </main>
    </div>
  )
}

import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { t } from '../lib/languages'
import { Settings, Lock, X, RefreshCw, Pencil } from 'lucide-react'
import { INPUT_BASE } from '../lib/ui'
import PasswordInput from '../components/PasswordInput'
import { isPasswordStrong } from '../lib/passwordUtils'
import StatCard from '../components/admin/StatCard'
import ConfirmModal from '../components/admin/ConfirmModal'
import AppointmentsTab from './admin/AppointmentsTab'
import StudiosTab from './admin/StudiosTab'
import WorkshopsTab from './admin/WorkshopsTab'
import TimeSlotsTab from './admin/TimeSlotsTab'
import UserApprovalsTab from './admin/UserApprovalsTab'
import NotificationsTab from './admin/NotificationsTab'
import StatsTab from './admin/StatsTab'
import AdminManagementTab from './admin/AdminManagementTab'
import AuditTab from './admin/AuditTab'
import ClosedDaysTab from './admin/ClosedDaysTab'
import AdminMessagesTab from './admin/AdminMessagesTab'
import CertificatesTab from './admin/CertificatesTab'
import EmailTab from './admin/EmailTab'

export default function AdminPanelScreen() {
  const {
    loggedInAdmin, language,
    appointments, cities, conversations, messagesAvailable,
    changeAdminPassword, updateAdmin, uploadAvatar,
    loadAllData,
  } = useApp()

  const inputClass = INPUT_BASE
  const isGlobal = loggedInAdmin?.role === 'GLOBAL'
  const adminCityId = loggedInAdmin?.city_id

  const [activeTab, setActiveTab] = useState('appointments')
  const [confirmModal, setConfirmModal] = useState(null)
  // Admin password change
  const [showAdminPwChange, setShowAdminPwChange] = useState(false)
  const [adminPwForm, setAdminPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [adminPwLoading, setAdminPwLoading] = useState(false)
  const [adminPwError, setAdminPwError] = useState('')
  const [adminPwSuccess, setAdminPwSuccess] = useState('')

  const [showAdminProfileEdit, setShowAdminProfileEdit] = useState(false)
  const [adminProfileForm, setAdminProfileForm] = useState({ name: '', phone: '', email: '' })
  const [adminProfileLoading, setAdminProfileLoading] = useState(false)
  const [adminProfileError, setAdminProfileError] = useState('')
  const [adminProfileSuccess, setAdminProfileSuccess] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const pwSuccessTimer = useRef(null)
  const profileSuccessTimer = useRef(null)

  useEffect(() => () => {
    clearTimeout(pwSuccessTimer.current)
    clearTimeout(profileSuccessTimer.current)
  }, [])

  const handleAdminProfileSave = async (e) => {
    e.preventDefault()
    setAdminProfileError('')
    const emailTrim = adminProfileForm.email.trim()
    if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setAdminProfileError(language === 'TR' ? 'Geçerli bir e-posta adresi girin.' : 'Enter a valid email address.')
      return
    }
    setAdminProfileLoading(true)
    const result = await updateAdmin(loggedInAdmin.id, { name: adminProfileForm.name.trim(), phone: adminProfileForm.phone.trim(), email: emailTrim })
    setAdminProfileLoading(false)
    if (result.success) {
      setShowAdminProfileEdit(false)
      setAdminProfileSuccess(language === 'TR' ? 'Profil güncellendi.' : 'Profile updated.')
      clearTimeout(profileSuccessTimer.current)
      profileSuccessTimer.current = setTimeout(() => setAdminProfileSuccess(''), 3000)
    }
    else setAdminProfileError(result.error || t('err_generic', language))
  }

  useEffect(() => {
    if (!confirmModal) return
    const handler = (e) => { if (e.key === 'Escape') setConfirmModal(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [confirmModal])

  const onRequestConfirm = (label, onConfirm) => setConfirmModal({ label, onConfirm })

  const stats = useMemo(() => {
    const base = isGlobal ? appointments : appointments.filter(a => String(a.city_id) === String(adminCityId))
    return {
      total: base.length,
      pending: base.filter(a => a.status === 'PENDING').length,
      approved: base.filter(a => a.status === 'APPROVED').length,
      cancelled: base.filter(a => a.status === 'CANCELLED').length,
      cancelRequested: base.filter(a => a.status === 'CANCELLATION_REQUESTED').length,
    }
  }, [appointments, isGlobal, adminCityId])

  const handleAdminPwChange = async (e) => {
    e.preventDefault()
    setAdminPwError('')
    if (!isPasswordStrong(adminPwForm.newPw)) { setAdminPwError(t('err_password_weak', language)); return }
    if (adminPwForm.newPw !== adminPwForm.confirm) { setAdminPwError(t('err_password_mismatch', language)); return }
    setAdminPwLoading(true)
    const result = await changeAdminPassword(loggedInAdmin.id, loggedInAdmin.email, adminPwForm.current, adminPwForm.newPw)
    setAdminPwLoading(false)
    if (result.success) {
      setAdminPwForm({ current: '', newPw: '', confirm: '' })
      setShowAdminPwChange(false)
      setAdminPwSuccess(t('password_changed', language))
      clearTimeout(pwSuccessTimer.current)
      pwSuccessTimer.current = setTimeout(() => setAdminPwSuccess(''), 3000)
    } else {
      setAdminPwError(result.error || t('err_generic', language))
    }
  }

  const adminCityConvUnread = useMemo(() => {
    if (isGlobal) return conversations.reduce((s, c) => s + (c.unread_for_recipient || 0), 0)
    return (
      conversations.filter(c => c.recipient_type === 'city_admin' && String(c.city_id) === String(adminCityId)).reduce((s, c) => s + (c.unread_for_recipient || 0), 0) +
      conversations.filter(c => c.recipient_type === 'global_admin' && String(c.sender_id) === String(loggedInAdmin?.id)).reduce((s, c) => s + (c.unread_for_sender || 0), 0)
    )
  }, [isGlobal, adminCityId, conversations, loggedInAdmin?.id])

  const tabs = useMemo(() => [
    { key: 'appointments', label: t('tab_appointments_label', language) },
    { key: 'workshops', label: t('tab_workshops', language) },
    { key: 'studios', label: t('tab_studios_label', language) },
    { key: 'slots', label: t('tab_slots_label', language) },
    { key: 'closed_days', label: t('tab_closed_days', language) },
    { key: 'user_approvals', label: t('tab_approvals_label', language) },
    { key: 'notifications', label: t('tab_send_notif', language) },
    { key: 'stats', label: t('tab_stats', language) },
    ...(messagesAvailable ? [{ key: 'messages', label: t('tab_messages', language), unread: adminCityConvUnread }] : []),
    { key: 'certificates', label: language === 'TR' ? 'Sertifika' : 'Certificate' },
    ...(isGlobal ? [{ key: 'admins', label: t('tab_admins', language) }] : []),
    ...(isGlobal ? [{ key: 'audit', label: t('tab_audit', language) }] : []),
    ...(isGlobal ? [{ key: 'email', label: t('tab_email', language) }] : []),
  ], [language, messagesAvailable, adminCityConvUnread, isGlobal])

  return (
    <div className="px-4 py-4">
      {adminPwSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-4 flex justify-between">
          <span>{adminPwSuccess}</span>
          <button onClick={() => setAdminPwSuccess('')} className="ml-2 text-green-500"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Admin header */}
      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4">
        {adminProfileSuccess && <div className="mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-xs">{adminProfileSuccess}</div>}
        {avatarError && <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs">{avatarError}</div>}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center overflow-hidden">
              {loggedInAdmin?.avatar_url
                ? <img src={loggedInAdmin.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                : <Settings className="w-5 h-5 text-[#1565C0] dark:text-[#7DD4FC]" />}
            </div>
            <label className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#1565C0] dark:bg-[#7DD4FC] rounded-full flex items-center justify-center cursor-pointer shadow hover:opacity-90 transition">
              {avatarUploading ? <span className="text-white dark:text-[#060E26] text-[8px]">...</span> : <Pencil className="w-2.5 h-2.5 text-white dark:text-[#060E26]" />}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={avatarUploading} onChange={async (e) => {
                const file = e.target.files[0]; if (!file) return; e.target.value = ''
                setAvatarError(''); setAvatarUploading(true)
                const res = await uploadAvatar(file, 'admins', loggedInAdmin.id)
                if (res.success) await updateAdmin(loggedInAdmin.id, { avatar_url: res.url })
                else setAvatarError(res.error)
                setAvatarUploading(false)
              }} />
            </label>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{loggedInAdmin?.name || loggedInAdmin?.email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isGlobal ? t('admin_type_global', language) : t('admin_type_city', language)}
              {!isGlobal && loggedInAdmin?.city_id && (() => {
                const c = cities.find(x => String(x.id) === String(loggedInAdmin.city_id))
                return c ? ` · ${c.name}` : ''
              })()}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setShowAdminProfileEdit(p => !p); setAdminProfileForm({ name: loggedInAdmin?.name || '', phone: loggedInAdmin?.phone || '', email: loggedInAdmin?.email || '' }); setAdminProfileError('') }}
              className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition"
            >
              <Pencil className="w-3.5 h-3.5 inline mr-1" />{language === 'TR' ? 'Düzenle' : 'Edit'}
            </button>
            <button
              onClick={() => { setShowAdminPwChange(p => !p); setAdminPwError(''); setAdminPwForm({ current: '', newPw: '', confirm: '' }) }}
              className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition"
            >
              <Lock className="w-3.5 h-3.5 inline mr-1" />{t('change_password', language)}
            </button>
            <button onClick={loadAllData} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition inline-flex items-center gap-1">
              <RefreshCw className="w-3.5 h-3.5" />{t('btn_refresh', language)}
            </button>
          </div>
        </div>

        {showAdminProfileEdit && (
          <form onSubmit={handleAdminProfileSave} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{language === 'TR' ? 'Fotoğraf: JPEG, PNG, WebP veya GIF · Maks. 1 MB' : 'Photo: JPEG, PNG, WebP or GIF · Max 1 MB'}</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Ad Soyad' : 'Name'}</label>
                <input type="text" className={`w-full ${inputClass}`} value={adminProfileForm.name} onChange={e => setAdminProfileForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Telefon' : 'Phone'}</label>
                <input type="text" className={`w-full ${inputClass}`} value={adminProfileForm.phone} onChange={e => setAdminProfileForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'E-posta' : 'Email'}</label>
              <input type="email" className={`w-full ${inputClass}`} value={adminProfileForm.email} onChange={e => setAdminProfileForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            {adminProfileError && <p className="text-red-500 dark:text-red-400 text-xs">{adminProfileError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={adminProfileLoading} className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl disabled:opacity-60">
                {adminProfileLoading ? '...' : t('btn_save', language)}
              </button>
              <button type="button" onClick={() => setShowAdminProfileEdit(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">
                {t('btn_nevermind', language)}
              </button>
            </div>
          </form>
        )}

        {showAdminPwChange && (
          <form onSubmit={handleAdminPwChange} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('current_password', language)} *</label>
                <PasswordInput className={inputClass} value={adminPwForm.current} onChange={e => setAdminPwForm(p => ({ ...p, current: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('new_password', language)} *</label>
                <PasswordInput className={inputClass} value={adminPwForm.newPw} onChange={e => setAdminPwForm(p => ({ ...p, newPw: e.target.value }))} required minLength={8} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_confirm_password', language)} *</label>
                <PasswordInput className={inputClass} value={adminPwForm.confirm} onChange={e => setAdminPwForm(p => ({ ...p, confirm: e.target.value }))} required minLength={8} />
              </div>
            </div>
            {adminPwError && <p className="text-red-500 dark:text-red-400 text-xs">{adminPwError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={adminPwLoading} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl disabled:opacity-60 hover:opacity-90 transition">
                {adminPwLoading ? '...' : t('btn_update_password', language)}
              </button>
              <button type="button" onClick={() => setShowAdminPwChange(false)} className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">
                {t('btn_nevermind', language)}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label={t('stat_total', language)} value={stats.total} color="text-gray-800 dark:text-gray-100" />
        <StatCard label={t('stat_pending_status', language)} value={stats.pending} color="text-orange-600 dark:text-orange-400" />
        <StatCard label={t('stat_approved_status', language)} value={stats.approved} color="text-green-600 dark:text-green-400" />
        <StatCard label={t('stat_cancelled_status', language)} value={stats.cancelled + stats.cancelRequested} color="text-red-600 dark:text-red-400" />
      </div>

      {/* Tab Bar */}
      <div role="tablist" className="flex flex-wrap bg-gray-100 dark:bg-[#0E1A30] rounded-xl p-1 mb-4 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap relative ${
              activeTab === tab.key
                ? 'bg-white dark:bg-[#1565C0] text-[#1565C0] dark:text-white shadow'
                : 'text-gray-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-[#1565C0]/20 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer'
            }`}
          >
            {tab.label}
            {tab.unread > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {tab.unread > 9 ? '9+' : tab.unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'appointments' && <AppointmentsTab language={language} isGlobal={isGlobal} adminCityId={adminCityId} onRequestConfirm={onRequestConfirm} onGoToMessages={messagesAvailable ? () => setActiveTab('messages') : null} />}
      {activeTab === 'workshops' && <WorkshopsTab language={language} isGlobal={isGlobal} adminCityId={adminCityId} onRequestConfirm={onRequestConfirm} />}
      {activeTab === 'studios' && <StudiosTab language={language} isGlobal={isGlobal} adminCityId={adminCityId} onRequestConfirm={onRequestConfirm} />}
      {activeTab === 'slots' && <TimeSlotsTab language={language} isGlobal={isGlobal} adminCityId={adminCityId} />}
      {activeTab === 'user_approvals' && <UserApprovalsTab language={language} isGlobal={isGlobal} adminCityId={adminCityId} onRequestConfirm={onRequestConfirm} />}
      {activeTab === 'notifications' && <NotificationsTab language={language} isGlobal={isGlobal} adminCityId={adminCityId} />}
      {activeTab === 'stats' && <StatsTab language={language} isGlobal={isGlobal} adminCityId={adminCityId} />}
      {activeTab === 'closed_days' && <ClosedDaysTab language={language} isGlobal={isGlobal} adminCityId={adminCityId} />}
      {activeTab === 'messages' && messagesAvailable && <AdminMessagesTab language={language} isGlobal={isGlobal} adminCityId={adminCityId} />}
      {activeTab === 'certificates' && <CertificatesTab language={language} isGlobal={isGlobal} adminCityId={adminCityId} />}
      {activeTab === 'admins' && isGlobal && <AdminManagementTab language={language} loggedInAdmin={loggedInAdmin} onRequestConfirm={onRequestConfirm} />}
      {activeTab === 'audit' && isGlobal && <AuditTab language={language} />}
      {activeTab === 'email' && isGlobal && <EmailTab language={language} />}

      <ConfirmModal confirmModal={confirmModal} onClose={() => setConfirmModal(null)} language={language} />
    </div>
  )
}

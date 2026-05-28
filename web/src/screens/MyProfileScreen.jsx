import React, { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { t, formatDate, translations, STATUS_COLORS, STATUS_LABELS } from '../lib/languages'
import { INPUT_BASE, LABEL_CLASS } from '../lib/ui'
import PasswordInput from '../components/PasswordInput'
import { isPasswordStrong } from '../lib/passwordUtils'
import { X, Pencil, Lock, Calendar, Clock, ChevronUp, ChevronDown, ChevronRight, CalendarDays, List } from 'lucide-react'
import CalendarView from '../components/CalendarView'

export default function MyProfileScreen() {
  const { loggedInUser, appointments, cancelOwnAppointment, submitCancellationRequest, updateUserProfile, changePassword, language, cities, waitlist, removeFromWaitlist, uploadAvatar } = useApp()
  const [apptViewMode, setApptViewMode] = useState('list')

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelType, setCancelType] = useState('request') // 'direct' | 'request'
  const [cancelTargetId, setCancelTargetId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [showPast, setShowPast] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  // Password change
  const [showPwChange, setShowPwChange] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => {
    if (!showPwChange && !showCancelModal) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (submitting) return
        setShowPwChange(false)
        setShowCancelModal(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showPwChange, showCancelModal, submitting])

  // Profile editing
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')

  const todayStr = new Date().toISOString().split('T')[0]

  const userAppointments = useMemo(() => {
    if (!loggedInUser) return []
    return appointments.filter(a => a.user_email === loggedInUser.email)
  }, [appointments, loggedInUser])

  const upcomingAppointments = useMemo(() =>
    userAppointments.filter(a => a.date >= todayStr),
    [userAppointments, todayStr]
  )

  const pastAppointments = useMemo(() =>
    userAppointments.filter(a => a.date < todayStr),
    [userAppointments, todayStr]
  )

  const canDirectCancel = (appt) => appt.status === 'PENDING' && appt.date >= todayStr
  const canRequestCancel = (appt) => appt.status === 'APPROVED' && appt.date >= todayStr

  const openCancelModal = (id, type) => {
    setCancelTargetId(id)
    setCancelType(type)
    setCancelReason('')
    setShowCancelModal(true)
  }

  const handleSubmitCancel = async () => {
    if (!cancelTargetId) return
    setSubmitting(true)
    let result
    if (cancelType === 'direct') {
      result = await cancelOwnAppointment(cancelTargetId)
    } else {
      result = await submitCancellationRequest(cancelTargetId, cancelReason)
    }
    setSubmitting(false)
    if (result.success) {
      setShowCancelModal(false)
      setCancelTargetId(null)
      setCancelReason('')
      setSuccessMsg(t(cancelType === 'direct' ? 'appointment_cancelled' : 'cancellation_submitted', language))
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    if (!isPasswordStrong(pwForm.newPw)) {
      setPwError(t('err_password_weak', language))
      return
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError(t('err_password_mismatch', language))
      return
    }
    setPwLoading(true)
    const result = await changePassword(loggedInUser.id, loggedInUser.email, pwForm.current, pwForm.newPw)
    setPwLoading(false)
    if (result.success) {
      setShowPwChange(false)
      setPwForm({ current: '', newPw: '', confirm: '' })
      setSuccessMsg(t('password_changed', language))
      setTimeout(() => setSuccessMsg(''), 3000)
    } else {
      const errKey = result.error
      setPwError(translations[errKey] ? t(errKey, language) : (errKey || t('err_generic', language)))
    }
  }

  const startEdit = () => {
    setEditForm({
      name: loggedInUser.name || '',
      surname: loggedInUser.surname || '',
      branch: loggedInUser.branch || '',
      work_location: loggedInUser.work_location || '',
      phone: loggedInUser.phone || '',
      district: loggedInUser.district || '',
      city_id: loggedInUser.city_id || '',
    })
    setEditError('')
    setEditMode(true)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setEditError('')
    const phoneDigits = editForm.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setEditError(t('err_phone_invalid', language))
      return
    }
    setEditLoading(true)
    const cityObj = cities.find(c => String(c.id) === String(editForm.city_id))
    const result = await updateUserProfile(loggedInUser.id, {
      name: editForm.name.trim(),
      surname: editForm.surname.trim(),
      branch: editForm.branch.trim(),
      work_location: editForm.work_location.trim(),
      phone: editForm.phone.trim(),
      district: editForm.district.trim(),
      city_id: editForm.city_id || loggedInUser.city_id,
      city_name: cityObj?.name || loggedInUser.city_name,
    })
    setEditLoading(false)
    if (result.success) {
      setEditMode(false)
      setSuccessMsg(t('profile_updated', language))
      setTimeout(() => setSuccessMsg(''), 3000)
    } else {
      setEditError(result.error || t('err_generic', language))
    }
  }

  if (!loggedInUser) return null

  const initials = `${(loggedInUser.name || '?').charAt(0)}${(loggedInUser.surname || '').charAt(0)}`.toUpperCase()
  const inputClass = `w-full ${INPUT_BASE}`
  const labelClass = LABEL_CLASS

  return (
    <div className="px-4 py-4">
      {successMsg && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-4 flex justify-between items-start">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-2 text-green-500"><X className="w-4 h-4" /></button>
        </div>
      )}
      {avatarError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-4">{avatarError}</div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-5 mb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-[#1565C0] dark:bg-[#7DD4FC] flex items-center justify-center overflow-hidden">
              {loggedInUser.avatar_url
                ? <img src={loggedInUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                : <span className="text-white dark:text-[#060E26] text-xl font-bold">{initials}</span>}
            </div>
            <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1565C0] dark:bg-[#7DD4FC] rounded-full flex items-center justify-center cursor-pointer shadow hover:opacity-90 transition">
              {avatarUploading ? <span className="text-white dark:text-[#060E26] text-[10px]">...</span> : <Pencil className="w-3 h-3 text-white dark:text-[#060E26]" />}
              <input type="file" accept="image/*" className="hidden" disabled={avatarUploading} onChange={async (e) => {
                const file = e.target.files[0]; if (!file) return; e.target.value = ''
                setAvatarError(''); setAvatarUploading(true)
                const res = await uploadAvatar(file, 'users', loggedInUser.id)
                if (res.success) { await updateUserProfile(loggedInUser.id, { avatar_url: res.url }) }
                else setAvatarError(res.error)
                setAvatarUploading(false)
              }} />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">{loggedInUser.name} {loggedInUser.surname}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{loggedInUser.email}</p>
          </div>
          {!editMode && (
            <button
              onClick={startEdit}
              className="flex-shrink-0 text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition"
            >
              <Pencil className="w-3.5 h-3.5 inline mr-1" />{t('btn_edit', language)}
            </button>
          )}
        </div>

        {editMode ? (
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('input_name', language)} *</label>
                <input type="text" className={inputClass} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className={labelClass}>{t('input_surname', language)} *</label>
                <input type="text" className={inputClass} value={editForm.surname} onChange={e => setEditForm(p => ({ ...p, surname: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('input_branch', language)} *</label>
              <input type="text" className={inputClass} value={editForm.branch} onChange={e => setEditForm(p => ({ ...p, branch: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>{t('input_work_location', language)} *</label>
              <input type="text" className={inputClass} value={editForm.work_location} onChange={e => setEditForm(p => ({ ...p, work_location: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('input_phone', language)} *</label>
                <input type="tel" className={inputClass} value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} required />
              </div>
              <div>
                <label className={labelClass}>{t('input_district', language)} *</label>
                <input type="text" className={inputClass} value={editForm.district} onChange={e => setEditForm(p => ({ ...p, district: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('input_city', language)}</label>
              <select className={inputClass} value={editForm.city_id} onChange={e => setEditForm(p => ({ ...p, city_id: e.target.value }))}>
                <option value="">{t('select_province', language)}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{t('city_change_note', language)}</p>
            </div>
            {editError && (
              <p className="text-red-600 dark:text-red-400 text-xs">{editError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={editLoading} className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm disabled:opacity-60 hover:opacity-90 transition">
                {editLoading ? '...' : t('btn_save', language)}
              </button>
              <button type="button" onClick={() => setEditMode(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                {t('btn_nevermind', language)}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ProfileField label={t('input_city', language)} value={loggedInUser.city_name} />
            <ProfileField label={t('input_district', language)} value={loggedInUser.district} />
            <ProfileField label={t('input_branch', language)} value={loggedInUser.branch} />
            <ProfileField label={t('input_work_location', language)} value={loggedInUser.work_location} />
            <ProfileField label={t('input_phone', language)} value={loggedInUser.phone} />
            <ProfileField
              label={t('lbl_membership_status', language)}
              value={loggedInUser.is_approved ? t('status_approved', language) : t('status_pending_approval', language)}
              valueClass={loggedInUser.is_approved ? 'text-green-600 dark:text-green-400 font-medium' : 'text-orange-500'}
            />
          </div>
        )}
      </div>

      {/* Password Change */}
      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow mb-5">
        <button
          onClick={() => { setShowPwChange(p => !p); setPwError(''); setPwForm({ current: '', newPw: '', confirm: '' }) }}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          <span className="inline-flex items-center gap-1"><Lock className="w-3.5 h-3.5" />{t('change_password', language)}</span>
          <span className="text-gray-400">{showPwChange ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </button>
        {showPwChange && (
          <form onSubmit={handleChangePassword} className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div>
              <label className={labelClass}>{t('current_password', language)} *</label>
              <PasswordInput className={inputClass} value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>{t('new_password', language)} *</label>
              <PasswordInput className={inputClass} value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} required minLength={8} />
            </div>
            <div>
              <label className={labelClass}>{t('input_confirm_password', language)} *</label>
              <PasswordInput className={inputClass} value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} required minLength={8} />
            </div>
            {pwError && <p className="text-red-600 dark:text-red-400 text-xs">{pwError}</p>}
            <button type="submit" disabled={pwLoading} className="w-full py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-60">
              {pwLoading ? '...' : t('btn_update_password', language)}
            </button>
          </form>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
          {t('upcoming_appointments', language)} ({upcomingAppointments.length})
        </h3>
        <div className="flex gap-1">
          <button onClick={() => setApptViewMode('list')} className={`p-1.5 rounded-lg transition ${apptViewMode === 'list' ? 'bg-[#1565C0]/10 text-[#1565C0] dark:bg-[#7DD4FC]/10 dark:text-[#7DD4FC]' : 'text-gray-400 hover:text-gray-600'}`}>
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => setApptViewMode('calendar')} className={`p-1.5 rounded-lg transition ${apptViewMode === 'calendar' ? 'bg-[#1565C0]/10 text-[#1565C0] dark:bg-[#7DD4FC]/10 dark:text-[#7DD4FC]' : 'text-gray-400 hover:text-gray-600'}`}>
            <CalendarDays className="w-4 h-4" />
          </button>
        </div>
      </div>

      {apptViewMode === 'calendar' && (
        <div className="mb-4">
          <CalendarView appointments={userAppointments} language={language} />
        </div>
      )}

      {upcomingAppointments.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-6 text-center text-gray-500 dark:text-gray-400 text-sm mb-4">
          {t('no_upcoming_appointments', language)}
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          {upcomingAppointments.map(appt => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              language={language}
              canDirectCancel={canDirectCancel(appt)}
              canRequestCancel={canRequestCancel(appt)}
              onDirectCancelClick={() => openCancelModal(appt.id, 'direct')}
              onRequestCancelClick={() => openCancelModal(appt.id, 'request')}
            />
          ))}
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <>
          <button
            onClick={() => setShowPast(p => !p)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 hover:text-gray-700 dark:hover:text-gray-200 transition"
          >
            <span>{showPast ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
            {t('past_appointments', language)} ({pastAppointments.length})
          </button>
          {showPast && (
            <div className="space-y-3 mb-4 opacity-75">
              {pastAppointments.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} language={language} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <div className="mb-4">
          <h3 className="font-bold text-blue-600 dark:text-blue-400 text-sm mb-2 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {language === 'TR' ? `Bekleme Listesi (${waitlist.length})` : `Waitlist (${waitlist.length})`}
          </h3>
          <div className="space-y-2">
            {waitlist.map(w => (
              <div key={w.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{w.lab_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(w.date)} — {w.time_slot}</p>
                </div>
                <button
                  onClick={async () => await removeFromWaitlist(w.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  {language === 'TR' ? 'Çıkar' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">
              {cancelType === 'direct' ? t('action_cancel', language) : t('cancel_modal_title', language)}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
              {cancelType === 'direct'
                ? t('confirm_cancel_appt', language)
                : t('cancel_modal_subtitle', language)}
            </p>
            {cancelType === 'request' && (
              <div className="mb-4">
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0E1A30] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] text-sm resize-none"
                  rows={4}
                  maxLength={300}
                  placeholder={t('cancel_reason_placeholder', language)}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                />
                <p className={`text-right text-xs mt-1 ${cancelReason.length >= 280 ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`}>
                  {cancelReason.length}/300
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSubmitCancel}
                disabled={submitting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
              >
                {submitting ? '...' : t('action_cancel', language)}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
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

function AppointmentCard({ appt, language, canDirectCancel, canRequestCancel, onDirectCancelClick, onRequestCancelClick }) {
  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{appt.lab_name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{appt.city_name}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-lg flex-shrink-0 ${STATUS_COLORS[appt.status] || ''}`}>
          {STATUS_LABELS[appt.status]?.[language] || appt.status}
        </span>
      </div>
      <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mb-2">
        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(appt.date)}</span>
        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{appt.time_slot}</span>
      </div>
      {appt.note && appt.status === 'CANCELLATION_REQUESTED' && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
          {t('lbl_cancel_reason', language)}: {appt.note}
        </p>
      )}
      {canDirectCancel && (
        <button
          onClick={onDirectCancelClick}
          className="w-full py-2 border border-red-400 text-red-600 dark:text-red-400 dark:border-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          {t('action_cancel', language)}
        </button>
      )}
      {canRequestCancel && (
        <button
          onClick={onRequestCancelClick}
          className="w-full py-2 border border-orange-400 text-orange-600 dark:text-orange-400 dark:border-orange-600 text-xs font-semibold rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
        >
          {t('btn_request_cancellation', language)}
        </button>
      )}
    </div>
  )
}

function ProfileField({ label, value, valueClass }) {
  return (
    <div className="bg-gray-50 dark:bg-[#0E1A30] rounded-xl px-3 py-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${valueClass || ''}`}>{value || '—'}</p>
    </div>
  )
}

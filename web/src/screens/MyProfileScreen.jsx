import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { t, formatDate, translations, STATUS_COLORS, STATUS_LABELS } from '../lib/languages'
import { INPUT_BASE, LABEL_CLASS } from '../lib/ui'
import PasswordInput from '../components/PasswordInput'
import { isPasswordStrong } from '../lib/passwordUtils'
import { X, Pencil, Lock, Calendar, Clock, ChevronUp, ChevronDown, ChevronRight, CalendarDays, List, RefreshCw, Award } from 'lucide-react'
import CalendarView from '../components/CalendarView'
import { isTurkishHoliday, isSunday, localDateStr } from '../lib/holidays'
import CertificateModal from '../components/CertificateModal'

export default function MyProfileScreen() {
  const { loggedInUser, appointments, cancelOwnAppointment, submitCancellationRequest, updateUserProfile, changePassword, language, cities, waitlist, removeFromWaitlist, uploadAvatar, rescheduleAppointment, timeSlots, labs, closedDays, workshopRegistrations, workshops, certificateTemplates } = useApp()
  const [apptViewMode, setApptViewMode] = useState('list')
  const [calendarSelectedDay, setCalendarSelectedDay] = useState('')

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelType, setCancelType] = useState('request') // 'direct' | 'request'
  const [cancelTargetId, setCancelTargetId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const successTimerRef = useRef(null)
  const [showPast, setShowPast] = useState(false)
  const [showCancelled, setShowCancelled] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  // Reschedule
  const [showReschedule, setShowReschedule] = useState(false)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlot, setRescheduleSlot] = useState('')
  const [rescheduleError, setRescheduleError] = useState('')
  const [rescheduleLoading, setRescheduleLoading] = useState(false)

  // Password change
  const [showPwChange, setShowPwChange] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')

  useEffect(() => () => clearTimeout(successTimerRef.current), [])

  useEffect(() => {
    if (!showPwChange && !showCancelModal && !showReschedule && !showCityChangeWarning && !showWaitlistRemoveConfirm) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (submitting || rescheduleLoading) return
        setShowPwChange(false)
        setShowCancelModal(false); setCancelReason('')
        setShowReschedule(false)
        setShowCityChangeWarning(false)
        setShowWaitlistRemoveConfirm(null)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showPwChange, showCancelModal, showReschedule, showCityChangeWarning, showWaitlistRemoveConfirm, submitting, rescheduleLoading])

  // Profile editing
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [showCityChangeWarning, setShowCityChangeWarning] = useState(false)
  const [showWaitlistRemoveConfirm, setShowWaitlistRemoveConfirm] = useState(null)
  const [waitlistRemoving, setWaitlistRemoving] = useState(false)
  const [certModalWs, setCertModalWs] = useState(null)

  const _d = new Date()
  const todayStr = `${_d.getFullYear()}-${String(_d.getMonth() + 1).padStart(2, '0')}-${String(_d.getDate()).padStart(2, '0')}`

  const getRescheduleSlotAvailability = (date, timeRange) => {
    if (!rescheduleTarget) return { count: 0, maxCap: 1, isFull: false }
    const count = appointments.filter(a =>
      String(a.lab_id) === String(rescheduleTarget.lab_id) &&
      a.date === date && a.time_slot === timeRange &&
      ['PENDING', 'APPROVED'].includes(a.status) &&
      String(a.id) !== String(rescheduleTarget.id)
    ).length
    const lab = labs.find(l => String(l.id) === String(rescheduleTarget.lab_id))
    const maxCap = lab?.capacity_per_slot || 1
    return { count, maxCap, isFull: count >= maxCap }
  }

  const handleReschedule = async () => {
    if (!rescheduleDate || !rescheduleSlot) return
    setRescheduleError('')
    setRescheduleLoading(true)
    try {
      const res = await rescheduleAppointment(rescheduleTarget.id, rescheduleDate, rescheduleSlot)
      if (res.success) {
        setShowReschedule(false)
        setRescheduleTarget(null)
        setRescheduleDate('')
        setRescheduleSlot('')
        setSuccessMsg(t('appt_rescheduled', language))
        clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000)
      } else {
        setRescheduleError(res.error)
      }
    } finally {
      setRescheduleLoading(false)
    }
  }

  const userAppointments = useMemo(() => {
    if (!loggedInUser) return []
    return appointments.filter(a => a.user_email === loggedInUser.email)
  }, [appointments, loggedInUser])

  const upcomingAppointments = useMemo(() =>
    userAppointments.filter(a => a.date >= todayStr && a.status !== 'CANCELLED'),
    [userAppointments, todayStr]
  )

  const pastAppointments = useMemo(() =>
    userAppointments.filter(a => a.date < todayStr && a.status !== 'CANCELLED'),
    [userAppointments, todayStr]
  )

  const cancelledAppointments = useMemo(() =>
    userAppointments.filter(a => a.status === 'CANCELLED'),
    [userAppointments]
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
    try {
      let result
      if (cancelType === 'direct') {
        result = await cancelOwnAppointment(cancelTargetId)
      } else {
        result = await submitCancellationRequest(cancelTargetId, cancelReason)
      }
      if (result.success) {
        setShowCancelModal(false)
        setCancelTargetId(null)
        setCancelReason('')
        setSuccessMsg(t(cancelType === 'direct' ? 'appointment_cancelled' : 'cancellation_submitted', language))
        clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000)
      }
    } finally {
      setSubmitting(false)
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
    try {
      const result = await changePassword(loggedInUser.id, loggedInUser.email, pwForm.current, pwForm.newPw)
      if (result.success) {
        setShowPwChange(false)
        setPwForm({ current: '', newPw: '', confirm: '' })
        setSuccessMsg(t('password_changed', language))
        clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000)
      } else {
        const errKey = result.error
        setPwError(translations[errKey] ? t(errKey, language) : (errKey || t('err_generic', language)))
      }
    } catch {
      setPwError(t('err_generic', language))
    } finally {
      setPwLoading(false)
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
    // Türk telefon numarası: 05XXXXXXXXX (11 hane) veya 5XXXXXXXXX (10 hane)
    if (phoneDigits.length === 0 || !/^(0?5\d{9})$/.test(phoneDigits)) {
      setEditError(t('err_phone_format', language))
      return
    }
    const cityChanged = String(editForm.city_id) !== String(loggedInUser.city_id)
    const hasActiveAppts = upcomingAppointments.some(a => ['PENDING', 'APPROVED'].includes(a.status))
    if (cityChanged && hasActiveAppts && !showCityChangeWarning) {
      setShowCityChangeWarning(true)
      return
    }
    setEditLoading(true)
    try {
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
      if (result.success) {
        setShowCityChangeWarning(false)
        setEditMode(false)
        setSuccessMsg(t('profile_updated', language))
        clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000)
      } else {
        setEditError(result.error || t('err_generic', language))
      }
    } catch {
      setEditError(t('err_generic', language))
    } finally {
      setEditLoading(false)
    }
  }

  if (!loggedInUser) return null

  const initials = `${(loggedInUser.name || '?').charAt(0)}${(loggedInUser.surname || '').charAt(0)}`.toUpperCase()
  const inputClass = `w-full ${INPUT_BASE}`
  const labelClass = LABEL_CLASS

  return (
    <div className="px-4 py-4">
      {successMsg && (
        <div role="status" aria-live="polite" className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-4 flex justify-between items-start">
          <span>{successMsg}</span>
          <button type="button" onClick={() => setSuccessMsg('')} aria-label={t('btn_close', language)} className="ml-2 text-green-500"><X className="w-4 h-4" aria-hidden="true" /></button>
        </div>
      )}
      {avatarError && (
        <div role="status" aria-live="polite" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-4 flex items-center justify-between">
          <span>{avatarError}</span>
          <button type="button" onClick={() => setAvatarError('')} aria-label={t('btn_close', language)} className="ml-2 text-red-400 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" aria-hidden="true" /></button>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-5 mb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-[#1565C0] dark:bg-[#7DD4FC] flex items-center justify-center overflow-hidden">
              {loggedInUser.avatar_url
                ? <img src={loggedInUser.avatar_url} alt={`${loggedInUser.name} ${t('alt_profile_photo', language)}`} className="w-full h-full object-cover" />
                : <span className="text-white dark:text-[#060E26] text-xl font-bold">{initials}</span>}
            </div>
            <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1565C0] dark:bg-[#7DD4FC] rounded-full flex items-center justify-center cursor-pointer shadow hover:opacity-90 transition" title={t('avatar_upload_hint', language)}>
              {avatarUploading ? <span className="text-white dark:text-[#060E26] text-[10px]">...</span> : <Pencil className="w-3 h-3 text-white dark:text-[#060E26]" aria-hidden="true" />}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={avatarUploading} onChange={async (e) => {
                const file = e.target.files[0]; if (!file) return; e.target.value = ''
                setAvatarError(''); setAvatarUploading(true)
                try {
                  const res = await uploadAvatar(file, 'users', loggedInUser.id)
                  if (res.success) {
                    const profileRes = await updateUserProfile(loggedInUser.id, { avatar_url: res.url })
                    if (!profileRes.success) setAvatarError(t('err_generic', language))
                  } else {
                    setAvatarError(res.error || t('err_generic', language))
                  }
                } catch {
                  setAvatarError(t('err_generic', language))
                } finally {
                  setAvatarUploading(false)
                }
              }} />
            </label>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">{loggedInUser.name} {loggedInUser.surname}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{loggedInUser.email}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{t('photo_hint_extended', language)}</p>
          </div>
          {!editMode && (
            <button
              onClick={startEdit}
              className="flex-shrink-0 text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 active:scale-[0.98] transition"
            >
              <Pencil className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />{t('btn_edit', language)}
            </button>
          )}
        </div>

        {editMode ? (
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('input_name', language)} *</label>
                <input type="text" className={inputClass} value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} required disabled={editLoading} />
              </div>
              <div>
                <label className={labelClass}>{t('input_surname', language)} *</label>
                <input type="text" className={inputClass} value={editForm.surname} onChange={e => setEditForm(p => ({ ...p, surname: e.target.value }))} required disabled={editLoading} />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('input_branch', language)} *</label>
              <input type="text" className={inputClass} value={editForm.branch} onChange={e => setEditForm(p => ({ ...p, branch: e.target.value }))} required disabled={editLoading} />
            </div>
            <div>
              <label className={labelClass}>{t('input_work_location', language)} *</label>
              <input type="text" className={inputClass} value={editForm.work_location} onChange={e => setEditForm(p => ({ ...p, work_location: e.target.value }))} required disabled={editLoading} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>{t('input_phone', language)} *</label>
                <input type="tel" className={inputClass} value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} required disabled={editLoading} />
              </div>
              <div>
                <label className={labelClass}>{t('input_district', language)} *</label>
                <input type="text" className={inputClass} value={editForm.district} onChange={e => setEditForm(p => ({ ...p, district: e.target.value }))} required disabled={editLoading} />
              </div>
            </div>
            <div>
              <label className={labelClass}>{t('input_city', language)}</label>
              <select className={inputClass} value={editForm.city_id} onChange={e => setEditForm(p => ({ ...p, city_id: e.target.value }))} disabled={editLoading}>
                <option value="">{t('select_province', language)}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{t('city_change_note', language)}</p>
            </div>
            {editError && (
              <p role="status" aria-live="polite" className="text-red-600 dark:text-red-400 text-xs">{editError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={editLoading} className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm disabled:opacity-60 hover:opacity-90 active:scale-[0.98] transition">
                {editLoading ? '...' : t('btn_save', language)}
              </button>
              <button type="button" onClick={() => setEditMode(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition">
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
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-medium text-gray-700 dark:text-gray-300 active:opacity-70 transition"
        >
          <span className="inline-flex items-center gap-1"><Lock className="w-3.5 h-3.5" aria-hidden="true" />{t('change_password', language)}</span>
          <span className="text-gray-400" aria-hidden="true">{showPwChange ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
        </button>
        {showPwChange && (
          <form onSubmit={handleChangePassword} className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div>
              <label className={labelClass}>{t('current_password', language)} *</label>
              <PasswordInput className={inputClass} value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} autoComplete="current-password" required disabled={pwLoading} />
            </div>
            <div>
              <label className={labelClass}>{t('new_password', language)} *</label>
              <PasswordInput className={inputClass} value={pwForm.newPw} onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))} autoComplete="new-password" required minLength={8} disabled={pwLoading} />
            </div>
            <div>
              <label className={labelClass}>{t('input_confirm_password', language)} *</label>
              <PasswordInput className={inputClass} value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} autoComplete="new-password" required minLength={8} disabled={pwLoading} />
            </div>
            {pwError && <p role="status" aria-live="polite" className="text-red-600 dark:text-red-400 text-xs">{pwError}</p>}
            <button type="submit" disabled={pwLoading} className="w-full py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60">
              {pwLoading ? '...' : t('btn_update_password', language)}
            </button>
          </form>
        )}
      </div>

      {/* Cancellation Requests */}
      {upcomingAppointments.filter(a => a.status === 'CANCELLATION_REQUESTED').length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-2xl p-4 mb-4">
          <h3 className="font-bold text-orange-700 dark:text-orange-300 text-sm mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4" aria-hidden="true" />
            {t('pending_cancellation_title', language)}
          </h3>
          <div className="space-y-2">
            {upcomingAppointments.filter(a => a.status === 'CANCELLATION_REQUESTED').map(appt => (
              <div key={appt.id} className="bg-white dark:bg-[#0D1E3D] rounded-xl px-3 py-2.5">
                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">{appt.lab_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(appt.date)} · {appt.time_slot}</p>
                {appt.note && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 italic">"{appt.note}"</p>
                )}
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  {t('waiting_admin_review', language)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Appointments */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
          {t('upcoming_appointments', language)} ({upcomingAppointments.length})
        </h3>
        <div className="flex gap-1">
          <button onClick={() => setApptViewMode('list')} aria-label={t('view_list', language)} className={`p-1.5 rounded-lg transition active:scale-[0.98] ${apptViewMode === 'list' ? 'bg-[#1565C0]/10 text-[#1565C0] dark:bg-[#7DD4FC]/10 dark:text-[#7DD4FC]' : 'text-gray-400 hover:text-gray-600'}`}>
            <List className="w-4 h-4" aria-hidden="true" />
          </button>
          <button onClick={() => setApptViewMode('calendar')} aria-label={t('view_calendar', language)} className={`p-1.5 rounded-lg transition active:scale-[0.98] ${apptViewMode === 'calendar' ? 'bg-[#1565C0]/10 text-[#1565C0] dark:bg-[#7DD4FC]/10 dark:text-[#7DD4FC]' : 'text-gray-400 hover:text-gray-600'}`}>
            <CalendarDays className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {apptViewMode === 'calendar' && (
        <div className="mb-4">
          <CalendarView
            appointments={userAppointments}
            language={language}
            selectedDate={calendarSelectedDay}
            onDayClick={(date) => setCalendarSelectedDay(prev => prev === date ? '' : date)}
          />
          {calendarSelectedDay && (() => {
            const dayAppts = userAppointments.filter(a => a.date === calendarSelectedDay)
            if (dayAppts.length === 0) return (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mt-3">
                {t('no_appts_on_date', language)}
              </p>
            )
            return (
              <div className="mt-3 space-y-2">
                {dayAppts.map(appt => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    language={language}
                    canDirectCancel={canDirectCancel(appt)}
                    canRequestCancel={canRequestCancel(appt)}
                    onDirectCancelClick={() => openCancelModal(appt.id, 'direct')}
                    onRequestCancelClick={() => openCancelModal(appt.id, 'request')}
                    canReschedule={['PENDING', 'APPROVED'].includes(appt.status) && appt.date >= todayStr}
                    onRescheduleClick={() => { setRescheduleTarget(appt); setRescheduleDate(''); setRescheduleSlot(''); setRescheduleError(''); setShowReschedule(true) }}
                  />
                ))}
              </div>
            )
          })()}
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
              canReschedule={['PENDING', 'APPROVED'].includes(appt.status) && appt.date >= todayStr}
              onRescheduleClick={() => { setRescheduleTarget(appt); setRescheduleDate(''); setRescheduleSlot(''); setRescheduleError(''); setShowReschedule(true) }}
            />
          ))}
        </div>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <>
          <button
            onClick={() => setShowPast(p => !p)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 hover:text-gray-700 dark:hover:text-gray-200 active:opacity-70 transition"
          >
            <span aria-hidden="true">{showPast ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
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

      {/* Cancelled Appointments */}
      {cancelledAppointments.length > 0 && (
        <>
          <button
            onClick={() => setShowCancelled(p => !p)}
            className="flex items-center gap-2 text-sm font-medium text-red-500 dark:text-red-400 mb-3 hover:text-red-700 dark:hover:text-red-300 active:opacity-70 transition"
          >
            <span aria-hidden="true">{showCancelled ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
            {t('appts_cancelled_n', language).replace('{n}', cancelledAppointments.length)}
          </button>
          {showCancelled && (
            <div className="space-y-3 mb-4 opacity-75">
              {cancelledAppointments.map(appt => (
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
            <Clock className="w-4 h-4" aria-hidden="true" />
            {t('waitlist_title_n', language).replace('{n}', waitlist.length)}
          </h3>
          <div className="space-y-2">
            {waitlist.map(w => (
              <div key={w.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-4 py-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{w.lab_name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(w.date)} · {w.time_slot}</p>
                </div>
                <button
                  onClick={() => setShowWaitlistRemoveConfirm(w.id)}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] transition"
                >
                  {t('btn_remove', language)}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Workshop Registrations */}
      {(() => {
        const upcomingRegs = workshopRegistrations.filter(r => {
          if (String(r.user_id) !== String(loggedInUser.id)) return false
          if (r.attended) return false
          const ws = workshops.find(w => String(w.id) === String(r.workshop_id))
          return ws && (!ws.date || ws.date >= todayStr)
        })
        if (upcomingRegs.length === 0) return null
        return (
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-2 flex items-center gap-1.5">
              <ChevronRight className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" aria-hidden="true" />
              {t('my_workshop_regs_n', language).replace('{n}', upcomingRegs.length)}
            </h3>
            <div className="space-y-2">
              {upcomingRegs.map(reg => {
                const ws = workshops.find(w => String(w.id) === String(reg.workshop_id))
                if (!ws) return null
                return (
                  <div key={reg.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ws.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {ws.date ? formatDate(ws.date) : t('workshop_date_tbd', language)}
                      {ws.location ? ` · ${ws.location}` : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Attended Workshops / Certificates */}
      {(() => {
        const attendedRegs = workshopRegistrations.filter(r =>
          String(r.user_id) === String(loggedInUser.id) && r.attended
        )
        if (attendedRegs.length === 0) return null
        return (
          <div className="mb-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" aria-hidden="true" />
              {t('my_certificates_n', language).replace('{n}', attendedRegs.length)}
            </h3>
            <div className="space-y-2">
              {attendedRegs.map(reg => {
                const ws = workshops.find(w => String(w.id) === String(reg.workshop_id))
                if (!ws) return null
                return (
                  <div key={reg.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-4 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ws.name}</p>
                      {ws.date && <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(ws.date)}{ws.location ? ` · ${ws.location}` : ''}</p>}
                    </div>
                    <button
                      onClick={() => setCertModalWs(ws)}
                      className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl hover:opacity-90 active:scale-[0.98] transition"
                    >
                      <Award className="w-3.5 h-3.5" aria-hidden="true" />
                      {t('tab_certificate', language)}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {certModalWs && (
        <CertificateModal
          ws={certModalWs}
          template={certificateTemplates.find(t => String(t.city_id) === String(certModalWs.city_id)) || certificateTemplates[0] || null}
          user={loggedInUser}
          language={language}
          onClose={() => setCertModalWs(null)}
        />
      )}

      {/* Reschedule Modal */}
      {showReschedule && rescheduleTarget && (() => {
        const rescheduleLab = labs.find(l => String(l.id) === String(rescheduleTarget.lab_id))
        const labLocation = rescheduleLab?.location || null
        const allCitySlots = timeSlots.filter(s => String(s.city_id) === String(rescheduleTarget.city_id))
        const specificSlots = labLocation ? allCitySlots.filter(s => s.location === labLocation) : []
        const citySlots = specificSlots.length > 0 ? specificSlots : allCitySlots.filter(s => !s.location)
        const minDate = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return localDateStr(d) })()
        const maxDate = (() => { const d = new Date(); d.setDate(d.getDate() + 60); return localDateStr(d) })()
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div role="dialog" aria-modal="true" aria-labelledby="reschedule-title" className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-1">
                <h3 id="reschedule-title" className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" aria-hidden="true" />
                  {t('reschedule_title', language)}
                </h3>
                <button autoFocus onClick={() => setShowReschedule(false)} aria-label={t('btn_close', language)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" aria-hidden="true" /></button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{rescheduleTarget.lab_name} · {rescheduleTarget.city_name}</p>

              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">{t('reschedule_step1', language)}</p>
              <CalendarView
                selectedDate={rescheduleDate}
                onDayClick={(date) => { setRescheduleDate(date); setRescheduleSlot('') }}
                minDate={minDate}
                maxDate={maxDate}
                isDateDisabled={(date) => {
                  if (isSunday(date) || isTurkishHoliday(date)) return true
                  return closedDays.some(cd => cd.date === date && (!cd.city_id || String(cd.city_id) === String(rescheduleTarget.city_id)))
                }}
                language={language}
              />

              {rescheduleDate && citySlots.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-4 mb-2">{t('reschedule_step2', language)}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {citySlots.map(s => {
                      const { count, maxCap, isFull } = getRescheduleSlotAvailability(rescheduleDate, s.time_range)
                      const isSelected = rescheduleSlot === s.time_range
                      return (
                        <button
                          key={s.id}
                          disabled={isFull}
                          onClick={() => setRescheduleSlot(s.time_range)}
                          className={`py-2 px-3 rounded-xl text-xs border transition active:scale-[0.98] text-left ${
                            isFull ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700 text-gray-400' :
                            isSelected ? 'bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] border-transparent font-semibold' :
                            'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#1565C0] dark:hover:border-[#7DD4FC]'
                          }`}
                        >
                          {s.time_range}
                          <span className="block text-[10px] mt-0.5 opacity-70">{maxCap - count}/{maxCap} {t('slot_free_count', language)}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {rescheduleError && <p role="status" aria-live="polite" className="text-red-500 dark:text-red-400 text-xs mt-3">{rescheduleError}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  disabled={!rescheduleDate || !rescheduleSlot || rescheduleLoading}
                  onClick={handleReschedule}
                  className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl disabled:opacity-40 active:scale-[0.98] transition"
                >
                  {rescheduleLoading ? '...' : t('btn_update', language)}
                </button>
                <button
                  onClick={() => setShowReschedule(false)}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition"
                >
                  {t('btn_nevermind', language)}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-modal-title" className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 id="cancel-modal-title" className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">
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
                  autoFocus
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
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition disabled:opacity-60"
              >
                {submitting ? '...' : t('action_cancel', language)}
              </button>
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason('') }}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition"
              >
                {t('btn_nevermind', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şehir değişikliği uyarı modali */}
      {showCityChangeWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="city-change-title" className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 id="city-change-title" className="font-bold text-gray-900 dark:text-gray-100 text-base mb-2">
              {t('city_change_title', language)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {t('city_change_warning', language)}
            </p>
            <div className="flex gap-3">
              <button
                autoFocus
                onClick={(e) => handleSaveProfile(e)}
                disabled={editLoading}
                className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
              >
                {t('btn_continue', language)}
              </button>
              <button
                onClick={() => setShowCityChangeWarning(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition"
              >
                {t('btn_nevermind', language)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bekleme listesi çıkış onay modali */}
      {showWaitlistRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="waitlist-remove-title" className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 id="waitlist-remove-title" className="font-bold text-gray-900 dark:text-gray-100 text-base mb-2">
              {t('waitlist_remove_title', language)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {t('waitlist_remove_confirm', language)}
            </p>
            <div className="flex gap-3">
              <button
                autoFocus
                onClick={async () => {
                  setWaitlistRemoving(true)
                  const res = await removeFromWaitlist(showWaitlistRemoveConfirm)
                  setWaitlistRemoving(false)
                  if (res.success) setShowWaitlistRemoveConfirm(null)
                }}
                disabled={waitlistRemoving}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl active:scale-[0.98] transition disabled:opacity-50"
              >
                {t('btn_yes_remove', language)}
              </button>
              <button
                onClick={() => setShowWaitlistRemoveConfirm(null)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition"
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

function AppointmentCard({ appt, language, canDirectCancel, canRequestCancel, onDirectCancelClick, onRequestCancelClick, canReschedule, onRescheduleClick }) {
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
        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" aria-hidden="true" />{formatDate(appt.date)}</span>
        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden="true" />{appt.time_slot}</span>
      </div>
      {appt.note && appt.status === 'CANCELLATION_REQUESTED' && (
        <p className="text-xs text-blue-600 dark:text-blue-400 mb-2">
          {t('lbl_cancel_reason', language)}: {appt.note}
        </p>
      )}
      {(canReschedule || canDirectCancel || canRequestCancel) && (
        <div className="flex gap-2 mt-1">
          {canReschedule && (
            <button
              onClick={onRescheduleClick}
              className="flex-1 py-2 border border-[#1565C0]/40 text-[#1565C0] dark:text-[#7DD4FC] dark:border-[#7DD4FC]/40 text-xs font-semibold rounded-xl hover:bg-[#1565C0]/5 active:scale-[0.98] transition inline-flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" />{t('reschedule_title', language)}
            </button>
          )}
          {canDirectCancel && (
            <button
              onClick={onDirectCancelClick}
              className="flex-1 py-2 border border-red-400 text-red-600 dark:text-red-400 dark:border-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] transition"
            >
              {t('action_cancel', language)}
            </button>
          )}
          {canRequestCancel && (
            <button
              onClick={onRequestCancelClick}
              className="flex-1 py-2 border border-orange-400 text-orange-600 dark:text-orange-400 dark:border-orange-600 text-xs font-semibold rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 active:scale-[0.98] transition"
            >
              {t('btn_request_cancellation', language)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ProfileField({ label, value, valueClass }) {
  return (
    <div className="bg-gray-50 dark:bg-[#0E1A30] rounded-xl px-3 py-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${valueClass || ''}`}>{value || '-'}</p>
    </div>
  )
}

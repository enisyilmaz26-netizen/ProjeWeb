import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { t, formatDate, translations, STATUS_COLORS, STATUS_LABELS } from '../lib/languages'
import { INPUT_BASE, LABEL_CLASS } from '../lib/ui'
import PasswordInput from '../components/PasswordInput'
import { isPasswordStrong } from '../lib/passwordUtils'
import { X, Pencil, Lock, Calendar, Clock, ChevronUp, ChevronDown, ChevronRight, CalendarDays, List, RefreshCw, Award } from 'lucide-react'
import CalendarView from '../components/CalendarView'
import { isTurkishHoliday, isSunday } from '../lib/holidays'
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
    if (!showPwChange && !showCancelModal && !showReschedule) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (submitting || rescheduleLoading) return
        setShowPwChange(false)
        setShowCancelModal(false)
        setShowReschedule(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [showPwChange, showCancelModal, showReschedule, submitting, rescheduleLoading])

  // Profile editing
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState('')
  const [showCityChangeWarning, setShowCityChangeWarning] = useState(false)
  const [showWaitlistRemoveConfirm, setShowWaitlistRemoveConfirm] = useState(null)
  const [certModalWs, setCertModalWs] = useState(null)

  const todayStr = new Date().toISOString().split('T')[0]

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
    const res = await rescheduleAppointment(rescheduleTarget.id, rescheduleDate, rescheduleSlot)
    setRescheduleLoading(false)
    if (res.success) {
      setShowReschedule(false)
      setRescheduleTarget(null)
      setRescheduleDate('')
      setRescheduleSlot('')
      setSuccessMsg(language === 'TR' ? 'Randevu yeniden zamanlandı.' : 'Appointment rescheduled.')
      clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000)
    } else {
      setRescheduleError(res.error)
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
      clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000)
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
      clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000)
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
    // Türk telefon numarası: 05XXXXXXXXX (11 hane) veya 5XXXXXXXXX (10 hane)
    if (phoneDigits.length === 0 || !/^(0?5\d{9})$/.test(phoneDigits)) {
      setEditError(language === 'TR' ? 'Geçerli bir telefon numarası girin. Örnek: 05XX XXX XX XX' : 'Enter a valid phone number. Example: 05XX XXX XX XX')
      return
    }
    const cityChanged = String(editForm.city_id) !== String(loggedInUser.city_id)
    const hasActiveAppts = upcomingAppointments.some(a => ['PENDING', 'APPROVED'].includes(a.status))
    if (cityChanged && hasActiveAppts && !showCityChangeWarning) {
      setShowCityChangeWarning(true)
      return
    }
    setShowCityChangeWarning(false)
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
      clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000)
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
            <label className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#1565C0] dark:bg-[#7DD4FC] rounded-full flex items-center justify-center cursor-pointer shadow hover:opacity-90 transition" title={language === 'TR' ? 'JPEG, PNG, WebP veya GIF · Maks. 1 MB' : 'JPEG, PNG, WebP or GIF · Max 1 MB'}>
              {avatarUploading ? <span className="text-white dark:text-[#060E26] text-[10px]">...</span> : <Pencil className="w-3 h-3 text-white dark:text-[#060E26]" />}
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" disabled={avatarUploading} onChange={async (e) => {
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
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{language === 'TR' ? 'Fotoğraf: JPEG, PNG, WebP, GIF · Maks. 1 MB' : 'Photo: JPEG, PNG, WebP, GIF · Max 1 MB'}</p>
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

      {/* Cancellation Requests */}
      {upcomingAppointments.filter(a => a.status === 'CANCELLATION_REQUESTED').length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-2xl p-4 mb-4">
          <h3 className="font-bold text-orange-700 dark:text-orange-300 text-sm mb-2 flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {language === 'TR' ? 'Bekleyen İptal Talepleriniz' : 'Pending Cancellation Requests'}
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
                  {language === 'TR' ? 'Yönetici onayı bekleniyor.' : 'Waiting for admin review.'}
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
                {language === 'TR' ? 'Bu tarihte randevu yok.' : 'No appointments on this date.'}
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

      {/* Cancelled Appointments */}
      {cancelledAppointments.length > 0 && (
        <>
          <button
            onClick={() => setShowCancelled(p => !p)}
            className="flex items-center gap-2 text-sm font-medium text-red-500 dark:text-red-400 mb-3 hover:text-red-700 dark:hover:text-red-300 transition"
          >
            <span>{showCancelled ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
            {language === 'TR' ? `İptal Edilmiş (${cancelledAppointments.length})` : `Cancelled (${cancelledAppointments.length})`}
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
            <Clock className="w-4 h-4" />
            {language === 'TR' ? `Bekleme Listesi (${waitlist.length})` : `Waitlist (${waitlist.length})`}
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
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  {language === 'TR' ? 'Çıkar' : 'Remove'}
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
              <ChevronRight className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" />
              {language === 'TR' ? `Atölye Kayıtlarım (${upcomingRegs.length})` : `My Workshop Registrations (${upcomingRegs.length})`}
            </h3>
            <div className="space-y-2">
              {upcomingRegs.map(reg => {
                const ws = workshops.find(w => String(w.id) === String(reg.workshop_id))
                if (!ws) return null
                return (
                  <div key={reg.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ws.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {ws.date ? formatDate(ws.date) : (language === 'TR' ? 'Tarih belirlenmedi' : 'Date TBD')}
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
              <Award className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" />
              {language === 'TR' ? `Sertifikalarım (${attendedRegs.length})` : `My Certificates (${attendedRegs.length})`}
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
                      className="flex-shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl hover:opacity-90 transition"
                    >
                      <Award className="w-3.5 h-3.5" />
                      {language === 'TR' ? 'Sertifika' : 'Certificate'}
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
        const minDate = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0] })()
        const maxDate = (() => { const d = new Date(); d.setDate(d.getDate() + 60); return d.toISOString().split('T')[0] })()
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" />
                  {language === 'TR' ? 'Yeniden Zamanla' : 'Reschedule'}
                </h3>
                <button onClick={() => setShowReschedule(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{rescheduleTarget.lab_name} · {rescheduleTarget.city_name}</p>

              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">{language === 'TR' ? '1. Yeni Tarih Seçin' : '1. Pick a New Date'}</p>
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
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mt-4 mb-2">{language === 'TR' ? '2. Saat Seçin' : '2. Pick a Time'}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {citySlots.map(s => {
                      const { count, maxCap, isFull } = getRescheduleSlotAvailability(rescheduleDate, s.time_range)
                      const isSelected = rescheduleSlot === s.time_range
                      return (
                        <button
                          key={s.id}
                          disabled={isFull}
                          onClick={() => setRescheduleSlot(s.time_range)}
                          className={`py-2 px-3 rounded-xl text-xs border transition text-left ${
                            isFull ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700 text-gray-400' :
                            isSelected ? 'bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] border-transparent font-semibold' :
                            'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#1565C0] dark:hover:border-[#7DD4FC]'
                          }`}
                        >
                          {s.time_range}
                          <span className="block text-[10px] mt-0.5 opacity-70">{maxCap - count}/{maxCap} {language === 'TR' ? 'boş' : 'free'}</span>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}

              {rescheduleError && <p className="text-red-500 dark:text-red-400 text-xs mt-3">{rescheduleError}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  disabled={!rescheduleDate || !rescheduleSlot || rescheduleLoading}
                  onClick={handleReschedule}
                  className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl disabled:opacity-40 transition"
                >
                  {rescheduleLoading ? '...' : (language === 'TR' ? 'Güncelle' : 'Update')}
                </button>
                <button
                  onClick={() => setShowReschedule(false)}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl"
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

      {/* Şehir değişikliği uyarı modali */}
      {showCityChangeWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-2">
              {language === 'TR' ? 'Şehir Değişikliği' : 'City Change'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {language === 'TR'
                ? 'Aktif randevularınız var. Şehri değiştirirseniz mevcut randevularınız etkilenmez ancak yeni şehirde oluşturmanız gerekebilir. Devam etmek istiyor musunuz?'
                : 'You have active appointments. Changing city will not cancel them but new appointments must be in the new city. Do you want to continue?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={(e) => handleSaveProfile(e)}
                className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition"
              >
                {language === 'TR' ? 'Devam Et' : 'Continue'}
              </button>
              <button
                onClick={() => setShowCityChangeWarning(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {language === 'TR' ? 'Vazgeç' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bekleme listesi çıkış onay modali */}
      {showWaitlistRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-2">
              {language === 'TR' ? 'Bekleme Listesinden Çıkar' : 'Remove from Waitlist'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              {language === 'TR' ? 'Bu bekleme listesi kaydını silmek istediğinizden emin misiniz?' : 'Are you sure you want to remove this waitlist entry?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={async () => { await removeFromWaitlist(showWaitlistRemoveConfirm); setShowWaitlistRemoveConfirm(null) }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition"
              >
                {language === 'TR' ? 'Evet, Çıkar' : 'Yes, Remove'}
              </button>
              <button
                onClick={() => setShowWaitlistRemoveConfirm(null)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {language === 'TR' ? 'Vazgeç' : 'Cancel'}
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
        <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{formatDate(appt.date)}</span>
        <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{appt.time_slot}</span>
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
              className="flex-1 py-2 border border-[#1565C0]/40 text-[#1565C0] dark:text-[#7DD4FC] dark:border-[#7DD4FC]/40 text-xs font-semibold rounded-xl hover:bg-[#1565C0]/5 transition inline-flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />{language === 'TR' ? 'Yeniden Zamanla' : 'Reschedule'}
            </button>
          )}
          {canDirectCancel && (
            <button
              onClick={onDirectCancelClick}
              className="flex-1 py-2 border border-red-400 text-red-600 dark:text-red-400 dark:border-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
            >
              {t('action_cancel', language)}
            </button>
          )}
          {canRequestCancel && (
            <button
              onClick={onRequestCancelClick}
              className="flex-1 py-2 border border-orange-400 text-orange-600 dark:text-orange-400 dark:border-orange-600 text-xs font-semibold rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/20 transition"
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

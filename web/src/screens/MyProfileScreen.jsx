import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { t, formatDate } from '../lib/languages'

const STATUS_COLORS = {
  PENDING: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  APPROVED: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  CANCELLED: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  CANCELLATION_REQUESTED: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
}

const STATUS_LABELS = {
  PENDING: { TR: 'Beklemede', EN: 'Pending' },
  APPROVED: { TR: 'Onaylandı', EN: 'Approved' },
  CANCELLED: { TR: 'İptal Edildi', EN: 'Cancelled' },
  CANCELLATION_REQUESTED: { TR: 'İptal Talebi', EN: 'Cancel Requested' },
}

export default function MyProfileScreen() {
  const { loggedInUser, appointments, submitCancellationRequest, updateUserProfile, language } = useApp()

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [showPast, setShowPast] = useState(false)

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
    userAppointments.filter(a => a.date >= todayStr && a.status !== 'CANCELLED'),
    [userAppointments, todayStr]
  )

  const pastAppointments = useMemo(() =>
    userAppointments.filter(a => a.date < todayStr || a.status === 'CANCELLED'),
    [userAppointments, todayStr]
  )

  const canRequestCancel = (appt) => {
    if (appt.status === 'CANCELLED' || appt.status === 'CANCELLATION_REQUESTED') return false
    return appt.date >= todayStr
  }

  const openCancelModal = (id) => {
    setCancelTargetId(id)
    setCancelReason('')
    setShowCancelModal(true)
  }

  const handleSubmitCancel = async () => {
    if (!cancelTargetId) return
    setSubmitting(true)
    const result = await submitCancellationRequest(cancelTargetId, cancelReason)
    setSubmitting(false)
    if (result.success) {
      setShowCancelModal(false)
      setCancelTargetId(null)
      setCancelReason('')
      setSuccessMsg(language === 'TR' ? 'İptal talebiniz iletildi.' : 'Your cancellation request has been submitted.')
      setTimeout(() => setSuccessMsg(''), 4000)
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
    })
    setEditError('')
    setEditMode(true)
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setEditError('')
    const phoneDigits = editForm.phone.replace(/\D/g, '')
    if (phoneDigits.length < 10 || phoneDigits.length > 11) {
      setEditError(language === 'TR' ? 'Geçerli bir telefon numarası giriniz (10-11 rakam).' : 'Please enter a valid phone number (10-11 digits).')
      return
    }
    setEditLoading(true)
    const result = await updateUserProfile(loggedInUser.id, {
      name: editForm.name.trim(),
      surname: editForm.surname.trim(),
      branch: editForm.branch.trim(),
      work_location: editForm.work_location.trim(),
      phone: editForm.phone.trim(),
      district: editForm.district.trim(),
    })
    setEditLoading(false)
    if (result.success) {
      setEditMode(false)
      setSuccessMsg(language === 'TR' ? 'Profiliniz güncellendi.' : 'Profile updated successfully.')
      setTimeout(() => setSuccessMsg(''), 4000)
    } else {
      setEditError(result.error || (language === 'TR' ? 'Bir hata oluştu.' : 'An error occurred.'))
    }
  }

  if (!loggedInUser) return null

  const initials = `${(loggedInUser.name || '?').charAt(0)}${(loggedInUser.surname || '').charAt(0)}`.toUpperCase()
  const inputClass = "w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2C2A31] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6750A4] dark:focus:ring-[#D0BCFF] text-sm"
  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"

  return (
    <div className="px-4 py-4">
      {successMsg && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-4 flex justify-between items-start">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-2 text-green-500">✕</button>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-5 mb-5">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#6750A4] dark:bg-[#D0BCFF] flex items-center justify-center flex-shrink-0">
            <span className="text-white dark:text-[#141218] text-xl font-bold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">{loggedInUser.name} {loggedInUser.surname}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{loggedInUser.email}</p>
          </div>
          {!editMode && (
            <button
              onClick={startEdit}
              className="flex-shrink-0 text-xs text-[#6750A4] dark:text-[#D0BCFF] border border-[#6750A4]/30 dark:border-[#D0BCFF]/30 rounded-lg px-3 py-1.5 hover:bg-[#6750A4]/5 transition"
            >
              ✏️ {language === 'TR' ? 'Düzenle' : 'Edit'}
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
            {editError && (
              <p className="text-red-600 dark:text-red-400 text-xs">{editError}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={editLoading} className="flex-1 py-2.5 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] rounded-xl font-semibold text-sm disabled:opacity-60 hover:opacity-90 transition">
                {editLoading ? '...' : (language === 'TR' ? 'Kaydet' : 'Save')}
              </button>
              <button type="button" onClick={() => setEditMode(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                {language === 'TR' ? 'Vazgeç' : 'Cancel'}
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
              label={language === 'TR' ? 'Üyelik Durumu' : 'Membership Status'}
              value={loggedInUser.is_approved ? (language === 'TR' ? '✓ Onaylı' : '✓ Approved') : (language === 'TR' ? 'Onay Bekliyor' : 'Pending Approval')}
              valueClass={loggedInUser.is_approved ? 'text-green-600 dark:text-green-400 font-medium' : 'text-orange-500'}
            />
          </div>
        )}
      </div>

      {/* Upcoming Appointments */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">
          {language === 'TR' ? 'Yaklaşan Randevularım' : 'Upcoming Appointments'} ({upcomingAppointments.length})
        </h3>
      </div>

      {upcomingAppointments.length === 0 ? (
        <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-6 text-center text-gray-500 dark:text-gray-400 text-sm mb-4">
          {language === 'TR' ? 'Yaklaşan randevu yok.' : 'No upcoming appointments.'}
        </div>
      ) : (
        <div className="space-y-3 mb-5">
          {upcomingAppointments.map(appt => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              language={language}
              canCancel={canRequestCancel(appt)}
              onCancelClick={() => openCancelModal(appt.id)}
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
            <span>{showPast ? '▼' : '▶'}</span>
            {language === 'TR' ? `Geçmiş Randevular (${pastAppointments.length})` : `Past Appointments (${pastAppointments.length})`}
          </button>
          {showPast && (
            <div className="space-y-3 mb-4 opacity-75">
              {pastAppointments.map(appt => (
                <AppointmentCard key={appt.id} appt={appt} language={language} canCancel={false} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">
              {language === 'TR' ? 'İptal Talebi' : 'Cancellation Request'}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-xs mb-4">
              {language === 'TR' ? 'İptal sebebinizi belirtin (isteğe bağlı).' : 'State your cancellation reason (optional).'}
            </p>
            <textarea
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2C2A31] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6750A4] text-sm resize-none mb-4"
              rows={4}
              placeholder={language === 'TR' ? 'İptal sebebinizi yazın...' : 'Write your reason...'}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSubmitCancel}
                disabled={submitting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
              >
                {submitting ? '...' : (language === 'TR' ? 'Gönder' : 'Submit')}
              </button>
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {language === 'TR' ? 'Vazgeç' : 'Back'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AppointmentCard({ appt, language, canCancel, onCancelClick }) {
  return (
    <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4">
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
        <span>📅 {formatDate(appt.date)}</span>
        <span>🕐 {appt.time_slot}</span>
      </div>
      {appt.note && appt.status === 'CANCELLATION_REQUESTED' && (
        <p className="text-xs text-purple-600 dark:text-purple-400 mb-2">
          {language === 'TR' ? 'İptal notu' : 'Cancel reason'}: {appt.note}
        </p>
      )}
      {canCancel && (
        <button
          onClick={onCancelClick}
          className="w-full py-2 border border-red-400 text-red-600 dark:text-red-400 dark:border-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          {language === 'TR' ? 'İptal Talebi Gönder' : 'Request Cancellation'}
        </button>
      )}
    </div>
  )
}

function ProfileField({ label, value, valueClass }) {
  return (
    <div className="bg-gray-50 dark:bg-[#2C2A31] rounded-xl px-3 py-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${valueClass || ''}`}>{value || '—'}</p>
    </div>
  )
}

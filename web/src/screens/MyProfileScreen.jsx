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
  const { loggedInUser, appointments, submitCancellationRequest, language } = useApp()

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelTargetId, setCancelTargetId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const userAppointments = useMemo(() => {
    if (!loggedInUser) return []
    return appointments.filter(a => a.user_email === loggedInUser.email)
  }, [appointments, loggedInUser])

  const canRequestCancel = (appt) => {
    if (appt.status === 'CANCELLED' || appt.status === 'CANCELLATION_REQUESTED') return false
    // Check if future
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (appt.date) {
      const apptDate = new Date(appt.date)
      if (apptDate < today) return false
    }
    return true
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

  if (!loggedInUser) return null

  const initials = `${(loggedInUser.name || '?').charAt(0)}${(loggedInUser.surname || '').charAt(0)}`.toUpperCase()

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
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">{loggedInUser.name} {loggedInUser.surname}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{loggedInUser.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ProfileField label={t('input_city', language)} value={loggedInUser.city_name} />
          <ProfileField label={t('input_district', language)} value={loggedInUser.district} />
          <ProfileField label={t('input_branch', language)} value={loggedInUser.branch} />
          <ProfileField label={t('input_work_location', language)} value={loggedInUser.work_location} />
          <ProfileField label={t('input_phone', language)} value={loggedInUser.phone} />
          <ProfileField label={language === 'TR' ? 'Üyelik Durumu' : 'Membership Status'} value={loggedInUser.is_approved ? (language === 'TR' ? '✓ Onaylı' : '✓ Approved') : (language === 'TR' ? 'Onay Bekliyor' : 'Pending Approval')} valueClass={loggedInUser.is_approved ? 'text-green-600 dark:text-green-400 font-medium' : 'text-orange-500'} />
        </div>
      </div>

      {/* Appointments */}
      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">
        {language === 'TR' ? 'Randevularım' : 'My Appointments'} ({userAppointments.length})
      </h3>

      {userAppointments.length === 0 ? (
        <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
          {t('no_appointments', language)}
        </div>
      ) : (
        <div className="space-y-3">
          {userAppointments.map(appt => (
            <div key={appt.id} className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4">
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

              {canRequestCancel(appt) && (
                <button
                  onClick={() => openCancelModal(appt.id)}
                  className="w-full py-2 border border-red-400 text-red-600 dark:text-red-400 dark:border-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  {language === 'TR' ? 'İptal Talebi Gönder' : 'Request Cancellation'}
                </button>
              )}
            </div>
          ))}
        </div>
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

function ProfileField({ label, value, valueClass }) {
  return (
    <div className="bg-gray-50 dark:bg-[#2C2A31] rounded-xl px-3 py-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
      <p className={`text-sm font-medium text-gray-800 dark:text-gray-200 ${valueClass || ''}`}>{value || '—'}</p>
    </div>
  )
}

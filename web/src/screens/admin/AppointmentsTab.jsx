import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { t, formatDate, STATUS_COLORS, STATUS_LABELS } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { PAGE_SIZE, statusLabel, exportToCSV } from '../../lib/adminHelpers'
import { Download } from 'lucide-react'

export default function AppointmentsTab({ language, isGlobal, adminCityId, onRequestConfirm }) {
  const { appointments, cities, labs, approveAppointment, cancelAppointment, denyCancellationRequest, markAppointmentCompleted, createNotification } = useApp()
  const inputClass = INPUT_BASE
  const todayStr = new Date().toISOString().split('T')[0]

  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [processingId, setProcessingId] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')

  const availableLocations = useMemo(() => {
    const scopeCityId = !isGlobal ? adminCityId : (filterCity || null)
    const scopeLabs = scopeCityId ? labs.filter(l => String(l.city_id) === String(scopeCityId)) : labs
    return [...new Set(scopeLabs.map(l => l.location).filter(Boolean))]
  }, [labs, isGlobal, adminCityId, filterCity])

  const filteredAppointments = useMemo(() => {
    let list = appointments
    if (!isGlobal && adminCityId) {
      list = list.filter(a => String(a.city_id) === String(adminCityId))
    } else if (filterCity) {
      list = list.filter(a => String(a.city_id) === String(filterCity))
    }
    if (filterStatus) list = list.filter(a => a.status === filterStatus)
    if (filterLocation) {
      const labIds = labs.filter(l => l.location === filterLocation).map(l => l.id)
      list = list.filter(a => labIds.includes(a.lab_id))
    }
    if (filterDateFrom) list = list.filter(a => a.date >= filterDateFrom)
    if (filterDateTo) list = list.filter(a => a.date <= filterDateTo)
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(a =>
        (a.user_name || '').toLowerCase().includes(q) ||
        (a.user_surname || '').toLowerCase().includes(q) ||
        (a.user_email || '').toLowerCase().includes(q) ||
        (a.lab_name || '').toLowerCase().includes(q) ||
        (a.city_name || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [appointments, isGlobal, adminCityId, filterCity, filterStatus, filterLocation, filterDateFrom, filterDateTo, search, labs])

  const resetFilters = () => {
    setSearch(''); setFilterCity(''); setFilterStatus(''); setFilterLocation('')
    setFilterDateFrom(''); setFilterDateTo(''); setVisibleCount(PAGE_SIZE)
  }

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000) }

  const execApprove = async (id) => {
    setProcessingId(id)
    await approveAppointment(id)
    const appt = appointments.find(a => a.id === id)
    if (appt) {
      const prefix = appt.city_name ? `[${appt.city_name}] ` : ''
      await createNotification({ title: `${prefix}${t('notif_appt_approved', language)}`, message: `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${appt.date} ${appt.time_slot}`, type: 'SYSTEM' })
    }
    setProcessingId(null)
    showSuccess(t('action_success_approved', language))
  }

  const execCancel = async (id) => {
    setProcessingId(id)
    await cancelAppointment(id)
    const appt = appointments.find(a => a.id === id)
    if (appt) {
      const prefix = appt.city_name ? `[${appt.city_name}] ` : ''
      await createNotification({ title: `${prefix}${t('notif_appt_cancelled', language)}`, message: `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${appt.date} ${appt.time_slot}`, type: 'ALERT' })
    }
    setProcessingId(null)
    showSuccess(t('action_success_cancelled', language))
  }

  const execApproveCancellation = async (id) => {
    setProcessingId(id)
    await cancelAppointment(id)
    const appt = appointments.find(a => a.id === id)
    if (appt) {
      const prefix = appt.city_name ? `[${appt.city_name}] ` : ''
      await createNotification({ title: `${prefix}${t('notif_appt_cancelled', language)}`, message: `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${appt.date} ${appt.time_slot}`, type: 'ALERT' })
    }
    setProcessingId(null)
    showSuccess(t('action_success_cancellation_approved', language))
  }

  const execDenyCancellation = async (id) => {
    setProcessingId(id)
    await denyCancellationRequest(id)
    setProcessingId(null)
    showSuccess(t('action_success_cancellation_denied', language))
  }

  const handleApprove = (id) => onRequestConfirm(t('confirm_approve_appt', language), () => execApprove(id))
  const handleCancel = (id) => onRequestConfirm(t('confirm_cancel_appt', language), () => execCancel(id))
  const handleApproveCancellation = (id) => onRequestConfirm(t('confirm_approve_cancellation', language), () => execApproveCancellation(id))
  const handleDenyCancellation = (id) => onRequestConfirm(t('confirm_deny_cancellation', language), () => execDenyCancellation(id))
  const handleMarkCompleted = (id) => onRequestConfirm(t('confirm_complete_appt', language), async () => { setProcessingId(id); await markAppointmentCompleted(id); setProcessingId(null); showSuccess(t('action_success_completed', language)) })

  return (
    <div>
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex flex-wrap gap-2">
          <input type="text" placeholder={t('search_placeholder', language)} className={`${inputClass} flex-1 min-w-[160px]`} value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }} />
          {isGlobal && (
            <select className={inputClass} value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterLocation(''); setVisibleCount(PAGE_SIZE) }}>
              <option value="">{t('filter_all_provinces', language)}</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {availableLocations.length > 1 && (
            <select className={inputClass} value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setVisibleCount(PAGE_SIZE) }}>
              <option value="">{t('filter_all_locations', language)}</option>
              {availableLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          )}
          <select className={inputClass} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setVisibleCount(PAGE_SIZE) }}>
            <option value="">{t('filter_all_statuses', language)}</option>
            <option value="PENDING">{STATUS_LABELS.PENDING[language]}</option>
            <option value="APPROVED">{STATUS_LABELS.APPROVED[language]}</option>
            <option value="COMPLETED">{STATUS_LABELS.COMPLETED[language]}</option>
            <option value="CANCELLED">{STATUS_LABELS.CANCELLED[language]}</option>
            <option value="CANCELLATION_REQUESTED">{STATUS_LABELS.CANCELLATION_REQUESTED[language]}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('filter_date', language)}</span>
          <input type="date" className={inputClass} value={filterDateFrom} max={filterDateTo || undefined} onChange={e => { setFilterDateFrom(e.target.value); setVisibleCount(PAGE_SIZE) }} />
          <span className="text-xs text-gray-400">—</span>
          <input type="date" className={inputClass} value={filterDateTo} min={filterDateFrom || undefined} onChange={e => { setFilterDateTo(e.target.value); setVisibleCount(PAGE_SIZE) }} />
          {(search || filterCity || filterStatus || filterLocation || filterDateFrom || filterDateTo) && (
            <button onClick={resetFilters} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline">{t('filter_clear', language)}</button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="mb-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-xs font-medium">
          {successMsg}
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          {filteredAppointments.length} {t('records_count', language)}
          {filteredAppointments.length > visibleCount && ` (${visibleCount} ${t('shown', language)})`}
        </p>
        {filteredAppointments.length > 0 && (
          <button onClick={() => exportToCSV(filteredAppointments, language)} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition inline-flex items-center gap-1">
            <Download className="w-3.5 h-3.5" />{t('export_csv', language)}
          </button>
        )}
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-gray-400 text-sm">{t('no_appointments', language)}</div>
      ) : (
        <>
          <div className="space-y-3">
            {filteredAppointments.slice(0, visibleCount).map(appt => (
              <div key={appt.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{appt.user_name} {appt.user_surname}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{appt.user_email}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-lg flex-shrink-0 ${STATUS_COLORS[appt.status] || ''}`}>
                    {statusLabel(appt.status, language)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
                  <span><span className="font-medium">{t('lbl_studio', language)}:</span> {appt.lab_name}</span>
                  <span><span className="font-medium">{t('lbl_province', language)}:</span> {appt.city_name}</span>
                  <span><span className="font-medium">{t('lbl_date', language)}:</span> {formatDate(appt.date)}</span>
                  <span><span className="font-medium">{t('lbl_time', language)}:</span> {appt.time_slot}</span>
                  {appt.user_branch && <span><span className="font-medium">{t('lbl_branch', language)}:</span> {appt.user_branch}</span>}
                  {appt.user_phone && <span><span className="font-medium">{t('lbl_phone', language)}:</span> {appt.user_phone}</span>}
                  {appt.user_work_location && <span className="col-span-2"><span className="font-medium">{t('lbl_institution', language)}:</span> {appt.user_work_location}</span>}
                  {appt.note && <span className="col-span-2"><span className="font-medium">{t('lbl_note', language)}:</span> {appt.note}</span>}
                </div>
                {appt.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleApprove(appt.id)} disabled={processingId === appt.id} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
                      {processingId === appt.id ? '...' : t('action_approve', language)}
                    </button>
                    <button onClick={() => handleCancel(appt.id)} disabled={processingId === appt.id} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
                      {processingId === appt.id ? '...' : t('action_cancel', language)}
                    </button>
                  </div>
                )}
                {appt.status === 'CANCELLATION_REQUESTED' && (
                  <div className="flex gap-2">
                    <button onClick={() => handleApproveCancellation(appt.id)} disabled={processingId === appt.id} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
                      {processingId === appt.id ? '...' : t('approve_cancellation', language)}
                    </button>
                    <button onClick={() => handleDenyCancellation(appt.id)} disabled={processingId === appt.id} className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
                      {processingId === appt.id ? '...' : t('deny_cancellation', language)}
                    </button>
                  </div>
                )}
                {appt.status === 'APPROVED' && appt.date >= todayStr && (
                  <button onClick={() => handleCancel(appt.id)} disabled={processingId === appt.id} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
                    {processingId === appt.id ? '...' : t('action_cancel', language)}
                  </button>
                )}
                {appt.status === 'APPROVED' && appt.date < todayStr && (
                  <button onClick={() => handleMarkCompleted(appt.id)} disabled={processingId === appt.id} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
                    {processingId === appt.id ? '...' : t('mark_completed', language)}
                  </button>
                )}
              </div>
            ))}
          </div>
          {filteredAppointments.length > visibleCount && (
            <button onClick={() => setVisibleCount(c => c + PAGE_SIZE)} className="w-full mt-3 py-3 border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 text-[#1565C0] dark:text-[#7DD4FC] rounded-xl text-sm font-medium hover:bg-[#1565C0]/5 transition">
              {t('show_more', language)} ({filteredAppointments.length - visibleCount} {t('remaining', language)})
            </button>
          )}
        </>
      )}
    </div>
  )
}

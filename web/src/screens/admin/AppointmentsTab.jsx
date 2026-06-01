import { useState, useMemo, useEffect, useRef } from 'react'
import { useApp } from '../../context/AppContext'
import { t, formatDate, STATUS_COLORS, STATUS_LABELS } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { PAGE_SIZE, statusLabel, exportToCSV } from '../../lib/adminHelpers'
import { Download, CalendarDays, List, Pencil, X, MessageSquare } from 'lucide-react'
import CalendarView from '../../components/CalendarView'
import { isTurkishHoliday, isSunday, localDateStr } from '../../lib/holidays'

export default function AppointmentsTab({ language, isGlobal, adminCityId, onRequestConfirm, onGoToMessages }) {
  const { appointments, cities, labs, timeSlots, approveAppointment, cancelAppointment, denyCancellationRequest, markAppointmentCompleted, isDateClosed } = useApp()
  const inputClass = INPUT_BASE
  const todayStr = localDateStr()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const successTimer = useRef(null)
  const errorTimer = useRef(null)

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => () => { clearTimeout(successTimer.current); clearTimeout(errorTimer.current) }, [])
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [processingId, setProcessingId] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [editingApptId, setEditingApptId] = useState(null)
  const [editDate, setEditDate] = useState('')
  const [editTimeSlot, setEditTimeSlot] = useState('')
  const [editDateError, setEditDateError] = useState('')
  const [viewMode, setViewMode] = useState('list')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkProcessing, setBulkProcessing] = useState(false)

  const availableLocations = useMemo(() => {
    const scopeCityId = !isGlobal ? adminCityId : (filterCity || null)
    const scopeLabs = scopeCityId ? labs.filter(l => String(l.city_id) === String(scopeCityId)) : labs
    return [...new Set(scopeLabs.map(l => l.location).filter(Boolean))]
  }, [labs, isGlobal, adminCityId, filterCity])

  const STATUS_ORDER = { PENDING: 0, CANCELLATION_REQUESTED: 1, APPROVED: 2, COMPLETED: 3, CANCELLED: 4 }

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
    return [...list].sort((a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99))
  }, [appointments, isGlobal, adminCityId, filterCity, filterStatus, filterLocation, filterDateFrom, filterDateTo, search, labs])

  const resetFilters = () => {
    setSearchInput(''); setSearch(''); setFilterCity(''); setFilterStatus(''); setFilterLocation('')
    setFilterDateFrom(''); setFilterDateTo(''); setVisibleCount(PAGE_SIZE); setSelectedIds(new Set())
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const s = new Set(prev)
      if (s.has(id)) s.delete(id)
      else s.add(id)
      return s
    })
  }

  const execBulkApprove = async () => {
    setErrorMsg('')
    setBulkProcessing(true)
    const ids = [...selectedIds]
    const failedIds = []
    try {
      for (const id of ids) {
        const result = await approveAppointment(id)
        if (result?.success === false) failedIds.push(id)
      }
      setSelectedIds(new Set())
      if (failedIds.length > 0) {
        const names = failedIds.map(id => { const a = appointments.find(x => x.id === id); return a ? `${a.user_name} ${a.user_surname}` : `#${id}` }).join(', ')
        showError(`${failedIds.length} randevu onaylanamadı: ${names}`)
      }
      if (failedIds.length < ids.length) showSuccess(`${t('action_success_approved', language)} (${ids.length - failedIds.length}/${ids.length})`)
    } finally {
      setBulkProcessing(false)
    }
  }

  const execBulkCancel = async () => {
    setErrorMsg('')
    setBulkProcessing(true)
    const ids = [...selectedIds]
    const failedIds = []
    try {
      for (const id of ids) {
        const result = await cancelAppointment(id)
        if (result?.success === false) failedIds.push(id)
      }
      setSelectedIds(new Set())
      if (failedIds.length > 0) {
        const names = failedIds.map(id => { const a = appointments.find(x => x.id === id); return a ? `${a.user_name} ${a.user_surname}` : `#${id}` }).join(', ')
        showError(`${failedIds.length} randevu iptal edilemedi: ${names}`)
      }
      if (failedIds.length < ids.length) showSuccess(`${t('action_success_cancelled', language)} (${ids.length - failedIds.length}/${ids.length})`)
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleBulkApprove = () => onRequestConfirm(t('bulk_approve', language), execBulkApprove)
  const handleBulkCancel = () => onRequestConfirm(t('bulk_cancel', language), execBulkCancel)

  const showSuccess = (msg) => {
    clearTimeout(errorTimer.current); setErrorMsg('')
    clearTimeout(successTimer.current)
    setSuccessMsg(msg)
    successTimer.current = setTimeout(() => setSuccessMsg(''), 3000)
  }
  const showError = (msg) => {
    clearTimeout(successTimer.current); setSuccessMsg('')
    clearTimeout(errorTimer.current)
    setErrorMsg(msg)
    errorTimer.current = setTimeout(() => setErrorMsg(''), 3000)
  }

  const execApprove = async (id, newDate, newTimeSlot) => {
    setProcessingId(id)
    try {
      const result = await approveAppointment(id, newDate || null, newTimeSlot || null)
      if (!result.success) { showError(t('err_generic', language)); return }
      setEditingApptId(null); setEditDate(''); setEditTimeSlot(''); setEditDateError('')
      showSuccess(t('action_success_approved', language))
    } finally {
      setProcessingId(null)
    }
  }

  const execCancel = async (id) => {
    setProcessingId(id)
    try {
      const result = await cancelAppointment(id)
      if (!result.success) { showError(t('err_generic', language)); return }
      showSuccess(t('action_success_cancelled', language))
    } finally {
      setProcessingId(null)
    }
  }

  const execApproveCancellation = async (id) => {
    setProcessingId(id)
    try {
      const result = await cancelAppointment(id)
      if (!result.success) { showError(t('err_generic', language)); return }
      showSuccess(t('action_success_cancellation_approved', language))
    } finally {
      setProcessingId(null)
    }
  }

  const execDenyCancellation = async (id) => {
    setProcessingId(id)
    try {
      const result = await denyCancellationRequest(id)
      if (!result.success) { showError(t('err_generic', language)); return }
      showSuccess(t('action_success_cancellation_denied', language))
    } finally {
      setProcessingId(null)
    }
  }

  const handleApprove = (id, newDate, newTimeSlot) => onRequestConfirm(t('confirm_approve_appt', language), () => execApprove(id, newDate, newTimeSlot))
  const handleCancel = (id) => onRequestConfirm(t('confirm_cancel_appt', language), () => execCancel(id))
  const handleApproveCancellation = (id) => onRequestConfirm(t('confirm_approve_cancellation', language), () => execApproveCancellation(id))
  const handleDenyCancellation = (id) => onRequestConfirm(t('confirm_deny_cancellation', language), () => execDenyCancellation(id))
  const handleMarkCompleted = (id) => onRequestConfirm(t('confirm_complete_appt', language), async () => {
    setProcessingId(id)
    try {
      const result = await markAppointmentCompleted(id)
      if (!result.success) { showError(t('err_generic', language)); return }
      showSuccess(t('action_success_completed', language))
    } finally {
      setProcessingId(null)
    }
  })

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'list' ? 'bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26]' : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          <List className="w-3.5 h-3.5" aria-hidden="true" />{t('view_list', language)}
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${viewMode === 'calendar' ? 'bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26]' : 'border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" />{t('view_calendar', language)}
        </button>
      </div>

      {viewMode === 'calendar' && (
        <div className="mb-4">
          <CalendarView
            appointments={filteredAppointments}
            language={language}
            isDateDisabled={(date) => isSunday(date) || isTurkishHoliday(date)}
            onDayClick={(dateStr) => {
              setFilterDateFrom(dateStr)
              setFilterDateTo(dateStr)
              setViewMode('list')
              setVisibleCount(PAGE_SIZE)
            }}
          />
        </div>
      )}

      <div className="flex flex-col gap-2 mb-3">
        <div className="flex flex-wrap gap-2">
          <input type="text" aria-label={t('search_placeholder', language)} placeholder={t('search_placeholder', language)} className={`${inputClass} flex-1 min-w-[160px]`} value={searchInput} onChange={e => { setSearchInput(e.target.value); setVisibleCount(PAGE_SIZE) }} />
          {isGlobal && (
            <select aria-label={t('filter_all_provinces', language)} className={inputClass} value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterLocation(''); setVisibleCount(PAGE_SIZE) }}>
              <option value="">{t('filter_all_provinces', language)}</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {availableLocations.length > 1 && (
            <select aria-label={t('filter_all_locations', language)} className={inputClass} value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setVisibleCount(PAGE_SIZE) }}>
              <option value="">{t('filter_all_locations', language)}</option>
              {availableLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          )}
          <select aria-label={t('filter_all_statuses', language)} className={inputClass} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setVisibleCount(PAGE_SIZE) }}>
            <option value="">{t('filter_all_statuses', language)}</option>
            <option value="PENDING">{STATUS_LABELS.PENDING}</option>
            <option value="APPROVED">{STATUS_LABELS.APPROVED}</option>
            <option value="COMPLETED">{STATUS_LABELS.COMPLETED}</option>
            <option value="CANCELLED">{STATUS_LABELS.CANCELLED}</option>
            <option value="CANCELLATION_REQUESTED">{STATUS_LABELS.CANCELLATION_REQUESTED}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('filter_date', language)}</span>
          <input type="date" aria-label={t('filter_date_from', language)} className={inputClass} value={filterDateFrom} max={filterDateTo || undefined} onChange={e => { setFilterDateFrom(e.target.value); setVisibleCount(PAGE_SIZE) }} />
          <span className="text-xs text-gray-400">—</span>
          <input type="date" aria-label={t('filter_date_to', language)} className={inputClass} value={filterDateTo} min={filterDateFrom || undefined} onChange={e => { setFilterDateTo(e.target.value); setVisibleCount(PAGE_SIZE) }} />
          {(searchInput || filterCity || filterStatus || filterLocation || filterDateFrom || filterDateTo) && (
            <button onClick={resetFilters} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline">{t('filter_clear', language)}</button>
          )}
        </div>
      </div>

      {successMsg && (
        <div role="status" aria-live="polite" className="mb-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-xs font-medium">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div role="status" aria-live="polite" className="mb-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="mb-3 px-4 py-3 bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 border border-[#1565C0]/20 dark:border-[#7DD4FC]/20 rounded-xl flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#1565C0] dark:text-[#7DD4FC] flex-1">
            {t('bulk_selected', language).replace('{n}', selectedIds.size)}
          </span>
          <button onClick={handleBulkApprove} disabled={bulkProcessing} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition">
            {bulkProcessing ? '...' : t('bulk_approve', language)}
          </button>
          <button onClick={handleBulkCancel} disabled={bulkProcessing} className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition">
            {bulkProcessing ? '...' : t('bulk_cancel', language)}
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            {t('bulk_deselect', language)}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {filteredAppointments.slice(0, visibleCount).some(a => a.status === 'PENDING') && (
            <input
              type="checkbox"
              aria-label={t('bulk_select_all', language)}
              checked={filteredAppointments.slice(0, visibleCount).filter(a => a.status === 'PENDING').every(a => selectedIds.has(a.id))}
              onChange={() => {
                const pending = filteredAppointments.slice(0, visibleCount).filter(a => a.status === 'PENDING')
                const allSelected = pending.every(a => selectedIds.has(a.id))
                setSelectedIds(allSelected ? new Set() : new Set(pending.map(a => a.id)))
              }}
              className="accent-[#1565C0] dark:accent-[#7DD4FC] w-4 h-4 cursor-pointer"
            />
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {filteredAppointments.length} {t('records_count', language)}
            {filteredAppointments.length > visibleCount && ` (${visibleCount} ${t('shown', language)})`}
          </p>
        </div>
        {filteredAppointments.length > 0 && (
          <button onClick={() => exportToCSV(filteredAppointments, language)} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition inline-flex items-center gap-1">
            <Download className="w-3.5 h-3.5" aria-hidden="true" />{t('export_csv', language)}
          </button>
        )}
      </div>

      {filteredAppointments.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-gray-400 text-sm">{t('no_appointments', language)}</div>
      ) : (
        <>
          <div className="space-y-3">
            {filteredAppointments.slice(0, visibleCount).map(appt => (
              <div key={appt.id} className={`bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 ${selectedIds.has(appt.id) ? 'ring-2 ring-[#1565C0] dark:ring-[#7DD4FC]' : ''}`}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {appt.status === 'PENDING' && (
                      <input
                        type="checkbox"
                        aria-label={`${t('bulk_select_one', language)} ${appt.user_name} ${appt.user_surname}`}
                        checked={selectedIds.has(appt.id)}
                        onChange={() => toggleSelect(appt.id)}
                        className="mt-0.5 flex-shrink-0 accent-[#1565C0] dark:accent-[#7DD4FC] w-4 h-4 cursor-pointer"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{appt.user_name} {appt.user_surname}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{appt.user_email}</p>
                    </div>
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
                  {appt.note && appt.status !== 'CANCELLATION_REQUESTED' && <span className="col-span-2"><span className="font-medium">{t('lbl_note', language)}:</span> {appt.note}</span>}
                </div>
                {appt.status === 'CANCELLATION_REQUESTED' && appt.note && (
                  <div className="mb-3 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-xl">
                    <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-0.5">{t('lbl_cancellation_reason', language)}</p>
                    <p className="text-xs text-orange-600 dark:text-orange-300">{appt.note}</p>
                  </div>
                )}
                {onGoToMessages && (
                  <div className="mb-2">
                    <button
                      onClick={onGoToMessages}
                      className="inline-flex items-center gap-1 text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-2.5 py-1 hover:bg-[#1565C0]/5 transition"
                    >
                      <MessageSquare className="w-3 h-3" aria-hidden="true" />
                      {t('tab_messages', language)}
                    </button>
                  </div>
                )}
                {appt.status === 'PENDING' && (
                  <>
                    {editingApptId === appt.id && (
                      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl space-y-2">
                        <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{t('appt_edit_datetime', language)}</p>
                        <input
                          type="date"
                          aria-label={t('appt_edit_datetime', language)}
                          value={editDate}
                          min={todayStr}
                          onChange={e => {
                            const d = e.target.value
                            setEditDate(d); setEditTimeSlot('')
                            if (isSunday(d)) { setEditDateError(t('err_sunday', language)); return }
                            if (isTurkishHoliday(d)) { setEditDateError(t('err_date_holiday', language)); return }
                            if (isDateClosed(d, appt.city_id)) { setEditDateError(t('err_date_closed', language)); return }
                            setEditDateError('')
                          }}
                          className={`${inputClass} w-full`}
                        />
                        {editDateError && <p role="status" aria-live="polite" className="text-xs text-red-500 dark:text-red-400">{editDateError}</p>}
                        {editDate && !editDateError && (() => {
                          const citySlots = timeSlots.filter(s => String(s.city_id) === String(appt.city_id))
                          const lab = labs.find(l => String(l.id) === String(appt.lab_id))
                          const maxCap = lab?.capacity_per_slot || 1
                          return (
                            <div className="grid grid-cols-2 gap-1.5">
                              {citySlots.map(s => {
                                const count = appointments.filter(a =>
                                  String(a.lab_id) === String(appt.lab_id) &&
                                  a.date === editDate && a.time_slot === s.time_range &&
                                  ['PENDING', 'APPROVED'].includes(a.status) &&
                                  String(a.id) !== String(appt.id)
                                ).length
                                const isFull = count >= maxCap
                                const isCurrent = s.time_range === appt.time_slot
                                const isSelected = editTimeSlot === s.time_range
                                return (
                                  <button
                                    key={s.id}
                                    type="button"
                                    aria-label={`${s.time_range} — ${maxCap - count}/${maxCap} ${t('slot_free_count', language)}`}
                                    aria-pressed={isSelected}
                                    disabled={isFull}
                                    onClick={() => setEditTimeSlot(isSelected ? '' : s.time_range)}
                                    className={`py-1.5 px-2 rounded-xl text-xs border transition text-left ${
                                      isFull ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-700 text-gray-400' :
                                      isSelected ? 'bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] border-transparent font-semibold' :
                                      'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[#1565C0] dark:hover:border-[#7DD4FC]'
                                    }`}
                                  >
                                    {s.time_range}
                                    {isCurrent && <span className="ml-1 text-[9px] opacity-60">({t('appt_edit_current', language)})</span>}
                                    <span className="block text-[9px] mt-0.5 opacity-60">{maxCap - count}/{maxCap} {t('slot_free_count', language)}</span>
                                  </button>
                                )
                              })}
                            </div>
                          )
                        })()}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (editingApptId === appt.id) { setEditingApptId(null); setEditDate(''); setEditTimeSlot(''); setEditDateError('') }
                          else { setEditingApptId(appt.id); setEditDate(appt.date >= todayStr ? appt.date : todayStr); setEditTimeSlot(''); setEditDateError('') }
                        }}
                        disabled={processingId === appt.id}
                        className="p-2 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-60"
                        title={t('btn_change_datetime', language)}
                        aria-label={t('btn_change_datetime', language)}
                      >
                        {editingApptId === appt.id ? <X className="w-3.5 h-3.5" aria-hidden="true" /> : <Pencil className="w-3.5 h-3.5" aria-hidden="true" />}
                      </button>
                      <button
                        onClick={() => handleApprove(appt.id, editingApptId === appt.id ? editDate : null, editingApptId === appt.id ? editTimeSlot : null)}
                        disabled={processingId === appt.id || (editingApptId === appt.id && !!editDate && !editTimeSlot) || (editingApptId === appt.id && !!editDateError)}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60"
                      >
                        {processingId === appt.id ? '...' : t('action_approve', language)}
                      </button>
                      <button onClick={() => handleCancel(appt.id)} disabled={processingId === appt.id} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
                        {processingId === appt.id ? '...' : t('action_cancel', language)}
                      </button>
                    </div>
                  </>
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

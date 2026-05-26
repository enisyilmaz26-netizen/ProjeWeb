import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { t } from '../lib/languages'

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

function statusLabel(status, lang) {
  return STATUS_LABELS[status]?.[lang] || status
}

export default function AdminPanelScreen() {
  const {
    loggedInAdmin, language,
    appointments, cities, labs, users, timeSlots,
    approveAppointment, cancelAppointment,
    approveUser, revokeUser,
    addTimeSlot, removeTimeSlot,
    addLab, deleteLab,
    loadAllData,
  } = useApp()

  const isGlobal = loggedInAdmin?.role === 'GLOBAL'
  const adminCityId = loggedInAdmin?.city_id

  const [activeTab, setActiveTab] = useState('appointments')
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [processingId, setProcessingId] = useState(null)

  // Time slots tab
  const [newSlotCityId, setNewSlotCityId] = useState(isGlobal ? '' : String(adminCityId || ''))
  const [newSlotTime, setNewSlotTime] = useState('')
  const [slotError, setSlotError] = useState('')

  // Studios tab
  const [showAddLab, setShowAddLab] = useState(false)
  const [labForm, setLabForm] = useState({ name: '', description: '', capacity_per_slot: 1, location: '', branches: '', city_id: '' })
  const [labError, setLabError] = useState('')

  // Filtered appointments
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
  }, [appointments, isGlobal, adminCityId, filterCity, filterStatus, filterLocation, search, labs])

  // Available locations for current city scope
  const availableLocations = useMemo(() => {
    const scopeCityId = !isGlobal ? adminCityId : (filterCity || null)
    const scopeLabs = scopeCityId
      ? labs.filter(l => String(l.city_id) === String(scopeCityId))
      : labs
    const locs = [...new Set(scopeLabs.map(l => l.location).filter(Boolean))]
    return locs
  }, [labs, isGlobal, adminCityId, filterCity])

  // Stats
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

  // Pending users (for user_approvals tab)
  const pendingUsers = useMemo(() => {
    if (isGlobal) return users.filter(u => !u.is_approved)
    return users.filter(u => !u.is_approved && String(u.city_id) === String(adminCityId))
  }, [users, isGlobal, adminCityId])

  const approvedUsers = useMemo(() => {
    if (isGlobal) return users.filter(u => u.is_approved)
    return users.filter(u => u.is_approved && String(u.city_id) === String(adminCityId))
  }, [users, isGlobal, adminCityId])

  // City slots
  const visibleSlots = useMemo(() => {
    if (isGlobal) return timeSlots
    return timeSlots.filter(s => String(s.city_id) === String(adminCityId))
  }, [timeSlots, isGlobal, adminCityId])

  // Labs for studio tab
  const visibleLabs = useMemo(() => {
    if (isGlobal) return labs
    return labs.filter(l => String(l.city_id) === String(adminCityId))
  }, [labs, isGlobal, adminCityId])

  const handleApprove = async (id) => {
    setProcessingId(id)
    await approveAppointment(id)
    setProcessingId(null)
  }

  const handleCancel = async (id) => {
    setProcessingId(id)
    await cancelAppointment(id)
    setProcessingId(null)
  }

  const handleApproveUser = async (id) => {
    setProcessingId(id)
    await approveUser(id)
    setProcessingId(null)
  }

  const handleRevokeUser = async (id) => {
    setProcessingId(id)
    await revokeUser(id)
    setProcessingId(null)
  }

  const handleAddSlot = async () => {
    setSlotError('')
    const cityId = isGlobal ? newSlotCityId : adminCityId
    if (!cityId || !newSlotTime.trim()) {
      setSlotError(language === 'TR' ? 'Lütfen tüm alanları doldurun.' : 'Please fill all fields.')
      return
    }
    const result = await addTimeSlot(cityId, newSlotTime.trim())
    if (result.success) {
      setNewSlotTime('')
      if (isGlobal) setNewSlotCityId('')
    } else {
      setSlotError(result.error || 'Error')
    }
  }

  const handleRemoveSlot = async (id) => {
    setProcessingId(id)
    await removeTimeSlot(id)
    setProcessingId(null)
  }

  const handleAddLab = async (e) => {
    e.preventDefault()
    setLabError('')
    const cityId = isGlobal ? labForm.city_id : adminCityId
    if (!cityId || !labForm.name.trim()) {
      setLabError(language === 'TR' ? 'Şehir ve stüdyo adı zorunludur.' : 'City and studio name are required.')
      return
    }
    const city = cities.find(c => String(c.id) === String(cityId))
    const result = await addLab({
      name: labForm.name,
      description: labForm.description,
      capacity_per_slot: Number(labForm.capacity_per_slot) || 1,
      location: labForm.location,
      branches: labForm.branches,
      city_id: cityId,
    })
    if (result.success) {
      setShowAddLab(false)
      setLabForm({ name: '', description: '', capacity_per_slot: 1, location: '', branches: '', city_id: '' })
    } else {
      setLabError(result.error || 'Error')
    }
  }

  const handleDeleteLab = async (id) => {
    if (!window.confirm(language === 'TR' ? 'Bu stüdyoyu silmek istediğinizden emin misiniz?' : 'Are you sure you want to delete this studio?')) return
    setProcessingId(id)
    await deleteLab(id)
    setProcessingId(null)
  }

  const inputClass = "px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2C2A31] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6750A4] dark:focus:ring-[#D0BCFF] text-sm"

  const tabs = [
    { key: 'appointments', label: language === 'TR' ? 'Randevular' : 'Appointments' },
    ...(isGlobal ? [{ key: 'studios', label: language === 'TR' ? 'Stüdyolar' : 'Studios' }] : []),
    { key: 'slots', label: language === 'TR' ? 'Saat Dilimleri' : 'Time Slots' },
    { key: 'user_approvals', label: language === 'TR' ? 'Üye Onayları' : 'User Approvals' },
  ]

  return (
    <div className="px-4 py-4">
      {/* Admin header */}
      <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#6750A4]/10 dark:bg-[#D0BCFF]/10 flex items-center justify-center">
            <span className="text-[#6750A4] dark:text-[#D0BCFF] text-xl">⚙️</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{loggedInAdmin?.name || loggedInAdmin?.email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {loggedInAdmin?.role === 'GLOBAL'
                ? (language === 'TR' ? 'Genel Yönetici' : 'Global Admin')
                : (language === 'TR' ? 'Şehir Yöneticisi' : 'City Admin')}
              {!isGlobal && loggedInAdmin?.city_id && (() => {
                const c = cities.find(x => String(x.id) === String(loggedInAdmin.city_id))
                return c ? ` — ${c.name}` : ''
              })()}
            </p>
          </div>
          <button
            onClick={loadAllData}
            className="ml-auto text-xs text-[#6750A4] dark:text-[#D0BCFF] border border-[#6750A4]/30 dark:border-[#D0BCFF]/30 rounded-lg px-3 py-1.5 hover:bg-[#6750A4]/5 transition"
          >
            {language === 'TR' ? '↻ Yenile' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label={language === 'TR' ? 'Toplam' : 'Total'} value={stats.total} color="text-gray-800 dark:text-gray-100" />
        <StatCard label={language === 'TR' ? 'Beklemede' : 'Pending'} value={stats.pending} color="text-orange-600 dark:text-orange-400" />
        <StatCard label={language === 'TR' ? 'Onaylandı' : 'Approved'} value={stats.approved} color="text-green-600 dark:text-green-400" />
        <StatCard label={language === 'TR' ? 'İptal' : 'Cancelled'} value={stats.cancelled + stats.cancelRequested} color="text-red-600 dark:text-red-400" />
      </div>

      {/* Tab Bar */}
      <div className="flex bg-gray-100 dark:bg-[#2C2A31] rounded-xl p-1 mb-4 overflow-x-auto gap-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white dark:bg-[#6750A4] text-[#6750A4] dark:text-white shadow'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* APPOINTMENTS TAB */}
      {activeTab === 'appointments' && (
        <div>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 mb-3 flex-wrap">
            <input
              type="text"
              placeholder={language === 'TR' ? 'Ara...' : 'Search...'}
              className={`${inputClass} flex-1 min-w-[160px]`}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {isGlobal && (
              <select className={inputClass} value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterLocation('') }}>
                <option value="">{language === 'TR' ? 'Tüm Şehirler' : 'All Cities'}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            {availableLocations.length > 1 && (
              <select className={inputClass} value={filterLocation} onChange={e => setFilterLocation(e.target.value)}>
                <option value="">{language === 'TR' ? 'Tüm Konumlar' : 'All Locations'}</option>
                {availableLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            )}
            <select className={inputClass} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">{language === 'TR' ? 'Tüm Durumlar' : 'All Statuses'}</option>
              <option value="PENDING">{language === 'TR' ? 'Beklemede' : 'Pending'}</option>
              <option value="APPROVED">{language === 'TR' ? 'Onaylandı' : 'Approved'}</option>
              <option value="CANCELLED">{language === 'TR' ? 'İptal Edildi' : 'Cancelled'}</option>
              <option value="CANCELLATION_REQUESTED">{language === 'TR' ? 'İptal Talebi' : 'Cancel Requested'}</option>
            </select>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              {t('no_appointments', language)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map(appt => (
                <div key={appt.id} className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                        {appt.user_name} {appt.user_surname}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{appt.user_email}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-lg flex-shrink-0 ${STATUS_COLORS[appt.status] || ''}`}>
                      {statusLabel(appt.status, language)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
                    <span><span className="font-medium">{language === 'TR' ? 'Stüdyo' : 'Studio'}:</span> {appt.lab_name}</span>
                    <span><span className="font-medium">{language === 'TR' ? 'Şehir' : 'City'}:</span> {appt.city_name}</span>
                    <span><span className="font-medium">{language === 'TR' ? 'Tarih' : 'Date'}:</span> {appt.date}</span>
                    <span><span className="font-medium">{language === 'TR' ? 'Saat' : 'Time'}:</span> {appt.time_slot}</span>
                    {appt.user_branch && <span><span className="font-medium">{language === 'TR' ? 'Branş' : 'Branch'}:</span> {appt.user_branch}</span>}
                    {appt.user_phone && <span><span className="font-medium">{language === 'TR' ? 'Tel' : 'Phone'}:</span> {appt.user_phone}</span>}
                    {appt.user_work_location && <span className="col-span-2"><span className="font-medium">{language === 'TR' ? 'Kurum' : 'Institution'}:</span> {appt.user_work_location}</span>}
                    {appt.note && <span className="col-span-2"><span className="font-medium">{language === 'TR' ? 'Not' : 'Note'}:</span> {appt.note}</span>}
                  </div>

                  {(appt.status === 'PENDING' || appt.status === 'CANCELLATION_REQUESTED') && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(appt.id)}
                        disabled={processingId === appt.id}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60"
                      >
                        {processingId === appt.id ? '...' : t('action_approve', language)}
                      </button>
                      <button
                        onClick={() => handleCancel(appt.id)}
                        disabled={processingId === appt.id}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60"
                      >
                        {processingId === appt.id ? '...' : t('action_cancel', language)}
                      </button>
                    </div>
                  )}
                  {appt.status === 'APPROVED' && (
                    <button
                      onClick={() => handleCancel(appt.id)}
                      disabled={processingId === appt.id}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60"
                    >
                      {processingId === appt.id ? '...' : t('action_cancel', language)}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STUDIOS TAB (GLOBAL only) */}
      {activeTab === 'studios' && isGlobal && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{language === 'TR' ? 'Stüdyolar' : 'Studios'}</h3>
            <button
              onClick={() => setShowAddLab(true)}
              className="py-2 px-4 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] text-xs font-semibold rounded-xl hover:opacity-90 transition"
            >
              + {language === 'TR' ? 'Stüdyo Ekle' : 'Add Studio'}
            </button>
          </div>

          {showAddLab && (
            <form onSubmit={handleAddLab} className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4 mb-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{language === 'TR' ? 'Yeni Stüdyo' : 'New Studio'}</h4>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'Şehir' : 'City'} *</label>
                <select className={`${inputClass} w-full`} value={labForm.city_id} onChange={e => setLabForm(p => ({ ...p, city_id: e.target.value }))} required>
                  <option value="">{language === 'TR' ? 'Şehir Seçin' : 'Select City'}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'Stüdyo Adı' : 'Studio Name'} *</label>
                <input type="text" className={`${inputClass} w-full`} value={labForm.name} onChange={e => setLabForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'Açıklama' : 'Description'}</label>
                <input type="text" className={`${inputClass} w-full`} value={labForm.description} onChange={e => setLabForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'Konum' : 'Location'}</label>
                <input type="text" className={`${inputClass} w-full`} value={labForm.location} onChange={e => setLabForm(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'Kapasite (slot başına)' : 'Capacity (per slot)'}</label>
                <input type="number" min="1" className={`${inputClass} w-full`} value={labForm.capacity_per_slot} onChange={e => setLabForm(p => ({ ...p, capacity_per_slot: e.target.value }))} />
              </div>
              {labError && <p className="text-red-500 text-xs">{labError}</p>}
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] text-xs font-semibold rounded-xl">
                  {language === 'TR' ? 'Kaydet' : 'Save'}
                </button>
                <button type="button" onClick={() => { setShowAddLab(false); setLabError('') }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">
                  {language === 'TR' ? 'İptal' : 'Cancel'}
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {visibleLabs.map(lab => {
              const city = cities.find(c => String(c.id) === String(lab.city_id))
              return (
                <div key={lab.id} className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#6750A4]/10 dark:bg-[#D0BCFF]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#6750A4] dark:text-[#D0BCFF] text-lg">🎙</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{lab.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{city?.name} {lab.location ? `• ${lab.location}` : ''}</p>
                    {lab.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{lab.description}</p>}
                    <p className="text-xs text-[#6750A4] dark:text-[#D0BCFF] mt-0.5">{language === 'TR' ? 'Kapasite' : 'Capacity'}: {lab.capacity_per_slot}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteLab(lab.id)}
                    disabled={processingId === lab.id}
                    className="text-red-500 hover:text-red-700 text-xs p-1 disabled:opacity-40"
                  >
                    🗑
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* SLOTS TAB */}
      {activeTab === 'slots' && (
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{language === 'TR' ? 'Saat Dilimi Yönetimi' : 'Time Slot Management'}</h3>

          {/* Add Slot */}
          <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{language === 'TR' ? 'Yeni Saat Dilimi Ekle' : 'Add New Time Slot'}</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              {isGlobal && (
                <select
                  className={`${inputClass} flex-1`}
                  value={newSlotCityId}
                  onChange={e => setNewSlotCityId(e.target.value)}
                >
                  <option value="">{language === 'TR' ? 'Şehir Seçin' : 'Select City'}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <input
                type="text"
                placeholder={language === 'TR' ? 'Örn: 09:00 - 10:00' : 'E.g.: 09:00 - 10:00'}
                className={`${inputClass} flex-1`}
                value={newSlotTime}
                onChange={e => setNewSlotTime(e.target.value)}
              />
              <button
                onClick={handleAddSlot}
                className="py-2 px-4 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] text-xs font-semibold rounded-xl hover:opacity-90 transition"
              >
                + {language === 'TR' ? 'Ekle' : 'Add'}
              </button>
            </div>
            {slotError && <p className="text-red-500 text-xs mt-2">{slotError}</p>}
          </div>

          {/* Slots list grouped by city */}
          {isGlobal ? (
            cities.map(city => {
              const citySlots = visibleSlots.filter(s => String(s.city_id) === String(city.id))
              if (citySlots.length === 0) return null
              return (
                <div key={city.id} className="mb-4">
                  <h4 className="text-xs font-bold text-[#6750A4] dark:text-[#D0BCFF] mb-2 uppercase tracking-wide">{city.name}</h4>
                  <div className="space-y-2">
                    {citySlots.map(slot => (
                      <SlotItem key={slot.id} slot={slot} processingId={processingId} onRemove={handleRemoveSlot} language={language} />
                    ))}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="space-y-2">
              {visibleSlots.map(slot => (
                <SlotItem key={slot.id} slot={slot} processingId={processingId} onRemove={handleRemoveSlot} language={language} />
              ))}
              {visibleSlots.length === 0 && (
                <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                  {language === 'TR' ? 'Henüz saat dilimi eklenmemiş.' : 'No time slots added yet.'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* USER APPROVALS TAB */}
      {activeTab === 'user_approvals' && (
        <div>
          {/* Pending */}
          <h3 className="font-bold text-orange-600 dark:text-orange-400 text-sm mb-2">
            {language === 'TR' ? 'Onay Bekleyenler' : 'Pending Approval'} ({pendingUsers.length})
          </h3>
          {pendingUsers.length === 0 ? (
            <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4 text-center text-gray-500 dark:text-gray-400 text-sm mb-4">
              {language === 'TR' ? 'Onay bekleyen kullanıcı yok.' : 'No users pending approval.'}
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {pendingUsers.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  language={language}
                  processingId={processingId}
                  onApprove={handleApproveUser}
                  onRevoke={handleRevokeUser}
                  showApprove
                />
              ))}
            </div>
          )}

          {/* Approved */}
          <h3 className="font-bold text-green-600 dark:text-green-400 text-sm mb-2">
            {language === 'TR' ? 'Onaylı Üyeler' : 'Approved Members'} ({approvedUsers.length})
          </h3>
          {approvedUsers.length === 0 ? (
            <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              {language === 'TR' ? 'Onaylı üye yok.' : 'No approved members.'}
            </div>
          ) : (
            <div className="space-y-3">
              {approvedUsers.map(user => (
                <UserCard
                  key={user.id}
                  user={user}
                  language={language}
                  processingId={processingId}
                  onApprove={handleApproveUser}
                  onRevoke={handleRevokeUser}
                  showRevoke
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  )
}

function SlotItem({ slot, processingId, onRemove, language }) {
  return (
    <div className="bg-white dark:bg-[#1D1B20] rounded-xl shadow px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{slot.time_range}</span>
      <button
        onClick={() => onRemove(slot.id)}
        disabled={processingId === slot.id}
        className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40"
      >
        {processingId === slot.id ? '...' : (language === 'TR' ? 'Sil' : 'Delete')}
      </button>
    </div>
  )
}

function UserCard({ user, language, processingId, onApprove, onRevoke, showApprove, showRevoke }) {
  return (
    <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-[#6750A4]/10 dark:bg-[#D0BCFF]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[#6750A4] dark:text-[#D0BCFF] font-bold text-sm">
            {(user.name || '?').charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{user.name} {user.surname}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
        {user.branch && <span><span className="font-medium">{language === 'TR' ? 'Branş' : 'Branch'}:</span> {user.branch}</span>}
        {user.phone && <span><span className="font-medium">{language === 'TR' ? 'Tel' : 'Phone'}:</span> {user.phone}</span>}
        {user.city_name && <span><span className="font-medium">{language === 'TR' ? 'Şehir' : 'City'}:</span> {user.city_name}</span>}
        {user.district && <span><span className="font-medium">{language === 'TR' ? 'İlçe' : 'District'}:</span> {user.district}</span>}
        {user.work_location && <span className="col-span-2"><span className="font-medium">{language === 'TR' ? 'Kurum' : 'Institution'}:</span> {user.work_location}</span>}
      </div>
      {showApprove && (
        <button
          onClick={() => onApprove(user.id)}
          disabled={processingId === user.id}
          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60"
        >
          {processingId === user.id ? '...' : (language === 'TR' ? 'Üyeliği Onayla' : 'Approve Membership')}
        </button>
      )}
      {showRevoke && (
        <button
          onClick={() => onRevoke(user.id)}
          disabled={processingId === user.id}
          className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60"
        >
          {processingId === user.id ? '...' : (language === 'TR' ? 'Üyeliği İptal Et' : 'Revoke Membership')}
        </button>
      )}
    </div>
  )
}

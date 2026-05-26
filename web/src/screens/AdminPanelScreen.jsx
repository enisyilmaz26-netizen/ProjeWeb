import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { t, formatDate, translations, STATUS_COLORS, STATUS_LABELS } from '../lib/languages'
import { INPUT_BASE } from '../lib/ui'

function statusLabel(status, lang) {
  return STATUS_LABELS[status]?.[lang] || status
}

const PAGE_SIZE = 50

function exportToCSV(appts, language) {
  const headers = language === 'TR'
    ? ['Ad', 'Soyad', 'E-posta', 'Telefon', 'Branş', 'Kurum', 'İl', 'İlçe', 'Stüdyo', 'Tarih', 'Saat', 'Durum', 'Not', 'Oluşturma']
    : ['First Name', 'Last Name', 'Email', 'Phone', 'Branch', 'Institution', 'Province', 'District', 'Studio', 'Date', 'Time', 'Status', 'Note', 'Created']
  const rows = appts.map(a => [
    a.user_name, a.user_surname, a.user_email, a.user_phone,
    a.user_branch, a.user_work_location, a.city_name, a.user_district,
    a.lab_name, a.date, a.time_slot,
    STATUS_LABELS[a.status]?.[language] || a.status,
    a.note || '',
    a.created_timestamp ? new Date(Number(a.created_timestamp)).toLocaleDateString('tr-TR') : '',
  ])
  const csv = [headers, ...rows]
    .map(row => row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `randevular_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminPanelScreen() {
  const {
    loggedInAdmin, language,
    appointments, cities, labs, users, timeSlots,
    approveAppointment, cancelAppointment, markAppointmentCompleted,
    approveUser, revokeUser,
    addTimeSlot, removeTimeSlot,
    addLab, updateLab, deleteLab,
    createNotification,
    changeAdminPassword,
    loadAllData,
  } = useApp()

  const todayStr = new Date().toISOString().split('T')[0]

  const isGlobal = loggedInAdmin?.role === 'GLOBAL'
  const adminCityId = loggedInAdmin?.city_id

  const [activeTab, setActiveTab] = useState('appointments')

  // Appointments filters
  const [search, setSearch] = useState('')
  const [filterCity, setFilterCity] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [processingId, setProcessingId] = useState(null)

  // Time slots tab
  const [newSlotCityId, setNewSlotCityId] = useState(isGlobal ? '' : String(adminCityId || ''))
  const [newSlotTime, setNewSlotTime] = useState('')
  const [slotError, setSlotError] = useState('')

  // Studios tab
  const [showAddLab, setShowAddLab] = useState(false)
  const [labForm, setLabForm] = useState({ name: '', description: '', capacity_per_slot: 1, location: '', branches: '', city_id: '' })
  const [labError, setLabError] = useState('')
  const [editingLabId, setEditingLabId] = useState(null)
  const [editLabForm, setEditLabForm] = useState({})

  // User approvals tab
  const [userSearch, setUserSearch] = useState('')

  // Admin password change
  const [showAdminPwChange, setShowAdminPwChange] = useState(false)
  const [adminPwForm, setAdminPwForm] = useState({ current: '', newPw: '', confirm: '' })
  const [adminPwLoading, setAdminPwLoading] = useState(false)
  const [adminPwError, setAdminPwError] = useState('')
  const [adminPwSuccess, setAdminPwSuccess] = useState('')

  // Stats tab
  const [statsCity, setStatsCity] = useState('')

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState(null) // { label, onConfirm }

  // Notifications tab
  const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'SYSTEM' })
  const [notifCity, setNotifCity] = useState('')
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifSuccess, setNotifSuccess] = useState('')
  const [notifError, setNotifError] = useState('')

  // Available locations for current city scope
  const availableLocations = useMemo(() => {
    const scopeCityId = !isGlobal ? adminCityId : (filterCity || null)
    const scopeLabs = scopeCityId
      ? labs.filter(l => String(l.city_id) === String(scopeCityId))
      : labs
    return [...new Set(scopeLabs.map(l => l.location).filter(Boolean))]
  }, [labs, isGlobal, adminCityId, filterCity])

  // Scoped appointments (city filter only — used for stats)
  const scopedAppointments = useMemo(() => {
    if (!isGlobal && adminCityId) return appointments.filter(a => String(a.city_id) === String(adminCityId))
    if (isGlobal && statsCity) return appointments.filter(a => String(a.city_id) === String(statsCity))
    return appointments
  }, [appointments, isGlobal, adminCityId, statsCity])

  // Stats
  const studioStats = useMemo(() => {
    const counts = {}
    scopedAppointments.forEach(a => {
      if (a.status === 'CANCELLED') return
      const key = a.lab_name || '?'
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }, [scopedAppointments])

  const statusStats = useMemo(() => {
    const counts = { PENDING: 0, APPROVED: 0, COMPLETED: 0, CANCELLED: 0, CANCELLATION_REQUESTED: 0 }
    scopedAppointments.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
    return Object.entries(counts).map(([status, count]) => ({ status, count })).filter(x => x.count > 0)
  }, [scopedAppointments])

  const monthlyStats = useMemo(() => {
    const now = new Date()
    const months = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' })
      months[key] = { label, count: 0 }
    }
    scopedAppointments.forEach(a => {
      if (!a.date) return
      const key = a.date.substring(0, 7)
      if (months[key]) months[key].count++
    })
    return Object.values(months)
  }, [scopedAppointments])

  const slotStats = useMemo(() => {
    const counts = {}
    scopedAppointments.forEach(a => {
      if (a.status === 'CANCELLED') return
      const key = a.time_slot || '?'
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts)
      .map(([slot, count]) => ({ slot, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [scopedAppointments])

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

  // Users
  const pendingUsers = useMemo(() => {
    const base = isGlobal ? users.filter(u => !u.is_approved) : users.filter(u => !u.is_approved && String(u.city_id) === String(adminCityId))
    if (!userSearch.trim()) return base
    const q = userSearch.toLowerCase()
    return base.filter(u => `${u.name} ${u.surname} ${u.email}`.toLowerCase().includes(q))
  }, [users, isGlobal, adminCityId, userSearch])

  const approvedUsers = useMemo(() => {
    const base = isGlobal ? users.filter(u => u.is_approved) : users.filter(u => u.is_approved && String(u.city_id) === String(adminCityId))
    if (!userSearch.trim()) return base
    const q = userSearch.toLowerCase()
    return base.filter(u => `${u.name} ${u.surname} ${u.email}`.toLowerCase().includes(q))
  }, [users, isGlobal, adminCityId, userSearch])

  const visibleSlots = useMemo(() => {
    return isGlobal ? timeSlots : timeSlots.filter(s => String(s.city_id) === String(adminCityId))
  }, [timeSlots, isGlobal, adminCityId])

  const visibleLabs = useMemo(() => {
    return isGlobal ? labs : labs.filter(l => String(l.city_id) === String(adminCityId))
  }, [labs, isGlobal, adminCityId])

  // Handlers
  const execApprove = async (id) => {
    setProcessingId(id)
    await approveAppointment(id)
    const appt = appointments.find(a => a.id === id)
    if (appt) {
      const prefix = appt.city_name ? `[${appt.city_name}] ` : ''
      await createNotification({
        title: `${prefix}${language === 'TR' ? 'Randevunuz Onaylandı' : 'Appointment Approved'}`,
        message: `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${appt.date} ${appt.time_slot}`,
        type: 'SYSTEM',
      })
    }
    setProcessingId(null)
  }

  const execCancel = async (id) => {
    setProcessingId(id)
    await cancelAppointment(id)
    const appt = appointments.find(a => a.id === id)
    if (appt) {
      const prefix = appt.city_name ? `[${appt.city_name}] ` : ''
      await createNotification({
        title: `${prefix}${language === 'TR' ? 'Randevunuz İptal Edildi' : 'Appointment Cancelled'}`,
        message: `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${appt.date} ${appt.time_slot}`,
        type: 'ALERT',
      })
    }
    setProcessingId(null)
  }

  const handleApprove = (id) => setConfirmModal({
    label: language === 'TR' ? 'Bu randevuyu onaylamak istediğinizden emin misiniz?' : 'Are you sure you want to approve this appointment?',
    onConfirm: () => execApprove(id),
  })

  const handleCancel = (id) => setConfirmModal({
    label: language === 'TR' ? 'Bu randevuyu iptal etmek istediğinizden emin misiniz?' : 'Are you sure you want to cancel this appointment?',
    onConfirm: () => execCancel(id),
  })

  const handleMarkCompleted = (id) => setConfirmModal({
    label: language === 'TR' ? 'Bu randevuyu tamamlandı olarak işaretlemek istediğinizden emin misiniz?' : 'Mark this appointment as completed?',
    onConfirm: async () => { setProcessingId(id); await markAppointmentCompleted(id); setProcessingId(null) },
  })

  const handleApproveUser = (id) => setConfirmModal({
    label: language === 'TR' ? 'Bu üyeyi onaylamak istediğinizden emin misiniz?' : 'Are you sure you want to approve this member?',
    onConfirm: async () => { setProcessingId(id); await approveUser(id); setProcessingId(null) },
  })

  const handleRevokeUser = (id) => setConfirmModal({
    label: language === 'TR' ? 'Bu üyenin erişimini kaldırmak istediğinizden emin misiniz?' : 'Are you sure you want to revoke this member\'s access?',
    onConfirm: async () => { setProcessingId(id); await revokeUser(id); setProcessingId(null) },
  })

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
    const result = await removeTimeSlot(id)
    setProcessingId(null)
    if (!result.success) {
      const errKey = result.error
      setSlotError((errKey && translations[errKey]) ? t(errKey, language) : (result.error || 'Error'))
    }
  }

  const handleAddLab = async (e) => {
    e.preventDefault()
    setLabError('')
    const cityId = isGlobal ? labForm.city_id : adminCityId
    if (!cityId || !labForm.name.trim()) {
      setLabError(language === 'TR' ? 'İl ve stüdyo adı zorunludur.' : 'Province and studio name are required.')
      return
    }
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

  const startEditLab = (lab) => {
    setEditingLabId(lab.id)
    setEditLabForm({
      name: lab.name || '',
      description: lab.description || '',
      capacity_per_slot: lab.capacity_per_slot || 1,
      location: lab.location || '',
      branches: lab.branches || '',
    })
    setLabError('')
  }

  const handleUpdateLab = async (e) => {
    e.preventDefault()
    setLabError('')
    if (!editLabForm.name.trim()) {
      setLabError(language === 'TR' ? 'Stüdyo adı zorunludur.' : 'Studio name is required.')
      return
    }
    const result = await updateLab(editingLabId, {
      name: editLabForm.name,
      description: editLabForm.description,
      capacity_per_slot: Number(editLabForm.capacity_per_slot) || 1,
      location: editLabForm.location,
      branches: editLabForm.branches,
    })
    if (result.success) {
      setEditingLabId(null)
    } else {
      setLabError(result.error || 'Error')
    }
  }

  const handleDeleteLab = async (id) => {
    if (!window.confirm(language === 'TR' ? 'Bu stüdyoyu silmek istediğinizden emin misiniz?' : 'Are you sure you want to delete this studio?')) return
    setProcessingId(id)
    const result = await deleteLab(id)
    setProcessingId(null)
    if (!result.success) {
      const errKey = result.error
      setLabError((errKey && translations[errKey]) ? t(errKey, language) : (result.error || 'Error'))
    }
  }

  const handleCreateNotification = async (e) => {
    e.preventDefault()
    setNotifError('')
    if (!notifForm.title.trim() || !notifForm.message.trim()) {
      setNotifError(language === 'TR' ? 'Başlık ve mesaj zorunludur.' : 'Title and message are required.')
      return
    }
    setNotifLoading(true)
    // Prepend city tag for targeted notifications
    let finalTitle = notifForm.title
    if (isGlobal && notifCity) {
      const cityObj = cities.find(c => String(c.id) === String(notifCity))
      if (cityObj) finalTitle = `[${cityObj.name}] ${notifForm.title}`
    } else if (!isGlobal && adminCityId) {
      const cityObj = cities.find(c => String(c.id) === String(adminCityId))
      if (cityObj) finalTitle = `[${cityObj.name}] ${notifForm.title}`
    }
    const result = await createNotification({ ...notifForm, title: finalTitle })
    setNotifLoading(false)
    if (result.success) {
      setNotifForm({ title: '', message: '', type: 'SYSTEM' })
      setNotifCity('')
      setNotifSuccess(language === 'TR' ? 'Bildirim gönderildi.' : 'Notification sent.')
      setTimeout(() => setNotifSuccess(''), 3000)
    } else {
      setNotifError(result.error || 'Error')
    }
  }

  const handleAdminPwChange = async (e) => {
    e.preventDefault()
    setAdminPwError('')
    if (adminPwForm.newPw !== adminPwForm.confirm) {
      setAdminPwError(t('err_password_mismatch', language))
      return
    }
    if (adminPwForm.newPw.length < 4) {
      setAdminPwError(language === 'TR' ? 'Şifre en az 4 karakter olmalıdır.' : 'Password must be at least 4 characters.')
      return
    }
    setAdminPwLoading(true)
    const result = await changeAdminPassword(loggedInAdmin.id, loggedInAdmin.email, adminPwForm.current, adminPwForm.newPw)
    setAdminPwLoading(false)
    if (result.success) {
      setAdminPwForm({ current: '', newPw: '', confirm: '' })
      setShowAdminPwChange(false)
      setAdminPwSuccess(t('password_changed', language))
      setTimeout(() => setAdminPwSuccess(''), 4000)
    } else {
      const errKey = result.error
      setAdminPwError(translations[errKey] ? t(errKey, language) : (errKey || (language === 'TR' ? 'Bir hata oluştu.' : 'An error occurred.')))
    }
  }

  const resetFilters = () => {
    setSearch(''); setFilterCity(''); setFilterStatus(''); setFilterLocation('')
    setFilterDateFrom(''); setFilterDateTo(''); setVisibleCount(PAGE_SIZE)
  }

  const inputClass = INPUT_BASE

  const tabs = [
    { key: 'appointments', label: language === 'TR' ? 'Randevular' : 'Appointments' },
    { key: 'studios', label: language === 'TR' ? 'Stüdyolar' : 'Studios' },
    { key: 'slots', label: language === 'TR' ? 'Saat Dilimleri' : 'Time Slots' },
    { key: 'user_approvals', label: language === 'TR' ? 'Üye Onayları' : 'User Approvals' },
    { key: 'notifications', label: language === 'TR' ? 'Bildirim Gönder' : 'Send Notification' },
    { key: 'stats', label: t('tab_stats', language) },
  ]

  return (
    <div className="px-4 py-4">
      {adminPwSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-4 flex justify-between">
          <span>{adminPwSuccess}</span>
          <button onClick={() => setAdminPwSuccess('')} className="ml-2 text-green-500">✕</button>
        </div>
      )}

      {/* Admin header */}
      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center">
            <span className="text-[#1565C0] dark:text-[#7DD4FC] text-xl">⚙️</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{loggedInAdmin?.name || loggedInAdmin?.email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isGlobal ? (language === 'TR' ? 'Genel Yönetici' : 'Global Admin') : (language === 'TR' ? 'İl Yöneticisi' : 'Province Admin')}
              {!isGlobal && loggedInAdmin?.city_id && (() => {
                const c = cities.find(x => String(x.id) === String(loggedInAdmin.city_id))
                return c ? ` — ${c.name}` : ''
              })()}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => { setShowAdminPwChange(p => !p); setAdminPwError(''); setAdminPwForm({ current: '', newPw: '', confirm: '' }) }}
              className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition"
            >
              🔒 {t('change_password', language)}
            </button>
            <button onClick={loadAllData} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition">
              {language === 'TR' ? '↻ Yenile' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* Inline password change form */}
        {showAdminPwChange && (
          <form onSubmit={handleAdminPwChange} className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('current_password', language)} *</label>
                <input type="password" className={inputClass} value={adminPwForm.current} onChange={e => setAdminPwForm(p => ({ ...p, current: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('new_password', language)} *</label>
                <input type="password" className={inputClass} value={adminPwForm.newPw} onChange={e => setAdminPwForm(p => ({ ...p, newPw: e.target.value }))} required minLength={4} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_confirm_password', language)} *</label>
                <input type="password" className={inputClass} value={adminPwForm.confirm} onChange={e => setAdminPwForm(p => ({ ...p, confirm: e.target.value }))} required />
              </div>
            </div>
            {adminPwError && <p className="text-red-500 dark:text-red-400 text-xs">{adminPwError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={adminPwLoading} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl disabled:opacity-60 hover:opacity-90 transition">
                {adminPwLoading ? '...' : (language === 'TR' ? 'Şifreyi Güncelle' : 'Update Password')}
              </button>
              <button type="button" onClick={() => setShowAdminPwChange(false)} className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">
                {language === 'TR' ? 'Vazgeç' : 'Cancel'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label={language === 'TR' ? 'Toplam' : 'Total'} value={stats.total} color="text-gray-800 dark:text-gray-100" />
        <StatCard label={language === 'TR' ? 'Beklemede' : 'Pending'} value={stats.pending} color="text-orange-600 dark:text-orange-400" />
        <StatCard label={language === 'TR' ? 'Onaylandı' : 'Approved'} value={stats.approved} color="text-green-600 dark:text-green-400" />
        <StatCard label={language === 'TR' ? 'İptal' : 'Cancelled'} value={stats.cancelled + stats.cancelRequested} color="text-red-600 dark:text-red-400" />
      </div>

      {/* Tab Bar */}
      <div className="flex bg-gray-100 dark:bg-[#0E1A30] rounded-xl p-1 mb-4 overflow-x-auto gap-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white dark:bg-[#1565C0] text-[#1565C0] dark:text-white shadow'
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
          <div className="flex flex-col gap-2 mb-3">
            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                placeholder={language === 'TR' ? 'Ad, e-posta, stüdyo ara...' : 'Search name, email, studio...'}
                className={`${inputClass} flex-1 min-w-[160px]`}
                value={search}
                onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }}
              />
              {isGlobal && (
                <select className={inputClass} value={filterCity} onChange={e => { setFilterCity(e.target.value); setFilterLocation(''); setVisibleCount(PAGE_SIZE) }}>
                  <option value="">{language === 'TR' ? 'Tüm İller' : 'All Provinces'}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              {availableLocations.length > 1 && (
                <select className={inputClass} value={filterLocation} onChange={e => { setFilterLocation(e.target.value); setVisibleCount(PAGE_SIZE) }}>
                  <option value="">{language === 'TR' ? 'Tüm Konumlar' : 'All Locations'}</option>
                  {availableLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
              )}
              <select className={inputClass} value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setVisibleCount(PAGE_SIZE) }}>
                <option value="">{language === 'TR' ? 'Tüm Durumlar' : 'All Statuses'}</option>
                <option value="PENDING">{language === 'TR' ? 'Beklemede' : 'Pending'}</option>
                <option value="APPROVED">{language === 'TR' ? 'Onaylandı' : 'Approved'}</option>
                <option value="COMPLETED">{language === 'TR' ? 'Tamamlandı' : 'Completed'}</option>
                <option value="CANCELLED">{language === 'TR' ? 'İptal Edildi' : 'Cancelled'}</option>
                <option value="CANCELLATION_REQUESTED">{language === 'TR' ? 'İptal Talebi' : 'Cancel Requested'}</option>
              </select>
            </div>
            {/* Date range */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">{language === 'TR' ? 'Tarih:' : 'Date:'}</span>
              <input type="date" className={inputClass} value={filterDateFrom} max={filterDateTo || undefined} onChange={e => { setFilterDateFrom(e.target.value); setVisibleCount(PAGE_SIZE) }} />
              <span className="text-xs text-gray-400">—</span>
              <input type="date" className={inputClass} value={filterDateTo} min={filterDateFrom || undefined} onChange={e => { setFilterDateTo(e.target.value); setVisibleCount(PAGE_SIZE) }} />
              {(search || filterCity || filterStatus || filterLocation || filterDateFrom || filterDateTo) && (
                <button onClick={resetFilters} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline">
                  {language === 'TR' ? 'Filtreleri Temizle' : 'Clear Filters'}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {filteredAppointments.length} {language === 'TR' ? 'kayıt' : 'records'}
              {filteredAppointments.length > visibleCount && ` (${visibleCount} ${language === 'TR' ? 'gösteriliyor' : 'shown'})`}
            </p>
            {filteredAppointments.length > 0 && (
              <button
                onClick={() => exportToCSV(filteredAppointments, language)}
                className="text-xs text-[#1565C0] dark:text-[#7DD4FC] border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 rounded-lg px-3 py-1.5 hover:bg-[#1565C0]/5 transition"
              >
                ⬇ {t('export_csv', language)}
              </button>
            )}
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              {t('no_appointments', language)}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filteredAppointments.slice(0, visibleCount).map(appt => (
                  <div key={appt.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
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
                      <span><span className="font-medium">{language === 'TR' ? 'İl' : 'Province'}:</span> {appt.city_name}</span>
                      <span><span className="font-medium">{language === 'TR' ? 'Tarih' : 'Date'}:</span> {formatDate(appt.date)}</span>
                      <span><span className="font-medium">{language === 'TR' ? 'Saat' : 'Time'}:</span> {appt.time_slot}</span>
                      {appt.user_branch && <span><span className="font-medium">{language === 'TR' ? 'Branş' : 'Branch'}:</span> {appt.user_branch}</span>}
                      {appt.user_phone && <span><span className="font-medium">{language === 'TR' ? 'Tel' : 'Phone'}:</span> {appt.user_phone}</span>}
                      {appt.user_work_location && <span className="col-span-2"><span className="font-medium">{language === 'TR' ? 'Kurum' : 'Institution'}:</span> {appt.user_work_location}</span>}
                      {appt.note && <span className="col-span-2"><span className="font-medium">{language === 'TR' ? 'Not' : 'Note'}:</span> {appt.note}</span>}
                    </div>


                    {(appt.status === 'PENDING' || appt.status === 'CANCELLATION_REQUESTED') && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(appt.id)} disabled={processingId === appt.id} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
                          {processingId === appt.id ? '...' : t('action_approve', language)}
                        </button>
                        <button onClick={() => handleCancel(appt.id)} disabled={processingId === appt.id} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
                          {processingId === appt.id ? '...' : t('action_cancel', language)}
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
                <button
                  onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                  className="w-full mt-3 py-3 border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 text-[#1565C0] dark:text-[#7DD4FC] rounded-xl text-sm font-medium hover:bg-[#1565C0]/5 transition"
                >
                  {language === 'TR' ? `Daha Fazla Göster (${filteredAppointments.length - visibleCount} kaldı)` : `Show More (${filteredAppointments.length - visibleCount} remaining)`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* STUDIOS TAB */}
      {activeTab === 'studios' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{language === 'TR' ? 'Stüdyolar' : 'Studios'}</h3>
            <button onClick={() => { setShowAddLab(true); setEditingLabId(null); setLabError('') }} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition">
              + {language === 'TR' ? 'Stüdyo Ekle' : 'Add Studio'}
            </button>
          </div>

          {labError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3">
              {labError}
              <button onClick={() => setLabError('')} className="ml-2 text-red-400">✕</button>
            </div>
          )}

          {showAddLab && (
            <form onSubmit={handleAddLab} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{language === 'TR' ? 'Yeni Stüdyo' : 'New Studio'}</h4>
              <LabFormFields form={labForm} setForm={setLabForm} cities={cities} inputClass={inputClass} language={language} showCity={isGlobal} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl">{language === 'TR' ? 'Kaydet' : 'Save'}</button>
                <button type="button" onClick={() => { setShowAddLab(false); setLabError('') }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">{language === 'TR' ? 'İptal' : 'Cancel'}</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {visibleLabs.map(lab => {
              const city = cities.find(c => String(c.id) === String(lab.city_id))
              const isEditing = editingLabId === lab.id
              return (
                <div key={lab.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
                  {isEditing ? (
                    <form onSubmit={handleUpdateLab} className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{language === 'TR' ? 'Stüdyoyu Düzenle' : 'Edit Studio'}</h4>
                      <LabFormFields form={editLabForm} setForm={setEditLabForm} cities={cities} inputClass={inputClass} language={language} showCity={false} />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl">{language === 'TR' ? 'Kaydet' : 'Save'}</button>
                        <button type="button" onClick={() => setEditingLabId(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">{language === 'TR' ? 'İptal' : 'Cancel'}</button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#1565C0] dark:text-[#7DD4FC] text-lg">🎙</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{lab.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{city?.name}{lab.location ? ` • ${lab.location}` : ''}</p>
                        {lab.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{lab.description}</p>}
                        <p className="text-xs text-[#1565C0] dark:text-[#7DD4FC] mt-0.5">{language === 'TR' ? 'Kapasite' : 'Capacity'}: {lab.capacity_per_slot}{lab.branches ? ` · ${lab.branches}` : ''}</p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => startEditLab(lab)} className="text-[#1565C0] dark:text-[#7DD4FC] text-xs p-1.5 hover:bg-[#1565C0]/10 rounded-lg transition">✏️</button>
                        <button onClick={() => handleDeleteLab(lab.id)} disabled={processingId === lab.id} className="text-red-500 hover:text-red-700 text-xs p-1.5 disabled:opacity-40">🗑</button>
                      </div>
                    </div>
                  )}
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
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{language === 'TR' ? 'Yeni Saat Dilimi Ekle' : 'Add New Time Slot'}</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              {isGlobal && (
                <select className={`${inputClass} flex-1`} value={newSlotCityId} onChange={e => setNewSlotCityId(e.target.value)}>
                  <option value="">{language === 'TR' ? 'İl Seçin' : 'Select Province'}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <input type="text" placeholder={language === 'TR' ? 'Örn: 09:00 - 10:00' : 'E.g.: 09:00 - 10:00'} className={`${inputClass} flex-1`} value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} />
              <button onClick={handleAddSlot} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition">
                + {language === 'TR' ? 'Ekle' : 'Add'}
              </button>
            </div>
            {slotError && <p className="text-red-500 text-xs mt-2">{slotError} <button onClick={() => setSlotError('')} className="ml-1 text-red-400">✕</button></p>}
          </div>

          {isGlobal ? (
            cities.map(city => {
              const citySlots = visibleSlots.filter(s => String(s.city_id) === String(city.id))
              if (citySlots.length === 0) return null
              return (
                <div key={city.id} className="mb-4">
                  <h4 className="text-xs font-bold text-[#1565C0] dark:text-[#7DD4FC] mb-2 uppercase tracking-wide">{city.name}</h4>
                  <div className="space-y-2">
                    {citySlots.map(slot => <SlotItem key={slot.id} slot={slot} processingId={processingId} onRemove={handleRemoveSlot} language={language} />)}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="space-y-2">
              {visibleSlots.map(slot => <SlotItem key={slot.id} slot={slot} processingId={processingId} onRemove={handleRemoveSlot} language={language} />)}
              {visibleSlots.length === 0 && (
                <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
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
          <div className="mb-4">
            <input
              type="text"
              placeholder={language === 'TR' ? 'İsim veya e-posta ile ara...' : 'Search by name or email...'}
              className={`${inputClass} w-full`}
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>

          <h3 className="font-bold text-orange-600 dark:text-orange-400 text-sm mb-2">
            {language === 'TR' ? 'Onay Bekleyenler' : 'Pending Approval'} ({pendingUsers.length})
          </h3>
          {pendingUsers.length === 0 ? (
            <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 text-center text-gray-500 dark:text-gray-400 text-sm mb-4">
              {language === 'TR' ? 'Onay bekleyen kullanıcı yok.' : 'No users pending approval.'}
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {pendingUsers.map(user => (
                <UserCard key={user.id} user={user} language={language} processingId={processingId} onApprove={handleApproveUser} onRevoke={handleRevokeUser} showApprove />
              ))}
            </div>
          )}

          <h3 className="font-bold text-green-600 dark:text-green-400 text-sm mb-2">
            {language === 'TR' ? 'Onaylı Üyeler' : 'Approved Members'} ({approvedUsers.length})
          </h3>
          {approvedUsers.length === 0 ? (
            <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              {language === 'TR' ? 'Onaylı üye yok.' : 'No approved members.'}
            </div>
          ) : (
            <div className="space-y-3">
              {approvedUsers.map(user => (
                <UserCard key={user.id} user={user} language={language} processingId={processingId} onApprove={handleApproveUser} onRevoke={handleRevokeUser} showRevoke />
              ))}
            </div>
          )}
        </div>
      )}

      {/* STATS TAB */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          {/* Global admin city filter for stats */}
          {isGlobal && (
            <div className="flex items-center gap-3">
              <select
                className={`${inputClass} flex-1`}
                value={statsCity}
                onChange={e => setStatsCity(e.target.value)}
              >
                <option value="">{language === 'TR' ? 'Tüm İller' : 'All Provinces'}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {statsCity && (
                <button onClick={() => setStatsCity('')} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline whitespace-nowrap">
                  {language === 'TR' ? 'Temizle' : 'Clear'}
                </button>
              )}
            </div>
          )}

          {/* Studio Usage Ranking */}
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('stats_studio_usage', language)}</h3>
            {studioStats.length === 0 ? (
              <p className="text-xs text-gray-400">{t('stats_no_data', language)}</p>
            ) : (
              <div className="space-y-2">
                {studioStats.map((item, i) => {
                  const pct = Math.round((item.count / studioStats[0].count) * 100)
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                        <span className="truncate max-w-[70%]">{i + 1}. {item.name}</span>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-[#1565C0] dark:bg-[#7DD4FC] h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Status Distribution */}
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('stats_status_dist', language)}</h3>
            {statusStats.length === 0 ? (
              <p className="text-xs text-gray-400">{t('stats_no_data', language)}</p>
            ) : (
              <div className="space-y-2">
                {statusStats.map(item => {
                  const max = Math.max(...statusStats.map(x => x.count))
                  const pct = Math.round((item.count / max) * 100)
                  return (
                    <div key={item.status}>
                      <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                        <span>{statusLabel(item.status, language)}</span>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            item.status === 'APPROVED' ? 'bg-green-500' :
                            item.status === 'PENDING' ? 'bg-orange-400' :
                            item.status === 'COMPLETED' ? 'bg-blue-500' :
                            'bg-red-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Monthly Trend */}
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('stats_monthly', language)}</h3>
            {monthlyStats.every(m => m.count === 0) ? (
              <p className="text-xs text-gray-400">{t('stats_no_data', language)}</p>
            ) : (() => {
              const maxCount = Math.max(...monthlyStats.map(m => m.count), 1)
              return (
                <div className="flex items-end gap-2 h-28">
                  {monthlyStats.map(m => {
                    const heightPct = Math.round((m.count / maxCount) * 100)
                    return (
                      <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">{m.count > 0 ? m.count : ''}</span>
                        <div className="w-full flex items-end" style={{ height: '72px' }}>
                          <div
                            className="w-full bg-[#1565C0] dark:bg-[#7DD4FC] rounded-t-md transition-all"
                            style={{ height: `${Math.max(heightPct, m.count > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                        <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight">{m.label}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>

          {/* Busiest Time Slots */}
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('stats_slots', language)}</h3>
            {slotStats.length === 0 ? (
              <p className="text-xs text-gray-400">{t('stats_no_data', language)}</p>
            ) : (
              <div className="space-y-2">
                {slotStats.map(item => {
                  const pct = Math.round((item.count / slotStats[0].count) * 100)
                  return (
                    <div key={item.slot}>
                      <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                        <span>{item.slot}</span>
                        <span className="font-semibold">{item.count}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-orange-400 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOTIFICATIONS TAB */}
      {activeTab === 'notifications' && (
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">
            {language === 'TR' ? 'Yeni Bildirim Gönder' : 'Send New Notification'}
          </h3>
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
            <form onSubmit={handleCreateNotification} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Tür' : 'Type'}</label>
                <select className={`${inputClass} w-full`} value={notifForm.type} onChange={e => setNotifForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="SYSTEM">💡 {language === 'TR' ? 'Sistem' : 'System'}</option>
                  <option value="REMINDER">⏰ {language === 'TR' ? 'Hatırlatma' : 'Reminder'}</option>
                  <option value="ALERT">🚨 {language === 'TR' ? 'Uyarı' : 'Alert'}</option>
                </select>
              </div>
              {isGlobal && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_target_city', language)}</label>
                  <select className={`${inputClass} w-full`} value={notifCity} onChange={e => setNotifCity(e.target.value)}>
                    <option value="">{t('notif_target_all', language)}</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {notifCity && (
                    <p className="text-xs text-[#1565C0] dark:text-[#7DD4FC] mt-1">
                      {language === 'TR' ? '📍 Yalnızca seçilen şehrin kullanıcılarına gönderilecek.' : '📍 Will be sent only to users in the selected city.'}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Başlık' : 'Title'} *</label>
                <input
                  type="text"
                  className={`${inputClass} w-full`}
                  value={notifForm.title}
                  onChange={e => setNotifForm(p => ({ ...p, title: e.target.value }))}
                  required
                  placeholder={language === 'TR' ? 'Bildirim başlığı...' : 'Notification title...'}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Mesaj' : 'Message'} *</label>
                <textarea
                  className={`${inputClass} w-full resize-none`}
                  rows={4}
                  value={notifForm.message}
                  onChange={e => setNotifForm(p => ({ ...p, message: e.target.value }))}
                  required
                  placeholder={language === 'TR' ? 'Bildirim mesajı...' : 'Notification message...'}
                />
              </div>
              {notifError && <p className="text-red-500 dark:text-red-400 text-xs">{notifError}</p>}
              {notifSuccess && <p className="text-green-600 dark:text-green-400 text-xs font-medium">{notifSuccess}</p>}
              <button
                type="submit"
                disabled={notifLoading}
                className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-60"
              >
                {notifLoading ? '...' : (language === 'TR' ? '🔔 Bildirimi Gönder' : '🔔 Send Notification')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <p className="text-sm text-gray-800 dark:text-gray-100 font-medium mb-5">{confirmModal.label}</p>
            <div className="flex gap-3">
              <button
                onClick={async () => { setConfirmModal(null); await confirmModal.onConfirm() }}
                className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition"
              >
                {language === 'TR' ? 'Evet' : 'Yes'}
              </button>
              <button
                onClick={() => setConfirmModal(null)}
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

function LabFormFields({ form, setForm, cities, inputClass, language, showCity }) {
  return (
    <>
      {showCity && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'İl' : 'Province'} *</label>
          <select className={`${inputClass} w-full`} value={form.city_id || ''} onChange={e => setForm(p => ({ ...p, city_id: e.target.value }))} required>
            <option value="">{language === 'TR' ? 'İl Seçin' : 'Select Province'}</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'Stüdyo Adı' : 'Studio Name'} *</label>
        <input type="text" className={`${inputClass} w-full`} value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'Açıklama' : 'Description'}</label>
        <input type="text" className={`${inputClass} w-full`} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'Konum' : 'Location'}</label>
        <input type="text" className={`${inputClass} w-full`} value={form.location || ''} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'Branşlar' : 'Branches'}</label>
        <input type="text" className={`${inputClass} w-full`} value={form.branches || ''} onChange={e => setForm(p => ({ ...p, branches: e.target.value }))} placeholder={language === 'TR' ? 'Örn: Fen, Matematik' : 'E.g.: Science, Math'} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{language === 'TR' ? 'Kapasite (slot başına)' : 'Capacity (per slot)'}</label>
        <input type="number" min="1" className={`${inputClass} w-full`} value={form.capacity_per_slot || 1} onChange={e => setForm(p => ({ ...p, capacity_per_slot: e.target.value }))} />
      </div>
    </>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</p>
    </div>
  )
}

function SlotItem({ slot, processingId, onRemove, language }) {
  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-xl shadow px-4 py-3 flex items-center justify-between">
      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{slot.time_range}</span>
      <button onClick={() => onRemove(slot.id)} disabled={processingId === slot.id} className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40">
        {processingId === slot.id ? '...' : (language === 'TR' ? 'Sil' : 'Delete')}
      </button>
    </div>
  )
}

function UserCard({ user, language, processingId, onApprove, onRevoke, showApprove, showRevoke }) {
  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
      <div className="flex items-start gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[#1565C0] dark:text-[#7DD4FC] font-bold text-sm">{(user.name || '?').charAt(0).toUpperCase()}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{user.name} {user.surname}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400 mb-3">
        {user.branch && <span><span className="font-medium">{language === 'TR' ? 'Branş' : 'Branch'}:</span> {user.branch}</span>}
        {user.phone && <span><span className="font-medium">{language === 'TR' ? 'Tel' : 'Phone'}:</span> {user.phone}</span>}
        {user.city_name && <span><span className="font-medium">{language === 'TR' ? 'İl' : 'Province'}:</span> {user.city_name}</span>}
        {user.district && <span><span className="font-medium">{language === 'TR' ? 'İlçe' : 'District'}:</span> {user.district}</span>}
        {user.work_location && <span className="col-span-2"><span className="font-medium">{language === 'TR' ? 'Kurum' : 'Institution'}:</span> {user.work_location}</span>}
      </div>
      {showApprove && (
        <button onClick={() => onApprove(user.id)} disabled={processingId === user.id} className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
          {processingId === user.id ? '...' : (language === 'TR' ? 'Üyeliği Onayla' : 'Approve Membership')}
        </button>
      )}
      {showRevoke && (
        <button onClick={() => onRevoke(user.id)} disabled={processingId === user.id} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
          {processingId === user.id ? '...' : (language === 'TR' ? 'Üyeliği İptal Et' : 'Revoke Membership')}
        </button>
      )}
    </div>
  )
}

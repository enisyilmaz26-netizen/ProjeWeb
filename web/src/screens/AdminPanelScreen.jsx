import React, { useState, useMemo, useEffect } from 'react'
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
    a.created_timestamp ? new Date(Number(a.created_timestamp)).toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB') : '',
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
    appointments, cities, labs, users, timeSlots, workshops, admins,
    approveAppointment, cancelAppointment, markAppointmentCompleted,
    approveUser, revokeUser,
    addTimeSlot, removeTimeSlot,
    addLab, updateLab, deleteLab,
    createNotification,
    changeAdminPassword,
    resetPassword,
    loadAllData,
    addWorkshop, deleteWorkshop,
    addAdmin, updateAdmin, deleteAdmin, resetAdminPasswordByGlobal,
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

  // Reset user password modal
  const [resetPwModal, setResetPwModal] = useState(null) // { userId, email, userName }
  const [resetPwValue, setResetPwValue] = useState('')
  const [resetPwError, setResetPwError] = useState('')
  const [resetPwLoading, setResetPwLoading] = useState(false)
  const [resetPwSuccess, setResetPwSuccess] = useState('')

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

  useEffect(() => {
    if (!confirmModal) return
    const handler = (e) => { if (e.key === 'Escape') setConfirmModal(null) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [confirmModal])

  useEffect(() => {
    if (!resetPwModal) return
    const handler = (e) => { if (e.key === 'Escape') { setResetPwModal(null); setResetPwValue(''); setResetPwError(''); setResetPwSuccess('') } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [resetPwModal])

  // Notifications tab
  const [notifForm, setNotifForm] = useState({ title: '', message: '', type: 'SYSTEM' })
  const [notifCity, setNotifCity] = useState('')
  const [notifLoading, setNotifLoading] = useState(false)
  const [notifSuccess, setNotifSuccess] = useState('')
  const [notifError, setNotifError] = useState('')

  // Workshops tab
  const [workshopForm, setWorkshopForm] = useState({ name: '', description: '', date: '', time: '', capacity: 1, location: '', city_id: '' })
  const [workshopError, setWorkshopError] = useState('')
  const [workshopSuccess, setWorkshopSuccess] = useState('')
  const [showAddWorkshop, setShowAddWorkshop] = useState(false)

  // City filters for global admin
  const [labCityFilter, setLabCityFilter] = useState('')
  const [workshopCityFilter, setWorkshopCityFilter] = useState('')
  const [userCityFilter, setUserCityFilter] = useState('')
  const [migrating, setMigrating] = useState(false)
  const [labSaveSuccess, setLabSaveSuccess] = useState(false)

  // Admin management tab (global only)
  const [adminSearch, setAdminSearch] = useState('')
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', role: 'CITY', city_id: '', phone: '' })
  const [adminFormError, setAdminFormError] = useState('')
  const [adminFormSuccess, setAdminFormSuccess] = useState('')
  const [adminFormLoading, setAdminFormLoading] = useState(false)
  const [editAdminModal, setEditAdminModal] = useState(null) // { adminId, name, role, city_id }
  const [editAdminLoading, setEditAdminLoading] = useState(false)
  const [editAdminError, setEditAdminError] = useState('')
  const [resetAdminPwModal, setResetAdminPwModal] = useState(null)
  const [resetAdminPwValue, setResetAdminPwValue] = useState('')
  const [resetAdminPwError, setResetAdminPwError] = useState('')
  const [resetAdminPwLoading, setResetAdminPwLoading] = useState(false)
  const [resetAdminPwSuccess, setResetAdminPwSuccess] = useState('')

  useEffect(() => {
    if (!resetAdminPwModal) return
    const handler = (e) => { if (e.key === 'Escape') { setResetAdminPwModal(null); setResetAdminPwValue(''); setResetAdminPwError(''); setResetAdminPwSuccess('') } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [resetAdminPwModal])

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
      const label = d.toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { month: 'short', year: '2-digit' })
      months[key] = { label, count: 0 }
    }
    scopedAppointments.forEach(a => {
      if (!a.date) return
      const key = a.date.substring(0, 7)
      if (months[key]) months[key].count++
    })
    return Object.values(months)
  }, [scopedAppointments, language])

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
    let base = isGlobal ? users.filter(u => !u.is_approved) : users.filter(u => !u.is_approved && String(u.city_id) === String(adminCityId))
    if (isGlobal && userCityFilter) base = base.filter(u => String(u.city_id) === String(userCityFilter))
    if (!userSearch.trim()) return base
    const q = userSearch.toLowerCase()
    return base.filter(u => `${u.name} ${u.surname} ${u.email}`.toLowerCase().includes(q))
  }, [users, isGlobal, adminCityId, userSearch, userCityFilter])

  const approvedUsers = useMemo(() => {
    let base = isGlobal ? users.filter(u => u.is_approved) : users.filter(u => u.is_approved && String(u.city_id) === String(adminCityId))
    if (isGlobal && userCityFilter) base = base.filter(u => String(u.city_id) === String(userCityFilter))
    if (!userSearch.trim()) return base
    const q = userSearch.toLowerCase()
    return base.filter(u => `${u.name} ${u.surname} ${u.email}`.toLowerCase().includes(q))
  }, [users, isGlobal, adminCityId, userSearch, userCityFilter])

  const visibleSlots = useMemo(() => {
    return isGlobal ? timeSlots : timeSlots.filter(s => String(s.city_id) === String(adminCityId))
  }, [timeSlots, isGlobal, adminCityId])

  const visibleLabs = useMemo(() => {
    let list = isGlobal ? labs : labs.filter(l => String(l.city_id) === String(adminCityId))
    if (isGlobal && labCityFilter) list = list.filter(l => String(l.city_id) === String(labCityFilter))
    return list
  }, [labs, isGlobal, adminCityId, labCityFilter])

  const visibleWorkshops = useMemo(() => {
    let list = isGlobal ? workshops : workshops.filter(w => String(w.city_id) === String(adminCityId))
    if (isGlobal && workshopCityFilter) list = list.filter(w => String(w.city_id) === String(workshopCityFilter))
    return list
  }, [workshops, isGlobal, adminCityId, workshopCityFilter])

  const filteredAdmins = useMemo(() => {
    if (!adminSearch.trim()) return admins
    const q = adminSearch.toLowerCase()
    return admins.filter(a => (a.name || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q))
  }, [admins, adminSearch])

  const needsMigration = isGlobal && labs.some(l =>
    (l.name.includes('Gölbaşı BİLSEM ÖÖL') && !l.name.startsWith('Ankara ')) ||
    l.name.includes('Öğretim Tasarımı ve Senaryo Atölyesi')
  )

  // Handlers
  const execApprove = async (id) => {
    setProcessingId(id)
    await approveAppointment(id)
    const appt = appointments.find(a => a.id === id)
    if (appt) {
      const prefix = appt.city_name ? `[${appt.city_name}] ` : ''
      await createNotification({
        title: `${prefix}${t('notif_appt_approved', language)}`,
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
        title: `${prefix}${t('notif_appt_cancelled', language)}`,
        message: `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${appt.date} ${appt.time_slot}`,
        type: 'ALERT',
      })
    }
    setProcessingId(null)
  }

  const handleApprove = (id) => setConfirmModal({
    label: t('confirm_approve_appt', language),
    onConfirm: () => execApprove(id),
  })

  const handleCancel = (id) => setConfirmModal({
    label: t('confirm_cancel_appt', language),
    onConfirm: () => execCancel(id),
  })

  const handleMarkCompleted = (id) => setConfirmModal({
    label: t('confirm_complete_appt', language),
    onConfirm: async () => { setProcessingId(id); await markAppointmentCompleted(id); setProcessingId(null) },
  })

  const handleApproveUser = (id) => setConfirmModal({
    label: t('confirm_approve_user', language),
    onConfirm: async () => { setProcessingId(id); await approveUser(id); setProcessingId(null) },
  })

  const handleRevokeUser = (id) => setConfirmModal({
    label: t('confirm_revoke_user', language),
    onConfirm: async () => { setProcessingId(id); await revokeUser(id); setProcessingId(null) },
  })

  const handleAddSlot = async () => {
    setSlotError('')
    const cityId = isGlobal ? newSlotCityId : adminCityId
    if (!cityId || !newSlotTime.trim()) {
      setSlotError(t('slot_required_fields', language))
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
      setLabError(t('studio_city_required', language))
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
      setLabError(t('studio_name_required', language))
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
      setLabSaveSuccess(true)
      setTimeout(() => setLabSaveSuccess(false), 2500)
    } else {
      const errKey = result.error
      setLabError((errKey && translations[errKey]) ? t(errKey, language) : (result.error || t('err_generic', language)))
    }
  }

  const handleDeleteLab = (id) => {
    setConfirmModal({
      label: t('delete_lab_confirm', language),
      onConfirm: async () => {
        setProcessingId(id)
        const result = await deleteLab(id)
        setProcessingId(null)
        if (!result.success) {
          const errKey = result.error
          setLabError((errKey && translations[errKey]) ? t(errKey, language) : (result.error || t('err_generic', language)))
        }
      }
    })
  }

  const handleMigrateData = async () => {
    setMigrating(true)
    const golbasiLabs = labs.filter(l =>
      l.name.includes('Gölbaşı BİLSEM ÖÖL') && !l.name.startsWith('Ankara ')
    )
    for (const lab of golbasiLabs) {
      await updateLab(lab.id, { name: 'Ankara ' + lab.name })
    }
    const atolyeLabs = labs.filter(l => l.name.includes('Öğretim Tasarımı ve Senaryo Atölyesi'))
    for (const lab of atolyeLabs) {
      const wsResult = await addWorkshop({
        name: lab.name,
        city_id: lab.city_id,
        description: lab.description || '',
        location: lab.location || '',
        date: '',
        time: '',
        capacity: lab.capacity_per_slot || 1,
      })
      if (wsResult.success) await deleteLab(lab.id)
    }
    setMigrating(false)
  }

  const handleEditAdmin = async (e) => {
    e.preventDefault()
    if (!editAdminModal) return
    setEditAdminError('')
    if (editAdminModal.role === 'CITY' && !editAdminModal.city_id) {
      setEditAdminError(language === 'TR' ? 'İl yöneticisi için il seçimi zorunludur.' : 'Province is required for city admin.')
      return
    }
    setEditAdminLoading(true)
    const updates = {
      role: editAdminModal.role,
      city_id: editAdminModal.role === 'GLOBAL' ? null : editAdminModal.city_id,
    }
    const result = await updateAdmin(editAdminModal.adminId, updates)
    setEditAdminLoading(false)
    if (result.success) {
      setEditAdminModal(null)
    } else {
      const errKey = result.error
      setEditAdminError((errKey && translations[errKey]) ? t(errKey, language) : (result.error || t('err_generic', language)))
    }
  }

  const handleCreateNotification = async (e) => {
    e.preventDefault()
    setNotifError('')
    if (!notifForm.title.trim() || !notifForm.message.trim()) {
      setNotifError(t('notif_required_fields', language))
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
      setNotifSuccess(t('notif_sent', language))
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
    if (adminPwForm.newPw.length < 8) {
      setAdminPwError(t('err_password_min_length', language))
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
      setAdminPwError(translations[errKey] ? t(errKey, language) : (errKey || t('err_generic', language)))
    }
  }

  const handleResetUserPassword = async (e) => {
    e.preventDefault()
    setResetPwError('')
    if (resetPwValue.length < 8) {
      setResetPwError(t('err_password_min_length', language))
      return
    }
    setResetPwLoading(true)
    const result = await resetPassword(resetPwModal.userId, resetPwModal.email, resetPwValue)
    setResetPwLoading(false)
    if (result.success) {
      setResetPwSuccess(t('reset_pw_success', language))
      setTimeout(() => { setResetPwModal(null); setResetPwValue(''); setResetPwSuccess('') }, 1500)
    } else {
      setResetPwError(result.error || t('err_generic', language))
    }
  }

  const handleAddAdmin = async (e) => {
    e.preventDefault()
    setAdminFormError('')
    if (!adminForm.name.trim() || !adminForm.email.trim() || !adminForm.password.trim()) {
      setAdminFormError(t('err_admin_required_fields', language))
      return
    }
    if (adminForm.role === 'CITY' && !adminForm.city_id) {
      setAdminFormError(t('err_city_required', language))
      return
    }
    setAdminFormLoading(true)
    const result = await addAdmin(adminForm)
    setAdminFormLoading(false)
    if (result.success) {
      setShowAddAdmin(false)
      setAdminForm({ name: '', email: '', password: '', role: 'CITY', city_id: '', phone: '' })
      setAdminFormSuccess(t('admin_added', language))
      setTimeout(() => setAdminFormSuccess(''), 3000)
    } else {
      setAdminFormError(result.error || t('err_generic', language))
    }
  }

  const handleDeleteAdmin = (adminId) => {
    if (adminId === loggedInAdmin?.id) return
    setConfirmModal({
      label: t('admin_delete_confirm', language),
      onConfirm: async () => {
        setProcessingId(adminId)
        await deleteAdmin(adminId)
        setProcessingId(null)
      },
    })
  }

  const handleResetAdminPassword = async (e) => {
    e.preventDefault()
    setResetAdminPwError('')
    if (resetAdminPwValue.length < 8) {
      setResetAdminPwError(t('err_password_min_length', language))
      return
    }
    setResetAdminPwLoading(true)
    const result = await resetAdminPasswordByGlobal(resetAdminPwModal.adminId, resetAdminPwModal.email, resetAdminPwValue)
    setResetAdminPwLoading(false)
    if (result.success) {
      setResetAdminPwSuccess(t('reset_pw_success', language))
      setTimeout(() => { setResetAdminPwModal(null); setResetAdminPwValue(''); setResetAdminPwSuccess('') }, 1500)
    } else {
      setResetAdminPwError(result.error || t('err_generic', language))
    }
  }

  const handleAddWorkshop = async (e) => {
    e.preventDefault()
    setWorkshopError('')
    const cityId = isGlobal ? workshopForm.city_id : adminCityId
    const cityObj = cities.find(c => String(c.id) === String(cityId))
    if (!workshopForm.name.trim() || !cityId) {
      setWorkshopError(t('workshop_name_required', language))
      return
    }
    const result = await addWorkshop({
      name: workshopForm.name,
      description: workshopForm.description,
      date: workshopForm.date || null,
      time: workshopForm.time || null,
      capacity: Number(workshopForm.capacity) || 1,
      location: workshopForm.location,
      city_id: cityId,
      city_name: cityObj?.name || '',
    })
    if (result.success) {
      setShowAddWorkshop(false)
      setWorkshopForm({ name: '', description: '', date: '', time: '', capacity: 1, location: '', city_id: '' })
      setWorkshopSuccess(t('workshop_added', language))
      setTimeout(() => setWorkshopSuccess(''), 3000)
    } else {
      setWorkshopError(result.error || t('err_generic', language))
    }
  }

  const handleDeleteWorkshop = (id) => setConfirmModal({
    label: t('workshop_delete_confirm', language),
    onConfirm: async () => {
      setProcessingId(id)
      await deleteWorkshop(id)
      setProcessingId(null)
    },
  })

  const resetFilters = () => {
    setSearch(''); setFilterCity(''); setFilterStatus(''); setFilterLocation('')
    setFilterDateFrom(''); setFilterDateTo(''); setVisibleCount(PAGE_SIZE)
  }

  const inputClass = INPUT_BASE

  const tabs = [
    { key: 'appointments', label: t('tab_appointments_label', language) },
    { key: 'workshops', label: t('tab_workshops', language) },
    { key: 'studios', label: t('tab_studios_label', language) },
    { key: 'slots', label: t('tab_slots_label', language) },
    { key: 'user_approvals', label: t('tab_approvals_label', language) },
    { key: 'notifications', label: t('tab_send_notif', language) },
    { key: 'stats', label: t('tab_stats', language) },
    ...(isGlobal ? [{ key: 'admins', label: t('tab_admins', language) }] : []),
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
              {isGlobal ? t('admin_type_global', language) : t('admin_type_city', language)}
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
              {t('btn_refresh', language)}
            </button>
            {needsMigration && (
              <button
                onClick={handleMigrateData}
                disabled={migrating}
                className="text-xs text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-600 rounded-lg px-3 py-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition disabled:opacity-60"
              >
                {migrating ? '...' : (language === 'TR' ? '🔄 Veriyi Düzenle' : '🔄 Fix Data')}
              </button>
            )}
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
                <input type="password" className={inputClass} value={adminPwForm.newPw} onChange={e => setAdminPwForm(p => ({ ...p, newPw: e.target.value }))} required minLength={8} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_confirm_password', language)} *</label>
                <input type="password" className={inputClass} value={adminPwForm.confirm} onChange={e => setAdminPwForm(p => ({ ...p, confirm: e.target.value }))} required minLength={8} />
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
      <div role="tablist" className="flex bg-gray-100 dark:bg-[#0E1A30] rounded-xl p-1 mb-4 overflow-x-auto gap-1 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
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
                placeholder={t('search_placeholder', language)}
                className={`${inputClass} flex-1 min-w-[160px]`}
                value={search}
                onChange={e => { setSearch(e.target.value); setVisibleCount(PAGE_SIZE) }}
              />
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
            {/* Date range */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('filter_date', language)}</span>
              <input type="date" className={inputClass} value={filterDateFrom} max={filterDateTo || undefined} onChange={e => { setFilterDateFrom(e.target.value); setVisibleCount(PAGE_SIZE) }} />
              <span className="text-xs text-gray-400">—</span>
              <input type="date" className={inputClass} value={filterDateTo} min={filterDateFrom || undefined} onChange={e => { setFilterDateTo(e.target.value); setVisibleCount(PAGE_SIZE) }} />
              {(search || filterCity || filterStatus || filterLocation || filterDateFrom || filterDateTo) && (
                <button onClick={resetFilters} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline">
                  {t('filter_clear', language)}
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {filteredAppointments.length} {t('records_count', language)}
              {filteredAppointments.length > visibleCount && ` (${visibleCount} ${t('shown', language)})`}
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
                      <span><span className="font-medium">{t('lbl_studio', language)}:</span> {appt.lab_name}</span>
                      <span><span className="font-medium">{t('lbl_province', language)}:</span> {appt.city_name}</span>
                      <span><span className="font-medium">{t('lbl_date', language)}:</span> {formatDate(appt.date)}</span>
                      <span><span className="font-medium">{t('lbl_time', language)}:</span> {appt.time_slot}</span>
                      {appt.user_branch && <span><span className="font-medium">{t('lbl_branch', language)}:</span> {appt.user_branch}</span>}
                      {appt.user_phone && <span><span className="font-medium">{t('lbl_phone', language)}:</span> {appt.user_phone}</span>}
                      {appt.user_work_location && <span className="col-span-2"><span className="font-medium">{t('lbl_institution', language)}:</span> {appt.user_work_location}</span>}
                      {appt.note && <span className="col-span-2"><span className="font-medium">{t('lbl_note', language)}:</span> {appt.note}</span>}
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
                  {t('show_more', language)} ({filteredAppointments.length - visibleCount} {t('remaining', language)})
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
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('tab_studios_label', language)}</h3>
            <button onClick={() => { setShowAddLab(true); setEditingLabId(null); setLabError('') }} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition">
              {t('studio_add', language)}
            </button>
          </div>

          {isGlobal && (
            <select
              className={`${inputClass} w-full mb-3`}
              value={labCityFilter}
              onChange={e => setLabCityFilter(e.target.value)}
            >
              <option value="">{t('filter_all_provinces', language)}</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {labSaveSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">
              {language === 'TR' ? 'Alan başarıyla güncellendi.' : 'Area updated successfully.'}
            </div>
          )}

          {labError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3">
              {labError}
              <button onClick={() => setLabError('')} className="ml-2 text-red-400">✕</button>
            </div>
          )}

          {showAddLab && (
            <form onSubmit={handleAddLab} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('studio_new', language)}</h4>
              <LabFormFields form={labForm} setForm={setLabForm} cities={cities} inputClass={inputClass} language={language} showCity={isGlobal} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl">{t('btn_save', language)}</button>
                <button type="button" onClick={() => { setShowAddLab(false); setLabError('') }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">{t('btn_nevermind', language)}</button>
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
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('studio_edit', language)}</h4>
                      <LabFormFields form={editLabForm} setForm={setEditLabForm} cities={cities} inputClass={inputClass} language={language} showCity={false} />
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl">{t('btn_save', language)}</button>
                        <button type="button" onClick={() => { setEditingLabId(null); setEditLabForm({}) }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">{t('btn_nevermind', language)}</button>
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
                        <p className="text-xs text-[#1565C0] dark:text-[#7DD4FC] mt-0.5">{t('capacity_label', language)}: {lab.capacity_per_slot}{lab.branches ? ` · ${lab.branches}` : ''}</p>
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

      {/* WORKSHOPS TAB */}
      {activeTab === 'workshops' && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('tab_workshops', language)}</h3>
            <button
              onClick={() => { setShowAddWorkshop(true); setWorkshopError('') }}
              className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition"
            >
              + {t('workshop_add', language)}
            </button>
          </div>

          {isGlobal && (
            <select
              className={`${inputClass} w-full mb-3`}
              value={workshopCityFilter}
              onChange={e => setWorkshopCityFilter(e.target.value)}
            >
              <option value="">{t('filter_all_provinces', language)}</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}

          {workshopSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">
              {workshopSuccess}
            </div>
          )}

          {workshopError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3">
              {workshopError}
              <button onClick={() => setWorkshopError('')} className="ml-2 text-red-400">✕</button>
            </div>
          )}

          {showAddWorkshop && (
            <form onSubmit={handleAddWorkshop} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('workshop_new', language)}</h4>
              {isGlobal && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_province', language)} *</label>
                  <select className={`${inputClass} w-full`} value={workshopForm.city_id} onChange={e => setWorkshopForm(p => ({ ...p, city_id: e.target.value }))} required>
                    <option value="">{t('select_province', language)}</option>
                    {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_name_label', language)} *</label>
                <input type="text" className={`${inputClass} w-full`} value={workshopForm.name} onChange={e => setWorkshopForm(p => ({ ...p, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_desc_label', language)}</label>
                <input type="text" className={`${inputClass} w-full`} value={workshopForm.description} onChange={e => setWorkshopForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_date_label', language)}</label>
                  <input type="date" className={`${inputClass} w-full`} value={workshopForm.date} onChange={e => setWorkshopForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_time_label', language)}</label>
                  <input type="text" className={`${inputClass} w-full`} placeholder="09:00 - 17:00" value={workshopForm.time} onChange={e => setWorkshopForm(p => ({ ...p, time: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_location_label', language)}</label>
                  <input type="text" className={`${inputClass} w-full`} value={workshopForm.location} onChange={e => setWorkshopForm(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_capacity_label', language)}</label>
                  <input type="number" min="1" className={`${inputClass} w-full`} value={workshopForm.capacity} onChange={e => setWorkshopForm(p => ({ ...p, capacity: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl">{t('btn_save', language)}</button>
                <button type="button" onClick={() => { setShowAddWorkshop(false); setWorkshopError('') }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">{t('btn_nevermind', language)}</button>
              </div>
            </form>
          )}

          {visibleWorkshops.length === 0 ? (
            <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              {t('no_workshops', language)}
            </div>
          ) : (
            <div className="space-y-3">
              {visibleWorkshops.map(ws => {
                const city = cities.find(c => String(c.id) === String(ws.city_id))
                return (
                  <div key={ws.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#1565C0] dark:text-[#7DD4FC] text-lg">🎓</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{ws.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {city?.name || ws.city_name}
                          {ws.location ? ` • ${ws.location}` : ''}
                        </p>
                        {ws.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ws.description}</p>}
                        <div className="flex flex-wrap gap-3 mt-1.5">
                          {ws.date && (
                            <span className="text-xs bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 text-[#1565C0] dark:text-[#7DD4FC] px-2 py-0.5 rounded-lg font-medium">
                              📅 {formatDate(ws.date)}
                            </span>
                          )}
                          {ws.time && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg font-medium">
                              🕐 {ws.time}
                            </span>
                          )}
                          {ws.capacity && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg font-medium">
                              👥 {ws.capacity}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteWorkshop(ws.id)}
                        disabled={processingId === ws.id}
                        className="text-red-500 hover:text-red-700 text-xs p-1.5 disabled:opacity-40 flex-shrink-0"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* SLOTS TAB */}
      {activeTab === 'slots' && (
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('slot_mgmt_title', language)}</h3>
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('slot_add_new', language)}</h4>
            <div className="flex flex-col sm:flex-row gap-2">
              {isGlobal && (
                <select className={`${inputClass} flex-1`} value={newSlotCityId} onChange={e => setNewSlotCityId(e.target.value)}>
                  <option value="">{t('select_province', language)}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <input type="text" placeholder={t('slot_placeholder', language)} className={`${inputClass} flex-1`} value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} />
              <button onClick={handleAddSlot} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition">
                + {t('btn_add', language)}
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
                  {t('slot_none', language)}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* USER APPROVALS TAB */}
      {activeTab === 'user_approvals' && (
        <div>
          <div className="mb-4 flex flex-col gap-2">
            {isGlobal && (
              <select
                className={`${inputClass} w-full`}
                value={userCityFilter}
                onChange={e => setUserCityFilter(e.target.value)}
              >
                <option value="">{t('filter_all_provinces', language)}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <input
              type="text"
              placeholder={t('search_user_placeholder', language)}
              className={`${inputClass} w-full`}
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>

          <h3 className="font-bold text-orange-600 dark:text-orange-400 text-sm mb-2">
            {t('pending_users_title', language)} ({pendingUsers.length})
          </h3>
          {pendingUsers.length === 0 ? (
            <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 text-center text-gray-500 dark:text-gray-400 text-sm mb-4">
              {t('no_pending_users', language)}
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              {pendingUsers.map(user => (
                <UserCard key={user.id} user={user} language={language} processingId={processingId} onApprove={handleApproveUser} onRevoke={handleRevokeUser} onResetPassword={() => { setResetPwModal({ userId: user.id, email: user.email, userName: `${user.name} ${user.surname}` }); setResetPwValue(''); setResetPwError(''); setResetPwSuccess('') }} showApprove />
              ))}
            </div>
          )}

          <h3 className="font-bold text-green-600 dark:text-green-400 text-sm mb-2">
            {t('approved_users_title', language)} ({approvedUsers.length})
          </h3>
          {approvedUsers.length === 0 ? (
            <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              {t('no_approved_users', language)}
            </div>
          ) : (
            <div className="space-y-3">
              {approvedUsers.map(user => (
                <UserCard key={user.id} user={user} language={language} processingId={processingId} onApprove={handleApproveUser} onRevoke={handleRevokeUser} onResetPassword={() => { setResetPwModal({ userId: user.id, email: user.email, userName: `${user.name} ${user.surname}` }); setResetPwValue(''); setResetPwError(''); setResetPwSuccess('') }} showRevoke />
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
                <option value="">{t('filter_all_provinces', language)}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {statsCity && (
                <button onClick={() => setStatsCity('')} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline whitespace-nowrap">
                  {t('clear', language)}
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
            {t('notif_new', language)}
          </h3>
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
            <form onSubmit={handleCreateNotification} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_lbl_type', language)}</label>
                <select className={`${inputClass} w-full`} value={notifForm.type} onChange={e => setNotifForm(p => ({ ...p, type: e.target.value }))}>
                  <option value="SYSTEM">💡 {t('notif_type_system', language)}</option>
                  <option value="REMINDER">⏰ {t('notif_type_reminder', language)}</option>
                  <option value="ALERT">🚨 {t('notif_type_alert', language)}</option>
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
                      {t('notif_city_only_hint', language)}
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_lbl_title', language)} *</label>
                <input
                  type="text"
                  className={`${inputClass} w-full`}
                  value={notifForm.title}
                  onChange={e => setNotifForm(p => ({ ...p, title: e.target.value }))}
                  required
                  placeholder={t('notif_title_placeholder', language)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('notif_lbl_message', language)} *</label>
                <textarea
                  className={`${inputClass} w-full resize-none`}
                  rows={4}
                  value={notifForm.message}
                  onChange={e => setNotifForm(p => ({ ...p, message: e.target.value }))}
                  required
                  placeholder={t('notif_msg_placeholder', language)}
                />
              </div>
              {notifError && <p className="text-red-500 dark:text-red-400 text-xs">{notifError}</p>}
              {notifSuccess && <p className="text-green-600 dark:text-green-400 text-xs font-medium">{notifSuccess}</p>}
              <button
                type="submit"
                disabled={notifLoading}
                className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 transition disabled:opacity-60"
              >
                {notifLoading ? '...' : t('notif_send_btn', language)}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADMINS TAB */}
      {activeTab === 'admins' && isGlobal && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('tab_admins', language)}</h3>
            <button
              onClick={() => { setShowAddAdmin(true); setAdminFormError('') }}
              className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition"
            >
              {t('admin_add', language)}
            </button>
          </div>

          {adminFormSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">
              {adminFormSuccess}
            </div>
          )}

          {showAddAdmin && (
            <form onSubmit={handleAddAdmin} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4 space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('admin_new', language)}</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_name', language)} *</label>
                  <input type="text" className={`${inputClass} w-full`} value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_email', language)} *</label>
                  <input type="email" className={`${inputClass} w-full`} value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_role', language)} *</label>
                  <select className={`${inputClass} w-full`} value={adminForm.role} onChange={e => setAdminForm(p => ({ ...p, role: e.target.value, city_id: '' }))}>
                    <option value="CITY">{t('admin_type_city', language)}</option>
                    <option value="GLOBAL">{t('admin_type_global', language)}</option>
                  </select>
                </div>
                {adminForm.role === 'CITY' && (
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_province', language)} *</label>
                    <select className={`${inputClass} w-full`} value={adminForm.city_id} onChange={e => setAdminForm(p => ({ ...p, city_id: e.target.value }))}>
                      <option value="">{t('select_province', language)}</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_phone', language)}</label>
                  <input type="text" className={`${inputClass} w-full`} value={adminForm.phone} onChange={e => setAdminForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_password', language)} *</label>
                  <input type="password" className={`${inputClass} w-full`} value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">{t('pw_requirement_hint', language)}</p>
                </div>
              </div>
              {adminFormError && <p className="text-red-500 dark:text-red-400 text-xs">{adminFormError}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={adminFormLoading} className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl disabled:opacity-60 hover:opacity-90 transition">
                  {adminFormLoading ? '...' : t('btn_save', language)}
                </button>
                <button type="button" onClick={() => { setShowAddAdmin(false); setAdminFormError('') }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">
                  {t('btn_nevermind', language)}
                </button>
              </div>
            </form>
          )}

          <input
            type="text"
            placeholder={t('admin_search_placeholder', language)}
            className={`${inputClass} w-full mb-3`}
            value={adminSearch}
            onChange={e => setAdminSearch(e.target.value)}
          />

          {filteredAdmins.length === 0 ? (
            <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              {t('no_admins', language)}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAdmins.map(admin => {
                const city = cities.find(c => String(c.id) === String(admin.city_id))
                const isSelf = admin.id === loggedInAdmin?.id
                return (
                  <div key={admin.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#1565C0] dark:text-[#7DD4FC] font-bold text-sm">
                          {(admin.name || admin.email || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{admin.name || admin.email}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${admin.role === 'GLOBAL' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                            {admin.role === 'GLOBAL' ? t('admin_type_global', language) : t('admin_type_city', language)}
                          </span>
                          {isSelf && <span className="text-[10px] text-gray-400 dark:text-gray-500">{language === 'TR' ? '(siz)' : '(you)'}</span>}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{admin.email}</p>
                        {city && <p className="text-xs text-gray-400 dark:text-gray-500">{city.name}</p>}
                        {admin.phone && <p className="text-xs text-gray-400 dark:text-gray-500">{admin.phone}</p>}
                      </div>
                      {!isSelf && (
                        <div className="flex gap-1 flex-shrink-0">
                          <button
                            onClick={() => setEditAdminModal({ adminId: admin.id, name: admin.name || admin.email, role: admin.role, city_id: admin.city_id ? String(admin.city_id) : '' })}
                            className="text-[#1565C0] dark:text-[#7DD4FC] text-xs px-2 py-1.5 hover:bg-[#1565C0]/10 rounded-lg transition"
                            title={language === 'TR' ? 'Rol / İl Düzenle' : 'Edit Role / Province'}
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => { setResetAdminPwModal({ adminId: admin.id, email: admin.email, name: admin.name || admin.email }); setResetAdminPwValue(''); setResetAdminPwError(''); setResetAdminPwSuccess('') }}
                            className="text-[#1565C0] dark:text-[#7DD4FC] text-xs px-2 py-1.5 hover:bg-[#1565C0]/10 rounded-lg transition"
                            title={t('btn_reset_password', language)}
                          >
                            🔑
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin.id)}
                            disabled={processingId === admin.id}
                            className="text-red-500 hover:text-red-700 text-xs p-1.5 disabled:opacity-40"
                          >
                            🗑
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Reset Admin Password Modal */}
      {resetAdminPwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">{t('reset_pw_title', language)}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">{resetAdminPwModal.name} — {resetAdminPwModal.email}</p>
            <form onSubmit={handleResetAdminPassword} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('new_password', language)} *</label>
                <input
                  type="password"
                  className={inputClass}
                  value={resetAdminPwValue}
                  onChange={e => setResetAdminPwValue(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">{t('pw_requirement_hint', language)}</p>
              </div>
              {resetAdminPwError && <p className="text-red-600 dark:text-red-400 text-xs">{resetAdminPwError}</p>}
              {resetAdminPwSuccess && <p className="text-green-600 dark:text-green-400 text-xs font-medium">{resetAdminPwSuccess}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={resetAdminPwLoading || !!resetAdminPwSuccess} className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60">
                  {resetAdminPwLoading ? '...' : t('btn_reset_password', language)}
                </button>
                <button type="button" onClick={() => { setResetAdminPwModal(null); setResetAdminPwValue(''); setResetAdminPwError(''); setResetAdminPwSuccess('') }} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  {t('btn_nevermind', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">
              {t('reset_pw_title', language)}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">
              {resetPwModal.userName} — {resetPwModal.email}
            </p>
            <form onSubmit={handleResetUserPassword} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('new_password', language)} *</label>
                <input
                  type="password"
                  className={inputClass}
                  value={resetPwValue}
                  onChange={e => setResetPwValue(e.target.value)}
                  required
                  minLength={8}
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">{t('pw_requirement_hint', language)}</p>
              </div>
              {resetPwError && <p className="text-red-600 dark:text-red-400 text-xs">{resetPwError}</p>}
              {resetPwSuccess && <p className="text-green-600 dark:text-green-400 text-xs font-medium">{resetPwSuccess}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={resetPwLoading || !!resetPwSuccess}
                  className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60"
                >
                  {resetPwLoading ? '...' : t('btn_reset_password', language)}
                </button>
                <button
                  type="button"
                  onClick={() => { setResetPwModal(null); setResetPwValue(''); setResetPwError(''); setResetPwSuccess('') }}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  {t('btn_nevermind', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Admin Role/City Modal */}
      {editAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">
              {language === 'TR' ? 'Rol / İl Düzenle' : 'Edit Role / Province'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">{editAdminModal.name}</p>
            <form onSubmit={handleEditAdmin} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_role', language)}</label>
                <select
                  className={`${inputClass} w-full`}
                  value={editAdminModal.role}
                  onChange={e => setEditAdminModal(p => ({ ...p, role: e.target.value, city_id: '' }))}
                >
                  <option value="CITY">{t('admin_type_city', language)}</option>
                  <option value="GLOBAL">{t('admin_type_global', language)}</option>
                </select>
              </div>
              {editAdminModal.role === 'CITY' && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_province', language)}</label>
                  <select
                    className={`${inputClass} w-full`}
                    value={editAdminModal.city_id}
                    onChange={e => setEditAdminModal(p => ({ ...p, city_id: e.target.value }))}
                    required
                  >
                    <option value="">{t('select_province', language)}</option>
                    {cities.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {editAdminError && <p className="text-red-600 dark:text-red-400 text-xs">{editAdminError}</p>}
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={editAdminLoading}
                  className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60"
                >
                  {editAdminLoading ? '...' : t('btn_save', language)}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditAdminModal(null); setEditAdminError('') }}
                  className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  {t('btn_nevermind', language)}
                </button>
              </div>
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
                {t('btn_yes', language)}
              </button>
              <button
                onClick={() => setConfirmModal(null)}
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

function LabFormFields({ form, setForm, cities, inputClass, language, showCity }) {
  return (
    <>
      {showCity && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">{t('province_label_req', language)} *</label>
          <select className={`${inputClass} w-full`} value={form.city_id || ''} onChange={e => setForm(p => ({ ...p, city_id: e.target.value }))} required>
            <option value="">{t('select_province', language)}</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('studio_name_label_req', language)} *</label>
        <input type="text" className={`${inputClass} w-full`} value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('lbl_description', language)}</label>
        <input type="text" className={`${inputClass} w-full`} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('lbl_location', language)}</label>
        <input type="text" className={`${inputClass} w-full`} value={form.location || ''} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('lbl_branches', language)}</label>
        <input type="text" className={`${inputClass} w-full`} value={form.branches || ''} onChange={e => setForm(p => ({ ...p, branches: e.target.value }))} placeholder={t('lbl_branches_placeholder', language)} />
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">{t('lbl_capacity_slot', language)}</label>
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
        {processingId === slot.id ? '...' : t('btn_delete', language)}
      </button>
    </div>
  )
}

function UserCard({ user, language, processingId, onApprove, onRevoke, onResetPassword, showApprove, showRevoke }) {
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
        {user.branch && <span><span className="font-medium">{t('lbl_branch', language)}:</span> {user.branch}</span>}
        {user.phone && <span><span className="font-medium">{t('lbl_phone', language)}:</span> {user.phone}</span>}
        {user.city_name && <span><span className="font-medium">{t('lbl_province', language)}:</span> {user.city_name}</span>}
        {user.district && <span><span className="font-medium">{t('lbl_district', language)}:</span> {user.district}</span>}
        {user.work_location && <span className="col-span-2"><span className="font-medium">{t('lbl_institution', language)}:</span> {user.work_location}</span>}
      </div>
      <div className="flex gap-2">
        {showApprove && (
          <button onClick={() => onApprove(user.id)} disabled={processingId === user.id} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
            {processingId === user.id ? '...' : t('btn_approve_member', language)}
          </button>
        )}
        {showRevoke && (
          <button onClick={() => onRevoke(user.id)} disabled={processingId === user.id} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition disabled:opacity-60">
            {processingId === user.id ? '...' : t('btn_revoke_member', language)}
          </button>
        )}
        <button
          onClick={onResetPassword}
          className="flex-1 py-2 border border-[#1565C0]/50 dark:border-[#7DD4FC]/50 text-[#1565C0] dark:text-[#7DD4FC] text-xs font-semibold rounded-xl hover:bg-[#1565C0]/5 dark:hover:bg-[#7DD4FC]/5 transition"
        >
          {t('btn_reset_password', language)}
        </button>
      </div>
    </div>
  )
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

// SHA-256 via Web Crypto API
async function hashPassword(password, salt = '') {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(salt + password + 'lab_rezervasyon_2024')
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return password
  }
}

function loadFromStorage(key) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

const RATE_LIMIT_KEY = 'rl_attempts'

function loadRateLimits() {
  try { return JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{}') } catch { return {} }
}
function saveRateLimits(data) {
  try { localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data)) } catch {}
}

function checkRateLimit(email) {
  const now = Date.now()
  const entry = loadRateLimits()[email]
  if (entry && entry.lockUntil > now) {
    return { locked: true, secs: Math.ceil((entry.lockUntil - now) / 1000) }
  }
  return { locked: false }
}

function recordFailedAttempt(email) {
  const all = loadRateLimits()
  if (!all[email]) all[email] = { count: 0, lockUntil: 0 }
  all[email].count++
  if (all[email].count >= 5) {
    all[email].lockUntil = Date.now() + 60000
    // count stays at 5 — next attempt re-locks immediately
  }
  saveRateLimits(all)
}

function clearAttempts(email) {
  const all = loadRateLimits()
  delete all[email]
  saveRateLimits(all)
}

export function AppProvider({ children }) {
  const [loggedInUser, setLoggedInUser] = useState(() => loadFromStorage('session_user'))
  const [loggedInAdmin, setLoggedInAdmin] = useState(() => loadFromStorage('session_admin'))
  const [language, setLanguage] = useState(() => loadFromStorage('app_language') || 'TR')
  const [isDarkMode, setIsDarkMode] = useState(() => loadFromStorage('app_dark_mode') || false)

  const [cities, setCities] = useState([])
  const [labs, setLabs] = useState([])
  const [appointments, setAppointments] = useState([])
  const [notifications, setNotifications] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const rtChannelsRef = React.useRef([])

  // Persist session & preferences
  useEffect(() => {
    if (loggedInUser) localStorage.setItem('session_user', JSON.stringify(loggedInUser))
    else localStorage.removeItem('session_user')
  }, [loggedInUser])

  useEffect(() => {
    if (loggedInAdmin) localStorage.setItem('session_admin', JSON.stringify(loggedInAdmin))
    else localStorage.removeItem('session_admin')
  }, [loggedInAdmin])

  useEffect(() => { localStorage.setItem('app_language', JSON.stringify(language)) }, [language])

  useEffect(() => {
    localStorage.setItem('app_dark_mode', JSON.stringify(isDarkMode))
    if (isDarkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDarkMode])

  const loadAllData = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true)
    try {
      const [
        { data: citiesData },
        { data: labsData },
        { data: appointmentsData },
        { data: notificationsData },
        { data: timeSlotsData },
        { data: usersData },
      ] = await Promise.all([
        supabase.from('cities').select('*').order('name'),
        supabase.from('laboratories').select('*').order('name'),
        supabase.from('appointments').select('*').order('created_timestamp', { ascending: false }),
        supabase.from('notifications').select('*').order('timestamp', { ascending: false }),
        supabase.from('city_time_slots').select('*').order('id'),
        supabase.from('users').select('*').order('name'),
      ])
      if (citiesData) setCities(citiesData)
      if (labsData) setLabs(labsData)
      if (appointmentsData) setAppointments(appointmentsData)
      if (notificationsData) setNotifications(notificationsData)
      if (timeSlotsData) setTimeSlots(timeSlotsData)
      if (usersData) setUsers(usersData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])

  useEffect(() => {
    const interval = setInterval(() => { loadAllData(false) }, 30000)
    return () => clearInterval(interval)
  }, [loadAllData])

  useEffect(() => {
    const apptChannel = supabase
      .channel('rt-appointments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'INSERT') setAppointments(prev => prev.find(a => a.id === n.id) ? prev : [n, ...prev])
        else if (eventType === 'UPDATE') setAppointments(prev => prev.map(a => a.id === n.id ? n : a))
        else if (eventType === 'DELETE') setAppointments(prev => prev.filter(a => a.id !== o.id))
      })
      .subscribe()

    const notifChannel = supabase
      .channel('rt-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'INSERT') setNotifications(prev => prev.find(x => x.id === n.id) ? prev : [n, ...prev])
        else if (eventType === 'UPDATE') setNotifications(prev => prev.map(x => x.id === n.id ? n : x))
        else if (eventType === 'DELETE') setNotifications(prev => prev.filter(x => x.id !== o.id))
      })
      .subscribe()

    rtChannelsRef.current = [apptChannel, notifChannel]
    return () => {
      supabase.removeChannel(apptChannel)
      supabase.removeChannel(notifChannel)
      rtChannelsRef.current = []
    }
  }, [])

  // AUTH ACTIONS
  const loginUser = async (email, password) => {
    const rl = checkRateLimit(email)
    if (rl.locked) return { success: false, error: 'err_rate_limited', secs: rl.secs }

    const { data, error } = await supabase
      .from('users').select('*').eq('email', email).single()

    if (error || !data) {
      recordFailedAttempt(email)
      return { success: false, error: 'err_user_not_found' }
    }

    const hashed = await hashPassword(password, email)
    if (data.password_hash !== hashed) {
      recordFailedAttempt(email)
      return { success: false, error: 'err_user_not_found' }
    }

    if (!data.is_approved) return { success: false, error: 'err_not_approved' }

    clearAttempts(email)
    setLoggedInUser(data)
    return { success: true }
  }

  const loginAdmin = async (email, password) => {
    const rl = checkRateLimit(email)
    if (rl.locked) return { success: false, error: 'err_rate_limited', secs: rl.secs }

    const { data, error } = await supabase
      .from('admins').select('*').eq('email', email).single()

    if (error || !data) {
      recordFailedAttempt(email)
      return { success: false, error: 'err_user_not_found' }
    }

    const hashed = await hashPassword(password, email)
    if (!data.password_hash || data.password_hash !== hashed) {
      recordFailedAttempt(email)
      return { success: false, error: 'err_user_not_found' }
    }

    clearAttempts(email)
    setLoggedInAdmin(data)
    return { success: true }
  }

  const registerUser = async (formData) => {
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', formData.email).maybeSingle()
    if (existing) return { success: false, error: 'err_email_exists' }

    const hashed = await hashPassword(formData.password, formData.email)
    const { error } = await supabase.from('users').insert([{
      name: formData.name,
      surname: formData.surname,
      email: formData.email,
      password_hash: hashed,
      branch: formData.branch,
      work_location: formData.work_location,
      phone: formData.phone,
      city_id: formData.city_id,
      city_name: formData.city_name,
      district: formData.district,
      is_approved: false,
    }])
    if (error) return { success: false, error: error.message }

    await supabase.from('notifications').insert([{
      title: `[${formData.city_name}] ${language === 'TR' ? 'Yeni Üye Başvurusu' : 'New Member Request'}`,
      message: `${formData.name} ${formData.surname} (${formData.email}) kayıt talebinde bulundu.`,
      type: 'SYSTEM',
      timestamp: Date.now(),
      is_read: false,
    }])
    return { success: true }
  }

  const findUserForReset = async (email) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, surname, email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()
    if (error || !data) return { success: false, error: 'err_user_not_registered' }
    return { success: true, data }
  }

  const resetPassword = async (userId, email, newPassword) => {
    const hashed = await hashPassword(newPassword, email)
    const { error } = await supabase.from('users').update({ password_hash: hashed }).eq('id', userId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  const changeAdminPassword = async (adminId, email, currentPassword, newPassword) => {
    const { data } = await supabase.from('admins').select('password_hash').eq('id', adminId).single()
    if (!data) return { success: false, error: 'err_user_not_found' }

    const currentHashed = await hashPassword(currentPassword, email)
    if (!data.password_hash || data.password_hash !== currentHashed) return { success: false, error: 'err_current_password_wrong' }

    const newHashed = await hashPassword(newPassword, email)
    const { error } = await supabase.from('admins').update({ password_hash: newHashed }).eq('id', adminId)
    if (error) return { success: false, error: error.message }
    setLoggedInAdmin(prev => ({ ...prev, password_hash: newHashed }))
    return { success: true }
  }

  const changePassword = async (userId, email, currentPassword, newPassword) => {
    const { data } = await supabase.from('users').select('password_hash').eq('id', userId).single()
    if (!data) return { success: false, error: 'err_user_not_found' }

    const currentHashed = await hashPassword(currentPassword, email)
    if (!data.password_hash || data.password_hash !== currentHashed) return { success: false, error: 'err_current_password_wrong' }

    const newHashed = await hashPassword(newPassword, email)
    const { error } = await supabase.from('users').update({ password_hash: newHashed }).eq('id', userId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  const updateUserProfile = async (userId, updates) => {
    const { error } = await supabase.from('users').update(updates).eq('id', userId)
    if (error) return { success: false, error: error.message }
    setLoggedInUser(prev => ({ ...prev, ...updates }))
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u))
    return { success: true }
  }

  const logout = () => {
    rtChannelsRef.current.forEach(ch => supabase.removeChannel(ch))
    rtChannelsRef.current = []
    setLoggedInUser(null)
    setLoggedInAdmin(null)
  }

  const toggleLanguage = () => setLanguage(prev => prev === 'TR' ? 'EN' : 'TR')
  const toggleDarkMode = () => setIsDarkMode(prev => !prev)

  // APPOINTMENT ACTIONS
  const submitAppointment = async (appointmentData) => {
    // Prevent duplicate: same user + lab + date + slot already PENDING or APPROVED
    const duplicate = appointments.find(a =>
      a.user_email === appointmentData.user_email &&
      String(a.lab_id) === String(appointmentData.lab_id) &&
      a.date === appointmentData.date &&
      a.time_slot === appointmentData.time_slot &&
      (a.status === 'PENDING' || a.status === 'APPROVED')
    )
    if (duplicate) return { success: false, error: 'err_duplicate_appointment' }

    const { data, error } = await supabase
      .from('appointments')
      .insert([{
        ...appointmentData,
        status: 'PENDING',
        automations_applied: false,
        created_timestamp: Date.now(),
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return { success: false, error: 'err_duplicate_appointment' }
      return { success: false, error: error.message }
    }
    setAppointments(prev => [data, ...prev])
    return { success: true, data }
  }

  const markAppointmentCompleted = async (id) => {
    const { error } = await supabase.from('appointments').update({ status: 'COMPLETED' }).eq('id', id)
    if (error) return { success: false, error: error.message }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'COMPLETED' } : a))
    return { success: true }
  }

  const approveAppointment = async (id) => {
    const { error } = await supabase.from('appointments').update({ status: 'APPROVED' }).eq('id', id)
    if (error) return { success: false, error: error.message }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'APPROVED' } : a))
    return { success: true }
  }

  const cancelAppointment = async (id) => {
    const { error } = await supabase.from('appointments').update({ status: 'CANCELLED' }).eq('id', id)
    if (error) return { success: false, error: error.message }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a))
    return { success: true }
  }

  const submitCancellationRequest = async (id, note) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'CANCELLATION_REQUESTED', note: note || '' })
      .eq('id', id)
    if (error) return { success: false, error: error.message }
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'CANCELLATION_REQUESTED', note: note || '' } : a
    ))
    return { success: true }
  }

  // USER APPROVAL ACTIONS
  const approveUser = async (userId) => {
    const { error } = await supabase.from('users').update({ is_approved: true }).eq('id', userId)
    if (error) return { success: false, error: error.message }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u))
    return { success: true }
  }

  const revokeUser = async (userId) => {
    const { error } = await supabase.from('users').update({ is_approved: false }).eq('id', userId)
    if (error) return { success: false, error: error.message }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: false } : u))
    return { success: true }
  }

  // NOTIFICATION ACTIONS
  const markNotificationsRead = async (ids) => {
    if (!ids || ids.length === 0) return
    await supabase.from('notifications').update({ is_read: true }).in('id', ids)
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n))
  }

  const clearNotifications = async (cityName = null) => {
    let query = supabase.from('notifications').delete()
    if (cityName) {
      query = query.or(`title.ilike.%${cityName}%,message.ilike.%${cityName}%`)
    } else {
      query = query.neq('id', 0)
    }
    const { error } = await query
    if (error) return { success: false, error: error.message }
    if (cityName) {
      setNotifications(prev => prev.filter(n =>
        !(n.title || '').includes(cityName) && !(n.message || '').includes(cityName)
      ))
    } else {
      setNotifications([])
    }
    return { success: true }
  }

  const createNotification = async ({ title, message, type }) => {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ title, message, type, timestamp: Date.now(), is_read: false }])
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    setNotifications(prev => [data, ...prev])
    return { success: true }
  }

  // TIME SLOT ACTIONS
  const addTimeSlot = async (cityId, timeRange) => {
    const { data, error } = await supabase
      .from('city_time_slots')
      .insert([{ city_id: cityId, time_range: timeRange }])
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    setTimeSlots(prev => [...prev, data])
    return { success: true }
  }

  const removeTimeSlot = async (id) => {
    const slot = timeSlots.find(s => s.id === id)
    if (slot) {
      const hasActive = appointments.some(a =>
        String(a.city_id) === String(slot.city_id) &&
        a.time_slot === slot.time_range &&
        (a.status === 'PENDING' || a.status === 'APPROVED')
      )
      if (hasActive) return { success: false, error: 'err_slot_has_appointments' }
    }
    const { error } = await supabase.from('city_time_slots').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    setTimeSlots(prev => prev.filter(s => s.id !== id))
    return { success: true }
  }

  // LAB ACTIONS
  const addLab = async (labData) => {
    const { data, error } = await supabase.from('laboratories').insert([labData]).select().single()
    if (error) return { success: false, error: error.message }
    setLabs(prev => [...prev, data])
    return { success: true }
  }

  const updateLab = async (id, updates) => {
    const { error } = await supabase.from('laboratories').update(updates).eq('id', id)
    if (error) return { success: false, error: error.message }
    setLabs(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    return { success: true }
  }

  const deleteLab = async (id) => {
    const hasActive = appointments.some(a =>
      String(a.lab_id) === String(id) &&
      (a.status === 'PENDING' || a.status === 'APPROVED')
    )
    if (hasActive) return { success: false, error: 'err_lab_has_appointments' }

    const { error } = await supabase.from('laboratories').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    setLabs(prev => prev.filter(l => l.id !== id))
    return { success: true }
  }

  const value = {
    loggedInUser, loggedInAdmin,
    language, isDarkMode,
    cities, labs, appointments, notifications, timeSlots, users,
    loading,
    loadAllData,
    loginUser, loginAdmin, registerUser, findUserForReset, resetPassword, updateUserProfile, changePassword, changeAdminPassword, logout,
    toggleLanguage, toggleDarkMode,
    submitAppointment, approveAppointment, cancelAppointment, submitCancellationRequest, markAppointmentCompleted,
    approveUser, revokeUser,
    markNotificationsRead, clearNotifications, createNotification,
    addTimeSlot, removeTimeSlot,
    addLab, updateLab, deleteLab,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

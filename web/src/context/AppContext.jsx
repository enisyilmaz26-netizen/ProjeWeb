import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

// SHA-256 via Web Crypto API — no extra dependency needed
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

export function AppProvider({ children }) {
  const [loggedInUser, setLoggedInUser] = useState(() => loadFromStorage('session_user'))
  const [loggedInAdmin, setLoggedInAdmin] = useState(() => loadFromStorage('session_admin'))
  const [language, setLanguage] = useState(() => loadFromStorage('app_language') || 'TR')
  const [isDarkMode, setIsDarkMode] = useState(() => loadFromStorage('app_dark_mode') || false)

  const [cities, setCities] = useState([])
  const [labs, setLabs] = useState([])
  const [appointments, setAppointments] = useState([])
  const [admins, setAdmins] = useState([])
  const [notifications, setNotifications] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  // Persist session & preferences
  useEffect(() => {
    if (loggedInUser) localStorage.setItem('session_user', JSON.stringify(loggedInUser))
    else localStorage.removeItem('session_user')
  }, [loggedInUser])

  useEffect(() => {
    if (loggedInAdmin) localStorage.setItem('session_admin', JSON.stringify(loggedInAdmin))
    else localStorage.removeItem('session_admin')
  }, [loggedInAdmin])

  useEffect(() => {
    localStorage.setItem('app_language', JSON.stringify(language))
  }, [language])

  useEffect(() => {
    localStorage.setItem('app_dark_mode', JSON.stringify(isDarkMode))
    if (isDarkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDarkMode])

  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { data: citiesData },
        { data: labsData },
        { data: appointmentsData },
        { data: adminsData },
        { data: notificationsData },
        { data: timeSlotsData },
        { data: usersData },
      ] = await Promise.all([
        supabase.from('cities').select('*').order('name'),
        supabase.from('laboratories').select('*').order('name'),
        supabase.from('appointments').select('*').order('created_timestamp', { ascending: false }),
        supabase.from('admins').select('*'),
        supabase.from('notifications').select('*').order('timestamp', { ascending: false }),
        supabase.from('city_time_slots').select('*').order('id'),
        supabase.from('users').select('*').order('name'),
      ])
      if (citiesData) setCities(citiesData)
      if (labsData) setLabs(labsData)
      if (appointmentsData) setAppointments(appointmentsData)
      if (adminsData) setAdmins(adminsData)
      if (notificationsData) setNotifications(notificationsData)
      if (timeSlotsData) setTimeSlots(timeSlotsData)
      if (usersData) setUsers(usersData)
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])

  useEffect(() => {
    const interval = setInterval(() => { loadAllData() }, 30000)
    return () => clearInterval(interval)
  }, [loadAllData])

  // AUTH ACTIONS
  const loginUser = async (email, password) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) return { success: false, error: 'err_user_not_found' }

    const hashed = await hashPassword(password, email)
    const isHashMatch = data.password_hash === hashed
    const isPlainMatch = !isHashMatch && data.password_hash === password

    if (!isHashMatch && !isPlainMatch) return { success: false, error: 'err_user_not_found' }

    // Silently upgrade plain-text passwords to hashed on successful login
    if (isPlainMatch) {
      await supabase.from('users').update({ password_hash: hashed }).eq('id', data.id)
      data.password_hash = hashed
    }

    if (!data.is_approved) return { success: false, error: 'err_not_approved' }

    setLoggedInUser(data)
    return { success: true }
  }

  const loginAdmin = async (email, password) => {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) return { success: false, error: 'err_user_not_found' }

    const hashed = await hashPassword(password, email)

    let passwordOk = false
    if (data.password_hash) {
      // Admin has a stored hash — compare with hash (or plain-text for backward compat)
      passwordOk = data.password_hash === hashed || data.password_hash === password
      // Silently upgrade plain-text admin password to hash
      if (data.password_hash === password) {
        await supabase.from('admins').update({ password_hash: hashed }).eq('id', data.id)
      }
    } else {
      // Legacy: no password_hash column on admin — accept hardcoded default
      passwordOk = password === 'admin123'
    }

    if (!passwordOk) return { success: false, error: 'err_user_not_found' }

    setLoggedInAdmin(data)
    return { success: true }
  }

  const registerUser = async (formData) => {
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', formData.email)
      .maybeSingle()

    if (existing) return { success: false, error: 'err_email_exists' }

    const hashed = await hashPassword(formData.password, formData.email)

    const { error } = await supabase
      .from('users')
      .insert([{
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
    return { success: true }
  }

  const findUserForReset = async (name, surname, email) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, surname, email')
      .eq('email', email)
      .ilike('name', name.trim())
      .ilike('surname', surname.trim())
      .maybeSingle()

    if (error || !data) return { success: false, error: 'err_user_not_registered' }
    return { success: true, data }
  }

  const resetPassword = async (userId, email, newPassword) => {
    const hashed = await hashPassword(newPassword, email)
    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashed })
      .eq('id', userId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  }

  const logout = () => {
    setLoggedInUser(null)
    setLoggedInAdmin(null)
  }

  const toggleLanguage = () => setLanguage(prev => prev === 'TR' ? 'EN' : 'TR')
  const toggleDarkMode = () => setIsDarkMode(prev => !prev)

  // APPOINTMENT ACTIONS
  const submitAppointment = async (appointmentData) => {
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

    if (error) return { success: false, error: error.message }
    setAppointments(prev => [data, ...prev])
    return { success: true, data }
  }

  const approveAppointment = async (id) => {
    const { error } = await supabase
      .from('appointments').update({ status: 'APPROVED' }).eq('id', id)
    if (error) return { success: false, error: error.message }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'APPROVED' } : a))
    return { success: true }
  }

  const cancelAppointment = async (id) => {
    const { error } = await supabase
      .from('appointments').update({ status: 'CANCELLED' }).eq('id', id)
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
      // City admins only delete notifications that mention their city
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
    const { error } = await supabase.from('city_time_slots').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    setTimeSlots(prev => prev.filter(s => s.id !== id))
    return { success: true }
  }

  // LAB ACTIONS (GLOBAL admin)
  const addLab = async (labData) => {
    const { data, error } = await supabase.from('laboratories').insert([labData]).select().single()
    if (error) return { success: false, error: error.message }
    setLabs(prev => [...prev, data])
    return { success: true }
  }

  const deleteLab = async (id) => {
    const { error } = await supabase.from('laboratories').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    setLabs(prev => prev.filter(l => l.id !== id))
    return { success: true }
  }

  const value = {
    loggedInUser, loggedInAdmin,
    language, isDarkMode,
    cities, labs, appointments, admins, notifications, timeSlots, users,
    loading,
    loadAllData,
    loginUser, loginAdmin, registerUser, findUserForReset, resetPassword, logout,
    toggleLanguage, toggleDarkMode,
    submitAppointment, approveAppointment, cancelAppointment, submitCancellationRequest,
    approveUser, revokeUser,
    markNotificationsRead, clearNotifications,
    addTimeSlot, removeTimeSlot,
    addLab, deleteLab,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [loggedInUser, setLoggedInUser] = useState(null)
  const [loggedInAdmin, setLoggedInAdmin] = useState(null)
  const [language, setLanguage] = useState('TR')
  const [isDarkMode, setIsDarkMode] = useState(false)

  const [cities, setCities] = useState([])
  const [labs, setLabs] = useState([])
  const [appointments, setAppointments] = useState([])
  const [admins, setAdmins] = useState([])
  const [notifications, setNotifications] = useState([])
  const [timeSlots, setTimeSlots] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  // Apply dark mode to html element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
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

  // Initial load
  useEffect(() => {
    loadAllData()
  }, [loadAllData])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllData()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadAllData])

  // AUTH ACTIONS
  const loginUser = async (email, password) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      return { success: false, error: 'err_user_not_found' }
    }
    if (data.password_hash !== password) {
      return { success: false, error: 'err_user_not_found' }
    }
    if (!data.is_approved) {
      return { success: false, error: 'err_not_approved' }
    }
    setLoggedInUser(data)
    return { success: true }
  }

  const loginAdmin = async (email, password) => {
    if (password !== 'admin123') {
      return { success: false, error: 'err_user_not_found' }
    }
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) {
      return { success: false, error: 'err_user_not_found' }
    }
    setLoggedInAdmin(data)
    return { success: true }
  }

  const registerUser = async (formData) => {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: formData.name,
        surname: formData.surname,
        email: formData.email,
        password_hash: formData.password,
        branch: formData.branch,
        work_location: formData.work_location,
        phone: formData.phone,
        city_id: formData.city_id,
        city_name: formData.city_name,
        district: formData.district,
        is_approved: false,
      }])
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  }

  const logout = () => {
    setLoggedInUser(null)
    setLoggedInAdmin(null)
  }

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'TR' ? 'EN' : 'TR')
  }

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev)
  }

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

    if (error) {
      return { success: false, error: error.message }
    }
    setAppointments(prev => [data, ...prev])
    return { success: true, data }
  }

  const approveAppointment = async (id) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'APPROVED' })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'APPROVED' } : a))
    return { success: true }
  }

  const cancelAppointment = async (id) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'CANCELLED' })
      .eq('id', id)

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
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLATION_REQUESTED', note: note || '' } : a))
    return { success: true }
  }

  // USER APPROVAL ACTIONS
  const approveUser = async (userId) => {
    const { error } = await supabase
      .from('users')
      .update({ is_approved: true })
      .eq('id', userId)

    if (error) return { success: false, error: error.message }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u))
    return { success: true }
  }

  const revokeUser = async (userId) => {
    const { error } = await supabase
      .from('users')
      .update({ is_approved: false })
      .eq('id', userId)

    if (error) return { success: false, error: error.message }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: false } : u))
    return { success: true }
  }

  // NOTIFICATION ACTIONS
  const clearNotifications = async () => {
    const { error } = await supabase.from('notifications').delete().neq('id', 0)
    if (error) return { success: false, error: error.message }
    setNotifications([])
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
    const { data, error } = await supabase
      .from('laboratories')
      .insert([labData])
      .select()
      .single()

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
    loginUser, loginAdmin, registerUser, logout,
    toggleLanguage, toggleDarkMode,
    submitAppointment, approveAppointment, cancelAppointment, submitCancellationRequest,
    approveUser, revokeUser,
    clearNotifications,
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

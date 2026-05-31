import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'
import { t } from '../lib/languages'

export const AuthContext = createContext(null)

function loadFromStorage(key) {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : null
  } catch {
    return null
  }
}

const RATE_LIMIT_KEY = 'rl_attempts'
const IDLE_WARN_MS = 25 * 60 * 1000

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
  }
  saveRateLimits(all)
}

function clearAttempts(email) {
  const all = loadRateLimits()
  delete all[email]
  saveRateLimits(all)
}

export function generateTempPassword() {
  const pool = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
  let raw = 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 22)]
          + 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 22)]
          + '23456789'[Math.floor(Math.random() * 8)]
          + '!@#$%'[Math.floor(Math.random() * 5)]
  for (let i = 0; i < 4; i++) raw += pool[Math.floor(Math.random() * pool.length)]
  return raw.split('').sort(() => Math.random() - 0.5).join('')
}

export function AuthProvider({ children }) {
  const [loggedInUser, setLoggedInUser] = useState(() => loadFromStorage('session_user'))
  const [loggedInAdmin, setLoggedInAdmin] = useState(() => loadFromStorage('session_admin'))
  const [language, setLanguage] = useState(() => loadFromStorage('app_language') || 'TR')
  const [isDarkMode, setIsDarkMode] = useState(() => loadFromStorage('app_dark_mode') || false)
  const [idleWarning, setIdleWarning] = useState(false)
  const idleWarnRef = useRef(null)
  const isLoggedInRef = useRef(false)

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

  useEffect(() => {
    isLoggedInRef.current = !!(loggedInUser || loggedInAdmin)
  }, [loggedInUser, loggedInAdmin])

  const resetIdleTimer = useCallback(() => {
    if (!isLoggedInRef.current) return
    clearTimeout(idleWarnRef.current)
    setIdleWarning(false)
    idleWarnRef.current = setTimeout(() => { setIdleWarning(true) }, IDLE_WARN_MS)
  }, [])

  const dismissIdleWarning = useCallback(() => {
    setIdleWarning(false)
    resetIdleTimer()
  }, [resetIdleTimer])

  useEffect(() => {
    if (!loggedInUser && !loggedInAdmin) {
      clearTimeout(idleWarnRef.current)
      setIdleWarning(false)
      return
    }
    resetIdleTimer()
    const events = ['mousedown', 'keydown', 'touchstart', 'wheel', 'click']
    events.forEach(ev => document.addEventListener(ev, resetIdleTimer, { passive: true }))
    return () => {
      clearTimeout(idleWarnRef.current)
      events.forEach(ev => document.removeEventListener(ev, resetIdleTimer))
    }
  }, [loggedInUser, loggedInAdmin, resetIdleTimer])

  const loginUser = async (email, password) => {
    const rl = checkRateLimit(email)
    if (rl.locked) return { success: false, error: 'err_rate_limited', secs: rl.secs }

    const { data, error } = await supabase.rpc('login_user', { p_email: email, p_password: password })

    if (error || !data || data.length === 0) {
      const normalizedEmail = email.trim().toLowerCase()
      const { data: userExists } = await supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle()
      if (!userExists) return { success: false, error: 'err_email_not_found' }
      const { data: adminExists } = await supabase.from('admins').select('id').eq('email', normalizedEmail).maybeSingle()
      if (adminExists) return { success: false, error: 'err_email_not_found' }
      recordFailedAttempt(email)
      return { success: false, error: 'err_user_not_found' }
    }

    const user = data[0]
    if (!user.is_approved) return { success: false, error: 'err_not_approved' }

    clearAttempts(email)
    const { data: extraFields } = await supabase.from('users').select('must_change_password,avatar_url').eq('id', user.id).single()
    setLoggedInUser({ ...user, must_change_password: extraFields?.must_change_password ?? false, avatar_url: extraFields?.avatar_url ?? user.avatar_url ?? '' })

    return { success: true }
  }

  const loginAdmin = async (email, password) => {
    const rl = checkRateLimit(email)
    if (rl.locked) return { success: false, error: 'err_rate_limited', secs: rl.secs }

    const { data, error } = await supabase.rpc('login_admin', { p_email: email, p_password: password })

    if (error || !data || data.length === 0) {
      recordFailedAttempt(email)
      return { success: false, error: 'err_user_not_found' }
    }

    clearAttempts(email)
    const admin = data[0]
    const { data: adminExtra } = await supabase.from('admins').select('avatar_url,must_change_password').eq('id', admin.id).single()
    setLoggedInAdmin({ ...admin, avatar_url: adminExtra?.avatar_url ?? admin.avatar_url ?? '', must_change_password: adminExtra?.must_change_password ?? false })
    return { success: true }
  }

  const registerUser = async (formData) => {
    const normalizedEmail = formData.email.trim().toLowerCase()
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', normalizedEmail).maybeSingle()
    if (existing) return { success: false, error: 'err_email_exists' }

    const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: formData.password })
    if (hashErr || !hashed) { console.error('hash_password_bcrypt error:', hashErr); return { success: false, error: hashErr?.message || 'err_generic' } }
    const { error } = await supabase.from('users').insert([{
      name: formData.name,
      surname: formData.surname,
      email: normalizedEmail,
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
      title: `[${formData.city_name}] ${t('notif_new_member_title', language)}`,
      message: t('notif_new_member_msg', language).replace('{name}', `${formData.name} ${formData.surname}`).replace('{email}', formData.email),
      type: 'ADMIN_ONLY',
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

  const changeAdminPassword = async (adminId, email, currentPassword, newPassword) => {
    const { data: ok, error } = await supabase.rpc('change_admin_password', {
      p_admin_id: adminId,
      p_email: email,
      p_current_password: currentPassword,
      p_new_password: newPassword,
    })
    if (error || !ok) return { success: false, error: 'err_current_password_wrong' }
    const { error: updateErr } = await supabase.from('admins').update({ must_change_password: false }).eq('id', adminId)
    if (updateErr) return { success: false, error: 'err_generic' }
    setLoggedInAdmin(prev => prev ? { ...prev, must_change_password: false } : prev)
    return { success: true }
  }

  const changePassword = async (userId, email, currentPassword, newPassword) => {
    const { data: ok, error } = await supabase.rpc('change_user_password', {
      p_user_id: userId,
      p_email: email,
      p_current_password: currentPassword,
      p_new_password: newPassword,
    })
    if (error || !ok) return { success: false, error: 'err_current_password_wrong' }
    const { error: updateErr } = await supabase.from('users').update({ must_change_password: false }).eq('id', userId)
    if (updateErr) return { success: false, error: 'err_generic' }
    setLoggedInUser(prev => prev ? { ...prev, must_change_password: false } : prev)
    return { success: true }
  }

  const uploadAvatar = async (file, type, id) => {
    if (!file) return { success: false, error: 'No file' }
    if (file.size > 1048576) return { success: false, error: t('err_file_too_large', language) }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) return { success: false, error: t('err_file_type', language) }
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${type}/${id}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) return { success: false, error: upErr.message }
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${path}`
    return { success: true, url: publicUrl + '?t=' + Date.now() }
  }

  const logout = useCallback(() => {
    setLoggedInUser(null)
    setLoggedInAdmin(null)
  }, [])

  const toggleLanguage = () => setLanguage(prev => prev === 'TR' ? 'EN' : 'TR')
  const toggleDarkMode = () => setIsDarkMode(prev => !prev)

  const value = {
    loggedInUser, loggedInAdmin,
    language, isDarkMode, idleWarning,
    setLoggedInUser, setLoggedInAdmin,
    loginUser, loginAdmin, registerUser, findUserForReset,
    changePassword, changeAdminPassword, uploadAvatar, logout,
    toggleLanguage, toggleDarkMode, dismissIdleWarning,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

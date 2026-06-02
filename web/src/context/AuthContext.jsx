import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'
import { t } from '../lib/languages'
import { writeNotification } from '../lib/notifications'
import { setSentryUser } from '../lib/sentry'

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
const IDLE_HARD_LOGOUT_MS = 5 * 60 * 1000 // 5 min after warning → forced logout

function loadRateLimits() {
  try { return JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{}') } catch { return {} }
}
function saveRateLimits(data) {
  try { localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(data)) } catch (err) { console.warn('[saveRateLimits] localStorage unavailable:', err) }
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

const SESSION_TOKEN_KEY = 'session_token'

function loadSessionToken() {
  try { return localStorage.getItem(SESSION_TOKEN_KEY) || null } catch { return null }
}
function saveSessionToken(token) {
  try {
    if (token) localStorage.setItem(SESSION_TOKEN_KEY, token)
    else localStorage.removeItem(SESSION_TOKEN_KEY)
  } catch {}
}

export function AuthProvider({ children }) {
  const [loggedInUser, setLoggedInUser] = useState(() => loadFromStorage('session_user'))
  const [loggedInAdmin, setLoggedInAdmin] = useState(() => loadFromStorage('session_admin'))
  const [sessionToken, setSessionTokenState] = useState(() => loadSessionToken())
  // İngilizce desteği kaldırıldı — language sabit TR. Tüketici kodu hâlâ
  // language okuyabiliyor, ama değer her zaman 'TR'.
  const language = 'TR'
  const [isDarkMode, setIsDarkMode] = useState(() => loadFromStorage('app_dark_mode') || false)
  const [idleWarning, setIdleWarning] = useState(false)
  const idleWarnRef = useRef(null)
  const idleLogoutRef = useRef(null)
  const isLoggedInRef = useRef(false)

  useEffect(() => {
    if (loggedInUser) localStorage.setItem('session_user', JSON.stringify(loggedInUser))
    else localStorage.removeItem('session_user')
  }, [loggedInUser])

  useEffect(() => {
    if (loggedInAdmin) localStorage.setItem('session_admin', JSON.stringify(loggedInAdmin))
    else localStorage.removeItem('session_admin')
  }, [loggedInAdmin])

  // Eski 'app_language' kaydını temizle (artık kullanılmıyor)
  useEffect(() => { try { localStorage.removeItem('app_language') } catch {} }, [])

  useEffect(() => {
    localStorage.setItem('app_dark_mode', JSON.stringify(isDarkMode))
    if (isDarkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [isDarkMode])

  useEffect(() => {
    isLoggedInRef.current = !!(loggedInUser || loggedInAdmin)
    setSentryUser(loggedInAdmin || loggedInUser || null)
  }, [loggedInUser, loggedInAdmin])

  const logout = useCallback(() => {
    const tk = loadSessionToken()
    if (tk) {
      // supabase.rpc() PostgrestFilterBuilder döndürür — thenable ama .catch() yok.
      // Doğrudan .catch çağırmak runtime error fırlatır, setLoggedInUser hiç çalışmaz
      // ve kullanıcı çıkış yapamaz. Promise.resolve sarmalayarak güvene alıyoruz.
      Promise.resolve(supabase.rpc('revoke_session', { p_token: tk })).catch(() => {})
    }
    saveSessionToken(null)
    setSessionTokenState(null)
    setLoggedInUser(null)
    setLoggedInAdmin(null)
  }, [])

  const resetIdleTimer = useCallback(() => {
    if (!isLoggedInRef.current) return
    clearTimeout(idleWarnRef.current)
    clearTimeout(idleLogoutRef.current)
    setIdleWarning(false)
    idleWarnRef.current = setTimeout(() => {
      setIdleWarning(true)
      // After warning is shown, give the user IDLE_HARD_LOGOUT_MS to respond.
      // No response → forced logout (covers the stolen-device / closed-tab cases).
      idleLogoutRef.current = setTimeout(() => { logout() }, IDLE_HARD_LOGOUT_MS)
    }, IDLE_WARN_MS)
  }, [logout])

  const dismissIdleWarning = useCallback(() => {
    setIdleWarning(false)
    resetIdleTimer()
  }, [resetIdleTimer])

  useEffect(() => {
    if (!loggedInUser && !loggedInAdmin) {
      clearTimeout(idleWarnRef.current)
      clearTimeout(idleLogoutRef.current)
      setIdleWarning(false)
      return
    }
    resetIdleTimer()
    const events = ['mousedown', 'keydown', 'touchstart', 'wheel', 'click']
    events.forEach(ev => document.addEventListener(ev, resetIdleTimer, { passive: true }))
    return () => {
      clearTimeout(idleWarnRef.current)
      clearTimeout(idleLogoutRef.current)
      events.forEach(ev => document.removeEventListener(ev, resetIdleTimer))
    }
  }, [loggedInUser, loggedInAdmin, resetIdleTimer])

  const loginUser = useCallback(async (email, password) => {
    const rl = checkRateLimit(email)
    if (rl.locked) return { success: false, error: 'err_rate_limited', secs: rl.secs }

    // Token-aware RPC zorunlu. Eski rate-limit'siz login_user fallback'i
    // anon REST'ten doğrudan brute-force'a açıktı — kaldırıldı.
    const v2 = await supabase.rpc('login_user_with_token', { p_email: email, p_password: password })
    if (v2.error) {
      const msg = v2.error.message || ''
      if (msg.includes('err_rate_limited')) return { success: false, error: 'err_rate_limited' }
      console.error('login_user_with_token error:', v2.error)
      return { success: false, error: 'err_generic' }
    }
    let user = v2.data && v2.data[0]
    const token = user?.session_token

    if (!user) {
      // Login başarısız — email var/yok ayrımı için fallback lookup
      const normalizedEmail = email.trim().toLowerCase()
      const { data: userExists } = await supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle()
      if (!userExists) return { success: false, error: 'err_email_not_found' }
      const { data: adminExists } = await supabase.from('admins').select('id').eq('email', normalizedEmail).maybeSingle()
      if (adminExists) return { success: false, error: 'err_email_not_found' }
      recordFailedAttempt(email)
      return { success: false, error: 'err_user_not_found' }
    }

    if (!user.is_approved) return { success: false, error: 'err_not_approved' }

    clearAttempts(email)
    const { data: extraFields } = await supabase.from('users').select('must_change_password,avatar_url').eq('id', user.id).single()
    setLoggedInUser({ ...user, must_change_password: extraFields?.must_change_password ?? false, avatar_url: extraFields?.avatar_url ?? user.avatar_url ?? '' })
    if (token) { saveSessionToken(token); setSessionTokenState(token) }

    return { success: true }
  }, [])

  const loginAdmin = useCallback(async (email, password) => {
    const rl = checkRateLimit(email)
    if (rl.locked) return { success: false, error: 'err_rate_limited', secs: rl.secs }

    const v2 = await supabase.rpc('login_admin_with_token', { p_email: email, p_password: password })
    if (v2.error) {
      const msg = v2.error.message || ''
      if (msg.includes('err_rate_limited')) return { success: false, error: 'err_rate_limited' }
      console.error('login_admin_with_token error:', v2.error)
      return { success: false, error: 'err_generic' }
    }
    let admin = v2.data && v2.data[0]
    const token = admin?.session_token

    if (!admin) {
      recordFailedAttempt(email)
      return { success: false, error: 'err_user_not_found' }
    }

    clearAttempts(email)
    const { data: adminExtra } = await supabase.from('admins').select('avatar_url,must_change_password').eq('id', admin.id).single()
    setLoggedInAdmin({ ...admin, avatar_url: adminExtra?.avatar_url ?? admin.avatar_url ?? '', must_change_password: adminExtra?.must_change_password ?? false })
    if (token) { saveSessionToken(token); setSessionTokenState(token) }
    return { success: true }
  }, [])

  const registerUser = useCallback(async (formData) => {
    const normalizedEmail = formData.email.trim().toLowerCase()
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', normalizedEmail).maybeSingle()
    if (existing) return { success: false, error: 'err_email_exists' }

    const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: formData.password })
    if (hashErr || !hashed) { console.error('hash_password_bcrypt error:', hashErr); return { success: false, error: hashErr?.message || 'err_generic' } }

    // SECURITY DEFINER RPC forces is_approved=false; falls back to direct INSERT
    // (omitting is_approved so DEFAULT false applies) if RPC not yet deployed.
    const { error: rpcErr } = await supabase.rpc('register_user', {
      p_name: formData.name, p_surname: formData.surname, p_email: normalizedEmail, p_password_hash: hashed,
      p_branch: formData.branch, p_work_location: formData.work_location, p_phone: formData.phone,
      p_city_id: formData.city_id, p_city_name: formData.city_name, p_district: formData.district,
    })
    if (rpcErr && rpcErr.code !== '42883' && rpcErr.code !== 'PGRST202') {
      if (rpcErr.code === '23505') return { success: false, error: 'err_email_exists' }
      return { success: false, error: rpcErr.message }
    }
    if (rpcErr) {
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
      }])
      if (error) return { success: false, error: error.message }
    }

    await writeNotification({
      title: `[${formData.city_name}] ${t('notif_new_member_title', language)}`,
      message: t('notif_new_member_msg', language).replace('{name}', `${formData.name} ${formData.surname}`).replace('{email}', formData.email),
      type: 'ADMIN_ONLY',
    })
    return { success: true }
  }, [language])

  const findUserForReset = useCallback(async (email) => {
    // Defense against email enumeration: never reveal whether the email exists.
    // Caller (forgot-password flow) should always show the same generic
    // "if registered, a reset link will be sent" message and trigger the
    // reset RPC unconditionally. We still look up the record so the live
    // reset path can use it, but we don't expose absence to the caller.
    const { data } = await supabase
      .from('users')
      .select('id, name, surname, email')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()
    return { success: true, data: data || null }
  }, [])

  const changeAdminPassword = useCallback(async (adminId, email, currentPassword, newPassword) => {
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
  }, [])

  const changePassword = useCallback(async (userId, email, currentPassword, newPassword) => {
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
  }, [])

  const uploadAvatar = useCallback(async (file, type, id) => {
    if (!file) return { success: false, error: 'No file' }
    if (file.size > 1048576) return { success: false, error: t('err_file_too_large', language) }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) return { success: false, error: t('err_file_type', language) }
    // Extension allowlist — input filename'i güvenilmez, only allowed image MIME → uzantı
    const mimeExt = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
    const ext = mimeExt[file.type] || 'jpg'
    // UUID suffix → her upload yeni dosya yolu; başka kullanıcı `users/<id>.jpg`
    // path'ini bilse bile, gerçek dosya `users/<id>-<uuid>.jpg`'a yazılır.
    // Eski path'i overwrite etmek için tahmin imkansız.
    const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const path = `${type}/${id}-${uuid}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) return { success: false, error: upErr.message }
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${path}`
    return { success: true, url: publicUrl + '?t=' + Date.now() }
  }, [language])

  const toggleLanguage = useCallback(() => {}, []) // İngilizce desteği kaldırıldı; no-op
  const toggleDarkMode = useCallback(() => setIsDarkMode(prev => !prev), [])

  const value = useMemo(() => ({
    loggedInUser, loggedInAdmin, sessionToken,
    language, isDarkMode, idleWarning,
    setLoggedInUser, setLoggedInAdmin,
    loginUser, loginAdmin, registerUser, findUserForReset,
    changePassword, changeAdminPassword, uploadAvatar, logout,
    toggleLanguage, toggleDarkMode, dismissIdleWarning,
  }), [
    loggedInUser, loggedInAdmin, sessionToken, language, isDarkMode, idleWarning,
    loginUser, loginAdmin, registerUser, findUserForReset,
    changePassword, changeAdminPassword, uploadAvatar, logout,
    toggleLanguage, toggleDarkMode, dismissIdleWarning,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

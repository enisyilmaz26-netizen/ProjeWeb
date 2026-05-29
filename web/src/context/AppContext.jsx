import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase, supabaseUrl } from '../lib/supabase'

const AppContext = createContext(null)

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
  const [workshops, setWorkshops] = useState([])
  const [certificateTemplates, setCertificateTemplates] = useState([])
  const [admins, setAdmins] = useState([])
  const [workshopRegistrations, setWorkshopRegistrations] = useState([])
  const [workshopRegistrationsAvailable, setWorkshopRegistrationsAvailable] = useState(false)
  const [conversations, setConversations] = useState([])
  const [messagesAvailable, setMessagesAvailable] = useState(true)
  const [closedDays, setClosedDays] = useState([])
  const [idleWarning, setIdleWarning] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const rtChannelsRef = React.useRef([])
  const idleWarnRef = useRef(null)
  const isLoggedInRef = useRef(false)

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
        { data: workshopsData },
        { data: adminsData },
        wsRegResult,
        convResult,
        closedResult,
        certResult,
      ] = await Promise.all([
        supabase.from('cities').select('*').order('name'),
        supabase.from('laboratories').select('*').order('name'),
        supabase.from('appointments').select('*').order('created_timestamp', { ascending: false }),
        supabase.from('notifications').select('*').order('timestamp', { ascending: false }),
        supabase.from('city_time_slots').select('*').order('id'),
        supabase.from('users').select('id,name,surname,email,is_approved,city_id,city_name,phone,branch,work_location,district,must_change_password,avatar_url').order('name'),
        supabase.from('workshops').select('*').order('date', { ascending: false }),
        supabase.from('admins').select('id,name,email,role,city_id,phone,avatar_url').order('name'),
        supabase.from('workshop_registrations').select('*'),
        supabase.from('conversations').select('*').order('last_message_at', { ascending: false }),
        supabase.from('closed_days').select('*').order('date'),
        supabase.from('certificate_templates').select('*'),
      ])
      if (citiesData) setCities(citiesData)
      if (labsData) setLabs(labsData)
      if (appointmentsData) setAppointments(appointmentsData)
      if (notificationsData) setNotifications(notificationsData)
      if (timeSlotsData) setTimeSlots(timeSlotsData)
      if (usersData) setUsers(usersData)
      if (workshopsData) setWorkshops(workshopsData)
      if (adminsData) setAdmins(adminsData)
      if (wsRegResult.data) { setWorkshopRegistrations(wsRegResult.data); setWorkshopRegistrationsAvailable(true) }
      if (convResult.data) { setConversations(convResult.data); setMessagesAvailable(true) }
      if (closedResult.data) setClosedDays(closedResult.data)
      if (certResult.data) setCertificateTemplates(certResult.data)
      setLoadError(false)
    } catch (err) {
      console.error('[loadAllData] failed:', err)
      setLoadError(true)
    } finally {
      if (showLoader) setLoading(false)
    }
  }, [])

  useEffect(() => { loadAllData() }, [loadAllData])


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
    // Note: raw state stores all notifications; visibleNotifications (memoised) applies
    // per-user city filtering so cross-city notifications are never rendered or counted.

    const workshopChannel = supabase
      .channel('rt-workshops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshops' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'INSERT') setWorkshops(prev => prev.find(w => w.id === n.id) ? prev : [n, ...prev])
        else if (eventType === 'UPDATE') setWorkshops(prev => prev.map(w => w.id === n.id ? n : w))
        else if (eventType === 'DELETE') setWorkshops(prev => prev.filter(w => w.id !== o.id))
      })
      .subscribe()

    const convChannel = supabase
      .channel('rt-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'INSERT') setConversations(prev => prev.find(c => c.id === n.id) ? prev : [n, ...prev])
        else if (eventType === 'UPDATE') setConversations(prev => prev.map(c => c.id === n.id ? n : c))
        else if (eventType === 'DELETE') setConversations(prev => prev.filter(c => c.id !== o.id))
      })
      .subscribe()

    const wsRegChannel = supabase
      .channel('rt-workshop-registrations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workshop_registrations' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'INSERT') setWorkshopRegistrations(prev => prev.find(r => r.id === n.id) ? prev : [...prev, n])
        else if (eventType === 'UPDATE') setWorkshopRegistrations(prev => prev.map(r => r.id === n.id ? n : r))
        else if (eventType === 'DELETE') setWorkshopRegistrations(prev => prev.filter(r => r.id !== o.id))
      })
      .subscribe()

    const certChannel = supabase
      .channel('rt-certificate-templates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'certificate_templates' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'INSERT') setCertificateTemplates(prev => prev.find(t => t.id === n.id) ? prev : [...prev, n])
        else if (eventType === 'UPDATE') setCertificateTemplates(prev => prev.map(t => t.id === n.id ? n : t))
        else if (eventType === 'DELETE') setCertificateTemplates(prev => prev.filter(t => t.id !== o.id))
      })
      .subscribe()

    rtChannelsRef.current = [apptChannel, notifChannel, workshopChannel, wsRegChannel, convChannel, certChannel]
    return () => {
      supabase.removeChannel(apptChannel)
      supabase.removeChannel(notifChannel)
      supabase.removeChannel(workshopChannel)
      supabase.removeChannel(wsRegChannel)
      supabase.removeChannel(convChannel)
      supabase.removeChannel(certChannel)
      rtChannelsRef.current = []
    }
  }, [])

  useEffect(() => {
    if (!loggedInUser?.email) return
    const email = loggedInUser.email
    const waitlistChannel = supabase
      .channel('rt-waitlist')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'waitlist' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'INSERT' && n.user_email === email && n.status === 'WAITING') {
          setWaitlist(prev => prev.find(w => w.id === n.id) ? prev : [...prev, n])
        } else if (eventType === 'UPDATE') {
          setWaitlist(prev => n.status === 'WAITING'
            ? prev.map(w => w.id === n.id ? n : w)
            : prev.filter(w => w.id !== n.id)
          )
        } else if (eventType === 'DELETE') {
          setWaitlist(prev => prev.filter(w => w.id !== o.id))
        }
      })
      .subscribe()
    return () => supabase.removeChannel(waitlistChannel)
  }, [loggedInUser?.email])

  // AUTH ACTIONS
  const loginUser = async (email, password) => {
    const rl = checkRateLimit(email)
    if (rl.locked) return { success: false, error: 'err_rate_limited', secs: rl.secs }

    const { data, error } = await supabase.rpc('login_user', { p_email: email, p_password: password })

    if (error || !data || data.length === 0) {
      // Distinguish "email not found" vs "wrong password" for admin login fallback
      const { data: userExists } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
      if (!userExists) return { success: false, error: 'err_email_not_found' }
      // Email is in users but may also be in admins (admin tried user login form)
      const { data: adminExists } = await supabase.from('admins').select('id').eq('email', email).maybeSingle()
      if (adminExists) return { success: false, error: 'err_email_not_found' }
      recordFailedAttempt(email)
      return { success: false, error: 'err_user_not_found' }
    }

    const user = data[0]
    if (!user.is_approved) return { success: false, error: 'err_not_approved' }

    clearAttempts(email)
    // RPC may not return all columns — fetch extras explicitly
    const { data: extraFields } = await supabase.from('users').select('must_change_password,avatar_url').eq('id', user.id).single()
    setLoggedInUser({ ...user, must_change_password: extraFields?.must_change_password ?? false, avatar_url: extraFields?.avatar_url ?? user.avatar_url ?? '' })
    loadWaitlist(email)

    // Yaklaşan randevular için hatırlatma bildirimi oluştur (2 gün içinde)
    const today = new Date()
    const in2days = new Date(today); in2days.setDate(today.getDate() + 2)
    const todayStr = today.toISOString().split('T')[0]
    const in2daysStr = in2days.toISOString().split('T')[0]
    const { data: upcoming } = await supabase
      .from('appointments')
      .select('id, lab_name, date, time_slot')
      .eq('user_email', email)
      .in('status', ['APPROVED'])
      .gte('date', todayStr)
      .lte('date', in2daysStr)
    if (upcoming && upcoming.length > 0) {
      const reminderTitle = language === 'TR' ? 'Yaklaşan Randevu Hatırlatması' : 'Upcoming Appointment Reminder'
      const toInsert = []
      for (const appt of upcoming) {
        const { data: existing } = await supabase.from('notifications')
          .select('id').eq('type', 'REMINDER').ilike('message', `%${appt.id}%`).maybeSingle()
        if (!existing) {
          const reminderMsg = language === 'TR'
            ? `${appt.lab_name} - ${appt.date} ${appt.time_slot} tarihli randevunuz yaklaşıyor.`
            : `Your appointment at ${appt.lab_name} on ${appt.date} ${appt.time_slot} is coming up.`
          toInsert.push({
            title: reminderTitle,
            message: `[${appt.id}] ${reminderMsg}`,
            type: 'REMINDER',
            timestamp: Date.now(),
            is_read: false,
          })
        }
      }
      if (toInsert.length > 0) await supabase.from('notifications').insert(toInsert)
    }

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
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', formData.email).maybeSingle()
    if (existing) return { success: false, error: 'err_email_exists' }

    const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: formData.password })
    if (hashErr || !hashed) { console.error('hash_password_bcrypt error:', hashErr); return { success: false, error: hashErr?.message || 'err_generic' } }
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
      message: language === 'TR'
        ? `${formData.name} ${formData.surname} (${formData.email}) kayıt talebinde bulundu.`
        : `${formData.name} ${formData.surname} (${formData.email}) has submitted a registration request.`,
      type: 'SYSTEM',
      timestamp: Date.now(),
      is_read: false,
    }])
    return { success: true }
  }

  const addUserByAdmin = async (formData) => {
    const { data: existing } = await supabase
      .from('users').select('id').eq('email', formData.email.trim().toLowerCase()).maybeSingle()
    if (existing) return { success: false, error: 'err_email_exists' }

    const email = formData.email.trim().toLowerCase()
    const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: formData.password })
    if (hashErr || !hashed) { console.error('hash_password_bcrypt error:', hashErr); return { success: false, error: hashErr?.message || 'err_generic' } }
    const { data: newUser, error } = await supabase.from('users').insert([{
      name: formData.name,
      surname: formData.surname,
      email,
      password_hash: hashed,
      branch: formData.branch,
      work_location: formData.work_location,
      phone: formData.phone,
      city_id: formData.city_id,
      city_name: formData.city_name,
      district: formData.district,
      is_approved: true,
      must_change_password: true,
    }]).select('id,name,surname,email,is_approved,city_id,city_name,phone,branch,work_location,district,must_change_password').single()
    if (error) return { success: false, error: error.message }
    if (newUser) setUsers(prev => [...prev, newUser].sort((a, b) => (a.name || '').localeCompare(b.name || '')))

    if (email) {
      const fullName = `${formData.name || ''} ${formData.surname || ''}`.trim()
      sendAutoEmail(
        email, fullName,
        language === 'TR' ? 'Hesabınız Oluşturuldu – MEB ÖGEDEP' : 'Account Created – MEB ÖGEDEP',
        language === 'TR'
          ? `<p>Sayın <strong>${fullName}</strong>,</p>
             <p>MEB ÖGEDEP sistemine yönetici tarafından hesabınız oluşturulmuştur.</p>
             <p>Giriş bilgileriniz:</p>
             <p>📧 E-posta: <strong>${email}</strong></p>
             <p>🔑 Şifre: <strong>${formData.password}</strong></p>
             <p>Sisteme giriş yaptığınızda yeni bir şifre belirlemeniz istenecektir.</p>
             <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sisteme Giriş Yap</a></p>`
          : `<p>Dear <strong>${fullName}</strong>,</p>
             <p>An account has been created for you in the MEB ÖGEDEP system by an administrator.</p>
             <p>Your login credentials:</p>
             <p>📧 Email: <strong>${email}</strong></p>
             <p>🔑 Password: <strong>${formData.password}</strong></p>
             <p>You will be prompted to set a new password upon first login.</p>
             <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to System</a></p>`
      )
    }
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

  const resetPassword = async (userId, _email, newPassword) => {
    const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: newPassword })
    if (hashErr || !hashed) return { success: false, error: 'err_generic' }
    const { data: updated, error } = await supabase.from('users').update({ password_hash: hashed, must_change_password: true }).eq('id', userId).select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, must_change_password: true } : u))
    const user = users.find(u => u.id === userId)
    if (user) logAudit('RESET_USER_PASSWORD', 'user', userId, `${user.name} ${user.surname} (${user.email})`)
    if (user?.email) {
      const fullName = `${user.name || ''} ${user.surname || ''}`.trim()
      sendAutoEmail(
        user.email, fullName,
        language === 'TR' ? 'Şifreniz Güncellendi – MEB ÖGEDEP' : 'Password Updated – MEB ÖGEDEP',
        language === 'TR'
          ? `<p>Sayın <strong>${fullName}</strong>,</p>
             <p>Yönetici tarafından şifreniz sıfırlanmıştır. Yeni geçici şifreniz aşağıda yer almaktadır:</p>
             <p style="font-size:20px;font-weight:700;letter-spacing:0.1em;color:#1565C0;padding:12px 20px;background:#f0f4ff;border-radius:8px;display:inline-block">${newPassword}</p>
             <p>Sisteme giriş yaptığınızda yeni bir şifre belirlemeniz istenecektir.</p>
             <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sisteme Giriş Yap</a></p>`
          : `<p>Dear <strong>${fullName}</strong>,</p>
             <p>Your password has been reset by an administrator. Your new temporary password is:</p>
             <p style="font-size:20px;font-weight:700;letter-spacing:0.1em;color:#1565C0;padding:12px 20px;background:#f0f4ff;border-radius:8px;display:inline-block">${newPassword}</p>
             <p>You will be prompted to set a new password upon logging in.</p>
             <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to System</a></p>`
      )
    }
    return { success: true }
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
    if (file.size > 1048576) return { success: false, error: language === 'TR' ? 'Dosya 1 MB\'dan büyük olamaz.' : 'File must be under 1 MB.' }
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowed.includes(file.type)) return { success: false, error: language === 'TR' ? 'Yalnızca JPEG, PNG, WebP veya GIF yükleyebilirsiniz.' : 'Only JPEG, PNG, WebP or GIF allowed.' }
    const ext = file.name.split('.').pop().toLowerCase()
    const path = `${type}/${id}.${ext}`
    const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type })
    if (upErr) return { success: false, error: upErr.message }
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${path}`
    return { success: true, url: publicUrl + '?t=' + Date.now() }
  }

  const updateUserProfile = async (userId, updates) => {
    const { data: updated, error } = await supabase.from('users').update(updates).eq('id', userId).select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
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
    // Fast client-side pre-check for immediate UX feedback (authoritative check is server-side)
    const duplicate = appointments.find(a =>
      a.user_email === appointmentData.user_email &&
      String(a.lab_id) === String(appointmentData.lab_id) &&
      a.date === appointmentData.date &&
      a.time_slot === appointmentData.time_slot &&
      (a.status === 'PENDING' || a.status === 'APPROVED' || a.status === 'CANCELLATION_REQUESTED')
    )
    if (duplicate) return { success: false, error: 'err_duplicate_appointment' }

    const { data, error } = await supabase.rpc('submit_appointment', {
      p_lab_id:             appointmentData.lab_id,
      p_lab_name:           appointmentData.lab_name,
      p_city_id:            appointmentData.city_id,
      p_city_name:          appointmentData.city_name,
      p_date:               appointmentData.date,
      p_time_slot:          appointmentData.time_slot,
      p_user_name:          appointmentData.user_name,
      p_user_surname:       appointmentData.user_surname,
      p_user_branch:        appointmentData.user_branch,
      p_user_work_location: appointmentData.user_work_location,
      p_user_phone:         appointmentData.user_phone,
      p_user_email:         appointmentData.user_email,
      p_user_city:          appointmentData.user_city,
      p_user_district:      appointmentData.user_district,
      p_note:               appointmentData.note || '',
    })

    if (error) {
      const msg = error.message || ''
      if (msg.includes('err_duplicate_appointment') || error.code === '23505') return { success: false, error: 'err_duplicate_appointment' }
      if (msg.includes('err_lab_not_found')) return { success: false, error: 'err_lab_not_found' }
      if (msg.includes('err_lab_city_mismatch')) return { success: false, error: 'err_lab_city_mismatch' }
      console.error('submitAppointment error:', error)
      return { success: false, error: 'err_generic' }
    }
    if (!data || data.length === 0) return { success: false, error: 'err_duplicate_appointment' }

    const appt = {
      ...appointmentData,
      id: data[0].id,
      status: 'PENDING',
      created_timestamp: data[0].created_timestamp,
    }
    setAppointments(prev => [appt, ...prev])
    return { success: true, data: appt }
  }

  const markAppointmentCompleted = async (id) => {
    const appt = appointments.find(a => a.id === id)
    const { data: updated, error } = await supabase.from('appointments').update({ status: 'COMPLETED' }).eq('id', id).eq('status', 'APPROVED').select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'COMPLETED' } : a))
    if (appt) logAudit('COMPLETE_APPOINTMENT', 'appointment', id, `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${appt.date} ${appt.time_slot}`)
    if (appt) {
      const cityName = cities.find(c => String(c.id) === String(appt.city_id))?.name
      if (cityName) {
        const notifData = {
          title: `[${cityName}] Randevu Tamamlandı`,
          message: `${appt.user_name || appt.user_email || ''} adlı öğretmenin ${appt.lab_name || ''} için ${appt.date} tarihli randevusu tamamlandı.`,
          type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
        }
        const { data: nd } = await supabase.from('notifications').insert([notifData]).select().single()
        if (nd) setNotifications(prev => [nd, ...prev])
      }
    }
    return { success: true }
  }

  const approveAppointment = async (id, newDate = null, newTimeSlot = null) => {
    const appt = appointments.find(a => a.id === id)
    const updates = { status: 'APPROVED' }
    if (newDate) updates.date = newDate
    if (newTimeSlot) updates.time_slot = newTimeSlot
    const { data: updated, error } = await supabase.from('appointments').update(updates).eq('id', id).in('status', ['PENDING', 'CANCELLATION_REQUESTED']).select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
    const finalDate = newDate || appt?.date
    const finalSlot = newTimeSlot || appt?.time_slot
    if (appt) logAudit('APPROVE_APPOINTMENT', 'appointment', id, `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${finalDate} ${finalSlot}`)
    if (appt) {
      const cityName = cities.find(c => String(c.id) === String(appt.city_id))?.name
      if (cityName) {
        const notifData = {
          title: `[${cityName}] Randevu Onaylandı`,
          message: `${appt.user_name || appt.user_email || ''} adlı öğretmenin ${appt.lab_name || ''} için ${finalDate} tarihli randevusu onaylandı.`,
          type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
        }
        const { data: nd } = await supabase.from('notifications').insert([notifData]).select().single()
        if (nd) setNotifications(prev => [nd, ...prev])
      }
    }
    if (appt?.user_email) {
      const userName = `${appt.user_name || ''} ${appt.user_surname || ''}`.trim() || appt.user_email
      const finalDate = newDate || appt.date
      const finalSlot = newTimeSlot || appt.time_slot
      const fmtDate = finalDate ? new Date(finalDate + 'T12:00:00').toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
      sendAutoEmail(
        appt.user_email, userName,
        language === 'TR' ? `Randevunuz Onaylandı – ${appt.lab_name || ''}` : `Appointment Approved – ${appt.lab_name || ''}`,
        language === 'TR'
          ? `<p>Sayın <strong>${userName}</strong>,</p>
             <p><strong>${appt.lab_name || ''}</strong> için randevunuz onaylanmıştır.</p>
             ${fmtDate ? `<p>📅 Tarih: <strong>${fmtDate}</strong></p>` : ''}
             ${finalSlot ? `<p>🕐 Saat: <strong>${finalSlot}</strong></p>` : ''}`
          : `<p>Dear <strong>${userName}</strong>,</p>
             <p>Your appointment for <strong>${appt.lab_name || ''}</strong> has been approved.</p>
             ${fmtDate ? `<p>📅 Date: <strong>${fmtDate}</strong></p>` : ''}
             ${finalSlot ? `<p>🕐 Time: <strong>${finalSlot}</strong></p>` : ''}`
      )
    }
    return { success: true }
  }

  const cancelAppointment = async (id) => {
    const appt = appointments.find(a => a.id === id)
    const { data: updated, error } = await supabase.from('appointments').update({ status: 'CANCELLED' }).eq('id', id).in('status', ['PENDING', 'APPROVED', 'CANCELLATION_REQUESTED']).select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a))
    if (appt) logAudit('CANCEL_APPOINTMENT', 'appointment', id, `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${appt.date} ${appt.time_slot}`)
    if (appt) {
      const cityName = cities.find(c => String(c.id) === String(appt.city_id))?.name
      if (cityName) {
        const notifData = {
          title: `[${cityName}] Randevu İptal Edildi`,
          message: `${appt.user_name || appt.user_email || ''} adlı öğretmenin ${appt.lab_name || ''} için ${appt.date} tarihli randevusu iptal edildi.`,
          type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
        }
        const { data: nd } = await supabase.from('notifications').insert([notifData]).select().single()
        if (nd) setNotifications(prev => [nd, ...prev])
      }
      notifyNextOnWaitlist(appt.lab_id, appt.date, appt.time_slot)
    }
    if (appt?.user_email) {
      const userName = `${appt.user_name || ''} ${appt.user_surname || ''}`.trim() || appt.user_email
      const fmtDate = appt.date ? new Date(appt.date + 'T12:00:00').toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
      sendAutoEmail(
        appt.user_email, userName,
        language === 'TR' ? `Randevunuz İptal Edildi – ${appt.lab_name || ''}` : `Appointment Cancelled – ${appt.lab_name || ''}`,
        language === 'TR'
          ? `<p>Sayın <strong>${userName}</strong>,</p>
             <p><strong>${appt.lab_name || ''}</strong> için ${fmtDate ? `<strong>${fmtDate}</strong> tarihli ` : ''}randevunuz yönetici tarafından iptal edilmiştir.</p>
             <p>Yeni randevu almak için sistemi ziyaret edebilirsiniz.</p>`
          : `<p>Dear <strong>${userName}</strong>,</p>
             <p>Your appointment for <strong>${appt.lab_name || ''}</strong>${fmtDate ? ` on <strong>${fmtDate}</strong>` : ''} has been cancelled by an administrator.</p>
             <p>You may book a new appointment through the system.</p>`
      )
    }
    return { success: true }
  }

  const cancelOwnAppointment = async (id) => {
    const appt = appointments.find(a => a.id === id)
    if (!appt || appt.user_email !== loggedInUser?.email || appt.status !== 'PENDING') {
      return { success: false, error: 'err_generic' }
    }
    // DB-side guard: only updates if user_email and PENDING status both match
    const { data: updated, error } = await supabase
      .from('appointments')
      .update({ status: 'CANCELLED' })
      .eq('id', id)
      .eq('user_email', loggedInUser.email)
      .eq('status', 'PENDING')
      .select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a))
    logAudit('USER_CANCEL_APPOINTMENT', 'appointment', id, `${appt.lab_name} — ${appt.date} ${appt.time_slot}`)
    const cityName = cities.find(c => String(c.id) === String(appt.city_id))?.name
    const userName = `${loggedInUser.name} ${loggedInUser.surname}`
    if (cityName) {
      await supabase.from('notifications').insert([{
        title: `[${cityName}] Randevu İptal Edildi`,
        message: `${userName} adlı öğretmen, ${appt.lab_name || ''} için ${appt.date} tarihli bekleyen randevusunu iptal etti.`,
        type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
      }])
    }
    return { success: true }
  }

  const submitCancellationRequest = async (id, note) => {
    const appt = appointments.find(a => a.id === id)
    const { data: updated, error } = await supabase
      .from('appointments')
      .update({ status: 'CANCELLATION_REQUESTED', note: note || '' })
      .eq('id', id)
      .eq('status', 'APPROVED')
      .select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
    setAppointments(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'CANCELLATION_REQUESTED', note: note || '' } : a
    ))
    if (appt) {
      logAudit('USER_REQUEST_CANCELLATION', 'appointment', id, `${appt.lab_name} — ${appt.date} ${appt.time_slot}`)
      const cityName = cities.find(c => String(c.id) === String(appt.city_id))?.name
      const userName = loggedInUser ? `${loggedInUser.name} ${loggedInUser.surname}` : (appt.user_name || appt.user_email || '')
      if (cityName) {
        await supabase.from('notifications').insert([{
          title: `[${cityName}] Randevu İptal Talebi`,
          message: `${userName} adlı öğretmen, ${appt.lab_name || ''} için ${appt.date} tarihli randevusunu iptal talep etti.`,
          type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
        }])
      }
    }
    return { success: true }
  }

  const denyCancellationRequest = async (id) => {
    const appt = appointments.find(a => a.id === id)
    const { data: updated, error } = await supabase.from('appointments').update({ status: 'APPROVED' }).eq('id', id).eq('status', 'CANCELLATION_REQUESTED').select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'APPROVED' } : a))
    if (appt) {
      logAudit('DENY_CANCELLATION', 'appointment', id, `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${appt.date} ${appt.time_slot}`)
      const cityName = cities.find(c => String(c.id) === String(appt.city_id))?.name
      if (cityName) {
        const { data: nd } = await supabase.from('notifications').insert([{
          title: `[${cityName}] İptal Talebi Reddedildi`,
          message: `${appt.user_name || ''} ${appt.user_surname || ''} adlı öğretmenin ${appt.lab_name || ''} için ${appt.date} tarihli iptal talebi reddedildi.`,
          type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
        }]).select().single()
        if (nd) setNotifications(prev => [nd, ...prev])
      }
    }
    if (appt?.user_email) {
      const userName = `${appt.user_name || ''} ${appt.user_surname || ''}`.trim() || appt.user_email
      const fmtDate = appt.date ? new Date(appt.date + 'T12:00:00').toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
      sendAutoEmail(
        appt.user_email, userName,
        language === 'TR' ? 'İptal Talebiniz Reddedildi – MEB ÖGEDEP' : 'Cancellation Request Denied – MEB ÖGEDEP',
        language === 'TR'
          ? `<p>Sayın <strong>${userName}</strong>,</p>
             <p><strong>${appt.lab_name || ''}</strong> için ${fmtDate ? `<strong>${fmtDate}</strong> tarihli ` : ''}randevunuza ait iptal talebiniz reddedilmiştir.</p>
             <p>Randevunuz <strong>Onaylı</strong> statüsünde devam etmektedir.</p>`
          : `<p>Dear <strong>${userName}</strong>,</p>
             <p>Your cancellation request for the <strong>${appt.lab_name || ''}</strong> appointment${fmtDate ? ` on <strong>${fmtDate}</strong>` : ''} has been denied.</p>
             <p>Your appointment remains <strong>Approved</strong>.</p>`
      )
    }
    return { success: true }
  }

  // Fire-and-forget audit logger — works for both admin and user sessions
  const logAudit = (action, targetType, targetId, details) => {
    const actor = loggedInAdmin || loggedInUser
    if (!actor) return
    supabase.from('audit_logs').insert([{
      actor_email: actor.email,
      actor_name: loggedInAdmin ? actor.name : `${actor.name} ${actor.surname}`,
      actor_role: loggedInAdmin ? (actor.role || 'CITY') : 'USER',
      action,
      target_type: targetType || null,
      target_id: targetId || null,
      details: details || null,
    }]).catch(err => console.error('[logAudit] failed:', err))
  }

  // USER APPROVAL ACTIONS
  const approveUser = async (userId) => {
    const user = users.find(u => u.id === userId)
    const { data: updated, error } = await supabase.from('users').update({ is_approved: true }).eq('id', userId).select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_approved: true } : u))
    if (user) logAudit('APPROVE_USER', 'user', userId, `${user.name} ${user.surname} (${user.email})`)
    if (user?.email) {
      const fullName = `${user.name || ''} ${user.surname || ''}`.trim()
      sendAutoEmail(
        user.email, fullName,
        language === 'TR' ? 'Üyeliğiniz Onaylandı – MEB ÖGEDEP' : 'Membership Approved – MEB ÖGEDEP',
        language === 'TR'
          ? `<p>Sayın <strong>${fullName}</strong>,</p>
             <p>MEB ÖGEDEP Öğretmen Öğrenme Laboratuvarları sistemine üyeliğiniz onaylanmıştır.</p>
             <p>Artık sisteme giriş yaparak randevu alabilir ve atölye programlarına kayıt olabilirsiniz.</p>
             <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sisteme Giriş Yap</a></p>`
          : `<p>Dear <strong>${fullName}</strong>,</p>
             <p>Your membership to the MEB ÖGEDEP Teacher Learning Labs system has been approved.</p>
             <p>You can now log in to book appointments and register for workshop programs.</p>
             <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to System</a></p>`
      )
    }
    if (user) {
      const cityName = user.city_name || cities.find(c => String(c.id) === String(user.city_id))?.name
      if (cityName) {
        const notifData = {
          title: `[${cityName}] Üyelik Onaylandı`,
          message: `${user.name || ''} ${user.surname || ''} adlı öğretmenin üyeliği onaylandı.`,
          type: 'SYSTEM', timestamp: Date.now(), is_read: false,
        }
        const { data: nd } = await supabase.from('notifications').insert([notifData]).select().single()
        if (nd) setNotifications(prev => [nd, ...prev])
      }
    }
    return { success: true }
  }

  const revokeUser = async (userId) => {
    const user = users.find(u => u.id === userId)
    // Cancel active appointments before deleting user so records remain consistent
    const activeStatuses = ['PENDING', 'APPROVED', 'CANCELLATION_REQUESTED']
    const activeAppts = appointments.filter(a => a.user_email === user?.email && activeStatuses.includes(a.status))
    if (activeAppts.length > 0) {
      await supabase.from('appointments').update({ status: 'CANCELLED' }).in('id', activeAppts.map(a => a.id))
      setAppointments(prev => prev.map(a => activeAppts.some(aa => aa.id === a.id) ? { ...a, status: 'CANCELLED' } : a))
    }
    const { data: deleted, error } = await supabase.from('users').delete().eq('id', userId).select('id')
    if (error) return { success: false, error: error.message }
    if (!deleted || deleted.length === 0) return { success: false, error: 'err_generic' }
    setUsers(prev => prev.filter(u => u.id !== userId))
    if (user) logAudit('REVOKE_USER', 'user', userId, `${user.name} ${user.surname} (${user.email})`)
    if (user) {
      const cityName = user.city_name || cities.find(c => String(c.id) === String(user.city_id))?.name
      if (cityName) {
        const notifData = {
          title: `[${cityName}] Üyelik İptal Edildi`,
          message: `${user.name || ''} ${user.surname || ''} adlı öğretmenin üyeliği iptal edildi.`,
          type: 'SYSTEM', timestamp: Date.now(), is_read: false,
        }
        const { data: nd } = await supabase.from('notifications').insert([notifData]).select().single()
        if (nd) setNotifications(prev => [nd, ...prev])
      }
    }
    return { success: true }
  }

  // NOTIFICATION ACTIONS
  const markNotificationsRead = async (ids) => {
    if (!ids || ids.length === 0) return { success: true }
    const { data: updated, error } = await supabase.from('notifications').update({ is_read: true }).in('id', ids).select('id')
    if (error || !updated || updated.length === 0) return { success: false }
    setNotifications(prev => prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n))
    return { success: true }
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
        !(n.title || '').toLowerCase().includes(cityName.toLowerCase()) && !(n.message || '').toLowerCase().includes(cityName.toLowerCase())
      ))
    } else {
      setNotifications([])
    }
    logAudit('CLEAR_NOTIFICATIONS', 'notifications', null, cityName ? `Şehir: ${cityName}` : 'Tüm bildirimler silindi')
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

  const deleteNotification = async (id) => {
    const { data: deleted, error } = await supabase.from('notifications').delete().eq('id', id).select('id')
    if (error) return { success: false, error: error.message }
    if (!deleted || deleted.length === 0) return { success: false, error: 'err_generic' }
    setNotifications(prev => prev.filter(n => n.id !== id))
    return { success: true }
  }

  // TIME SLOT ACTIONS
  const addTimeSlot = async (cityId, timeRange, location = null) => {
    const row = { city_id: cityId, time_range: timeRange }
    if (location) row.location = location
    const { error } = await supabase.from('city_time_slots').insert([row])
    if (error) return { success: false, error: error.message }
    const { data: all } = await supabase.from('city_time_slots').select('*')
    if (all) setTimeSlots(all)
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
    const { data: deleted, error } = await supabase.from('city_time_slots').delete().eq('id', id).select('id')
    if (error) return { success: false, error: error.message }
    if (!deleted || deleted.length === 0) return { success: false, error: 'err_generic' }
    setTimeSlots(prev => prev.filter(s => s.id !== id))
    return { success: true }
  }

  // LAB ACTIONS
  const addLab = async (labData) => {
    const { error } = await supabase.from('laboratories').insert([labData])
    if (error) return { success: false, error: error.message }
    const { data: all } = await supabase.from('laboratories').select('*')
    if (all) setLabs(all)
    return { success: true }
  }

  const updateLab = async (id, updates) => {
    // Try with .select() first to detect RLS issues; if select is blocked
    // but write succeeded (some Supabase configs), fall back to plain update.
    const { data, error } = await supabase.from('laboratories').update(updates).eq('id', id).select('id')
    if (error) {
      // Might be RLS on SELECT but UPDATE is allowed — try plain update
      const { error: e2 } = await supabase.from('laboratories').update(updates).eq('id', id)
      if (e2) return { success: false, error: e2.message }
    } else if (!data || data.length === 0) {
      return { success: false, error: 'err_update_failed' }
    }
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
    const { data: all } = await supabase.from('laboratories').select('*')
    if (all) {
      if (all.some(l => l.id === id)) return { success: false, error: 'err_update_failed' }
      setLabs(all)
    } else {
      setLabs(prev => prev.filter(l => l.id !== id))
    }
    return { success: true }
  }

  const forceDeleteLab = async (id) => {
    const lab = labs.find(l => l.id === id)
    const { error } = await supabase.from('laboratories').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    const { data: all } = await supabase.from('laboratories').select('*')
    if (all) setLabs(all)
    else setLabs(prev => prev.filter(l => l.id !== id))
    if (lab) logAudit('DELETE_LAB', 'laboratory', id, `${lab.name} (zorla silindi / force deleted)`)
    return { success: true }
  }

  const addWorkshop = async (data) => {
    const { error } = await supabase.from('workshops').insert([{
      ...data,
      created_at: Date.now(),
    }])
    if (error) return { success: false, error: error.message }
    const { data: all } = await supabase.from('workshops').select('*')
    if (all) setWorkshops(all)
    return { success: true }
  }

  const updateWorkshop = async (id, updates) => {
    const { data: rows, error } = await supabase.from('workshops').update(updates).eq('id', id).select('id')
    if (error) return { success: false, error: error.message }
    if (!rows || rows.length === 0) return { success: false, error: 'err_update_failed' }
    const { data: all } = await supabase.from('workshops').select('*')
    if (all) setWorkshops(all)
    else setWorkshops(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
    return { success: true }
  }

  const deleteWorkshop = async (id) => {
    const { error } = await supabase.from('workshops').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    // Reload to verify deletion — RLS can silently block DELETE (no error, 0 rows affected)
    const { data: all } = await supabase.from('workshops').select('*')
    if (all) {
      if (all.some(w => w.id === id)) return { success: false, error: 'err_update_failed' }
      setWorkshops(all)
    } else {
      setWorkshops(prev => prev.filter(w => w.id !== id))
    }
    return { success: true }
  }

  // CLOSED DAYS
  const addClosedDay = async (date, cityId, reason) => {
    const { data, error } = await supabase.from('closed_days').insert([{
      date,
      city_id: cityId || null,
      reason: reason || '',
    }]).select().single()
    if (error) return { success: false, error: error.message }
    setClosedDays(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
    return { success: true }
  }

  const removeClosedDay = async (id) => {
    const { data: deleted, error } = await supabase.from('closed_days').delete().eq('id', id).select('id')
    if (error) return { success: false, error: error.message }
    if (!deleted || deleted.length === 0) return { success: false, error: 'err_generic' }
    setClosedDays(prev => prev.filter(d => d.id !== id))
    return { success: true }
  }

  const isDateClosed = useCallback((dateStr, cityId) => {
    return closedDays.some(d =>
      d.date === dateStr && (d.city_id === null || String(d.city_id) === String(cityId))
    )
  }, [closedDays])

  // MESSAGING
  const getOrCreateConversation = async (senderType, senderId, senderEmail, senderName, cityId, recipientType) => {
    const existing = conversations.find(c => String(c.sender_id) === String(senderId) && c.recipient_type === recipientType)
    if (existing) return { success: true, data: existing }
    const { data, error } = await supabase.from('conversations').insert([{
      sender_type: senderType,
      sender_id: senderId,
      sender_email: senderEmail,
      sender_name: senderName,
      city_id: cityId,
      recipient_type: recipientType,
      unread_for_sender: 0,
      unread_for_recipient: 0,
    }]).select().single()
    if (error) return { success: false, error: error.message }
    setConversations(prev => [data, ...prev])
    return { success: true, data }
  }

  const loadConversationMessages = async (conversationId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    return data || []
  }

  const sendMessage = async (conversationId, body, authoredBy, authorName) => {
    const { data, error } = await supabase.from('messages').insert([{
      conversation_id: conversationId,
      authored_by: authoredBy,
      author_name: authorName,
      body: body.trim(),
    }]).select().single()
    if (error) return { success: false, error: error.message }
    const conv = conversations.find(c => c.id === conversationId)
    const unreadField = authoredBy === 'sender' ? 'unread_for_recipient' : 'unread_for_sender'
    const newUnread = (conv ? conv[unreadField] : 0) + 1
    const { error: convErr } = await supabase.from('conversations').update({
      last_message_at: new Date().toISOString(),
      [unreadField]: newUnread,
    }).eq('id', conversationId)
    if (!convErr) {
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, last_message_at: new Date().toISOString(), [unreadField]: newUnread } : c))
    }
    return { success: true, data }
  }

  const markConversationRead = async (conversationId, side) => {
    const field = side === 'sender' ? 'unread_for_sender' : 'unread_for_recipient'
    const { error } = await supabase.from('conversations').update({ [field]: 0 }).eq('id', conversationId)
    if (error) return
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, [field]: 0 } : c))
  }

  const registerForWorkshop = async (workshopId) => {
    if (!loggedInUser) return { success: false, error: 'err_generic' }
    const ws = workshops.find(w => w.id === workshopId)
    if (!ws) return { success: false, error: 'err_generic' }
    if (workshopRegistrations.some(r => String(r.workshop_id) === String(workshopId) && String(r.user_id) === String(loggedInUser.id))) {
      return { success: false, error: 'err_already_registered' }
    }
    const regCount = workshopRegistrations.filter(r => String(r.workshop_id) === String(workshopId)).length
    if (ws.capacity && regCount >= ws.capacity) return { success: false, error: 'err_workshop_full' }
    const { data, error } = await supabase.from('workshop_registrations').insert([{
      workshop_id: workshopId,
      user_id: loggedInUser.id,
      user_email: loggedInUser.email,
      user_name: loggedInUser.name,
      user_surname: loggedInUser.surname,
      registered_at: new Date().toISOString(),
    }]).select().single()
    if (error) {
      if (error.code === '42P01') { setWorkshopRegistrationsAvailable(false); return { success: false, error: 'err_generic' } }
      if (error.code === '23505') return { success: false, error: 'err_already_registered' }
      console.error('registerForWorkshop error:', error)
      return { success: false, error: 'err_generic' }
    }
    if (data) setWorkshopRegistrations(prev => [...prev, data])
    logAudit('REGISTER_WORKSHOP', 'workshop', workshopId, `${loggedInUser.name} ${loggedInUser.surname} (${loggedInUser.email}) — ${ws.name}`)
    if (loggedInUser?.email && ws) {
      const fullName = `${loggedInUser.name || ''} ${loggedInUser.surname || ''}`.trim()
      const wsDate = ws.date ? new Date(ws.date + 'T12:00:00').toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
      sendAutoEmail(
        loggedInUser.email, fullName,
        language === 'TR' ? `Atölye Kaydınız Oluşturuldu – ${ws.name}` : `Workshop Registration Confirmed – ${ws.name}`,
        language === 'TR'
          ? `<p>Sayın <strong>${fullName}</strong>,</p>
             <p><strong>"${ws.name}"</strong> atölyesine kaydınız başarıyla oluşturulmuştur.</p>
             ${wsDate ? `<p>📅 Tarih: <strong>${wsDate}</strong></p>` : ''}
             ${ws.location ? `<p>📍 Konum: <strong>${ws.location}</strong></p>` : ''}
             <p>Atölye programı hakkında daha fazla bilgi için sistemi ziyaret edebilirsiniz.</p>`
          : `<p>Dear <strong>${fullName}</strong>,</p>
             <p>Your registration for <strong>"${ws.name}"</strong> has been confirmed.</p>
             ${wsDate ? `<p>📅 Date: <strong>${wsDate}</strong></p>` : ''}
             ${ws.location ? `<p>📍 Location: <strong>${ws.location}</strong></p>` : ''}`
      )
    }
    return { success: true }
  }

  const unregisterFromWorkshop = async (workshopId) => {
    if (!loggedInUser) return { success: false, error: 'err_generic' }
    const ws = workshops.find(w => w.id === workshopId)
    const { error } = await supabase.from('workshop_registrations')
      .delete()
      .eq('workshop_id', workshopId)
      .eq('user_id', loggedInUser.id)
    if (error) return { success: false, error: error.message }
    setWorkshopRegistrations(prev => prev.filter(r => !(String(r.workshop_id) === String(workshopId) && String(r.user_id) === String(loggedInUser.id))))
    if (ws) logAudit('UNREGISTER_WORKSHOP', 'workshop', workshopId, `${loggedInUser.name} ${loggedInUser.surname} (${loggedInUser.email}) — ${ws.name}`)
    if (loggedInUser?.email && ws) {
      const fullName = `${loggedInUser.name || ''} ${loggedInUser.surname || ''}`.trim()
      sendAutoEmail(
        loggedInUser.email, fullName,
        language === 'TR' ? `Atölye Kaydınız İptal Edildi – ${ws.name}` : `Workshop Registration Cancelled – ${ws.name}`,
        language === 'TR'
          ? `<p>Sayın <strong>${fullName}</strong>,</p>
             <p><strong>"${ws.name}"</strong> atölyesine ait kaydınız iptal edilmiştir.</p>
             <p>Başka bir atölye programına kayıt olmak için sistemi ziyaret edebilirsiniz.</p>`
          : `<p>Dear <strong>${fullName}</strong>,</p>
             <p>Your registration for <strong>"${ws.name}"</strong> has been cancelled.</p>
             <p>You can register for other workshops by visiting the system.</p>`
      )
    }
    return { success: true }
  }

  const removeWorkshopRegistration = async (regId) => {
    const reg = workshopRegistrations.find(r => r.id === regId)
    const { data: deleted, error } = await supabase.from('workshop_registrations').delete().eq('id', regId).select('id')
    if (error) return { success: false, error: error.message }
    if (!deleted || deleted.length === 0) return { success: false, error: 'err_generic' }
    setWorkshopRegistrations(prev => prev.filter(r => r.id !== regId))
    if (reg) {
      const ws = workshops.find(w => String(w.id) === String(reg.workshop_id))
      logAudit('REMOVE_WORKSHOP_REG', 'workshop', reg.workshop_id, `${reg.user_name} ${reg.user_surname} (${reg.user_email})${ws ? ` — ${ws.name}` : ''}`)
    }
    return { success: true }
  }

  const toggleWorkshopAttendance = async (regId, attended) => {
    const { error } = await supabase.rpc('set_workshop_attendance', { p_reg_id: regId, p_attended: attended })
    if (error) return { success: false, error: error.message }
    setWorkshopRegistrations(prev => prev.map(r => r.id === regId ? { ...r, attended } : r))
    return { success: true }
  }

  const rescheduleAppointment = async (appointmentId, newDate, newTimeSlot) => {
    const appt = appointments.find(a => a.id === appointmentId)
    if (!appt) return { success: false, error: 'err_generic' }
    const lab = labs.find(l => String(l.id) === String(appt.lab_id))
    const maxCap = lab?.capacity_per_slot || 1
    const { count } = await supabase.from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('lab_id', appt.lab_id).eq('date', newDate).eq('time_slot', newTimeSlot)
      .in('status', ['PENDING', 'APPROVED']).neq('id', appointmentId)
    if (count >= maxCap) return { success: false, error: language === 'TR' ? 'Bu slot dolu.' : 'This slot is full.' }
    const updates = { date: newDate, time_slot: newTimeSlot }
    if (appt.status === 'APPROVED') updates.status = 'PENDING'
    const { error } = await supabase.from('appointments').update(updates).eq('id', appointmentId)
    if (error) return { success: false, error: error.message }
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, ...updates } : a))
    if (appt.status === 'APPROVED') {
      const msg = `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${newDate} ${newTimeSlot}`
      createNotification({ title: language === 'TR' ? 'Randevu Yeniden Planlandı' : 'Appointment Rescheduled', message: msg, type: 'SYSTEM' })
    }
    return { success: true }
  }

  const addAdmin = async ({ name, email, password, role, city_id, phone }) => {
    const normalizedEmail = email.trim().toLowerCase()
    const { data: existing } = await supabase.from('admins').select('id').eq('email', normalizedEmail).maybeSingle()
    if (existing) return { success: false, error: 'err_email_exists' }
    const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: password })
    if (hashErr || !hashed) return { success: false, error: 'err_generic' }
    const { data, error } = await supabase.from('admins').insert([{
      name, email: normalizedEmail, password_hash: hashed, role: role || 'CITY', city_id: city_id || null, phone: phone || ''
    }]).select('id,name,email,role,city_id,phone').single()
    if (error) {
      if (error.code === '23505') return { success: false, error: 'err_email_exists' }
      return { success: false, error: error.message }
    }
    setAdmins(prev => [...prev, data].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    logAudit('ADD_ADMIN', 'admin', data.id, `${name} (${normalizedEmail}) — ${role || 'CITY'}`)
    sendAutoEmail(
      normalizedEmail, name,
      language === 'TR' ? 'Yönetici Hesabınız Oluşturuldu – MEB ÖGEDEP' : 'Admin Account Created – MEB ÖGEDEP',
      language === 'TR'
        ? `<p>Sayın <strong>${name}</strong>,</p>
           <p>MEB ÖGEDEP sistemine <strong>${role === 'GLOBAL' ? 'Genel Yönetici' : 'İl Yöneticisi'}</strong> olarak hesabınız oluşturulmuştur.</p>
           <p>Giriş bilgileriniz:</p>
           <p>📧 E-posta: <strong>${normalizedEmail}</strong></p>
           <p>🔑 Şifre: <strong>${password}</strong></p>
           <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sisteme Giriş Yap</a></p>`
        : `<p>Dear <strong>${name}</strong>,</p>
           <p>An admin account has been created for you in the MEB ÖGEDEP system as <strong>${role === 'GLOBAL' ? 'Global Admin' : 'Province Admin'}</strong>.</p>
           <p>Your login credentials:</p>
           <p>📧 Email: <strong>${normalizedEmail}</strong></p>
           <p>🔑 Password: <strong>${password}</strong></p>
           <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to System</a></p>`
    )
    const cityObj = city_id ? cities.find(c => String(c.id) === String(city_id)) : null
    const prefix = cityObj ? `[${cityObj.name}] ` : ''
    await supabase.from('notifications').insert([{
      title: `${prefix}${language === 'TR' ? 'Yeni Yönetici Eklendi' : 'New Admin Added'}`,
      message: language === 'TR'
        ? `${name} (${normalizedEmail}) yönetici olarak eklendi.`
        : `${name} (${normalizedEmail}) has been added as admin.`,
      type: 'SYSTEM', timestamp: Date.now(), is_read: false,
    }])
    return { success: true }
  }

  const deleteAdmin = async (adminId) => {
    if (loggedInAdmin?.role !== 'GLOBAL') return { success: false, error: 'err_generic' }
    const target = admins.find(a => a.id === adminId)
    const { data: deleted, error } = await supabase.from('admins').delete().eq('id', adminId).select('id')
    if (error) return { success: false, error: error.message }
    if (!deleted || deleted.length === 0) return { success: false, error: 'err_generic' }
    setAdmins(prev => prev.filter(a => a.id !== adminId))
    if (target) logAudit('DELETE_ADMIN', 'admin', adminId, `${target.name} (${target.email})`)
    return { success: true }
  }

  const updateAdmin = async (adminId, updates) => {
    const { data, error } = await supabase.from('admins').update(updates).eq('id', adminId).select('id')
    if (error) return { success: false, error: error.message }
    if (!data || data.length === 0) return { success: false, error: 'err_update_failed' }
    setAdmins(prev => prev.map(a => a.id === adminId ? { ...a, ...updates } : a))
    if (loggedInAdmin?.id === adminId) setLoggedInAdmin(prev => ({ ...prev, ...updates }))
    return { success: true }
  }

  const resetAdminPasswordByGlobal = async (adminId, _email, newPassword) => {
    const target = admins.find(a => a.id === adminId)
    const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: newPassword })
    if (hashErr || !hashed) return { success: false, error: 'err_generic' }
    const { error } = await supabase.from('admins').update({ password_hash: hashed }).eq('id', adminId)
    if (error) return { success: false, error: error.message }
    if (target) logAudit('RESET_ADMIN_PASSWORD', 'admin', adminId, `${target.name} (${target.email})`)
    if (target?.email) {
      sendAutoEmail(
        target.email, target.name,
        language === 'TR' ? 'Şifreniz Güncellendi – MEB ÖGEDEP' : 'Password Updated – MEB ÖGEDEP',
        language === 'TR'
          ? `<p>Sayın <strong>${target.name}</strong>,</p>
             <p>Genel yönetici tarafından hesabınızın şifresi sıfırlanmıştır. Yeni şifreniz:</p>
             <p style="font-size:20px;font-weight:700;letter-spacing:0.1em;color:#1565C0;padding:12px 20px;background:#f0f4ff;border-radius:8px;display:inline-block">${newPassword}</p>
             <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sisteme Giriş Yap</a></p>`
          : `<p>Dear <strong>${target.name}</strong>,</p>
             <p>Your account password has been reset by a global admin. Your new password is:</p>
             <p style="font-size:20px;font-weight:700;letter-spacing:0.1em;color:#1565C0;padding:12px 20px;background:#f0f4ff;border-radius:8px;display:inline-block">${newPassword}</p>
             <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to System</a></p>`
      )
    }
    if (target) {
      const cityObj = target.city_id ? cities.find(c => String(c.id) === String(target.city_id)) : null
      const prefix = cityObj ? `[${cityObj.name}] ` : ''
      const { data: nd } = await supabase.from('notifications').insert([{
        title: `${prefix}${language === 'TR' ? 'Yönetici Şifresi Sıfırlandı' : 'Admin Password Reset'}`,
        message: language === 'TR'
          ? `${target.name} (${target.email}) adlı yöneticinin şifresi genel yönetici tarafından sıfırlandı.`
          : `Admin ${target.name} (${target.email}) had their password reset by a global admin.`,
        type: 'SYSTEM', timestamp: Date.now(), is_read: false,
      }]).select().single()
      if (nd) setNotifications(prev => [nd, ...prev])
    }
    return { success: true }
  }

  // Filter notifications to only show what's relevant to the current user/admin.
  // Global admins see everything. City admins see their city + global.
  // Regular users see their city + global, minus admin-only entries (e.g. registration requests).
  const visibleNotifications = useMemo(() => {
    if (loggedInAdmin?.role === 'GLOBAL') return notifications

    const entity = loggedInAdmin || loggedInUser
    if (!entity) return []

    const cityName = loggedInUser?.city_name
      || cities.find(c => String(c.id) === String(entity.city_id))?.name

    if (!cityName) return notifications

    return notifications.filter(n => {
      const prefixMatch = (n.title || '').match(/^\[([^\]]+)\]/)
      if (!prefixMatch) return true          // No city prefix → global, show to all
      if (prefixMatch[1] !== cityName) return false  // Different city → filter out

      // Hide admin-only notifications from regular users
      if (loggedInUser && !loggedInAdmin) {
        const title = n.title || ''
        if (title.includes('Yeni Üye Başvurusu') || title.includes('New Member Request')) return false
      }
      return true
    })
  }, [notifications, loggedInAdmin, loggedInUser, cities])

  // WAITLIST
  const [waitlist, setWaitlist] = useState([])

  const loadWaitlist = async (userEmail) => {
    if (!userEmail) return
    const { data } = await supabase.from('waitlist').select('*').eq('user_email', userEmail).eq('status', 'WAITING').order('created_at', { ascending: true })
    if (data) setWaitlist(data)
  }

  const addToWaitlist = async (slotData) => {
    const { data: existing } = await supabase.from('waitlist')
      .select('id').eq('lab_id', slotData.lab_id).eq('date', slotData.date).eq('time_slot', slotData.time_slot).eq('user_email', slotData.user_email).maybeSingle()
    if (existing) return { success: false, error: language === 'TR' ? 'Zaten bekleme listelesindesiniz.' : 'Already on the waitlist.' }
    const { data, error } = await supabase.from('waitlist').insert([{ ...slotData, status: 'WAITING' }]).select().single()
    if (error) return { success: false, error: error.message }
    setWaitlist(prev => [...prev, data])
    return { success: true }
  }

  const removeFromWaitlist = async (waitlistId) => {
    const { error } = await supabase.from('waitlist').delete().eq('id', waitlistId).eq('user_email', loggedInUser?.email)
    if (error) return { success: false, error: error.message }
    setWaitlist(prev => prev.filter(w => w.id !== waitlistId))
    return { success: true }
  }

  const notifyNextOnWaitlist = async (labId, date, timeSlot) => {
    const { data: next } = await supabase.from('waitlist')
      .select('*').eq('lab_id', labId).eq('date', date).eq('time_slot', timeSlot).eq('status', 'WAITING')
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
    if (!next) return
    const { error: wErr } = await supabase.from('waitlist').update({ status: 'NOTIFIED' }).eq('id', next.id)
    if (wErr) return
    const { error: nErr } = await supabase.from('notifications').insert([{
      title: language === 'TR' ? 'Bekleme Listesi: Slot Açıldı' : 'Waitlist: Slot Available',
      message: language === 'TR'
        ? `[${next.id}] ${next.lab_name} - ${next.date} ${next.time_slot} için bir yer açıldı. Lütfen randevu alın.`
        : `[${next.id}] A slot opened at ${next.lab_name} on ${next.date} ${next.time_slot}. Please book now.`,
      type: 'REMINDER', timestamp: Date.now(), is_read: false,
    }])
    if (nErr) {
      await supabase.from('waitlist').update({ status: 'WAITING' }).eq('id', next.id)
    }
  }

  const saveCertificateTemplate = async (data) => {
    try {
      const { id, ...fields } = data
      let result, error
      if (id) {
        ;({ data: result, error } = await supabase
          .from('certificate_templates')
          .update({ ...fields, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single())
      } else {
        ;({ data: result, error } = await supabase
          .from('certificate_templates')
          .insert(fields)
          .select()
          .single())
      }
      if (error) return { success: false, error: error.message }
      if (id) {
        setCertificateTemplates(prev => prev.map(t => t.id === id ? result : t))
      } else {
        setCertificateTemplates(prev => [...prev, result])
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  async function sendEmail({ recipients, subject, html }) {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { recipients, subject, html },
      })
      if (error) return { success: false, error: error.message }
      return { success: true, sent: data?.sent ?? 0, failed: data?.failed ?? 0, total: data?.total ?? 0 }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const requestPasswordReset = async (email) => {
    const normalizedEmail = email.toLowerCase().trim()
    const { data: admin } = await supabase
      .from('admins').select('id,name,surname,email')
      .eq('email', normalizedEmail).maybeSingle()
    if (admin) {
      const pool = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
      let raw = 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 22)]
              + 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 22)]
              + '23456789'[Math.floor(Math.random() * 8)]
              + '!@#$%'[Math.floor(Math.random() * 5)]
      for (let i = 0; i < 4; i++) raw += pool[Math.floor(Math.random() * pool.length)]
      const tempPw = raw.split('').sort(() => Math.random() - 0.5).join('')
      const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: tempPw })
      if (hashErr || !hashed) return { success: false, error: 'err_generic' }
      const { error } = await supabase.from('admins').update({ password_hash: hashed, must_change_password: true }).eq('id', admin.id)
      if (error) return { success: false, error: error.message }
      const fullName = `${admin.name || ''} ${admin.surname || ''}`.trim()
      sendAutoEmail(
        admin.email, fullName,
        language === 'TR' ? 'Geçici Şifreniz – MEB ÖGEDEP' : 'Temporary Password – MEB ÖGEDEP',
        language === 'TR'
          ? `<p>Sayın <strong>${fullName}</strong>,</p>
             <p>Şifre sıfırlama talebiniz alınmıştır. Geçici şifreniz:</p>
             <p style="font-size:22px;font-weight:700;letter-spacing:0.12em;color:#1565C0;padding:14px 24px;background:#f0f4ff;border-radius:8px;display:inline-block">${tempPw}</p>
             <p>Sisteme giriş yaptığınızda yeni bir şifre belirlemeniz istenecektir.</p>
             <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sisteme Giriş Yap</a></p>`
          : `<p>Dear <strong>${fullName}</strong>,</p>
             <p>A password reset has been requested. Your temporary password is:</p>
             <p style="font-size:22px;font-weight:700;letter-spacing:0.12em;color:#1565C0;padding:14px 24px;background:#f0f4ff;border-radius:8px;display:inline-block">${tempPw}</p>
             <p>You will be asked to set a new password upon logging in.</p>
             <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to System</a></p>`
      )
      return { success: true }
    }
    const { data: user } = await supabase
      .from('users').select('id,name,surname,email')
      .eq('email', normalizedEmail).maybeSingle()
    if (!user) return { success: false, error: 'err_user_not_found' }
    const pool = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let raw = 'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.floor(Math.random() * 22)]
            + 'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 22)]
            + '23456789'[Math.floor(Math.random() * 8)]
            + '!@#$%'[Math.floor(Math.random() * 5)]
    for (let i = 0; i < 4; i++) raw += pool[Math.floor(Math.random() * pool.length)]
    const tempPw = raw.split('').sort(() => Math.random() - 0.5).join('')
    const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: tempPw })
    if (hashErr || !hashed) return { success: false, error: 'err_generic' }
    const { error } = await supabase.from('users').update({ password_hash: hashed, must_change_password: true }).eq('id', user.id)
    if (error) return { success: false, error: error.message }
    const fullName = `${user.name || ''} ${user.surname || ''}`.trim()
    sendAutoEmail(
      user.email, fullName,
      language === 'TR' ? 'Geçici Şifreniz – MEB ÖGEDEP' : 'Temporary Password – MEB ÖGEDEP',
      language === 'TR'
        ? `<p>Sayın <strong>${fullName}</strong>,</p>
           <p>Şifre sıfırlama talebiniz alınmıştır. Geçici şifreniz:</p>
           <p style="font-size:22px;font-weight:700;letter-spacing:0.12em;color:#1565C0;padding:14px 24px;background:#f0f4ff;border-radius:8px;display:inline-block">${tempPw}</p>
           <p>Sisteme giriş yaptığınızda yeni bir şifre belirlemeniz istenecektir.</p>
           <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sisteme Giriş Yap</a></p>`
        : `<p>Dear <strong>${fullName}</strong>,</p>
           <p>A password reset has been requested. Your temporary password is:</p>
           <p style="font-size:22px;font-weight:700;letter-spacing:0.12em;color:#1565C0;padding:14px 24px;background:#f0f4ff;border-radius:8px;display:inline-block">${tempPw}</p>
           <p>You will be asked to set a new password upon logging in.</p>
           <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to System</a></p>`
    )
    return { success: true }
  }

  function sendAutoEmail(toEmail, toName, subject, bodyHtml) {
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px;color:#1a1a1a;padding:32px;max-width:600px;margin:0 auto">
      <div style="border-top:4px solid #1565C0;padding-top:20px;margin-bottom:24px">
        <p style="font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.1em;margin:0">MEB ÖGEDEP</p>
      </div>
      ${bodyHtml}
      <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px">
        <p style="font-size:11px;color:#9ca3af;margin:0">Bu e-posta otomatik olarak gönderilmiştir. Lütfen yanıtlamayınız.</p>
      </div>
    </body></html>`
    sendEmail({ recipients: [{ email: toEmail, name: toName }], subject, html }).catch(() => {})
  }

  const value = {
    loggedInUser, loggedInAdmin,
    language, isDarkMode,
    cities, labs, appointments, notifications: visibleNotifications, timeSlots, users, workshops, admins, workshopRegistrations, workshopRegistrationsAvailable, conversations, messagesAvailable, closedDays, certificateTemplates,
    loading, loadError,
    idleWarning, dismissIdleWarning,
    loadAllData,
    loginUser, loginAdmin, registerUser, addUserByAdmin, findUserForReset, resetPassword, requestPasswordReset, updateUserProfile, changePassword, changeAdminPassword, logout, uploadAvatar,
    toggleLanguage, toggleDarkMode,
    submitAppointment, approveAppointment, cancelAppointment, cancelOwnAppointment, submitCancellationRequest, denyCancellationRequest, markAppointmentCompleted,
    approveUser, revokeUser,
    markNotificationsRead, clearNotifications, createNotification, deleteNotification,
    addTimeSlot, removeTimeSlot,
    addLab, updateLab, deleteLab, forceDeleteLab,
    addWorkshop, updateWorkshop, deleteWorkshop,
    registerForWorkshop, unregisterFromWorkshop, toggleWorkshopAttendance, removeWorkshopRegistration,
    rescheduleAppointment,
    addClosedDay, removeClosedDay, isDateClosed,
    getOrCreateConversation, loadConversationMessages, sendMessage, markConversationRead,
    addAdmin, updateAdmin, deleteAdmin, resetAdminPasswordByGlobal,
    waitlist, loadWaitlist, addToWaitlist, removeFromWaitlist, notifyNextOnWaitlist,
    saveCertificateTemplate,
    sendEmail,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { t, getLocale } from '../lib/languages'
import { AuthContext, generateTempPassword } from './AuthContext'

export const DataContext = createContext(null)

export function DataProvider({ children }) {
  const { loggedInUser, loggedInAdmin, language, setLoggedInUser, setLoggedInAdmin } = useContext(AuthContext)

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
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [waitlist, setWaitlist] = useState([])
  const rtChannelsRef = useRef([])

  // Logout cleanup: when both user and admin become null, tear down realtime channels
  const prevLoggedInRef = useRef(!!(loggedInUser || loggedInAdmin))
  useEffect(() => {
    const isLoggedIn = !!(loggedInUser || loggedInAdmin)
    if (prevLoggedInRef.current && !isLoggedIn) {
      rtChannelsRef.current.forEach(ch => supabase.removeChannel(ch))
      rtChannelsRef.current = []
      setWaitlist([])
    }
    prevLoggedInRef.current = isLoggedIn
  }, [loggedInUser, loggedInAdmin])

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

  // Realtime subscriptions
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

  // Waitlist realtime subscription — scoped to logged-in user
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

  // Load waitlist entries when user logs in
  useEffect(() => { if (loggedInUser?.email) loadWaitlist(loggedInUser.email) }, [loggedInUser?.email])

  // Create reminder notifications for upcoming appointments on user login
  const loginUserIdRef = useRef(loggedInUser?.id ?? null)
  useEffect(() => {
    const currentId = loggedInUser?.id ?? null
    if (currentId && currentId !== loginUserIdRef.current) {
      loginUserIdRef.current = currentId
      const createReminderNotifications = async () => {
        const today = new Date()
        const in2days = new Date(today); in2days.setDate(today.getDate() + 2)
        const todayStr = today.toISOString().split('T')[0]
        const in2daysStr = in2days.toISOString().split('T')[0]
        const { data: upcoming } = await supabase
          .from('appointments')
          .select('id, lab_name, date, time_slot')
          .eq('user_email', loggedInUser.email)
          .in('status', ['APPROVED'])
          .gte('date', todayStr)
          .lte('date', in2daysStr)
        if (upcoming && upcoming.length > 0) {
          const toInsert = []
          for (const appt of upcoming) {
            const { data: existing } = await supabase.from('notifications')
              .select('id').eq('type', 'REMINDER').ilike('message', `%${appt.id}%`).maybeSingle()
            if (!existing) {
              toInsert.push({
                title: t('notif_reminder_title', language),
                message: `[${appt.id}] ${t('notif_reminder_msg', language).replace('{lab}', appt.lab_name).replace('{date}', appt.date).replace('{slot}', appt.time_slot)}`,
                type: 'REMINDER',
                timestamp: Date.now(),
                is_read: false,
              })
            }
          }
          if (toInsert.length > 0) {
            const { data: inserted, error: insertErr } = await supabase.from('notifications').insert(toInsert).select()
            if (!insertErr && inserted) setNotifications(prev => [...inserted, ...prev])
          }
        }
      }
      createReminderNotifications()
    }
    if (!currentId) loginUserIdRef.current = null
  }, [loggedInUser?.id])

  // EMAIL UTILITIES
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

  function sendAutoEmail(toEmail, toName, subject, bodyHtml) {
    const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;font-size:14px;color:#1a1a1a;padding:32px;max-width:600px;margin:0 auto">
      <div style="border-top:4px solid #1565C0;padding-top:20px;margin-bottom:24px">
        <p style="font-size:11px;font-weight:700;color:#1565C0;text-transform:uppercase;letter-spacing:0.1em;margin:0">MEB ÖGEDEP</p>
      </div>
      ${bodyHtml}
      <div style="border-top:1px solid #e5e7eb;margin-top:32px;padding-top:16px">
        <p style="font-size:11px;color:#9ca3af;margin:0">${t('email_footer_auto', language)}</p>
      </div>
    </body></html>`
    sendEmail({ recipients: [{ email: toEmail, name: toName }], subject, html }).catch(err => console.error('[sendAutoEmail] failed:', err))
  }

  // AUDIT LOGGER
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

  // AUTH-ADJACENT DATA OPERATIONS
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
    if (!newUser) return { success: false, error: 'err_generic' }
    setUsers(prev => [...prev, newUser].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    logAudit('ADD_USER_BY_ADMIN', 'user', newUser.id, `${newUser.name} ${newUser.surname} (${email})`)

    if (email) {
      const fullName = `${formData.name || ''} ${formData.surname || ''}`.trim()
      sendAutoEmail(
        email, fullName,
        t('email_subj_account_created', language),
        `<p>${t('email_dear', language)} <strong>${fullName}</strong>,</p>
         <p>${t('email_p_account_created', language)}</p>
         <p>📧 ${t('input_email', language)}: <strong>${email}</strong></p>
         <p>${t('email_p_credentials_shared', language)}</p>
         <p>${t('email_p_must_change_pw', language)}</p>
         <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${t('email_link_go_to_system', language)}</a></p>`
      )
    }
    return { success: true, password: formData.password }
  }

  const updateUserProfile = async (userId, updates) => {
    const { data: updated, error } = await supabase.from('users').update(updates).eq('id', userId).select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
    setLoggedInUser(prev => ({ ...prev, ...updates }))
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u))
    return { success: true }
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
        t('email_subj_password_updated', language),
        `<p>${t('email_dear', language)} <strong>${fullName}</strong>,</p>
         <p>${t('email_p_pw_reset_user', language)}</p>
         <p style="font-size:20px;font-weight:700;letter-spacing:0.1em;color:#1565C0;padding:12px 20px;background:#f0f4ff;border-radius:8px;display:inline-block">${newPassword}</p>
         <p>${t('email_p_must_change_pw', language)}</p>
         <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${t('email_link_go_to_system', language)}</a></p>`
      )
    }
    return { success: true }
  }

  const requestPasswordReset = async (email) => {
    const normalizedEmail = email.toLowerCase().trim()
    const { data: admin } = await supabase
      .from('admins').select('id,name,surname,email')
      .eq('email', normalizedEmail).maybeSingle()
    if (admin) {
      const tempPw = generateTempPassword()
      const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: tempPw })
      if (hashErr || !hashed) return { success: false, error: 'err_generic' }
      const { data: updatedAdmin, error } = await supabase.from('admins').update({ password_hash: hashed, must_change_password: true }).eq('id', admin.id).select('id')
      if (error) return { success: false, error: error.message }
      if (!updatedAdmin || updatedAdmin.length === 0) return { success: false, error: 'err_generic' }
      const fullName = `${admin.name || ''} ${admin.surname || ''}`.trim()
      sendAutoEmail(
        admin.email, fullName,
        t('email_subj_temp_password', language),
        `<p>${t('email_dear', language)} <strong>${fullName}</strong>,</p>
         <p>${t('email_p_pw_reset_request', language)}</p>
         <p style="font-size:22px;font-weight:700;letter-spacing:0.12em;color:#1565C0;padding:14px 24px;background:#f0f4ff;border-radius:8px;display:inline-block">${tempPw}</p>
         <p>${t('email_p_pw_reset_prompt', language)}</p>
         <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${t('email_link_go_to_system', language)}</a></p>`
      )
      return { success: true }
    }
    const { data: user } = await supabase
      .from('users').select('id,name,surname,email')
      .eq('email', normalizedEmail).maybeSingle()
    if (!user) return { success: false, error: 'err_user_not_found' }
    const tempPw = generateTempPassword()
    const { data: hashed, error: hashErr } = await supabase.rpc('hash_password_bcrypt', { p_password: tempPw })
    if (hashErr || !hashed) return { success: false, error: 'err_generic' }
    const { data: updatedUser, error } = await supabase.from('users').update({ password_hash: hashed, must_change_password: true }).eq('id', user.id).select('id')
    if (error) return { success: false, error: error.message }
    if (!updatedUser || updatedUser.length === 0) return { success: false, error: 'err_generic' }
    const fullName = `${user.name || ''} ${user.surname || ''}`.trim()
    sendAutoEmail(
      user.email, fullName,
      t('email_subj_temp_password', language),
      `<p>${t('email_dear', language)} <strong>${fullName}</strong>,</p>
       <p>${t('email_p_pw_reset_request', language)}</p>
       <p style="font-size:22px;font-weight:700;letter-spacing:0.12em;color:#1565C0;padding:14px 24px;background:#f0f4ff;border-radius:8px;display:inline-block">${tempPw}</p>
       <p>${t('email_p_pw_reset_prompt', language)}</p>
       <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${t('email_link_go_to_system', language)}</a></p>`
    )
    return { success: true }
  }

  // APPOINTMENT ACTIONS
  const submitAppointment = async (appointmentData) => {
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
      if (msg.includes('err_slot_full')) return { success: false, error: 'err_slot_full' }
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
          title: `[${cityName}] ${t('notif_appt_approved_title', language)}`,
          message: t('notif_appt_approved_msg', language)
            .replace('{teacher}', appt.user_name || appt.user_email || '')
            .replace('{lab}', appt.lab_name || '')
            .replace('{date}', finalDate),
          type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
        }
        const { data: nd } = await supabase.from('notifications').insert([notifData]).select().single()
        if (nd) setNotifications(prev => [nd, ...prev])
      }
    }
    if (appt?.user_email) {
      const userName = `${appt.user_name || ''} ${appt.user_surname || ''}`.trim() || appt.user_email
      const fmtDate = finalDate ? new Date(finalDate + 'T12:00:00').toLocaleDateString(getLocale(language), { day: 'numeric', month: 'long', year: 'numeric' }) : ''
      sendAutoEmail(
        appt.user_email, userName,
        t('email_subj_appt_approved', language).replace('{lab}', appt.lab_name || ''),
        `<p>${t('email_dear', language)} <strong>${userName}</strong>,</p>
         <p>${t('email_p_appt_approved', language).replace('{lab}', `<strong>${appt.lab_name || ''}</strong>`)}</p>
         ${fmtDate ? `<p>📅 ${t('email_p_appt_date', language)} <strong>${fmtDate}</strong></p>` : ''}
         ${finalSlot ? `<p>🕐 ${t('email_p_appt_time', language)} <strong>${finalSlot}</strong></p>` : ''}`
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
          title: `[${cityName}] ${t('notif_appt_cancelled_title', language)}`,
          message: t('notif_appt_cancelled_admin_msg', language)
            .replace('{teacher}', appt.user_name || appt.user_email || '')
            .replace('{lab}', appt.lab_name || '')
            .replace('{date}', appt.date),
          type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
        }
        const { data: nd } = await supabase.from('notifications').insert([notifData]).select().single()
        if (nd) setNotifications(prev => [nd, ...prev])
      }
      notifyNextOnWaitlist(appt.lab_id, appt.date, appt.time_slot)
    }
    if (appt?.user_email) {
      const userName = `${appt.user_name || ''} ${appt.user_surname || ''}`.trim() || appt.user_email
      const fmtDate = appt.date ? new Date(appt.date + 'T12:00:00').toLocaleDateString(getLocale(language), { day: 'numeric', month: 'long', year: 'numeric' }) : ''
      sendAutoEmail(
        appt.user_email, userName,
        t('email_subj_appt_cancelled', language).replace('{lab}', appt.lab_name || ''),
        `<p>${t('email_dear', language)} <strong>${userName}</strong>,</p>
         <p>${(fmtDate
           ? t('email_p_appt_cancelled', language).replace('{lab}', `<strong>${appt.lab_name || ''}</strong>`).replace('{date}', `<strong>${fmtDate}</strong>`)
           : t('email_p_appt_cancelled_nodate', language).replace('{lab}', `<strong>${appt.lab_name || ''}</strong>`)
         )}</p>
         <p>${t('email_p_book_new_appt', language)}</p>`
      )
    }
    return { success: true }
  }

  const cancelOwnAppointment = async (id) => {
    const appt = appointments.find(a => a.id === id)
    if (!appt || appt.user_email !== loggedInUser?.email || appt.status !== 'PENDING') {
      return { success: false, error: 'err_generic' }
    }
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
      const { data: nd } = await supabase.from('notifications').insert([{
        title: `[${cityName}] ${t('notif_appt_cancelled_title', language)}`,
        message: t('notif_appt_cancelled_user_msg', language)
          .replace('{teacher}', userName)
          .replace('{lab}', appt.lab_name || '')
          .replace('{date}', appt.date),
        type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
      }]).select().single()
      if (nd) setNotifications(prev => [nd, ...prev])
    }
    notifyNextOnWaitlist(appt.lab_id, appt.date, appt.time_slot)
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
        const { data: nd } = await supabase.from('notifications').insert([{
          title: `[${cityName}] ${t('notif_cancel_requested_title', language)}`,
          message: t('notif_cancel_requested_msg', language)
            .replace('{teacher}', userName)
            .replace('{lab}', appt.lab_name || '')
            .replace('{date}', appt.date),
          type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
        }]).select().single()
        if (nd) setNotifications(prev => [nd, ...prev])
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
          title: `[${cityName}] ${t('notif_cancellation_denied_title', language)}`,
          message: t('notif_cancellation_denied_msg', language)
            .replace('{teacher}', `${appt.user_name || ''} ${appt.user_surname || ''}`.trim())
            .replace('{lab}', appt.lab_name || '')
            .replace('{date}', appt.date),
          type: 'APPOINTMENT', timestamp: Date.now(), is_read: false,
        }]).select().single()
        if (nd) setNotifications(prev => [nd, ...prev])
      }
    }
    if (appt?.user_email) {
      const userName = `${appt.user_name || ''} ${appt.user_surname || ''}`.trim() || appt.user_email
      const fmtDate = appt.date ? new Date(appt.date + 'T12:00:00').toLocaleDateString(getLocale(language), { day: 'numeric', month: 'long', year: 'numeric' }) : ''
      sendAutoEmail(
        appt.user_email, userName,
        t('email_subj_cancellation_denied', language),
        `<p>${t('email_dear', language)} <strong>${userName}</strong>,</p>
         <p>${(fmtDate
           ? t('email_p_cancellation_denied', language).replace('{lab}', `<strong>${appt.lab_name || ''}</strong>`).replace('{date}', `<strong>${fmtDate}</strong>`)
           : t('email_p_cancellation_denied_nd', language).replace('{lab}', `<strong>${appt.lab_name || ''}</strong>`)
         )}</p>
         <p>${t('email_p_appt_still_approved', language)}</p>`
      )
    }
    return { success: true }
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
        t('email_subj_membership_approved', language),
        `<p>${t('email_dear', language)} <strong>${fullName}</strong>,</p>
         <p>${t('email_p_membership_approved', language)}</p>
         <p>${t('email_p_membership_can_book', language)}</p>
         <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${t('email_link_go_to_system', language)}</a></p>`
      )
    }
    if (user) {
      const cityName = user.city_name || cities.find(c => String(c.id) === String(user.city_id))?.name
      if (cityName) {
        const notifData = {
          title: `[${cityName}] ${t('notif_membership_approved_title', language)}`,
          message: t('notif_membership_approved_msg', language).replace('{name}', `${user.name || ''} ${user.surname || ''}`),
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
    const activeStatuses = ['PENDING', 'APPROVED', 'CANCELLATION_REQUESTED']
    const activeAppts = appointments.filter(a => a.user_email === user?.email && activeStatuses.includes(a.status))
    if (activeAppts.length > 0) {
      const { error: cancelErr } = await supabase.from('appointments').update({ status: 'CANCELLED' }).in('id', activeAppts.map(a => a.id))
      if (!cancelErr) setAppointments(prev => prev.map(a => activeAppts.some(aa => aa.id === a.id) ? { ...a, status: 'CANCELLED' } : a))
    }
    const { data: deleted, error } = await supabase.from('users').delete().eq('id', userId).select('id')
    if (error) return { success: false, error: error.message }
    if (!deleted || deleted.length === 0) return { success: false, error: 'err_generic' }
    setUsers(prev => prev.filter(u => u.id !== userId))
    if (user) logAudit('REVOKE_USER', 'user', userId, `${user.name} ${user.surname} (${user.email})`)
    if (user) {
      const cityName = user.city_name || cities.find(c => String(c.id) === String(user.city_id))?.name
      if (cityName) {
        const teacher = `${user.name || ''} ${user.surname || ''}`.trim()
        const notifData = {
          title: t('notif_revoke_user_title', language).replace('{city}', cityName),
          message: t('notif_revoke_user_msg', language).replace('{teacher}', teacher),
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
    logAudit('CLEAR_NOTIFICATIONS', 'notifications', null, cityName ? t('audit_detail_city_notifs', language).replace('{city}', cityName) : t('audit_detail_all_notifs', language))
    return { success: true }
  }

  const createNotification = async ({ title, message, type }) => {
    const { data, error } = await supabase
      .from('notifications')
      .insert([{ title, message, type, timestamp: Date.now(), is_read: false }])
      .select()
      .single()
    if (error) return { success: false, error: error.message }
    if (!data) return { success: false, error: 'err_generic' }
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
    const cityName = cities.find(c => String(c.id) === String(cityId))?.name || cityId
    logAudit('ADD_TIME_SLOT', 'city_time_slot', null, `${timeRange}${location ? ` — ${location}` : ''} (${cityName})`)
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
    if (slot) {
      const cityName = cities.find(c => String(c.id) === String(slot.city_id))?.name || slot.city_id
      logAudit('REMOVE_TIME_SLOT', 'city_time_slot', id, `${slot.time_range}${slot.location ? ` — ${slot.location}` : ''} (${cityName})`)
    }
    return { success: true }
  }

  // LAB ACTIONS
  const addLab = async (labData) => {
    const { error } = await supabase.from('laboratories').insert([labData])
    if (error) return { success: false, error: error.message }
    const { data: all } = await supabase.from('laboratories').select('*')
    if (all) setLabs(all)
    logAudit('ADD_LAB', 'laboratory', null, labData.name || '')
    return { success: true }
  }

  const updateLab = async (id, updates) => {
    const { data, error } = await supabase.from('laboratories').update(updates).eq('id', id).select('id')
    if (error) {
      const { error: e2 } = await supabase.from('laboratories').update(updates).eq('id', id)
      if (e2) return { success: false, error: e2.message }
    } else if (!data || data.length === 0) {
      return { success: false, error: 'err_update_failed' }
    }
    setLabs(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    const lab = labs.find(l => l.id === id)
    if (lab) logAudit('UPDATE_LAB', 'laboratory', id, lab.name)
    return { success: true }
  }

  const deleteLab = async (id) => {
    const hasActive = appointments.some(a =>
      String(a.lab_id) === String(id) &&
      (a.status === 'PENDING' || a.status === 'APPROVED')
    )
    if (hasActive) return { success: false, error: 'err_lab_has_appointments' }

    const lab = labs.find(l => l.id === id)
    const { error } = await supabase.from('laboratories').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    const { data: all } = await supabase.from('laboratories').select('*')
    if (all) {
      if (all.some(l => l.id === id)) return { success: false, error: 'err_update_failed' }
      setLabs(all)
    } else {
      setLabs(prev => prev.filter(l => l.id !== id))
    }
    if (lab) logAudit('DELETE_LAB', 'laboratory', id, lab.name)
    return { success: true }
  }

  const forceDeleteLab = async (id) => {
    const lab = labs.find(l => l.id === id)
    const { error } = await supabase.from('laboratories').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    const { data: all } = await supabase.from('laboratories').select('*')
    if (all) setLabs(all)
    else setLabs(prev => prev.filter(l => l.id !== id))
    if (lab) logAudit('DELETE_LAB', 'laboratory', id, t('audit_detail_force_deleted', language).replace('{name}', lab.name))
    return { success: true }
  }

  const addWorkshop = async (data) => {
    const { error } = await supabase.from('workshops').insert([{ ...data, created_at: Date.now() }])
    if (error) return { success: false, error: error.message }
    const { data: all } = await supabase.from('workshops').select('*')
    if (all) setWorkshops(all)
    logAudit('ADD_WORKSHOP', 'workshop', null, data.name || '')
    return { success: true }
  }

  const updateWorkshop = async (id, updates) => {
    const { data: rows, error } = await supabase.from('workshops').update(updates).eq('id', id).select('id')
    if (error) return { success: false, error: error.message }
    if (!rows || rows.length === 0) return { success: false, error: 'err_update_failed' }
    const { data: all } = await supabase.from('workshops').select('*')
    if (all) setWorkshops(all)
    else setWorkshops(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w))
    const ws = workshops.find(w => w.id === id)
    if (ws) logAudit('UPDATE_WORKSHOP', 'workshop', id, ws.name)
    return { success: true }
  }

  const deleteWorkshop = async (id) => {
    const ws = workshops.find(w => w.id === id)
    const { error } = await supabase.from('workshops').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    const { data: all } = await supabase.from('workshops').select('*')
    if (all) {
      if (all.some(w => w.id === id)) return { success: false, error: 'err_update_failed' }
      setWorkshops(all)
    } else {
      setWorkshops(prev => prev.filter(w => w.id !== id))
    }
    if (ws) logAudit('DELETE_WORKSHOP', 'workshop', id, ws.name)
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
    if (!data) return { success: false, error: 'err_generic' }
    setClosedDays(prev => [...prev, data].sort((a, b) => a.date.localeCompare(b.date)))
    const cityName = cityId ? (cities.find(c => String(c.id) === String(cityId))?.name || cityId) : t('filter_all_provinces', language)
    logAudit('ADD_CLOSED_DAY', 'closed_day', data.id, `${date} — ${cityName}${reason ? ` (${reason})` : ''}`)
    return { success: true }
  }

  const removeClosedDay = async (id) => {
    const day = closedDays.find(d => d.id === id)
    const { data: deleted, error } = await supabase.from('closed_days').delete().eq('id', id).select('id')
    if (error) return { success: false, error: error.message }
    if (!deleted || deleted.length === 0) return { success: false, error: 'err_generic' }
    setClosedDays(prev => prev.filter(d => d.id !== id))
    if (day) {
      const cityName = day.city_id ? (cities.find(c => String(c.id) === String(day.city_id))?.name || day.city_id) : t('filter_all_provinces', language)
      logAudit('REMOVE_CLOSED_DAY', 'closed_day', id, `${day.date} — ${cityName}`)
    }
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
    if (!data) return { success: false, error: 'err_generic' }
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
    if (!data) return { success: false, error: 'err_generic' }
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

  // WORKSHOP ACTIONS
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
    if (!data) return { success: false, error: 'err_generic' }
    setWorkshopRegistrations(prev => [...prev, data])
    logAudit('REGISTER_WORKSHOP', 'workshop', workshopId, `${loggedInUser.name} ${loggedInUser.surname} (${loggedInUser.email}) — ${ws.name}`)
    if (loggedInUser?.email && ws) {
      const fullName = `${loggedInUser.name || ''} ${loggedInUser.surname || ''}`.trim()
      const wsDate = ws.date ? new Date(ws.date + 'T12:00:00').toLocaleDateString(getLocale(language), { day: 'numeric', month: 'long', year: 'numeric' }) : ''
      sendAutoEmail(
        loggedInUser.email, fullName,
        t('email_subj_workshop_confirmed', language).replace('{name}', ws.name),
        `<p>${t('email_dear', language)} <strong>${fullName}</strong>,</p>
         <p>${t('email_p_workshop_confirmed', language).replace('{workshop}', ws.name)}</p>
         ${wsDate ? `<p>📅 ${t('email_p_appt_date', language)} <strong>${wsDate}</strong></p>` : ''}
         ${ws.location ? `<p>📍 ${t('email_p_appt_location', language)} <strong>${ws.location}</strong></p>` : ''}
         <p>${t('email_p_workshop_visit', language)}</p>`
      )
    }
    return { success: true }
  }

  const unregisterFromWorkshop = async (workshopId) => {
    if (!loggedInUser) return { success: false, error: 'err_generic' }
    const ws = workshops.find(w => w.id === workshopId)
    const { data: deleted, error } = await supabase.from('workshop_registrations')
      .delete()
      .eq('workshop_id', workshopId)
      .eq('user_id', loggedInUser.id)
      .select('id')
    if (error) return { success: false, error: error.message }
    if (!deleted || deleted.length === 0) return { success: false, error: 'err_generic' }
    setWorkshopRegistrations(prev => prev.filter(r => !(String(r.workshop_id) === String(workshopId) && String(r.user_id) === String(loggedInUser.id))))
    if (ws) logAudit('UNREGISTER_WORKSHOP', 'workshop', workshopId, `${loggedInUser.name} ${loggedInUser.surname} (${loggedInUser.email}) — ${ws.name}`)
    if (loggedInUser?.email && ws) {
      const fullName = `${loggedInUser.name || ''} ${loggedInUser.surname || ''}`.trim()
      sendAutoEmail(
        loggedInUser.email, fullName,
        t('email_subj_workshop_cancelled', language).replace('{name}', ws.name),
        `<p>${t('email_dear', language)} <strong>${fullName}</strong>,</p>
         <p>${t('email_p_workshop_cancelled', language).replace('{workshop}', ws.name)}</p>
         <p>${t('email_p_workshop_other', language)}</p>`
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
    if (count >= maxCap) return { success: false, error: t('err_slot_full', language) }
    const updates = { date: newDate, time_slot: newTimeSlot }
    if (appt.status === 'APPROVED') updates.status = 'PENDING'
    const { data: updated, error } = await supabase.from('appointments').update(updates).eq('id', appointmentId).select('id')
    if (error) return { success: false, error: error.message }
    if (!updated || updated.length === 0) return { success: false, error: 'err_generic' }
    setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, ...updates } : a))
    logAudit('RESCHEDULE_APPOINTMENT', 'appointment', appointmentId, `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${newDate} ${newTimeSlot}`)
    notifyNextOnWaitlist(appt.lab_id, appt.date, appt.time_slot)
    if (appt.status === 'APPROVED') {
      const cityName = cities.find(c => String(c.id) === String(appt.city_id))?.name
      const prefix = cityName ? `[${cityName}] ` : ''
      const msg = `${appt.user_name} ${appt.user_surname} — ${appt.lab_name} — ${newDate} ${newTimeSlot}`
      createNotification({ title: `${prefix}${t('notif_appt_rescheduled_title', language)}`, message: msg, type: 'SYSTEM' })
    }
    return { success: true }
  }

  // ADMIN MANAGEMENT
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
    if (!data) return { success: false, error: 'err_generic' }
    setAdmins(prev => [...prev, data].sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    logAudit('ADD_ADMIN', 'admin', data.id, `${name} (${normalizedEmail}) — ${role || 'CITY'}`)
    sendAutoEmail(
      normalizedEmail, name,
      t('email_subj_admin_created', language),
      `<p>${t('email_dear', language)} <strong>${name}</strong>,</p>
       <p>${t('email_p_admin_created', language).replace('{role}', `<strong>${role === 'GLOBAL' ? t('email_role_global', language) : t('email_role_city', language)}</strong>`)}</p>
       <p>📧 ${t('input_email', language)}: <strong>${normalizedEmail}</strong></p>
       <p>${t('email_p_credentials_shared', language)}</p>
       <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${t('email_link_go_to_system', language)}</a></p>`
    )
    const cityObj = city_id ? cities.find(c => String(c.id) === String(city_id)) : null
    const prefix = cityObj ? `[${cityObj.name}] ` : ''
    const { data: nd } = await supabase.from('notifications').insert([{
      title: `${prefix}${t('notif_admin_added_title', language)}`,
      message: t('notif_admin_added_msg', language).replace('{name}', name).replace('{email}', normalizedEmail),
      type: 'SYSTEM', timestamp: Date.now(), is_read: false,
    }]).select().single()
    if (nd) setNotifications(prev => [nd, ...prev])
    return { success: true, password }
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
    const target = admins.find(a => a.id === adminId)
    if (target) logAudit('EDIT_ADMIN', 'admin', adminId, `${target.name} (${target.email})`)
    return { success: true }
  }

  const resetAdminPasswordByGlobal = async (adminId, _email, newPassword) => {
    const target = admins.find(a => a.id === adminId)
    const { data: ok, error } = await supabase.rpc('reset_admin_password_by_global', {
      p_admin_id: adminId,
      p_new_password: newPassword,
    })
    if (error) return { success: false, error: error.message }
    if (!ok) return { success: false, error: 'err_generic' }
    setAdmins(prev => prev.map(a => a.id === adminId ? { ...a, must_change_password: true } : a))
    if (target) logAudit('RESET_ADMIN_PASSWORD', 'admin', adminId, `${target.name} (${target.email})`)
    if (target?.email) {
      sendAutoEmail(
        target.email, target.name,
        t('email_subj_password_updated', language),
        `<p>${t('email_dear', language)} <strong>${target.name}</strong>,</p>
         <p>${t('email_p_pw_reset_admin', language)}</p>
         <p style="font-size:20px;font-weight:700;letter-spacing:0.1em;color:#1565C0;padding:12px 20px;background:#f0f4ff;border-radius:8px;display:inline-block">${newPassword}</p>
         <p style="margin-top:24px"><a href="${window.location.origin}" style="background:#1565C0;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">${t('email_link_go_to_system', language)}</a></p>`
      )
    }
    if (target) {
      const cityObj = target.city_id ? cities.find(c => String(c.id) === String(target.city_id)) : null
      const prefix = cityObj ? `[${cityObj.name}] ` : ''
      const { data: nd } = await supabase.from('notifications').insert([{
        title: `${prefix}${t('notif_admin_pw_reset_title', language)}`,
        message: t('notif_admin_pw_reset_msg', language).replace('{name}', target.name).replace('{email}', target.email),
        type: 'SYSTEM', timestamp: Date.now(), is_read: false,
      }]).select().single()
      if (nd) setNotifications(prev => [nd, ...prev])
    }
    return { success: true }
  }

  // WAITLIST
  const loadWaitlist = async (userEmail) => {
    if (!userEmail) return
    const { data } = await supabase.from('waitlist').select('*').eq('user_email', userEmail).eq('status', 'WAITING').order('created_at', { ascending: true })
    if (data) setWaitlist(data)
  }

  const addToWaitlist = async (slotData) => {
    const { data: existing } = await supabase.from('waitlist')
      .select('id').eq('lab_id', slotData.lab_id).eq('date', slotData.date).eq('time_slot', slotData.time_slot).eq('user_email', slotData.user_email).maybeSingle()
    if (existing) return { success: false, error: t('err_already_on_waitlist', language) }
    const { data, error } = await supabase.from('waitlist').insert([{ ...slotData, status: 'WAITING' }]).select().single()
    if (error) return { success: false, error: error.message }
    if (!data) return { success: false, error: 'err_generic' }
    setWaitlist(prev => [...prev, data])
    return { success: true }
  }

  const removeFromWaitlist = async (waitlistId) => {
    const { data: deleted, error } = await supabase.from('waitlist').delete().eq('id', waitlistId).eq('user_email', loggedInUser?.email).select('id')
    if (error) return { success: false, error: error.message }
    if (!deleted || deleted.length === 0) return { success: false, error: 'err_generic' }
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
    const waitlistLab = labs.find(l => String(l.id) === String(labId))
    const waitlistCity = waitlistLab?.city_id ? cities.find(c => String(c.id) === String(waitlistLab.city_id)) : null
    const waitlistPrefix = waitlistCity ? `[${waitlistCity.name}] ` : ''
    const { error: nErr } = await supabase.from('notifications').insert([{
      title: `${waitlistPrefix}${t('notif_waitlist_available_title', language)}`,
      message: t('notif_waitlist_available_msg', language)
        .replace('{lab}', next.lab_name)
        .replace('{date}', next.date)
        .replace('{slot}', next.time_slot),
      type: 'REMINDER', timestamp: Date.now(), is_read: false,
    }])
    if (nErr) {
      await supabase.from('waitlist').update({ status: 'WAITING' }).eq('id', next.id)
    }
  }

  // CERTIFICATE TEMPLATES
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
      if (!result) return { success: false, error: 'err_generic' }
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

  // Filtered notifications for the current session entity
  const visibleNotifications = useMemo(() => {
    if (loggedInAdmin?.role === 'GLOBAL') return notifications

    const entity = loggedInAdmin || loggedInUser
    if (!entity) return []

    const cityName = loggedInUser?.city_name
      || cities.find(c => String(c.id) === String(entity.city_id))?.name

    if (!cityName) return notifications

    return notifications.filter(n => {
      const prefixMatch = (n.title || '').match(/^\[([^\]]+)\]/)
      if (!prefixMatch) return true
      if (prefixMatch[1] !== cityName) return false

      if (loggedInUser && !loggedInAdmin) {
        if (n.type === 'ADMIN_ONLY') return false
        const title = n.title || ''
        if (title.includes('Yeni Üye Başvurusu') || title.includes('New Member Request')) return false
      }
      return true
    })
  }, [notifications, loggedInAdmin, loggedInUser, cities])

  const value = {
    cities, labs, appointments, notifications: visibleNotifications, timeSlots, users, workshops,
    admins, workshopRegistrations, workshopRegistrationsAvailable, conversations, messagesAvailable,
    closedDays, certificateTemplates, loading, loadError,
    loadAllData,
    addUserByAdmin, updateUserProfile, resetPassword, requestPasswordReset,
    submitAppointment, approveAppointment, cancelAppointment, cancelOwnAppointment,
    submitCancellationRequest, denyCancellationRequest, markAppointmentCompleted,
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

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}

import { useState, useMemo, useRef, useEffect } from 'react'
import { Download } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { t, translations } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { PAGE_SIZE } from '../../lib/adminHelpers'
import UserCard from '../../components/admin/UserCard'
import ResetPasswordModal from '../../components/admin/ResetPasswordModal'
import PasswordInput from '../../components/PasswordInput'
import { isPasswordStrong, generateTempPassword } from '../../lib/passwordUtils'

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export default function UserApprovalsTab({ language, isGlobal, adminCityId, onRequestConfirm }) {
  const { cities, users, appointments, approveUser, revokeUser, resetPassword, addUserByAdmin } = useApp()
  const inputClass = INPUT_BASE

  const [userSearch, setUserSearch] = useState('')
  const [userCityFilter, setUserCityFilter] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [visibleApprovedCount, setVisibleApprovedCount] = useState(PAGE_SIZE)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkApproving, setBulkApproving] = useState(false)

  const [opError, setOpError] = useState('')
  const opErrorTimerRef = useRef(null)
  const showOpError = (msg) => { clearTimeout(opErrorTimerRef.current); setOpError(msg); opErrorTimerRef.current = setTimeout(() => setOpError(''), 3000) }

  const [showAddUser, setShowAddUser] = useState(false)
  const [addUserForm, setAddUserForm] = useState({ name: '', surname: '', email: '', password: '', confirmPassword: '', branch: '', work_location: '', phone: '', city_id: '', district: '' })
  const [addUserError, setAddUserError] = useState('')
  const [addUserSuccess, setAddUserSuccess] = useState('')
  const addUserTimerRef = useRef(null)
  const [addUserLoading, setAddUserLoading] = useState(false)

  const [copyPwModal, setCopyPwModal] = useState(null)
  const [copyPwCopied, setCopyPwCopied] = useState(false)

  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResult, setCsvResult] = useState(null)

  const handleCsvImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setCsvResult(null)
    setCsvImporting(true)
    try {
      const text = await file.text()
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
      const header = lines[0].toLowerCase().replace(/\r/g, '')
      const cols = header.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
      const idxOf = (names) => { for (const n of names) { const i = cols.indexOf(n); if (i !== -1) return i } return -1 }
      const nameIdx = idxOf(['ad', 'name', 'isim'])
      const surnameIdx = idxOf(['soyad', 'surname', 'soyadı'])
      const emailIdx = idxOf(['eposta', 'e-posta', 'email', 'e_posta'])
      const phoneIdx = idxOf(['telefon', 'phone', 'tel'])
      const branchIdx = idxOf(['branş', 'brans', 'branch'])
      const workLocIdx = idxOf(['kurum', 'work_location', 'okul', 'school'])
      const districtIdx = idxOf(['ilçe', 'district', 'ilce'])
      const cityIdx = idxOf(['il', 'city', 'şehir', 'sehir', 'il_id', 'city_id'])
      let ok = 0, fail = 0, errors = []
      for (let i = 1; i < lines.length; i++) {
        if (errors.length >= 100) { fail += lines.length - i; break }
        const parts = parseCSVLine(lines[i].replace(/\r/g, ''))
        const email = emailIdx >= 0 ? parts[emailIdx]?.trim().toLowerCase() : ''
        const name = nameIdx >= 0 ? parts[nameIdx] : ''
        const surname = surnameIdx >= 0 ? parts[surnameIdx] : ''
        if (!email || !name || !surname) { fail++; errors.push(t('csv_err_missing_field', language).replace('{n}', i + 1)); continue }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { fail++; errors.push(t('csv_err_invalid_email', language).replace('{n}', i + 1).replace('{email}', email)); continue }
        const cityVal = cityIdx >= 0 ? parts[cityIdx] : ''
        const cityObj = cities.find(c => String(c.id) === cityVal || c.name.toLowerCase() === cityVal.toLowerCase())
        const cityId = cityObj?.id || (!isGlobal ? adminCityId : null)
        if (!cityId) { fail++; errors.push(t('csv_err_city_not_found', language).replace('{n}', i + 1).replace('{city}', cityVal)); continue }
        const password = generateTempPassword()
        const result = await addUserByAdmin({ name, surname, email, password, phone: phoneIdx >= 0 ? parts[phoneIdx] || '' : '', branch: branchIdx >= 0 ? parts[branchIdx] || '' : '', work_location: workLocIdx >= 0 ? parts[workLocIdx] || '' : '', district: districtIdx >= 0 ? parts[districtIdx] || '' : '', city_id: cityId, city_name: cityObj?.name || '' })
        if (result.success) ok++
        else { fail++; errors.push(t('csv_err_row_generic', language).replace('{n}', i + 1).replace('{email}', email).replace('{error}', result.error)) }
      }
      setCsvResult({ ok, fail, errors })
    } catch (err) {
      console.error('[csvImport]', err)
      setCsvResult({ ok: 0, fail: 0, errors: [err.message || t('csv_err_read_file', language)] })
    } finally {
      setCsvImporting(false)
    }
  }

  const [resetPwModal, setResetPwModal] = useState(null)
  const [resetPwValue, setResetPwValue] = useState('')
  const [resetPwError, setResetPwError] = useState('')
  const [resetPwLoading, setResetPwLoading] = useState(false)
  const [resetPwSuccess, setResetPwSuccess] = useState('')
  const resetPwTimerRef = useRef(null)

  useEffect(() => () => { clearTimeout(resetPwTimerRef.current); clearTimeout(addUserTimerRef.current); clearTimeout(opErrorTimerRef.current) }, [])

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

  // Keep selection in sync when pendingUsers changes (e.g. after an approval)
  useEffect(() => {
    const pendingIdSet = new Set(pendingUsers.map(u => u.id))
    setSelectedIds(prev => {
      const next = new Set([...prev].filter(id => pendingIdSet.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [pendingUsers])

  const handleApproveUser = (id) => onRequestConfirm(t('confirm_approve_user', language), async () => { setProcessingId(id); try { const result = await approveUser(id); if (!result.success) showOpError(result.error || t('err_generic', language)) } finally { setProcessingId(null) } })
  const execBulkApprove = async () => {
    if (selectedIds.size === 0 || bulkApproving) return
    setBulkApproving(true)
    try {
      const ids = [...selectedIds]
      let failCount = 0
      for (const id of ids) {
        const result = await approveUser(id)
        if (!result?.success) failCount++
      }
      setSelectedIds(new Set())
      if (failCount > 0) {
        showOpError(t('err_bulk_approve_failed', language).replace('{n}', failCount))
      }
    } finally {
      setBulkApproving(false)
    }
  }
  const handleBulkApprove = () => {
    if (selectedIds.size === 0) return
    onRequestConfirm(
      t('confirm_bulk_approve', language).replace('{n}', selectedIds.size),
      execBulkApprove
    )
  }
  const handleRevokeUser = (id) => {
    const u = users.find(usr => usr.id === id)
    const activeAppts = appointments.filter(a =>
      a.user_email === u?.email && ['PENDING', 'APPROVED', 'CANCELLATION_REQUESTED'].includes(a.status)
    ).length
    let label = u ? `${t('confirm_revoke_user', language)} (${u.name} ${u.surname} — ${u.email})` : t('confirm_revoke_user', language)
    if (activeAppts > 0) {
      label += ` — ${activeAppts} ${t('active_appts_will_cancel', language)}`
    }
    onRequestConfirm(label, async () => { setProcessingId(id); try { const result = await revokeUser(id); if (!result.success) showOpError(result.error || t('err_generic', language)) } finally { setProcessingId(null) } })
  }

  const openResetPw = (user) => { setResetPwModal({ userId: user.id, email: user.email, userName: `${user.name} ${user.surname}` }); setResetPwValue(''); setResetPwError(''); setResetPwSuccess('') }
  const closeResetPw = () => { setResetPwModal(null); setResetPwValue(''); setResetPwError(''); setResetPwSuccess('') }

  const handleResetUserPassword = async (e) => {
    e.preventDefault()
    setResetPwError('')
    if (!isPasswordStrong(resetPwValue)) { setResetPwError(t('err_password_weak', language)); return }
    setResetPwLoading(true)
    try {
      const result = await resetPassword(resetPwModal.userId, resetPwModal.email, resetPwValue)
      if (result.success) {
        setResetPwSuccess(t('reset_pw_success', language))
        clearTimeout(resetPwTimerRef.current); resetPwTimerRef.current = setTimeout(closeResetPw, 1500)
      } else { setResetPwError(result.error || t('err_generic', language)) }
    } catch {
      setResetPwError(t('err_generic', language))
    } finally {
      setResetPwLoading(false)
    }
  }

  const handleAddUserByAdmin = async (e) => {
    e.preventDefault()
    setAddUserError('')
    const cityId = isGlobal ? addUserForm.city_id : adminCityId
    if (!addUserForm.name.trim() || !addUserForm.surname.trim() || !addUserForm.email.trim() || !addUserForm.password.trim() || !cityId) {
      setAddUserError(t('err_add_user_required_fields', language))
      return
    }
    if (!isPasswordStrong(addUserForm.password)) { setAddUserError(t('err_password_weak', language)); return }
    if (addUserForm.password !== addUserForm.confirmPassword) { setAddUserError(t('err_password_mismatch', language)); return }
    setAddUserLoading(true)
    try {
      const cityObj = cities.find(c => String(c.id) === String(cityId))
      const result = await addUserByAdmin({ ...addUserForm, email: addUserForm.email.trim().toLowerCase(), city_id: cityId, city_name: cityObj?.name || '' })
      if (result.success) {
        const createdEmail = addUserForm.email.trim().toLowerCase()
        const createdName = `${addUserForm.name} ${addUserForm.surname}`.trim()
        setShowAddUser(false)
        setAddUserForm({ name: '', surname: '', email: '', password: '', confirmPassword: '', branch: '', work_location: '', phone: '', city_id: '', district: '' })
        setCopyPwModal({ password: result.password, email: createdEmail, name: createdName })
        setCopyPwCopied(false)
      } else {
        const errKey = result.error
        setAddUserError((errKey && translations[errKey]) ? t(errKey, language) : (result.error || t('err_generic', language)))
      }
    } catch {
      setAddUserError(t('err_generic', language))
    } finally {
      setAddUserLoading(false)
    }
  }

  const handleCsvExport = () => {
    const headers = [
      t('input_name', language), t('input_surname', language), t('input_email', language),
      t('lbl_phone', language), t('lbl_branch', language), t('lbl_institution', language),
      t('lbl_district', language), t('lbl_province', language),
    ]
    const escape = (v) => {
      const s = v == null ? '' : String(v)
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
    }
    const rows = approvedUsers.map(u => [
      escape(u.name), escape(u.surname), escape(u.email), escape(u.phone),
      escape(u.branch), escape(u.work_location), escape(u.district), escape(u.city_name)
    ].join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const today = new Date().toISOString().slice(0, 10)
    a.href = url
    a.download = `kullanicilar_${today}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {isGlobal ? (
            <select aria-label={t('filter_all_provinces', language)} className={`${inputClass} flex-1 mr-2`} value={userCityFilter} onChange={e => { setUserCityFilter(e.target.value); setVisibleApprovedCount(PAGE_SIZE) }}>
              <option value="">{t('filter_all_provinces', language)}</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : <div />}
          <div className="flex gap-2 flex-shrink-0">
            <label className="py-2 px-3 border border-[#1565C0]/40 dark:border-[#7DD4FC]/40 text-[#1565C0] dark:text-[#7DD4FC] text-xs font-semibold rounded-xl hover:bg-[#1565C0]/5 transition cursor-pointer flex items-center gap-1">
              {csvImporting ? '...' : t('csv_import', language)}
              <input type="file" accept=".csv" className="hidden" onChange={handleCsvImport} disabled={csvImporting} />
            </label>
            <button onClick={handleCsvExport} className="py-2 px-3 border border-[#1565C0]/40 dark:border-[#7DD4FC]/40 text-[#1565C0] dark:text-[#7DD4FC] text-xs font-semibold rounded-xl hover:bg-[#1565C0]/5 transition flex items-center gap-1">
              <Download size={14} aria-hidden="true" />
              {t('export_csv', language)}
            </button>
            <button onClick={() => { setShowAddUser(p => !p); setAddUserError(''); setAddUserSuccess(''); setAddUserForm({ name: '', surname: '', email: '', password: '', confirmPassword: '', branch: '', work_location: '', phone: '', city_id: '', district: '' }) }} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition">
              + {t('btn_add_member', language)}
            </button>
          </div>
        </div>
        <input type="text" aria-label={t('search_user_placeholder', language)} placeholder={t('search_user_placeholder', language)} className={`${inputClass} w-full`} value={userSearch} onChange={e => { setUserSearch(e.target.value); setVisibleApprovedCount(PAGE_SIZE) }} />
      </div>

      {addUserSuccess && <div role="status" aria-live="polite" className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">{addUserSuccess}</div>}
      {opError && <div role="status" aria-live="polite" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3 flex items-center justify-between">{opError}<button type="button" onClick={() => { clearTimeout(opErrorTimerRef.current); setOpError('') }} aria-label={t('btn_close', language)} className="text-xs opacity-60 hover:opacity-100 ml-2">✕</button></div>}
      {csvResult && (
        <div role="status" aria-live="polite" className={`rounded-xl px-4 py-3 text-sm mb-3 ${csvResult.fail === 0 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300'}`}>
          <div className="flex items-center justify-between">
            <span>{t('csv_import_result', language).replace('{ok}', csvResult.ok).replace('{fail}', csvResult.fail)}</span>
            <button type="button" onClick={() => setCsvResult(null)} aria-label={t('btn_close', language)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
          {csvResult.errors.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs">
              {csvResult.errors.slice(0, 5).map((e, i) => <li key={`err-${i}-${e}`}>• {e}</li>)}
              {csvResult.errors.length > 5 && <li>{t('csv_errors_more', language).replace('{n}', csvResult.errors.length - 5)}</li>}
            </ul>
          )}
          <p className="text-xs mt-1 opacity-70">{t('csv_import_pw_hint', language)}</p>
        </div>
      )}

      {showAddUser && (
        <form onSubmit={handleAddUserByAdmin} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('user_new', language)}</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_name', language)} *</label>
              <input type="text" className={`${inputClass} w-full`} value={addUserForm.name} onChange={e => setAddUserForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_surname', language)} *</label>
              <input type="text" className={`${inputClass} w-full`} value={addUserForm.surname} onChange={e => setAddUserForm(p => ({ ...p, surname: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_email', language)} *</label>
            <input type="email" className={`${inputClass} w-full`} value={addUserForm.email} onChange={e => setAddUserForm(p => ({ ...p, email: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_password_required', language)}</label>
            <PasswordInput className={`${inputClass} w-full`} value={addUserForm.password} onChange={e => setAddUserForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_confirm_password_required', language)}</label>
            <PasswordInput className={`${inputClass} w-full`} value={addUserForm.confirmPassword} onChange={e => setAddUserForm(p => ({ ...p, confirmPassword: e.target.value }))} required minLength={8} />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t('add_user_pw_hint', language)}
            </p>
          </div>
          {isGlobal && (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_province', language)} *</label>
              <select className={`${inputClass} w-full`} value={addUserForm.city_id} onChange={e => setAddUserForm(p => ({ ...p, city_id: e.target.value }))} required>
                <option value="">{t('select_province', language)}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_branch', language)}</label>
              <input type="text" className={`${inputClass} w-full`} value={addUserForm.branch} onChange={e => setAddUserForm(p => ({ ...p, branch: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_phone', language)}</label>
              <input type="text" className={`${inputClass} w-full`} value={addUserForm.phone} onChange={e => setAddUserForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_work_location', language)}</label>
              <input type="text" className={`${inputClass} w-full`} value={addUserForm.work_location} onChange={e => setAddUserForm(p => ({ ...p, work_location: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_district', language)}</label>
              <input type="text" className={`${inputClass} w-full`} value={addUserForm.district} onChange={e => setAddUserForm(p => ({ ...p, district: e.target.value }))} />
            </div>
          </div>
          {addUserError && <p role="status" aria-live="polite" className="text-red-500 dark:text-red-400 text-xs">{addUserError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={addUserLoading} className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl disabled:opacity-60">
              {addUserLoading ? '...' : t('btn_save', language)}
            </button>
            <button type="button" onClick={() => { setShowAddUser(false); setAddUserError('') }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">
              {t('btn_nevermind', language)}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-orange-600 dark:text-orange-400 text-sm">{t('pending_users_title', language)} ({pendingUsers.length})</h3>
          {pendingUsers.length > 1 && (
            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-500 dark:text-gray-400">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#1565C0] dark:accent-[#7DD4FC] cursor-pointer"
                checked={selectedIds.size === pendingUsers.length}
                ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < pendingUsers.length }}
                onChange={e => {
                  if (e.target.checked) setSelectedIds(new Set(pendingUsers.map(u => u.id)))
                  else setSelectedIds(new Set())
                }}
              />
              {t('select_all', language)}
            </label>
          )}
        </div>
        {selectedIds.size > 0 && (
          <button
            onClick={handleBulkApprove}
            disabled={bulkApproving}
            className="py-1.5 px-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60"
          >
            {bulkApproving ? '...' : t('approve_selected_n', language).replace('{n}', selectedIds.size)}
          </button>
        )}
      </div>
      {pendingUsers.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 text-center text-gray-500 dark:text-gray-400 text-sm mb-4">{t('no_pending_users', language)}</div>
      ) : (
        <div className="space-y-3 mb-6">
          {pendingUsers.map(user => (
            <div key={user.id} className="relative">
              <input
                type="checkbox"
                className="absolute top-3 right-3 z-10 w-4 h-4 accent-[#1565C0] dark:accent-[#7DD4FC] cursor-pointer"
                checked={selectedIds.has(user.id)}
                onChange={e => {
                  setSelectedIds(prev => {
                    const next = new Set(prev)
                    if (e.target.checked) next.add(user.id)
                    else next.delete(user.id)
                    return next
                  })
                }}
              />
              <UserCard user={user} language={language} processingId={processingId} onApprove={handleApproveUser} onRevoke={handleRevokeUser} onResetPassword={() => openResetPw(user)} showApprove showDelete />
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-green-600 dark:text-green-400 text-sm">{t('approved_users_title', language)} ({approvedUsers.length})</h3>
        {approvedUsers.length > visibleApprovedCount && (
          <span className="text-xs text-gray-400 dark:text-gray-500">{visibleApprovedCount} {t('shown', language)}</span>
        )}
      </div>
      {approvedUsers.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 text-center text-gray-500 dark:text-gray-400 text-sm">{t('no_approved_users', language)}</div>
      ) : (
        <>
          <div className="space-y-3">
            {approvedUsers.slice(0, visibleApprovedCount).map(user => (
              <UserCard key={user.id} user={user} language={language} processingId={processingId} onApprove={handleApproveUser} onRevoke={handleRevokeUser} onResetPassword={() => openResetPw(user)} showRevoke />
            ))}
          </div>
          {approvedUsers.length > visibleApprovedCount && (
            <button
              onClick={() => setVisibleApprovedCount(c => c + PAGE_SIZE)}
              className="w-full mt-3 py-3 border border-[#1565C0]/30 dark:border-[#7DD4FC]/30 text-[#1565C0] dark:text-[#7DD4FC] rounded-xl text-sm font-medium hover:bg-[#1565C0]/5 transition"
            >
              {t('show_more', language)} ({approvedUsers.length - visibleApprovedCount} {t('remaining', language)})
            </button>
          )}
        </>
      )}

      <ResetPasswordModal
        isOpen={!!resetPwModal}
        targetName={resetPwModal?.userName}
        targetEmail={resetPwModal?.email}
        value={resetPwValue}
        onChange={e => setResetPwValue(e.target.value)}
        onSubmit={handleResetUserPassword}
        onClose={closeResetPw}
        error={resetPwError}
        success={resetPwSuccess}
        loading={resetPwLoading}
        language={language}
      />

      {copyPwModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="copy-pw-title" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-2xl p-6 w-full max-w-sm space-y-4">
            <h3 id="copy-pw-title" className="font-bold text-gray-900 dark:text-gray-100 text-base">{t('copy_pw_modal_title', language)}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('copy_pw_modal_desc', language)}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-100 dark:bg-[#060E26] rounded-lg px-3 py-2 text-sm font-mono text-gray-900 dark:text-gray-100 select-all break-all">
                {copyPwModal.password}
              </code>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  navigator.clipboard.writeText(copyPwModal.password).catch(() => {})
                  setCopyPwCopied(true)
                  setTimeout(() => setCopyPwCopied(false), 2000)
                }}
                className="px-3 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-lg hover:opacity-90 transition flex-shrink-0"
              >
                {copyPwCopied ? t('copy_pw_btn_copied', language) : t('copy_pw_btn_copy', language)}
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">{copyPwModal.email}</p>
            <button
              type="button"
              onClick={() => { setCopyPwModal(null); setCopyPwCopied(false); setAddUserSuccess(t('user_added', language)); clearTimeout(addUserTimerRef.current); addUserTimerRef.current = setTimeout(() => setAddUserSuccess(''), 3000) }}
              className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl hover:opacity-80 transition"
            >
              {t('copy_pw_done_btn', language)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

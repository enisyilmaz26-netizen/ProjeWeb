import { useState, useMemo, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { t, translations } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import ResetPasswordModal from '../../components/admin/ResetPasswordModal'
import PasswordInput from '../../components/PasswordInput'
import { isPasswordStrong } from '../../lib/passwordUtils'
import { Pencil, Download, Key, Trash2 } from 'lucide-react'

export default function AdminManagementTab({ language, loggedInAdmin, onRequestConfirm }) {
  const { cities, admins, addAdmin, updateAdmin, deleteAdmin, resetAdminPasswordByGlobal } = useApp()
  const inputClass = INPUT_BASE

  const [adminSearch, setAdminSearch] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const [opError, setOpError] = useState('')

  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', role: 'CITY', city_id: '', phone: '' })
  const [adminFormError, setAdminFormError] = useState('')
  const [adminFormSuccess, setAdminFormSuccess] = useState('')
  const adminFormTimerRef = useRef(null)
  const [adminFormLoading, setAdminFormLoading] = useState(false)

  const [editAdminModal, setEditAdminModal] = useState(null)
  const [editAdminLoading, setEditAdminLoading] = useState(false)
  const [editAdminError, setEditAdminError] = useState('')

  const [resetAdminPwModal, setResetAdminPwModal] = useState(null)
  const [resetAdminPwValue, setResetAdminPwValue] = useState('')
  const [resetAdminPwError, setResetAdminPwError] = useState('')
  const [resetAdminPwLoading, setResetAdminPwLoading] = useState(false)
  const [resetAdminPwSuccess, setResetAdminPwSuccess] = useState('')
  const resetAdminPwTimerRef = useRef(null)

  useEffect(() => () => { clearTimeout(adminFormTimerRef.current); clearTimeout(resetAdminPwTimerRef.current) }, [])
  useEffect(() => {
    if (!editAdminModal) return
    const handler = (e) => { if (e.key === 'Escape') { setEditAdminModal(null); setEditAdminError('') } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [editAdminModal])

  const filteredAdmins = useMemo(() => {
    if (!adminSearch.trim()) return admins
    const q = adminSearch.toLowerCase()
    return admins.filter(a => (a.name || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q))
  }, [admins, adminSearch])

  const handleAddAdmin = async (e) => {
    e.preventDefault()
    setAdminFormError('')
    if (!adminForm.name.trim() || !adminForm.email.trim() || !adminForm.password.trim()) { setAdminFormError(t('err_admin_required_fields', language)); return }
    if (!isPasswordStrong(adminForm.password)) { setAdminFormError(t('err_password_weak', language)); return }
    if (adminForm.role === 'CITY' && !adminForm.city_id) { setAdminFormError(t('err_city_required', language)); return }
    setAdminFormLoading(true)
    try {
      const result = await addAdmin(adminForm)
      if (result.success) {
        setShowAddAdmin(false)
        setAdminForm({ name: '', email: '', password: '', role: 'CITY', city_id: '', phone: '' })
        setAdminFormSuccess(t('admin_added', language))
        clearTimeout(adminFormTimerRef.current); adminFormTimerRef.current = setTimeout(() => setAdminFormSuccess(''), 3000)
      } else { setAdminFormError(result.error || t('err_generic', language)) }
    } catch {
      setAdminFormError(t('err_generic', language))
    } finally {
      setAdminFormLoading(false)
    }
  }

  const handleEditAdmin = async (e) => {
    e.preventDefault()
    if (!editAdminModal) return
    setEditAdminError('')
    if (editAdminModal.role === 'CITY' && !editAdminModal.city_id) { setEditAdminError(t('err_city_required', language)); return }
    setEditAdminLoading(true)
    try {
      const updates = { role: editAdminModal.role, city_id: editAdminModal.role === 'GLOBAL' ? null : editAdminModal.city_id, email: editAdminModal.email.trim(), phone: editAdminModal.phone.trim() }
      const result = await updateAdmin(editAdminModal.adminId, updates)
      if (result.success) { setEditAdminModal(null) }
      else {
        const errKey = result.error
        setEditAdminError((errKey && translations[errKey]) ? t(errKey, language) : (result.error || t('err_generic', language)))
      }
    } catch {
      setEditAdminError(t('err_generic', language))
    } finally {
      setEditAdminLoading(false)
    }
  }

  const originalRole = (modal) => admins.find(a => a.id === modal?.adminId)?.role

  const handleDeleteAdmin = (adminId) => {
    if (adminId === loggedInAdmin?.id) {
      setOpError(t('admin_cannot_delete_self', language))
      return
    }
    onRequestConfirm(t('admin_delete_confirm', language), async () => {
      setProcessingId(adminId)
      try {
        const result = await deleteAdmin(adminId)
        if (!result.success) setOpError(result.error || t('err_generic', language))
      } finally {
        setProcessingId(null)
      }
    })
  }

  const openResetAdminPw = (admin) => { setResetAdminPwModal({ adminId: admin.id, email: admin.email, name: admin.name || admin.email }); setResetAdminPwValue(''); setResetAdminPwError(''); setResetAdminPwSuccess('') }
  const closeResetAdminPw = () => { setResetAdminPwModal(null); setResetAdminPwValue(''); setResetAdminPwError(''); setResetAdminPwSuccess('') }

  const handleResetAdminPassword = async (e) => {
    e.preventDefault()
    setResetAdminPwError('')
    if (!isPasswordStrong(resetAdminPwValue)) { setResetAdminPwError(t('err_password_weak', language)); return }
    setResetAdminPwLoading(true)
    try {
      const result = await resetAdminPasswordByGlobal(resetAdminPwModal.adminId, resetAdminPwModal.email, resetAdminPwValue)
      if (result.success) {
        setResetAdminPwSuccess(t('reset_pw_success', language))
        clearTimeout(resetAdminPwTimerRef.current); resetAdminPwTimerRef.current = setTimeout(closeResetAdminPw, 1500)
      } else { setResetAdminPwError(result.error || t('err_generic', language)) }
    } catch {
      setResetAdminPwError(t('err_generic', language))
    } finally {
      setResetAdminPwLoading(false)
    }
  }

  const handleCsvExport = () => {
    const escField = (v) => { const s = String(v ?? ''); return (s.includes(',') || s.includes('"') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s }
    const header = [
      t('input_name', language), t('input_email', language), t('lbl_role', language),
      t('lbl_province', language), t('lbl_phone', language),
    ]
    const rows = filteredAdmins.map(a => {
      const city = cities.find(c => String(c.id) === String(a.city_id))
      const role = a.role === 'GLOBAL' ? t('admin_type_global', language) : t('admin_type_city', language)
      return [a.name, a.email, role, city?.name || '', a.phone || ''].map(escField).join(',')
    })
    const csv = '﻿' + [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `yoneticiler_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('tab_admins', language)}</h3>
        <div className="flex gap-2">
          <button onClick={handleCsvExport} disabled={filteredAdmins.length === 0} className="py-2 px-3 border border-[#1565C0]/40 dark:border-[#7DD4FC]/40 text-[#1565C0] dark:text-[#7DD4FC] text-xs font-semibold rounded-xl hover:bg-[#1565C0]/5 transition inline-flex items-center gap-1 disabled:opacity-40">
            <Download className="w-3.5 h-3.5" aria-hidden="true" />{t('export_csv', language)}
          </button>
          <button onClick={() => { setShowAddAdmin(true); setAdminFormError(''); setAdminFormSuccess('') }} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition">
            {t('admin_add', language)}
          </button>
        </div>
      </div>

      {adminFormSuccess && <div role="status" aria-live="polite" className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">{adminFormSuccess}</div>}
      {opError && <div role="status" aria-live="polite" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3 flex items-center justify-between">{opError}<button type="button" onClick={() => setOpError('')} aria-label={t('btn_close', language)} className="text-xs opacity-60 hover:opacity-100 ml-2">✕</button></div>}

      {showAddAdmin && (
        <form onSubmit={handleAddAdmin} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('admin_new', language)}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_name', language)} *</label>
              <input type="text" aria-label={t('input_name', language)} className={`${inputClass} w-full`} value={adminForm.name} onChange={e => setAdminForm(p => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_email', language)} *</label>
              <input type="email" aria-label={t('input_email', language)} className={`${inputClass} w-full`} value={adminForm.email} onChange={e => setAdminForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_role', language)} *</label>
              <select aria-label={t('lbl_role', language)} className={`${inputClass} w-full`} value={adminForm.role} onChange={e => setAdminForm(p => ({ ...p, role: e.target.value, city_id: '' }))}>
                <option value="CITY">{t('admin_type_city', language)}</option>
                <option value="GLOBAL">{t('admin_type_global', language)}</option>
              </select>
            </div>
            {adminForm.role === 'CITY' && (
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_province', language)} *</label>
                <select aria-label={t('lbl_province', language)} className={`${inputClass} w-full`} value={adminForm.city_id} onChange={e => setAdminForm(p => ({ ...p, city_id: e.target.value }))}>
                  <option value="">{t('select_province', language)}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_phone', language)}</label>
              <input type="text" aria-label={t('lbl_phone', language)} className={`${inputClass} w-full`} value={adminForm.phone} onChange={e => setAdminForm(p => ({ ...p, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_password', language)} *</label>
              <PasswordInput className={`${inputClass} w-full`} value={adminForm.password} onChange={e => setAdminForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">{t('pw_requirement_hint', language)}</p>
            </div>
          </div>
          {adminFormError && <p role="status" aria-live="polite" className="text-red-500 dark:text-red-400 text-xs">{adminFormError}</p>}
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

      <input type="text" aria-label={t('admin_search_placeholder', language)} placeholder={t('admin_search_placeholder', language)} className={`${inputClass} w-full mb-3`} value={adminSearch} onChange={e => setAdminSearch(e.target.value)} />

      {filteredAdmins.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-gray-400 text-sm">{t('no_admins', language)}</div>
      ) : (
        <div className="space-y-3">
          {filteredAdmins.map(admin => {
            const city = cities.find(c => String(c.id) === String(admin.city_id))
            const isSelf = admin.id === loggedInAdmin?.id
            return (
              <div key={admin.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#1565C0] dark:text-[#7DD4FC] font-bold text-sm">{(admin.name || admin.email || '?').charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{admin.name || admin.email}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${admin.role === 'GLOBAL' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}`}>
                        {admin.role === 'GLOBAL' ? t('admin_type_global', language) : t('admin_type_city', language)}
                      </span>
                      {isSelf && <span className="text-[10px] text-gray-400 dark:text-gray-500">{t('admin_self_indicator', language)}</span>}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{admin.email}</p>
                    {city && <p className="text-xs text-gray-400 dark:text-gray-500">{city.name}</p>}
                    {admin.phone && <p className="text-xs text-gray-400 dark:text-gray-500">{admin.phone}</p>}
                  </div>
                  {!isSelf && (
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setEditAdminModal({ adminId: admin.id, name: admin.name || admin.email, email: admin.email || '', phone: admin.phone || '', role: admin.role, city_id: admin.city_id ? String(admin.city_id) : '' })} className="text-[#1565C0] dark:text-[#7DD4FC] text-xs px-2 py-1.5 hover:bg-[#1565C0]/10 rounded-lg transition" title={t('lbl_edit_role_province', language)} aria-label={t('lbl_edit_role_province', language)}><Pencil className="w-3.5 h-3.5" aria-hidden="true" /></button>
                      <button onClick={() => openResetAdminPw(admin)} className="text-[#1565C0] dark:text-[#7DD4FC] text-xs px-2 py-1.5 hover:bg-[#1565C0]/10 rounded-lg transition" title={t('btn_reset_password', language)} aria-label={t('btn_reset_password', language)}><Key className="w-3.5 h-3.5" aria-hidden="true" /></button>
                      <button onClick={() => handleDeleteAdmin(admin.id)} disabled={processingId === admin.id} className="text-red-500 hover:text-red-700 text-xs p-1.5 disabled:opacity-40" title={t('btn_delete', language)} aria-label={t('btn_delete', language)}><Trash2 className="w-3.5 h-3.5" aria-hidden="true" /></button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Edit Admin Modal */}
      {editAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="edit-admin-title" className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 id="edit-admin-title" className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">{t('admin_edit_title', language)}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">{editAdminModal.name}</p>
            <form onSubmit={handleEditAdmin} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_email', language)}</label>
                <input type="email" autoFocus aria-label={t('input_email', language)} className={`${inputClass} w-full`} value={editAdminModal.email} onChange={e => setEditAdminModal(p => ({ ...p, email: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_phone', language)}</label>
                <input type="text" aria-label={t('lbl_phone', language)} className={`${inputClass} w-full`} value={editAdminModal.phone} onChange={e => setEditAdminModal(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_role', language)}</label>
                <select aria-label={t('lbl_role', language)} className={`${inputClass} w-full`} value={editAdminModal.role} onChange={e => setEditAdminModal(p => ({ ...p, role: e.target.value, city_id: '' }))}>
                  <option value="CITY">{t('admin_type_city', language)}</option>
                  <option value="GLOBAL">{t('admin_type_global', language)}</option>
                </select>
                {originalRole(editAdminModal) && editAdminModal.role !== originalRole(editAdminModal) && (
                  <p className="mt-1.5 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg px-2.5 py-1.5">
                    {t('admin_edit_role_warning', language).replace('{from}', originalRole(editAdminModal)).replace('{to}', editAdminModal.role)}
                  </p>
                )}
              </div>
              {editAdminModal.role === 'CITY' && (
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_province', language)}</label>
                  <select aria-label={t('lbl_province', language)} className={`${inputClass} w-full`} value={editAdminModal.city_id} onChange={e => setEditAdminModal(p => ({ ...p, city_id: e.target.value }))} required>
                    <option value="">{t('select_province', language)}</option>
                    {cities.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {editAdminError && <p role="status" aria-live="polite" className="text-red-600 dark:text-red-400 text-xs">{editAdminError}</p>}
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={editAdminLoading} className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60">
                  {editAdminLoading ? '...' : t('btn_save', language)}
                </button>
                <button type="button" onClick={() => { setEditAdminModal(null); setEditAdminError('') }} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                  {t('btn_nevermind', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ResetPasswordModal
        isOpen={!!resetAdminPwModal}
        targetName={resetAdminPwModal?.name}
        targetEmail={resetAdminPwModal?.email}
        value={resetAdminPwValue}
        onChange={e => setResetAdminPwValue(e.target.value)}
        onSubmit={handleResetAdminPassword}
        onClose={closeResetAdminPw}
        error={resetAdminPwError}
        success={resetAdminPwSuccess}
        loading={resetAdminPwLoading}
        language={language}
      />
    </div>
  )
}

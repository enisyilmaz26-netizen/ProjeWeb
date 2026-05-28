import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { t, translations } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { PAGE_SIZE } from '../../lib/adminHelpers'
import UserCard from '../../components/admin/UserCard'
import ResetPasswordModal from '../../components/admin/ResetPasswordModal'
import PasswordInput from '../../components/PasswordInput'

export default function UserApprovalsTab({ language, isGlobal, adminCityId, onRequestConfirm }) {
  const { cities, users, approveUser, revokeUser, resetPassword, addUserByAdmin } = useApp()
  const inputClass = INPUT_BASE

  const [userSearch, setUserSearch] = useState('')
  const [userCityFilter, setUserCityFilter] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [visibleApprovedCount, setVisibleApprovedCount] = useState(PAGE_SIZE)

  const [showAddUser, setShowAddUser] = useState(false)
  const [addUserForm, setAddUserForm] = useState({ name: '', surname: '', email: '', password: '', branch: '', work_location: '', phone: '', city_id: '', district: '' })
  const [addUserError, setAddUserError] = useState('')
  const [addUserSuccess, setAddUserSuccess] = useState('')
  const [addUserLoading, setAddUserLoading] = useState(false)

  const [resetPwModal, setResetPwModal] = useState(null)
  const [resetPwValue, setResetPwValue] = useState('')
  const [resetPwError, setResetPwError] = useState('')
  const [resetPwLoading, setResetPwLoading] = useState(false)
  const [resetPwSuccess, setResetPwSuccess] = useState('')

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

  const handleApproveUser = (id) => onRequestConfirm(t('confirm_approve_user', language), async () => { setProcessingId(id); await approveUser(id); setProcessingId(null) })
  const handleRevokeUser = (id) => onRequestConfirm(t('confirm_revoke_user', language), async () => { setProcessingId(id); await revokeUser(id); setProcessingId(null) })

  const openResetPw = (user) => { setResetPwModal({ userId: user.id, email: user.email, userName: `${user.name} ${user.surname}` }); setResetPwValue(''); setResetPwError(''); setResetPwSuccess('') }
  const closeResetPw = () => { setResetPwModal(null); setResetPwValue(''); setResetPwError(''); setResetPwSuccess('') }

  const handleResetUserPassword = async (e) => {
    e.preventDefault()
    setResetPwError('')
    if (resetPwValue.length < 8) { setResetPwError(t('err_password_min_length', language)); return }
    setResetPwLoading(true)
    const result = await resetPassword(resetPwModal.userId, resetPwModal.email, resetPwValue)
    setResetPwLoading(false)
    if (result.success) {
      setResetPwSuccess(t('reset_pw_success', language))
      setTimeout(closeResetPw, 1500)
    } else { setResetPwError(result.error || t('err_generic', language)) }
  }

  const handleAddUserByAdmin = async (e) => {
    e.preventDefault()
    setAddUserError('')
    const cityId = isGlobal ? addUserForm.city_id : adminCityId
    if (!addUserForm.name.trim() || !addUserForm.surname.trim() || !addUserForm.email.trim() || !addUserForm.password.trim() || !cityId) {
      setAddUserError(language === 'TR' ? 'Ad, soyad, e-posta, şifre ve il zorunludur.' : 'Name, surname, email, password and province are required.')
      return
    }
    setAddUserLoading(true)
    const cityObj = cities.find(c => String(c.id) === String(cityId))
    const result = await addUserByAdmin({ ...addUserForm, email: addUserForm.email.trim().toLowerCase(), city_id: cityId, city_name: cityObj?.name || '' })
    setAddUserLoading(false)
    if (result.success) {
      setShowAddUser(false)
      setAddUserForm({ name: '', surname: '', email: '', password: '', branch: '', work_location: '', phone: '', city_id: '', district: '' })
      setAddUserSuccess(language === 'TR' ? 'Üye eklendi.' : 'Member added.')
      setTimeout(() => setAddUserSuccess(''), 3000)
    } else {
      const errKey = result.error
      setAddUserError((errKey && translations[errKey]) ? t(errKey, language) : (result.error || t('err_generic', language)))
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          {isGlobal ? (
            <select className={`${inputClass} flex-1 mr-2`} value={userCityFilter} onChange={e => { setUserCityFilter(e.target.value); setVisibleApprovedCount(PAGE_SIZE) }}>
              <option value="">{t('filter_all_provinces', language)}</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : <div />}
          <button onClick={() => { setShowAddUser(p => !p); setAddUserError('') }} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition flex-shrink-0">
            + {language === 'TR' ? 'Üye Ekle' : 'Add Member'}
          </button>
        </div>
        <input type="text" placeholder={t('search_user_placeholder', language)} className={`${inputClass} w-full`} value={userSearch} onChange={e => { setUserSearch(e.target.value); setVisibleApprovedCount(PAGE_SIZE) }} />
      </div>

      {addUserSuccess && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">{addUserSuccess}</div>}

      {showAddUser && (
        <form onSubmit={handleAddUserByAdmin} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{language === 'TR' ? 'Yeni Üye' : 'New Member'}</h4>
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
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Şifre *' : 'Password *'}</label>
            <PasswordInput className={`${inputClass} w-full`} value={addUserForm.password} onChange={e => setAddUserForm(p => ({ ...p, password: e.target.value }))} required minLength={8} />
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
          {addUserError && <p className="text-red-500 dark:text-red-400 text-xs">{addUserError}</p>}
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

      <h3 className="font-bold text-orange-600 dark:text-orange-400 text-sm mb-2">{t('pending_users_title', language)} ({pendingUsers.length})</h3>
      {pendingUsers.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 text-center text-gray-500 dark:text-gray-400 text-sm mb-4">{t('no_pending_users', language)}</div>
      ) : (
        <div className="space-y-3 mb-6">
          {pendingUsers.map(user => (
            <UserCard key={user.id} user={user} language={language} processingId={processingId} onApprove={handleApproveUser} onRevoke={handleRevokeUser} onResetPassword={() => openResetPw(user)} showApprove showDelete />
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
    </div>
  )
}

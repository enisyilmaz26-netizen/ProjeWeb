import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { t } from '../lib/languages'
import PasswordInput from './PasswordInput'
import { isPasswordStrong, passwordRequirements } from '../lib/passwordUtils'
import { ShieldAlert, Check, Circle } from 'lucide-react'

export default function ForcePasswordChange() {
  const { loggedInUser, loggedInAdmin, changePassword, changeAdminPassword, logout, language } = useApp()
  const isAdmin = !!loggedInAdmin?.must_change_password
  const account = isAdmin ? loggedInAdmin : loggedInUser
  const [form, setForm] = useState({ current: '', newPw: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!isPasswordStrong(form.newPw)) {
      setError(t('err_password_weak', language))
      return
    }
    if (form.newPw !== form.confirm) {
      setError(t('err_password_mismatch', language))
      return
    }
    setLoading(true)
    try {
      const result = isAdmin
        ? await changeAdminPassword(account.id, account.email, form.current, form.newPw)
        : await changePassword(account.id, account.email, form.current, form.newPw)
      if (!result.success) {
        setError(t(result.error, language) || t('err_generic', language))
      }
    } catch {
      setError(t('err_generic', language))
    } finally {
      setLoading(false)
    }
    // On success: must_change_password becomes false → this component unmounts automatically
  }

  const reqs = passwordRequirements.map(r => ({ ...r, met: r.met(form.newPw) }))

  return (
    <div className="min-h-screen bg-[#EFF8FF] dark:bg-[#060E26] flex items-center justify-center px-4">
      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex items-center gap-2 mb-1">
          <ShieldAlert className="w-5 h-5 text-orange-500" aria-hidden="true" />
          <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">
            {t('force_pw_title', language)}
          </h2>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          {t('force_pw_subtitle', language)}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('lbl_temp_password', language)}
            </label>
            <PasswordInput
              value={form.current}
              onChange={e => setForm(p => ({ ...p, current: e.target.value }))}
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0E1A30] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('new_password', language)}
            </label>
            <PasswordInput
              value={form.newPw}
              onChange={e => setForm(p => ({ ...p, newPw: e.target.value }))}
              autoComplete="new-password"
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0E1A30] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              {t('input_confirm_password', language)}
            </label>
            <PasswordInput
              value={form.confirm}
              onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
              autoComplete="new-password"
              required
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0E1A30] text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
            />
          </div>

          {form.newPw && (
            <ul className="space-y-1">
              {reqs.map(r => (
                <li key={r.key} className={`flex items-center gap-1.5 text-xs ${r.met ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
                  {r.met ? <Check className="w-3 h-3" aria-hidden="true" /> : <Circle className="w-3 h-3" aria-hidden="true" />}
                  {t(r.key, language)}
                </li>
              ))}
            </ul>
          )}

          {error && <p role="status" aria-live="polite" className="text-red-500 dark:text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl disabled:opacity-60 hover:opacity-90 transition"
          >
            {loading ? '...' : t('btn_update_password', language)}
          </button>
        </form>

        <button
          onClick={logout}
          className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center"
        >
          {t('btn_sign_out', language)}
        </button>
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { t } from '../../lib/languages'
import PasswordInput from '../PasswordInput'
import { useFocusTrap } from '../../hooks/useFocusTrap'

export default function ResetPasswordModal({ isOpen, targetName, targetEmail, value, onChange, onSubmit, onClose, error, success, loading, language }) {
  const trapRef = useFocusTrap(isOpen)
  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, loading, onClose])

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="reset-pw-title" className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <h3 id="reset-pw-title" className="font-bold text-gray-900 dark:text-gray-100 text-base mb-1">{t('reset_pw_title', language)}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 truncate">{targetName} — {targetEmail}</p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('new_password', language)} *</label>
            <PasswordInput className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-[#0A1628] rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30" value={value} onChange={onChange} autoComplete="new-password" required minLength={8} autoFocus />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">{t('pw_requirement_hint', language)}</p>
          </div>
          {error && <p role="status" aria-live="polite" className="text-red-600 dark:text-red-400 text-xs">{error}</p>}
          {success && <p role="status" aria-live="polite" className="text-green-600 dark:text-green-400 text-xs font-medium">{success}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading || !!success} className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60">
              {loading ? '...' : t('btn_reset_password', language)}
            </button>
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              {t('btn_nevermind', language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

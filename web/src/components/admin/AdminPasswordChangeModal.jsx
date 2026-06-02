import { useEffect } from 'react'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import PasswordInput from '../PasswordInput'
import { useFocusTrap } from '../../hooks/useFocusTrap'

export default function AdminPasswordChangeModal({ isOpen, form, onChange, onSubmit, onClose, error, loading, language }) {
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
      <div ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="admin-pw-change-title" className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-md w-full">
        <h3 id="admin-pw-change-title" className="font-bold text-gray-900 dark:text-gray-100 text-base mb-4">{t('change_password', language)}</h3>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('current_password', language)} *</label>
            <PasswordInput className={`w-full ${INPUT_BASE}`} value={form.current} onChange={e => onChange({ ...form, current: e.target.value })} autoComplete="current-password" required autoFocus />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('new_password', language)} *</label>
            <PasswordInput className={`w-full ${INPUT_BASE}`} value={form.newPw} onChange={e => onChange({ ...form, newPw: e.target.value })} autoComplete="new-password" required minLength={8} />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 italic">{t('pw_requirement_hint', language)}</p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('input_confirm_password', language)} *</label>
            <PasswordInput className={`w-full ${INPUT_BASE}`} value={form.confirm} onChange={e => onChange({ ...form, confirm: e.target.value })} autoComplete="new-password" required minLength={8} />
          </div>
          {error && <p role="status" aria-live="polite" className="text-red-500 dark:text-red-400 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60">
              {loading ? '...' : t('btn_update_password', language)}
            </button>
            <button type="button" onClick={onClose} disabled={loading} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition">
              {t('btn_nevermind', language)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

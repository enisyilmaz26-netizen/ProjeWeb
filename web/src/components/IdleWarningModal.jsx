import { useState, useEffect } from 'react'
import { t } from '../lib/languages'
import { Timer } from 'lucide-react'

const COUNTDOWN_SECS = 5 * 60 // 5-minute countdown shown in warning

export default function IdleWarningModal({ onContinue, onLogout, language }) {
  const [seconds, setSeconds] = useState(COUNTDOWN_SECS)

  useEffect(() => {
    const tick = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { onLogout(); return 0 }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [onLogout])

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  const msg = t('session_timeout_msg', language).replace('{t}', `${mm}:${ss}`)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] px-4">
      <div role="dialog" aria-modal="true" aria-labelledby="idle-warning-title" className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-2xl p-6 max-w-sm w-full">
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <Timer className="w-6 h-6 text-orange-500" />
          </div>
          <h3 id="idle-warning-title" className="font-bold text-gray-900 dark:text-gray-100 text-base mb-2">
            {t('session_timeout_title', language)}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{msg}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onContinue}
            className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition"
          >
            {t('session_continue', language)}
          </button>
          <button
            onClick={onLogout}
            className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {t('btn_logout', language)}
          </button>
        </div>
      </div>
    </div>
  )
}

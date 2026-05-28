import { t } from '../../lib/languages'

export default function ConfirmModal({ confirmModal, onClose, language }) {
  if (!confirmModal) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
        <p className="text-sm text-gray-800 dark:text-gray-100 font-medium mb-5">{confirmModal.label}</p>
        <div className="flex gap-3">
          <button
            onClick={async () => { await confirmModal.onConfirm(); onClose() }}
            className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition"
          >
            {t('btn_yes', language)}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {t('btn_nevermind', language)}
          </button>
        </div>
      </div>
    </div>
  )
}

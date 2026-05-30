import { t } from '../../lib/languages'

export default function SlotItem({ slot, processingId, onRemove, language }) {
  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-xl shadow px-4 py-3 flex items-center justify-between">
      <div>
        <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{slot.time_range}</span>
        {slot.location && (
          <span className="ml-2 text-xs text-[#1565C0] dark:text-[#7DD4FC] bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 px-2 py-0.5 rounded-lg">{slot.location}</span>
        )}
      </div>
      <button
        onClick={() => onRemove(slot.id)}
        disabled={processingId === slot.id}
        aria-label={t('btn_delete', language)}
        className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40"
      >
        {processingId === slot.id ? '...' : t('btn_delete', language)}
      </button>
    </div>
  )
}

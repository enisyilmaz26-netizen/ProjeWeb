import React from 'react'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { X } from 'lucide-react'

export default function LocationSlotSection({ locationName, slots, cityId, processingId, onAddSlot, onRemove, language }) {
  const [slotTime, setSlotTime] = React.useState('')
  const [error, setError] = React.useState('')

  const handleAdd = async () => {
    if (!slotTime.trim()) {
      setError(language === 'TR' ? 'Saat dilimi gereklidir.' : 'Time slot is required.')
      return
    }
    const result = await onAddSlot(cityId, slotTime.trim(), locationName)
    if (result.success) { setSlotTime(''); setError('') }
    else setError(result.error || (language === 'TR' ? 'Hata oluştu.' : 'An error occurred.'))
  }

  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
      <h4 className="font-semibold text-[#1565C0] dark:text-[#7DD4FC] text-sm mb-3">{locationName}</h4>
      <div className="space-y-2 mb-3">
        {slots.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
            {language === 'TR' ? 'Henüz saat dilimi eklenmedi.' : 'No time slots yet.'}
          </p>
        )}
        {slots.map(slot => (
          <div key={slot.id} className="bg-gray-50 dark:bg-[#0A1628] rounded-xl px-4 py-2.5 flex items-center justify-between">
            <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{slot.time_range}</span>
            <button
              onClick={() => onRemove(slot.id)}
              disabled={processingId === slot.id}
              className="text-red-500 hover:text-red-700 text-sm px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-40"
            >
              {processingId === slot.id ? '...' : t('btn_delete', language)}
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t('slot_placeholder', language)}
          className={INPUT_BASE + ' flex-1'}
          value={slotTime}
          onChange={e => setSlotTime(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
        />
        <button
          onClick={handleAdd}
          className="py-2 px-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition"
        >
          + {t('btn_add', language)}
        </button>
      </div>
      {error && (
        <p className="text-red-500 text-xs mt-1">
          {error} <button onClick={() => setError('')} className="ml-1 text-red-400"><X className="w-3.5 h-3.5 inline" /></button>
        </p>
      )}
    </div>
  )
}

import { useState, useMemo, useRef, useEffect } from 'react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { isTurkishHoliday } from '../../lib/holidays'
import { Trash2, Plus, CalendarX } from 'lucide-react'

function getTomorrowDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function getMaxDate() {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 2)
  return d.toISOString().split('T')[0]
}

function formatClosedDate(dateStr, language) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function ClosedDaysTab({ language, isGlobal, adminCityId }) {
  const { cities, closedDays, addClosedDay, removeClosedDay } = useApp()
  const inputClass = INPUT_BASE

  const [form, setForm] = useState({ date: '', city_id: isGlobal ? '' : String(adminCityId || ''), reason: '' })
  const [adding, setAdding] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const successTimerRef = useRef(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [filterCity, setFilterCity] = useState('')

  useEffect(() => () => clearTimeout(successTimerRef.current), [])

  const visibleDays = useMemo(() => {
    let list = isGlobal ? closedDays : closedDays.filter(d => !d.city_id || String(d.city_id) === String(adminCityId))
    if (isGlobal && filterCity) list = list.filter(d => !d.city_id || String(d.city_id) === String(filterCity))
    return list
  }, [closedDays, isGlobal, adminCityId, filterCity])

  const handleAdd = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    if (!form.date) return
    const cityId = isGlobal ? (form.city_id || null) : adminCityId
    const result = await addClosedDay(form.date, cityId, form.reason)
    if (result.success) {
      setForm(p => ({ ...p, date: '', reason: '' }))
      setSuccessMsg(t('closed_day_added', language))
      clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setSuccessMsg(''), 3000)
    } else {
      setErrorMsg(result.error || 'Error')
    }
  }

  const handleDelete = async (id) => {
    setProcessingId(id)
    await removeClosedDay(id)
    setProcessingId(null)
    setSuccessMsg(t('closed_day_deleted', language))
    clearTimeout(successTimerRef.current); successTimerRef.current = setTimeout(() => setSuccessMsg(''), 2000)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <CalendarX className="w-4 h-4 text-[#1565C0] dark:text-[#7DD4FC]" />
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('tab_closed_days', language)}</h3>
      </div>

      {/* Holidays note */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl px-4 py-3 mb-4 text-xs text-blue-700 dark:text-blue-300">
        {language === 'TR'
          ? 'Pazar günleri ve resmi tatiller otomatik olarak kapalıdır. Aşağıdan ek kapalı günler ekleyebilirsiniz.'
          : 'Sundays and public holidays are automatically closed. You can add additional closed days below.'}
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4 space-y-3">
        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('closed_day_add', language)}</h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Tarih *' : 'Date *'}</label>
            <input
              type="date"
              min={getTomorrowDate()}
              max={getMaxDate()}
              className={`${inputClass} w-full`}
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('closed_day_reason', language)}</label>
            <input
              type="text"
              className={`${inputClass} w-full`}
              placeholder={language === 'TR' ? 'Tatil, bakım...' : 'Holiday, maintenance...'}
              value={form.reason}
              onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
            />
          </div>
        </div>
        {isGlobal && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_province', language)}</label>
            <select className={`${inputClass} w-full`} value={form.city_id} onChange={e => setForm(p => ({ ...p, city_id: e.target.value }))}>
              <option value="">{language === 'TR' ? 'Tüm İller (global)' : 'All Provinces (global)'}</option>
              {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        {errorMsg && <p className="text-red-500 dark:text-red-400 text-xs">{errorMsg}</p>}
        {successMsg && <p className="text-green-600 dark:text-green-400 text-xs font-medium">{successMsg}</p>}
        <button
          type="submit"
          disabled={adding || !form.date}
          className="flex items-center gap-1 py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60"
        >
          <Plus className="w-3.5 h-3.5" />{t('closed_day_add', language)}
        </button>
      </form>

      {/* Filter */}
      {isGlobal && (
        <select className={`${inputClass} w-full mb-3`} value={filterCity} onChange={e => setFilterCity(e.target.value)}>
          <option value="">{t('filter_all_provinces', language)}</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {/* List */}
      {visibleDays.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-400 text-sm">
          {t('no_closed_days', language)}
        </div>
      ) : (
        <div className="space-y-2">
          {visibleDays.map(day => {
            const city = day.city_id ? cities.find(c => String(c.id) === String(day.city_id)) : null
            const isHoliday = isTurkishHoliday(day.date)
            return (
              <div key={day.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatClosedDate(day.date, language)}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {city ? city.name : (language === 'TR' ? 'Tüm İller' : 'All Provinces')}
                    {day.reason ? ` · ${day.reason}` : ''}
                    {isHoliday ? ` · ${t('lbl_holiday', language)}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(day.id)}
                  disabled={processingId === day.id}
                  className="text-red-500 hover:text-red-700 p-1.5 disabled:opacity-40 flex-shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

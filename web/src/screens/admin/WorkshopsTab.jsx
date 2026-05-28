import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { t, formatDate } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { X, Calendar, Clock, Users, Pencil, Trash2 } from 'lucide-react'
import { getLabIcon } from '../../lib/icons'

export default function WorkshopsTab({ language, isGlobal, adminCityId, onRequestConfirm }) {
  const { cities, workshops, addWorkshop, updateWorkshop, deleteWorkshop } = useApp()
  const inputClass = INPUT_BASE

  const [workshopForm, setWorkshopForm] = useState({ name: '', description: '', date: '', time: '', capacity: 1, location: '', city_id: '' })
  const [workshopError, setWorkshopError] = useState('')
  const [workshopSuccess, setWorkshopSuccess] = useState('')
  const [showAddWorkshop, setShowAddWorkshop] = useState(false)
  const [editingWorkshopId, setEditingWorkshopId] = useState(null)
  const [editWorkshopForm, setEditWorkshopForm] = useState({})
  const [editWorkshopLoading, setEditWorkshopLoading] = useState(false)
  const [workshopCityFilter, setWorkshopCityFilter] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const todayStr = new Date().toISOString().split('T')[0]
  const maxDate = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 2); return d.toISOString().split('T')[0] })()
  const TIME_RANGE_RE = /^([01]\d|2[0-3]):[0-5]\d\s*[-–]\s*([01]\d|2[0-3]):[0-5]\d$/

  const visibleWorkshops = useMemo(() => {
    let list = isGlobal ? workshops : workshops.filter(w => String(w.city_id) === String(adminCityId))
    if (isGlobal && workshopCityFilter) list = list.filter(w => String(w.city_id) === String(workshopCityFilter))
    return [...list].sort((a, b) => {
      const cityA = cities.find(c => String(c.id) === String(a.city_id))?.name || ''
      const cityB = cities.find(c => String(c.id) === String(b.city_id))?.name || ''
      return cityA.localeCompare(cityB, 'tr')
    })
  }, [workshops, isGlobal, adminCityId, workshopCityFilter, cities])

  const handleAddWorkshop = async (e) => {
    e.preventDefault()
    setWorkshopError('')
    const cityId = isGlobal ? workshopForm.city_id : adminCityId
    const cityObj = cities.find(c => String(c.id) === String(cityId))
    if (!workshopForm.name.trim() || !cityId) { setWorkshopError(t('workshop_name_required', language)); return }
    if (workshopForm.time && !TIME_RANGE_RE.test(workshopForm.time.trim())) {
      setWorkshopError(language === 'TR' ? 'Saat formatı geçersiz. Örnek: 09:00 - 17:00' : 'Invalid time format. Example: 09:00 - 17:00')
      return
    }
    if (Number(workshopForm.capacity) < 1) { setWorkshopError(language === 'TR' ? 'Kapasite en az 1 olmalıdır.' : 'Capacity must be at least 1.'); return }
    const result = await addWorkshop({ name: workshopForm.name, description: workshopForm.description, date: workshopForm.date || null, time: workshopForm.time || null, capacity: Number(workshopForm.capacity) || 1, location: workshopForm.location, city_id: cityId, city_name: cityObj?.name || '' })
    if (result.success) {
      setShowAddWorkshop(false)
      setWorkshopForm({ name: '', description: '', date: '', time: '', capacity: 1, location: '', city_id: '' })
      setWorkshopSuccess(t('workshop_added', language))
      setTimeout(() => setWorkshopSuccess(''), 3000)
    } else { setWorkshopError(result.error || t('err_generic', language)) }
  }

  const startEditWorkshop = (ws) => {
    setEditingWorkshopId(ws.id)
    setEditWorkshopForm({ name: ws.name || '', description: ws.description || '', date: ws.date || '', time: ws.time || '', capacity: ws.capacity || 1, location: ws.location || '' })
    setWorkshopError('')
  }

  const handleUpdateWorkshop = async (e) => {
    e.preventDefault()
    setWorkshopError('')
    if (!editWorkshopForm.name.trim()) { setWorkshopError(t('workshop_name_required', language)); return }
    if (editWorkshopForm.time && !TIME_RANGE_RE.test(editWorkshopForm.time.trim())) {
      setWorkshopError(language === 'TR' ? 'Saat formatı geçersiz. Örnek: 09:00 - 17:00' : 'Invalid time format. Example: 09:00 - 17:00')
      return
    }
    if (Number(editWorkshopForm.capacity) < 1) { setWorkshopError(language === 'TR' ? 'Kapasite en az 1 olmalıdır.' : 'Capacity must be at least 1.'); return }
    setEditWorkshopLoading(true)
    const result = await updateWorkshop(editingWorkshopId, { name: editWorkshopForm.name, description: editWorkshopForm.description, date: editWorkshopForm.date || null, time: editWorkshopForm.time || null, capacity: Number(editWorkshopForm.capacity) || 1, location: editWorkshopForm.location })
    setEditWorkshopLoading(false)
    if (result.success) {
      setEditingWorkshopId(null)
      setWorkshopSuccess(language === 'TR' ? 'Kayıt güncellendi' : 'Record updated')
      setTimeout(() => setWorkshopSuccess(''), 2500)
    } else { setWorkshopError(result.error || t('err_generic', language)) }
  }

  const handleDeleteWorkshop = (id) => {
    onRequestConfirm(t('workshop_delete_confirm', language), async () => {
      setProcessingId(id)
      await deleteWorkshop(id)
      setProcessingId(null)
    })
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('tab_workshops', language)}</h3>
        <button onClick={() => { setShowAddWorkshop(true); setWorkshopError('') }} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition">
          + {t('workshop_add', language)}
        </button>
      </div>

      {isGlobal && (
        <select className={`${inputClass} w-full mb-3`} value={workshopCityFilter} onChange={e => setWorkshopCityFilter(e.target.value)}>
          <option value="">{t('filter_all_provinces', language)}</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {workshopSuccess && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">{workshopSuccess}</div>}
      {workshopError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3">
          {workshopError} <button onClick={() => setWorkshopError('')} className="ml-2 text-red-400"><X className="w-3.5 h-3.5 inline" /></button>
        </div>
      )}

      {showAddWorkshop && (
        <form onSubmit={handleAddWorkshop} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('workshop_new', language)}</h4>
          {isGlobal ? (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_province', language)} *</label>
              <select className={`${inputClass} w-full`} value={workshopForm.city_id} onChange={e => setWorkshopForm(p => ({ ...p, city_id: e.target.value }))} required>
                <option value="">{t('select_province', language)}</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('lbl_province', language)}</label>
              <p className={`${inputClass} w-full bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400`}>{cities.find(c => String(c.id) === String(adminCityId))?.name || '—'}</p>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_name_label', language)} *</label>
            <input type="text" className={`${inputClass} w-full`} value={workshopForm.name} onChange={e => setWorkshopForm(p => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_desc_label', language)}</label>
            <input type="text" className={`${inputClass} w-full`} value={workshopForm.description} onChange={e => setWorkshopForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_date_label', language)}</label>
              <input type="date" min={todayStr} max={maxDate} className={`${inputClass} w-full`} value={workshopForm.date} onChange={e => setWorkshopForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_time_label', language)}</label>
              <input type="text" className={`${inputClass} w-full`} placeholder="09:00 - 17:00" value={workshopForm.time} onChange={e => setWorkshopForm(p => ({ ...p, time: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_location_label', language)}</label>
              <input type="text" className={`${inputClass} w-full`} value={workshopForm.location} onChange={e => setWorkshopForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_capacity_label', language)}</label>
              <input type="number" min="1" className={`${inputClass} w-full`} value={workshopForm.capacity} onChange={e => setWorkshopForm(p => ({ ...p, capacity: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl">{t('btn_save', language)}</button>
            <button type="button" onClick={() => { setShowAddWorkshop(false); setWorkshopError('') }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">{t('btn_nevermind', language)}</button>
          </div>
        </form>
      )}

      {visibleWorkshops.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-8 text-center text-gray-500 dark:text-gray-400 text-sm">{t('no_workshops', language)}</div>
      ) : (
        <div className="space-y-3">
          {visibleWorkshops.map(ws => {
            const city = cities.find(c => String(c.id) === String(ws.city_id))
            return (
              <div key={ws.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
                {editingWorkshopId === ws.id ? (
                  <form onSubmit={handleUpdateWorkshop} className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{language === 'TR' ? 'Atölyeyi Düzenle' : 'Edit Workshop'}</h4>
                      <button type="button" onClick={() => setEditingWorkshopId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_name_label', language)} *</label>
                      <input type="text" className={`${inputClass} w-full`} value={editWorkshopForm.name} onChange={e => setEditWorkshopForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_desc_label', language)}</label>
                      <input type="text" className={`${inputClass} w-full`} value={editWorkshopForm.description} onChange={e => setEditWorkshopForm(p => ({ ...p, description: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_date_label', language)}</label>
                        <input type="date" min={todayStr} max={maxDate} className={`${inputClass} w-full`} value={editWorkshopForm.date} onChange={e => setEditWorkshopForm(p => ({ ...p, date: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_time_label', language)}</label>
                        <input type="text" className={`${inputClass} w-full`} placeholder="09:00 - 17:00" value={editWorkshopForm.time} onChange={e => setEditWorkshopForm(p => ({ ...p, time: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_location_label', language)}</label>
                        <input type="text" className={`${inputClass} w-full`} value={editWorkshopForm.location} onChange={e => setEditWorkshopForm(p => ({ ...p, location: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{t('workshop_capacity_label', language)}</label>
                        <input type="number" min="1" className={`${inputClass} w-full`} value={editWorkshopForm.capacity} onChange={e => setEditWorkshopForm(p => ({ ...p, capacity: e.target.value }))} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={editWorkshopLoading} className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl disabled:opacity-60">
                        {editWorkshopLoading ? '...' : t('btn_save', language)}
                      </button>
                      <button type="button" onClick={() => setEditingWorkshopId(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">
                        {t('btn_nevermind', language)}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0 text-[#1565C0] dark:text-[#7DD4FC]">
                      {getLabIcon(ws.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{ws.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{city?.name || ws.city_name}{ws.location ? ` • ${ws.location}` : ''}</p>
                      {ws.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ws.description}</p>}
                      <div className="flex flex-wrap gap-3 mt-1.5">
                        {ws.date && <span className="text-xs bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 text-[#1565C0] dark:text-[#7DD4FC] px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-0.5"><Calendar className="w-3 h-3 inline" />{formatDate(ws.date)}</span>}
                        {ws.time && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-0.5"><Clock className="w-3 h-3 inline" />{ws.time}</span>}
                        {ws.capacity && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-0.5"><Users className="w-3 h-3 inline" />{ws.capacity}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => startEditWorkshop(ws)} className="text-[#1565C0] dark:text-[#7DD4FC] text-xs p-1.5 hover:bg-[#1565C0]/10 rounded-lg transition"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDeleteWorkshop(ws.id)} disabled={processingId === ws.id} className="text-red-500 hover:text-red-700 text-xs p-1.5 disabled:opacity-40"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

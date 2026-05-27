import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { t, translations, getLabIcon } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import LabFormFields from '../../components/admin/LabFormFields'
import { RefreshCw, X, Pencil } from 'lucide-react'

export default function StudiosTab({ language, isGlobal, adminCityId, onRequestConfirm }) {
  const { cities, labs, addLab, updateLab, deleteLab, forceDeleteLab, addWorkshop } = useApp()
  const inputClass = INPUT_BASE

  const [showAddLab, setShowAddLab] = useState(false)
  const [labForm, setLabForm] = useState({ name: '', description: '', capacity_per_slot: 1, location: '', branches: '', city_id: '' })
  const [labError, setLabError] = useState('')
  const [editingLabId, setEditingLabId] = useState(null)
  const [editLabForm, setEditLabForm] = useState({})
  const [labCityFilter, setLabCityFilter] = useState('')
  const [labSaveSuccess, setLabSaveSuccess] = useState('')
  const [migrating, setMigrating] = useState(false)
  const [processingId, setProcessingId] = useState(null)

  const needsMigration = isGlobal && labs.some(l =>
    (l.name.includes('Gölbaşı BİLSEM ÖÖL') && !l.name.startsWith('Ankara ')) ||
    l.name.includes('Öğretim Tasarımı ve Senaryo Atölyesi')
  )

  const visibleLabs = useMemo(() => {
    let list = isGlobal ? labs : labs.filter(l => String(l.city_id) === String(adminCityId))
    if (isGlobal && labCityFilter) list = list.filter(l => String(l.city_id) === String(labCityFilter))
    return list
  }, [labs, isGlobal, adminCityId, labCityFilter])

  const handleAddLab = async (e) => {
    e.preventDefault()
    setLabError('')
    const cityId = isGlobal ? labForm.city_id : adminCityId
    if (!cityId || !labForm.name.trim()) { setLabError(t('studio_city_required', language)); return }
    const result = await addLab({ name: labForm.name, description: labForm.description, capacity_per_slot: Number(labForm.capacity_per_slot) || 1, location: labForm.location, branches: labForm.branches, city_id: cityId })
    if (result.success) {
      setShowAddLab(false)
      setLabForm({ name: '', description: '', capacity_per_slot: 1, location: '', branches: '', city_id: '' })
      setLabSaveSuccess(language === 'TR' ? 'Kayıt eklendi.' : 'Record added.')
      setTimeout(() => setLabSaveSuccess(''), 2500)
    } else { setLabError(result.error || 'Error') }
  }

  const startEditLab = (lab) => {
    setEditingLabId(lab.id)
    setEditLabForm({ name: lab.name || '', description: lab.description || '', capacity_per_slot: lab.capacity_per_slot || 1, location: lab.location || '', branches: lab.branches || '' })
    setLabError('')
  }

  const handleUpdateLab = async (e) => {
    e.preventDefault()
    setLabError('')
    if (!editLabForm.name.trim()) { setLabError(t('studio_name_required', language)); return }
    const result = await updateLab(editingLabId, { name: editLabForm.name, description: editLabForm.description, capacity_per_slot: Number(editLabForm.capacity_per_slot) || 1, location: editLabForm.location, branches: editLabForm.branches })
    if (result.success) {
      setEditingLabId(null)
      setLabSaveSuccess(language === 'TR' ? 'Kayıt güncellendi.' : 'Record updated.')
      setTimeout(() => setLabSaveSuccess(''), 2500)
    } else {
      const errKey = result.error
      setLabError((errKey && translations[errKey]) ? t(errKey, language) : (result.error || t('err_generic', language)))
    }
  }

  const handleDeleteLab = (id) => {
    onRequestConfirm(t('delete_lab_confirm', language), async () => {
      setProcessingId(id)
      const result = await deleteLab(id)
      setProcessingId(null)
      if (!result.success) {
        const errKey = result.error
        setLabError((errKey && translations[errKey]) ? t(errKey, language) : (result.error || t('err_generic', language)))
      }
    })
  }

  const handleMigrateData = async () => {
    setMigrating(true)
    const golbasiLabs = labs.filter(l => l.name.includes('Gölbaşı BİLSEM ÖÖL') && !l.name.startsWith('Ankara '))
    for (const lab of golbasiLabs) await updateLab(lab.id, { name: 'Ankara ' + lab.name })
    const atolyeLabs = labs.filter(l => l.name.includes('Öğretim Tasarımı ve Senaryo Atölyesi'))
    for (const lab of atolyeLabs) {
      const wsResult = await addWorkshop({ name: lab.name, city_id: lab.city_id, description: lab.description || '', location: lab.location || '', date: '', time: '', capacity: lab.capacity_per_slot || 1 })
      if (wsResult.success) await forceDeleteLab(lab.id)
    }
    setMigrating(false)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm">{t('tab_studios_label', language)}</h3>
        <div className="flex gap-2">
          {needsMigration && (
            <button onClick={handleMigrateData} disabled={migrating} className="text-xs text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-600 rounded-lg px-3 py-1.5 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition disabled:opacity-60">
              {migrating ? '...' : <span className="inline-flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />{language === 'TR' ? 'Veriyi Düzenle' : 'Fix Data'}</span>}
            </button>
          )}
          <button onClick={() => { setShowAddLab(true); setEditingLabId(null); setLabError('') }} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition">
            {t('studio_add', language)}
          </button>
        </div>
      </div>

      {isGlobal && (
        <select className={`${inputClass} w-full mb-3`} value={labCityFilter} onChange={e => setLabCityFilter(e.target.value)}>
          <option value="">{t('filter_all_provinces', language)}</option>
          {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      )}

      {labSaveSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-3">{labSaveSuccess}</div>
      )}
      {labError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm mb-3">
          {labError} <button onClick={() => setLabError('')} className="ml-2 text-red-400"><X className="w-3.5 h-3.5 inline" /></button>
        </div>
      )}

      {showAddLab && (
        <form onSubmit={handleAddLab} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4 space-y-3">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('studio_new', language)}</h4>
          <LabFormFields form={labForm} setForm={setLabForm} cities={cities} inputClass={inputClass} language={language} showCity={isGlobal} />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl">{t('btn_save', language)}</button>
            <button type="button" onClick={() => { setShowAddLab(false); setLabError('') }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">{t('btn_nevermind', language)}</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {visibleLabs.map(lab => {
          const city = cities.find(c => String(c.id) === String(lab.city_id))
          const isEditing = editingLabId === lab.id
          return (
            <div key={lab.id} className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
              {isEditing ? (
                <form onSubmit={handleUpdateLab} className="space-y-3">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('studio_edit', language)}</h4>
                  <LabFormFields form={editLabForm} setForm={setEditLabForm} cities={cities} inputClass={inputClass} language={language} showCity={false} />
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl">{t('btn_save', language)}</button>
                    <button type="button" onClick={() => { setEditingLabId(null); setEditLabForm({}) }} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-xl">{t('btn_nevermind', language)}</button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[#1565C0] dark:text-[#7DD4FC] text-lg">{getLabIcon(lab.name)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{lab.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{city?.name}{lab.location ? ` • ${lab.location}` : ''}</p>
                    {lab.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{lab.description}</p>}
                    <p className="text-xs text-[#1565C0] dark:text-[#7DD4FC] mt-0.5">{t('capacity_label', language)}: {lab.capacity_per_slot}{lab.branches ? ` · ${lab.branches}` : ''}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => startEditLab(lab)} className="text-[#1565C0] dark:text-[#7DD4FC] text-xs p-1.5 hover:bg-[#1565C0]/10 rounded-lg transition"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDeleteLab(lab.id)} disabled={processingId === lab.id} className="text-red-500 hover:text-red-700 text-xs p-1.5 disabled:opacity-40">🗑</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

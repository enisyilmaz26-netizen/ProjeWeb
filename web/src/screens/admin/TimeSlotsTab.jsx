import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import SlotItem from '../../components/admin/SlotItem'
import LocationSlotSection from '../../components/admin/LocationSlotSection'
import { X } from 'lucide-react'

export default function TimeSlotsTab({ language, isGlobal, adminCityId }) {
  const { cities, labs, timeSlots, addTimeSlot, removeTimeSlot } = useApp()
  const inputClass = INPUT_BASE

  const [newSlotCityId, setNewSlotCityId] = useState(isGlobal ? '' : String(adminCityId || ''))
  const [newSlotTime, setNewSlotTime] = useState('')
  const [newSlotLocation, setNewSlotLocation] = useState('')
  const [slotError, setSlotError] = useState('')
  const [addingSlot, setAddingSlot] = useState(false)
  const [processingId, setProcessingId] = useState(null)

  const visibleSlots = useMemo(() => {
    return isGlobal ? timeSlots : timeSlots.filter(s => String(s.city_id) === String(adminCityId))
  }, [timeSlots, isGlobal, adminCityId])

  const TIME_RANGE_RE = /^([01]\d|2[0-3]):[0-5]\d\s*[-–]\s*([01]\d|2[0-3]):[0-5]\d$/

  const handleAddSlot = async () => {
    setSlotError('')
    const cityId = isGlobal ? newSlotCityId : adminCityId
    if (!cityId || !newSlotTime.trim()) {
      setSlotError(t('slot_required_fields', language))
      return
    }
    if (!TIME_RANGE_RE.test(newSlotTime.trim())) {
      setSlotError(language === 'TR' ? 'Geçersiz format. Örn: 09:00 - 17:00' : 'Invalid format. E.g.: 09:00 - 17:00')
      return
    }
    const [slotStart, slotEnd] = newSlotTime.trim().split(/\s*[-–]\s*/)
    if (slotStart >= slotEnd) {
      setSlotError(language === 'TR' ? 'Başlangıç saati bitiş saatinden önce olmalıdır.' : 'Start time must be before end time.')
      return
    }
    if (visibleSlots.some(s => s.time_range === newSlotTime.trim() && String(s.city_id) === String(cityId))) {
      setSlotError(language === 'TR' ? 'Bu saat dilimi zaten mevcut.' : 'This time slot already exists.')
      return
    }
    setAddingSlot(true)
    try {
      const result = await addTimeSlot(cityId, newSlotTime.trim(), newSlotLocation.trim() || null)
      if (result.success) {
        setNewSlotTime('')
        setNewSlotLocation('')
        if (isGlobal) setNewSlotCityId('')
      } else {
        setSlotError(t('err_generic', language))
      }
    } catch {
      setSlotError(t('err_generic', language))
    } finally {
      setAddingSlot(false)
    }
  }

  const handleRemoveSlot = async (id) => {
    setProcessingId(id)
    try {
      const result = await removeTimeSlot(id)
      if (!result.success) setSlotError(t('err_generic', language))
    } catch {
      setSlotError(t('err_generic', language))
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div>
      <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('slot_mgmt_title', language)}</h3>

      {isGlobal ? (
        <>
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('slot_add_new', language)}</h4>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <select className={`${inputClass} flex-1`} value={newSlotCityId} onChange={e => { setNewSlotCityId(e.target.value); setNewSlotLocation('') }}>
                  <option value="">{t('select_province', language)}</option>
                  {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="text" placeholder={t('slot_placeholder', language)} className={`${inputClass} flex-1`} value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} />
                <button onClick={handleAddSlot} disabled={addingSlot} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60">
                  {addingSlot ? '...' : `+ ${t('btn_add', language)}`}
                </button>
              </div>
              {newSlotCityId && (
                <input
                  type="text"
                  placeholder={language === 'TR' ? 'Konum (isteğe bağlı), örn: Gölbaşı BİLSEM' : 'Location (optional), e.g.: Gölbaşı BİLSEM'}
                  className={`${inputClass} w-full`}
                  value={newSlotLocation}
                  onChange={e => setNewSlotLocation(e.target.value)}
                />
              )}
            </div>
            {slotError && <p className="text-red-500 text-xs mt-2">{slotError} <button onClick={() => setSlotError('')} className="ml-1 text-red-400"><X className="w-3.5 h-3.5 inline" /></button></p>}
          </div>

          {cities.map(city => {
            const citySlots = visibleSlots.filter(s => String(s.city_id) === String(city.id))
            const cityLabLocs = [...new Set(labs.filter(l => String(l.city_id) === String(city.id) && l.location).map(l => l.location))]
            const citySlotLocs = [...new Set(citySlots.filter(s => s.location).map(s => s.location))]
            const allCityLocs = [...new Set([...cityLabLocs, ...citySlotLocs])]
            const hasMultiLoc = allCityLocs.length >= 2
            return (
              <div key={city.id} className="mb-6">
                <h4 className="text-xs font-bold text-[#1565C0] dark:text-[#7DD4FC] mb-2 uppercase tracking-wide">{city.name}</h4>
                {hasMultiLoc ? (
                  <div className="space-y-3">
                    {allCityLocs.map(loc => (
                      <LocationSlotSection
                        key={loc}
                        locationName={loc}
                        slots={citySlots.filter(s => s.location === loc)}
                        cityId={city.id}
                        processingId={processingId}
                        onAddSlot={addTimeSlot}
                        onRemove={handleRemoveSlot}
                        language={language}
                      />
                    ))}
                    {citySlots.filter(s => !s.location).length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{language === 'TR' ? 'Genel' : 'General'}</h5>
                        <div className="space-y-2">
                          {citySlots.filter(s => !s.location).map(slot => (
                            <SlotItem key={slot.id} slot={slot} processingId={processingId} onRemove={handleRemoveSlot} language={language} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : citySlots.length === 0 ? null : (
                  <div className="space-y-2">
                    {citySlots.map(slot => <SlotItem key={slot.id} slot={slot} processingId={processingId} onRemove={handleRemoveSlot} language={language} />)}
                  </div>
                )}
              </div>
            )
          })}
        </>
      ) : (() => {
        const cityLocations = [...new Set([
          ...labs.filter(l => String(l.city_id) === String(adminCityId) && l.location).map(l => l.location),
          ...visibleSlots.filter(s => s.location).map(s => s.location),
        ])]

        if (cityLocations.length >= 2) {
          return (
            <div className="space-y-4">
              {cityLocations.map(loc => (
                <LocationSlotSection
                  key={loc}
                  locationName={loc}
                  slots={visibleSlots.filter(s => s.location === loc)}
                  cityId={adminCityId}
                  processingId={processingId}
                  onAddSlot={addTimeSlot}
                  onRemove={handleRemoveSlot}
                  language={language}
                />
              ))}
              {slotError && <p className="text-red-500 text-xs mt-1">{slotError} <button onClick={() => setSlotError('')} className="ml-1 text-red-400"><X className="w-3.5 h-3.5 inline" /></button></p>}
            </div>
          )
        }

        return (
          <>
            <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4">
              <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">{t('slot_add_new', language)}</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" placeholder={t('slot_placeholder', language)} className={`${inputClass} flex-1`} value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} />
                <button onClick={handleAddSlot} disabled={addingSlot} className="py-2 px-4 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60">
                  {addingSlot ? '...' : `+ ${t('btn_add', language)}`}
                </button>
              </div>
              {slotError && <p className="text-red-500 text-xs mt-2">{slotError} <button onClick={() => setSlotError('')} className="ml-1 text-red-400"><X className="w-3.5 h-3.5 inline" /></button></p>}
            </div>
            <div className="space-y-2">
              {visibleSlots.length === 0 ? (
                <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-6 text-center text-gray-500 dark:text-gray-400 text-sm">
                  {t('slot_none', language)}
                </div>
              ) : (
                visibleSlots.map(slot => <SlotItem key={slot.id} slot={slot} processingId={processingId} onRemove={handleRemoveSlot} language={language} />)
              )}
            </div>
          </>
        )
      })()}
    </div>
  )
}

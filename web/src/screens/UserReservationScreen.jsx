import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { t } from '../lib/languages'

function getMaxCapacity(lab) {
  if (!lab) return 1
  const name = lab.name || ''
  if (name.includes('Ses') || name.includes('Video') || name.includes('Podcast')) {
    return 1
  }
  return lab.capacity_per_slot || 1
}

function getTomorrowDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export default function UserReservationScreen() {
  const { cities, labs, appointments, timeSlots, loggedInUser, submitAppointment, language } = useApp()

  const [step, setStep] = useState(1)
  const [selectedCity, setSelectedCity] = useState(null)
  const [selectedLab, setSelectedLab] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // User can only see their own city
  const userCity = useMemo(() => {
    if (!loggedInUser) return null
    return cities.find(c => String(c.id) === String(loggedInUser.city_id)) || null
  }, [cities, loggedInUser])

  const availableCities = userCity ? [userCity] : []

  const cityLabs = useMemo(() => {
    if (!selectedCity) return []
    return labs.filter(l => String(l.city_id) === String(selectedCity.id))
  }, [labs, selectedCity])

  const citySlots = useMemo(() => {
    if (!selectedCity) return []
    return timeSlots.filter(s => String(s.city_id) === String(selectedCity.id))
  }, [timeSlots, selectedCity])

  const getSlotAvailability = (slot) => {
    if (!selectedLab || !selectedDate) return { count: 0, remaining: 0, full: false }
    const maxCapacity = getMaxCapacity(selectedLab)
    const count = appointments.filter(a =>
      String(a.lab_id) === String(selectedLab.id) &&
      a.date === selectedDate &&
      a.time_slot === slot.time_range &&
      (a.status === 'PENDING' || a.status === 'APPROVED')
    ).length
    const remaining = Math.max(0, maxCapacity - count)
    return { count, remaining, full: remaining === 0, maxCapacity }
  }

  const handleCitySelect = (city) => {
    setSelectedCity(city)
    setSelectedLab(null)
    setSelectedDate('')
    setSelectedSlot(null)
    setStep(2)
  }

  const handleLabSelect = (lab) => {
    setSelectedLab(lab)
    setSelectedDate('')
    setSelectedSlot(null)
    setStep(3)
  }

  const handleDateSelect = (date) => {
    setSelectedDate(date)
    setSelectedSlot(null)
    setStep(4)
  }

  const handleSlotSelect = (slot) => {
    const avail = getSlotAvailability(slot)
    if (avail.full) return
    setSelectedSlot(slot)
    setStep(5)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!loggedInUser || !selectedCity || !selectedLab || !selectedDate || !selectedSlot) return
    setSubmitting(true)
    setErrorMsg('')
    const result = await submitAppointment({
      lab_id: selectedLab.id,
      lab_name: selectedLab.name,
      city_id: selectedCity.id,
      city_name: selectedCity.name,
      date: selectedDate,
      time_slot: selectedSlot.time_range,
      user_name: loggedInUser.name,
      user_surname: loggedInUser.surname,
      user_branch: loggedInUser.branch,
      user_work_location: loggedInUser.work_location,
      user_phone: loggedInUser.phone,
      user_email: loggedInUser.email,
      user_city: loggedInUser.city_name || selectedCity.name,
      user_district: loggedInUser.district,
      note: note,
    })
    setSubmitting(false)
    if (result.success) {
      setSuccessMsg(language === 'TR' ? 'Randevu talebiniz başarıyla oluşturuldu!' : 'Your reservation request was created successfully!')
      setStep(1)
      setSelectedCity(null)
      setSelectedLab(null)
      setSelectedDate('')
      setSelectedSlot(null)
      setNote('')
    } else {
      setErrorMsg(result.error || (language === 'TR' ? 'Bir hata oluştu.' : 'An error occurred.'))
    }
  }

  const resetToStep = (s) => {
    if (s <= 1) { setSelectedCity(null); setSelectedLab(null); setSelectedDate(''); setSelectedSlot(null); setStep(1) }
    else if (s <= 2) { setSelectedLab(null); setSelectedDate(''); setSelectedSlot(null); setStep(2) }
    else if (s <= 3) { setSelectedDate(''); setSelectedSlot(null); setStep(3) }
    else if (s <= 4) { setSelectedSlot(null); setStep(4) }
  }

  const cardClass = "bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4 mb-4"

  return (
    <div className="px-4 py-4">
      {/* Success message */}
      {successMsg && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-4 flex justify-between items-start">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-2 text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {/* Breadcrumb / Progress */}
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-4 flex-wrap">
        <button onClick={() => resetToStep(1)} className={`font-medium ${step >= 1 ? 'text-[#6750A4] dark:text-[#D0BCFF]' : ''}`}>
          {t('select_city', language)}
        </button>
        {step >= 2 && <><span>›</span><button onClick={() => resetToStep(2)} className="font-medium text-[#6750A4] dark:text-[#D0BCFF]">{selectedCity?.name}</button></>}
        {step >= 3 && <><span>›</span><button onClick={() => resetToStep(3)} className="font-medium text-[#6750A4] dark:text-[#D0BCFF]">{selectedLab?.name}</button></>}
        {step >= 4 && <><span>›</span><button onClick={() => resetToStep(4)} className="font-medium text-[#6750A4] dark:text-[#D0BCFF]">{selectedDate}</button></>}
        {step >= 5 && <><span>›</span><span className="font-medium text-[#6750A4] dark:text-[#D0BCFF]">{selectedSlot?.time_range}</span></>}
      </div>

      {/* Step 1: City Selection */}
      {step === 1 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{t('select_city', language)}</h2>
          {availableCities.length === 0 ? (
            <div className={cardClass}>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                {language === 'TR' ? 'Şehir bilgisi bulunamadı.' : 'No city information found.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableCities.map(city => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-5 text-left hover:ring-2 hover:ring-[#6750A4] dark:hover:ring-[#D0BCFF] transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#6750A4]/10 dark:bg-[#D0BCFF]/10 flex items-center justify-center">
                      <span className="text-[#6750A4] dark:text-[#D0BCFF] font-bold text-lg">{city.name?.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{city.name}</p>
                      {city.code && <p className="text-xs text-gray-500 dark:text-gray-400">{city.code}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Lab Selection */}
      {step === 2 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{t('select_lab', language)}</h2>
          {cityLabs.length === 0 ? (
            <div className={cardClass}>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                {language === 'TR' ? 'Bu şehir için stüdyo bulunamadı.' : 'No studios found for this city.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group labs by location */}
              {(() => {
                const locations = [...new Set(cityLabs.map(l => l.location || '').filter(Boolean))]
                const hasMultipleLocations = locations.length > 1
                if (!hasMultipleLocations) {
                  return cityLabs.map(lab => <LabCard key={lab.id} lab={lab} onClick={() => handleLabSelect(lab)} language={language} getMaxCapacity={getMaxCapacity} />)
                }
                return locations.map(loc => (
                  <div key={loc}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-[#6750A4] dark:text-[#D0BCFF] uppercase tracking-wide">📍 {loc}</span>
                      <div className="flex-1 h-px bg-[#6750A4]/20 dark:bg-[#D0BCFF]/20" />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {cityLabs.filter(l => l.location === loc).map(lab => (
                        <LabCard key={lab.id} lab={lab} onClick={() => handleLabSelect(lab)} language={language} getMaxCapacity={getMaxCapacity} />
                      ))}
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
          <button onClick={() => resetToStep(1)} className="mt-3 text-sm text-[#6750A4] dark:text-[#D0BCFF] font-medium flex items-center gap-1">
            ← {language === 'TR' ? 'Şehir Seçimine Dön' : 'Back to City Selection'}
          </button>
        </div>
      )}

      {/* Step 3: Date Picker */}
      {step === 3 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{t('select_date', language)}</h2>
          <div className={cardClass}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#6750A4]/10 dark:bg-[#D0BCFF]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#6750A4] dark:text-[#D0BCFF] text-lg">🎙</span>
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{selectedLab?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{selectedCity?.name}</p>
              </div>
            </div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('select_date', language)}</label>
            <input
              type="date"
              min={getTomorrowDate()}
              value={selectedDate}
              onChange={e => handleDateSelect(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2C2A31] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6750A4] dark:focus:ring-[#D0BCFF] text-sm"
            />
          </div>
          <button onClick={() => resetToStep(2)} className="mt-1 text-sm text-[#6750A4] dark:text-[#D0BCFF] font-medium flex items-center gap-1">
            ← {language === 'TR' ? 'Stüdyo Seçimine Dön' : 'Back to Studio Selection'}
          </button>
        </div>
      )}

      {/* Step 4: Time Slot Selection */}
      {step === 4 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{t('select_time_slot', language)}</h2>
          <div className="bg-[#6750A4]/5 dark:bg-[#D0BCFF]/5 rounded-xl px-3 py-2 mb-3 text-xs text-gray-600 dark:text-gray-400 flex gap-2 flex-wrap">
            <span className="font-medium text-[#6750A4] dark:text-[#D0BCFF]">{selectedLab?.name}</span>
            <span>•</span>
            <span>{selectedDate}</span>
            <span>•</span>
            <span>{selectedCity?.name}</span>
          </div>
          {citySlots.length === 0 ? (
            <div className={cardClass}>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                {language === 'TR' ? 'Bu şehir için saat dilimi tanımlanmamış.' : 'No time slots defined for this city.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {citySlots.map(slot => {
                const avail = getSlotAvailability(slot)
                return (
                  <button
                    key={slot.id}
                    onClick={() => handleSlotSelect(slot)}
                    disabled={avail.full}
                    className={`rounded-2xl p-4 text-left border-2 transition active:scale-[0.98] ${
                      avail.full
                        ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                        : 'bg-white dark:bg-[#1D1B20] border-transparent hover:border-[#6750A4] dark:hover:border-[#D0BCFF] shadow'
                    }`}
                  >
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{slot.time_range}</p>
                    {avail.full ? (
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">{t('slot_full', language)}</p>
                    ) : (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        {t('slots_remaining', language)}: <span className="font-bold">{avail.remaining}</span>/{avail.maxCapacity}
                      </p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          <button onClick={() => resetToStep(3)} className="mt-3 text-sm text-[#6750A4] dark:text-[#D0BCFF] font-medium flex items-center gap-1">
            ← {language === 'TR' ? 'Tarih Seçimine Dön' : 'Back to Date Selection'}
          </button>
        </div>
      )}

      {/* Step 5: Personal Info & Submit */}
      {step === 5 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{t('personal_details_header', language)}</h2>

          {/* Summary card */}
          <div className="bg-[#6750A4]/8 dark:bg-[#D0BCFF]/8 border border-[#6750A4]/20 dark:border-[#D0BCFF]/20 rounded-xl px-4 py-3 mb-4">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-gray-500 dark:text-gray-400">{language === 'TR' ? 'Şehir' : 'City'}:</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{selectedCity?.name}</span>
              <span className="text-gray-500 dark:text-gray-400">{language === 'TR' ? 'Stüdyo' : 'Studio'}:</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{selectedLab?.name}</span>
              <span className="text-gray-500 dark:text-gray-400">{language === 'TR' ? 'Tarih' : 'Date'}:</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{selectedDate}</span>
              <span className="text-gray-500 dark:text-gray-400">{language === 'TR' ? 'Saat' : 'Time'}:</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{selectedSlot?.time_range}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <InfoField label={t('input_name', language)} value={loggedInUser?.name} />
                <InfoField label={t('input_surname', language)} value={loggedInUser?.surname} />
              </div>
              <InfoField label={t('input_branch', language)} value={loggedInUser?.branch} />
              <InfoField label={t('input_work_location', language)} value={loggedInUser?.work_location} />
              <InfoField label={t('input_phone', language)} value={loggedInUser?.phone} />
              <InfoField label={t('input_email', language)} value={loggedInUser?.email} />
              <div className="grid grid-cols-2 gap-3">
                <InfoField label={t('input_city', language)} value={loggedInUser?.city_name} />
                <InfoField label={t('input_district', language)} value={loggedInUser?.district} />
              </div>

              {/* Note */}
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{t('input_note', language)}</label>
                <textarea
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2C2A31] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#6750A4] dark:focus:ring-[#D0BCFF] text-sm resize-none"
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={t('input_note', language)}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-300 text-sm">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-[#6750A4] dark:bg-[#D0BCFF] text-white dark:text-[#141218] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60 shadow"
            >
              {submitting ? (language === 'TR' ? 'Gönderiliyor...' : 'Submitting...') : t('submit_button', language)}
            </button>
          </form>

          <button onClick={() => resetToStep(4)} className="mt-3 text-sm text-[#6750A4] dark:text-[#D0BCFF] font-medium flex items-center gap-1">
            ← {language === 'TR' ? 'Saat Seçimine Dön' : 'Back to Time Selection'}
          </button>
        </div>
      )}
    </div>
  )
}

function LabCard({ lab, onClick, language, getMaxCapacity }) {
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-[#1D1B20] rounded-2xl shadow p-4 text-left hover:ring-2 hover:ring-[#6750A4] dark:hover:ring-[#D0BCFF] transition active:scale-[0.98] w-full"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#6750A4]/10 dark:bg-[#D0BCFF]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[#6750A4] dark:text-[#D0BCFF] text-lg">🎙</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{lab.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {language === 'TR' ? 'Kapasite' : 'Capacity'}: {getMaxCapacity(lab)}
          </p>
        </div>
        <span className="text-gray-400 dark:text-gray-500 text-sm">›</span>
      </div>
    </button>
  )
}

function InfoField({ label, value }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#2C2A31] text-gray-800 dark:text-gray-200 text-sm min-h-[38px] flex items-center">
        {value || '—'}
      </div>
    </div>
  )
}

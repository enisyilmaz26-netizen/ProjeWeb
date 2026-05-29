import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { t, formatDate, translations } from '../lib/languages'
import { X, MapPin, Clock } from 'lucide-react'
import { getLabIcon } from '../lib/icons'
import { isTurkishHoliday, isSunday } from '../lib/holidays'
import CalendarView from '../components/CalendarView'

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

const BOOKING_WINDOW_DAYS = 60

function getMaxDate() {
  const d = new Date()
  d.setDate(d.getDate() + BOOKING_WINDOW_DAYS)
  return d.toISOString().split('T')[0]
}

function normalizeSlot(str) {
  return (str || '').replace(/(\d{2}:\d{2})-(\d{2}:\d{2})/, '$1 - $2')
}

export default function UserReservationScreen() {
  const { cities, labs, appointments, timeSlots, loggedInUser, submitAppointment, language, isDateClosed, waitlist, addToWaitlist, removeFromWaitlist } = useApp()
  const todayStr = new Date().toISOString().split('T')[0]

  const [step, setStep] = useState(1)
  const [selectedCity, setSelectedCity] = useState(null)
  const [selectedLab, setSelectedLab] = useState(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [dateError, setDateError] = useState('')
  const [waitlistMsg, setWaitlistMsg] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)

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
    const all = timeSlots.filter(s => String(s.city_id) === String(selectedCity.id))
    if (!selectedLab?.location) return all.filter(s => !s.location)
    return all.filter(s => !s.location || s.location === selectedLab.location)
  }, [timeSlots, selectedCity, selectedLab])

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
    if (isSunday(date)) {
      setDateError(t('err_sunday', language))
      return
    }
    if (isTurkishHoliday(date)) {
      setDateError(t('err_date_holiday', language))
      return
    }
    if (selectedCity && isDateClosed(date, selectedCity.id)) {
      setDateError(t('err_date_closed', language))
      return
    }
    setDateError('')
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if (submitting) return
    if (!loggedInUser || !selectedCity || !selectedLab || !selectedDate || !selectedSlot) return
    setShowConfirm(true)
  }

  const doSubmit = async () => {
    setShowConfirm(false)
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
      setSuccessMsg(t('appointment_success', language))
      setStep(1)
      setSelectedCity(null)
      setSelectedLab(null)
      setSelectedDate('')
      setSelectedSlot(null)
      setNote('')
    } else {
      const errKey = result.error
      const errMsg = (errKey && translations[errKey]) ? t(errKey, language) : (errKey || t('err_generic', language))
      setErrorMsg(errMsg)
    }
  }

  const resetToStep = (s) => {
    if (s <= 1) { setSelectedCity(null); setSelectedLab(null); setSelectedDate(''); setSelectedSlot(null); setStep(1); setSuccessMsg('') }
    else if (s <= 2) { setSelectedLab(null); setSelectedDate(''); setSelectedSlot(null); setStep(2) }
    else if (s <= 3) { setSelectedDate(''); setSelectedSlot(null); setStep(3) }
    else if (s <= 4) { setSelectedSlot(null); setStep(4) }
  }

  const cardClass = "bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 mb-4"

  return (
    <div className="px-4 py-4">
      {/* Success message */}
      {successMsg && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-300 text-sm mb-4 flex justify-between items-start">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="ml-2 text-green-500 hover:text-green-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Breadcrumb / Progress */}
      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-4 flex-wrap">
        <button onClick={() => resetToStep(1)} className={`font-medium ${step >= 1 ? 'text-[#1565C0] dark:text-[#7DD4FC]' : ''}`}>
          {t('select_city', language)}
        </button>
        {step >= 2 && <><span>›</span><button onClick={() => resetToStep(2)} className="font-medium text-[#1565C0] dark:text-[#7DD4FC]">{selectedCity?.name}</button></>}
        {step >= 3 && <><span>›</span><button onClick={() => resetToStep(3)} className="font-medium text-[#1565C0] dark:text-[#7DD4FC]">{selectedLab?.name}</button></>}
        {step >= 4 && <><span>›</span><button onClick={() => resetToStep(4)} className="font-medium text-[#1565C0] dark:text-[#7DD4FC]">{formatDate(selectedDate)}</button></>}
        {step >= 5 && <><span>›</span><span className="font-medium text-[#1565C0] dark:text-[#7DD4FC]">{selectedSlot?.time_range}</span></>}
      </div>

      {/* Step 1: City Selection */}
      {step === 1 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{t('select_city', language)}</h2>
          {availableCities.length === 0 ? (
            <div className={cardClass}>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                {t('province_not_found', language)}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableCities.map(city => (
                <button
                  key={city.id}
                  onClick={() => handleCitySelect(city)}
                  className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-5 text-left hover:ring-2 hover:ring-[#1565C0] dark:hover:ring-[#7DD4FC] transition active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center">
                      <span className="text-[#1565C0] dark:text-[#7DD4FC] font-bold text-lg">{city.name?.charAt(0)}</span>
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
                {t('studios_not_found', language)}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group labs by location */}
              {(() => {
                const locations = [...new Set(cityLabs.map(l => l.location || '').filter(Boolean))]
                const hasMultipleLocations = locations.length > 1
                const labCard = (lab) => {
                  const todayCount = appointments.filter(a =>
                    String(a.lab_id) === String(lab.id) && a.date === todayStr &&
                    (a.status === 'PENDING' || a.status === 'APPROVED')
                  ).length
                  return <LabCard key={lab.id} lab={lab} onClick={() => handleLabSelect(lab)} language={language} getMaxCapacity={getMaxCapacity} todayCount={todayCount} />
                }
                if (!hasMultipleLocations) {
                  return cityLabs.map(labCard)
                }
                const noLocationLabs = cityLabs.filter(l => !l.location)
                return (
                  <>
                    {locations.map(loc => (
                      <div key={loc}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-[#1565C0] dark:text-[#7DD4FC] uppercase tracking-wide inline-flex items-center gap-0.5"><MapPin className="w-3.5 h-3.5 inline" />{loc}</span>
                          <div className="flex-1 h-px bg-[#1565C0]/20 dark:bg-[#7DD4FC]/20" />
                        </div>
                        <div className="grid grid-cols-1 gap-3">
                          {cityLabs.filter(l => l.location === loc).map(labCard)}
                        </div>
                      </div>
                    ))}
                    {noLocationLabs.map(labCard)}
                  </>
                )
              })()}
            </div>
          )}
          <button onClick={() => resetToStep(1)} className="mt-3 text-sm text-[#1565C0] dark:text-[#7DD4FC] font-medium flex items-center gap-1">
            ← {t('back_to_province', language)}
          </button>
        </div>
      )}

      {/* Step 3: Date Picker */}
      {step === 3 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{t('select_date', language)}</h2>
          <div className="flex items-center gap-3 mb-3 bg-white dark:bg-[#0D1E3D] rounded-2xl shadow px-4 py-3">
            <div className="w-9 h-9 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
              <span className="text-[#1565C0] dark:text-[#7DD4FC] text-lg">{getLabIcon(selectedLab?.name)}</span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{selectedLab?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedCity?.name}</p>
            </div>
          </div>
          <CalendarView
            appointments={[]}
            onDayClick={handleDateSelect}
            language={language}
            selectedDate={selectedDate}
            minDate={getTomorrowDate()}
            maxDate={getMaxDate()}
            isDateDisabled={(date) =>
              isSunday(date) ||
              isTurkishHoliday(date) ||
              (selectedCity ? isDateClosed(date, selectedCity.id) : false)
            }
            showLegend={false}
          />
          {dateError && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400 px-1">{dateError}</p>
          )}
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 px-1">
            {t('date_restriction', language)}
          </p>
          <button onClick={() => resetToStep(2)} className="mt-2 text-sm text-[#1565C0] dark:text-[#7DD4FC] font-medium flex items-center gap-1">
            ← {t('back_to_studio', language)}
          </button>
        </div>
      )}

      {/* Step 4: Time Slot Selection */}
      {step === 4 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{t('select_time_slot', language)}</h2>
          <div className="bg-[#1565C0]/5 dark:bg-[#7DD4FC]/5 rounded-xl px-3 py-2 mb-3 text-xs text-gray-600 dark:text-gray-400 flex gap-2 flex-wrap">
            <span className="font-medium text-[#1565C0] dark:text-[#7DD4FC]">{selectedLab?.name}</span>
            <span>•</span>
            <span>{formatDate(selectedDate)}</span>
            <span>•</span>
            <span>{selectedCity?.name}</span>
          </div>
          {citySlots.length === 0 ? (
            <div className={cardClass}>
              <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
                {t('no_timeslots', language)}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {waitlistMsg && (
                <div className="col-span-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl text-blue-700 dark:text-blue-300 text-xs">{waitlistMsg}</div>
              )}
              {citySlots.map(slot => {
                const avail = getSlotAvailability(slot)
                const onWaitlist = waitlist.some(w =>
                  String(w.lab_id) === String(selectedLab?.id) &&
                  w.date === selectedDate &&
                  w.time_slot === slot.time_range
                )
                return (
                  <div key={slot.id} className="flex flex-col gap-1">
                    <button
                      onClick={() => handleSlotSelect(slot)}
                      disabled={avail.full}
                      className={`rounded-2xl p-4 text-left border-2 transition active:scale-[0.98] ${
                        avail.full
                          ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'
                          : 'bg-white dark:bg-[#0D1E3D] border-transparent hover:border-[#1565C0] dark:hover:border-[#7DD4FC] shadow'
                      }`}
                    >
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{normalizeSlot(slot.time_range)}</p>
                      {avail.full ? (
                        <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">{t('slot_full', language)}</p>
                      ) : (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          {t('slots_remaining', language)}: <span className="font-bold">{avail.remaining}</span>/{avail.maxCapacity}
                        </p>
                      )}
                    </button>
                    {avail.full && (
                      <button
                        onClick={async () => {
                          setWaitlistMsg('')
                          if (onWaitlist) {
                            const entry = waitlist.find(w => String(w.lab_id) === String(selectedLab?.id) && w.date === selectedDate && w.time_slot === slot.time_range)
                            if (entry) { await removeFromWaitlist(entry.id); setWaitlistMsg(language === 'TR' ? 'Bekleme listesinden çıkarıldınız.' : 'Removed from waitlist.') }
                          } else {
                            const res = await addToWaitlist({
                              lab_id: selectedLab.id, lab_name: selectedLab.name,
                              city_id: selectedCity.id, city_name: selectedCity.name,
                              date: selectedDate, time_slot: slot.time_range,
                              user_id: loggedInUser.id, user_email: loggedInUser.email,
                              user_name: loggedInUser.name, user_surname: loggedInUser.surname,
                              user_phone: loggedInUser.phone || '', user_branch: loggedInUser.branch || '',
                              user_work_location: loggedInUser.work_location || '',
                              user_city: loggedInUser.city_name || '', user_district: loggedInUser.district || '',
                            })
                            setWaitlistMsg(res.success ? (language === 'TR' ? 'Bekleme listesine eklendiniz. Yer açıldığında bildirim alacaksınız.' : 'Added to waitlist. You will be notified when a slot opens.') : (res.error || ''))
                          }
                        }}
                        className={`w-full py-1.5 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1 ${onWaitlist ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200' : 'border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                      >
                        <Clock className="w-3 h-3" />
                        {onWaitlist ? (language === 'TR' ? '✓ Bekleme Listesinde' : '✓ On Waitlist') : (language === 'TR' ? 'Bekleme Listesine Ekle' : 'Join Waitlist')}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          <button onClick={() => resetToStep(3)} className="mt-3 text-sm text-[#1565C0] dark:text-[#7DD4FC] font-medium flex items-center gap-1">
            ← {t('back_to_date', language)}
          </button>
        </div>
      )}

      {/* Step 5: Personal Info & Submit */}
      {step === 5 && (
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">{t('personal_details_header', language)}</h2>

          {/* Summary card */}
          <div className="bg-[#1565C0]/8 dark:bg-[#7DD4FC]/8 border border-[#1565C0]/20 dark:border-[#7DD4FC]/20 rounded-xl px-4 py-3 mb-4">
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-gray-500 dark:text-gray-400">{t('province_label', language)}:</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{selectedCity?.name}</span>
              <span className="text-gray-500 dark:text-gray-400">{t('studio_label', language)}:</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{selectedLab?.name}</span>
              <span className="text-gray-500 dark:text-gray-400">{t('date_label', language)}:</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{formatDate(selectedDate)}</span>
              <span className="text-gray-500 dark:text-gray-400">{t('time_label', language)}:</span>
              <span className="text-gray-800 dark:text-gray-200 font-medium">{selectedSlot?.time_range}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 space-y-3">
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
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#0E1A30] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1565C0] dark:focus:ring-[#7DD4FC] text-sm resize-none"
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder={t('input_note', language)}
                  maxLength={500}
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
              className="w-full py-3 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition disabled:opacity-60 shadow"
            >
              {submitting ? t('submitting', language) : t('submit_button', language)}
            </button>
          </form>

          <button onClick={() => resetToStep(4)} className="mt-3 text-sm text-[#1565C0] dark:text-[#7DD4FC] font-medium flex items-center gap-1">
            ← {t('back_to_time', language)}
          </button>
        </div>
      )}

      {/* Randevu onay modali */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base mb-3">
              {language === 'TR' ? 'Randevuyu Onayla' : 'Confirm Appointment'}
            </h3>
            <div className="bg-gray-50 dark:bg-[#0E1A30] rounded-xl px-4 py-3 mb-4 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('province_label', language)}</span><span className="font-medium text-gray-800 dark:text-gray-200">{selectedCity?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('studio_label', language)}</span><span className="font-medium text-gray-800 dark:text-gray-200">{selectedLab?.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('date_label', language)}</span><span className="font-medium text-gray-800 dark:text-gray-200">{formatDate(selectedDate)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">{t('time_label', language)}</span><span className="font-medium text-gray-800 dark:text-gray-200">{selectedSlot?.time_range}</span></div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={doSubmit}
                className="flex-1 py-2.5 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-sm font-semibold rounded-xl hover:opacity-90 transition"
              >
                {language === 'TR' ? 'Onayla' : 'Confirm'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                {language === 'TR' ? 'Geri Dön' : 'Go Back'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LabCard({ lab, onClick, language, getMaxCapacity, todayCount = 0 }) {
  const cap = getMaxCapacity(lab)
  return (
    <button
      onClick={onClick}
      className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 text-left hover:ring-2 hover:ring-[#1565C0] dark:hover:ring-[#7DD4FC] transition active:scale-[0.98] w-full"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-[#1565C0] dark:text-[#7DD4FC] text-lg">{getLabIcon(lab.name)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{lab.name}</p>
          {lab.description && <p className="text-xs text-gray-500 dark:text-gray-400">{lab.description}</p>}
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('capacity_label', language)}: {cap}
              {lab.branches ? ` · ${lab.branches}` : ''}
            </p>
            {todayCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${todayCount >= cap ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                {todayCount}/{cap} {t('today_bookings_badge', language)}
              </span>
            )}
          </div>
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
      <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#0E1A30] text-gray-800 dark:text-gray-200 text-sm min-h-[38px] flex items-center">
        {value || '-'}
      </div>
    </div>
  )
}

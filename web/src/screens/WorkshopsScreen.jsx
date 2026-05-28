import React, { useState, useRef, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { t, formatDate } from '../lib/languages'
import { BookOpen, Calendar, Clock, Users, CheckCircle2, Award } from 'lucide-react'
import { getLabIcon } from '../lib/icons'
import CertificateModal from '../components/CertificateModal'

export default function WorkshopsScreen() {
  const { workshops, loggedInUser, cities, language, workshopRegistrations, workshopRegistrationsAvailable, registerForWorkshop, unregisterFromWorkshop, certificateTemplates } = useApp()
  const [registering, setRegistering] = useState(null)
  const [regMsg, setRegMsg] = useState('')
  const regTimerRef = useRef(null)
  useEffect(() => () => clearTimeout(regTimerRef.current), [])
  const [certModal, setCertModal] = useState(null) // { ws, template }

  const userCityId = loggedInUser?.city_id
  const userCity = cities.find(c => String(c.id) === String(userCityId))

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` })()

  const cityWorkshops = workshops
    .filter(w => !w.city_id || String(w.city_id) === String(userCityId))
    .sort((a, b) => {
      if (!a.date && !b.date) return 0
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date > b.date ? 1 : -1
    })

  const upcoming = cityWorkshops.filter(w => !w.date || w.date >= today)
  const past = cityWorkshops.filter(w => w.date && w.date < today)

  const handleRegister = async (wsId) => {
    setRegistering(wsId)
    const result = await registerForWorkshop(wsId)
    setRegistering(null)
    if (result.success) {
      setRegMsg(t('workshop_register_success', language))
      clearTimeout(regTimerRef.current); regTimerRef.current = setTimeout(() => setRegMsg(''), 3000)
    } else {
      const knownKeys = ['err_workshop_full', 'err_already_registered', 'err_generic']
      const key = knownKeys.includes(result.error) ? result.error : 'err_generic'
      setRegMsg(t(key, language))
      clearTimeout(regTimerRef.current); regTimerRef.current = setTimeout(() => setRegMsg(''), 4000)
    }
  }

  const handleUnregister = async (wsId) => {
    setRegistering(wsId)
    const result = await unregisterFromWorkshop(wsId)
    setRegistering(null)
    if (result.success) {
      setRegMsg(t('workshop_unregister_success', language))
      clearTimeout(regTimerRef.current); regTimerRef.current = setTimeout(() => setRegMsg(''), 3000)
    }
  }

  const openCertificate = (ws) => {
    const template = certificateTemplates.find(t =>
      String(t.city_id) === String(ws.city_id)
    ) || certificateTemplates.find(t => !t.city_id) || null
    setCertModal({ ws, template })
  }

  const WorkshopCard = ({ ws }) => {
    const city = cities.find(c => String(c.id) === String(ws.city_id))
    const isPast = ws.date && ws.date < today
    const regCount = workshopRegistrations.filter(r => String(r.workshop_id) === String(ws.id)).length
    const userReg = loggedInUser && workshopRegistrations.find(r => String(r.workshop_id) === String(ws.id) && String(r.user_id) === String(loggedInUser.id))
    const isRegistered = !!userReg
    const hasAttended = userReg?.attended === true
    const isFull = ws.capacity && regCount >= ws.capacity && !isRegistered
    return (
      <div className={`bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 border-l-4 ${isPast ? 'border-gray-300 dark:border-gray-600 opacity-70' : 'border-[#1565C0] dark:border-[#7DD4FC]'}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
            {getLabIcon(ws.name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{ws.name}</p>
              {isRegistered && (
                <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-lg font-medium flex-shrink-0 inline-flex items-center gap-0.5">
                  <CheckCircle2 className="w-3 h-3" />{t('workshop_registered_badge', language)}
                </span>
              )}
            </div>
            {ws.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{ws.description}</p>
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {city?.name || userCity?.name}
              {ws.location ? ` · ${ws.location}` : ''}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {ws.date && (
                <span className="text-xs bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 text-[#1565C0] dark:text-[#7DD4FC] px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 inline" />{formatDate(ws.date)}
                </span>
              )}
              {ws.time && (
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 inline" />{ws.time}
                </span>
              )}
              {ws.capacity && (
                <span className={`text-xs px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-1 ${isFull ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}>
                  <Users className="w-3.5 h-3.5 inline" />{regCount}/{ws.capacity}
                </span>
              )}
            </div>
            {isPast && isRegistered && (
              <div className="mt-3">
                {hasAttended ? (
                  <button
                    onClick={() => openCertificate(ws)}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <Award className="w-3.5 h-3.5" />
                    {language === 'TR' ? 'Sertifikamı Görüntüle' : 'View My Certificate'}
                  </button>
                ) : (
                  <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-1">
                    {language === 'TR' ? 'Katılım onayı bekleniyor…' : 'Awaiting attendance confirmation…'}
                  </p>
                )}
              </div>
            )}
            {!isPast && workshopRegistrationsAvailable && (
              <div className="mt-3">
                {isRegistered ? (
                  <button
                    onClick={() => handleUnregister(ws.id)}
                    disabled={registering === ws.id}
                    className="w-full py-2 border border-red-400 text-red-600 dark:text-red-400 dark:border-red-600 text-xs font-semibold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition disabled:opacity-60"
                  >
                    {registering === ws.id ? '...' : t('workshop_unregister', language)}
                  </button>
                ) : isFull ? (
                  <div className="w-full py-2 text-center text-xs text-red-500 dark:text-red-400 font-semibold">
                    {t('workshop_full', language)}
                  </div>
                ) : (
                  <button
                    onClick={() => handleRegister(ws.id)}
                    disabled={registering === ws.id}
                    className="w-full py-2 bg-[#1565C0] dark:bg-[#7DD4FC] text-white dark:text-[#060E26] text-xs font-semibold rounded-xl hover:opacity-90 transition disabled:opacity-60"
                  >
                    {registering === ws.id ? '...' : t('workshop_register', language)}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-4">
      {certModal && (
        <CertificateModal
          ws={certModal.ws}
          template={certModal.template}
          user={loggedInUser}
          language={language}
          onClose={() => setCertModal(null)}
        />
      )}
      <div>
        <h2 className="font-bold text-gray-900 dark:text-gray-100 text-base">
          {t('tab_workshops', language)}
        </h2>
        {userCity && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {userCity.name}
          </p>
        )}
      </div>

      {regMsg && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-300 text-sm">
          {regMsg}
        </div>
      )}

      {cityWorkshops.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-12 text-center">
          <div className="mb-3 flex justify-center text-gray-400 dark:text-gray-500"><BookOpen className="w-10 h-10" /></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('no_workshops', language)}</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-[#1565C0] dark:text-[#7DD4FC] uppercase tracking-wide">
                {language === 'TR' ? 'Yaklaşan Atölyeler' : 'Upcoming Workshops'}
              </h3>
              {upcoming.map(ws => <WorkshopCard key={ws.id} ws={ws} />)}
            </div>
          )}

          {past.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                {language === 'TR' ? 'Geçmiş Atölyeler' : 'Past Workshops'}
              </h3>
              {past.map(ws => <WorkshopCard key={ws.id} ws={ws} />)}
            </div>
          )}
        </>
      )}
    </div>
  )
}

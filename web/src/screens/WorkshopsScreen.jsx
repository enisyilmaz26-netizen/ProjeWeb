import React from 'react'
import { useApp } from '../context/AppContext'
import { t, formatDate } from '../lib/languages'
import { Pencil, Calendar, Clock, Users } from 'lucide-react'
import { getLabIcon } from '../lib/icons'

export default function WorkshopsScreen() {
  const { workshops, loggedInUser, cities, language } = useApp()

  const userCityId = loggedInUser?.city_id
  const userCity = cities.find(c => String(c.id) === String(userCityId))

  const today = new Date().toISOString().split('T')[0]

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

  const WorkshopCard = ({ ws }) => {
    const city = cities.find(c => String(c.id) === String(ws.city_id))
    const isPast = ws.date && ws.date < today
    return (
      <div className={`bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4 border-l-4 ${isPast ? 'border-gray-300 dark:border-gray-600 opacity-70' : 'border-[#1565C0] dark:border-[#7DD4FC]'}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 flex items-center justify-center flex-shrink-0">
            {getLabIcon(ws.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{ws.name}</p>
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
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-lg font-medium inline-flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 inline" />{ws.capacity} {language === 'TR' ? 'kişi' : 'people'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 space-y-4">
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

      {cityWorkshops.length === 0 ? (
        <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-12 text-center">
          <div className="mb-3 flex justify-center text-gray-400 dark:text-gray-500"><Pencil className="w-10 h-10" /></div>
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

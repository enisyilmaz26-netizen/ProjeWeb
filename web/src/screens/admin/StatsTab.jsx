import { useState, useMemo } from 'react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/languages'
import { INPUT_BASE } from '../../lib/ui'
import { statusLabel } from '../../lib/adminHelpers'

export default function StatsTab({ language, isGlobal, adminCityId }) {
  const { appointments, cities, workshops } = useApp()
  const inputClass = INPUT_BASE
  const [statsCity, setStatsCity] = useState('')

  const scopedAppointments = useMemo(() => {
    if (!isGlobal && adminCityId) return appointments.filter(a => String(a.city_id) === String(adminCityId))
    if (isGlobal && statsCity) return appointments.filter(a => String(a.city_id) === String(statsCity))
    return appointments
  }, [appointments, isGlobal, adminCityId, statsCity])

  const studioStats = useMemo(() => {
    const counts = {}
    scopedAppointments.forEach(a => {
      if (a.status === 'CANCELLED') return
      const key = a.lab_name || '?'
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10)
  }, [scopedAppointments])

  const statusStats = useMemo(() => {
    const counts = { PENDING: 0, APPROVED: 0, COMPLETED: 0, CANCELLED: 0, CANCELLATION_REQUESTED: 0 }
    scopedAppointments.forEach(a => { if (counts[a.status] !== undefined) counts[a.status]++ })
    return Object.entries(counts).map(([status, count]) => ({ status, count })).filter(x => x.count > 0)
  }, [scopedAppointments])

  const monthlyStats = useMemo(() => {
    const now = new Date()
    const months = {}
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString(language === 'TR' ? 'tr-TR' : 'en-GB', { month: 'short', year: '2-digit' })
      months[key] = { label, count: 0 }
    }
    scopedAppointments.forEach(a => {
      if (!a.date) return
      const key = a.date.substring(0, 7)
      if (months[key]) months[key].count++
    })
    return Object.values(months)
  }, [scopedAppointments, language])

  const todayStr = new Date().toISOString().split('T')[0]

  const workshopStats = useMemo(() => {
    const scoped = !isGlobal && adminCityId
      ? workshops.filter(w => String(w.city_id) === String(adminCityId))
      : isGlobal && statsCity
      ? workshops.filter(w => String(w.city_id) === String(statsCity))
      : workshops
    return {
      total: scoped.length,
      upcoming: scoped.filter(w => w.date && w.date >= todayStr).length,
      past: scoped.filter(w => w.date && w.date < todayStr).length,
      noDate: scoped.filter(w => !w.date).length,
    }
  }, [workshops, isGlobal, adminCityId, statsCity, todayStr])

  const slotStats = useMemo(() => {
    const counts = {}
    scopedAppointments.forEach(a => {
      if (a.status === 'CANCELLED') return
      const key = a.time_slot || '?'
      counts[key] = (counts[key] || 0) + 1
    })
    return Object.entries(counts).map(([slot, count]) => ({ slot, count })).sort((a, b) => b.count - a.count).slice(0, 8)
  }, [scopedAppointments])

  return (
    <div className="space-y-4">
      {isGlobal && (
        <div className="flex items-center gap-3">
          <select className={`${inputClass} flex-1`} value={statsCity} onChange={e => setStatsCity(e.target.value)}>
            <option value="">{t('filter_all_provinces', language)}</option>
            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {statsCity && (
            <button onClick={() => setStatsCity('')} className="text-xs text-[#1565C0] dark:text-[#7DD4FC] hover:underline whitespace-nowrap">
              {t('clear', language)}
            </button>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('stats_studio_usage', language)}</h3>
        {studioStats.length === 0 ? <p className="text-xs text-gray-400">{t('stats_no_data', language)}</p> : (
          <div className="space-y-2">
            {studioStats.map((item, i) => {
              const pct = Math.round((item.count / studioStats[0].count) * 100)
              return (
                <div key={item.name}>
                  <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                    <span className="truncate max-w-[70%]">{i + 1}. {item.name}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-[#1565C0] dark:bg-[#7DD4FC] h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('stats_status_dist', language)}</h3>
        {statusStats.length === 0 ? <p className="text-xs text-gray-400">{t('stats_no_data', language)}</p> : (
          <div className="space-y-2">
            {statusStats.map(item => {
              const max = Math.max(...statusStats.map(x => x.count))
              const pct = Math.round((item.count / max) * 100)
              return (
                <div key={item.status}>
                  <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                    <span>{statusLabel(item.status, language)}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${item.status === 'APPROVED' ? 'bg-green-500' : item.status === 'PENDING' ? 'bg-orange-400' : item.status === 'COMPLETED' ? 'bg-blue-500' : 'bg-red-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('stats_monthly', language)}</h3>
        {monthlyStats.every(m => m.count === 0) ? <p className="text-xs text-gray-400">{t('stats_no_data', language)}</p> : (() => {
          const maxCount = Math.max(...monthlyStats.map(m => m.count), 1)
          return (
            <div className="flex items-end gap-2 h-28">
              {monthlyStats.map(m => {
                const heightPct = Math.round((m.count / maxCount) * 100)
                return (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-gray-600 dark:text-gray-400 font-medium">{m.count > 0 ? m.count : ''}</span>
                    <div className="w-full flex items-end" style={{ height: '72px' }}>
                      <div className="w-full bg-[#1565C0] dark:bg-[#7DD4FC] rounded-t-md transition-all" style={{ height: `${Math.max(heightPct, m.count > 0 ? 4 : 0)}%` }} />
                    </div>
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight">{m.label}</span>
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>

      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('tab_workshops', language)}</h3>
        {workshopStats.total === 0 ? <p className="text-xs text-gray-400">{t('stats_no_data', language)}</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: language === 'TR' ? 'Toplam' : 'Total', value: workshopStats.total, color: 'text-gray-800 dark:text-gray-100' },
              { label: language === 'TR' ? 'Yaklaşan' : 'Upcoming', value: workshopStats.upcoming, color: 'text-green-600 dark:text-green-400' },
              { label: language === 'TR' ? 'Geçmiş' : 'Past', value: workshopStats.past, color: 'text-gray-500 dark:text-gray-400' },
              { label: language === 'TR' ? 'Tarifsiz' : 'No Date', value: workshopStats.noDate, color: 'text-orange-500 dark:text-orange-400' },
            ].map(s => (
              <div key={s.label} className="bg-gray-50 dark:bg-[#0E1A30] rounded-xl px-3 py-3 text-center">
                <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm mb-3">{t('stats_slots', language)}</h3>
        {slotStats.length === 0 ? <p className="text-xs text-gray-400">{t('stats_no_data', language)}</p> : (
          <div className="space-y-2">
            {slotStats.map(item => {
              const pct = Math.round((item.count / slotStats[0].count) * 100)
              return (
                <div key={item.slot}>
                  <div className="flex justify-between text-xs text-gray-700 dark:text-gray-300 mb-0.5">
                    <span>{item.slot}</span>
                    <span className="font-semibold">{item.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                    <div className="bg-orange-400 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

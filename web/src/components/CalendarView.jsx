import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const STATUS_DOT = {
  PENDING:                'bg-orange-400',
  APPROVED:               'bg-green-500',
  CANCELLATION_REQUESTED: 'bg-blue-400',
  CANCELLED:              'bg-red-400',
  COMPLETED:              'bg-purple-400',
}

const MONTH_NAMES = {
  TR: ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],
  EN: ['January','February','March','April','May','June','July','August','September','October','November','December'],
}

const DAY_NAMES = {
  TR: ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'],
  EN: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
}

const STATUS_LEGEND = {
  PENDING:                { TR: 'Bekleyen',     EN: 'Pending' },
  APPROVED:               { TR: 'Onaylı',       EN: 'Approved' },
  CANCELLATION_REQUESTED: { TR: 'İptal Talep',  EN: 'Cancel Req.' },
  CANCELLED:              { TR: 'İptal',        EN: 'Cancelled' },
  COMPLETED:              { TR: 'Tamamlandı',   EN: 'Completed' },
}

export default function CalendarView({ appointments, onDayClick, language }) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay() // 0=Sun
  const startOffset = (firstDayOfWeek + 6) % 7 // shift so Mon=0

  const apptByDay = useMemo(() => {
    const map = {}
    appointments.forEach(a => {
      if (!a.date) return
      const [y, m, d] = a.date.split('-').map(Number)
      if (y === year && m - 1 === month) {
        if (!map[d]) map[d] = []
        map[d].push(a)
      }
    })
    return map
  }, [appointments, year, month])

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          {MONTH_NAMES[language][month]} {year}
        </span>
        <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition">
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES[language].map(d => (
          <div key={d} className="text-center text-[10px] text-gray-400 dark:text-gray-500 font-semibold py-1 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayAppts = apptByDay[day] || []
          const isToday = dateStr === todayStr
          const hasAppts = dayAppts.length > 0

          return (
            <button
              key={day}
              onClick={() => onDayClick && onDayClick(dateStr)}
              className={`relative rounded-lg p-1 flex flex-col items-center min-h-[42px] transition
                ${onDayClick ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer' : 'cursor-default'}
                ${isToday ? 'bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 ring-1 ring-[#1565C0]/30 dark:ring-[#7DD4FC]/30' : ''}
              `}
            >
              <span className={`text-xs font-medium leading-none mb-0.5 ${
                isToday ? 'text-[#1565C0] dark:text-[#7DD4FC] font-bold' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {day}
              </span>
              {hasAppts && (
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {dayAppts.slice(0, 4).map((a, i) => (
                    <span key={i} className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[a.status] || 'bg-gray-400'}`} />
                  ))}
                  {dayAppts.length > 4 && (
                    <span className="text-[8px] text-gray-400 leading-none">+{dayAppts.length - 4}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        {Object.entries(STATUS_LEGEND).map(([status, label]) => (
          <span key={status} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
            {label[language]}
          </span>
        ))}
      </div>
    </div>
  )
}

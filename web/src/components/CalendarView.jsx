import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { t } from '../lib/languages'

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

export default function CalendarView({
  appointments = [],
  onDayClick,
  language,
  isDateDisabled,
  selectedDate,
  minDate,
  maxDate,
  showLegend = true,
}) {
  const today = new Date()
  const [year, setYear] = useState(() => {
    if (selectedDate) {
      const [y] = selectedDate.split('-').map(Number)
      return y
    }
    return today.getFullYear()
  })
  const [month, setMonth] = useState(() => {
    if (selectedDate) {
      const [, m] = selectedDate.split('-').map(Number)
      return m - 1
    }
    return today.getMonth()
  })

  const todayStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const startOffset = (firstDayOfWeek + 6) % 7

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

  const canGoPrev = () => {
    if (!minDate) return true
    const [minY, minM] = minDate.split('-').map(Number)
    return year > minY || (year === minY && month > minM - 1)
  }

  const canGoNext = () => {
    if (!maxDate) return true
    const [maxY, maxM] = maxDate.split('-').map(Number)
    return year < maxY || (year === maxY && month < maxM - 1)
  }

  const prevMonth = () => {
    if (!canGoPrev()) return
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (!canGoNext()) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const isPickerMode = !!isDateDisabled || !!selectedDate

  return (
    <div className="bg-white dark:bg-[#0D1E3D] rounded-2xl shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev()}
          aria-label={t('prev_month', language)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition active:scale-[0.98] disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
        </button>
        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
          {MONTH_NAMES[language][month]} {year}
        </span>
        <button
          onClick={nextMonth}
          disabled={!canGoNext()}
          aria-label={t('next_month', language)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition active:scale-[0.98] disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES[language].map((d, i) => (
          <div
            key={d}
            className={`text-center text-[10px] font-semibold py-1 uppercase ${
              i === 6 ? 'text-red-400 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (!day) return <div key={`e-${idx}`} />
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const dayAppts = apptByDay[day] || []
          const isToday = dateStr === todayStr
          const isSelected = selectedDate === dateStr
          const isSundayCol = (startOffset + day - 1) % 7 === 6

          const disabled = isPickerMode && (
            (minDate && dateStr < minDate) ||
            (maxDate && dateStr > maxDate) ||
            (isDateDisabled && isDateDisabled(dateStr))
          )

          return (
            <button
              key={day}
              aria-label={dateStr}
              aria-pressed={isSelected || undefined}
              onClick={() => !disabled && onDayClick && onDayClick(dateStr)}
              disabled={disabled}
              className={`relative rounded-lg p-1 flex flex-col items-center min-h-[42px] transition
                ${disabled
                  ? 'opacity-40 cursor-not-allowed bg-gray-100 dark:bg-gray-800/50'
                  : onDayClick
                    ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-[0.96] cursor-pointer'
                    : 'cursor-default'
                }
                ${isSelected
                  ? 'bg-[#1565C0] dark:bg-[#7DD4FC] ring-2 ring-[#1565C0] dark:ring-[#7DD4FC]'
                  : isToday
                    ? 'bg-[#1565C0]/10 dark:bg-[#7DD4FC]/10 ring-1 ring-[#1565C0]/30 dark:ring-[#7DD4FC]/30'
                    : ''
                }
              `}
            >
              <span className={`text-xs font-medium leading-none mb-0.5 ${
                isSelected
                  ? 'text-white dark:text-[#060E26] font-bold'
                  : isToday
                    ? 'text-[#1565C0] dark:text-[#7DD4FC] font-bold'
                    : isSundayCol && !disabled
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-gray-700 dark:text-gray-300'
              }`}>
                {day}
              </span>
              {dayAppts.length > 0 && (
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {dayAppts.slice(0, 4).map((a) => (
                    <span key={a.id} className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[a.status] || 'bg-gray-400'}`} />
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

      {showLegend && appointments.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {Object.entries(STATUS_LEGEND).map(([status, label]) => (
            <span key={status} className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
              {label[language]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

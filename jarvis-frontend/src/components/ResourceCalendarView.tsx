import type {
  CalendarMonthDirection,
  ResourceCalendarViewModel,
} from '../types/chat'

interface ResourceCalendarViewProps {
  calendar: ResourceCalendarViewModel
  onMonthChange: (direction: CalendarMonthDirection) => void
}

/**
 * 리마인더와 일정의 월간 달력 ViewModel을 표시한다.
 */
export function ResourceCalendarView({
  calendar,
  onMonthChange,
}: ResourceCalendarViewProps) {
  const hasEvents = calendar.days.some((day) => day.events.length > 0)

  return (
    <section className="resource-calendar" aria-label={`${calendar.monthLabel} 달력`}>
      <header className="calendar-header">
        <div>
          <span>Calendar</span>
          <strong>{calendar.monthLabel}</strong>
        </div>
        <div className="calendar-actions">
          <button onClick={() => onMonthChange('previous')} type="button">
            이전
          </button>
          <button onClick={() => onMonthChange('today')} type="button">
            오늘
          </button>
          <button onClick={() => onMonthChange('next')} type="button">
            다음
          </button>
        </div>
      </header>

      {!hasEvents && <p className="calendar-empty-state">{calendar.emptyMessage}</p>}

      <div className="calendar-scroll">
        <div className="calendar-weekdays" aria-hidden="true">
          {calendar.weekdayLabels.map((weekdayLabel) => (
            <span key={weekdayLabel}>{weekdayLabel}</span>
          ))}
        </div>
        <div className="calendar-grid">
          {calendar.days.map((day) => (
            <article
              className={[
                'calendar-day',
                day.isCurrentMonth ? '' : 'muted',
                day.isToday ? 'today' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              key={day.dateKey}
            >
              <span className="calendar-day-number">{day.dayOfMonthLabel}</span>
              <div className="calendar-event-list">
                {day.events.map((event) => (
                  <div
                    className={`calendar-event ${event.kind}`}
                    key={`${event.kind}-${event.id}`}
                  >
                    <span>{event.timeLabel}</span>
                    <strong>{event.title}</strong>
                    <small>{event.statusLabel}</small>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

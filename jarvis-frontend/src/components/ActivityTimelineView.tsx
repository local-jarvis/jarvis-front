import type { ActivityEventViewModel } from '../types/chat'

interface ActivityTimelineViewProps {
  activityEvents: ActivityEventViewModel[]
  isBusy: boolean
  onRefresh: () => Promise<void>
}

/**
 * assistant activity timeline을 표시한다.
 */
export function ActivityTimelineView({
  activityEvents,
  isBusy,
  onRefresh,
}: ActivityTimelineViewProps) {
  return (
    <section className="resource-workspace" aria-label="활동 타임라인">
      <header className="resource-header">
        <div>
          <p className="panel-eyebrow">Activity</p>
          <h2>활동</h2>
        </div>
        <button
          className="secondary-action"
          disabled={isBusy}
          onClick={() => void onRefresh()}
          type="button"
        >
          새로고침
        </button>
      </header>

      <div className="timeline-list">
        {activityEvents.length === 0 ? (
          <p className="empty-state">활동 기록이 없습니다.</p>
        ) : (
          activityEvents.map((event) => (
            <article className="timeline-item" key={event.id}>
              <div>
                <strong>{event.title}</strong>
                <span>{event.typeLabel}</span>
              </div>
              {event.description && <p>{event.description}</p>}
              <small>
                {event.createdAtLabel}
                {event.relatedLabel ? ` · ${event.relatedLabel}` : ''}
              </small>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

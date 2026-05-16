import type {
  ScheduleFiltersViewModel,
  ScheduleFormViewModel,
  ScheduleViewModel,
} from '../types/chat'

interface ScheduleReviewViewProps {
  filters: ScheduleFiltersViewModel
  form: ScheduleFormViewModel
  isBusy: boolean
  schedules: ScheduleViewModel[]
  onClearForm: () => void
  onDeleteSchedule: (scheduleId: string) => Promise<void>
  onEditSchedule: (schedule: ScheduleViewModel) => void
  onFiltersChange: (field: keyof ScheduleFiltersViewModel, value: string) => void
  onFormChange: (field: keyof ScheduleFormViewModel, value: string) => void
  onRefresh: () => Promise<void>
  onSave: () => Promise<void>
}

/**
 * 일정 조회 필터와 생성/수정/삭제 intent를 표시한다.
 */
export function ScheduleReviewView({
  filters,
  form,
  isBusy,
  schedules,
  onClearForm,
  onDeleteSchedule,
  onEditSchedule,
  onFiltersChange,
  onFormChange,
  onRefresh,
  onSave,
}: ScheduleReviewViewProps) {
  return (
    <section className="resource-workspace" aria-label="일정 관리">
      <header className="resource-header">
        <div>
          <p className="panel-eyebrow">Schedules</p>
          <h2>일정</h2>
        </div>
        <span>{schedules.length}개</span>
      </header>

      <form
        className="resource-form three-column"
        onSubmit={(event) => {
          event.preventDefault()
          void onRefresh()
        }}
      >
        <label>
          <span>From</span>
          <input
            disabled={isBusy}
            onChange={(event) => onFiltersChange('from', event.target.value)}
            type="datetime-local"
            value={filters.from}
          />
        </label>
        <label>
          <span>To</span>
          <input
            disabled={isBusy}
            onChange={(event) => onFiltersChange('to', event.target.value)}
            type="datetime-local"
            value={filters.to}
          />
        </label>
        <button className="secondary-action" disabled={isBusy} type="submit">
          조회
        </button>
      </form>

      <form
        className="resource-form three-column"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave()
        }}
      >
        <label>
          <span>제목</span>
          <input
            disabled={isBusy}
            onChange={(event) => onFormChange('title', event.target.value)}
            value={form.title}
          />
        </label>
        <label>
          <span>시작</span>
          <input
            disabled={isBusy}
            onChange={(event) => onFormChange('startAt', event.target.value)}
            type="datetime-local"
            value={form.startAt}
          />
        </label>
        <label>
          <span>종료</span>
          <input
            disabled={isBusy}
            onChange={(event) => onFormChange('endAt', event.target.value)}
            type="datetime-local"
            value={form.endAt}
          />
        </label>
        <div className="form-actions">
          <button className="send-button" disabled={isBusy} type="submit">
            {form.editingId ? '일정 수정' : '일정 생성'}
          </button>
          <button disabled={isBusy} onClick={onClearForm} type="button">
            초기화
          </button>
        </div>
      </form>

      <div className="resource-list">
        {schedules.length === 0 ? (
          <p className="empty-state">조회된 일정이 없습니다.</p>
        ) : (
          schedules.map((schedule) => (
            <article className="resource-item" key={schedule.id}>
              <div>
                <strong>{schedule.title}</strong>
                <span>{schedule.startAtLabel}</span>
                <small>{schedule.endAtLabel || '종료 시각 없음'}</small>
              </div>
              <div className="item-actions">
                <button
                  disabled={isBusy}
                  onClick={() => onEditSchedule(schedule)}
                  type="button"
                >
                  수정
                </button>
                <button
                  disabled={isBusy}
                  onClick={() => void onDeleteSchedule(schedule.id)}
                  type="button"
                >
                  삭제
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  )
}

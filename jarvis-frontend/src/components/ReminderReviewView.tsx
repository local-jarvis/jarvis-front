import { ResourceCalendarView } from './ResourceCalendarView'
import type {
  CalendarMonthDirection,
  ReminderFormViewModel,
  ReminderViewModel,
  ResourceCalendarViewModel,
  ResourceEditorMode,
  ResourceViewMode,
} from '../types/chat'

interface ReminderReviewViewProps {
  calendar: ResourceCalendarViewModel
  form: ReminderFormViewModel
  isBusy: boolean
  reminders: ReminderViewModel[]
  editorMode: ResourceEditorMode
  viewMode: ResourceViewMode
  onCalendarMonthChange: (direction: CalendarMonthDirection) => void
  onCancelReminder: (reminderId: string) => Promise<void>
  onCloseEditor: () => void
  onFormChange: (field: keyof ReminderFormViewModel, value: string) => void
  onOpenEditor: () => void
  onSubmit: () => Promise<void>
  onViewModeChange: (mode: ResourceViewMode) => void
}

/**
 * 리마인더 생성, pending 목록, 취소 intent를 표시한다.
 */
export function ReminderReviewView({
  calendar,
  form,
  isBusy,
  reminders,
  editorMode,
  viewMode,
  onCalendarMonthChange,
  onCancelReminder,
  onCloseEditor,
  onFormChange,
  onOpenEditor,
  onSubmit,
  onViewModeChange,
}: ReminderReviewViewProps) {
  const isEditorOpen = editorMode !== 'closed'

  return (
    <section className="resource-workspace" aria-label="리마인더 관리">
      <header className="resource-header">
        <div>
          <p className="panel-eyebrow">Reminders</p>
          <h2>리마인더</h2>
        </div>
        <div className="resource-header-actions">
          <span>{reminders.length}개</span>
          <button disabled={isBusy || isEditorOpen} onClick={onOpenEditor} type="button">
            + 리마인더
          </button>
        </div>
      </header>

      {isEditorOpen ? (
        <section className="resource-editor" aria-label="리마인더 추가">
          <div className="resource-editor-heading">
            <div>
              <p className="panel-eyebrow">Create</p>
              <h3>새 리마인더</h3>
            </div>
            <button disabled={isBusy} onClick={onCloseEditor} type="button">
              닫기
            </button>
          </div>
          <form
            className="resource-form two-column embedded"
            onSubmit={(event) => {
              event.preventDefault()
              void onSubmit()
            }}
          >
            <label>
              <span>내용</span>
              <input
                disabled={isBusy}
                onChange={(event) => onFormChange('content', event.target.value)}
                value={form.content}
              />
            </label>
            <label>
              <span>알림 시각</span>
              <input
                disabled={isBusy}
                onChange={(event) => onFormChange('remindAt', event.target.value)}
                type="datetime-local"
                value={form.remindAt}
              />
            </label>
            <div className="form-actions">
              <button className="send-button" disabled={isBusy} type="submit">
                리마인더 생성
              </button>
              <button disabled={isBusy} onClick={onCloseEditor} type="button">
                취소
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <div className="resource-view-toolbar" aria-label="리마인더 보기 방식">
            <button
              aria-pressed={viewMode === 'list'}
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => onViewModeChange('list')}
              type="button"
            >
              리스트
            </button>
            <button
              aria-pressed={viewMode === 'calendar'}
              className={viewMode === 'calendar' ? 'active' : ''}
              onClick={() => onViewModeChange('calendar')}
              type="button"
            >
              캘린더
            </button>
          </div>

          {viewMode === 'list' ? (
            <div className="resource-list">
              {reminders.length === 0 ? (
                <p className="empty-state">대기 중인 리마인더가 없습니다.</p>
              ) : (
                reminders.map((reminder) => (
                  <article className="resource-item" key={reminder.id}>
                    <div>
                      <strong>{reminder.title}</strong>
                      <span>{reminder.remindAtLabel}</span>
                      <small>created {reminder.createdAtLabel}</small>
                    </div>
                    <div className="item-actions">
                      <small>{reminder.statusLabel}</small>
                      <button
                        disabled={isBusy || reminder.statusLabel !== 'PENDING'}
                        onClick={() => void onCancelReminder(reminder.id)}
                        type="button"
                      >
                        취소
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          ) : (
            <ResourceCalendarView
              calendar={calendar}
              onMonthChange={onCalendarMonthChange}
            />
          )}
        </>
      )}
    </section>
  )
}

import type { ReminderFormViewModel, ReminderViewModel } from '../types/chat'

interface ReminderReviewViewProps {
  form: ReminderFormViewModel
  isBusy: boolean
  reminders: ReminderViewModel[]
  onCancelReminder: (reminderId: string) => Promise<void>
  onFormChange: (field: keyof ReminderFormViewModel, value: string) => void
  onSubmit: () => Promise<void>
}

/**
 * 리마인더 생성, pending 목록, 취소 intent를 표시한다.
 */
export function ReminderReviewView({
  form,
  isBusy,
  reminders,
  onCancelReminder,
  onFormChange,
  onSubmit,
}: ReminderReviewViewProps) {
  return (
    <section className="resource-workspace" aria-label="리마인더 관리">
      <header className="resource-header">
        <div>
          <p className="panel-eyebrow">Reminders</p>
          <h2>리마인더</h2>
        </div>
        <span>{reminders.length}개</span>
      </header>

      <form
        className="resource-form two-column"
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
        <button className="send-button" disabled={isBusy} type="submit">
          리마인더 생성
        </button>
      </form>

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
    </section>
  )
}

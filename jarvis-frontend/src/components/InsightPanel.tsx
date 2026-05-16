import type {
  ActivityEventViewModel,
  ChatWorkspaceView,
  ReminderViewModel,
  ScheduleViewModel,
  SystemStatusViewModel,
  TaskClassificationViewModel,
} from '../types/chat'

interface InsightPanelProps {
  activeView: ChatWorkspaceView
  activityEvents: ActivityEventViewModel[]
  classifications: TaskClassificationViewModel[]
  reminders: ReminderViewModel[]
  schedules: ScheduleViewModel[]
  systemStatus: SystemStatusViewModel
  onViewSelect: (view: ChatWorkspaceView) => void
}

/**
 * 샘플 디자인의 우측 rail에서 주요 view와 상태 shortcut을 표시한다.
 */
export function InsightPanel({
  activeView,
  activityEvents,
  classifications,
  reminders,
  schedules,
  systemStatus,
  onViewSelect,
}: InsightPanelProps) {
  return (
    <aside className="insight-panel" aria-label="작업 shortcut rail">
      <button
        className={activeView === 'chat' ? 'active' : ''}
        onClick={() => onViewSelect('chat')}
        title={`Task Details ${classifications.length}`}
        type="button"
      >
        ⌁
      </button>
      <button
        className={activeView === 'reminders' ? 'active' : ''}
        onClick={() => onViewSelect('reminders')}
        title={`Upcoming Reminders ${reminders.length}`}
        type="button"
      >
        ◴
      </button>
      <button
        className={activeView === 'schedules' ? 'active' : ''}
        onClick={() => onViewSelect('schedules')}
        title={`Schedules ${schedules.length}`}
        type="button"
      >
        ◷
      </button>
      <button
        className={activeView === 'memories' ? 'active' : ''}
        onClick={() => onViewSelect('memories')}
        title="Memory DB"
        type="button"
      >
        ▣
      </button>
      <button
        className={activeView === 'activity' ? 'active' : ''}
        onClick={() => onViewSelect('activity')}
        title={`Activity ${activityEvents.length}`}
        type="button"
      >
        ≡
      </button>
      <div className="rail-spacer" />
      <button
        className={activeView === 'settings' ? 'active' : ''}
        onClick={() => onViewSelect('settings')}
        title={`Settings ${systemStatus.healthLabel}`}
        type="button"
      >
        ⚙
      </button>
    </aside>
  )
}

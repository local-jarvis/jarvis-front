import type { ChatSessionViewModel, SystemStatusViewModel } from '../types/chat'

interface ChatHeaderProps {
  activeSessionId: string
  isBusy: boolean
  sessionTitleDraft: string
  sessions: ChatSessionViewModel[]
  systemStatus: SystemStatusViewModel
  onSessionTitleDraftChange: (value: string) => void
  onSessionTitleSave: () => Promise<void>
}

/**
 * 채팅 세션 제목과 backend 연결 상태를 표시한다.
 */
export function ChatHeader({
  activeSessionId,
  isBusy,
  sessionTitleDraft,
  sessions,
  systemStatus,
  onSessionTitleDraftChange,
  onSessionTitleSave,
}: ChatHeaderProps) {
  const activeSession = sessions.find((session) => session.id === activeSessionId)
  const statusClassName =
    systemStatus.healthLabel === 'FAILED' ? 'status-pill failed' : 'status-pill'

  return (
    <header className="chat-header">
      <div>
        <div className="chat-title-row">
          <h2>{activeSession?.title ?? '새 대화'}</h2>
          <span className={statusClassName}>{systemStatus.healthLabel}</span>
        </div>
        <p>{activeSession?.lastMessageAtLabel || '메시지를 보내면 세션이 생성됩니다.'}</p>
      </div>
      <form
        className="session-title-form"
        onSubmit={(event) => {
          event.preventDefault()
          void onSessionTitleSave()
        }}
      >
        <input
          aria-label="세션 제목"
          disabled={!activeSessionId || isBusy}
          onChange={(event) => onSessionTitleDraftChange(event.target.value)}
          placeholder="세션 제목"
          value={sessionTitleDraft}
        />
        <button disabled={!activeSessionId || isBusy} type="submit">
          저장
        </button>
      </form>
    </header>
  )
}

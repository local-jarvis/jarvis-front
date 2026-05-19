import type {
  AuthUserViewModel,
  ChatSessionViewModel,
  ChatWorkspaceView,
  SystemStatusViewModel,
} from '../types/chat'
import { workspaceNavItems } from './workspaceNavigation'

interface SidebarProps {
  activeSessionId: string
  activeView: ChatWorkspaceView
  isBusy: boolean
  sessions: ChatSessionViewModel[]
  systemStatus: SystemStatusViewModel
  user: AuthUserViewModel
  onDeleteSession: (sessionId: string) => Promise<void>
  onCreateSession: () => Promise<void>
  onLogout: () => void
  onSessionSelect: (sessionId: string) => Promise<void>
  onViewSelect: (view: ChatWorkspaceView) => void
}

/**
 * 인증된 워크스페이스의 좌측 navigation과 세션 목록을 표시한다.
 */
export function Sidebar({
  activeSessionId,
  activeView,
  isBusy,
  sessions,
  systemStatus,
  user,
  onDeleteSession,
  onCreateSession,
  onLogout,
  onSessionSelect,
  onViewSelect,
}: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="좌측 툴바">
      <div className="brand-block">
        <div className="brand-mark">J</div>
        <div>
          <h1>JARVIS</h1>
          <p>Memory-backed assistant</p>
        </div>
      </div>

      <section className="sidebar-section">
        <p className="panel-eyebrow">Mode</p>
        <nav className="toolbar-nav" aria-label="주요 기능">
          {workspaceNavItems.map((item) => (
            <button
              className={
                activeView === item.view ? 'toolbar-button active' : 'toolbar-button'
              }
              key={item.view}
              onClick={() => onViewSelect(item.view)}
              type="button"
            >
              <span>{item.label}</span>
              <small>{item.helper}</small>
            </button>
          ))}
        </nav>
      </section>

      <section className="session-panel" aria-label="채팅 세션">
        <div className="section-title-row">
          <p className="panel-eyebrow">Sessions</p>
          <button disabled={isBusy} onClick={() => void onCreateSession()} type="button">
            New
          </button>
        </div>
        <div className="session-list">
          {sessions.length === 0 ? (
            <p className="empty-copy">세션 없음</p>
          ) : (
            sessions.map((session) => (
              <article
                className={
                  session.id === activeSessionId ? 'session-item active' : 'session-item'
                }
                key={session.id}
              >
                <button
                  onClick={() => void onSessionSelect(session.id)}
                  type="button"
                >
                  <strong>{session.title}</strong>
                  <span>{session.lastMessageAtLabel || session.createdAtLabel}</span>
                </button>
                <button
                  aria-label={`${session.title} 삭제`}
                  disabled={isBusy}
                  onClick={() => void onDeleteSession(session.id)}
                  type="button"
                >
                  삭제
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="model-card" aria-label="서버 상태">
        <div className="server-status">
          <i className="status-dot" />
          <span>Local Server Active</span>
        </div>
        <div className="server-row">
          <span>Account</span>
          <strong>{user.email}</strong>
        </div>
        <div className="server-row">
          <span>Mode</span>
          <strong>{systemStatus.healthLabel}</strong>
        </div>
        <button className="secondary-action full" onClick={onLogout} type="button">
          로그아웃
        </button>
      </section>
    </aside>
  )
}

import { useState } from 'react'
import type {
  AuthUserViewModel,
  ChatSessionViewModel,
  ChatWorkspaceView,
  SystemStatusViewModel,
} from '../types/chat'
import { workspaceNavItems } from './workspaceNavigation'

interface MobileWorkspaceNavProps {
  activeSessionId: string
  activeView: ChatWorkspaceView
  isBusy: boolean
  sessionTitleDraft: string
  sessions: ChatSessionViewModel[]
  systemStatus: SystemStatusViewModel
  user: AuthUserViewModel
  onDeleteSession: (sessionId: string) => Promise<void>
  onCreateSession: () => Promise<void>
  onLogout: () => void
  onSessionSelect: (sessionId: string) => Promise<void>
  onSessionTitleDraftChange: (value: string) => void
  onSessionTitleSave: () => Promise<void>
  onViewSelect: (view: ChatWorkspaceView) => void
}

export function MobileWorkspaceNav({
  activeSessionId,
  activeView,
  isBusy,
  sessionTitleDraft,
  sessions,
  systemStatus,
  user,
  onDeleteSession,
  onCreateSession,
  onLogout,
  onSessionSelect,
  onSessionTitleDraftChange,
  onSessionTitleSave,
  onViewSelect,
}: MobileWorkspaceNavProps) {
  const hasActiveSession = activeSessionId.length > 0
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const activeItem = workspaceNavItems.find((item) => item.view === activeView)

  const closeMenu = () => setIsMenuOpen(false)

  return (
    <section
      className={isMenuOpen ? 'mobile-workspace-nav open' : 'mobile-workspace-nav'}
      aria-label="모바일 작업공간"
    >
      <div className="mobile-brand-row">
        <button
          className="mobile-menu-button"
          aria-controls="mobile-workspace-menu"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? '메뉴 닫기' : '메뉴 열기'}
          onClick={() => setIsMenuOpen((current) => !current)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
        <div className="brand-mark">J</div>
        <div className="mobile-brand-copy">
          <strong>JARVIS</strong>
          <span>{activeItem?.shortLabel ?? '채팅'} · {systemStatus.healthLabel}</span>
        </div>
        <strong className="mobile-active-view">{activeItem?.shortLabel ?? '채팅'}</strong>
      </div>

      <div
        className="mobile-menu-panel"
        hidden={!isMenuOpen}
        id="mobile-workspace-menu"
      >
        <div className="mobile-account-row">
          <span>{user.email}</span>
          <button
            className="mobile-logout-button"
            onClick={() => {
              closeMenu()
              onLogout()
            }}
            type="button"
          >
            로그아웃
          </button>
        </div>

        {activeView === 'chat' && (
          <form
            className="mobile-title-form"
            onSubmit={(event) => {
              event.preventDefault()
              void onSessionTitleSave().then(closeMenu)
            }}
          >
            <label>
              <span>세션 제목</span>
              <input
                aria-label="세션 제목"
                disabled={!activeSessionId || isBusy}
                onChange={(event) =>
                  onSessionTitleDraftChange(event.target.value)
                }
                placeholder="세션 제목"
                value={sessionTitleDraft}
              />
            </label>
            <button disabled={!activeSessionId || isBusy} type="submit">
              저장
            </button>
          </form>
        )}

        <nav className="mobile-view-tabs" aria-label="주요 기능">
          {workspaceNavItems.map((item) => (
            <button
              aria-current={activeView === item.view ? 'page' : undefined}
              className={activeView === item.view ? 'active' : ''}
              key={item.view}
              onClick={() => {
                onViewSelect(item.view)
                closeMenu()
              }}
              type="button"
            >
              <span aria-hidden="true">{item.icon}</span>
              <strong>{item.shortLabel}</strong>
            </button>
          ))}
        </nav>

        <div className="mobile-session-row">
          <label className="mobile-session-select">
            <span>세션</span>
            <select
              aria-label="채팅 세션 선택"
              disabled={sessions.length === 0}
              onChange={(event) => {
                if (event.target.value) {
                  void onSessionSelect(event.target.value)
                  closeMenu()
                }
              }}
              value={activeSessionId}
            >
              <option value="">
                {sessions.length === 0 ? '세션 없음' : '세션 선택'}
              </option>
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title}
                </option>
              ))}
            </select>
          </label>
          <button
            className="mobile-session-action"
            disabled={isBusy}
            onClick={() => {
              void onCreateSession()
              closeMenu()
            }}
            type="button"
          >
            새 대화
          </button>
          <button
            className="mobile-session-action"
            disabled={isBusy || !hasActiveSession}
            onClick={() => {
              void onDeleteSession(activeSessionId)
              closeMenu()
            }}
            type="button"
          >
            삭제
          </button>
        </div>

        <div className="mobile-status-row">
          <span>{systemStatus.healthLabel}</span>
          <strong>{systemStatus.modelName}</strong>
        </div>
      </div>
    </section>
  )
}

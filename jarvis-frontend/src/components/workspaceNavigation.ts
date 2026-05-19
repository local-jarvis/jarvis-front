import type { ChatWorkspaceView } from '../types/chat'

export interface WorkspaceNavItem {
  view: ChatWorkspaceView
  label: string
  shortLabel: string
  helper: string
  icon: string
}

export const workspaceNavItems: WorkspaceNavItem[] = [
  { view: 'chat', label: 'Command Chat', shortLabel: '채팅', helper: 'LIVE', icon: '⌁' },
  { view: 'reminders', label: 'Reminders', shortLabel: '알림', helper: 'DB', icon: '◴' },
  { view: 'schedules', label: 'Schedule', shortLabel: '일정', helper: 'DB', icon: '◷' },
  { view: 'memories', label: 'Memory', shortLabel: '기억', helper: 'DB', icon: '▣' },
  { view: 'activity', label: 'Activity', shortLabel: '기록', helper: 'LOG', icon: '≡' },
  { view: 'settings', label: 'Server', shortLabel: '설정', helper: 'OK', icon: '⚙' },
]

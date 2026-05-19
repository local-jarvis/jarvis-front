export type ChatTaskType =
  | 'CHAT'
  | 'REMINDER'
  | 'SCHEDULE'
  | 'MEMORY'
  | 'UNKNOWN'

export type ChatStatus =
  | 'SUCCESS'
  | 'FAILED'
  | 'NEED_CONFIRMATION'
  | 'NOT_IMPLEMENTED'

export type ChatRole = 'USER' | 'ASSISTANT' | 'SYSTEM'

export type ChatMessageStatus = 'STREAMING' | 'COMPLETED' | 'FAILED'

export type ReminderStatus = 'PENDING' | 'SENT' | 'CANCELLED' | 'FAILED'

export type ActivityEventType =
  | 'CHAT_SESSION_CREATED'
  | 'CHAT_MESSAGE_CREATED'
  | 'REMINDER_CREATED'
  | 'REMINDER_SENT'
  | 'SCHEDULE_CREATED'
  | 'MEMORY_STORED'

export type ChatWorkspaceView =
  | 'chat'
  | 'reminders'
  | 'schedules'
  | 'memories'
  | 'activity'
  | 'settings'

export type SystemHealthLabel = 'OFFLINE' | 'ONLINE' | 'FAILED'

export interface ChatResponseErrorDto {
  message: string
  taskType: ChatTaskType
  status: 'FAILED'
  data: {
    reason?: string
    [key: string]: unknown
  }
  createdAt: string
}

export interface AuthLoginRequestDto {
  email: string
  password: string
}

export interface AuthRefreshRequestDto {
  refreshToken: string
}

export interface AuthUserResponseDto {
  id: number
  email: string
  createdAt?: string
  updatedAt?: string
}

export interface AuthLoginResponseDto {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  refreshToken: string
  refreshExpiresIn: number
  user: {
    id: number
    email: string
  }
}

export interface ChatSessionCreateRequestDto {
  title?: string | null
}

export interface ChatSessionUpdateRequestDto {
  title?: string | null
  archived?: boolean | null
}

export interface ChatSessionResponseDto {
  id: number
  title?: string | null
  archived: boolean
  lastMessageAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessageResponseDto {
  id: number
  sessionId: number
  role: ChatRole
  content: string
  taskType?: ChatTaskType | null
  status: ChatMessageStatus
  metadataJson?: string | null
  createdAt: string
}

export interface ChatMessageListQueryDto {
  afterMessageId?: number | null
  limit?: number | null
}

export interface ChatRequestDto {
  sessionId?: number | null
  message: string
}

export interface ChatResponseDto {
  sessionId?: number | null
  messageId?: number | null
  message: string
  taskType: ChatTaskType
  status: ChatStatus
  data?: Record<string, unknown> | ReminderResponseDto | ScheduleResponseDto | null
  createdAt: string
}

export interface ReminderCreateRequestDto {
  content: string
  remindAt: string
}

export interface ReminderResponseDto {
  id: number
  content: string
  remindAt: string
  status: ReminderStatus
  createdAt: string
  completedAt?: string | null
}

export interface ScheduleCreateRequestDto {
  title: string
  startAt: string
  endAt?: string | null
}

export interface ScheduleUpdateRequestDto {
  title: string
  startAt: string
  endAt?: string | null
}

export interface ScheduleResponseDto {
  id: number
  title: string
  startAt: string
  endAt?: string | null
  createdAt: string
}

export interface ScheduleListQueryDto {
  from?: string | null
  to?: string | null
}

export interface UserMemoryCreateRequestDto {
  content: string
}

export interface UserMemoryUpdateRequestDto {
  content: string
}

export interface UserMemoryResponseDto {
  id: number
  content: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ActivityEventResponseDto {
  id: number
  type: ActivityEventType
  title: string
  description?: string | null
  relatedEntityType?: string | null
  relatedEntityId?: number | null
  metadataJson?: string | null
  createdAt: string
}

export interface ActivityEventListQueryDto {
  limit?: number | null
}

export interface WebPushPublicKeyResponseDto {
  enabled: boolean
  publicKey?: string | null
}

export interface WebPushSubscriptionRequestDto {
  endpoint: string
  p256dh: string
  auth: string
}

export interface WebPushSubscriptionResponseDto {
  id?: number
  endpoint?: string
  active?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuthUserViewModel {
  id: string
  email: string
  createdAtLabel: string
}

export interface LoginFormViewModel {
  email: string
  password: string
  errorMessage: string
  isSubmitting: boolean
}

export interface ChatSessionViewModel {
  id: string
  title: string
  archived: boolean
  lastMessageAtLabel: string
  createdAtLabel: string
}

export type ChatMessageRole = 'assistant' | 'user' | 'system'

export interface TaskDetailViewModel {
  label: string
  value: string
}

export interface ChatMessageViewModel {
  id: string
  sessionId?: string
  role: ChatMessageRole
  senderName: string
  avatarLabel: string
  content: string
  createdAtLabel: string
  taskTypeLabel: string
  statusLabel: string
  isPending?: boolean
  details: TaskDetailViewModel[]
}

export interface TaskClassificationViewModel {
  taskType: ChatTaskType
  statusLabel: string
  label: string
}

export interface ReminderFormViewModel {
  content: string
  remindAt: string
}

export interface ReminderViewModel {
  id: string
  title: string
  remindAtLabel: string
  statusLabel: ReminderStatus
  createdAtLabel: string
  completedAtLabel: string
}

export interface ScheduleFiltersViewModel {
  from: string
  to: string
}

export interface ScheduleFormViewModel {
  editingId: string
  title: string
  startAt: string
  endAt: string
}

export interface ScheduleViewModel {
  id: string
  title: string
  startAtLabel: string
  endAtLabel: string
  createdAtLabel: string
}

export interface MemoryFormViewModel {
  editingId: string
  content: string
}

export interface MemoryViewModel {
  id: string
  content: string
  activeLabel: string
  createdAtLabel: string
  updatedAtLabel: string
}

export interface ActivityEventViewModel {
  id: string
  typeLabel: string
  title: string
  description: string
  relatedLabel: string
  createdAtLabel: string
}

export interface WebPushViewModel {
  enabled: boolean
  publicKeyLabel: string
  permissionLabel: string
  subscriptionStatusLabel: string
  errorMessage: string
  isSubmitting: boolean
}

export interface SystemStatusViewModel {
  modelName: string
  runtimeLabel: string
  healthLabel: SystemHealthLabel
}

export interface QuickPromptViewModel {
  id: string
  label: string
  prompt: string
}

export interface JarvisWorkspaceViewModel {
  user: AuthUserViewModel | null
  loginForm: LoginFormViewModel
  activeView: ChatWorkspaceView
  sessions: ChatSessionViewModel[]
  activeSessionId: string
  messages: ChatMessageViewModel[]
  classifications: TaskClassificationViewModel[]
  reminders: ReminderViewModel[]
  schedules: ScheduleViewModel[]
  memories: MemoryViewModel[]
  activityEvents: ActivityEventViewModel[]
  reminderForm: ReminderFormViewModel
  scheduleFilters: ScheduleFiltersViewModel
  scheduleForm: ScheduleFormViewModel
  memoryForm: MemoryFormViewModel
  webPush: WebPushViewModel
  quickPrompts: QuickPromptViewModel[]
  systemStatus: SystemStatusViewModel
}

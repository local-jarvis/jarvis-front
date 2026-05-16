import { useCallback, useEffect, useState } from 'react'
import {
  archiveChatSession,
  cancelReminder,
  createChatSession,
  createMemory,
  createReminder,
  createSchedule,
  deleteMemory,
  deleteSchedule,
  fetchActivityEvents,
  fetchChatSessionMessages,
  fetchChatSessions,
  fetchCurrentUser,
  fetchMemories,
  fetchReminders,
  fetchSchedules,
  fetchWebPushPublicKey,
  getJarvisApiBaseUrl,
  hasStoredAccessToken,
  login,
  logout,
  saveWebPushSubscription,
  sendChatMessage,
  updateChatSession,
  updateMemory,
  updateSchedule,
} from '../services/jarvisApiService'
import type {
  ActivityEventResponseDto,
  ActivityEventType,
  ActivityEventViewModel,
  AuthUserResponseDto,
  AuthUserViewModel,
  ChatMessageResponseDto,
  ChatMessageViewModel,
  ChatResponseDto,
  ChatSessionResponseDto,
  ChatSessionViewModel,
  ChatTaskType,
  ChatWorkspaceView,
  JarvisWorkspaceViewModel,
  MemoryFormViewModel,
  MemoryViewModel,
  QuickPromptViewModel,
  ReminderFormViewModel,
  ReminderResponseDto,
  ReminderViewModel,
  ScheduleFiltersViewModel,
  ScheduleFormViewModel,
  ScheduleResponseDto,
  ScheduleViewModel,
  SystemStatusViewModel,
  TaskClassificationViewModel,
  WebPushPublicKeyResponseDto,
  WebPushViewModel,
} from '../types/chat'

const PENDING_ASSISTANT_MESSAGE_CONTENT = 'Jarvis가 생각중입니다.'

const quickPrompts: QuickPromptViewModel[] = [
  {
    id: 'prompt-daily-plan',
    label: '오늘 할 일 정리',
    prompt: '오늘 할 일을 우선순위대로 정리해줘',
  },
  {
    id: 'prompt-reminder',
    label: '내일 9시 알림',
    prompt: '내일 오전 9시에 회의 준비하라고 알려줘',
  },
  {
    id: 'prompt-memory',
    label: '기억 저장',
    prompt: '내가 커피보다 차를 더 좋아한다고 기억해줘',
  },
]

interface WorkspaceSnapshot {
  sessions: ChatSessionResponseDto[]
  activeSessionId: string
  messages: ChatMessageResponseDto[]
  reminders: ReminderResponseDto[]
  schedules: ScheduleResponseDto[]
  memories: Awaited<ReturnType<typeof fetchMemories>>
  activityEvents: ActivityEventResponseDto[]
  webPush: WebPushPublicKeyResponseDto
}

interface UseChatPageResult extends JarvisWorkspaceViewModel {
  isBootstrapping: boolean
  isWorkspaceLoading: boolean
  isSubmitting: boolean
  isResourceSubmitting: boolean
  composerText: string
  sessionTitleDraft: string
  handleLoginEmailChange: (value: string) => void
  handleLoginPasswordChange: (value: string) => void
  handleLoginSubmit: () => Promise<void>
  handleLogout: () => void
  handleViewSelect: (view: ChatWorkspaceView) => void
  handleComposerTextChange: (value: string) => void
  handlePromptSelect: (prompt: QuickPromptViewModel) => void
  handleSubmitMessage: () => Promise<void>
  handleSessionSelect: (sessionId: string) => Promise<void>
  handleCreateSession: () => Promise<void>
  handleArchiveSession: (sessionId: string) => Promise<void>
  handleSessionTitleDraftChange: (value: string) => void
  handleSaveSessionTitle: () => Promise<void>
  handleReminderFormChange: (field: keyof ReminderFormViewModel, value: string) => void
  handleCreateReminder: () => Promise<void>
  handleCancelReminder: (reminderId: string) => Promise<void>
  handleScheduleFiltersChange: (
    field: keyof ScheduleFiltersViewModel,
    value: string,
  ) => void
  handleRefreshSchedules: () => Promise<void>
  handleScheduleFormChange: (field: keyof ScheduleFormViewModel, value: string) => void
  handleEditSchedule: (schedule: ScheduleViewModel) => void
  handleClearScheduleForm: () => void
  handleSaveSchedule: () => Promise<void>
  handleDeleteSchedule: (scheduleId: string) => Promise<void>
  handleMemoryFormChange: (field: keyof MemoryFormViewModel, value: string) => void
  handleEditMemory: (memory: MemoryViewModel) => void
  handleClearMemoryForm: () => void
  handleSaveMemory: () => Promise<void>
  handleDeleteMemory: (memoryId: string) => Promise<void>
  handleRefreshActivityEvents: () => Promise<void>
  handleRegisterWebPush: () => Promise<void>
}

/**
 * JARVIS 화면의 인증, API 호출, DTO to ViewModel 변환, UI 상태 전이를 관리한다.
 */
export function useChatPage(): UseChatPageResult {
  const [workspace, setWorkspace] = useState<JarvisWorkspaceViewModel>(
    createEmptyWorkspace(),
  )
  const [composerText, setComposerText] = useState('')
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResourceSubmitting, setIsResourceSubmitting] = useState(false)
  const [sessionTitleDraft, setSessionTitleDraft] = useState('')
  const [webPushPublicKey, setWebPushPublicKey] = useState<string | null>(null)

  const markFailureStatus = useCallback((error: unknown) => {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      systemStatus: createSystemStatus('FAILED', getErrorMessage(error)),
    }))
  }, [])

  useEffect(() => {
    let isMounted = true

    async function bootstrap() {
      if (!hasStoredAccessToken()) {
        setIsBootstrapping(false)
        return
      }

      try {
        const currentUser = await fetchCurrentUser()
        const snapshot = await loadWorkspaceSnapshot('', createEmptyScheduleFilters())

        if (!isMounted) {
          return
        }

        setWebPushPublicKey(snapshot.webPush.publicKey ?? null)
        setWorkspace((currentWorkspace) =>
          applyWorkspaceSnapshot(currentWorkspace, currentUser, snapshot),
        )
        setSessionTitleDraft(findSessionTitle(snapshot.sessions, snapshot.activeSessionId))
      } catch (error) {
        logout()

        if (!isMounted) {
          return
        }

        setWorkspace((currentWorkspace) => ({
          ...currentWorkspace,
          loginForm: {
            ...currentWorkspace.loginForm,
            errorMessage: getErrorMessage(error),
          },
          systemStatus: createSystemStatus('FAILED'),
        }))
      } finally {
        if (isMounted) {
          setIsBootstrapping(false)
        }
      }
    }

    void bootstrap()

    return () => {
      isMounted = false
    }
  }, [])

  const reloadWorkspace = useCallback(
    async (requestedSessionId = workspace.activeSessionId) => {
      setIsWorkspaceLoading(true)

      try {
        const currentUser = await fetchCurrentUser()
        const snapshot = await loadWorkspaceSnapshot(
          requestedSessionId,
          workspace.scheduleFilters,
        )

        setWebPushPublicKey(snapshot.webPush.publicKey ?? null)
        setWorkspace((currentWorkspace) =>
          applyWorkspaceSnapshot(currentWorkspace, currentUser, snapshot),
        )
        setSessionTitleDraft(findSessionTitle(snapshot.sessions, snapshot.activeSessionId))
      } catch (error) {
        setWorkspace((currentWorkspace) => ({
          ...currentWorkspace,
          systemStatus: createSystemStatus('FAILED', getErrorMessage(error)),
        }))
      } finally {
        setIsWorkspaceLoading(false)
      }
    },
    [workspace.activeSessionId, workspace.scheduleFilters],
  )

  const handleLoginEmailChange = useCallback((value: string) => {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      loginForm: {
        ...currentWorkspace.loginForm,
        email: value,
        errorMessage: '',
      },
    }))
  }, [])

  const handleLoginPasswordChange = useCallback((value: string) => {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      loginForm: {
        ...currentWorkspace.loginForm,
        password: value,
        errorMessage: '',
      },
    }))
  }, [])

  const handleLoginSubmit = useCallback(async () => {
    const email = workspace.loginForm.email.trim()
    const password = workspace.loginForm.password

    if (email.length === 0 || password.length === 0) {
      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        loginForm: {
          ...currentWorkspace.loginForm,
          errorMessage: 'email과 password를 입력해 주세요.',
        },
      }))
      return
    }

    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      loginForm: {
        ...currentWorkspace.loginForm,
        errorMessage: '',
        isSubmitting: true,
      },
    }))

    try {
      const loginResponse = await login({ email, password })
      const currentUser = await fetchCurrentUser().catch<AuthUserResponseDto>(() => ({
        id: loginResponse.user.id,
        email: loginResponse.user.email,
      }))
      const snapshot = await loadWorkspaceSnapshot('', workspace.scheduleFilters)

      setWebPushPublicKey(snapshot.webPush.publicKey ?? null)
      setWorkspace((currentWorkspace) =>
        applyWorkspaceSnapshot(currentWorkspace, currentUser, snapshot, {
          clearLoginForm: true,
        }),
      )
      setSessionTitleDraft(findSessionTitle(snapshot.sessions, snapshot.activeSessionId))
    } catch (error) {
      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        loginForm: {
          ...currentWorkspace.loginForm,
          errorMessage: getErrorMessage(error),
          isSubmitting: false,
        },
        systemStatus: createSystemStatus('FAILED'),
      }))
    }
  }, [workspace.loginForm.email, workspace.loginForm.password, workspace.scheduleFilters])

  const handleLogout = useCallback(() => {
    logout()
    setComposerText('')
    setSessionTitleDraft('')
    setWebPushPublicKey(null)
    setWorkspace(createEmptyWorkspace())
  }, [])

  const handleViewSelect = useCallback((view: ChatWorkspaceView) => {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      activeView: view,
    }))
  }, [])

  const handleComposerTextChange = useCallback((value: string) => {
    setComposerText(value)
  }, [])

  const handlePromptSelect = useCallback((prompt: QuickPromptViewModel) => {
    setComposerText(prompt.prompt)
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      activeView: 'chat',
    }))
  }, [])

  const handleSessionSelect = useCallback(async (sessionId: string) => {
    setIsWorkspaceLoading(true)

    try {
      const messages = await fetchChatSessionMessages(Number(sessionId), {
        limit: 100,
      })

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        activeView: 'chat',
        activeSessionId: sessionId,
        messages: messages.map(mapChatMessageResponseToViewModel),
        systemStatus: createSystemStatus('ONLINE'),
      }))
      setSessionTitleDraft(
        workspace.sessions.find((session) => session.id === sessionId)?.title ?? '',
      )
    } catch (error) {
      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        systemStatus: createSystemStatus('FAILED', getErrorMessage(error)),
      }))
    } finally {
      setIsWorkspaceLoading(false)
    }
  }, [workspace.sessions])

  const handleCreateSession = useCallback(async () => {
    setIsResourceSubmitting(true)

    try {
      const session = await createChatSession({ title: null })
      await reloadWorkspace(String(session.id))
    } catch (error) {
      markFailureStatus(error)
    } finally {
      setIsResourceSubmitting(false)
    }
  }, [markFailureStatus, reloadWorkspace])

  const handleArchiveSession = useCallback(
    async (sessionId: string) => {
      setIsResourceSubmitting(true)

      try {
        await archiveChatSession(Number(sessionId))
        await reloadWorkspace(
          workspace.activeSessionId === sessionId ? '' : workspace.activeSessionId,
        )
      } catch (error) {
        markFailureStatus(error)
      } finally {
        setIsResourceSubmitting(false)
      }
    },
    [markFailureStatus, reloadWorkspace, workspace.activeSessionId],
  )

  const handleSessionTitleDraftChange = useCallback((value: string) => {
    setSessionTitleDraft(value)
  }, [])

  const handleSaveSessionTitle = useCallback(async () => {
    if (!workspace.activeSessionId) {
      return
    }

    setIsResourceSubmitting(true)

    try {
      await updateChatSession(Number(workspace.activeSessionId), {
        title: sessionTitleDraft.trim() || null,
      })
      await reloadWorkspace(workspace.activeSessionId)
    } catch (error) {
      markFailureStatus(error)
    } finally {
      setIsResourceSubmitting(false)
    }
  }, [markFailureStatus, reloadWorkspace, sessionTitleDraft, workspace.activeSessionId])

  const submitJsonMessage = useCallback(
    async (content: string, pendingAssistantMessageId: string) => {
      try {
        const response = await sendChatMessage({
          sessionId: workspace.activeSessionId
            ? Number(workspace.activeSessionId)
            : null,
          message: content,
        })
        const assistantMessage = mapChatResponseToMessageViewModel(response)

        setWorkspace((currentWorkspace) => ({
          ...currentWorkspace,
          activeSessionId: response.sessionId
            ? String(response.sessionId)
            : currentWorkspace.activeSessionId,
          messages: replaceMessageById(
            currentWorkspace.messages,
            pendingAssistantMessageId,
            assistantMessage,
          ),
          classifications: [mapChatResponseToClassification(response)],
          systemStatus: createSystemStatus('ONLINE'),
        }))

        await reloadWorkspace(response.sessionId ? String(response.sessionId) : undefined)
      } catch (error) {
        setWorkspace((currentWorkspace) => ({
          ...currentWorkspace,
          messages: replaceMessageById(
            currentWorkspace.messages,
            pendingAssistantMessageId,
            createFailureAssistantMessage(getErrorMessage(error)),
          ),
          classifications: [
            {
              taskType: 'UNKNOWN',
              statusLabel: 'FAILED',
              label: '요청 실패',
            },
          ],
          systemStatus: createSystemStatus('FAILED', getErrorMessage(error)),
        }))
      }
    },
    [reloadWorkspace, workspace.activeSessionId],
  )

  const handleSubmitMessage = useCallback(async () => {
    const content = composerText.trim()

    if (content.length === 0) {
      return
    }

    const pendingAssistantMessageId = createLocalMessageId('assistant-pending')
    const optimisticUserMessage = createOptimisticUserMessage(content)

    setComposerText('')
    setIsSubmitting(true)
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      activeView: 'chat',
      messages: [
        ...currentWorkspace.messages,
        optimisticUserMessage,
        createPendingAssistantMessage(pendingAssistantMessageId),
      ],
    }))

    try {
      await submitJsonMessage(content, pendingAssistantMessageId)
    } finally {
      setIsSubmitting(false)
    }
  }, [composerText, submitJsonMessage])

  const handleReminderFormChange = useCallback(
    (field: keyof ReminderFormViewModel, value: string) => {
      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        reminderForm: {
          ...currentWorkspace.reminderForm,
          [field]: value,
        },
      }))
    },
    [],
  )

  const handleCreateReminder = useCallback(async () => {
    const content = workspace.reminderForm.content.trim()
    const remindAt = workspace.reminderForm.remindAt

    if (content.length === 0 || remindAt.length === 0) {
      return
    }

    setIsResourceSubmitting(true)

    try {
      await createReminder({ content, remindAt })
      const [reminders, activityEvents] = await Promise.all([
        fetchReminders(),
        fetchActivityEvents({ limit: 50 }),
      ])

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        reminders: reminders.map(mapReminderResponseToViewModel),
        activityEvents: activityEvents.map(mapActivityEventResponseToViewModel),
        reminderForm: createEmptyReminderForm(),
        systemStatus: createSystemStatus('ONLINE'),
      }))
    } catch (error) {
      markFailureStatus(error)
    } finally {
      setIsResourceSubmitting(false)
    }
  }, [markFailureStatus, workspace.reminderForm])

  const handleCancelReminder = useCallback(async (reminderId: string) => {
    setIsResourceSubmitting(true)

    try {
      await cancelReminder(Number(reminderId))
      const reminders = await fetchReminders()

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        reminders: reminders.map(mapReminderResponseToViewModel),
        systemStatus: createSystemStatus('ONLINE'),
      }))
    } catch (error) {
      markFailureStatus(error)
    } finally {
      setIsResourceSubmitting(false)
    }
  }, [markFailureStatus])

  const handleScheduleFiltersChange = useCallback(
    (field: keyof ScheduleFiltersViewModel, value: string) => {
      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        scheduleFilters: {
          ...currentWorkspace.scheduleFilters,
          [field]: value,
        },
      }))
    },
    [],
  )

  const handleRefreshSchedules = useCallback(async () => {
    setIsResourceSubmitting(true)

    try {
      const schedules = await fetchSchedules(workspace.scheduleFilters)

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        schedules: schedules.map(mapScheduleResponseToViewModel),
        systemStatus: createSystemStatus('ONLINE'),
      }))
    } catch (error) {
      markFailureStatus(error)
    } finally {
      setIsResourceSubmitting(false)
    }
  }, [markFailureStatus, workspace.scheduleFilters])

  const handleScheduleFormChange = useCallback(
    (field: keyof ScheduleFormViewModel, value: string) => {
      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        scheduleForm: {
          ...currentWorkspace.scheduleForm,
          [field]: value,
        },
      }))
    },
    [],
  )

  const handleEditSchedule = useCallback((schedule: ScheduleViewModel) => {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      scheduleForm: {
        editingId: schedule.id,
        title: schedule.title,
        startAt: convertLabelToInputDateTime(schedule.startAtLabel),
        endAt: convertLabelToInputDateTime(schedule.endAtLabel),
      },
    }))
  }, [])

  const handleClearScheduleForm = useCallback(() => {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      scheduleForm: createEmptyScheduleForm(),
    }))
  }, [])

  const handleSaveSchedule = useCallback(async () => {
    const title = workspace.scheduleForm.title.trim()
    const startAt = workspace.scheduleForm.startAt

    if (title.length === 0 || startAt.length === 0) {
      return
    }

    setIsResourceSubmitting(true)

    try {
      const request = {
        title,
        startAt,
        endAt: workspace.scheduleForm.endAt || null,
      }

      if (workspace.scheduleForm.editingId) {
        await updateSchedule(Number(workspace.scheduleForm.editingId), request)
      } else {
        await createSchedule(request)
      }

      const schedules = await fetchSchedules(workspace.scheduleFilters)

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        schedules: schedules.map(mapScheduleResponseToViewModel),
        scheduleForm: createEmptyScheduleForm(),
        systemStatus: createSystemStatus('ONLINE'),
      }))
    } catch (error) {
      markFailureStatus(error)
    } finally {
      setIsResourceSubmitting(false)
    }
  }, [markFailureStatus, workspace.scheduleFilters, workspace.scheduleForm])

  const handleDeleteSchedule = useCallback(
    async (scheduleId: string) => {
      setIsResourceSubmitting(true)

      try {
        await deleteSchedule(Number(scheduleId))
        const schedules = await fetchSchedules(workspace.scheduleFilters)

        setWorkspace((currentWorkspace) => ({
          ...currentWorkspace,
          schedules: schedules.map(mapScheduleResponseToViewModel),
          systemStatus: createSystemStatus('ONLINE'),
        }))
      } catch (error) {
        markFailureStatus(error)
      } finally {
        setIsResourceSubmitting(false)
      }
    },
    [markFailureStatus, workspace.scheduleFilters],
  )

  const handleMemoryFormChange = useCallback(
    (field: keyof MemoryFormViewModel, value: string) => {
      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        memoryForm: {
          ...currentWorkspace.memoryForm,
          [field]: value,
        },
      }))
    },
    [],
  )

  const handleEditMemory = useCallback((memory: MemoryViewModel) => {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      memoryForm: {
        editingId: memory.id,
        content: memory.content,
      },
    }))
  }, [])

  const handleClearMemoryForm = useCallback(() => {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      memoryForm: createEmptyMemoryForm(),
    }))
  }, [])

  const handleSaveMemory = useCallback(async () => {
    const content = workspace.memoryForm.content.trim()

    if (content.length === 0) {
      return
    }

    setIsResourceSubmitting(true)

    try {
      if (workspace.memoryForm.editingId) {
        await updateMemory(Number(workspace.memoryForm.editingId), { content })
      } else {
        await createMemory({ content })
      }

      const memories = await fetchMemories()

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        memories: memories.map(mapMemoryResponseToViewModel),
        memoryForm: createEmptyMemoryForm(),
        systemStatus: createSystemStatus('ONLINE'),
      }))
    } catch (error) {
      markFailureStatus(error)
    } finally {
      setIsResourceSubmitting(false)
    }
  }, [markFailureStatus, workspace.memoryForm])

  const handleDeleteMemory = useCallback(async (memoryId: string) => {
    setIsResourceSubmitting(true)

    try {
      await deleteMemory(Number(memoryId))
      const memories = await fetchMemories()

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        memories: memories.map(mapMemoryResponseToViewModel),
        systemStatus: createSystemStatus('ONLINE'),
      }))
    } catch (error) {
      markFailureStatus(error)
    } finally {
      setIsResourceSubmitting(false)
    }
  }, [markFailureStatus])

  const handleRefreshActivityEvents = useCallback(async () => {
    setIsResourceSubmitting(true)

    try {
      const activityEvents = await fetchActivityEvents({ limit: 50 })

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        activityEvents: activityEvents.map(mapActivityEventResponseToViewModel),
        systemStatus: createSystemStatus('ONLINE'),
      }))
    } catch (error) {
      markFailureStatus(error)
    } finally {
      setIsResourceSubmitting(false)
    }
  }, [markFailureStatus])

  const handleRegisterWebPush = useCallback(async () => {
    setWorkspace((currentWorkspace) => ({
      ...currentWorkspace,
      webPush: {
        ...currentWorkspace.webPush,
        errorMessage: '',
        isSubmitting: true,
      },
    }))

    try {
      if (!workspace.webPush.enabled || !webPushPublicKey) {
        throw new Error('Web Push public key가 설정되지 않았습니다.')
      }

      const subscriptionRequest = await createBrowserPushSubscription(webPushPublicKey)
      await saveWebPushSubscription(subscriptionRequest)

      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        webPush: {
          ...currentWorkspace.webPush,
          permissionLabel: getNotificationPermissionLabel(),
          subscriptionStatusLabel: '등록됨',
          errorMessage: '',
          isSubmitting: false,
        },
        systemStatus: createSystemStatus('ONLINE'),
      }))
    } catch (error) {
      setWorkspace((currentWorkspace) => ({
        ...currentWorkspace,
        webPush: {
          ...currentWorkspace.webPush,
          permissionLabel: getNotificationPermissionLabel(),
          subscriptionStatusLabel: '등록 실패',
          errorMessage: getErrorMessage(error),
          isSubmitting: false,
        },
        systemStatus: createSystemStatus('FAILED', getErrorMessage(error)),
      }))
    }
  }, [webPushPublicKey, workspace.webPush.enabled])

  return {
    ...workspace,
    isBootstrapping,
    isWorkspaceLoading,
    isSubmitting,
    isResourceSubmitting,
    composerText,
    sessionTitleDraft,
    handleLoginEmailChange,
    handleLoginPasswordChange,
    handleLoginSubmit,
    handleLogout,
    handleViewSelect,
    handleComposerTextChange,
    handlePromptSelect,
    handleSubmitMessage,
    handleSessionSelect,
    handleCreateSession,
    handleArchiveSession,
    handleSessionTitleDraftChange,
    handleSaveSessionTitle,
    handleReminderFormChange,
    handleCreateReminder,
    handleCancelReminder,
    handleScheduleFiltersChange,
    handleRefreshSchedules,
    handleScheduleFormChange,
    handleEditSchedule,
    handleClearScheduleForm,
    handleSaveSchedule,
    handleDeleteSchedule,
    handleMemoryFormChange,
    handleEditMemory,
    handleClearMemoryForm,
    handleSaveMemory,
    handleDeleteMemory,
    handleRefreshActivityEvents,
    handleRegisterWebPush,
  }
}

async function loadWorkspaceSnapshot(
  requestedSessionId: string,
  scheduleFilters: ScheduleFiltersViewModel,
): Promise<WorkspaceSnapshot> {
  const [
    sessions,
    reminders,
    schedules,
    memories,
    activityEvents,
    webPush,
  ] = await Promise.all([
    fetchChatSessions(),
    fetchReminders(),
    fetchSchedules(scheduleFilters),
    fetchMemories(),
    fetchActivityEvents({ limit: 50 }),
    fetchWebPushPublicKey(),
  ])
  const activeSessionId = selectActiveSessionId(requestedSessionId, sessions)
  const messages = activeSessionId
    ? await fetchChatSessionMessages(Number(activeSessionId), { limit: 100 })
    : []

  return {
    sessions,
    activeSessionId,
    messages,
    reminders,
    schedules,
    memories,
    activityEvents,
    webPush,
  }
}

function applyWorkspaceSnapshot(
  currentWorkspace: JarvisWorkspaceViewModel,
  currentUser: AuthUserResponseDto,
  snapshot: WorkspaceSnapshot,
  options: { clearLoginForm?: boolean } = {},
): JarvisWorkspaceViewModel {
  return {
    ...currentWorkspace,
    user: mapAuthUserResponseToViewModel(currentUser),
    loginForm: options.clearLoginForm
      ? createEmptyLoginForm()
      : {
          ...currentWorkspace.loginForm,
          isSubmitting: false,
          errorMessage: '',
        },
    sessions: snapshot.sessions.map(mapChatSessionResponseToViewModel),
    activeSessionId: snapshot.activeSessionId,
    messages:
      snapshot.messages.length > 0
        ? snapshot.messages.map(mapChatMessageResponseToViewModel)
        : createInitialMessages(snapshot.activeSessionId),
    reminders: snapshot.reminders.map(mapReminderResponseToViewModel),
    schedules: snapshot.schedules.map(mapScheduleResponseToViewModel),
    memories: snapshot.memories.map(mapMemoryResponseToViewModel),
    activityEvents: snapshot.activityEvents.map(mapActivityEventResponseToViewModel),
    webPush: mapWebPushResponseToViewModel(snapshot.webPush),
    systemStatus: createSystemStatus('ONLINE'),
  }
}

function createEmptyWorkspace(): JarvisWorkspaceViewModel {
  return {
    user: null,
    loginForm: createEmptyLoginForm(),
    activeView: 'chat',
    sessions: [],
    activeSessionId: '',
    messages: [],
    classifications: [],
    reminders: [],
    schedules: [],
    memories: [],
    activityEvents: [],
    reminderForm: createEmptyReminderForm(),
    scheduleFilters: createEmptyScheduleFilters(),
    scheduleForm: createEmptyScheduleForm(),
    memoryForm: createEmptyMemoryForm(),
    webPush: {
      enabled: false,
      publicKeyLabel: '미확인',
      permissionLabel: getNotificationPermissionLabel(),
      subscriptionStatusLabel: '미등록',
      errorMessage: '',
      isSubmitting: false,
    },
    quickPrompts,
    systemStatus: createSystemStatus('OFFLINE'),
  }
}

function createEmptyLoginForm() {
  return {
    email: '',
    password: '',
    errorMessage: '',
    isSubmitting: false,
  }
}

function createEmptyReminderForm(): ReminderFormViewModel {
  return {
    content: '',
    remindAt: '',
  }
}

function createEmptyScheduleFilters(): ScheduleFiltersViewModel {
  return {
    from: '',
    to: '',
  }
}

function createEmptyScheduleForm(): ScheduleFormViewModel {
  return {
    editingId: '',
    title: '',
    startAt: '',
    endAt: '',
  }
}

function createEmptyMemoryForm(): MemoryFormViewModel {
  return {
    editingId: '',
    content: '',
  }
}

function mapAuthUserResponseToViewModel(
  response: AuthUserResponseDto,
): AuthUserViewModel {
  return {
    id: String(response.id),
    email: response.email,
    createdAtLabel: formatLocalDateTimeLabel(response.createdAt ?? ''),
  }
}

function mapChatSessionResponseToViewModel(
  response: ChatSessionResponseDto,
): ChatSessionViewModel {
  return {
    id: String(response.id),
    title: response.title || '제목 없는 대화',
    archived: response.archived,
    lastMessageAtLabel: formatLocalDateTimeLabel(response.lastMessageAt ?? ''),
    createdAtLabel: formatLocalDateTimeLabel(response.createdAt),
  }
}

function mapChatMessageResponseToViewModel(
  response: ChatMessageResponseDto,
): ChatMessageViewModel {
  const role = mapChatRole(response.role)

  return {
    id: String(response.id),
    sessionId: String(response.sessionId),
    role,
    senderName: createSenderName(role),
    avatarLabel: createAvatarLabel(role),
    content: response.content,
    createdAtLabel: formatLocalDateTimeLabel(response.createdAt),
    taskTypeLabel: response.taskType ?? 'CHAT',
    statusLabel: response.status,
    isPending: response.status === 'STREAMING',
    details: createMessageMetadataDetails(response.metadataJson),
  }
}

function mapReminderResponseToViewModel(
  response: ReminderResponseDto,
): ReminderViewModel {
  return {
    id: String(response.id),
    title: response.content,
    remindAtLabel: formatLocalDateTimeLabel(response.remindAt),
    statusLabel: response.status,
    createdAtLabel: formatLocalDateTimeLabel(response.createdAt),
    completedAtLabel: formatLocalDateTimeLabel(response.completedAt ?? ''),
  }
}

function mapScheduleResponseToViewModel(
  response: ScheduleResponseDto,
): ScheduleViewModel {
  return {
    id: String(response.id),
    title: response.title,
    startAtLabel: formatLocalDateTimeLabel(response.startAt),
    endAtLabel: formatLocalDateTimeLabel(response.endAt ?? ''),
    createdAtLabel: formatLocalDateTimeLabel(response.createdAt),
  }
}

function mapMemoryResponseToViewModel(
  response: Awaited<ReturnType<typeof fetchMemories>>[number],
): MemoryViewModel {
  return {
    id: String(response.id),
    content: response.content,
    activeLabel: response.active ? 'active' : 'inactive',
    createdAtLabel: formatLocalDateTimeLabel(response.createdAt),
    updatedAtLabel: formatLocalDateTimeLabel(response.updatedAt),
  }
}

function mapActivityEventResponseToViewModel(
  response: ActivityEventResponseDto,
): ActivityEventViewModel {
  return {
    id: String(response.id),
    typeLabel: createActivityTypeLabel(response.type),
    title: response.title,
    description: response.description ?? '',
    relatedLabel: createRelatedEntityLabel(
      response.relatedEntityType,
      response.relatedEntityId,
    ),
    createdAtLabel: formatLocalDateTimeLabel(response.createdAt),
  }
}

function mapWebPushResponseToViewModel(
  response: WebPushPublicKeyResponseDto,
): WebPushViewModel {
  return {
    enabled: response.enabled,
    publicKeyLabel: response.publicKey ? '설정됨' : '없음',
    permissionLabel: getNotificationPermissionLabel(),
    subscriptionStatusLabel: response.enabled ? '등록 가능' : '비활성',
    errorMessage: '',
    isSubmitting: false,
  }
}

function createInitialMessages(activeSessionId: string): ChatMessageViewModel[] {
  return [
    {
      id: createLocalMessageId('assistant-initial'),
      sessionId: activeSessionId || undefined,
      role: 'assistant',
      senderName: 'JARVIS',
      avatarLabel: 'J',
      content: activeSessionId
        ? '세션 메시지가 없습니다. 새 메시지를 보내면 이 대화에 저장됩니다.'
        : '로그인되었습니다. 새 대화를 만들거나 메시지를 보내면 세션이 자동 생성됩니다.',
      createdAtLabel: formatLocalDateTimeLabel(new Date().toISOString()),
      taskTypeLabel: 'CHAT',
      statusLabel: 'COMPLETED',
      isPending: false,
      details: [{ label: 'apiHost', value: getJarvisApiBaseUrl() }],
    },
  ]
}

function createOptimisticUserMessage(content: string): ChatMessageViewModel {
  return {
    id: createLocalMessageId('user-optimistic'),
    role: 'user',
    senderName: '나',
    avatarLabel: 'ME',
    content,
    createdAtLabel: formatLocalDateTimeLabel(new Date().toISOString()),
    taskTypeLabel: 'CHAT',
    statusLabel: 'COMPLETED',
    isPending: false,
    details: [],
  }
}

function createPendingAssistantMessage(id: string): ChatMessageViewModel {
  return {
    id,
    role: 'assistant',
    senderName: 'JARVIS',
    avatarLabel: 'J',
    content: PENDING_ASSISTANT_MESSAGE_CONTENT,
    createdAtLabel: formatLocalDateTimeLabel(new Date().toISOString()),
    taskTypeLabel: 'CHAT',
    statusLabel: 'WAITING',
    isPending: true,
    details: [],
  }
}

function createFailureAssistantMessage(message: string): ChatMessageViewModel {
  return {
    id: createLocalMessageId('assistant-error'),
    role: 'assistant',
    senderName: 'JARVIS',
    avatarLabel: 'J',
    content: message,
    createdAtLabel: formatLocalDateTimeLabel(new Date().toISOString()),
    taskTypeLabel: 'UNKNOWN',
    statusLabel: 'FAILED',
    isPending: false,
    details: [{ label: 'apiHost', value: getJarvisApiBaseUrl() }],
  }
}

function mapChatResponseToMessageViewModel(
  response: ChatResponseDto,
): ChatMessageViewModel {
  return {
    id: response.messageId ? String(response.messageId) : createLocalMessageId('assistant'),
    sessionId: response.sessionId ? String(response.sessionId) : undefined,
    role: 'assistant',
    senderName: 'JARVIS',
    avatarLabel: 'J',
    content: response.message,
    createdAtLabel: formatLocalDateTimeLabel(response.createdAt),
    taskTypeLabel: response.taskType,
    statusLabel: response.status,
    isPending: false,
    details: createChatResponseDetails(response),
  }
}

function mapChatResponseToClassification(
  response: ChatResponseDto,
): TaskClassificationViewModel {
  return {
    taskType: response.taskType,
    statusLabel: response.status,
    label: createTaskTypeLabel(response.taskType),
  }
}

function createChatResponseDetails(
  response: ChatResponseDto,
): ChatMessageViewModel['details'] {
  const details: ChatMessageViewModel['details'] = [
    { label: 'taskType', value: response.taskType },
    { label: 'status', value: response.status },
  ]

  if (response.sessionId) {
    details.push({ label: 'sessionId', value: String(response.sessionId) })
  }

  if (response.messageId) {
    details.push({ label: 'messageId', value: String(response.messageId) })
  }

  if (response.data && typeof response.data === 'object') {
    Object.entries(response.data).forEach(([key, value]) => {
      details.push({ label: key, value: String(value) })
    })
  }

  return details
}

function replaceMessageById(
  messages: ChatMessageViewModel[],
  targetMessageId: string,
  replacementMessage: ChatMessageViewModel,
): ChatMessageViewModel[] {
  let hasReplacedMessage = false

  const nextMessages = messages.map((message) => {
    if (message.id !== targetMessageId) {
      return message
    }

    hasReplacedMessage = true

    return replacementMessage
  })

  return hasReplacedMessage ? nextMessages : [...messages, replacementMessage]
}

function mapChatRole(role: ChatMessageResponseDto['role']) {
  if (role === 'USER') {
    return 'user'
  }

  if (role === 'SYSTEM') {
    return 'system'
  }

  return 'assistant'
}

function createSenderName(role: ChatMessageViewModel['role']): string {
  if (role === 'user') {
    return '나'
  }

  if (role === 'system') {
    return 'SYSTEM'
  }

  return 'JARVIS'
}

function createAvatarLabel(role: ChatMessageViewModel['role']): string {
  if (role === 'user') {
    return 'ME'
  }

  if (role === 'system') {
    return 'SYS'
  }

  return 'J'
}

function createMessageMetadataDetails(
  metadataJson?: string | null,
): ChatMessageViewModel['details'] {
  if (!metadataJson) {
    return []
  }

  try {
    const metadata = JSON.parse(metadataJson) as Record<string, unknown>

    return Object.entries(metadata).map(([key, value]) => ({
      label: key,
      value: String(value),
    }))
  } catch {
    return [{ label: 'metadataJson', value: metadataJson }]
  }
}

function createTaskTypeLabel(taskType: ChatTaskType): string {
  const labelsByTaskType: Record<ChatTaskType, string> = {
    CHAT: '일반 채팅',
    REMINDER: '리마인더',
    SCHEDULE: '일정',
    MEMORY: '메모리',
    UNKNOWN: '알 수 없음',
  }

  return labelsByTaskType[taskType]
}

function createActivityTypeLabel(activityType: ActivityEventType): string {
  const labelsByActivityType: Record<ActivityEventType, string> = {
    CHAT_SESSION_CREATED: '채팅 세션 생성',
    CHAT_MESSAGE_CREATED: '채팅 메시지 저장',
    REMINDER_CREATED: '리마인더 생성',
    REMINDER_SENT: '리마인더 발송',
    SCHEDULE_CREATED: '일정 생성',
    MEMORY_STORED: '메모리 저장',
  }

  return labelsByActivityType[activityType]
}

function createRelatedEntityLabel(
  relatedEntityType?: string | null,
  relatedEntityId?: number | null,
): string {
  if (!relatedEntityType || !relatedEntityId) {
    return ''
  }

  return `${relatedEntityType} #${relatedEntityId}`
}

function createSystemStatus(
  healthLabel: SystemStatusViewModel['healthLabel'],
  runtimeOverride?: string,
): SystemStatusViewModel {
  return {
    modelName: 'jarvis-back API',
    runtimeLabel: runtimeOverride ?? getJarvisApiBaseUrl(),
    healthLabel,
  }
}

function selectActiveSessionId(
  requestedSessionId: string,
  sessions: ChatSessionResponseDto[],
): string {
  if (requestedSessionId) {
    const requestedSession = sessions.find(
      (session) => String(session.id) === requestedSessionId,
    )

    if (requestedSession) {
      return String(requestedSession.id)
    }
  }

  return sessions[0] ? String(sessions[0].id) : ''
}

function findSessionTitle(
  sessions: ChatSessionResponseDto[],
  activeSessionId: string,
): string {
  return (
    sessions.find((session) => String(session.id) === activeSessionId)?.title ?? ''
  )
}

async function createBrowserPushSubscription(
  publicKey: string,
): Promise<{
  endpoint: string
  p256dh: string
  auth: string
}> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('이 브라우저는 Web Push를 지원하지 않습니다.')
  }

  const permission =
    Notification.permission === 'default'
      ? await Notification.requestPermission()
      : Notification.permission

  if (permission !== 'granted') {
    throw new Error('브라우저 알림 권한이 허용되지 않았습니다.')
  }

  const registration = await navigator.serviceWorker.register('/web-push-sw.js')
  const applicationServerKey = convertBase64UrlToUint8Array(publicKey)
  const existingSubscription = await registration.pushManager.getSubscription()
  const shouldReuseSubscription =
    existingSubscription !== null &&
    isSubscriptionUsingApplicationServerKey(existingSubscription, applicationServerKey)

  if (existingSubscription && !shouldReuseSubscription) {
    await existingSubscription.unsubscribe()
  }

  const subscription =
    shouldReuseSubscription && existingSubscription
      ? existingSubscription
      :
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    }))
  const subscriptionJson = subscription.toJSON() as {
    endpoint?: string
    keys?: {
      p256dh?: string
      auth?: string
    }
  }

  if (
    !subscriptionJson.endpoint ||
    !subscriptionJson.keys?.p256dh ||
    !subscriptionJson.keys.auth
  ) {
    throw new Error('브라우저 PushSubscription 정보를 읽지 못했습니다.')
  }

  return {
    endpoint: subscriptionJson.endpoint,
    p256dh: subscriptionJson.keys.p256dh,
    auth: subscriptionJson.keys.auth,
  }
}

function isSubscriptionUsingApplicationServerKey(
  subscription: PushSubscription,
  applicationServerKey: Uint8Array,
): boolean {
  const currentApplicationServerKey = subscription.options.applicationServerKey

  if (!currentApplicationServerKey) {
    return false
  }

  const currentApplicationServerKeyBytes = convertBufferSourceToUint8Array(
    currentApplicationServerKey,
  )

  if (currentApplicationServerKeyBytes.byteLength !== applicationServerKey.byteLength) {
    return false
  }

  return currentApplicationServerKeyBytes.every(
    (byte, index) => byte === applicationServerKey[index],
  )
}

function convertBufferSourceToUint8Array(value: BufferSource): Uint8Array {
  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value)
  }

  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
}

function convertBase64UrlToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = `${base64Url}${padding}`.replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

function getNotificationPermissionLabel(): string {
  if (!('Notification' in window)) {
    return 'unsupported'
  }

  return Notification.permission
}

function convertLabelToInputDateTime(label: string): string {
  if (!label) {
    return ''
  }

  return label.replace(' ', 'T')
}

function formatLocalDateTimeLabel(value: string): string {
  if (!value) {
    return ''
  }

  return value.replace('T', ' ').slice(0, 16)
}

function createLocalMessageId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  return '알 수 없는 오류가 발생했습니다.'
}

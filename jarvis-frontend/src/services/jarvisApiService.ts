import type {
  ActivityEventListQueryDto,
  ActivityEventResponseDto,
  AuthLoginRequestDto,
  AuthLoginResponseDto,
  AuthRefreshRequestDto,
  AuthUserResponseDto,
  ChatMessageListQueryDto,
  ChatMessageResponseDto,
  ChatRequestDto,
  ChatResponseDto,
  ChatResponseErrorDto,
  ChatSessionCreateRequestDto,
  ChatSessionResponseDto,
  ChatSessionUpdateRequestDto,
  ReminderCreateRequestDto,
  ReminderResponseDto,
  ScheduleCreateRequestDto,
  ScheduleListQueryDto,
  ScheduleResponseDto,
  ScheduleUpdateRequestDto,
  UserMemoryCreateRequestDto,
  UserMemoryResponseDto,
  UserMemoryUpdateRequestDto,
  WebPushPublicKeyResponseDto,
  WebPushSubscriptionRequestDto,
  WebPushSubscriptionResponseDto,
} from '../types/chat'

const configuredApiBaseUrl = import.meta.env.VITE_JARVIS_API_BASE_URL

if (!configuredApiBaseUrl) {
  throw new Error(
    'VITE_JARVIS_API_BASE_URL must be set in jarvis-frontend/.env.',
  )
}

const API_BASE_URL = configuredApiBaseUrl.replace(/\/$/, '')

const FALLBACK_WEB_PUSH_PUBLIC_KEY =
  import.meta.env.VITE_JARVIS_WEB_PUSH_PUBLIC_KEY ??
  'BCFi-p-VQehvfXIKTSeaHgTsECNonwgjDJs79qw8UBKhKG65XRmNrOkARqCySmj4frYY-y6c7kis_TK65YpVOPk'

const ACCESS_TOKEN_STORAGE_KEY = 'jarvis.accessToken'
const REFRESH_TOKEN_STORAGE_KEY = 'jarvis.refreshToken'
const ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY = 'jarvis.accessTokenExpiresAt'
const REFRESH_TOKEN_EXPIRES_AT_STORAGE_KEY = 'jarvis.refreshTokenExpiresAt'
const CHAT_REQUEST_TIMEOUT_MILLIS = 120_000
const ACCESS_TOKEN_REFRESH_BUFFER_MILLIS = 60_000
const FAILED_AUTH_REFRESH_RETRY_DELAY_MILLIS = 30_000

let authRefreshPromise: Promise<AuthLoginResponseDto> | null = null
let authRefreshTimerId: number | undefined

/**
 * jarvis-back API 실패를 HTTP status와 함께 전달한다.
 */
export class JarvisApiError extends Error {
  readonly status: number
  readonly responseBody: unknown

  constructor(message: string, status: number, responseBody: unknown) {
    super(message)
    this.name = 'JarvisApiError'
    this.status = status
    this.responseBody = responseBody
  }
}

/**
 * 현재 프론트가 바라보는 backend base URL을 반환한다.
 */
export function getJarvisApiBaseUrl(): string {
  return API_BASE_URL
}

/**
 * 브라우저 저장소에 access token이 있는지 확인한다.
 */
export function hasStoredAccessToken(): boolean {
  return readStoredAccessToken() !== null
}

/**
 * 앱이 열린 동안 access token 만료 전에 인증 세션을 갱신한다.
 */
export function startAuthSessionRefreshLoop(): void {
  scheduleNextAuthRefresh()
}

/**
 * 앱 lifecycle이 끝날 때 예약된 인증 refresh timer를 정리한다.
 */
export function stopAuthSessionRefreshLoop(): void {
  clearScheduledAuthRefresh()
}

/**
 * 로그인 성공 시 access/refresh token을 저장하고 사용자 정보를 반환한다.
 */
export async function login(
  request: AuthLoginRequestDto,
): Promise<AuthLoginResponseDto> {
  const response = await fetchJson<AuthLoginResponseDto>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(request),
    skipAuth: true,
  })

  writeStoredAuthTokens(response)

  return response
}

/**
 * 저장된 access token을 이용해 현재 사용자 정보를 조회한다.
 * access token이 만료되었으면 refresh token으로 갱신한 뒤 재시도한다.
 */
export async function fetchCurrentUser(): Promise<AuthUserResponseDto> {
  return fetchJson<AuthUserResponseDto>('/api/v1/auth/me')
}

/**
 * 프론트 저장소의 인증 토큰을 제거한다.
 */
export function logout(): void {
  clearStoredAuthTokens()
}

/**
 * 현재 사용자의 active 채팅 세션 목록을 조회한다.
 */
export async function fetchChatSessions(): Promise<ChatSessionResponseDto[]> {
  return fetchJson<ChatSessionResponseDto[]>('/api/v1/chat-sessions')
}

/**
 * 현재 사용자에게 귀속되는 새 채팅 세션을 생성한다.
 */
export async function createChatSession(
  request: ChatSessionCreateRequestDto,
): Promise<ChatSessionResponseDto> {
  return fetchJson<ChatSessionResponseDto>('/api/v1/chat-sessions', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/**
 * 현재 사용자가 소유한 채팅 세션 제목 또는 archived 상태를 수정한다.
 */
export async function updateChatSession(
  sessionId: number,
  request: ChatSessionUpdateRequestDto,
): Promise<ChatSessionResponseDto> {
  return fetchJson<ChatSessionResponseDto>(`/api/v1/chat-sessions/${sessionId}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
}

/**
 * 현재 사용자가 소유한 채팅 세션과 세션 메시지를 삭제한다.
 */
export async function deleteChatSession(sessionId: number): Promise<void> {
  await fetchJson<void>(`/api/v1/chat-sessions/${sessionId}`, {
    method: 'DELETE',
  })
}

/**
 * 현재 사용자가 소유한 채팅 세션의 메시지 목록을 조회한다.
 */
export async function fetchChatSessionMessages(
  sessionId: number,
  query: ChatMessageListQueryDto = {},
): Promise<ChatMessageResponseDto[]> {
  const searchParams = createSearchParams({
    afterMessageId: query.afterMessageId,
    limit: query.limit,
  })

  return fetchJson<ChatMessageResponseDto[]>(
    `/api/v1/chat-sessions/${sessionId}/messages${searchParams}`,
  )
}

/**
 * 사용자 메시지를 일반 JSON chat endpoint로 전송한다.
 */
export async function sendChatMessage(
  request: ChatRequestDto,
): Promise<ChatResponseDto> {
  return fetchJson<ChatResponseDto>('/api/v1/chat', {
    method: 'POST',
    body: JSON.stringify(request),
    timeoutMillis: CHAT_REQUEST_TIMEOUT_MILLIS,
  })
}

/**
 * 현재 사용자의 pending 리마인더 목록을 조회한다.
 */
export async function fetchReminders(): Promise<ReminderResponseDto[]> {
  return fetchJson<ReminderResponseDto[]>('/api/v1/reminders')
}

/**
 * 현재 사용자에게 귀속되는 리마인더를 직접 생성한다.
 */
export async function createReminder(
  request: ReminderCreateRequestDto,
): Promise<ReminderResponseDto> {
  return fetchJson<ReminderResponseDto>('/api/v1/reminders', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/**
 * 현재 사용자가 소유한 리마인더를 취소한다.
 */
export async function cancelReminder(
  reminderId: number,
): Promise<ReminderResponseDto> {
  return fetchJson<ReminderResponseDto>(
    `/api/v1/reminders/${reminderId}/cancel`,
    {
      method: 'PATCH',
    },
  )
}

/**
 * 현재 사용자의 일정 목록을 조회한다.
 */
export async function fetchSchedules(
  query: ScheduleListQueryDto = {},
): Promise<ScheduleResponseDto[]> {
  const searchParams = createSearchParams({
    from: query.from,
    to: query.to,
  })

  return fetchJson<ScheduleResponseDto[]>(`/api/v1/schedules${searchParams}`)
}

/**
 * 현재 사용자에게 귀속되는 일정을 직접 생성한다.
 */
export async function createSchedule(
  request: ScheduleCreateRequestDto,
): Promise<ScheduleResponseDto> {
  return fetchJson<ScheduleResponseDto>('/api/v1/schedules', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/**
 * 현재 사용자가 소유한 일정을 수정한다.
 */
export async function updateSchedule(
  scheduleId: number,
  request: ScheduleUpdateRequestDto,
): Promise<ScheduleResponseDto> {
  return fetchJson<ScheduleResponseDto>(`/api/v1/schedules/${scheduleId}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
}

/**
 * 현재 사용자가 소유한 일정을 삭제한다.
 */
export async function deleteSchedule(scheduleId: number): Promise<void> {
  await fetchJson<void>(`/api/v1/schedules/${scheduleId}`, {
    method: 'DELETE',
  })
}

/**
 * 현재 사용자의 active memory 목록을 조회한다.
 */
export async function fetchMemories(): Promise<UserMemoryResponseDto[]> {
  return fetchJson<UserMemoryResponseDto[]>('/api/v1/memories')
}

/**
 * 현재 사용자에게 귀속되는 memory를 직접 생성한다.
 */
export async function createMemory(
  request: UserMemoryCreateRequestDto,
): Promise<UserMemoryResponseDto> {
  return fetchJson<UserMemoryResponseDto>('/api/v1/memories', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

/**
 * 현재 사용자가 소유한 active memory 내용을 수정한다.
 */
export async function updateMemory(
  memoryId: number,
  request: UserMemoryUpdateRequestDto,
): Promise<UserMemoryResponseDto> {
  return fetchJson<UserMemoryResponseDto>(`/api/v1/memories/${memoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(request),
  })
}

/**
 * 현재 사용자가 소유한 memory를 soft delete한다.
 */
export async function deleteMemory(memoryId: number): Promise<void> {
  await fetchJson<void>(`/api/v1/memories/${memoryId}`, {
    method: 'DELETE',
  })
}

/**
 * 현재 사용자의 assistant activity timeline을 조회한다.
 */
export async function fetchActivityEvents(
  query: ActivityEventListQueryDto = {},
): Promise<ActivityEventResponseDto[]> {
  const searchParams = createSearchParams({
    limit: query.limit,
  })

  return fetchJson<ActivityEventResponseDto[]>(
    `/api/v1/activity-events${searchParams}`,
  )
}

/**
 * Web Push 활성 여부와 VAPID public key를 조회하고, 서버 설정이 비어 있으면 프론트 fallback key를 사용한다.
 */
export async function fetchWebPushPublicKey(): Promise<WebPushPublicKeyResponseDto> {
  try {
    const response = await fetchJson<WebPushPublicKeyResponseDto>(
      '/api/v1/web-push/public-key',
      {
        skipAuth: true,
      },
    )

    if (response.enabled && response.publicKey) {
      return response
    }
  } catch {
    return createFallbackWebPushPublicKeyResponse()
  }

  return createFallbackWebPushPublicKeyResponse()
}

/**
 * 브라우저 PushSubscription 정보를 현재 사용자에게 저장한다.
 */
export async function saveWebPushSubscription(
  request: WebPushSubscriptionRequestDto,
): Promise<WebPushSubscriptionResponseDto> {
  return fetchJson<WebPushSubscriptionResponseDto>(
    '/api/v1/web-push/subscriptions',
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  )
}

type FetchJsonInit = RequestInit & {
  skipAuth?: boolean
  skipRefresh?: boolean
  timeoutMillis?: number
}

async function fetchJson<TResponse>(
  path: string,
  init: FetchJsonInit = {},
): Promise<TResponse> {
  let response = await fetchWithAuth(path, init)

  if (response.status === 401 && shouldRefreshAuthSession(init)) {
    await refreshStoredAuthSession()
    response = await fetchWithAuth(path, init)
  }

  if (!response.ok) {
    throw await createApiError(response)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}

async function fetchWithAuth(
  path: string,
  init: FetchJsonInit = {},
): Promise<Response> {
  const { skipAuth, timeoutMillis, ...requestInit } = init
  const headers = new Headers(requestInit.headers)

  headers.set('Accept', 'application/json')

  if (requestInit.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    await refreshAccessTokenIfNeeded()

    const accessToken = readStoredAccessToken()

    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }
  }

  const timeoutController =
    timeoutMillis !== undefined ? new AbortController() : null
  const timeoutId =
    timeoutController && timeoutMillis !== undefined && timeoutMillis > 0
      ? window.setTimeout(() => timeoutController.abort(), timeoutMillis)
      : undefined

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...requestInit,
      headers,
      signal: requestInit.signal ?? timeoutController?.signal,
    })
  } catch (error) {
    if (timeoutController?.signal.aborted && timeoutMillis !== undefined) {
      throw new Error(`API request timed out after ${timeoutMillis / 1000}s.`, {
        cause: error,
      })
    }

    throw error
  } finally {
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId)
    }
  }
}

function shouldRefreshAuthSession(init: FetchJsonInit): boolean {
  return !init.skipAuth && !init.skipRefresh && readStoredRefreshToken() !== null
}

async function refreshAccessTokenIfNeeded(): Promise<void> {
  if (!readStoredAccessToken() || !readStoredRefreshToken()) {
    return
  }

  const accessTokenExpiresAt = readStoredTimestamp(
    ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY,
  )

  if (accessTokenExpiresAt === null) {
    return
  }

  if (accessTokenExpiresAt - Date.now() > ACCESS_TOKEN_REFRESH_BUFFER_MILLIS) {
    return
  }

  await refreshStoredAuthSession()
}

async function refreshStoredAuthSession(): Promise<AuthLoginResponseDto> {
  const refreshToken = readStoredRefreshToken()

  if (!refreshToken) {
    throw new Error('저장된 refresh token이 없습니다.')
  }

  if (isStoredRefreshTokenExpired()) {
    clearStoredAuthTokens()
    throw new Error('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.')
  }

  if (!authRefreshPromise) {
    const request: AuthRefreshRequestDto = { refreshToken }

    authRefreshPromise = fetchJson<AuthLoginResponseDto>('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify(request),
      skipAuth: true,
      skipRefresh: true,
    })
      .then((response) => {
        writeStoredAuthTokens(response)

        return response
      })
      .catch((error: unknown) => {
        if (shouldClearStoredAuthAfterRefreshFailure(error)) {
          clearStoredAuthTokens()
        }

        throw error
      })
      .finally(() => {
        authRefreshPromise = null
      })
  }

  return authRefreshPromise
}

async function createApiError(response: Response): Promise<JarvisApiError> {
  let responseBody: unknown

  try {
    responseBody = await response.json()
  } catch {
    responseBody = null
  }

  const message = extractErrorMessage(responseBody, response.status)

  if (response.status === 401) {
    clearStoredAuthTokens()
  }

  return new JarvisApiError(message, response.status, responseBody)
}

function extractErrorMessage(responseBody: unknown, status: number): string {
  if (isChatResponseError(responseBody)) {
    return responseBody.message
  }

  if (
    responseBody !== null &&
    typeof responseBody === 'object' &&
    'message' in responseBody &&
    typeof responseBody.message === 'string'
  ) {
    return responseBody.message
  }

  return `API request failed with status ${status}.`
}

function isChatResponseError(value: unknown): value is ChatResponseErrorDto {
  return (
    value !== null &&
    typeof value === 'object' &&
    'message' in value &&
    'status' in value &&
    value.status === 'FAILED'
  )
}

function createSearchParams(
  values: Record<string, string | number | null | undefined>,
): string {
  const searchParams = new URLSearchParams()

  Object.entries(values).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      return
    }

    searchParams.set(key, String(value))
  })

  const queryString = searchParams.toString()

  return queryString.length > 0 ? `?${queryString}` : ''
}

function createFallbackWebPushPublicKeyResponse(): WebPushPublicKeyResponseDto {
  return {
    enabled: FALLBACK_WEB_PUSH_PUBLIC_KEY.length > 0,
    publicKey: FALLBACK_WEB_PUSH_PUBLIC_KEY || null,
  }
}

function readStoredAccessToken(): string | null {
  try {
    return window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function readStoredRefreshToken(): string | null {
  try {
    return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function readStoredTimestamp(key: string): number | null {
  try {
    const value = window.localStorage.getItem(key)

    if (!value) {
      return null
    }

    const timestamp = Number(value)

    return Number.isFinite(timestamp) ? timestamp : null
  } catch {
    return null
  }
}

function writeStoredAuthTokens(response: AuthLoginResponseDto): void {
  const now = Date.now()

  window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, response.accessToken)
  window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, response.refreshToken)
  window.localStorage.setItem(
    ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY,
    String(now + response.expiresIn * 1000),
  )
  window.localStorage.setItem(
    REFRESH_TOKEN_EXPIRES_AT_STORAGE_KEY,
    String(now + response.refreshExpiresIn * 1000),
  )

  scheduleNextAuthRefresh()
}

function isStoredRefreshTokenExpired(): boolean {
  const refreshTokenExpiresAt = readStoredTimestamp(
    REFRESH_TOKEN_EXPIRES_AT_STORAGE_KEY,
  )

  return refreshTokenExpiresAt !== null && refreshTokenExpiresAt <= Date.now()
}

function shouldClearStoredAuthAfterRefreshFailure(error: unknown): boolean {
  return (
    error instanceof JarvisApiError &&
    (error.status === 400 || error.status === 401 || error.status === 404)
  )
}

function scheduleNextAuthRefresh(): void {
  clearScheduledAuthRefresh()

  if (!readStoredAccessToken() || !readStoredRefreshToken()) {
    return
  }

  if (isStoredRefreshTokenExpired()) {
    clearStoredAuthTokens()
    return
  }

  const accessTokenExpiresAt = readStoredTimestamp(
    ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY,
  )

  if (accessTokenExpiresAt === null) {
    return
  }

  const refreshDelayMillis = Math.max(
    accessTokenExpiresAt - Date.now() - ACCESS_TOKEN_REFRESH_BUFFER_MILLIS,
    0,
  )

  authRefreshTimerId = window.setTimeout(
    refreshStoredAuthSessionInBackground,
    refreshDelayMillis,
  )
}

function scheduleAuthRefreshRetry(): void {
  clearScheduledAuthRefresh()

  if (!readStoredRefreshToken() || isStoredRefreshTokenExpired()) {
    return
  }

  authRefreshTimerId = window.setTimeout(
    refreshStoredAuthSessionInBackground,
    FAILED_AUTH_REFRESH_RETRY_DELAY_MILLIS,
  )
}

function refreshStoredAuthSessionInBackground(): void {
  void refreshStoredAuthSession().catch((error: unknown) => {
    if (!shouldClearStoredAuthAfterRefreshFailure(error)) {
      scheduleAuthRefreshRetry()
    }
  })
}

function clearScheduledAuthRefresh(): void {
  if (authRefreshTimerId === undefined) {
    return
  }

  window.clearTimeout(authRefreshTimerId)
  authRefreshTimerId = undefined
}

function clearStoredAuthTokens(): void {
  try {
    clearScheduledAuthRefresh()
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
    window.localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT_STORAGE_KEY)
    window.localStorage.removeItem(REFRESH_TOKEN_EXPIRES_AT_STORAGE_KEY)
  } catch {
    return
  }
}

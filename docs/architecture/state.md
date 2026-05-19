# 상태 문서 - jarvis-front

중요한 상태 모델과 상태 전이를 이 문서에 기록한다.

## 상태 종류
| State | Owner | Source of Truth | Persisted | Notes |
| --- | --- | --- | --- | --- |
| `accessToken` | `jarvisApiService` | `POST /api/v1/auth/login` 또는 `POST /api/v1/auth/refresh` response | Yes, localStorage | 보호 API Authorization header에 사용 |
| `refreshToken` | `jarvisApiService` | `POST /api/v1/auth/login` 또는 `POST /api/v1/auth/refresh` response | Yes, localStorage | access token 갱신 request body에 사용 |
| `accessTokenExpiresAt` | `jarvisApiService` | token response `expiresIn` 계산값 | Yes, localStorage | 만료 60초 전 선제 refresh 판단에 사용 |
| `refreshTokenExpiresAt` | `jarvisApiService` | token response `refreshExpiresIn` 계산값 | Yes, localStorage | refresh token 로컬 만료 판단에 사용 |
| `authRefreshTimer` | `jarvisApiService` | access token expiry metadata | No | 앱이 열린 동안 access token 만료 60초 전 refresh 예약 |
| `user` | `useChatPage` | `GET /api/v1/auth/me` | No | 로그인 여부 판단 |
| `loginForm` | `useChatPage` | LoginView input | No | email, password, error, submitting |
| `activeView` | `useChatPage` | sidebar navigation event | No | `chat`, `reminders`, `schedules`, `memories`, `activity`, `settings` |
| `sessions` | `useChatPage` | `GET /api/v1/chat-sessions` | No | active 세션 목록 ViewModel |
| `activeSessionId` | `useChatPage` | session selection or chat response | No | 메시지 조회와 chat request에 사용 |
| `sessionTitleDraft` | `useChatPage` | ChatHeader input | No | active session PATCH form |
| `messages` | `useChatPage` | `GET /api/v1/chat-sessions/{id}/messages`, chat response | No | optimistic user/pending assistant message 포함 가능 |
| `composerText` | `useChatPage` | ChatComposer input | No | 전송 전 사용자 메시지 |
| `classifications` | `useChatPage` | `POST /api/v1/chat` response | No | 최근 작업 분류 요약 |
| `reminders` | `useChatPage` | `GET /api/v1/reminders` | No | pending 리마인더 목록 |
| `reminderForm` | `useChatPage` | ReminderReviewView input | No | content, remindAt |
| `schedules` | `useChatPage` | `GET /api/v1/schedules` | No | 일정 목록 |
| `scheduleFilters` | `useChatPage` | ScheduleReviewView input | No | from, to query params |
| `scheduleForm` | `useChatPage` | ScheduleReviewView input/edit action | No | create/update form |
| `memories` | `useChatPage` | `GET /api/v1/memories` | No | active memory 목록 |
| `memoryForm` | `useChatPage` | MemoryReviewView input/edit action | No | create/update form |
| `activityEvents` | `useChatPage` | `GET /api/v1/activity-events` | No | timeline ViewModel |
| `webPush` | `useChatPage` | public key API, browser permission, subscription result | No | Settings view 표시 상태 |
| `systemStatus` | `useChatPage` | service request result | No | backend health 표시 |
| `isBootstrapping` | `useChatPage` | initial auth restore lifecycle | No | 초기 화면 gating |
| `isWorkspaceLoading` | `useChatPage` | workspace/session load lifecycle | No | 메시지 영역 loading 표시 |
| `isSubmitting` | `useChatPage` | chat request lifecycle | No | composer disabled |
| `isResourceSubmitting` | `useChatPage` | resource mutation/load lifecycle | No | resource form/button disabled |

## Enum 값
| Enum | Value | Meaning | Terminal | Notes |
| --- | --- | --- | --- | --- |
| `ChatWorkspaceView` | `chat` | 채팅 메시지와 세션 관리 | No | 기본 view |
| `ChatWorkspaceView` | `reminders` | 리마인더 생성/취소 | No | authenticated |
| `ChatWorkspaceView` | `schedules` | 일정 조회/생성/수정/삭제 | No | authenticated |
| `ChatWorkspaceView` | `memories` | 메모리 조회/생성/수정/삭제 | No | authenticated |
| `ChatWorkspaceView` | `activity` | activity timeline 조회 | No | authenticated |
| `ChatWorkspaceView` | `settings` | runtime/Web Push 설정 | No | 일부 public API 포함 |
| `ChatTaskType` | `CHAT` | 일반 대화 | No | backend task type |
| `ChatTaskType` | `REMINDER` | 리마인더 작업 | No | backend task type |
| `ChatTaskType` | `SCHEDULE` | 일정 작업 | No | backend task type |
| `ChatTaskType` | `MEMORY` | 메모리 작업 | No | backend task type |
| `ChatTaskType` | `UNKNOWN` | 프론트 실패 정규화 | Yes | API enum은 아니며 UI fallback |
| `ChatStatus` | `SUCCESS` | 요청 처리 성공 | Yes | response status |
| `ChatStatus` | `FAILED` | 요청 처리 실패 | Yes | response status |
| `ChatStatus` | `NEED_CONFIRMATION` | 추가 정보 필요 | No | 후속 입력 가능 |
| `ChatStatus` | `NOT_IMPLEMENTED` | backend 미구현 작업 | Yes | 응답 메시지 표시 |
| `ChatMessageStatus` | `STREAMING` | backend 저장 메시지가 전송 중임을 나타낼 수 있음 | No | 프론트는 이 상태를 직접 생성하지 않음 |
| `ChatMessageStatus` | `COMPLETED` | 메시지 처리 완료 | Yes | 저장 완료 |
| `ChatMessageStatus` | `FAILED` | 메시지 처리 실패 | Yes | 실패 상태 |
| `ReminderStatus` | `PENDING` | 발송 대기 | No | cancel 가능 |
| `ReminderStatus` | `SENT` | 발송 완료 | Yes | 현재 pending 조회에는 일반적으로 없음 |
| `ReminderStatus` | `CANCELLED` | 취소됨 | Yes | cancel 결과 |
| `ReminderStatus` | `FAILED` | 발송 실패 | Yes | 실패 상태 |
| `SystemHealthLabel` | `OFFLINE` | 아직 연결 전 | No | 초기 상태 |
| `SystemHealthLabel` | `ONLINE` | 최근 API 성공 | No | 정상 상태 |
| `SystemHealthLabel` | `FAILED` | 최근 API 실패 | No | 오류 표시 |

## 상태 전이 규칙
| From | To | Trigger | Validator | Side Effects |
| --- | --- | --- | --- | --- |
| no token | login form | app bootstrap | token 없음 | 없음 |
| stored token | authenticated workspace | `GET /auth/me` 성공 | token 유효 | workspace 초기 API 조회 |
| stored token | scheduled refresh pending | app bootstrap 또는 token 저장 | accessTokenExpiresAt 존재 | 만료 60초 전 refresh timer 예약 |
| stored access token near expiry | refreshed stored token | protected API 호출 전 | refreshToken 존재 및 미만료 | `POST /auth/refresh`, 새 access/refresh token 저장 |
| scheduled refresh pending | refreshed stored token | refresh timer 실행 | refreshToken 존재 및 미만료 | `POST /auth/refresh`, 새 access/refresh token 저장, 다음 timer 예약 |
| refresh timer failed | refresh retry scheduled | 일시적 refresh 실패 | 400/401/404가 아닌 오류 | 30초 뒤 background refresh 재시도 |
| protected API 401 | refreshed stored token | API 401 응답 | refreshToken 존재 및 미만료 | `POST /auth/refresh`, 원 요청 1회 재시도 |
| stored token | login form with error | `GET /auth/me` 실패 | 401 또는 API 실패 | token 제거 |
| stored refresh token | login form with error | refresh 실패 또는 refresh token 만료 | 400/401/404 또는 로컬 만료 시각 초과 | access/refresh token 제거 |
| login form | authenticated workspace | `POST /auth/login` 성공 | email/password non-empty | token 저장, workspace 초기 API 조회 |
| authenticated workspace | login form | 로그아웃 클릭 | 없음 | token과 refresh timer 제거, React state 초기화 |
| `activeView` any | selected view | sidebar click | 없음 | 중앙 작업 영역 교체 |
| `activeSessionId` empty | new backend session id | chat response | backend가 sessionId 반환 | sessions/messages reload |
| messages ready | optimistic user + pending assistant | chat submit or Enter key | message trim non-empty | `POST /api/v1/chat` 호출 |
| pending assistant | completed assistant | JSON response | pending id 일치 | classification 갱신, workspace reload |
| pending assistant | failed assistant | chat error | pending id 일치 | systemStatus FAILED |
| session title draft | persisted title | title save | activeSessionId 존재 | `PATCH /chat-sessions/{id}` |
| active session | deleted session removed | delete click | sessionId 존재 | `DELETE /chat-sessions/{id}`, sessions/messages reload |
| reminder form | reminder list updated | create reminder | content/remindAt non-empty | `POST /reminders`, reminders/activity reload |
| pending reminder | reminder list updated | cancel reminder | status PENDING | `PATCH /reminders/{id}/cancel`, reminders reload |
| schedule form | schedules updated | save schedule | title/startAt non-empty | POST or PATCH schedule, schedules reload |
| schedules | schedules updated | delete schedule | scheduleId 존재 | `DELETE /schedules/{id}`, schedules reload |
| memory form | memories updated | save memory | content non-empty | POST or PATCH memory, memories reload |
| memories | memories updated | delete memory | memoryId 존재 | `DELETE /memories/{id}`, memories reload |
| Web Push unregistered | registered | register click | enabled/publicKey or fallback/browser support/permission granted | service worker 등록, 필요 시 기존 PushSubscription 해제, PushSubscription 생성, backend 저장 |

## 인증 상태
- access token은 `jarvis.accessToken` key로 `localStorage`에 저장한다.
- refresh token은 `jarvis.refreshToken` key로 `localStorage`에 저장한다.
- access token 만료 시각은 `jarvis.accessTokenExpiresAt` key로 millisecond timestamp를 저장한다.
- refresh token 만료 시각은 `jarvis.refreshTokenExpiresAt` key로 millisecond timestamp를 저장한다.
- refresh token은 `Authorization` header로 보내지 않고 `POST /api/v1/auth/refresh` request body로만 보낸다.
- 앱 bootstrap과 token 저장 시 service가 access token 만료 60초 전 refresh timer를 예약한다.
- access token 만료 시각이 60초 이내이면 service가 보호 API 호출 전에 선제 refresh한다.
- 보호 API가 401을 반환하면 service가 refresh token으로 인증 세션을 갱신한 뒤 원 요청을 1회 재시도한다.
- background refresh가 일시 오류로 실패하면 30초 뒤 재시도하고, 400/401/404는 인증 실패로 보고 token을 제거한다.
- role/admin 권한 상태는 없다.
- 모든 보호 API는 backend의 사용자 소유권 검사를 신뢰한다.

# 흐름 문서 - jarvis-front

주요 기능 흐름을 단계별로 기록한다.

## Authentication Bootstrap
- Actor: 사용자
- Entry point: `jarvis-frontend/src/pages/ChatPage.tsx`
- Preconditions: React 앱이 로드되어 있다.
- Steps:
  1. `ChatPage`가 `useChatPage`를 호출한다.
  2. hook이 `localStorage`에 access token이 있는지 확인한다.
  3. token이 없으면 `LoginView`를 렌더링한다.
  4. token이 있으면 service가 refresh timer를 시작하고, 필요 시 `POST /api/v1/auth/refresh`로 access token을 갱신한 뒤 `GET /api/v1/auth/me`를 호출한다.
  5. 사용자 조회에 성공하면 hook이 chat sessions, reminders, schedules, memories, activity, Web Push public key를 병렬 조회한다.
  6. 조회된 DTO를 ViewModel로 변환해 인증 워크스페이스를 렌더링한다.
- Validation: token 없음은 로그인 필요 상태로 처리한다.
- Empty state: 세션이 없으면 초기 assistant 안내 메시지를 표시한다.
- Error state: refresh 실패, `auth/me` 실패, 또는 초기 조회 실패 시 token을 제거하고 실패 메시지를 로그인 화면에 표시한다.
- Permission behavior: backend 401은 refresh token이 있으면 1회 refresh 후 재시도하고, 재시도 실패 시 unauthenticated로 취급한다.
- Retry or recovery: 사용자가 다시 로그인한다.
- Side effects: access/refresh token과 만료 시각을 `localStorage`에서 읽거나 갱신하거나 제거한다.
- Related API: `POST /api/v1/auth/refresh`, `GET /api/v1/auth/me`, workspace 초기 조회 API 전체
- Related DB tables: 없음.

## Login
- Actor: 사용자
- Entry point: `LoginView`
- Preconditions: 사용자가 email/password를 알고 있다.
- Steps:
  1. 사용자가 email과 password를 입력한다.
  2. `LoginView`가 submit intent를 hook에 전달한다.
  3. hook이 빈 입력을 검증한다.
  4. service가 `POST /api/v1/auth/login`을 호출한다.
  5. service가 access token, refresh token, 각 만료 시각을 `localStorage`에 저장한다.
  6. hook이 `GET /api/v1/auth/me` 및 workspace 초기 조회를 실행한다.
- Validation: email/password trim 결과가 비어 있으면 API를 호출하지 않는다.
- Empty state: 없음.
- Error state: 400/401/500 실패 메시지를 login form error로 표시한다.
- Permission behavior: login은 public이다.
- Retry or recovery: 사용자가 값을 수정하고 다시 제출한다.
- Side effects: access/refresh token과 만료 시각 저장.
- Related API: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- Related DB tables: 없음.

## Token Refresh
- Actor: `jarvisApiService`
- Entry point: 앱 bootstrap refresh timer, 모든 authenticated service 함수
- Preconditions: access token과 refresh token이 `localStorage`에 저장되어 있다.
- Steps:
  1. bootstrap 또는 token 저장 시 service가 access token 만료 60초 전 refresh timer를 예약한다.
  2. timer가 실행되면 `POST /api/v1/auth/refresh`를 호출한다.
  3. 보호 API 호출 전에도 service가 access token 만료 시각을 확인한다.
  4. 만료 시각이 60초 이내이면 `POST /api/v1/auth/refresh`를 호출한다.
  5. refresh 성공 시 새 access token, refresh token, 각 만료 시각을 저장하고 다음 timer를 예약한다.
  6. 선제 refresh 없이 보호 API가 401을 반환하면 service가 refresh를 수행한 뒤 원 요청을 1회 재시도한다.
  7. 여러 보호 API가 동시에 refresh를 요구하면 service가 하나의 refresh 요청을 공유한다.
- Validation: refresh token이 없거나 로컬 refresh 만료 시각이 지났으면 refresh를 시도하지 않는다.
- Empty state: 없음.
- Error state: refresh token 만료, 400/401/404 refresh 실패, 또는 재시도 후 401이면 저장된 token과 timer를 제거한다. 네트워크성 refresh 실패는 30초 후 재시도한다.
- Permission behavior: refresh endpoint는 public이며 refresh token은 request body로만 전송한다.
- Retry or recovery: 사용자가 다시 로그인한다.
- Side effects: `localStorage`의 인증 token과 만료 시각 갱신 또는 제거.
- Related API: `POST /api/v1/auth/refresh`
- Related DB tables: 없음.

## Chat Session And Message Flow
- Actor: 사용자
- Entry point: `ChatComposer`, `Sidebar`, `ChatHeader`
- Preconditions: 사용자가 로그인되어 있다.
- Steps:
  1. hook이 `GET /api/v1/chat-sessions`로 세션 목록을 조회한다.
  2. 사용자가 세션을 선택하면 hook이 `GET /api/v1/chat-sessions/{id}/messages`를 호출한다.
  3. 사용자가 ChatComposer segmented control에서 `auto` 또는 직접 task 실행 방식을 선택한다.
  4. 사용자가 메시지를 제출하면 hook이 사용자 optimistic message와 pending assistant message를 추가한다.
  5. 사용자가 textarea에서 Enter를 누르면 hook submit intent가 실행되고, Shift+Enter는 줄바꿈으로 처리한다.
  6. 실행 방식이 `auto`이면 service가 `POST /api/v1/chat`을 호출하고 응답을 assistant message로 변환한다.
  7. 실행 방식이 `stream`이면 service가 `POST /api/v1/chat/stream`을 호출하고 SSE `message` chunk를 hook callback으로 전달한다.
  8. hook은 stream chunk를 pending assistant message에 누적하고, `complete` event 후 completed assistant message를 표시한다.
  9. 실행 방식이 직접 task이면 service가 선택된 `/api/v1/task-executions/*` endpoint를 호출하고 응답을 임시 assistant message로 변환한다.
  10. `POST /api/v1/chat` 또는 `POST /api/v1/chat/stream` 응답에 새 `sessionId`가 있으면 hook이 active session을 갱신하고 workspace를 다시 조회한다.
  11. 직접 task 응답은 chat session/message를 backend에 저장하지 않으므로 hook이 리마인더, 일정, 메모리, activity 목록만 다시 조회하고 현재 화면 메시지는 유지한다.
  12. 사용자가 세션 제목을 저장하면 `PATCH /api/v1/chat-sessions/{id}`를 호출한다.
  13. 사용자가 세션 삭제를 선택하면 `DELETE /api/v1/chat-sessions/{id}`를 호출한다.
- Validation: 메시지 trim 결과가 비어 있으면 API를 호출하지 않는다. Enter는 전송, Shift+Enter는 줄바꿈이다.
- Empty state: 세션 또는 메시지가 없으면 안내 assistant message를 표시한다.
- Error state: chat 실패 시 pending assistant message를 실패 메시지로 교체하고 system status를 `FAILED`로 표시한다.
- Timeout behavior: `POST /api/v1/chat`은 프론트 service 경계에서 120초를 초과하면 timeout 실패로 처리한다.
- Permission behavior: 모든 chat/session/task execution API는 authenticated이다.
- Retry or recovery: 메시지를 다시 보내거나 세션을 다시 선택한다.
- Side effects: React state의 optimistic/streaming message, backend chat session/message 저장 또는 삭제, 직접 task 실행 시 관련 리소스 row 생성 또는 조회.
- Related API: chat session endpoints, `POST /api/v1/chat`, `POST /api/v1/chat/stream`, `POST /api/v1/task-executions/*`
- Related DB tables: 없음.

## Reminder Management
- Actor: 사용자
- Entry point: `ReminderReviewView`
- Preconditions: 사용자가 로그인되어 있다.
- Steps:
  1. 초기 workspace load에서 `GET /api/v1/reminders`로 pending 리마인더를 조회한다.
  2. 사용자가 `+ 리마인더`를 누르면 hook이 `reminderEditorMode=create`로 전환하고 빈 form을 표시한다.
  3. 사용자가 content와 remindAt을 입력하고 생성한다.
  4. hook이 빈 입력을 검증한 뒤 service가 `POST /api/v1/reminders`를 호출한다.
  5. 생성 후 hook이 reminders와 activity events를 다시 조회하고 editor를 닫는다.
  6. 사용자가 editor 닫기 또는 취소를 누르면 hook이 form을 초기화하고 `reminderEditorMode=closed`로 돌아간다.
  7. 사용자가 취소를 누르면 service가 `PATCH /api/v1/reminders/{id}/cancel`을 호출한다.
  8. 사용자가 리스트/캘린더 표시 방식을 전환하면 hook이 `reminderViewMode`만 변경한다.
  9. 캘린더에서 이전/오늘/다음을 누르면 hook이 `reminderCalendarMonth`를 변경하고 기존 reminders ViewModel을 월간 달력 ViewModel로 다시 계산한다.
- Validation: content와 remindAt이 비어 있으면 API를 호출하지 않는다.
- Empty state: pending 리마인더가 없으면 리스트 빈 상태 문구를 표시하고, 캘린더 월에 항목이 없으면 캘린더 빈 상태 문구를 표시한다.
- Error state: 실패 시 system status를 `FAILED`로 표시한다.
- Permission behavior: reminder API는 authenticated이다.
- Retry or recovery: 사용자가 다시 생성/취소한다.
- Side effects: backend reminder 생성 또는 취소. editor 열기/닫기, 리스트/캘린더 전환, 캘린더 월 이동은 API 호출 없이 React state만 변경한다.
- Related API: `GET /api/v1/reminders`, `POST /api/v1/reminders`, `PATCH /api/v1/reminders/{id}/cancel`
- Related DB tables: 없음.

## Schedule Management
- Actor: 사용자
- Entry point: `ScheduleReviewView`
- Preconditions: 사용자가 로그인되어 있다.
- Steps:
  1. 초기 workspace load에서 `GET /api/v1/schedules`를 호출한다.
  2. 사용자가 from/to 필터를 입력하고 조회하면 query params와 함께 다시 조회한다.
  3. 사용자가 `+ 일정`을 누르면 hook이 `scheduleEditorMode=create`로 전환하고 빈 form을 표시한다.
  4. 사용자가 제목과 시작 시각을 입력하고 저장하면 `POST /api/v1/schedules`를 호출한다.
  5. 기존 일정의 수정을 누르면 hook이 `scheduleEditorMode=edit`로 전환하고 기존 값을 form에 복사한다.
  6. 수정 editor에서 저장하면 `PATCH /api/v1/schedules/{id}`를 호출한다.
  7. 저장 후 hook이 schedules를 다시 조회하고 editor를 닫는다.
  8. 사용자가 editor 닫기 또는 취소를 누르면 hook이 form을 초기화하고 `scheduleEditorMode=closed`로 돌아간다.
  9. 삭제를 누르면 `DELETE /api/v1/schedules/{id}`를 호출한다.
  10. 사용자가 리스트/캘린더 표시 방식을 전환하면 hook이 `scheduleViewMode`만 변경한다.
  11. 캘린더에서 이전/오늘/다음을 누르면 hook이 `scheduleCalendarMonth`를 변경하고 기존 schedules ViewModel을 월간 달력 ViewModel로 다시 계산한다.
- Validation: title과 startAt이 비어 있으면 저장 API를 호출하지 않는다.
- Empty state: 조회된 일정이 없으면 리스트 빈 상태 문구를 표시하고, 캘린더 월에 항목이 없으면 캘린더 빈 상태 문구를 표시한다.
- Error state: 실패 시 system status를 `FAILED`로 표시한다.
- Permission behavior: schedule API는 authenticated이다.
- Retry or recovery: 사용자가 form 값을 수정하고 다시 저장하거나 조회한다.
- Side effects: backend schedule 생성/수정/삭제. editor 열기/닫기, 리스트/캘린더 전환, 캘린더 월 이동은 API 호출 없이 React state만 변경한다.
- Related API: schedule endpoints
- Related DB tables: 없음.

## Memory Management
- Actor: 사용자
- Entry point: `MemoryReviewView`
- Preconditions: 사용자가 로그인되어 있다.
- Steps:
  1. 초기 workspace load에서 `GET /api/v1/memories`를 호출한다.
  2. 사용자가 `+ 메모리`를 누르면 hook이 `memoryEditorMode=create`로 전환하고 빈 form을 표시한다.
  3. 사용자가 내용을 입력하고 저장하면 `POST /api/v1/memories`를 호출한다.
  4. 기존 memory의 수정을 누르면 hook이 `memoryEditorMode=edit`로 전환하고 기존 값을 form에 복사한다.
  5. 수정 editor에서 저장하면 `PATCH /api/v1/memories/{id}`를 호출한다.
  6. 저장 후 hook이 memories를 다시 조회하고 editor를 닫는다.
  7. 사용자가 editor 닫기 또는 취소를 누르면 hook이 form을 초기화하고 `memoryEditorMode=closed`로 돌아간다.
  8. 삭제를 누르면 `DELETE /api/v1/memories/{id}`를 호출한다.
- Validation: content trim 결과가 비어 있으면 API를 호출하지 않는다.
- Empty state: memory가 없으면 빈 상태 문구를 표시한다.
- Error state: 실패 시 system status를 `FAILED`로 표시한다.
- Permission behavior: memory API는 authenticated이다.
- Retry or recovery: 사용자가 다시 저장한다.
- Side effects: backend memory 생성/수정/soft delete. editor 열기/닫기는 API 호출 없이 React state만 변경한다.
- Related API: memory endpoints
- Related DB tables: 없음.

## Activity Timeline
- Actor: 사용자
- Entry point: `ActivityTimelineView`
- Preconditions: 사용자가 로그인되어 있다.
- Steps:
  1. 초기 workspace load에서 `GET /api/v1/activity-events?limit=50`을 호출한다.
  2. 사용자가 새로고침을 누르면 같은 API를 다시 호출한다.
  3. hook이 DTO를 timeline ViewModel로 변환한다.
- Validation: limit은 현재 프론트에서 50으로 고정한다.
- Empty state: activity가 없으면 빈 상태 문구를 표시한다.
- Error state: 실패 시 system status를 `FAILED`로 표시한다.
- Permission behavior: activity API는 authenticated이다.
- Retry or recovery: 새로고침 버튼을 다시 누른다.
- Side effects: 없음.
- Related API: `GET /api/v1/activity-events`
- Related DB tables: 없음.

## Web Push Registration
- Actor: 사용자
- Entry point: `SettingsView`
- Preconditions: 사용자가 로그인되어 있고 backend Web Push가 enabled이며 public key가 존재한다.
- Steps:
  1. 초기 workspace load에서 `GET /api/v1/web-push/public-key`를 호출한다.
  2. public-key API가 실패하거나 비활성 응답이면 프론트 내장 fallback VAPID public key를 사용한다.
  3. 사용자가 브라우저 등록을 누르면 hook이 browser notification permission을 확인한다.
  4. permission이 default이면 `Notification.requestPermission()`을 호출한다.
  5. hook이 `/web-push-sw.js` service worker를 등록한다.
  6. 기존 PushSubscription의 application server key가 현재 key와 다르면 기존 구독을 해제한다.
  7. hook이 `PushManager.subscribe`로 subscription을 얻는다.
  8. service가 `POST /api/v1/web-push/subscriptions`로 endpoint, p256dh, auth를 저장한다.
- Validation: public key 없음, browser API 미지원, permission 거부 시 저장 API를 호출하지 않는다.
- Empty state: public-key API와 fallback key가 모두 없으면 등록 버튼을 비활성화한다.
- Error state: 등록 실패 메시지를 Settings view에 표시하고 system status를 `FAILED`로 표시한다.
- Permission behavior: public key 조회는 public, subscription 저장은 authenticated이다.
- Retry or recovery: 브라우저 권한과 server 설정을 수정한 뒤 다시 등록한다.
- Side effects: service worker 등록, browser PushSubscription 생성, backend subscription 저장.
- Related API: `GET /api/v1/web-push/public-key`, `POST /api/v1/web-push/subscriptions`
- Related DB tables: 없음.

# API 명세 - jarvis-front

이 문서는 프론트엔드가 소비하는 `jarvis-back` API 계약을 기록한다. Backend host는 `jarvis-frontend/.env`의 `VITE_JARVIS_API_BASE_URL`로 관리하며 기본 로컬 값은 `http://localhost:8011`이다. 보호 API에는 `Authorization: Bearer {accessToken}` header를 보낸다.

## 공통 인증
- `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/web-push/public-key`는 public이다.
- 그 외 endpoint는 authenticated이다.
- 인증 실패는 HTTP 401과 `ChatResponseDTO(status=FAILED)` 형태로 반환될 수 있다.
- 프론트엔드는 access token 만료 시 저장된 refresh token으로 `POST /api/v1/auth/refresh`를 호출하고 원 요청을 1회 재시도한다.
- refresh token은 `Authorization` header에 넣지 않으며, request body로만 전송한다.
- refresh 실패 또는 재시도 후 401 응답을 받으면 저장된 access/refresh token을 제거한다.
- Web Push public key API가 비활성 또는 실패 상태면 프론트는 내장 fallback VAPID public key를 사용해 브라우저 구독을 생성한다.

## 공통 Enum

| Enum | Values |
| --- | --- |
| `TaskType` | `CHAT`, `REMINDER`, `SCHEDULE`, `MEMORY` |
| `ChatStatus` | `SUCCESS`, `FAILED`, `NEED_CONFIRMATION`, `NOT_IMPLEMENTED` |
| `ChatRole` | `USER`, `ASSISTANT`, `SYSTEM` |
| `ChatMessageStatus` | `STREAMING`, `COMPLETED`, `FAILED` |
| `ReminderStatus` | `PENDING`, `SENT`, `CANCELLED`, `FAILED` |
| `ActivityEventType` | `CHAT_SESSION_CREATED`, `CHAT_MESSAGE_CREATED`, `REMINDER_CREATED`, `REMINDER_SENT`, `SCHEDULE_CREATED`, `MEMORY_STORED` |

## 공통 DTO

### `ChatResponseDTO`
| Field | Type | Required | Nullable | Meaning | Enum values |
| --- | --- | --- | --- | --- | --- |
| `sessionId` | number | no | yes | 처리된 채팅 세션 id | n/a |
| `messageId` | number | no | yes | 저장된 assistant 메시지 id | n/a |
| `message` | string | yes | no | 사용자에게 보여줄 처리 결과 메시지 | n/a |
| `taskType` | string | yes | no | 작업 분류 결과 | `TaskType` |
| `status` | string | yes | no | 처리 결과 상태 | `ChatStatus` |
| `data` | object | no | yes | 작업별 상세 데이터 | reminder, schedule, memory 또는 null |
| `createdAt` | string, LocalDateTime | yes | no | 응답 생성 시각 | n/a |

### `ChatSessionResponseDTO`
| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | 세션 식별자 |
| `title` | string | no | yes | 세션 제목 |
| `archived` | boolean | yes | no | 보관 여부 |
| `lastMessageAt` | string, LocalDateTime | no | yes | 마지막 메시지 활동 시각 |
| `createdAt` | string, LocalDateTime | yes | no | 세션 생성 시각 |
| `updatedAt` | string, LocalDateTime | yes | no | 세션 수정 시각 |

### `ChatMessageResponseDTO`
| Field | Type | Required | Nullable | Meaning | Enum values |
| --- | --- | --- | --- | --- | --- |
| `id` | number | yes | no | 메시지 식별자 | n/a |
| `sessionId` | number | yes | no | 소속 세션 식별자 | n/a |
| `role` | string | yes | no | 메시지 역할 | `ChatRole` |
| `content` | string | yes | no | 메시지 내용 | n/a |
| `taskType` | string | no | yes | assistant 메시지의 task type | `TaskType` |
| `status` | string | yes | no | 메시지 처리 상태 | `ChatMessageStatus` |
| `metadataJson` | string | no | yes | task metadata JSON 문자열 | n/a |
| `createdAt` | string, LocalDateTime | yes | no | 메시지 생성 시각 | n/a |

### `ReminderResponseDTO`
| Field | Type | Required | Nullable | Meaning | Enum values |
| --- | --- | --- | --- | --- | --- |
| `id` | number | yes | no | 리마인더 식별자 | n/a |
| `content` | string | yes | no | 알림 내용 | n/a |
| `remindAt` | string, LocalDateTime | yes | no | 알림 예정 시각 | n/a |
| `status` | string | yes | no | 리마인더 상태 | `ReminderStatus` |
| `createdAt` | string, LocalDateTime | yes | no | row 최초 생성 시각 | n/a |
| `completedAt` | string, LocalDateTime | no | yes | 발송/취소/실패 완료 시각 | n/a |

### `ScheduleResponseDTO`
| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | 일정 식별자 |
| `title` | string | yes | no | 일정 제목 |
| `startAt` | string, LocalDateTime | yes | no | 일정 시작 시각 |
| `endAt` | string, LocalDateTime | no | yes | 일정 종료 시각 |
| `createdAt` | string, LocalDateTime | yes | no | row 최초 생성 시각 |

### `UserMemoryResponseDTO`
| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | memory 식별자 |
| `content` | string | yes | no | 기억 내용 |
| `active` | boolean | yes | no | prompt와 목록에 포함되는지 여부 |
| `createdAt` | string, LocalDateTime | yes | no | row 최초 생성 시각 |
| `updatedAt` | string, LocalDateTime | yes | no | row 마지막 수정 시각 |

### `ActivityEventResponseDTO`
| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | activity event 식별자 |
| `type` | string | yes | no | `ActivityEventType` |
| `title` | string | yes | no | timeline 제목 |
| `description` | string | no | yes | 상세 설명 |
| `relatedEntityType` | string | no | yes | 관련 entity 종류 |
| `relatedEntityId` | number | no | yes | 관련 entity id |
| `metadataJson` | string | no | yes | 추가 metadata JSON 문자열 |
| `createdAt` | string, LocalDateTime | yes | no | event 생성 시각 |

## Endpoint 상세

### POST `/api/v1/auth/login`
- 설명: 환경변수로 부트스트랩된 개인 계정으로 로그인하고 JWT access token을 발급한다.
- 인증: public
- Request body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `email` | string | yes | no | 로그인 email |
| `password` | string | yes | no | 로그인 비밀번호 원문 |

- Response body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `accessToken` | string | yes | no | Bearer token 값 |
| `tokenType` | string | yes | no | 항상 `Bearer` |
| `expiresIn` | number | yes | no | token 만료까지 초 단위 |
| `refreshToken` | string | yes | no | access token 갱신에 사용하는 refresh token 값 |
| `refreshExpiresIn` | number | yes | no | refresh token 만료까지 초 단위 |
| `user.id` | number | yes | no | 사용자 식별자 |
| `user.email` | string | yes | no | 사용자 email |

- Status codes: 200, 400, 401
- Error cases: validation 실패, email 없음, 비밀번호 불일치

### POST `/api/v1/auth/refresh`
- 설명: 저장된 refresh token을 검증하고 새 JWT access token과 refresh token을 발급한다.
- 인증: public
- Request body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `refreshToken` | string | yes | no | login 또는 refresh 응답에서 받은 refresh token |

- Response body: `AuthLoginResponseDTO`

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `accessToken` | string | yes | no | 새 Bearer access token 값 |
| `tokenType` | string | yes | no | 항상 `Bearer` |
| `expiresIn` | number | yes | no | 새 access token 만료까지 초 단위 |
| `refreshToken` | string | yes | no | 새 refresh token 값 |
| `refreshExpiresIn` | number | yes | no | 새 refresh token 만료까지 초 단위 |
| `user.id` | number | yes | no | 사용자 식별자 |
| `user.email` | string | yes | no | 사용자 email |

- Status codes: 200, 400, 401, 404
- Error cases: refresh token validation 실패, refresh token 만료/위조, access token 제출, token 사용자 없음

### GET `/api/v1/auth/me`
- 설명: 현재 Bearer token의 사용자 정보를 조회한다.
- 인증: authenticated
- Response body: `AuthUserResponseDTO`

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | 사용자 식별자 |
| `email` | string | yes | no | 사용자 email |
| `createdAt` | string, LocalDateTime | yes | no | 계정 생성 시각 |
| `updatedAt` | string, LocalDateTime | yes | no | 계정 수정 시각 |

- Status codes: 200, 401, 404
- Error cases: token 없음/만료, 사용자 없음

### GET `/api/v1/chat-sessions`
- 설명: 현재 사용자의 active 채팅 세션 목록을 최신 활동순으로 조회한다.
- 인증: authenticated
- Response body: `ChatSessionResponseDTO[]`
- Status codes: 200, 401, 500
- Error cases: 인증 실패, 서버 오류

### POST `/api/v1/chat-sessions`
- 설명: 현재 사용자에게 귀속되는 새 채팅 세션을 생성한다.
- 인증: authenticated
- Request body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `title` | string | no | yes | 세션 제목 |

- Response body: `ChatSessionResponseDTO`
- Status codes: 201, 400, 401, 500
- Error cases: title validation 실패, 인증 실패, 서버 오류

### GET `/api/v1/chat-sessions/{id}`
- 설명: 현재 사용자가 소유한 채팅 세션 상세를 조회한다.
- 인증: authenticated
- Path params:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | 세션 식별자 |

- Response body: `ChatSessionResponseDTO`
- Status codes: 200, 401, 404, 500
- Error cases: 인증 실패, 소유 세션 없음, 서버 오류

### PATCH `/api/v1/chat-sessions/{id}`
- 설명: 현재 사용자가 소유한 채팅 세션 제목 또는 archived 상태를 수정한다.
- 인증: authenticated
- Path params: `id`
- Request body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `title` | string | no | yes | 변경할 세션 제목 |
| `archived` | boolean | no | yes | 보관 여부 |

- Response body: `ChatSessionResponseDTO`
- Status codes: 200, 400, 401, 404, 500
- Error cases: validation 실패, 인증 실패, 소유 세션 없음, 서버 오류

### DELETE `/api/v1/chat-sessions/{id}`
- 설명: 현재 사용자가 소유한 채팅 세션과 세션 내부 메시지를 삭제한다.
- 인증: authenticated
- Path params: `id`
- Response body: 없음
- Status codes: 204, 401, 404, 500
- Error cases: 인증 실패, 소유 세션 없음, 서버 오류
- 동작:
  - 현재 사용자 소유 세션인지 먼저 확인한다.
  - 해당 세션의 `chat_messages` row를 먼저 삭제한 뒤 `chat_sessions` row를 삭제한다.
  - 세션에서 자연어 작업으로 생성된 `user_memories`, `schedules`, `reminders` row는 삭제하지 않는다.
  - 소유하지 않은 세션은 존재 여부를 노출하지 않기 위해 404로 처리한다.

### GET `/api/v1/chat-sessions/{id}/messages`
- 설명: 현재 사용자가 소유한 채팅 세션 메시지를 createdAt 오름차순으로 조회한다.
- 인증: authenticated
- Path params: `id`
- Query params:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `afterMessageId` | number | no | yes | 이 id보다 큰 메시지부터 조회 |
| `limit` | number | no | yes | 반환 개수. 기본 100, 최대 200 |

- Response body: `ChatMessageResponseDTO[]`
- Status codes: 200, 401, 404, 500
- Error cases: 인증 실패, 소유 세션 없음, 서버 오류

### POST `/api/v1/chat`
- 설명: 사용자 메시지를 LLM으로 분류한 뒤 현재 사용자 범위에서 실행한다.
- 인증: authenticated
- Frontend timeout: 프론트엔드는 LLM 응답 대기 시간을 120초로 제한한다.
- Request body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `sessionId` | number | no | yes | 기존 채팅 세션 id. 없으면 자동 생성 |
| `message` | string | yes | no | 사용자가 보낸 자연어 메시지 |

- Response body: `ChatResponseDTO`
- Status codes: 200, 400, 401, 404, 500
- Error cases: message validation 실패, 인증 실패, 소유 세션 없음, 120초 초과, LLM/API/처리 예외

### GET `/api/v1/reminders`
- 설명: 현재 사용자의 `PENDING` 리마인더 목록을 `remindAt` 오름차순으로 조회한다.
- 인증: authenticated
- Response body: `ReminderResponseDTO[]`
- Status codes: 200, 401, 500
- Error cases: 인증 실패, 서버 오류

### POST `/api/v1/reminders`
- 설명: 현재 사용자에게 귀속되는 리마인더를 직접 생성한다.
- 인증: authenticated
- Request body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `content` | string | yes | no | 알림 내용 |
| `remindAt` | string, LocalDateTime | yes | no | 알림 예정 시각 |

- Response body: `ReminderResponseDTO`
- Status codes: 201, 400, 401, 500
- Error cases: validation 실패, 인증 실패, 서버 오류

### PATCH `/api/v1/reminders/{id}/cancel`
- 설명: 현재 사용자가 소유한 리마인더를 `CANCELLED`로 전환한다.
- 인증: authenticated
- Path params: `id`
- Response body: `ReminderResponseDTO`
- Status codes: 200, 401, 404, 500
- Error cases: 인증 실패, 소유 리마인더 없음, 서버 오류

### GET `/api/v1/schedules`
- 설명: 현재 사용자의 일정 목록을 `startAt` 오름차순으로 조회한다.
- 인증: authenticated
- Query params:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `from` | string, LocalDateTime | no | yes | 이 시각 이상인 일정만 조회 |
| `to` | string, LocalDateTime | no | yes | 이 시각 이하인 일정만 조회 |

- Response body: `ScheduleResponseDTO[]`
- Status codes: 200, 400, 401, 500
- Error cases: query validation 실패, 인증 실패, 서버 오류

### POST `/api/v1/schedules`
- 설명: 현재 사용자에게 귀속되는 일정을 직접 생성한다.
- 인증: authenticated
- Request body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `title` | string | yes | no | 일정 제목 |
| `startAt` | string, LocalDateTime | yes | no | 일정 시작 시각 |
| `endAt` | string, LocalDateTime | no | yes | 일정 종료 시각 |

- Response body: `ScheduleResponseDTO`
- Status codes: 201, 400, 401, 500
- Error cases: validation 실패, 인증 실패, 서버 오류

### PATCH `/api/v1/schedules/{id}`
- 설명: 현재 사용자가 소유한 일정을 수정한다.
- 인증: authenticated
- Path params: `id`
- Request body: `ScheduleCreateRequestDTO`와 동일하며 현재 backend 계약은 `title`, `startAt`을 필수로 받는다.
- Response body: `ScheduleResponseDTO`
- Status codes: 200, 400, 401, 404, 500
- Error cases: validation 실패, 인증 실패, 소유 일정 없음, 서버 오류

### DELETE `/api/v1/schedules/{id}`
- 설명: 현재 사용자가 소유한 일정을 삭제한다.
- 인증: authenticated
- Path params: `id`
- Response body: 없음
- Status codes: 204, 401, 404, 500
- Error cases: 인증 실패, 소유 일정 없음, 서버 오류

### GET `/api/v1/web-push/public-key`
- 설명: 브라우저 `PushManager.subscribe`에 사용할 VAPID public key와 Web Push 활성 여부를 조회한다.
- 인증: public
- Frontend fallback: 이 API가 실패하거나 `enabled=false` 또는 `publicKey=null`을 반환하면 프론트는 내장 public key `BCFi-p-VQehvfXIKTSeaHgTsECNonwgjDJs79qw8UBKhKG65XRmNrOkARqCySmj4frYY-y6c7kis_TK65YpVOPk`를 사용한다.
- Response body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `enabled` | boolean | yes | no | 서버 Web Push 활성 여부 |
| `publicKey` | string | no | yes | VAPID public key |

- Status codes: 200, 500
- Error cases: 서버 오류

### POST `/api/v1/web-push/subscriptions`
- 설명: 브라우저 Web Push subscription 정보를 현재 사용자에게 저장한다.
- 인증: authenticated
- Request body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `endpoint` | string | yes | no | PushSubscription endpoint URL |
| `p256dh` | string | yes | no | PushSubscription `keys.p256dh` 값 |
| `auth` | string | yes | no | PushSubscription `keys.auth` 값 |

- Response body: `WebPushSubscriptionResponseDTO`
- Status codes: 201, 400, 401, 500
- Error cases: validation 실패, 인증 실패, 서버 오류

### GET `/api/v1/memories`
- 설명: 현재 사용자의 active memory 목록을 최신순으로 조회한다.
- 인증: authenticated
- Response body: `UserMemoryResponseDTO[]`
- Status codes: 200, 401, 500
- Error cases: 인증 실패, 서버 오류

### POST `/api/v1/memories`
- 설명: 현재 사용자에게 귀속되는 memory를 직접 생성한다.
- 인증: authenticated
- Request body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `content` | string | yes | no | 기억할 내용 |

- Response body: `UserMemoryResponseDTO`
- Status codes: 201, 400, 401, 500
- Error cases: validation 실패, 인증 실패, 서버 오류

### PATCH `/api/v1/memories/{id}`
- 설명: 현재 사용자가 소유한 active memory 내용을 수정한다.
- 인증: authenticated
- Path params: `id`
- Request body:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `content` | string | yes | no | 변경할 기억 내용 |

- Response body: `UserMemoryResponseDTO`
- Status codes: 200, 400, 401, 404, 500
- Error cases: validation 실패, 인증 실패, 소유 memory 없음, 서버 오류

### DELETE `/api/v1/memories/{id}`
- 설명: 현재 사용자가 소유한 memory를 `active=false`로 soft delete한다.
- 인증: authenticated
- Path params: `id`
- Response body: 없음
- Status codes: 204, 401, 404, 500
- Error cases: 인증 실패, 소유 memory 없음, 서버 오류

### GET `/api/v1/activity-events`
- 설명: 현재 사용자의 assistant activity timeline을 최신순으로 조회한다.
- 인증: authenticated
- Query params:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `limit` | number | no | yes | 반환 개수. 기본 50, 최대 100 |

- Response body: `ActivityEventResponseDTO[]`
- Status codes: 200, 401, 500
- Error cases: 인증 실패, 서버 오류

## 프론트 매핑
- `jarvis-frontend/src/services/jarvisApiService.ts`가 모든 HTTP boundary와 token header 부착을 소유한다.
- `jarvis-frontend/src/hooks/useChatPage.ts`가 DTO를 ViewModel로 변환한다.
- API 실패는 hook에서 `systemStatus.healthLabel = FAILED`와 화면별 실패 메시지로 정규화한다.
- Web Push browser API 연동은 hook에서 수행하고, subscription 저장 HTTP 호출만 service를 거친다.

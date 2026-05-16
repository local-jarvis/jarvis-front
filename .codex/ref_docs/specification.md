# API 명세 - jarvis-back

정확한 API 계약을 이 문서에 기록한다.

## 인증 개요
- 이 서비스는 개인용 백엔드다. 공개 회원가입 API는 의도적으로 제공하지 않는다.
- 계정 생성과 비밀번호 변경은 `APP_BOOTSTRAP_USER_EMAIL`, `APP_BOOTSTRAP_USER_PASSWORD`, `APP_BOOTSTRAP_USER_DISPLAY_NAME` 환경변수 수정 후 서버 재시작으로 수행한다.
- 서버 시작 시 email/password가 모두 있으면 해당 email 계정을 생성하거나 기존 계정의 `password_hash`만 갱신한다.
- `POST /api/v1/auth/login`으로 JWT access token을 발급받고, 보호 API에는 `Authorization: Bearer {accessToken}` header를 보낸다.
- 인증되지 않은 보호 API 요청은 HTTP 401과 `ChatResponseDTO(status=FAILED)` 형식의 실패 응답을 반환한다.
- 현재 role/admin 권한 모델은 없다. 인증된 개인 사용자 단위 소유권만 검사한다.

## 공통 Enum

### `TaskType`
| Value | Meaning |
| --- | --- |
| `CHAT` | 일반 대화, 질문, 잡담처럼 별도 작업 실행이 필요하지 않은 요청 |
| `REMINDER` | 특정 시각에 알림을 생성하거나 리마인더를 다루는 요청 |
| `SCHEDULE` | 일정 생성 요청. 일정 저장 후 리마인더 생성 여부를 확인한다. |
| `MEMORY` | 사용자가 명시적으로 기억하라고 한 개인 기억 저장 요청 |

분류 결과가 명확하지 않거나 LLM 분류 호출이 실패하면 `CHAT`으로 처리한다.

### `ChatStatus`
| Value | Meaning |
| --- | --- |
| `SUCCESS` | 요청 처리 성공 |
| `FAILED` | 요청 처리 실패 |
| `NEED_CONFIRMATION` | 실행에 필요한 정보가 부족해 사용자 확인이 필요함 |
| `NOT_IMPLEMENTED` | 분류는 되었지만 구현하지 않은 작업. 현재 MEMORY는 구현되어 사용하지 않는다. |

### `ChatRole`
| Value | Meaning |
| --- | --- |
| `USER` | 사용자가 보낸 메시지 |
| `ASSISTANT` | JARVIS가 생성한 응답 메시지 |
| `SYSTEM` | 시스템 또는 내부 메시지 |

### `ChatMessageStatus`
| Value | Meaning |
| --- | --- |
| `STREAMING` | SSE 응답으로 전송 중인 assistant 메시지 |
| `COMPLETED` | 저장과 처리가 완료된 메시지 |
| `FAILED` | 처리 실패로 저장된 메시지 |

### `ActivityEventType`
| Value | Meaning |
| --- | --- |
| `CHAT_SESSION_CREATED` | 채팅 세션 생성 |
| `CHAT_MESSAGE_CREATED` | 채팅 메시지 저장 |
| `REMINDER_CREATED` | 리마인더 생성 |
| `REMINDER_SENT` | 리마인더 발송 완료 |
| `SCHEDULE_CREATED` | 일정 생성 |
| `MEMORY_STORED` | 개인 기억 저장 |

### `ReminderStatus`
| Value | Meaning |
| --- | --- |
| `PENDING` | 발송 대기 |
| `SENT` | 발송 처리 완료 |
| `CANCELLED` | 사용자 또는 시스템에 의해 취소됨 |
| `FAILED` | 발송 처리 실패 |

## 공통 오류 응답
기존 프로젝트 형식에 맞춰 오류도 `ChatResponseDTO`로 반환한다.

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `message` | string | yes | no | 사용자 노출 실패 메시지 |
| `taskType` | string | yes | no | 기본값 `CHAT` |
| `status` | string | yes | no | `FAILED` |
| `data` | object | yes | no | `{ "reason": "..." }` |
| `createdAt` | string, LocalDateTime | yes | no | 오류 응답 생성 시각 |

## 엔드포인트

### POST `/api/v1/auth/login`
- 설명: 환경변수로 부트스트랩된 개인 계정으로 로그인하고 JWT access token을 발급한다.
- 인증: public.
- Request body: `AuthLoginRequestDTO`

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `email` | string | yes | no | 로그인 email | `@NotBlank`, `@Email`, `@Size(max = 255)` |
| `password` | string | yes | no | 로그인 비밀번호 원문 | `@NotBlank`, `@Size(max = 255)` |

- Response body: `AuthLoginResponseDTO`

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `accessToken` | string | yes | no | Bearer token 값 |
| `tokenType` | string | yes | no | 항상 `Bearer` |
| `expiresIn` | number | yes | no | token 만료까지 초 단위. 기본 3600 |
| `user.id` | number | yes | no | 사용자 식별자 |
| `user.email` | string | yes | no | 사용자 email |

- Status codes:

| Status | Condition | Body |
| --- | --- | --- |
| 200 | 로그인 성공 | `AuthLoginResponseDTO` |
| 400 | request validation 실패 | `ChatResponseDTO(status=FAILED)` |
| 401 | email 없음 또는 비밀번호 불일치 | `ChatResponseDTO(status=FAILED)` |

### GET `/api/v1/auth/me`
- 설명: 현재 Bearer token의 사용자 정보를 DB 기준으로 조회한다.
- 인증: authenticated.
- Response body: `AuthUserResponseDTO`

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | 사용자 식별자 |
| `email` | string | yes | no | 사용자 email |
| `createdAt` | string, LocalDateTime | yes | no | 계정 생성 시각 |
| `updatedAt` | string, LocalDateTime | yes | no | 계정 수정 시각 |

- Status codes: 200, 401, 404.

### GET `/api/v1/chat-sessions`
- 설명: 현재 사용자의 active 채팅 세션 목록을 최신 활동순으로 조회한다.
- 인증: authenticated.
- Response body: `ChatSessionResponseDTO[]`
- Status codes: 200, 401, 500.

### POST `/api/v1/chat-sessions`
- 설명: 현재 사용자에게 귀속되는 새 채팅 세션을 생성한다.
- 인증: authenticated.
- Request body: `ChatSessionCreateRequestDTO`, 생략 가능.

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `title` | string | no | yes | 세션 제목 | `@Size(max = 120)` |

- Response body: `ChatSessionResponseDTO`
- Status codes: 201, 400, 401, 500.

### GET `/api/v1/chat-sessions/{id}`
- 설명: 현재 사용자가 소유한 채팅 세션 상세를 조회한다.
- 인증: authenticated.
- Response body: `ChatSessionResponseDTO`
- Status codes: 200, 401, 404, 500.

### PATCH `/api/v1/chat-sessions/{id}`
- 설명: 현재 사용자가 소유한 채팅 세션 제목 또는 archived 상태를 수정한다.
- 인증: authenticated.
- Request body: `ChatSessionUpdateRequestDTO`

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `title` | string | no | yes | 변경할 세션 제목 | `@Size(max = 120)` |
| `archived` | boolean | no | yes | 보관 여부 | n/a |

- Response body: `ChatSessionResponseDTO`
- Status codes: 200, 400, 401, 404, 500.

### DELETE `/api/v1/chat-sessions/{id}`
- 설명: 현재 사용자가 소유한 채팅 세션을 archived 상태로 전환한다.
- 인증: authenticated.
- Response body: 없음.
- Status codes: 204, 401, 404, 500.

### GET `/api/v1/chat-sessions/{id}/messages`
- 설명: 현재 사용자가 소유한 채팅 세션의 메시지를 createdAt 오름차순으로 조회한다.
- 인증: authenticated.
- Query params:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `afterMessageId` | number | no | yes | 이 id보다 큰 메시지부터 조회하는 cursor |
| `limit` | number | no | yes | 반환 개수. 기본 100, 최대 200 |

- Response body: `ChatMessageResponseDTO[]`
- Status codes: 200, 401, 404, 500.

#### `ChatSessionResponseDTO`
| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | 세션 식별자 |
| `title` | string | no | yes | 세션 제목 |
| `archived` | boolean | yes | no | 보관 여부 |
| `lastMessageAt` | string, LocalDateTime | no | yes | 마지막 메시지 활동 시각 |
| `createdAt` | string, LocalDateTime | yes | no | 세션 생성 시각 |
| `updatedAt` | string, LocalDateTime | yes | no | 세션 수정 시각 |

#### `ChatMessageResponseDTO`
| Field | Type | Required | Nullable | Meaning | Enum values |
| --- | --- | --- | --- | --- | --- |
| `id` | number | yes | no | 메시지 식별자 | n/a |
| `sessionId` | number | yes | no | 소속 세션 식별자 | n/a |
| `role` | string | yes | no | 메시지 역할 | `USER`, `ASSISTANT`, `SYSTEM` |
| `content` | string | yes | no | 메시지 내용 | n/a |
| `taskType` | string | no | yes | assistant 메시지가 수행한 task type | `CHAT`, `REMINDER`, `SCHEDULE`, `MEMORY` |
| `status` | string | yes | no | 메시지 처리 상태 | `STREAMING`, `COMPLETED`, `FAILED` |
| `metadataJson` | string | no | yes | 최소 task metadata JSON 문자열 | n/a |
| `createdAt` | string, LocalDateTime | yes | no | 메시지 생성 시각 | n/a |

### POST `/api/v1/chat`
- 설명: 사용자 메시지를 LLM으로 분류한 뒤 현재 사용자 범위에서 TaskExecutor 계층이 실행한다.
- 인증: authenticated.
- Request body: `ChatRequestDTO`

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `sessionId` | number | no | yes | 기존 채팅 세션에 메시지를 추가할 때 사용하는 세션 id. 없으면 새 세션을 자동 생성한다. | n/a |
| `message` | string | yes | no | 사용자가 보낸 자연어 메시지 | `@NotBlank`, `@Size(max = 2000)` |

- Response body: `ChatResponseDTO`

| Field | Type | Required | Nullable | Meaning | Enum values |
| --- | --- | --- | --- | --- | --- |
| `sessionId` | number | no | yes | 요청이 처리된 채팅 세션 id | n/a |
| `messageId` | number | no | yes | 저장된 assistant 메시지 id | n/a |
| `message` | string | yes | no | 사용자에게 보여줄 처리 결과 메시지 | n/a |
| `taskType` | string | yes | no | 내부 `TaskType` enum 값 | `CHAT`, `REMINDER`, `SCHEDULE`, `MEMORY` |
| `status` | string | yes | no | 처리 결과 상태 | `SUCCESS`, `FAILED`, `NEED_CONFIRMATION`, `NOT_IMPLEMENTED` |
| `data` | object | no | yes | 작업별 상세 데이터 | reminder, schedule, memory 또는 null |
| `createdAt` | string, LocalDateTime | yes | no | 응답 생성 시각 | n/a |

- 동작:
  - `sessionId`가 없으면 현재 사용자에게 귀속되는 새 `ChatSession`을 생성하고 첫 user message 기반 title을 설정한다.
  - `sessionId`가 있으면 현재 사용자 소유 세션인지 확인한다. 소유하지 않은 세션은 404로 처리한다.
  - USER message와 ASSISTANT response는 `chat_messages`에 저장하고 세션의 `lastMessageAt`을 갱신한다.
  - `CHAT`: 같은 세션의 최근 completed user/assistant message와 현재 사용자의 active memory를 LLM prompt에 포함한다.
  - `REMINDER`: 현재 사용자에게 귀속되는 reminder를 저장한다.
  - `SCHEDULE`: 현재 사용자에게 귀속되는 schedule을 저장하고, 사용자별 pending confirmation에 리마인더 생성 여부를 보관한다.
  - `MEMORY`: 사용자가 명시적으로 기억하라고 한 내용을 현재 사용자 memory로 저장한다.
- Status codes: 200, 400, 401, 404, 500.

### POST `/api/v1/chat/stream`
- 설명: `POST /api/v1/chat`과 같은 세션 기반 task flow를 실행하되 assistant 응답을 Server-Sent Events로 전송한다.
- 인증: authenticated.
- Produces: `text/event-stream`.
- Request body: `ChatRequestDTO`.
- 현재 구현은 LLM provider의 native streaming 여부와 무관하게 최종 assistant 응답을 작은 chunk로 나눠 전송하는 mock-compatible streaming 구조다. `LLMClient.streamGeneralChat`도 non-stream provider 위에 chunk callback을 제공하도록 준비되어 있다.

SSE events:

```text
event: heartbeat
data: {"sessionId":1}

event: message
data: {"sessionId":1,"messageId":10,"chunk":"안녕"}

event: complete
data: {"sessionId":1,"messageId":10,"message":"안녕, 무엇을 도와줄까?"}

event: error
data: {"sessionId":1,"messageId":10,"message":"응답 스트리밍 중 문제가 발생했어."}
```

- 동작:
  - USER message를 먼저 저장한다.
  - assistant 메시지는 `STREAMING` 상태로 저장한 뒤 chunk를 전송한다.
  - 전체 응답 전송이 끝나면 assistant 메시지를 `COMPLETED`로 전환하고 `complete` event를 보낸다.
  - 처리 중 예외가 발생하면 가능한 경우 assistant 메시지를 `FAILED`로 전환하고 `error` event를 보낸다.
- Frontend note:
  - 이 endpoint는 `POST` SSE이므로 브라우저 기본 `EventSource`만으로는 body 전송이 어렵다.
  - 프론트엔드는 `fetch` readable stream, `@microsoft/fetch-event-source`, 또는 동등한 POST SSE client를 사용한다.
- Status codes: 200, 400, 401, 404, 500.

### GET `/api/v1/reminders`
- 설명: 현재 사용자의 `PENDING` 리마인더 목록을 `remindAt` 오름차순으로 조회한다.
- 인증: authenticated.
- Response body: `ReminderResponseDTO[]`

| Field | Type | Required | Nullable | Meaning | Enum values |
| --- | --- | --- | --- | --- | --- |
| `id` | number | yes | no | 리마인더 식별자 | n/a |
| `content` | string | yes | no | 알림 내용 | n/a |
| `remindAt` | string, LocalDateTime | yes | no | 알림 예정 시각 | n/a |
| `status` | string | yes | no | 리마인더 상태 | `PENDING`, `SENT`, `CANCELLED`, `FAILED` |
| `createdAt` | string, LocalDateTime | yes | no | row 최초 생성 시각 | n/a |
| `completedAt` | string, LocalDateTime | no | yes | 발송/취소/실패 완료 시각 | n/a |

- Status codes: 200, 401, 500.

### POST `/api/v1/reminders`
- 설명: 현재 사용자에게 귀속되는 리마인더를 직접 생성한다.
- 인증: authenticated.
- Request body: `ReminderCreateRequestDTO`

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `content` | string | yes | no | 알림 내용 | `@NotBlank`, `@Size(max = 500)` |
| `remindAt` | string, LocalDateTime | yes | no | 알림 예정 시각 | `@NotNull`, `@Future` |

- Response body: `ReminderResponseDTO`
- Status codes: 201, 400, 401, 500.

### PATCH `/api/v1/reminders/{id}/cancel`
- 설명: 현재 사용자가 소유한 리마인더를 `CANCELLED`로 전환한다.
- 인증: authenticated.
- Path params:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | 취소할 리마인더 식별자 |

- Response body: `ReminderResponseDTO`
- Status codes: 200, 401, 404, 500.
- 소유하지 않은 reminder는 존재 여부를 노출하지 않기 위해 404로 처리한다.

### GET `/api/v1/schedules`
- 설명: 현재 사용자의 일정 목록을 `startAt` 오름차순으로 조회한다.
- 인증: authenticated.
- Query params:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `from` | string, LocalDateTime | no | yes | 이 시각 이상인 일정만 조회 |
| `to` | string, LocalDateTime | no | yes | 이 시각 이하인 일정만 조회 |

- Response body: `ScheduleResponseDTO[]`
- Status codes: 200, 400, 401, 500.

### POST `/api/v1/schedules`
- 설명: 현재 사용자에게 귀속되는 일정을 직접 생성한다.
- 인증: authenticated.
- Request body: `ScheduleCreateRequestDTO`

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `title` | string | yes | no | 일정 제목 | `@NotBlank`, `@Size(max = 200)` |
| `startAt` | string, LocalDateTime | yes | no | 일정 시작 시각 | `@NotNull`, 현재 이후 |
| `endAt` | string, LocalDateTime | no | yes | 일정 종료 시각 | 값이 있으면 `startAt` 이후 |

- Response body: `ScheduleResponseDTO`
- Status codes: 201, 400, 401, 500.

### PATCH `/api/v1/schedules/{id}`
- 설명: 현재 사용자가 소유한 일정을 수정한다.
- 인증: authenticated.
- Request body: `ScheduleUpdateRequestDTO`
- Response body: `ScheduleResponseDTO`
- Status codes: 200, 400, 401, 404, 500.
- 현재 구현은 `title`, `startAt`을 필수로 받는 전체 갱신형 PATCH다.

### DELETE `/api/v1/schedules/{id}`
- 설명: 현재 사용자가 소유한 일정을 삭제한다.
- 인증: authenticated.
- Response body: 없음.
- Status codes: 204, 401, 404, 500.

#### `ScheduleResponseDTO`
| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | 일정 식별자 |
| `title` | string | yes | no | 일정 제목 |
| `startAt` | string, LocalDateTime | yes | no | 일정 시작 시각 |
| `endAt` | string, LocalDateTime | no | yes | 일정 종료 시각 |
| `createdAt` | string, LocalDateTime | yes | no | row 최초 생성 시각 |

### GET `/api/v1/web-push/public-key`
- 설명: 프론트엔드가 브라우저 `PushManager.subscribe`에 사용할 VAPID public key와 Web Push 활성 여부를 조회한다.
- 인증: public.
- Response body: `WebPushPublicKeyResponseDTO`

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `enabled` | boolean | yes | no | 서버 Web Push 설정이 활성화되어 있고 public key가 존재하는지 여부 |
| `publicKey` | string | no | yes | VAPID public key. 설정되지 않으면 `null` |

- Status codes: 200, 500.

### POST `/api/v1/web-push/subscriptions`
- 설명: 브라우저에서 생성한 Web Push subscription 정보를 현재 사용자에게 귀속해 저장하거나 같은 endpoint의 키 정보를 갱신한다.
- 인증: authenticated.
- Request body: `WebPushSubscriptionRequestDTO`

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `endpoint` | string | yes | no | 브라우저 PushSubscription endpoint URL | `@NotBlank`, `@Size(max = 700)` |
| `p256dh` | string | yes | no | PushSubscription `keys.p256dh` 값 | `@NotBlank`, `@Size(max = 500)` |
| `auth` | string | yes | no | PushSubscription `keys.auth` 값 | `@NotBlank`, `@Size(max = 255)` |

- Response body: `WebPushSubscriptionResponseDTO`
- Status codes: 201, 400, 401, 500.

### GET `/api/v1/memories`
- 설명: 현재 사용자의 active memory 목록을 최신순으로 조회한다.
- 인증: authenticated.
- Response body: `UserMemoryResponseDTO[]`
- Status codes: 200, 401, 500.

### POST `/api/v1/memories`
- 설명: 현재 사용자에게 귀속되는 memory를 직접 생성한다.
- 인증: authenticated.
- Request body: `UserMemoryCreateRequestDTO`

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `content` | string | yes | no | 기억할 내용 | `@NotBlank`, `@Size(max = 1000)` |

- Response body: `UserMemoryResponseDTO`
- Status codes: 201, 400, 401, 500.

### PATCH `/api/v1/memories/{id}`
- 설명: 현재 사용자가 소유한 active memory 내용을 수정한다.
- 인증: authenticated.
- Request body: `UserMemoryUpdateRequestDTO`
- Response body: `UserMemoryResponseDTO`
- Status codes: 200, 400, 401, 404, 500.

### DELETE `/api/v1/memories/{id}`
- 설명: 현재 사용자가 소유한 memory를 `active=false`로 soft delete한다.
- 인증: authenticated.
- Response body: 없음.
- Status codes: 204, 401, 404, 500.

#### `UserMemoryResponseDTO`
| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | memory 식별자 |
| `content` | string | yes | no | 기억 내용 |
| `active` | boolean | yes | no | prompt와 목록에 포함되는지 여부 |
| `createdAt` | string, LocalDateTime | yes | no | row 최초 생성 시각 |
| `updatedAt` | string, LocalDateTime | yes | no | row 마지막 수정 시각 |

### GET `/api/v1/activity-events`
- 설명: 현재 사용자의 assistant activity timeline을 최신순으로 조회한다.
- 인증: authenticated.
- Query params:

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `limit` | number | no | yes | 반환 개수. 기본 50, 최대 100 |

- Response body: `ActivityEventResponseDTO[]`
- Status codes: 200, 401, 500.

#### `ActivityEventResponseDTO`
| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `id` | number | yes | no | activity event 식별자 |
| `type` | string | yes | no | `ActivityEventType` |
| `title` | string | yes | no | timeline에 표시할 짧은 제목 |
| `description` | string | no | yes | 상세 설명 |
| `relatedEntityType` | string | no | yes | 관련 entity 종류. 예: `ChatSession`, `ChatMessage`, `Reminder`, `Schedule`, `UserMemory` |
| `relatedEntityId` | number | no | yes | 관련 entity id |
| `metadataJson` | string | no | yes | 추가 metadata JSON 문자열 |
| `createdAt` | string, LocalDateTime | yes | no | event 생성 시각 |

## 외부 API 및 설정
- LLM 호출은 `LLMClient`가 `POST {llm.base-url}/v1/chat/completions`로 수행한다.
- 현재 native streaming provider 계약은 아직 연결하지 않았다. `LLMClient.streamGeneralChat`은 non-stream 응답을 chunk callback으로 흘릴 수 있는 future-ready 구조를 제공한다.
- `LLM_CONNECT_TIMEOUT_MILLIS`, `LLM_READ_TIMEOUT_MILLIS`로 연결/응답 제한 시간을 설정한다.
- retry는 의도적으로 구현하지 않는다. 개인용 UX에서 느린 재시도보다 빠른 fallback과 확인 요청이 낫기 때문이다.
- classifier 실패는 `CHAT` fallback으로 처리한다.
- reminder/schedule extractor 실패는 DB 저장 없이 `NEED_CONFIRMATION` 응답으로 처리한다.
- 일반 chat 실패는 fallback 메시지를 반환한다.
- Web Push 발송은 `core.WebPushClient` adapter에서 SDK `sendAsync` future 제한 시간으로 관리한다.
- Web Push 설정:
  - `APP_WEB_PUSH_ENABLED`
  - `APP_WEB_PUSH_VAPID_PUBLIC_KEY`
  - `APP_WEB_PUSH_VAPID_PRIVATE_KEY`
  - `APP_WEB_PUSH_VAPID_SUBJECT`
  - `APP_WEB_PUSH_TTL_SECONDS`
  - `APP_WEB_PUSH_CONNECT_TIMEOUT_MILLIS`
- Web Push는 reminder 소유자의 active subscription에만 발송한다.
- 하나 이상의 subscription 발송이 성공하면 reminder는 `SENT`, 설정 누락/활성 구독 없음/전체 실패는 `FAILED`가 된다.

## CORS 계약
- CORS는 Spring Security의 CORS 설정으로 처리한다.
- `APP_CORS_ALLOWED_ORIGINS`: comma-separated 허용 origin 목록. 기본값은 `http://localhost:3000`.
- `APP_CORS_ALLOWED_METHODS`: comma-separated 허용 HTTP method 목록. 기본값은 `GET,POST,PATCH,PUT,DELETE,OPTIONS`.
- `APP_CORS_ALLOWED_HEADERS`: comma-separated 허용 header 목록. 기본값은 `*`.
- `APP_CORS_ALLOW_CREDENTIALS`: credential 포함 허용 여부. 기본값은 `false`.

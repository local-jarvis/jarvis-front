# API 명세 - jarvis-back

정확한 API 계약을 이 문서에 기록한다.

## 인증 개요
- 이 서비스는 개인용 백엔드다. 공개 회원가입 API는 의도적으로 제공하지 않는다.
- 계정 생성과 비밀번호 변경은 `APP_BOOTSTRAP_USER_EMAIL`, `APP_BOOTSTRAP_USER_PASSWORD`, `APP_BOOTSTRAP_USER_DISPLAY_NAME` 환경변수 수정 후 서버 재시작으로 수행한다.
- 서버 시작 시 email/password가 모두 있으면 해당 email 계정을 생성하거나 기존 계정의 `password_hash`만 갱신한다.
- `POST /api/v1/auth/login`으로 JWT access token과 refresh token을 발급받고, 보호 API에는 `Authorization: Bearer {accessToken}` header를 보낸다.
- `POST /api/v1/auth/refresh`는 refresh token을 request body로 받아 새 access token과 refresh token을 발급한다.
- access token과 refresh token은 같은 secret으로 서명하지만 `tokenUse` claim이 각각 `access`, `refresh`로 다르다.
- 보호 API는 `tokenUse=access`인 token만 허용한다. refresh token은 `Authorization` header의 Bearer token으로 사용할 수 없다.
- refresh token은 현재 stateless JWT이며 DB에 저장하지 않는다. 서버는 서명, 만료 시각, token use, 사용자 존재 여부를 검증한다.
- 인증되지 않은 보호 API 요청은 HTTP 401과 `ChatResponseDTO(status=FAILED)` 형식의 실패 응답을 반환한다.
- 현재 role/admin 권한 모델은 없다. 인증된 개인 사용자 단위 소유권만 검사한다.
- JWT 설정:
  - `APP_JWT_EXPIRATION_SECONDS`: access token 만료 초. 기본 3600.
  - `APP_JWT_REFRESH_EXPIRATION_SECONDS`: refresh token 만료 초. 기본 604800.

## 공통 Enum

### `TaskType`
| Value | Meaning |
| --- | --- |
| `CHAT` | 일반 대화, 질문, 잡담처럼 별도 작업 실행이 필요하지 않은 요청 |
| `REMINDER_CREATE` | 특정 시각에 알림 또는 리마인더를 생성하는 요청 |
| `SCHEDULE_CREATE` | 일정 생성 요청. 일정 저장 후 리마인더 생성 여부를 확인한다. |
| `SCHEDULE_QUERY` | 저장된 일정 조회 요청. 일정이나 리마인더를 생성하지 않는다. |
| `MEMORY_WRITE` | 사용자가 명시적으로 기억 저장, 수정, 삭제를 요청한 개인 기억 쓰기 요청 |
| `MEMORY_QUERY` | 저장된 개인 기억을 묻는 조회 요청. memory를 수정하지 않는다. |
| `NEWS_SUMMARY` | 키워드 기반 네이버 뉴스 검색과 LLM 이슈 요약 요청. 뉴스 결과는 DB에 저장하지 않는다. |
| `REMINDER` | legacy 호환 값. 새 분류 결과로 사용하지 않고 `REMINDER_CREATE`로 정규화한다. |
| `SCHEDULE` | legacy 호환 값. 새 분류 결과로 사용하지 않고 `SCHEDULE_CREATE`로 정규화한다. |
| `MEMORY` | legacy 호환 값. 새 분류 결과로 사용하지 않고 `MEMORY_WRITE`로 정규화한다. |

분류 결과가 명확하지 않거나 LLM 분류 호출이 실패하면 `CHAT`으로 처리한다.
LLM classifier 요청에는 현재 세션의 최근 completed `USER -> ASSISTANT` turn을 포함한다.
LLM classifier 결과는 서버의 rule-based guard가 최종 보정한다. 최신 user input이 항상 기준이며 conversation history는 짧은 응답이나 생략된 맥락을 해석하는 보조 정보로만 사용한다. 명확한 새 요청은 이전 pending confirmation보다 우선한다. 생성 intent와 조회 intent와 뉴스 요약 intent는 분리하며, 일정 조회 표현은 `SCHEDULE_QUERY`, 뉴스 검색/이슈 요약 표현은 `NEWS_SUMMARY`로 보정한다. 부정 표현은 생성 intent보다 우선한다.

### `ChatStatus`
| Value | Meaning |
| --- | --- |
| `SUCCESS` | 요청 처리 성공 |
| `FAILED` | 요청 처리 실패 |
| `NEED_CONFIRMATION` | 실행에 필요한 정보가 부족해 사용자 확인이 필요함 |
| `NOT_IMPLEMENTED` | 분류는 되었지만 구현하지 않은 작업. 현재 canonical task는 구현되어 일반적으로 사용하지 않는다. |

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
- 설명: 환경변수로 부트스트랩된 개인 계정으로 로그인하고 JWT access token과 refresh token을 발급한다.
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
| `expiresIn` | number | yes | no | access token 만료까지 초 단위. 기본 3600 |
| `refreshToken` | string | yes | no | access token 갱신에 사용하는 refresh token 값 |
| `refreshExpiresIn` | number | yes | no | refresh token 만료까지 초 단위. 기본 604800 |
| `user.id` | number | yes | no | 사용자 식별자 |
| `user.email` | string | yes | no | 사용자 email |

- Status codes:

| Status | Condition | Body |
| --- | --- | --- |
| 200 | 로그인 성공 | `AuthLoginResponseDTO` |
| 400 | request validation 실패 | `ChatResponseDTO(status=FAILED)` |
| 401 | email 없음 또는 비밀번호 불일치 | `ChatResponseDTO(status=FAILED)` |

### POST `/api/v1/auth/refresh`
- 설명: refresh token을 검증하고 새 JWT access token과 refresh token을 발급한다.
- 인증: public. 만료된 access token이 있어도 호출할 수 있도록 `Authorization` header는 필요하지 않다.
- Request body: `AuthRefreshRequestDTO`

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `refreshToken` | string | yes | no | login 또는 refresh 응답에서 받은 refresh token | `@NotBlank`, `@Size(max = 4096)` |

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

- Status codes:

| Status | Condition | Body |
| --- | --- | --- |
| 200 | refresh 성공 | `AuthLoginResponseDTO` |
| 400 | request validation 실패 | `ChatResponseDTO(status=FAILED)` |
| 401 | refresh token 누락, 만료, 위조, access token 제출 | `ChatResponseDTO(status=FAILED)` |
| 404 | token의 사용자 id가 DB에 없음 | `ChatResponseDTO(status=FAILED)` |

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
- 설명: 현재 사용자가 소유한 채팅 세션과 세션 내부 메시지를 DB에서 삭제한다.
- 인증: authenticated.
- Response body: 없음.
- Status codes: 204, 401, 404, 500.
- 동작:
  - 현재 사용자 소유 세션인지 먼저 확인한다.
  - 해당 세션의 `chat_messages` row를 먼저 삭제한 뒤 `chat_sessions` row를 삭제한다.
  - 세션에서 자연어 작업으로 생성된 `user_memories`, `schedules`, `reminders` row는 삭제하지 않는다.
  - 소유하지 않은 세션은 존재 여부를 노출하지 않기 위해 404로 처리한다.

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
| `taskType` | string | no | yes | assistant 메시지가 수행한 task type | `CHAT`, `REMINDER_CREATE`, `SCHEDULE_CREATE`, `SCHEDULE_QUERY`, `MEMORY_WRITE`, `MEMORY_QUERY`, `NEWS_SUMMARY`, legacy `REMINDER`, `SCHEDULE`, `MEMORY` |
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
| `taskType` | string | yes | no | 내부 `TaskType` enum 값 | `CHAT`, `REMINDER_CREATE`, `SCHEDULE_CREATE`, `SCHEDULE_QUERY`, `MEMORY_WRITE`, `MEMORY_QUERY`, `NEWS_SUMMARY` |
| `status` | string | yes | no | 처리 결과 상태 | `SUCCESS`, `FAILED`, `NEED_CONFIRMATION`, `NOT_IMPLEMENTED` |
| `data` | object | no | yes | 작업별 상세 데이터 | reminder, schedule, memory, news summary 또는 null |
| `createdAt` | string, LocalDateTime | yes | no | 응답 생성 시각 | n/a |

- 동작:
  - `sessionId`가 없으면 현재 사용자에게 귀속되는 새 `ChatSession`을 생성하고 첫 user message 기반 title을 설정한다.
  - `sessionId`가 있으면 현재 사용자 소유 세션인지 확인한다. 소유하지 않은 세션은 404로 처리한다.
  - USER message와 ASSISTANT response는 `chat_messages`에 저장하고 세션의 `lastMessageAt`을 갱신한다.
  - LLM classifier 요청에는 현재 USER message 이전의 완성된 `USER -> ASSISTANT` turn을 포함하고, 결과는 rule-based guard로 보정한다.
  - `CHAT`: 같은 세션의 최근 completed user/assistant message 중 완성된 `USER -> ASSISTANT` turn과 현재 사용자의 active memory를 LLM prompt에 포함한다. assistant 응답이 없는 과거 user message는 제외하고 현재 요청 user message만 마지막에 유지한다.
  - `REMINDER_CREATE`: 명시적 알림/리마인더/알람 생성 표현과 명확한 시간 표현이 모두 있을 때만 현재 사용자에게 귀속되는 reminder를 저장한다.
  - `SCHEDULE_CREATE`: `일정 추가`, `일정 등록`, `일정 만들어`, `캘린더`, `회의 잡아줘` 같은 명시적 일정 생성 요청이면 현재 사용자에게 귀속되는 schedule을 저장하고, 사용자별 pending confirmation에 리마인더 생성 여부를 보관한다. 종료 시각이 없으면 시작 날짜의 23:59로 저장한다.
  - `SCHEDULE_QUERY`: `내 일정 알려줘`, `다음주 스케줄 보여줘`, `다음주까지 해야 하는 일정 있어?` 같은 일정 조회 요청이면 저장된 schedule을 조회해 반환한다. 이 flow는 schedule/reminder를 생성하지 않는다.
  - `MEMORY_WRITE`: `기억해줘`, `기억해둬`, `저장해줘`, `메모해줘`, `잊지마`, `기억 삭제` 같은 명시적 저장/수정/삭제 요청이면 현재 사용자 memory로 저장한다.
  - `MEMORY_QUERY`: `내 전공이 뭐였지?`, `내가 어느 학교 학생이라고 했어?`, `내가 전에 뭐라고 했지?` 같은 기억 조회 질문이며 memory를 수정하지 않는다.
  - `NEWS_SUMMARY`: `삼성전자 뉴스 요약해줘`, `엔비디아 최근 이슈 알려줘` 같은 키워드 기반 뉴스 검색/요약 요청이면 네이버 뉴스 검색 API에서 최신순 최대 50개 제목과 URL을 가져와 LLM으로 이슈를 요약한다. 뉴스 제목과 URL은 DB에 저장하지 않고 응답 생성에만 사용한다.
  - 맥락성 진술(`다음 주엔 네트워크 리포트 제출도 있어`, `내일 회의 있어`)은 생성 요청으로 처리하지 않는다.
  - 일정 리마인더 pending confirmation은 명확한 확인/거절 표현일 때만 소비한다. 새 task command는 pending을 소비하지 않고 일반 task flow로 처리한다.
- Status codes: 200, 400, 401, 404, 500.

### Task classification guard 정책
- 최신 user input이 최종 기준이다. conversation history는 짧은 응답(`응`, `그래`, `필요 없어`, `안 해도 돼`)이나 생략된 맥락을 해석할 때만 보조로 사용한다.
- `REMINDER_CREATE` 생성 조건: 명시적 알림/리마인더/알람 생성 표현과 명확한 시간 표현이 모두 있어야 한다. `알려줘` 단독으로는 reminder 생성 intent가 아니다.
- `REMINDER_CREATE` 금지 조건: `리마인드는 필요없어`, `리마인드는 하지 말아줘`, `알림은 안 해도 돼` 같은 부정 표현은 reminder 생성보다 우선한다.
- `SCHEDULE_CREATE` 생성 조건: 일정/스케줄/캘린더/회의/약속을 생성, 추가, 등록, 저장, 예약하라는 의도가 명시되어야 한다.
- `SCHEDULE_CREATE` 금지 조건: `내일 회의 있어`, `시험이 있어`, `과제 해야 해`, `다음 주엔 네트워크 리포트 제출도 있어` 같은 단순 진술은 일정으로 저장하지 않는다.
- `SCHEDULE_QUERY` 조건: 일정/스케줄 조회, 확인, 목록, 보여줘, 알려줘, `다음주까지 해야 하는 일정 있어?` 같은 저장된 일정 조회 요청이다. 이 task는 schedule/reminder insert를 절대 실행하지 않는다.
- `MEMORY_WRITE` 저장 조건: 사용자가 장기 기억의 저장, 수정, 삭제를 명시적으로 요청해야 한다.
- `MEMORY_QUERY` 조건: 기억 조회, 회상 질문이다. memory를 수정하지 않는다.
- `NEWS_SUMMARY` 조건: 최신 뉴스, 기사, 이슈, 속보, `무슨 일` 같은 표현과 검색/요약/정리/알려줘 의도가 함께 있어야 한다. 키워드가 없으면 `NEED_CONFIRMATION`으로 키워드를 요청한다.
- 다중 의도 제한: 현재 공개 API는 단일 `TaskType`만 반환한다. 일정과 알림을 한 문장에 함께 요청하는 경우 현재 정책은 `SCHEDULE_CREATE`를 우선하고 일정 생성 후 리마인더 확인 흐름을 사용한다.

### SCHEDULE_QUERY 기간 해석 정책
- `오늘`: 오늘 00:00:00부터 23:59:59까지.
- `내일`: 내일 00:00:00부터 23:59:59까지.
- `이번주`: 현재 날짜가 포함된 주의 월요일 00:00:00부터 일요일 23:59:59까지.
- `다음주`: 다음 주 월요일 00:00:00부터 일요일 23:59:59까지.
- `다음주까지`: 현재 시각부터 다음 주 일요일 23:59:59까지.
- 기간 표현이 없으면 현재 시각 이후의 다가오는 일정을 조회한다.

### Pending confirmation 정책
- 일정 생성 후 리마인더 확인 pending은 userId별 서버 메모리에 저장된다.
- `응`, `ㅇㅇ`, `좋아`, `해줘`, `추가해줘`, `알림도 해줘`, `아니`, `ㄴㄴ`, `필요없어`, `리마인드는 필요없어`, `괜찮아`, `취소` 같은 명확한 답변만 pending을 소비한다.
- `안녕` 같은 일반 대화와 `1분 뒤에 테스트 알림 보내줘`, `내 다음주 스케줄을 알려줘` 같은 새 task command는 pending을 소비하지 않는다. 이 경우 기존 pending은 유지되고 입력은 일반 task flow로 처리된다.
- `리마인드는 필요없어`, `리마인드는 하지 말아줘`, `알림은 안 해도 돼` 같은 부정 표현은 pending reminder confirmation을 거절로 소비하고 reminder를 생성하지 않는다.

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

## 분류 생략 Task 실행 API

아래 endpoint들은 기존 `POST /api/v1/chat`의 LLM task classification, `chat_sessions` 자동 생성, `chat_messages` USER/ASSISTANT 저장을 수행하지 않는다.
요청의 `message` 자연어는 별도 DB row로 보관하지 않으며, endpoint가 지정한 task만 실행한다.
단, task 결과로 생성되는 `reminders`, `schedules`, `user_memories` row는 기존 기능과 동일하게 현재 사용자에게 귀속되어 저장된다.
`NEWS_SUMMARY` 직접 endpoint는 네이버 뉴스 검색 결과와 요약 결과를 DB에 저장하지 않는다.

공통 Request body: `TaskExecutionRequestDTO`

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `message` | string | yes | no | task에 사용할 자연어 입력 | `@NotBlank`, `@Size(max = 2000)` |

공통 Response body: `ChatResponseDTO`

| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `sessionId` | number | no | yes | 항상 `null`. 채팅 세션을 생성하지 않는다. |
| `messageId` | number | no | yes | 항상 `null`. 채팅 메시지를 저장하지 않는다. |
| `message` | string | yes | no | task 실행 결과 안내 문구 |
| `taskType` | string | yes | no | endpoint에 고정된 `TaskType` |
| `status` | string | yes | no | `SUCCESS`, `NEED_CONFIRMATION`, `FAILED` |
| `data` | object | no | yes | task별 결과 DTO 또는 null |
| `createdAt` | string, LocalDateTime | yes | no | 응답 생성 시각 |

### POST `/api/v1/task-executions/chat`
- 설명: task 분류 없이 `CHAT` task만 실행한다.
- 인증: authenticated.
- 동작:
  - 현재 사용자의 active memory를 prompt에 포함해 일반 채팅 LLM 응답을 생성한다.
  - conversation history는 사용하지 않는다.
  - `chat_sessions`, `chat_messages`에 저장하지 않는다.
- Response:
  - `taskType`: `CHAT`
  - `data`: `null`
- Status codes: 200, 400, 401, 500.

### POST `/api/v1/task-executions/reminder-create`
- 설명: task 분류 없이 `REMINDER_CREATE` task만 실행한다.
- 인증: authenticated.
- 동작:
  - 자연어에서 알림 내용과 시간을 LLM으로 추출한다.
  - 추출 성공 시 현재 사용자에게 귀속된 `reminders` row를 생성한다.
  - 시간 또는 내용이 불명확하면 DB에 저장하지 않고 `NEED_CONFIRMATION`을 반환한다.
  - `chat_sessions`, `chat_messages`에 저장하지 않는다.
- Response:
  - `taskType`: `REMINDER_CREATE`
  - `data`: 성공 시 `ReminderResponseDTO`, 확인 필요 시 `{ "reason": "..." }`
- Status codes: 200, 400, 401, 500.

### POST `/api/v1/task-executions/schedule-create`
- 설명: task 분류 없이 `SCHEDULE_CREATE` task만 실행한다.
- 인증: authenticated.
- 동작:
  - 자연어에서 일정 제목, 시작 시각, 선택적 종료 시각을 LLM으로 추출한다.
  - 추출 성공 시 현재 사용자에게 귀속된 `schedules` row를 생성한다. 종료 시각이 없으면 시작 날짜의 23:59로 저장한다.
  - 직접 task endpoint에서는 일정 생성 후 리마인더 확인 pending 상태를 만들지 않는다.
  - 시간 또는 제목이 불명확하면 DB에 저장하지 않고 `NEED_CONFIRMATION`을 반환한다.
  - `chat_sessions`, `chat_messages`에 저장하지 않는다.
- Response:
  - `taskType`: `SCHEDULE_CREATE`
  - `data`: 성공 시 `ScheduleResponseDTO`, 확인 필요 시 `{ "reason": "..." }`
- Status codes: 200, 400, 401, 500.

### POST `/api/v1/task-executions/schedule-query`
- 설명: task 분류 없이 `SCHEDULE_QUERY` task만 실행한다.
- 인증: authenticated.
- 동작:
  - 자연어의 오늘/내일/이번주/다음주/다음주까지 표현을 Asia/Seoul 기준 조회 범위로 변환한다.
  - 현재 사용자의 저장된 일정만 조회한다.
  - schedule/reminder를 생성하지 않는다.
  - `chat_sessions`, `chat_messages`에 저장하지 않는다.
- Response:
  - `taskType`: `SCHEDULE_QUERY`
  - `data`: `ScheduleQueryResultDTO`
- Status codes: 200, 400, 401, 500.

### POST `/api/v1/task-executions/memory-write`
- 설명: task 분류 없이 `MEMORY_WRITE` task만 실행한다.
- 인증: authenticated.
- 동작:
  - 자연어에서 명시적 기억 요청 표현을 제거하고 저장할 내용을 추출한다.
  - 추출 성공 시 현재 사용자에게 귀속된 `user_memories` row를 생성한다.
  - 저장할 내용이 불명확하면 DB에 저장하지 않고 `NEED_CONFIRMATION`을 반환한다.
  - `chat_sessions`, `chat_messages`에 저장하지 않는다.
- Response:
  - `taskType`: `MEMORY_WRITE`
  - `data`: 성공 시 `UserMemoryResponseDTO`, 확인 필요 시 `{ "reason": "..." }`
- Status codes: 200, 400, 401, 500.

### POST `/api/v1/task-executions/memory-query`
- 설명: task 분류 없이 `MEMORY_QUERY` task만 실행한다.
- 인증: authenticated.
- 동작:
  - 현재 사용자의 active memory를 prompt에 포함해 LLM 응답을 생성한다.
  - memory를 생성, 수정, 삭제하지 않는다.
  - conversation history는 사용하지 않는다.
  - `chat_sessions`, `chat_messages`에 저장하지 않는다.
- Response:
  - `taskType`: `MEMORY_QUERY`
  - `data`: `null`
- Status codes: 200, 400, 401, 500.

### POST `/api/v1/task-executions/news-summary`
- 설명: task 분류 없이 `NEWS_SUMMARY` task만 실행한다.
- 인증: authenticated.
- 동작:
  - `message`에서 뉴스 검색 키워드를 얻는다. `"인공지능" 관련 뉴스 정리해줘`처럼 따옴표가 있으면 따옴표 내부를 키워드로 우선 사용한다.
  - 네이버 뉴스 검색 API `GET /v1/search/news.json`을 `display=50`, `start=1`, `sort=date`로 호출한다.
  - 검색 결과의 제목과 URL을 최대 50개까지 수집한다. URL은 `originallink`가 있으면 우선 사용하고, 없으면 `link`를 사용한다.
  - 수집한 뉴스 제목과 URL을 `LLM_RESPONSE_MODEL`에 전달해 최근에 무슨 일이 있었는지, 어떤 이슈가 있는지 요약한다.
  - 뉴스 제목, URL, 요약 결과는 DB에 저장하지 않는다. 직접 endpoint이므로 `chat_sessions`, `chat_messages`도 생성하지 않는다.
- Response:
  - `taskType`: `NEWS_SUMMARY`
  - `data`: `NewsSummaryResultDTO`
- Status codes: 200, 400, 401, 500.

#### `NewsSummaryResultDTO`
| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `keyword` | string | yes | no | 실제 네이버 뉴스 검색에 사용한 키워드 |
| `requestedCount` | number | yes | no | 요청한 검색 결과 수. 현재 50 |
| `collectedCount` | number | yes | no | 수집된 뉴스 항목 수 |
| `summary` | string | yes | no | LLM이 뉴스 제목 기반으로 생성한 이슈 요약 |
| `articles` | array of `NewsArticleDTO` | yes | no | 검색된 뉴스 제목과 URL 목록. DB에 저장하지 않는다. |

#### `NewsArticleDTO`
| Field | Type | Required | Nullable | Meaning |
| --- | --- | --- | --- | --- |
| `title` | string | yes | no | `<b>` 등 HTML 태그와 기본 HTML entity를 제거한 뉴스 제목 |
| `url` | string | yes | no | 뉴스 원문 URL 또는 네이버 뉴스 URL |

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
- 동작:
  - 종료 시각이 지난 일정은 background scheduler가 1분 주기로 물리 삭제하므로 조회 결과에서 사라진다.
  - `endAt`이 null인 legacy row는 자동 삭제 대상이 아니지만, 현재 사용자 소유 row만 조회한다.
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
| `endAt` | string, LocalDateTime | no | yes | 일정 종료 시각. 없으면 `startAt` 날짜의 23:59로 저장 | 값이 있으면 `startAt` 이후 |

- Response body: `ScheduleResponseDTO`
- Status codes: 201, 400, 401, 500.

### PATCH `/api/v1/schedules/{id}`
- 설명: 현재 사용자가 소유한 일정을 수정한다.
- 인증: authenticated.
- Request body: `ScheduleUpdateRequestDTO`
- Response body: `ScheduleResponseDTO`
- Status codes: 200, 400, 401, 404, 500.
- 현재 구현은 `title`, `startAt`을 필수로 받는 전체 갱신형 PATCH다. `endAt`이 없으면 `startAt` 날짜의 23:59로 저장한다.

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
| `endAt` | string, LocalDateTime | no | yes | 일정 종료 시각. 신규 생성/수정에서 생략하면 `startAt` 날짜의 23:59로 저장되며, legacy row는 null일 수 있다. |
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
- 설명: 브라우저에서 생성한 Web Push subscription 정보를 현재 사용자에게 귀속해 저장하거나 같은 subscription fingerprint의 키 정보를 갱신한다.
- 인증: authenticated.
- Request body: `WebPushSubscriptionRequestDTO`

| Field | Type | Required | Nullable | Meaning | Validation |
| --- | --- | --- | --- | --- | --- |
| `endpoint` | string | yes | no | 브라우저 PushSubscription endpoint URL | `@NotBlank`, `@Size(max = 2048)` |
| `p256dh` | string | yes | no | PushSubscription `keys.p256dh` 값 | `@NotBlank`, `@Size(max = 1000)` |
| `auth` | string | yes | no | PushSubscription `keys.auth` 값 | `@NotBlank`, `@Size(max = 500)` |

- Response body: `WebPushSubscriptionResponseDTO`
- 동작:
  - 서버는 `endpoint`, `p256dh`, `auth` 조합으로 `subscription_hash`를 계산해 같은 기기 구독 재등록인지 판별한다.
  - endpoint 단독으로 기존 row를 덮어쓰지 않으므로 같은 사용자 PC와 모바일 구독이 동시에 active 상태로 유지된다.
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
- LLM request body의 `model` field는 목적별 환경변수로 지정한다.
  - `LLM_TASK_MODEL`: 작업 분류 요청에 사용하는 모델 id. 기본값은 `gemma-3-1b-it-gguf`.
  - `LLM_RESPONSE_MODEL`: 일반 응답, 리마인더/일정 JSON 추출, 뉴스 제목 기반 요약 요청에 사용하는 모델 id. 기본값은 `gemma-3-4b-it-gguf`.
- 두 모델 id는 LLM 서버의 `GET /v1/models` 응답에 포함된 값이어야 한다.
- 작업 분류 요청도 일반 chat completions 형식을 사용하며, system prompt 뒤에 현재 세션의 최근 completed `USER -> ASSISTANT` turn과 현재 user message를 순서대로 넣는다.
- 일반 CHAT 응답 요청은 알고리즘 풀이와 코드 예시가 잘리지 않도록 `max_tokens=2048`을 사용한다.
- 현재 native streaming provider 계약은 아직 연결하지 않았다. `LLMClient.streamGeneralChat`은 non-stream 응답을 chunk callback으로 흘릴 수 있는 future-ready 구조를 제공한다.
- `LLM_CONNECT_TIMEOUT_MILLIS`, `LLM_READ_TIMEOUT_MILLIS`로 연결/응답 제한 시간을 설정한다.
- retry는 의도적으로 구현하지 않는다. 개인용 UX에서 느린 재시도보다 빠른 fallback과 확인 요청이 낫기 때문이다.
- classifier 실패는 `CHAT` fallback으로 처리한다.
- reminder/schedule extractor 실패는 DB 저장 없이 `NEED_CONFIRMATION` 응답으로 처리한다.
- reminder/schedule extractor는 순수 JSON, ```json code fence, 일반 code fence, 앞뒤 설명이 붙은 JSON object를 지원한다. 파싱 실패 시 raw response와 parse exception message를 서버 로그에 남긴다.
- 일반 chat 실패는 fallback 메시지를 반환한다.
- 네이버 뉴스 검색은 `core.NaverNewsClient` adapter가 `GET {naver.search.base-url}/v1/search/news.json`으로 수행한다.
- 뉴스 검색 요청은 `query`, `display=50`, `start=1`, `sort=date` query parameter와 `X-Naver-Client-Id`, `X-Naver-Client-Secret` header를 사용한다.
- 네이버 뉴스 검색 설정:
  - `NAVER_SEARCH_BASE_URL`: 기본값 `https://openapi.naver.com`
  - `NAVER_SEARCH_CLIENT_ID`
  - `NAVER_SEARCH_CLIENT_SECRET`
  - `NAVER_SEARCH_CONNECT_TIMEOUT_MILLIS`: 기본값 3000
  - `NAVER_SEARCH_READ_TIMEOUT_MILLIS`: 기본값 5000
- 네이버 검색 API key가 없거나 upstream 호출이 실패하면 `NEWS_SUMMARY` 응답은 `FAILED`가 된다. retry와 circuit breaker는 없다.
- Web Push 발송은 `core.WebPushClient` adapter에서 SDK `sendAsync` future 제한 시간으로 관리한다.
- Web Push payload는 모바일 전달 지연을 줄이기 위해 `Urgency: high`로 발송한다.
- 기본 발송은 `aes128gcm` encoding을 사용하고, push service가 400 또는 415를 반환하면 legacy `aesgcm` encoding으로 한 번 재시도한다.
- Web Push 설정:
  - `APP_WEB_PUSH_ENABLED`
  - `APP_WEB_PUSH_VAPID_PUBLIC_KEY`
  - `APP_WEB_PUSH_VAPID_PRIVATE_KEY`
  - `APP_WEB_PUSH_VAPID_SUBJECT`
  - `APP_WEB_PUSH_TTL_SECONDS`
  - `APP_WEB_PUSH_CONNECT_TIMEOUT_MILLIS`
- Web Push는 reminder 소유자의 active subscription에만 발송한다.
- 하나 이상의 subscription 발송이 성공하면 reminder는 `SENT`, 설정 누락/활성 구독 없음/전체 실패는 `FAILED`가 된다.
- push service가 404 또는 410을 반환한 subscription은 만료된 구독으로 보고 `active=false`로 전환한다.

## CORS 계약
- CORS는 Spring Security의 CORS 설정으로 처리한다.
- `APP_CORS_ALLOWED_ORIGINS`: comma-separated 허용 origin 목록. 기본값은 `http://localhost:3000`.
- `APP_CORS_ALLOWED_METHODS`: comma-separated 허용 HTTP method 목록. 기본값은 `GET,POST,PATCH,PUT,DELETE,OPTIONS`.
- `APP_CORS_ALLOWED_HEADERS`: comma-separated 허용 header 목록. 기본값은 `*`.
- `APP_CORS_ALLOW_CREDENTIALS`: credential 포함 허용 여부. 기본값은 `false`.

# 엔드포인트 목록 - jarvis-front

이 문서는 프론트엔드가 소비하는 backend endpoint 목록 전용이다. Request/Response 상세는 `docs/api/specification.md`에 기록한다.
Base URL은 `jarvis-frontend/.env`의 `VITE_JARVIS_API_BASE_URL` 값이다.

| Method | URL | Auth | 설명 |
| --- | --- | --- | --- |
| POST | `${VITE_JARVIS_API_BASE_URL}/api/v1/auth/login` | public | 개인 계정 로그인 및 JWT access/refresh token 발급 |
| POST | `${VITE_JARVIS_API_BASE_URL}/api/v1/auth/refresh` | public | refresh token 검증 및 새 JWT access/refresh token 발급 |
| GET | `${VITE_JARVIS_API_BASE_URL}/api/v1/auth/me` | authenticated | 현재 token 사용자 조회 |
| GET | `${VITE_JARVIS_API_BASE_URL}/api/v1/chat-sessions` | authenticated | active 채팅 세션 목록 조회 |
| POST | `${VITE_JARVIS_API_BASE_URL}/api/v1/chat-sessions` | authenticated | 새 채팅 세션 생성 |
| GET | `${VITE_JARVIS_API_BASE_URL}/api/v1/chat-sessions/{id}` | authenticated | 채팅 세션 상세 조회 |
| PATCH | `${VITE_JARVIS_API_BASE_URL}/api/v1/chat-sessions/{id}` | authenticated | 채팅 세션 제목 또는 archived 상태 수정 |
| DELETE | `${VITE_JARVIS_API_BASE_URL}/api/v1/chat-sessions/{id}` | authenticated | 채팅 세션과 내부 메시지 삭제 |
| GET | `${VITE_JARVIS_API_BASE_URL}/api/v1/chat-sessions/{id}/messages` | authenticated | 채팅 세션 메시지 목록 조회 |
| POST | `${VITE_JARVIS_API_BASE_URL}/api/v1/chat` | authenticated | 사용자 메시지 전송 및 작업 실행 결과 수신 |
| GET | `${VITE_JARVIS_API_BASE_URL}/api/v1/reminders` | authenticated | 대기 중인 리마인더 목록 조회 |
| POST | `${VITE_JARVIS_API_BASE_URL}/api/v1/reminders` | authenticated | 리마인더 직접 생성 |
| PATCH | `${VITE_JARVIS_API_BASE_URL}/api/v1/reminders/{id}/cancel` | authenticated | 리마인더 취소 |
| GET | `${VITE_JARVIS_API_BASE_URL}/api/v1/schedules` | authenticated | 일정 목록 조회 |
| POST | `${VITE_JARVIS_API_BASE_URL}/api/v1/schedules` | authenticated | 일정 직접 생성 |
| PATCH | `${VITE_JARVIS_API_BASE_URL}/api/v1/schedules/{id}` | authenticated | 일정 수정 |
| DELETE | `${VITE_JARVIS_API_BASE_URL}/api/v1/schedules/{id}` | authenticated | 일정 삭제 |
| GET | `${VITE_JARVIS_API_BASE_URL}/api/v1/web-push/public-key` | public | Web Push 활성 여부와 VAPID public key 조회 |
| POST | `${VITE_JARVIS_API_BASE_URL}/api/v1/web-push/subscriptions` | authenticated | 브라우저 Web Push subscription 저장 |
| GET | `${VITE_JARVIS_API_BASE_URL}/api/v1/memories` | authenticated | active memory 목록 조회 |
| POST | `${VITE_JARVIS_API_BASE_URL}/api/v1/memories` | authenticated | memory 직접 생성 |
| PATCH | `${VITE_JARVIS_API_BASE_URL}/api/v1/memories/{id}` | authenticated | active memory 수정 |
| DELETE | `${VITE_JARVIS_API_BASE_URL}/api/v1/memories/{id}` | authenticated | memory soft delete |
| GET | `${VITE_JARVIS_API_BASE_URL}/api/v1/activity-events` | authenticated | assistant activity timeline 조회 |

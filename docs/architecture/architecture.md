# 아키텍처 문서 - jarvis-front

## 요약
인공지능 비서 프로그램의 인증 기반 웹 워크스페이스다. 현재 구현은 Vite + React 단일 페이지 앱이며, `jarvis-back`의 로그인, 채팅 세션, 메시지, 리마인더, 일정, 메모리, activity, Web Push API를 소비한다.

## 기본 정보
- 스택: React
- 데이터베이스: 프론트엔드 DB 없음
- 인증 사용: 사용
- 외부 API 연동: 사용

## 계층 방향
- `src/pages`는 라우팅 단위 화면 조립만 담당하고 hook과 component를 호출한다.
- `src/components`는 표시, 입력 이벤트 전달, 접근성 label만 담당한다.
- `src/hooks`는 화면 상태, backend service 호출 조합, DTO to ViewModel 변환, browser Web Push API orchestration을 담당한다.
- `src/services`는 backend API boundary, JWT token 저장/부착, HTTP error 정규화를 담당한다.
- `src/types`는 backend DTO와 UI ViewModel 타입을 분리해서 정의한다.
- 의존성 흐름은 `Page -> Hook -> Service -> jarvis-back API` 및 `Page -> Component -> ViewModel` 방향을 따른다.
- 컴포넌트는 backend DTO를 직접 받지 않고 ViewModel과 callback intent만 받는다.

## 인증 흐름
- 로그인 화면은 `useChatPage`의 controlled form state를 표시한다.
- `jarvisApiService.login`은 `POST /api/v1/auth/login`을 호출하고 access token, refresh token, 각 만료 시각을 `localStorage`에 저장한다.
- 보호 API 호출은 service의 `fetchWithAuth` 경계에서 `Authorization: Bearer {accessToken}` header를 붙인다.
- token 저장 후 service는 access token 만료 60초 전 실행되는 refresh timer를 예약한다.
- 인증 워크스페이스 bootstrap 시 hook은 `startAuthSessionRefreshLoop`를 호출하고 unmount 시 `stopAuthSessionRefreshLoop`로 예약된 timer를 정리한다.
- 보호 API 호출 전에 access token 만료 시각이 60초 이내이면 service가 `POST /api/v1/auth/refresh`로 token을 갱신한다.
- 보호 API가 401을 반환하고 refresh token이 있으면 service가 refresh를 1회 수행한 뒤 원 요청을 재시도한다.
- refresh 요청이 일시 실패하고 인증 실패로 판정되지 않으면 service가 30초 뒤 background refresh를 다시 예약한다.
- 앱이 열린 동안 service의 refresh timer가 access token 만료 60초 전에 인증 세션을 자동 갱신한다.
- 앱 bootstrap 시 저장된 token이 있으면 `GET /api/v1/auth/me`로 복원한다.
- refresh 실패, refresh token 만료, 또는 재시도 후 401 응답은 service에서 저장 token 전체를 제거하고 hook이 로그인 상태로 돌아갈 수 있게 실패 상태를 만든다.

## API 흐름
- JSON API는 `fetchJson`으로 호출하고, 204 응답은 `void`로 처리한다.
- 채팅 전송은 `POST /api/v1/chat` JSON 응답만 사용한다.
- LLM 응답을 기다리는 채팅 전송 요청은 프론트 service 경계에서 120초 timeout을 적용한다.
- Web Push subscription 저장은 service가 수행하지만, `PushManager.subscribe`와 service worker 등록은 browser API라 hook에서 처리한다.
- Web Push public key는 backend public-key API를 우선 사용하고, 응답이 비활성/누락/실패이면 프론트 내장 fallback key를 사용한다.

## 저장 흐름
- 프론트엔드 persistent storage는 인증 token 저장용 `localStorage`만 사용한다.
- `localStorage`에는 access token, refresh token, access token 만료 시각, refresh token 만료 시각을 저장한다.
- 채팅 세션, 메시지, 리마인더, 일정, 메모리, activity는 모두 backend가 source of truth다.
- UI form state와 optimistic chat message만 React state에 임시 보관한다.

## 외부 연동 흐름
- 프론트엔드는 `jarvis-back`만 직접 호출한다.
- Backend host는 `jarvis-frontend/.env`의 `VITE_JARVIS_API_BASE_URL`에서 읽으며, service 경계에서 trailing slash를 제거해 endpoint path와 결합한다.
- LLM, DB, Web Push 발송 SDK는 backend 책임이다.
- 브라우저 Web Push subscription은 `/web-push-sw.js` service worker와 browser Push API를 통해 얻고, backend에 저장한다.
- 기존 PushSubscription의 application server key가 현재 public key와 다르면 기존 구독을 해제하고 다시 구독한다.

## 아키텍처 결정
| Date | Decision | Reason | Impact |
| --- | --- | --- | --- |
| 2026-05-10 | 채팅 페이지 mock 구현을 hook/service/component 계층으로 분리 | UI 컴포넌트에 데이터 생성 및 분류 로직을 넣지 않기 위해 | 이후 실제 API 연동 시 service 경계 교체 가능 |
| 2026-05-10 | 채팅을 단일 세션으로 제한 | 초기 제품 흐름이 하나의 연속 대화를 전제로 했기 때문 | conversation list, new chat action, active conversation 상태를 제거했음 |
| 2026-05-11 | backend API를 `localhost:8011`로 연결 | `.codex/ref_docs/specification.md`의 jarvis-back 계약을 사용하기 위해 | mock service 제거, chat/reminder API service 추가 |
| 2026-05-17 | `.codex/ref_docs/specification.md`의 인증 기반 전체 API 계약을 프론트에 반영 | 로그인부터 리마인더, 일정, 메모리, activity, Web Push까지 사용하기 위해 | `useChatPage`가 인증 워크스페이스 상태를 소유하고 `jarvisApiService`가 모든 endpoint boundary를 담당 |
| 2026-05-20 | backend host를 `VITE_JARVIS_API_BASE_URL` 환경변수로 관리 | 개발/배포 환경별 backend host 전환을 코드 수정 없이 처리하기 위해 | `jarvis-frontend/.env`와 `.env.example`에 기본 host를 기록하고 service에서 필수 설정으로 검증 |

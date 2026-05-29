# 디렉토리 문서 - jarvis-front

이 파일은 현재 프로젝트 구조를 설명하는 기준 문서다.

## 현재 구조
| Path | Type | Responsibility | Owner | Notes |
| --- | --- | --- | --- | --- |
| `jarvis-frontend/src/App.tsx` | file | 앱 루트에서 `ChatPage` 렌더링 | App | 라우팅 도입 전 단일 entry |
| `jarvis-frontend/src/pages` | directory | 라우팅 단위 화면 조립 | Page | `ChatPage`는 hook과 component를 조합 |
| `jarvis-frontend/src/pages/ChatPage.tsx` | file | 로그인 또는 인증 워크스페이스 조립 | Page | active view에 따라 기능 컴포넌트 선택 |
| `jarvis-frontend/src/components` | directory | 표시 컴포넌트 | Presentation | API/service 직접 호출 금지 |
| `jarvis-frontend/src/components/LoginView.tsx` | file | 로그인 form 표시 | Presentation | 인증 API 호출 금지 |
| `jarvis-frontend/src/components/Sidebar.tsx` | file | navigation과 채팅 세션 목록 표시 | Presentation | 세션 API 호출 금지 |
| `jarvis-frontend/src/components/ChatHeader.tsx` | file | active 세션 제목/상태 표시 | Presentation | 세션 PATCH 호출 금지 |
| `jarvis-frontend/src/components/ChatComposer.tsx` | file | 메시지 입력, 실행 방식 segmented control, quick prompt, Enter 전송과 Shift+Enter 줄바꿈 처리 | Presentation | chat/stream/task API 호출 금지 |
| `jarvis-frontend/src/components/ChatMessageList.tsx` | file | 메시지 목록과 스크롤 표시 | Presentation | message API 호출 금지 |
| `jarvis-frontend/src/components/MessageBubble.tsx` | file | 단일 메시지 표시, 사용자 plain text/assistant Markdown 표시 분기, assistant/system 진단 metadata 숨김 | Presentation | DTO 직접 사용 금지 |
| `jarvis-frontend/src/components/MarkdownMessageContent.tsx` | file | assistant/system 메시지 Markdown 렌더링 표시 | Presentation | API 호출 금지, 사용자 메시지 렌더링 금지 |
| `jarvis-frontend/src/components/ReminderReviewView.tsx` | file | 리마인더 `+` 추가 버튼, 생성 editor, 취소 UI와 리스트/캘린더 전환 표시 | Presentation | reminder API 호출 금지 |
| `jarvis-frontend/src/components/ScheduleReviewView.tsx` | file | 일정 `+` 추가 버튼, 생성/수정 editor, 필터/삭제 UI와 리스트/캘린더 전환 표시 | Presentation | schedule API 호출 금지 |
| `jarvis-frontend/src/components/ResourceCalendarView.tsx` | file | 리마인더/일정 월간 캘린더 ViewModel 표시 | Presentation | 달력 데이터 계산과 API 호출 금지 |
| `jarvis-frontend/src/components/MemoryReviewView.tsx` | file | memory `+` 추가 버튼, 생성/수정 editor, 삭제 UI 표시 | Presentation | memory API 호출 금지 |
| `jarvis-frontend/src/components/ActivityTimelineView.tsx` | file | activity timeline 표시 | Presentation | activity API 호출 금지 |
| `jarvis-frontend/src/components/SettingsView.tsx` | file | runtime/Web Push 설정 표시 | Presentation | Web Push 저장 API 호출 금지 |
| `jarvis-frontend/src/components/InsightPanel.tsx` | file | 오른쪽 shortcut rail 표시 | Presentation | view 전환 intent만 전달하고 source of truth 보관 금지 |
| `jarvis-frontend/src/hooks` | directory | 화면 상태와 UI 유스케이스 캡슐화 | UI Application | `useChatPage`가 backend service 호출 및 DTO 변환 담당 |
| `jarvis-frontend/src/hooks/useChatPage.ts` | file | 인증, active view, 세션, 메시지, ChatComposer 실행 방식, SSE chunk 반영, 리소스 form/editor, 리소스 리스트/캘린더 표시 상태, Web Push browser flow 관리 | UI Application | API 호출은 service 함수로만 수행 |
| `jarvis-frontend/.env` | file | Vite runtime 환경변수 | Configuration | `VITE_JARVIS_API_BASE_URL`로 backend host 관리 |
| `jarvis-frontend/.env.example` | file | 환경변수 예시 | Configuration | 새 환경 구성 시 복사 기준 |
| `jarvis-frontend/src/vite-env.d.ts` | file | Vite 환경변수 타입 선언 | Contract | `VITE_JARVIS_API_BASE_URL` 타입 제공 |
| `jarvis-frontend/src/services` | directory | backend API boundary | Service | `jarvisApiService`가 env 기반 backend API 호출 담당 |
| `jarvis-frontend/src/services/jarvisApiService.ts` | file | JWT access/refresh token 저장/예약 갱신/부착, JSON API 호출, SSE chat stream 파싱, 직접 task execution 호출, API error 생성 | Service | 컴포넌트에서 직접 호출 금지 |
| `jarvis-frontend/src/types` | directory | DTO와 ViewModel 타입 정의 | Contract | API DTO와 UI ViewModel 혼용 금지 |
| `jarvis-frontend/src/types/chat.ts` | file | jarvis-back DTO, enum union, UI ViewModel 정의 | Contract | persistence entity는 정의하지 않음 |
| `jarvis-frontend/src/index.css` | file | 전역 토큰과 reset | Styling | 색상, 폰트, 전역 box model |
| `jarvis-frontend/src/App.css` | file | 워크스페이스 레이아웃과 컴포넌트 스타일 | Styling | 인증 화면, resource view, chat view 포함 |
| `jarvis-frontend/public/web-push-sw.js` | file | 브라우저 Web Push notification service worker | Browser Integration | push 표시와 notification click 처리 |

## 중요한 의존성 메모
- `src/components`는 `src/types`의 ViewModel과 callback type만 의존한다.
- `src/hooks/useChatPage.ts`는 `src/services/jarvisApiService.ts`와 `src/types/chat.ts`에 의존하며 리마인더/일정 DTO를 리스트 및 캘린더 ViewModel로 변환하고 stream/direct task 실행 결과를 메시지 ViewModel로 변환한다.
- `src/services/jarvisApiService.ts`는 browser `fetch`, `ReadableStream`, `localStorage`, `setTimeout`을 사용하며 access token 만료 전 refresh token으로 인증 세션을 갱신하고 SSE event를 typed event로 파싱한다.
- `public/web-push-sw.js`는 Vite public asset으로 배포되어 browser service worker로 등록된다.

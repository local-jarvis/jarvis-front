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
| `jarvis-frontend/src/components/ChatComposer.tsx` | file | 메시지 입력, quick prompt, Enter 전송과 Shift+Enter 줄바꿈 처리 | Presentation | chat API 호출 금지 |
| `jarvis-frontend/src/components/ChatMessageList.tsx` | file | 메시지 목록과 스크롤 표시 | Presentation | message API 호출 금지 |
| `jarvis-frontend/src/components/MessageBubble.tsx` | file | 단일 메시지 표시 | Presentation | DTO 직접 사용 금지 |
| `jarvis-frontend/src/components/ReminderReviewView.tsx` | file | 리마인더 생성/취소 UI 표시 | Presentation | reminder API 호출 금지 |
| `jarvis-frontend/src/components/ScheduleReviewView.tsx` | file | 일정 필터/생성/수정/삭제 UI 표시 | Presentation | schedule API 호출 금지 |
| `jarvis-frontend/src/components/MemoryReviewView.tsx` | file | memory 생성/수정/삭제 UI 표시 | Presentation | memory API 호출 금지 |
| `jarvis-frontend/src/components/ActivityTimelineView.tsx` | file | activity timeline 표시 | Presentation | activity API 호출 금지 |
| `jarvis-frontend/src/components/SettingsView.tsx` | file | runtime/Web Push 설정 표시 | Presentation | Web Push 저장 API 호출 금지 |
| `jarvis-frontend/src/components/InsightPanel.tsx` | file | 오른쪽 shortcut rail 표시 | Presentation | view 전환 intent만 전달하고 source of truth 보관 금지 |
| `jarvis-frontend/src/hooks` | directory | 화면 상태와 UI 유스케이스 캡슐화 | UI Application | `useChatPage`가 backend service 호출 및 DTO 변환 담당 |
| `jarvis-frontend/src/hooks/useChatPage.ts` | file | 인증, active view, 세션, 메시지, 리소스 form, Web Push browser flow 관리 | UI Application | API 호출은 service 함수로만 수행 |
| `jarvis-frontend/src/services` | directory | backend API boundary | Service | `jarvisApiService`가 `localhost:8011` API 호출 담당 |
| `jarvis-frontend/src/services/jarvisApiService.ts` | file | JWT token 저장/부착, JSON API 호출, API error 생성 | Service | 컴포넌트에서 직접 호출 금지 |
| `jarvis-frontend/src/types` | directory | DTO와 ViewModel 타입 정의 | Contract | API DTO와 UI ViewModel 혼용 금지 |
| `jarvis-frontend/src/types/chat.ts` | file | jarvis-back DTO, enum union, UI ViewModel 정의 | Contract | persistence entity는 정의하지 않음 |
| `jarvis-frontend/src/index.css` | file | 전역 토큰과 reset | Styling | 색상, 폰트, 전역 box model |
| `jarvis-frontend/src/App.css` | file | 워크스페이스 레이아웃과 컴포넌트 스타일 | Styling | 인증 화면, resource view, chat view 포함 |
| `jarvis-frontend/public/web-push-sw.js` | file | 브라우저 Web Push notification service worker | Browser Integration | push 표시와 notification click 처리 |

## 중요한 의존성 메모
- `src/components`는 `src/types`의 ViewModel과 callback type만 의존한다.
- `src/hooks/useChatPage.ts`는 `src/services/jarvisApiService.ts`와 `src/types/chat.ts`에 의존한다.
- `src/services/jarvisApiService.ts`는 browser `fetch`, `ReadableStream`, `localStorage`를 사용한다.
- `public/web-push-sw.js`는 Vite public asset으로 배포되어 browser service worker로 등록된다.

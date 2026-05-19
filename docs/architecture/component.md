# 컴포넌트 및 모듈 문서 - jarvis-front

프로젝트 단위를 어떻게 분리하고 재사용하는지 기록한다.

## 분리 기준
- 공통 단위: 아직 별도 공통 UI 라이브러리는 없다. 반복되는 panel, button, form styling은 CSS class로 공유하고 component 추출은 반복이 커질 때 수행한다.
- 기능 전용 단위: 인증/워크스페이스 화면 컴포넌트는 `src/components`에 두며 `LoginView`, `Sidebar`, `ChatHeader`, `ChatMessageList`, `MessageBubble`, `ChatComposer`, `ReminderReviewView`, `ScheduleReviewView`, `MemoryReviewView`, `ActivityTimelineView`, `SettingsView`, `InsightPanel`로 분리한다.
- Service/Application 단위: `useChatPage`가 인증 상태, 화면 상태, backend service 호출 조합, DTO to ViewModel 변환을 관리한다.
- Repository/Adapter 단위: 프론트엔드 DB adapter는 없다. backend HTTP API 호출은 `jarvisApiService`가 담당한다.
- UI 또는 Presentation 단위: 컴포넌트는 ViewModel props를 표시하고 이벤트를 상위 hook으로 전달한다.

## 계약 규칙
- Props 또는 입력 모델 규칙: 컴포넌트 props는 `src/types/chat.ts`의 ViewModel을 사용한다.
- 출력/result 모델 규칙: service는 backend DTO를 반환하고 hook이 ViewModel로 변환한다.
- 재사용 기준: 특정 JARVIS 도메인 문구와 상태를 직접 포함한 컴포넌트는 기능 전용으로 취급한다.
- 소유 경계: backend API 호출과 access/refresh token 저장, 예약 갱신, 실패 처리는 service가 소유한다.
- 소유 경계: form validation, optimistic message, active view 전환, browser Web Push orchestration은 hook이 소유한다.
- 소유 경계: 화면 표시, disabled 상태, form event 전달은 component가 소유한다.

## 주요 컴포넌트
| Component | Responsibility | Forbidden |
| --- | --- | --- |
| `LoginView` | 로그인 form 표시와 submit intent 전달 | token 저장, API 호출 |
| `Sidebar` | navigation, 세션 목록, 세션 삭제, 로그아웃 intent 표시 | 세션 조회/삭제 직접 호출 |
| `ChatHeader` | active session title과 rename form 표시 | 세션 PATCH 직접 호출 |
| `ChatComposer` | 메시지 입력, quick prompt, Enter 전송과 Shift+Enter 줄바꿈 표시 | chat endpoint 직접 호출 |
| `ReminderReviewView` | 리마인더 생성 form과 취소 버튼 표시 | reminder API 직접 호출 |
| `ScheduleReviewView` | 일정 필터, 생성/수정 form, 삭제 버튼 표시 | schedule API 직접 호출 |
| `MemoryReviewView` | memory 생성/수정 form, 삭제 버튼 표시 | memory API 직접 호출 |
| `ActivityTimelineView` | activity timeline 표시와 refresh intent 전달 | activity API 직접 호출 |
| `SettingsView` | runtime/Web Push 상태와 browser 등록 intent 표시 | subscription 저장 API 직접 호출 |
| `InsightPanel` | 오른쪽 shortcut rail로 주요 view 이동과 상태 shortcut 표시 | source of truth 보관, API 직접 호출 |

## 프로필 메모
- 컴포넌트 안에서 fetch 호출을 직접 수행하지 않는다.
- API 타입과 UI view model의 변환 위치는 hook에 둔다.
- 복잡한 상태 전이는 hook에 둔다.
- backend API 계약은 service와 `src/types/chat.ts` DTO로 표현한다.

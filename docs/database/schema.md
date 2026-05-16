# DB Schema - jarvis-front

- 데이터베이스: 프론트엔드 자체 DB 없음
- Persistent browser storage: `localStorage`에 JWT access token만 저장
- 채팅 세션, 메시지, 리마인더, 일정, 메모리, activity, Web Push subscription의 source of truth는 `jarvis-back`이다.

## Browser Storage
| Key | Type | Required | Default | Index | Unique | Description |
| --- | --- | --- | --- | --- | --- | --- |
| `jarvis.accessToken` | string | no | 없음 | n/a | n/a | `POST /api/v1/auth/login` 응답의 JWT access token. 보호 API Authorization header에 사용 |

## 관계
| From | To | Cardinality | Delete Behavior | Notes |
| --- | --- | --- | --- | --- |
| n/a | n/a | n/a | n/a | 프론트엔드는 relational schema를 소유하지 않는다. |

## Enum 값
| Table | Column | Value | Meaning |
| --- | --- | --- | --- |
| n/a | n/a | n/a | 프론트엔드 DB enum 없음 |

## 인증 관련 테이블
- 프론트엔드는 users, roles, sessions, tokens, audit table을 소유하지 않는다.
- 사용자와 소유권 검사는 `jarvis-back`이 담당한다.

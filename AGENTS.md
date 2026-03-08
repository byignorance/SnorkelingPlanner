# AGENTS.md

## Document Roles
- `AGENTS.md`: 에이전트가 반드시 지켜야 하는 시작 절차와 고정 정책
- `DEVELOPMENT_GUIDELINES.md`: 개발 절차, 검증 기준, 문서 동기화 규칙
- `docs/DOCUMENT_OPERATIONS.md`: 문서별 역할, 우선순위, 갱신 규칙
- `docs/PROJECT_STRUCTURE.md`: 현재 앱 구조, 데이터 흐름, API/환경변수 계약
- `SESSION_HANDOFF_YYYY-MM-DD.md`: 최신 작업 상태와 다음 세션 인수인계
- `README.md`: 사람 기준의 제품 개요, 실행 방법, 배포 요약
- `.cursorrules`: Cursor 계열 도구에서 먼저 읽을 축약 운영 규칙

## Session Start Rules
- 새 Codex 세션은 작업 전 가장 먼저 이 앱 루트의 최신 `SESSION_HANDOFF_YYYY-MM-DD.md` 문서를 읽는다.
- 그다음 `AGENTS.md`, `DEVELOPMENT_GUIDELINES.md`, `docs/DOCUMENT_OPERATIONS.md`, `docs/PROJECT_STRUCTURE.md`, `README.md`, `.env.example`를 읽는다.
- 어떤 구현이나 수정이든 시작 전에 현재 상태를 먼저 요약해야 한다.
- 그 요약에는 반드시 경로 변경 영향 가능성 점검이 포함되어야 한다.
- 최소 점검 항목은 `cwd`, `.env*` 해석 위치, 빌드/개발 서버 스크립트 동작 여부, 절대경로/워크스페이스 의존 문자열 존재 여부다.
- 위 확인이 끝나기 전에는 코드 수정이나 배포 작업을 시작하지 않는다.

## Core Project Policies
- 제품명 기본 표기는 `스노클링 플래너`를 유지한다.
- 추천 API 계약은 현재 코드 기준 필드명 `lat`, `lng`, `date`, `days`, `targetMin`, `targetMax`, `tz`를 우선 보존한다.
- 추천 상태값은 `좋음`, `보통`, `주의`를 유지한다.
- 데이터 소스 실패는 정상적인 운영 케이스로 간주하고, fallback 및 confidence 저하 처리를 제거하지 않는다.
- 비밀값은 커밋하지 않는다. 특히 `WORLD_TIDES_API_KEY`는 서버 전용으로 유지한다.
- 문서 수정 시 실제 코드 계약과 불일치가 생기지 않도록 `src/app/api/recommend/route.ts`와 `src/lib/recommendation.ts`를 기준으로 검토한다.

## Documentation Rules
- 문서에는 특정 로컬 절대경로를 하드코딩하지 않는다. 경로 변경이 있었더라도 상대 경로 또는 파일명 기준으로 유지한다.
- 구조 설명은 `docs/PROJECT_STRUCTURE.md`를 우선 갱신하고, 세션 상태 변화는 최신 `SESSION_HANDOFF_YYYY-MM-DD.md`에 반영한다.
- 개발 절차가 바뀌면 `DEVELOPMENT_GUIDELINES.md`와 `.cursorrules`를 함께 맞춘다.

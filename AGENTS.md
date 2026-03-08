# AGENTS.md

## Session Start Rules
- 새 Codex 세션은 작업 전 가장 먼저 이 앱 루트의 최신 `SESSION_HANDOFF_YYYY-MM-DD.md` 문서를 읽는다.
- 그다음 이 문서, [`README.md`](/Users/sangjoonpark/0_local/main_work_macbook/SnorkelingPlanner/README.md), [`.env.example`](/Users/sangjoonpark/0_local/main_work_macbook/SnorkelingPlanner/.env.example)를 읽는다.
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
- 문서 수정 시 실제 코드 계약과 불일치가 생기지 않도록 [`src/app/api/recommend/route.ts`](/Users/sangjoonpark/0_local/main_work_macbook/SnorkelingPlanner/src/app/api/recommend/route.ts)와 [`src/lib/recommendation.ts`](/Users/sangjoonpark/0_local/main_work_macbook/SnorkelingPlanner/src/lib/recommendation.ts)를 기준으로 검토한다.

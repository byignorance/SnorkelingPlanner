# Session Handoff (2026-03-08)

## 목적
- 로컬 파일 이동 후 새 Codex 세션이 현재 상태를 빠르게 복구하고, 경로 변경 영향까지 먼저 점검할 수 있도록 하는 handoff 문서다.

## 현재 상태
- 앱은 Next.js 14 기반 단일 앱이며, 주요 화면은 `src/app/page.tsx`에 있다.
- UI는 모바일 우선 구조이며 `landing -> input -> result` 흐름으로 구성되어 있다.
- 추천 API는 `src/app/api/recommend/route.ts`에 있고, 쿼리 파라미터 `lat`, `lng`, `date`, `days`, `targetMin`, `targetMax`, `tz`를 받는다.
- 점수 계산 핵심 로직은 `src/lib/recommendation.ts`에 있다.
- 데이터 소스는 Open-Meteo Weather, Open-Meteo Marine, WorldTides 조합이며, 조석 API 키가 없거나 외부 호출이 실패해도 폴백/저신뢰도 응답으로 내려가게 되어 있다.
- 코드 기준 절대 로컬 경로 하드코딩은 현재 발견되지 않았다. 다만 문서는 상대 경로/파일명 기준 유지가 원칙이다.
- 운영 문서 기준은 `AGENTS.md`, `DEVELOPMENT_GUIDELINES.md`, `docs/DOCUMENT_OPERATIONS.md`, `docs/PROJECT_STRUCTURE.md`, `README.md`, 이 handoff 순으로 본다.

## 최근 완료 작업
- 모바일 우선 MVP 화면과 추천 결과 표시 UI가 반영되어 있다.
- 기간 단위 추천(`buildPeriodRecommendation`)과 시간대별 최적 시각 선택 로직이 반영되어 있다.
- 외부 해양/기상 데이터 조회와 실패 시 note/fallback 응답 처리 로직이 반영되어 있다.
- 데이터 레퍼런스 카탈로그와 점수 요인별 상세 설명이 응답 구조에 포함되어 있다.
- 새 세션 인수인계를 위한 handoff/AGENTS 규칙 문서가 추가되었다.
- 빌드를 막던 프런트 타입 오류가 정리되어 `npm run build`가 통과한다.
- 문서 운영 체계를 정리하기 위해 `DEVELOPMENT_GUIDELINES.md`, `docs/*`, `.cursorrules` 기준을 추가했다.

## 명칭 기준
- 제품명 기본 표기는 `스노클링 플래너`로 유지한다.
- 저장소/앱 맥락에서는 `SnorkelingPlanner`를 루트 폴더명으로 사용한다.
- API 필드명은 현재 구현 계약을 유지한다: `lat`, `lng`, `date`, `days`, `targetMin`, `targetMax`, `tz`.
- 추천 상태값은 `좋음`, `보통`, `주의`를 유지한다.
- 주요 factor key는 현재 코드 기준을 유지한다:
  - `tides_and_currents`
  - `wind_speed`
  - `wave_height`
  - `visibility_and_precipitation`
  - `water_and_hazards`
  - `early_morning_bonus`
  - `depth_fit_bonus`
- 외부 데이터 소스 명칭은 문서와 코드에서 가급적 동일하게 쓴다:
  - `Open-Meteo Weather`
  - `Open-Meteo Marine`
  - `WorldTides`

## 우선순위
1. 샘플 좌표로 `/api/recommend`를 호출해 `source_confidence`, note 문구, fallback UX를 검증한다.
2. 문서 체계가 실제 코드와 계속 맞도록 구조/계약 변경 시 `docs/PROJECT_STRUCTURE.md`와 최신 handoff를 함께 갱신한다.
3. README에 적힌 후속 범위 중 우선도가 높은 항목만 순차적으로 진행한다. 후보는 경보/알림 통합, 지오코딩/지도 API 연결, 신뢰도 모델 보정이다.

## 운영/보안 주의사항
- 실제 API 키는 커밋하지 않는다. 특히 `WORLD_TIDES_API_KEY`는 서버 전용으로 유지하고 `NEXT_PUBLIC_` 접두사로 노출하지 않는다.
- 외부 API 실패는 정상 시나리오로 취급해야 한다. route note와 confidence 저하 처리를 깨지 않게 유지한다.
- 배포 환경과 로컬 환경의 `.env` 값이 다를 수 있으므로 경로 이동 후 `.env`, `.env.local`, Vercel 환경변수를 각각 다시 확인한다.
- 현재 UI/CSS는 외부 Google Fonts 및 원격 이미지 URL에 의존한다. 네트워크 차단 환경에서는 일부 시각 요소가 달라질 수 있다.
- 새 세션에서 문서를 갱신할 때는 실제 코드 계약과 문서 설명이 어긋나지 않는지 먼저 확인한다.

## 다음 권장 작업
1. 추천 API를 실좌표 샘플로 호출해 note, confidence, daily summary가 의도대로 나오는지 검증한다.
2. 검증 후 필요하면 에러 상태 UX 또는 데이터 출처 표기 문구를 정리한다.
3. 이후 기능 작업 시 문서 체계도 같이 유지한다.

## 새 세션 시작 절차
1. 가장 먼저 최신 `SESSION_HANDOFF_YYYY-MM-DD.md` 문서를 읽는다.
2. 그다음 `AGENTS.md`, `DEVELOPMENT_GUIDELINES.md`, `docs/DOCUMENT_OPERATIONS.md`, `docs/PROJECT_STRUCTURE.md`, `README.md`, `.env.example`를 읽는다.
3. 작업을 시작하기 전에 현재 상태를 짧게 요약한다. 최소 포함 항목:
   - 현재 구현 범위
   - 아직 검증되지 않은 부분
   - 이번 세션의 우선 작업
4. 같은 요약 안에서 경로 변경 영향 가능성을 함께 점검한다. 최소 확인 항목:
   - 현재 `cwd`가 기대한 앱 루트인지
   - `.env*` 파일 로딩 위치가 바뀌지 않았는지
   - 빌드/실행 스크립트가 새 경로에서도 그대로 동작하는지
   - 절대경로/워크스페이스 의존 문자열이 새로 생기지 않았는지
5. 위 요약과 점검이 끝난 뒤에만 실제 수정 작업을 시작한다.

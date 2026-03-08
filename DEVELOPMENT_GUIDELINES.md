# DEVELOPMENT_GUIDELINES

## 목적
- 스노클링 플래너의 개발 절차와 최소 검증 기준을 정리한 운영 가이드다.
- 현재 구조와 계약 설명은 `docs/PROJECT_STRUCTURE.md`, 세션 상태는 최신 `SESSION_HANDOFF_YYYY-MM-DD.md`를 우선 참고한다.

## 프로젝트 기본 원칙
- 제품명 기본 표기는 `스노클링 플래너`를 유지한다.
- 추천 API 계약 필드명 `lat`, `lng`, `date`, `days`, `targetMin`, `targetMax`, `tz`를 우선 보존한다.
- 추천 상태값 `좋음`, `보통`, `주의`를 유지한다.
- 외부 데이터 소스 실패는 정상 운영 케이스다. fallback 응답과 confidence 저하 처리를 제거하지 않는다.
- `WORLD_TIDES_API_KEY`는 서버 전용으로 유지하고 커밋하지 않는다.

## 시작 체크리스트
1. 최신 `SESSION_HANDOFF_YYYY-MM-DD.md` 읽기
2. `AGENTS.md`, `docs/DOCUMENT_OPERATIONS.md`, `docs/PROJECT_STRUCTURE.md`, `docs/OTHER_COMPUTER_SETUP.md` 확인
3. 현재 상태 요약
4. 경로 변경 영향 확인
   - `cwd`
   - `.env*` 해석 위치
   - `npm run dev`, `npm run build`
   - 절대경로 하드코딩 여부

## 실행과 검증
1. 의존성 설치
```bash
npm install
```
2. 로컬 개발 서버 실행
```bash
npm run dev
```
3. 배포 전 최소 검증
```bash
npm run build
```
4. API 계약이나 점수 로직을 건드렸다면 샘플 좌표 기준으로 `/api/recommend` 응답을 재검증
5. 문서를 바꿨다면 `AGENTS.md`, `DEVELOPMENT_GUIDELINES.md`, `docs/*`, 최신 handoff의 역할 분리가 유지되는지 확인

## 환경변수 기준
- 로컬 개발은 `.env.local` 사용을 우선 권장한다.
- 기본적으로 없어도 동작 가능한 값
  - `WORLD_TIDES_API_KEY`
  - `WORLD_TIDES_API_URL`
  - `OPENMETEO_WEATHER_URL`
  - `OPENMETEO_MARINE_URL`
  - `NEXT_PUBLIC_APP_TITLE`
  - `GOOGLE_MAPS_EMBED_API_KEY`

## 문서 운영 기준
- 사람 대상 개요와 배포 정보는 `README.md`
- 에이전트 시작 규칙과 불변 정책은 `AGENTS.md`
- 앱 구조와 계약 설명은 `docs/PROJECT_STRUCTURE.md`
- 문서 우선순위와 갱신 규칙은 `docs/DOCUMENT_OPERATIONS.md`
- 세션별 상태와 다음 작업은 최신 `SESSION_HANDOFF_YYYY-MM-DD.md`

## 변경 후 동기화 기준
- API 필드명, 상태값, factor key, 환경변수 변화가 생기면 `docs/PROJECT_STRUCTURE.md`를 먼저 갱신
- 개발 절차가 바뀌면 `DEVELOPMENT_GUIDELINES.md`와 `.cursorrules`를 함께 갱신
- 세션 결과와 우선순위가 바뀌면 최신 handoff를 갱신
- 로컬 경로가 바뀌어도 문서에 절대경로를 남기지 않는다

## 다음 개발 우선순위
1. 문서와 환경변수 설명을 현재 코드 기준으로 유지
2. 추천 API 샘플 호출로 note, confidence, fallback UX 검증
3. 이후 기능 작업은 경보/알림, 지도/지오코딩, 신뢰도 모델 보정 순으로 검토

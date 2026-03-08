# OTHER_COMPUTER_SETUP

## 목적
- 다른 컴퓨터에서 저장소를 복제한 직후, 같은 기준으로 개발 세션을 시작하기 위한 체크리스트다.

## 복제 직후 순서
1. 저장소 복제
```bash
git clone https://github.com/byignorance/SnorkelingPlanner.git
cd SnorkelingPlanner
```
2. 의존성 설치
```bash
npm install
```
3. 로컬 환경변수 준비
```bash
cp .env.example .env.local
```
4. 필요한 값 입력
- `WORLD_TIDES_API_KEY`
- 필요 시 `GOOGLE_MAPS_EMBED_API_KEY`
- 기본 URL 값은 특별한 이유가 없으면 그대로 사용

## 세션 시작 전 문서 확인 순서
1. 최신 `SESSION_HANDOFF_YYYY-MM-DD.md`
2. `AGENTS.md`
3. `DEVELOPMENT_GUIDELINES.md`
4. `docs/DOCUMENT_OPERATIONS.md`
5. `docs/PROJECT_STRUCTURE.md`
6. 이 문서
7. `README.md`
8. `.env.example`

## 최초 검증
```bash
npm run build
npm run dev
```

## 시작 요약에 반드시 포함할 것
- 현재 구현 범위
- 아직 검증되지 않은 부분
- 이번 세션의 우선 작업
- 경로 변경 영향 점검
  - `cwd`
  - `.env*` 해석 위치
  - `npm run dev`, `npm run build`
  - 절대경로 하드코딩 여부

## 주의사항
- 제품명은 기본적으로 `스노클링 플래너`
- API 필드명 `lat`, `lng`, `date`, `days`, `targetMin`, `targetMax`, `tz` 유지
- 상태값 `좋음`, `보통`, `주의` 유지
- 외부 데이터 실패는 정상 케이스로 취급
- fallback 및 confidence 저하 처리 제거 금지
- `WORLD_TIDES_API_KEY`는 서버 전용, 커밋 금지

## 추가 권장 사항
- 새 컴퓨터에서 최초 세션을 시작하면 handoff에 해당 환경에서 확인한 결과를 짧게 갱신
- 문서 수정 시 절대경로 대신 상대 경로 또는 파일명 기준으로 작성

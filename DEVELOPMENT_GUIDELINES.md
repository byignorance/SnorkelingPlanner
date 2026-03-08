# DEVELOPMENT_GUIDELINES

## 목적
- 스노클링 플래너의 현재 개발 구조, 필수 계약, 기본 작업 순서를 한 문서에서 빠르게 확인하기 위한 가이드다.

## 프로젝트 기본 원칙
- 제품명 기본 표기는 `스노클링 플래너`를 유지한다.
- 추천 API 계약 필드명 `lat`, `lng`, `date`, `days`, `targetMin`, `targetMax`, `tz`를 우선 보존한다.
- 추천 상태값 `좋음`, `보통`, `주의`를 유지한다.
- 외부 데이터 소스 실패는 정상 운영 케이스다. fallback 응답과 confidence 저하 처리를 제거하지 않는다.
- `WORLD_TIDES_API_KEY`는 서버 전용으로 유지하고 커밋하지 않는다.

## 현재 구조
- 앱 진입 화면: `src/app/page.tsx`
- 글로벌 스타일: `src/app/globals.css`
- 추천 API 라우트: `src/app/api/recommend/route.ts`
- 추천 점수 계산: `src/lib/recommendation.ts`

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

## 환경변수 기준
- 로컬 개발은 `.env.local` 사용을 우선 권장한다.
- 기본적으로 없어도 동작 가능한 값
  - `WORLD_TIDES_API_KEY`
  - `WORLD_TIDES_API_URL`
  - `OPENMETEO_WEATHER_URL`
  - `OPENMETEO_MARINE_URL`
  - `NEXT_PUBLIC_APP_TITLE`
  - `GOOGLE_MAPS_EMBED_API_KEY`

## 문서와 코드 정합성 기준
- 문서 수정 시 실제 계약 기준은 `src/app/api/recommend/route.ts`와 `src/lib/recommendation.ts`다.
- 경로 변경이 있었다면 먼저 다음을 다시 확인한다.
  - 현재 `cwd`
  - `.env*` 해석 위치
  - `npm run dev`, `npm run build`
  - 절대경로 하드코딩 여부

## 다음 개발 우선순위
1. 문서와 환경변수 설명을 현재 코드 기준으로 유지
2. 추천 API 샘플 호출로 note, confidence, fallback UX 검증
3. 이후 기능 작업은 경보/알림, 지도/지오코딩, 신뢰도 모델 보정 순으로 검토

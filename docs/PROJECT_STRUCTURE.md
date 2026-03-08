# PROJECT_STRUCTURE

## 목적
- 현재 스노클링 플래너 앱의 구조와 계약을 코드 기준으로 빠르게 파악하기 위한 문서다.

## 앱 구성
- `src/app/page.tsx`
  - 단일 페이지 UI
  - `landing -> input -> result` 흐름
  - 사용자 입력을 받아 `/api/recommend` 호출
- `src/app/api/recommend/route.ts`
  - 추천 API 엔드포인트
  - 요청 파라미터 검증
  - 외부 데이터 조회
  - fallback note와 confidence 저하를 포함한 응답 구성
- `src/lib/recommendation.ts`
  - 점수 계산 핵심 로직
  - 기간 추천 `buildPeriodRecommendation`
  - factor 점수, 상태값, 메시지 계산
- `src/app/layout.tsx`
  - 메타데이터와 루트 레이아웃
- `src/app/globals.css`
  - 앱 전역 스타일

## API 계약
- 엔드포인트: `/api/recommend`
- 요청 쿼리
  - `lat`
  - `lng`
  - `date`
  - `days`
  - `targetMin`
  - `targetMax`
  - `tz`
- 추천 상태값
  - `좋음`
  - `보통`
  - `주의`

## 주요 factor key
- `tides_and_currents`
- `wind_speed`
- `wave_height`
- `visibility_and_precipitation`
- `water_and_hazards`
- `early_morning_bonus`
- `depth_fit_bonus`

## 데이터 흐름
1. `page.tsx`에서 사용자 입력을 수집
2. `/api/recommend`로 쿼리 전달
3. `route.ts`에서 Open-Meteo Weather, Open-Meteo Marine, WorldTides 조회 시도
4. 데이터 일부 또는 전체가 실패하면 fallback 값과 note 구성
5. `buildPeriodRecommendation`이 기간별 최적 시간과 일별 summary 계산
6. 결과를 프런트에서 period summary, 일별 카드, factor 상세로 렌더링

## 환경변수
- `WORLD_TIDES_API_KEY`
  - 서버 전용
  - 없으면 조석 데이터는 fallback 경로 사용
- `WORLD_TIDES_API_URL`
  - 기본값 `https://www.worldtides.info/api/v3`
- `OPENMETEO_WEATHER_URL`
  - 기본값 `https://api.open-meteo.com/v1/forecast`
- `OPENMETEO_MARINE_URL`
  - 기본값 `https://marine-api.open-meteo.com/v1/marine`
- `NEXT_PUBLIC_APP_TITLE`
  - 기본 제품명 표시용
- `GOOGLE_MAPS_EMBED_API_KEY`
  - 지도/위치 관련 확장 시 사용 가능

## 현재 운영 규칙
- 외부 API 실패는 정상 시나리오다.
- fallback 응답과 confidence 저하 처리를 유지한다.
- 제품명은 `스노클링 플래너`를 기본 표기로 유지한다.
- 문서 수정 시 실제 계약은 `route.ts`와 `recommendation.ts` 기준으로 확인한다.

## 검증 기준
- 기본 검증
  - `npm run dev`
  - `npm run build`
- 구조 또는 계약 변경 후 권장 검증
  - 샘플 좌표로 `/api/recommend` 응답 확인
  - note, usedSources, confidence, daily summary 확인

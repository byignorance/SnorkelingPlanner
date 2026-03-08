# 스노클링 플래너 MVP

스마트폰 우선으로 설계한 스노클링 조건 추천 앱입니다.

현재 구현은 실제 API 기반 점수 계산 + 폴백 경로를 포함합니다.  
`/api/recommend`로 전달되는 값: `lat, lng, date, days, targetMin, targetMax, tz`.

## 실행 방법

```bash
npm install
npm run dev
npm run build
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

로컬 환경변수는 `.env.local`에 두는 것을 권장합니다. 기본값이 있는 항목은 비워 둬도 앱이 실행되지만, `WORLD_TIDES_API_KEY`가 없으면 조석 데이터는 폴백 모델로 계산됩니다.

## 프로젝트 범위

- 현재 위치(또는 좌표), 시작 날짜, 체류일수, 목표 수심 입력
- 조석/조류, 파고, 바람, 강수, 수온 기반 점수 산출
- 이른 아침 정화 가점(0.1~0.15 범위) 반영
- 조위 기반 수심 적합도 가점
- Apple 스타일 모바일 UI(글래스 카드, 대형 점수 표시, 요인별 가중치)
- 지도 링크로 좌표 확인 및 데이터 소스 표시

## 추가 데이터 레퍼런스 반영

1) 조석(밀물·썰물)
- 국가 해양수산청·기상청 조위 관측소 + 조석 조화 모형 + 지역 보정값
- 기준: 조차 1.8m 이하 선호, 3m 이상 주의

2) 조류(해수 흐름)
- 해양수산부 연안 관측망, 항로/해협 예측모델, 해저 지형 수치해양모델
- 기준: 조류 1.0 knots 이하 선호

3) 파고·파주기
- 기상청 연안 파랑 예측, 부이 실측, WAVEWATCH III 계열 모델
- 기준: 0.5m 이하 매우 안정 / 0.5~0.8m 조건부 가능 / 1m 이상은 제외

4) 바람·강수
- 기상청 단기/초단기 예보 + GFS/ECMWF
- 기준: 5m/s 이상 난이도 상승 / 10m/s 이상은 강한 제약

5) 수온
- 연안 부이, SST 위성, 계절 평균
- 기준: 26°C 이상 우수 / 20~25.9°C 보통 / 20°C 미만 주의

6) 수중 시야·해파리
- 지역 적조/탁도/수질 공지, 강수 기반 탁수 위험, 수온 기반 해파리 시즌 추정
- 실시간 가시거리 공식 값은 지역 제한이 있어 가시성은 추정치로 처리

## 필수로 먼저 준비해야 하는 것

1. `WORLD_TIDES_API_KEY` 발급 및 등록  
   - 조석/조차 데이터 소스 보강용
2. `.env.local`에 실행 시 환경변수 등록  
   - `WORLD_TIDES_API_KEY` (없으면 조석은 폴백 모델 사용)
   - `WORLD_TIDES_API_URL` (선택, 기본값 제공)
   - `OPENMETEO_WEATHER_URL` (기본값 제공)
   - `OPENMETEO_MARINE_URL` (기본값 제공)
   - `NEXT_PUBLIC_APP_TITLE` (선택, 기본값 제공)
3. Vercel에 배포 시 동일 환경변수 등록
4. 주소 기반 위치를 쓰려면 지도 서비스 API 키 추가(지오코딩/지도 링크용): `GOOGLE_MAPS_EMBED_API_KEY` 또는 원하는 지도 API

## 최소 API 플로우

- 경도/위도가 들어오면 `fetchProviderStates`에서 기상·해양·조석 API 동시 조회
- 데이터 누락 시 각각 대응 항목을 fallback 모델로 보완
- 페이지는 신뢰도 점수와 노트를 같이 표시

## Vercel 배포 요약

### Vercel 배포 진행 스텝

1. GitHub 저장소 연결 후 푸시
```bash
git push -u origin main
```

2. Vercel에서 저장소 import 후 프로젝트 생성
- 프레임워크: Next.js (자동 감지)
- Node 버전: 18 이상 권장
- 빌드 명령: `npm run build`

3. Environment Variables 등록
   - `WORLD_TIDES_API_KEY`
   - `WORLD_TIDES_API_URL` (선택, 기본값 제공)
   - `OPENMETEO_WEATHER_URL` (선택, 기본값 제공)
   - `OPENMETEO_MARINE_URL` (선택, 기본값 제공)
   - `GOOGLE_MAPS_EMBED_API_KEY` (선택)
   - `NEXT_PUBLIC_APP_TITLE=스노클링 플래너`

4. 배포 후
- 도메인 연결(원하면 custom domain)
- Preview URL 확인
- 모바일에서 위치 접근 권한 테스트

## 다음 작업

- 문서 기준은 `AGENTS.md`, `DEVELOPMENT_GUIDELINES.md`, `SESSION_HANDOFF_2026-03-08.md`를 우선 참고
- 실제 API 연동 완료 시 점수 모델의 `source_confidence`을 실측 가용성에 따라 조정
- 경보/알림(해양안전 경보, 수질 경보, 해파리 주의보) 통합

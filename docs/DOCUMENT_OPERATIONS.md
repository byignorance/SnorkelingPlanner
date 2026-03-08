# DOCUMENT_OPERATIONS

## 목적
- 문서가 중복되거나 충돌하지 않도록 역할과 우선순위를 정리한 운영 기준이다.

## 문서 역할
- `AGENTS.md`
  - 에이전트 시작 절차와 고정 정책
  - 세션 시작 시 반드시 읽어야 하는 규칙
- `DEVELOPMENT_GUIDELINES.md`
  - 개발 절차, 검증 기준, 문서 동기화 기준
- `docs/PROJECT_STRUCTURE.md`
  - 실제 코드 기준의 구조, 데이터 흐름, API 계약, 환경변수
- `docs/OTHER_COMPUTER_SETUP.md`
  - 다른 컴퓨터에서 저장소 복제 후 개발 세션을 여는 초기 절차
- `SESSION_HANDOFF_YYYY-MM-DD.md`
  - 최신 작업 상태, 최근 완료 사항, 다음 우선순위
- `README.md`
  - 사람 기준의 제품 개요, 실행, 배포 요약
- `.cursorrules`
  - Cursor 계열 도구에서 먼저 참조할 축약 규칙

## 우선순위
1. 실제 코드
   - `src/app/api/recommend/route.ts`
   - `src/lib/recommendation.ts`
   - `src/app/page.tsx`
2. `AGENTS.md`
3. `DEVELOPMENT_GUIDELINES.md`
4. `docs/PROJECT_STRUCTURE.md`
5. `docs/OTHER_COMPUTER_SETUP.md`
6. 최신 `SESSION_HANDOFF_YYYY-MM-DD.md`
7. `README.md`
8. `.cursorrules`

## 갱신 규칙
- API 필드명, 상태값, factor key, 환경변수 변경
  - 먼저 코드를 수정
  - 다음 `docs/PROJECT_STRUCTURE.md`
  - 필요 시 `README.md`, `DEVELOPMENT_GUIDELINES.md`, 최신 handoff
- 세션 상태와 우선순위 변경
  - 최신 `SESSION_HANDOFF_YYYY-MM-DD.md` 갱신
- 에이전트 시작 절차 또는 규칙 변경
  - `AGENTS.md`와 `.cursorrules`를 함께 갱신
- 검증 절차 변경
  - `DEVELOPMENT_GUIDELINES.md` 갱신
- 다른 컴퓨터 시작 절차 변경
  - `docs/OTHER_COMPUTER_SETUP.md`와 `AGENTS.md`, `.cursorrules`를 함께 갱신

## 작성 원칙
- 문서에는 로컬 절대경로를 남기지 않는다.
- 코드 계약 설명은 추상적 표현보다 실제 필드명과 파일명을 우선 사용한다.
- 시점 의존 정보는 handoff에 두고, 구조 의존 정보는 `docs/PROJECT_STRUCTURE.md`에 둔다.
- README는 외부 협업자도 이해할 수 있는 수준의 개요와 실행법에 집중한다.

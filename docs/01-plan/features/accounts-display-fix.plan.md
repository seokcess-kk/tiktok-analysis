# Plan Document: accounts-display-fix

## 개요

| 항목 | 내용 |
|------|------|
| **기능명** | accounts-display-fix |
| **작성일** | 2026-02-11 |
| **작성자** | Claude Opus 4.5 |
| **레벨** | Dynamic |
| **우선순위** | High |

---

## 문제 정의

### 이슈 1: ROAS 숫자 포맷팅 누락
- **위치**: `src/app/(dashboard)/accounts/page.tsx:409`
- **현상**: ROAS 값이 자릿수 구분 없이 원시값 그대로 표시됨
- **예시**: `3.156789123x` → `3.16x`로 표시되어야 함

### 이슈 2: 광고계정 선택 시 인사이트/전략 미노출
- **위치**: `src/app/(dashboard)/accounts/[accountId]/page.tsx`
- **현상**: 계정 선택 후 대시보드에서 인사이트와 전략이 표시되지 않음
- **원인 추정**:
  1. API 응답 데이터 없음
  2. Mock 데이터로 fallback 되지 않음
  3. API endpoint 경로 불일치

---

## 목표

1. ✅ ROAS 값을 소수점 2자리로 포맷팅
2. ✅ 광고계정 대시보드에서 인사이트/전략 정상 노출

---

## 구현 범위

### FR-01: ROAS 포맷팅 수정
- [ ] `accounts/page.tsx` ROAS 표시 부분에 `.toFixed(2)` 적용
- [ ] 평균 ROAS 카드에도 일관된 포맷 적용 확인

### FR-02: 인사이트/전략 API 연동 확인
- [ ] API endpoint 확인: `/api/ai/insights/{accountId}`, `/api/ai/strategies/{accountId}`
- [ ] API 응답 구조 확인
- [ ] 데이터 매핑 로직 검증
- [ ] 필요 시 API 또는 컴포넌트 수정

---

## 기술 스택

- Next.js 14 (App Router)
- TypeScript
- React

---

## 파일 목록

| 파일 | 작업 |
|------|------|
| `src/app/(dashboard)/accounts/page.tsx` | ROAS 포맷팅 수정 |
| `src/app/(dashboard)/accounts/[accountId]/page.tsx` | 인사이트/전략 데이터 확인 |
| `src/app/api/ai/insights/[accountId]/route.ts` | API 확인 |
| `src/app/api/ai/strategies/[accountId]/route.ts` | API 확인 |

---

## 예상 작업량

- 코드 수정: 간단 (10분 이내)
- 테스트: 수동 검증 필요

---

## 체크리스트

- [ ] ROAS 포맷 수정
- [ ] 인사이트 API 확인
- [ ] 전략 API 확인
- [ ] 수동 테스트
- [ ] 커밋

---

## 다음 단계

1. `/pdca design accounts-display-fix` (필요 시)
2. `/pdca do accounts-display-fix` 로 구현 시작

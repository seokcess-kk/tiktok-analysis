# Plan: AI 인사이트 및 전략 기능 개선

**Feature**: ai-insight-strategy-enhancement
**Created**: 2026-02-12
**Status**: ✅ Archived (PDCA 완료 - 이미 100% 구현됨)

---

## 1. 배경 및 목적

### 1.1 현재 상태

AI 인사이트 및 전략 기능이 80% 구현되어 있으나, 사용자 경험 측면에서 개선이 필요한 부분이 있습니다.

**구현된 기능:**
- ✅ 인사이트 생성/조회 API
- ✅ 전략 생성/조회/상태변경 API
- ✅ 자동 일일 크론 작업 (Daily Insights)
- ✅ OpenAI GPT-4o 통합
- ✅ 규칙 기반 폴백 모드
- ✅ UI 대시보드 (계정 레벨)

**미구현/개선 필요:**
- ❌ 캠페인 레벨 인사이트/전략 생성 API
- ❌ 인사이트-전략 자동 연결
- ❌ 사용자 알림 시스템
- ❌ Anomaly Detection Job 완성
- ❌ 광고그룹/광고 레벨에서 인사이트 접근

### 1.2 목적

1. 캠페인 레벨에서 AI 인사이트/전략을 생성하고 조회할 수 있게 함
2. 광고그룹/광고 상세 페이지에서도 관련 인사이트에 접근 가능하게 함
3. 인사이트 기반 전략 자동 생성 연결
4. 전체적인 AI 기능 접근성 개선

---

## 2. 요구사항

### 2.1 기능 요구사항

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-01 | 캠페인 레벨 인사이트 생성 API 구현 | High |
| FR-02 | 캠페인 레벨 전략 생성 API 구현 | High |
| FR-03 | 캠페인 대시보드에서 인사이트/전략 카드 표시 | High |
| FR-04 | 광고그룹 상세에서 관련 인사이트 표시 | Medium |
| FR-05 | 인사이트 기반 전략 자동 생성 | Medium |
| FR-06 | 인사이트/전략 요약 위젯 (계정 대시보드) | Low |

### 2.2 비기능 요구사항

| ID | 요구사항 | 목표 |
|----|----------|------|
| NFR-01 | 인사이트 생성 응답시간 | < 10초 (OpenAI 호출 포함) |
| NFR-02 | UI 로딩 상태 표시 | 명확한 진행률 표시 |
| NFR-03 | 에러 핸들링 | OpenAI 실패 시 폴백 |

---

## 3. 범위

### 3.1 포함 (In Scope)

1. **캠페인 레벨 API 완성**
   - `POST /api/ai/insights/{accountId}/campaigns/{campaignId}/generate`
   - `POST /api/ai/strategies/{accountId}/campaigns/{campaignId}/generate`

2. **캠페인 대시보드 개선**
   - AI 인사이트 요약 카드 (클릭 시 상세 페이지 이동)
   - AI 전략 요약 카드
   - 인사이트/전략 생성 버튼

3. **광고그룹 상세 페이지 개선**
   - 관련 캠페인 인사이트 표시
   - "인사이트 보기" 링크

4. **기존 컴포넌트 재사용**
   - `InsightCard` 컴포넌트 활용
   - `StrategyCard` 컴포넌트 활용

### 3.2 제외 (Out of Scope)

1. 사용자 알림 시스템 (별도 기능으로 분리)
2. Anomaly Detection 크론 작업 개선
3. 소재(Creative) 레벨 AI 분석
4. 전략 실행 결과 추적 시스템

---

## 4. 기술적 접근

### 4.1 캠페인 레벨 API

기존 계정 레벨 API 로직을 참고하여 캠페인별 데이터 수집 및 분석:

```typescript
// 데이터 수집 범위
- 특정 캠페인의 7일 메트릭
- 해당 캠페인의 광고그룹별 성과
- 해당 캠페인의 Top 크리에이티브
```

### 4.2 UI 컴포넌트 재사용

```
기존 컴포넌트:
├── InsightCard (src/components/ai/insight-card.tsx)
├── StrategyCard (src/components/ai/strategy-card.tsx)
└── Skeleton Loader

새로 필요한 컴포넌트:
├── InsightSummaryCard (간단한 요약 카드)
└── StrategySummaryCard (간단한 요약 카드)
```

### 4.3 데이터 흐름

```
캠페인 대시보드
    ↓
[인사이트 생성] 버튼 클릭
    ↓
POST /api/ai/insights/{accountId}/campaigns/{campaignId}/generate
    ↓
캠페인별 메트릭 수집 → OpenAI 분석 → DB 저장
    ↓
UI 새로고침 → 인사이트 카드 표시
```

---

## 5. 구현 계획

### Phase 1: 캠페인 레벨 API (우선)

1. 캠페인별 인사이트 생성 API 구현
2. 캠페인별 전략 생성 API 구현
3. API 테스트 및 검증

### Phase 2: 캠페인 대시보드 UI

1. 인사이트/전략 요약 카드 추가
2. 생성 버튼 및 로딩 상태
3. 기존 인사이트/전략 페이지 연결

### Phase 3: 광고그룹 페이지 연동

1. 관련 캠페인 인사이트 표시
2. 인사이트 페이지 링크

---

## 6. 리스크 및 완화 방안

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| OpenAI API 비용 증가 | 중간 | 캠페인당 생성 횟수 제한 (일 1회) |
| OpenAI API 장애 | 중간 | 규칙 기반 폴백 활용 |
| 응답 시간 지연 | 낮음 | 로딩 상태 명확히 표시 |

---

## 7. 성공 기준

- [ ] 캠페인 레벨에서 인사이트 생성 가능
- [ ] 캠페인 레벨에서 전략 생성 가능
- [ ] 캠페인 대시보드에서 AI 카드 표시
- [ ] 기존 기능과의 일관성 유지
- [ ] 빌드 및 타입 체크 통과

---

## 8. 관련 문서

- 기존 AI 모듈: `src/lib/ai/`
- 인사이트 API: `src/app/api/ai/insights/`
- 전략 API: `src/app/api/ai/strategies/`
- 캠페인 대시보드: `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/page.tsx`

---

*Created by bkit PDCA plan phase*

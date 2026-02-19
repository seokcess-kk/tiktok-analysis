# Plan: analytics-enhancement

> 광고 성과 분석 고도화 - 지표 표준화, 세그먼트 분류, 소재 매트릭스, 조기경보 시스템

## 1. 개요

### 1.1 배경

현재 시스템의 광고 성과 분석은 다음과 같은 한계가 있습니다:

| 현재 상태 | 문제점 |
|-----------|--------|
| ROAS 계산이 하드코딩 가정값(50,000원) 기반 | 실제 매출과 괴리, 의사결정 신뢰도 낮음 |
| 광고 목록은 spend 정렬만 제공 | 액션 가능한 세그먼트(Scale/Kill 등) 없음 |
| 소재 성과와 피로도가 분리되어 있음 | 통합 의사결정 매트릭스 부재 |
| 사후 분석 중심 | 선제적 조기경보/예측 기능 없음 |

### 1.2 목표

**정량적 목표:**
- 지표 계산 일관성: 100% (분산된 ROAS 계산을 단일 모듈로 통합)
- 광고 세그먼트 커버리지: 모든 활성 광고에 라벨 부여
- 조기경보 선행 시간: 성과 하락 3일 전 감지

**정성적 목표:**
- 마케터가 "어떤 광고를 스케일/중단할지" 즉시 판단 가능
- 소재 교체 우선순위 명확화
- 예산 재배분 의사결정 근거 제공

### 1.3 범위

**포함 (In Scope):**
- Phase 1: 지표 계산 표준화 모듈
- Phase 2: 광고 액션 세그먼트 API
- Phase 3: 소재 성과×피로도 매트릭스
- Phase 4: 조기경보 시스템

**제외 (Out of Scope):**
- 외부 매출 데이터 연동 (GA4, 자사몰 DB 등) → 별도 프로젝트
- A/B 테스트 프레임워크 자체 구축 → TikTok 기능 활용
- 예산 자동 변경 API 연동 → 추천까지만 (실행은 수동)

---

## 2. 요구사항

### 2.1 기능 요구사항

#### FR-01: 지표 계산 표준화

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-01-1 | `computeMetrics()` 공통 모듈 생성 (ROAS, CPA, CTR, CVR 등) | HIGH |
| FR-01-2 | 모든 API에서 하드코딩 계산식 제거, 공통 모듈 사용 | HIGH |
| FR-01-3 | 계정별 `conversionValue` 설정 지원 (Account 모델 확장) | MEDIUM |
| FR-01-4 | 응답에 `valueSource: 'estimated' \| 'configured'` 필드 추가 | MEDIUM |
| FR-01-5 | 값 미존재 시 fallback 규칙 명시 (null 또는 추정치) | LOW |

#### FR-02: 광고 액션 세그먼트

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-02-1 | 광고별 세그먼트 라벨 계산 (Scale/Hold/Kill/Test) | HIGH |
| FR-02-2 | 최소 표본 임계치 적용 (노출/클릭 하한) | HIGH |
| FR-02-3 | 세그먼트 규칙 임계값 설정화 (config.ts) | MEDIUM |
| FR-02-4 | `/ads/analysis` API 엔드포인트 생성 | HIGH |
| FR-02-5 | 응답에 `label`, `confidence`, `reasons[]`, `nextAction` 포함 | MEDIUM |

#### FR-03: 소재 성과×피로도 매트릭스

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-03-1 | creative-scorer + fatigue-calculator 결합 로직 | HIGH |
| FR-03-2 | 4분면 매트릭스 분류 (Scale/Refresh/Test/Kill) | HIGH |
| FR-03-3 | `/creatives/matrix` API 엔드포인트 생성 | MEDIUM |
| FR-03-4 | 교체 우선순위 점수 계산 | MEDIUM |

#### FR-04: 조기경보 시스템

| ID | 요구사항 | 우선순위 |
|----|----------|:--------:|
| FR-04-1 | 리스크 스코어 계산 (slope + 성과 하락 결합) | HIGH |
| FR-04-2 | 하락 추세 감지 알고리즘 (최근 N일 기반) | HIGH |
| FR-04-3 | daily-insights job에 경보 생성 로직 추가 | MEDIUM |
| FR-04-4 | AIInsight(type: ANOMALY/TREND)로 저장 | MEDIUM |
| FR-04-5 | 예산 재배분 추천 AIStrategy 자동 발행 | LOW |

### 2.2 비기능 요구사항

| ID | 요구사항 | 기준 |
|----|----------|------|
| NFR-01 | 지표 계산 성능 | 1000개 광고 세그먼트 분류 < 3초 |
| NFR-02 | API 응답 크기 | 세그먼트 응답 < 100KB (압축 전) |
| NFR-03 | 설정 유연성 | 모든 임계값 config.ts에서 조정 가능 |
| NFR-04 | 하위 호환성 | 기존 API 응답 구조 유지 (필드 추가만) |

---

## 3. 기술 설계

### 3.1 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
├─────────────────────────────────────────────────────────────┤
│  /campaigns/.../ads/analysis    /creatives/matrix           │
│  /accounts/.../metrics          /jobs/daily-insights        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Analytics Layer (NEW)                      │
├─────────────────────────────────────────────────────────────┤
│  metrics-calculator.ts    ad-segmenter.ts                   │
│  creative-matrix.ts       early-warning.ts                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Existing Modules                           │
├─────────────────────────────────────────────────────────────┤
│  fatigue-calculator.ts    creative-scorer.ts    config.ts   │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 신규 파일 구조

```
src/lib/analytics/
├── metrics-calculator.ts    # 지표 계산 표준화 모듈
├── ad-segmenter.ts          # 광고 세그먼트 분류
├── creative-matrix.ts       # 소재 매트릭스 분석
├── early-warning.ts         # 조기경보 시스템
└── index.ts                 # 통합 export

src/app/api/
├── accounts/[accountId]/campaigns/[campaignId]/
│   └── ads/
│       └── analysis/
│           └── route.ts     # 광고 세그먼트 분석 API
└── creatives/
    └── matrix/
        └── route.ts         # 소재 매트릭스 API
```

### 3.3 데이터 모델 확장

```prisma
// Account 모델 확장
model Account {
  // ... 기존 필드
  conversionValue    Float?    // 계정별 전환 가치 설정
  segmentThresholds  Json?     // 세그먼트 임계값 오버라이드
}
```

### 3.4 설정 확장 (config.ts)

```typescript
export const config = {
  // ... 기존 설정

  analytics: {
    // 지표 계산
    defaultConversionValue: 50000,

    // 세그먼트 임계값
    segment: {
      minImpressions: 1000,      // 최소 노출수
      minClicks: 50,             // 최소 클릭수
      scaleRoasThreshold: 2.0,   // Scale 기준 ROAS
      killRoasThreshold: 0.5,    // Kill 기준 ROAS
      holdCpaVariance: 0.2,      // Hold 기준 CPA 변동폭
    },

    // 조기경보
    earlyWarning: {
      lookbackDays: 7,           // 추세 분석 기간
      slopeThreshold: -0.1,      // 하락 기울기 임계값
      riskScoreHigh: 70,         // 고위험 기준
      riskScoreMedium: 40,       // 중위험 기준
    },
  },
};
```

---

## 4. 구현 계획

### 4.1 Phase 구성

| Phase | 내용 | 예상 작업량 | 의존성 |
|-------|------|:-----------:|--------|
| Phase 1 | 지표 계산 표준화 | 4-6시간 | 없음 |
| Phase 2 | 광고 세그먼트 | 4-6시간 | Phase 1 |
| Phase 3 | 소재 매트릭스 | 2-3시간 | Phase 1 |
| Phase 4 | 조기경보 시스템 | 3-4시간 | Phase 1, 2 |

### 4.2 Phase 1: 지표 계산 표준화

**작업 항목:**
1. `src/lib/analytics/metrics-calculator.ts` 생성
   - `computeRoas(spend, conversionValue)`
   - `computeCpa(spend, conversions)`
   - `computeCtr(clicks, impressions)`
   - `computeCvr(conversions, clicks)`
   - `computeAllMetrics(rawData, conversionValue)`

2. `prisma/schema.prisma` Account 모델 확장
   - `conversionValue Float?` 필드 추가

3. 기존 API 수정 (하드코딩 제거)
   - `campaigns/route.ts`
   - `campaigns/[campaignId]/route.ts`
   - `campaigns/[campaignId]/metrics/route.ts`
   - `adgroups/route.ts`
   - `ads/route.ts`

4. 응답에 `valueSource` 필드 추가

### 4.3 Phase 2: 광고 세그먼트

**작업 항목:**
1. `src/lib/analytics/ad-segmenter.ts` 생성
   - `segmentAd(metrics, thresholds)`
   - `batchSegmentAds(adList, thresholds)`
   - 라벨: `SCALE` | `HOLD` | `KILL` | `TEST`

2. `config.ts` 세그먼트 임계값 추가

3. `/ads/analysis/route.ts` API 생성
   - 7/14/30일 기간별 분석
   - 최소 표본 필터링
   - 응답: `{ ads: [{ id, label, confidence, reasons, nextAction }] }`

### 4.4 Phase 3: 소재 매트릭스

**작업 항목:**
1. `src/lib/analytics/creative-matrix.ts` 생성
   - `computeMatrixPosition(performanceScore, fatigueIndex)`
   - 4분면: `SCALE` (고효율+저피로), `REFRESH` (고효율+고피로), `TEST` (저효율+저피로), `KILL` (저효율+고피로)

2. `creative-scorer.ts` + `fatigue-calculator.ts` 결합 로직

3. `/creatives/matrix/route.ts` API 생성

### 4.5 Phase 4: 조기경보

**작업 항목:**
1. `src/lib/analytics/early-warning.ts` 생성
   - `computeRiskScore(metrics, fatigueData)`
   - `detectDeclineTrend(dailyMetrics)`
   - `generateWarnings(accountId)`

2. `daily-insights/route.ts` 수정
   - 조기경보 생성 로직 추가

3. AIInsight/AIStrategy 자동 발행 로직

---

## 5. 성공 기준

### 5.1 완료 조건

| 기준 | 측정 방법 |
|------|----------|
| 지표 계산 통합 | 모든 API에서 `metrics-calculator` 사용 확인 |
| 세그먼트 분류 | 샘플 계정의 모든 활성 광고에 라벨 부여 |
| 매트릭스 분류 | 소재별 4분면 위치 정확히 계산 |
| 조기경보 작동 | 테스트 데이터로 하락 추세 감지 확인 |

### 5.2 테스트 시나리오

1. **지표 계산 테스트**
   - 동일 데이터로 기존/신규 계산 결과 비교
   - `conversionValue` 설정값 반영 확인

2. **세그먼트 테스트**
   - 고ROAS 광고 → SCALE 라벨
   - 저ROAS 광고 → KILL 라벨
   - 표본 부족 광고 → TEST 라벨

3. **조기경보 테스트**
   - 하락 추세 데이터 → 경보 생성 확인
   - 안정 추세 데이터 → 경보 미생성 확인

---

## 6. 리스크 및 대응

| 리스크 | 영향 | 대응 방안 |
|--------|------|----------|
| 기존 API 응답 변경으로 인한 호환성 문제 | 중간 | 필드 추가만, 기존 필드 제거 금지 |
| 세그먼트 임계값이 비즈니스에 안 맞음 | 낮음 | config.ts 설정화로 쉬운 조정 |
| 조기경보 오탐 (과도한 경보) | 중간 | 보수적 임계값으로 시작, 점진적 조정 |

---

## 7. 일정

| 단계 | 예상 완료 |
|------|----------|
| Plan 승인 | Day 0 |
| Design 문서 | Day 1 |
| Phase 1 구현 | Day 2 |
| Phase 2 구현 | Day 3 |
| Phase 3 구현 | Day 3 |
| Phase 4 구현 | Day 4 |
| Gap 분석 및 완료 | Day 4 |

---

## 8. 참조

- 기존 분석 모듈: `src/lib/analytics/fatigue-calculator.ts`, `creative-scorer.ts`
- 설정 파일: `src/lib/config.ts`
- 관련 API: `src/app/api/accounts/[accountId]/campaigns/...`

# Plan: Mock 데이터 → 실제 데이터 전환

## 개요

| 항목 | 내용 |
|------|------|
| **기능명** | real-data-integration |
| **목표** | 모든 Mock 데이터를 실제 API 데이터로 교체하여 실제 TikTok 광고 성과 확인 |
| **우선순위** | HIGH |
| **예상 범위** | 5개 파일 수정 |

---

## 현재 Mock 데이터 사용 현황

### 1. 대시보드 페이지 (`accounts/[accountId]/page.tsx`)
- **위치**: 63-151줄 `mockDashboardData`
- **사용 방식**: API 실패 시 fallback
- **Mock 데이터**:
  - 계정 정보 (id: '1', name: '브랜드 A')
  - KPI 지표 (spend, impressions, clicks, conversions, ctr, cvr, cpa, roas)
  - 14일 차트 데이터 (랜덤 생성)
  - 3개 샘플 인사이트
  - 2개 샘플 전략

### 2. 소재 분석 페이지 (`accounts/[accountId]/creatives/page.tsx`)
- **위치**: 11-189줄 `mockCreatives`, `mockFatigueOverview`, `mockGradeDistribution`
- **사용 방식**: API 데이터 없을 때 fallback
- **Mock 데이터**:
  - 5개 샘플 소재 (비디오/이미지)
  - 성과 점수 및 등급 (S, A, B, D)
  - 피로도 지수 및 트렌드
  - 등급 분포 통계

### 3. 인사이트 페이지 (`accounts/[accountId]/insights/page.tsx`)
- **위치**: 10-189줄 `mockInsights`, `mockAnomalies`
- **사용 방식**: 초기 상태 및 API 실패 시 fallback
- **Mock 데이터**:
  - 5개 상세 인사이트 (ANOMALY, DAILY_SUMMARY, CREATIVE, TREND, PREDICTION)
  - 2개 이상징후 알림 (CPA_SPIKE, CTR_DROP)

### 4. AI Fallback 모듈 (`lib/ai/fallback.ts`)
- **위치**: 54-275줄
- **사용 방식**: OpenAI API 키 없을 때 rule-based 생성
- **상태**: ✅ 유지 필요 (API 없을 때 fallback용)

### 5. Seed API (`api/seed/insights/route.ts`)
- **위치**: 39-186줄
- **사용 방식**: 개발/데모 환경에서 샘플 데이터 생성
- **상태**: ✅ 유지 필요 (production에서는 비활성화됨)

---

## 수정 계획

### Phase 1: 대시보드 실제 데이터 연동 (핵심)

**파일**: `src/app/(dashboard)/accounts/[accountId]/page.tsx`

1. **계정 정보**: API에서 가져온 데이터 사용 (이미 일부 구현됨)
2. **KPI 데이터**: `/api/accounts/[accountId]/metrics` 응답 활용 (이미 구현됨)
3. **인사이트/전략**: `/api/ai/insights`, `/api/ai/strategies` 응답 활용 (이미 구현됨)
4. **Mock 데이터 역할 변경**:
   - 현재: 초기값 + fallback
   - 변경: 로딩 스켈레톤으로 대체, 에러 시 "데이터 없음" 메시지 표시

**수정 사항**:
```typescript
// Before: Mock 데이터를 초기값으로 사용
const [data, setData] = useState<DashboardData | null>(mockDashboardData);

// After: null로 시작, 로딩 상태 표시
const [data, setData] = useState<DashboardData | null>(null);
```

### Phase 2: 소재 분석 실제 데이터 연동

**파일**: `src/app/(dashboard)/accounts/[accountId]/creatives/page.tsx`

1. **소재 목록**: `/api/creatives/[accountId]` 이미 호출 중
2. **피로도 데이터**: `/api/creatives/[accountId]/fatigue` 이미 호출 중
3. **Mock 데이터 제거**: 에러 시 빈 상태 UI 표시

**수정 사항**:
- Mock 상수 제거
- 빈 데이터 상태 UI 개선 (Empty State 컴포넌트)
- 에러 상태 명확한 메시지 표시

### Phase 3: 인사이트 페이지 실제 데이터 연동

**파일**: `src/app/(dashboard)/accounts/[accountId]/insights/page.tsx`

1. **인사이트 목록**: `/api/ai/insights/[accountId]` 이미 호출 중
2. **이상징후 데이터**: 인사이트 중 ANOMALY 타입 필터링
3. **Mock 데이터 제거**: 초기 상태를 빈 배열로 변경

**수정 사항**:
```typescript
// Before
const [insights, setInsights] = useState<Insight[]>(mockInsights);

// After
const [insights, setInsights] = useState<Insight[]>([]);
```

---

## 데이터 흐름 확인

### 현재 API 엔드포인트 상태

| 엔드포인트 | 상태 | 설명 |
|-----------|:----:|------|
| `GET /api/accounts` | ✅ | 계정 목록 |
| `GET /api/accounts/[accountId]` | ✅ | 계정 상세 |
| `GET /api/accounts/[accountId]/metrics` | ✅ | 성과 지표 |
| `GET /api/accounts/[accountId]/campaigns` | ✅ | 캠페인 목록 |
| `GET /api/creatives/[accountId]` | ✅ | 소재 목록 |
| `GET /api/creatives/[accountId]/fatigue` | ✅ | 피로도 데이터 |
| `GET /api/ai/insights/[accountId]` | ✅ | AI 인사이트 |
| `GET /api/ai/strategies/[accountId]` | ✅ | AI 전략 |

### 데이터 존재 여부 확인 필요

실제 데이터로 전환 전 확인 사항:
1. PerformanceMetric 테이블에 데이터 존재 여부
2. Creative 테이블에 데이터 존재 여부
3. CreativeFatigue 테이블에 데이터 존재 여부
4. AIInsight/AIStrategy 테이블에 데이터 존재 여부

---

## Empty State UI 설계

Mock 데이터 제거 후 데이터가 없을 때 표시할 UI:

### 1. 대시보드 Empty State
```
┌─────────────────────────────────────┐
│  📊 데이터 동기화가 필요합니다      │
│                                     │
│  TikTok에서 데이터를 가져오려면     │
│  [동기화 시작] 버튼을 클릭하세요    │
│                                     │
│         [동기화 시작]               │
└─────────────────────────────────────┘
```

### 2. 소재 분석 Empty State
```
┌─────────────────────────────────────┐
│  🎨 분석할 소재가 없습니다          │
│                                     │
│  TikTok 광고 소재를 동기화하면      │
│  성과 분석이 시작됩니다             │
│                                     │
│      [소재 동기화]                  │
└─────────────────────────────────────┘
```

### 3. 인사이트 Empty State
```
┌─────────────────────────────────────┐
│  💡 인사이트가 아직 없습니다        │
│                                     │
│  성과 데이터가 쌓이면               │
│  AI가 자동으로 인사이트를 생성합니다│
│                                     │
│  [인사이트 생성] (수동)             │
└─────────────────────────────────────┘
```

---

## 우선순위 및 작업 순서

| 순서 | 작업 | 파일 | 복잡도 |
|:----:|------|------|:------:|
| 1 | Empty State 공통 컴포넌트 생성 | `components/common/empty-state.tsx` | 낮음 |
| 2 | 대시보드 Mock 제거 & Empty State 적용 | `accounts/[accountId]/page.tsx` | 중간 |
| 3 | 소재 분석 Mock 제거 & Empty State 적용 | `accounts/[accountId]/creatives/page.tsx` | 중간 |
| 4 | 인사이트 Mock 제거 & Empty State 적용 | `accounts/[accountId]/insights/page.tsx` | 중간 |
| 5 | 데이터 동기화 상태 확인 로직 추가 | 각 페이지 | 낮음 |

---

## 유지할 항목

다음 항목들은 **제거하지 않고 유지**:

1. **`lib/ai/fallback.ts`**: OpenAI API 없을 때 rule-based 인사이트 생성
2. **`api/seed/insights/route.ts`**: 개발/테스트 환경용 (production에서 비활성화됨)
3. **로딩 스켈레톤**: `DashboardSkeleton` 등 기존 로딩 UI

---

## 성공 기준

- [ ] Mock 데이터 상수 제거 (3개 페이지)
- [ ] Empty State 컴포넌트 생성 및 적용
- [ ] API 실패 시 적절한 에러 메시지 표시
- [ ] 실제 데이터로 대시보드 정상 렌더링
- [ ] 데이터 없을 때 동기화 유도 UI 표시

---

## 참고 사항

- TikTok API 동기화가 완료된 계정에서만 실제 데이터 확인 가능
- AI 인사이트는 OpenAI API 키가 있거나, fallback 로직으로 생성 가능
- 소재 피로도는 일정 기간 데이터 축적 후 계산 가능

# Design: Mock 데이터 → 실제 데이터 전환

## 개요

| 항목 | 내용 |
|------|------|
| **기능명** | real-data-integration |
| **Plan 문서** | [real-data-integration.plan.md](../../01-plan/features/real-data-integration.plan.md) |
| **설계일** | 2026-02-12 |

---

## 현재 상태 분석

### 이미 구현된 항목 ✅

1. **EmptyState 컴포넌트** (`src/components/common/empty-state.tsx`)
   - `EmptyState` - 기본 빈 상태 UI
   - `NoDataFound` - 데이터 없음 프리셋
   - `ErrorState` - 에러 상태 프리셋

2. **대시보드 초기 상태** (`accounts/[accountId]/page.tsx:157`)
   ```typescript
   const [data, setData] = useState<DashboardData | null>(null);
   ```
   - 이미 `null`로 초기화됨 (Mock이 초기값이 아님)

3. **API 연동** - 모든 페이지에서 API 호출 구현 완료

### 제거해야 할 Mock 데이터

| 파일 | 위치 | 변수명 | 줄 수 |
|------|------|--------|:-----:|
| `accounts/[accountId]/page.tsx` | 63-151 | `mockDashboardData` | 89줄 |
| `accounts/[accountId]/creatives/page.tsx` | 11-189 | `mockCreatives`, `mockFatigueOverview`, `mockGradeDistribution` | 179줄 |
| `accounts/[accountId]/insights/page.tsx` | 10-189 | `mockInsights`, `mockAnomalies` | 180줄 |

---

## 상세 설계

### 1. 대시보드 페이지 수정

**파일**: `src/app/(dashboard)/accounts/[accountId]/page.tsx`

#### 1.1 Mock 데이터 제거
```typescript
// 삭제: 63-151줄의 mockDashboardData 상수 전체
```

#### 1.2 에러 시 Empty State 표시
```typescript
// 기존 (315-317줄)
} catch (err) {
  console.error('Dashboard fetch error:', err);
  setData(mockDashboardData);  // ❌ Mock 사용
}

// 변경
} catch (err) {
  console.error('Dashboard fetch error:', err);
  setError('데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.');
  setData(null);  // ✅ null 유지
}
```

#### 1.3 데이터 없음 UI 처리
```typescript
// 에러 상태 이후에 추가
if (!data && !loading) {
  return (
    <div className="space-y-6">
      <NoDataFound
        title="성과 데이터가 없습니다"
        description="TikTok에서 데이터를 동기화하면 대시보드에 표시됩니다."
        action={{
          label: '데이터 동기화',
          onClick: () => router.push(`/accounts/${accountId}/settings`)
        }}
      />
    </div>
  );
}
```

---

### 2. 소재 분석 페이지 수정

**파일**: `src/app/(dashboard)/accounts/[accountId]/creatives/page.tsx`

#### 2.1 Mock 데이터 제거
```typescript
// 삭제: 11-189줄의 mockCreatives, mockFatigueOverview, mockGradeDistribution 전체
```

#### 2.2 상태 초기화 변경
```typescript
// 기존
const [creatives, setCreatives] = useState<Creative[]>(mockCreatives);
const [fatigueOverview, setFatigueOverview] = useState(mockFatigueOverview);
const [gradeDistribution, setGradeDistribution] = useState(mockGradeDistribution);

// 변경
const [creatives, setCreatives] = useState<Creative[]>([]);
const [fatigueOverview, setFatigueOverview] = useState<FatigueOverview | null>(null);
const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution | null>(null);
```

#### 2.3 타입 정의 추가
```typescript
interface FatigueOverview {
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
  exhaustedCount: number;
  avgLifespan: number;
}

interface GradeDistribution {
  S: number;
  A: number;
  B: number;
  C: number;
  D: number;
  F: number;
}
```

#### 2.4 Empty State 처리
```typescript
// creatives.length === 0일 때
<NoDataFound
  title="분석할 소재가 없습니다"
  description="TikTok 광고 소재를 동기화하면 성과 분석이 시작됩니다."
  action={{
    label: '소재 동기화',
    onClick: handleSyncCreatives
  }}
/>
```

---

### 3. 인사이트 페이지 수정

**파일**: `src/app/(dashboard)/accounts/[accountId]/insights/page.tsx`

#### 3.1 Mock 데이터 제거
```typescript
// 삭제: 10-189줄의 mockInsights, mockAnomalies 전체
```

#### 3.2 상태 초기화 변경
```typescript
// 기존 (현재 확인 필요)
const [insights, setInsights] = useState<Insight[]>(mockInsights);
const [anomalies, setAnomalies] = useState<Anomaly[]>(mockAnomalies);

// 변경
const [insights, setInsights] = useState<Insight[]>([]);
const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
```

#### 3.3 Empty State 처리
```typescript
// insights.length === 0일 때
<NoDataFound
  title="인사이트가 아직 없습니다"
  description="성과 데이터가 쌓이면 AI가 자동으로 인사이트를 생성합니다."
  action={{
    label: '인사이트 생성',
    onClick: handleGenerateInsights
  }}
/>
```

---

## 구현 순서

| 순서 | 작업 | 파일 | 예상 변경 |
|:----:|------|------|----------|
| 1 | 대시보드 Mock 제거 & Empty State | `page.tsx` (dashboard) | -89줄, +15줄 |
| 2 | 소재 분석 Mock 제거 & Empty State | `creatives/page.tsx` | -179줄, +30줄 |
| 3 | 인사이트 Mock 제거 & Empty State | `insights/page.tsx` | -180줄, +25줄 |
| 4 | TypeScript 타입 체크 | 전체 | 검증 |
| 5 | 로컬 테스트 | - | 수동 확인 |

---

## 컴포넌트 Import 추가

각 페이지에 다음 import 추가:
```typescript
import { NoDataFound, ErrorState } from '@/components/common/empty-state';
```

---

## 유지 항목 (삭제하지 않음)

1. **`lib/ai/fallback.ts`** - OpenAI API 없을 때 rule-based 생성
2. **`api/seed/insights/route.ts`** - 개발 환경용 (production 비활성화)
3. **`DashboardSkeleton`** - 로딩 상태 UI

---

## API 응답과 Empty State 매핑

| API 응답 | 표시 UI | 사용자 액션 |
|----------|---------|------------|
| `data === null` & `loading` | `<DashboardSkeleton />` | 대기 |
| `data === null` & `!loading` | `<NoDataFound />` | 동기화 버튼 |
| `error !== null` | `<ErrorState />` | 다시 시도 버튼 |
| `data.insights.length === 0` | 인사이트 섹션에 Empty | 인사이트 생성 버튼 |
| `data.strategies.length === 0` | 전략 섹션에 Empty | (자동 생성 안내) |

---

## 테스트 시나리오

### 1. 데이터 있는 계정
- 대시보드: 실제 KPI, 차트, 인사이트/전략 표시
- 소재 분석: 실제 소재 목록, 피로도 표시
- 인사이트: 실제 AI 인사이트 목록 표시

### 2. 데이터 없는 계정
- 대시보드: "성과 데이터가 없습니다" + 동기화 버튼
- 소재 분석: "분석할 소재가 없습니다" + 동기화 버튼
- 인사이트: "인사이트가 아직 없습니다" + 생성 버튼

### 3. API 에러
- 모든 페이지: "오류가 발생했습니다" + 다시 시도 버튼

---

## 성공 기준

- [ ] Mock 데이터 상수 완전 제거 (3개 파일, ~448줄)
- [ ] Empty State 적용 (3개 페이지)
- [ ] 에러 시 사용자 친화적 메시지 표시
- [ ] TypeScript 타입 체크 통과
- [ ] 실제 데이터로 정상 렌더링 확인

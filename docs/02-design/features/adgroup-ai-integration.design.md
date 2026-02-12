# Design: 광고그룹 레벨 AI 연동

**Feature**: adgroup-ai-integration
**Created**: 2026-02-12
**Status**: Draft

---

## 1. 현재 구현 상태 분석

### 1.1 광고그룹 상세 페이지 현재 구조

**파일**: `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/adgroups/[adGroupId]/page.tsx`

현재 구성:
- Breadcrumb 네비게이션
- 헤더 (광고그룹명, 상태 배지, 뒤로가기 버튼)
- KPI 카드 4개 (총 지출, 노출, 클릭, 전환)
- 광고 목록 테이블

**누락된 기능**: AI 인사이트/전략 카드

### 1.2 캠페인 페이지 AI 카드 (참조용)

**파일**: `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/page.tsx` (351-381줄)

```tsx
{/* AI Summary Cards */}
<div className="grid grid-cols-2 gap-4">
  <Link href={`/accounts/${accountId}/campaigns/${campaignId}/insights`}>
    <Card className="cursor-pointer hover:border-primary/50 transition-colors">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="p-3 rounded-lg bg-blue-100">
          <Lightbulb className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">AI 인사이트</p>
          <p className="text-2xl font-bold">{campaignData.aiSummary.insightCount}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  </Link>
  <Link href={`/accounts/${accountId}/campaigns/${campaignId}/strategies`}>
    <Card className="cursor-pointer hover:border-primary/50 transition-colors">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="p-3 rounded-lg bg-green-100">
          <Target className="h-6 w-6 text-green-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">대기 중인 전략</p>
          <p className="text-2xl font-bold">{campaignData.aiSummary.pendingStrategyCount}</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  </Link>
</div>
```

---

## 2. 아키텍처 설계

### 2.1 데이터 흐름

```
광고그룹 상세 페이지
    │
    ├── [기존] /api/accounts/{accountId}/campaigns/{campaignId}/adgroups/{adGroupId}/ads
    │   └── 광고 목록 + 메트릭
    │
    └── [추가] /api/accounts/{accountId}/campaigns/{campaignId}
        └── aiSummary: { insightCount, pendingStrategyCount }
```

### 2.2 접근 방식: 캠페인 AI 카운트 재사용

광고그룹 페이지에서 캠페인 레벨의 AI 카운트를 표시하고, 클릭 시 캠페인 인사이트/전략 페이지로 이동:

```
광고그룹 상세 페이지
    │
    ├── AI 인사이트 카드 → 캠페인 insightCount
    │   └── 클릭 → /campaigns/{campaignId}/insights
    │
    └── AI 전략 카드 → 캠페인 pendingStrategyCount
        └── 클릭 → /campaigns/{campaignId}/strategies
```

**장점:**
- 새로운 API 불필요
- 캠페인 API에서 이미 제공하는 데이터 활용
- 구현 간단

**참고:**
- 카드 라벨에 "캠페인" 명시 → 사용자 혼동 방지

---

## 3. 구현 명세

### 3.1 수정 대상 파일

| 파일 | 수정 내용 |
|------|-----------|
| `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/adgroups/[adGroupId]/page.tsx` | AI 카드 추가 |

### 3.2 추가할 Import

```tsx
import { Lightbulb, Target } from 'lucide-react';
```

### 3.3 추가할 State 및 Fetch

```tsx
// 캠페인 AI 정보를 위한 state
const [aiSummary, setAiSummary] = useState<{
  insightCount: number;
  pendingStrategyCount: number;
} | null>(null);

// fetchData 함수 내에서 캠페인 정보 추가 fetch
const campaignResponse = await fetch(
  `/api/accounts/${accountId}/campaigns/${campaignId}?days=7`
);
if (campaignResponse.ok) {
  const campaignResult = await campaignResponse.json();
  if (campaignResult.success) {
    setAiSummary(campaignResult.data.aiSummary);
  }
}
```

### 3.4 추가할 UI 컴포넌트 (KPI 카드 아래에 배치)

```tsx
{/* AI Summary Cards */}
{aiSummary && (
  <div className="grid grid-cols-2 gap-4">
    <Link href={`/accounts/${accountId}/campaigns/${campaignId}/insights`}>
      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="p-3 rounded-lg bg-blue-100">
            <Lightbulb className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">캠페인 AI 인사이트</p>
            <p className="text-2xl font-bold">{aiSummary.insightCount}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
    <Link href={`/accounts/${accountId}/campaigns/${campaignId}/strategies`}>
      <Card className="cursor-pointer hover:border-primary/50 transition-colors">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="p-3 rounded-lg bg-green-100">
            <Target className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">대기 중인 전략</p>
            <p className="text-2xl font-bold">{aiSummary.pendingStrategyCount}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  </div>
)}
```

### 3.5 배치 위치

```
광고그룹 상세 페이지 레이아웃:
┌─────────────────────────────────────────┐
│ Breadcrumb                              │
├─────────────────────────────────────────┤
│ Header (광고그룹명, 상태, 뒤로가기)       │
├─────────────────────────────────────────┤
│ KPI Cards (4개: 지출, 노출, 클릭, 전환)  │
├─────────────────────────────────────────┤
│ ★ AI Summary Cards (2개: 인사이트, 전략) │  ← 추가
├─────────────────────────────────────────┤
│ 광고 목록 테이블                         │
└─────────────────────────────────────────┘
```

---

## 4. 구현 체크리스트

### 4.1 UI 구현

| ID | 항목 | 우선순위 |
|----|------|----------|
| UI-01 | Lightbulb, Target 아이콘 import 추가 | High |
| UI-02 | aiSummary state 추가 | High |
| UI-03 | 캠페인 API fetch 추가 | High |
| UI-04 | AI 인사이트 카드 컴포넌트 | High |
| UI-05 | AI 전략 카드 컴포넌트 | High |
| UI-06 | 캠페인 인사이트 페이지 링크 | High |
| UI-07 | 캠페인 전략 페이지 링크 | High |

### 4.2 스타일링

| ID | 항목 |
|----|------|
| STYLE-01 | 인사이트 카드 배경색: `bg-blue-100` |
| STYLE-02 | 인사이트 아이콘 색상: `text-blue-600` |
| STYLE-03 | 전략 카드 배경색: `bg-green-100` |
| STYLE-04 | 전략 아이콘 색상: `text-green-600` |
| STYLE-05 | 호버 효과: `hover:border-primary/50` |
| STYLE-06 | 그리드 레이아웃: `grid grid-cols-2 gap-4` |

---

## 5. API 의존성

### 5.1 사용할 기존 API

```
GET /api/accounts/{accountId}/campaigns/{campaignId}?days=7
```

**응답 중 사용할 필드:**
```json
{
  "success": true,
  "data": {
    "aiSummary": {
      "insightCount": 5,
      "pendingStrategyCount": 2
    }
  }
}
```

---

## 6. 성공 기준

- [ ] 광고그룹 상세 페이지에 AI 인사이트 카드 표시
- [ ] 광고그룹 상세 페이지에 AI 전략 카드 표시
- [ ] AI 카드 클릭 시 캠페인 인사이트 페이지로 이동
- [ ] AI 카드 클릭 시 캠페인 전략 페이지로 이동
- [ ] 캠페인 페이지와 동일한 UI/UX 스타일
- [ ] 빌드 및 타입 체크 통과

---

## 7. 향후 확장 (선택적)

### 7.1 광고그룹 필터링된 뷰

URL 파라미터로 광고그룹 필터 전달:

```tsx
// 클릭 시 광고그룹 필터 적용
<Link href={`/accounts/${accountId}/campaigns/${campaignId}/insights?adGroupId=${adGroupId}`}>
```

인사이트/전략 페이지에서 adGroupId 쿼리 파라미터 처리 필요 (별도 기능).

### 7.2 광고그룹 전용 AI 분석

AIInsight/AIStrategy 모델에 adGroupId 필드 추가 후, 광고그룹 레벨 AI 생성 API 구현 (별도 기능).

---

*Created by bkit PDCA design phase*

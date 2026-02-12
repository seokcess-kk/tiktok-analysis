# Design: 캠페인 데이터 로딩 최적화

## 개요

| 항목 | 내용 |
|------|------|
| 기능명 | campaign-data-loading |
| Plan 문서 | [campaign-data-loading.plan.md](../../01-plan/features/campaign-data-loading.plan.md) |
| 작성일 | 2026-02-12 |
| 상태 | Draft |

## 데이터 구조

### 데이터베이스 관계

```
Account (1)
└── Campaign (N)
    └── AdGroup (N)
        └── Ad (N)
            └── Creative (1) -- Ad.creativeId로 연결
```

### 현재 API 응답 (`/api/accounts/{accountId}/campaigns`)

```typescript
{
  success: true,
  data: {
    campaigns: [
      {
        id: string,
        tiktokCampaignId: string,
        name: string,
        status: string,
        objective: string,
        budget: number,
        adGroupCount: number,  // 광고그룹 수
        metrics: {
          spend: number,
          impressions: number,
          clicks: number,
          conversions: number,
          ctr: number,
          cvr: number,
          cpa: number,
          roas: number
        },
        createdAt: string,
        updatedAt: string
      }
    ],
    pagination: { total, limit, offset },
    period: { startDate, endDate, days }
  }
}
```

### 목표 API 응답

```typescript
{
  success: true,
  data: {
    campaigns: [
      {
        id: string,
        tiktokCampaignId: string,
        name: string,
        status: string,
        objective: string,
        budget: number,
        budgetMode: string,      // 추가: DAILY/LIFETIME
        adGroupCount: number,
        creativeCount: number,   // 신규: 소재 수
        metrics: {
          spend: number,
          impressions: number,
          clicks: number,
          conversions: number,
          ctr: number,
          cvr: number,
          cpa: number,
          roas: number
        },
        createdAt: string,
        updatedAt: string
      }
    ],
    pagination: { total, limit, offset },
    period: { startDate, endDate, days }
  }
}
```

## 상세 설계

### 1. API 수정: campaigns/route.ts

#### 1.1 소재 수 집계 쿼리

Ad와 Creative가 1:1 관계이므로, 각 캠페인의 고유 소재 수를 집계합니다.

```typescript
// 캠페인별 소재 수 집계 (Campaign → AdGroup → Ad → Creative)
const creativeCounts = await prisma.$queryRaw<Array<{campaignId: string, creativeCount: bigint}>>`
  SELECT
    ag."campaignId",
    COUNT(DISTINCT a."creativeId") as "creativeCount"
  FROM "Ad" a
  INNER JOIN "AdGroup" ag ON a."adGroupId" = ag.id
  WHERE ag."campaignId" IN (${Prisma.join(campaignIds)})
    AND a."creativeId" IS NOT NULL
  GROUP BY ag."campaignId"
`;
```

#### 1.2 budgetMode 필드 추가

현재 API 응답에서 `budgetMode`가 누락되어 있으므로 추가합니다.

```typescript
return {
  // ... 기존 필드
  budgetMode: campaign.budgetMode,  // DAILY 또는 LIFETIME
  creativeCount: Number(creativeCountMap.get(campaign.id) || 0n),
};
```

#### 1.3 전체 수정 코드

**파일**: `src/app/api/accounts/[accountId]/campaigns/route.ts`

```typescript
// 기존 코드 (50-59줄)
const campaigns = await prisma.campaign.findMany({
  where,
  include: {
    _count: {
      select: { adGroups: true },
    },
  },
  take: limit,
  skip: offset,
});

// 추가: 캠페인별 소재 수 집계
const campaignIds = campaigns.map(c => c.id);

let creativeCountMap = new Map<string, number>();
if (campaignIds.length > 0) {
  const creativeCounts = await prisma.$queryRaw<Array<{campaignId: string, creativeCount: bigint}>>`
    SELECT
      ag."campaignId",
      COUNT(DISTINCT a."creativeId") as "creativeCount"
    FROM "Ad" a
    INNER JOIN "AdGroup" ag ON a."adGroupId" = ag.id
    WHERE ag."campaignId" IN (${Prisma.join(campaignIds)})
      AND a."creativeId" IS NOT NULL
    GROUP BY ag."campaignId"
  `;

  creativeCounts.forEach(row => {
    creativeCountMap.set(row.campaignId, Number(row.creativeCount));
  });
}

// 수정: 캠페인 데이터 가공 (86-119줄)
const campaignsWithMetrics = campaigns.map((campaign) => {
  const metrics = metricsMap.get(campaign.id);
  // ... 기존 메트릭 계산 로직

  return {
    id: campaign.id,
    tiktokCampaignId: campaign.tiktokCampaignId,
    name: campaign.name,
    status: campaign.status,
    objective: campaign.objective,
    budget: campaign.budget,
    budgetMode: campaign.budgetMode,  // 추가
    adGroupCount: campaign._count.adGroups,
    creativeCount: creativeCountMap.get(campaign.id) || 0,  // 추가
    metrics: { /* 기존 유지 */ },
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
});
```

---

### 2. 프론트엔드 수정: page.tsx

#### 2.1 인터페이스 수정

**파일**: `src/app/(dashboard)/accounts/[accountId]/page.tsx`

```typescript
// 수정 전
interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  budgetMode: string;
  _count?: {
    adGroups: number;
  };
}

interface CampaignMetrics {
  spend: number;
  conversions: number;
  roas: number;
}

// 수정 후
interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  budgetMode: string;
  adGroupCount: number;
  creativeCount: number;
  metrics: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cvr: number;
    cpa: number;
    roas: number;
  };
}

// CampaignMetrics 인터페이스 삭제 (불필요)
```

#### 2.2 메트릭 API 호출 제거

```typescript
// 삭제할 코드
const [metricsMap, setMetricsMap] = useState<Record<string, CampaignMetrics>>({});
const [loadingMetrics, setLoadingMetrics] = useState(false);

const fetchCampaignMetrics = async (campaignList: Campaign[]) => {
  // ... 전체 삭제
};
```

#### 2.3 데이터 페칭 로직 수정

```typescript
// 수정 전
useEffect(() => {
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounts/${accountId}/campaigns`);
      const data = await response.json();
      if (data.success && data.data?.campaigns) {
        setCampaigns(data.data.campaigns);
        fetchCampaignMetrics(data.data.campaigns);  // 제거
      }
      // ...
    }
  };
}, [accountId]);

// 수정 후
useEffect(() => {
  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/accounts/${accountId}/campaigns`);
      const data = await response.json();
      if (data.success && data.data?.campaigns) {
        setCampaigns(data.data.campaigns);
        // 메트릭 API 호출 제거 - API 응답에 이미 포함됨
      }
      // ...
    }
  };
}, [accountId]);
```

#### 2.4 캠페인 카드 UI 수정

```typescript
// 수정 전
{filteredCampaigns.map((campaign) => {
  const metrics = metricsMap[campaign.id] || { spend: 0, conversions: 0, roas: 0 };
  return (
    <Card>
      {/* ... */}
      <div className="grid grid-cols-3 gap-3 text-sm mb-3">
        <div>
          <p className="text-muted-foreground text-xs">지출</p>
          <p className="font-semibold">
            {loadingMetrics ? '...' : formatCurrency(metrics.spend)}
          </p>
        </div>
        {/* ... */}
      </div>
      <div className="flex items-center text-xs text-muted-foreground">
        <Layers className="h-3 w-3 mr-1" />
        광고그룹 {campaign._count?.adGroups || 0}개
      </div>
    </Card>
  );
})}

// 수정 후
{filteredCampaigns.map((campaign) => (
  <Card>
    {/* ... */}
    <div className="grid grid-cols-3 gap-3 text-sm mb-3">
      <div>
        <p className="text-muted-foreground text-xs">지출</p>
        <p className="font-semibold">
          {formatCurrency(campaign.metrics.spend)}
        </p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs">전환</p>
        <p className="font-semibold">{campaign.metrics.conversions}</p>
      </div>
      <div>
        <p className="text-muted-foreground text-xs">ROAS</p>
        <p className="font-semibold">{campaign.metrics.roas.toFixed(2)}x</p>
      </div>
    </div>
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <div className="flex items-center">
        <Layers className="h-3 w-3 mr-1" />
        광고그룹 {campaign.adGroupCount}개
      </div>
      <div className="flex items-center">
        <Image className="h-3 w-3 mr-1" />
        소재 {campaign.creativeCount}개
      </div>
    </div>
  </Card>
))}
```

#### 2.5 새로고침 로직 수정

```typescript
// 수정 전
const handleRefresh = () => {
  setLoading(true);
  fetch(`/api/accounts/${accountId}/campaigns`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.data?.campaigns) {
        setCampaigns(data.data.campaigns);
        fetchCampaignMetrics(data.data.campaigns);  // 제거
      }
    })
    .finally(() => setLoading(false));
};

// 수정 후
const handleRefresh = () => {
  setLoading(true);
  fetch(`/api/accounts/${accountId}/campaigns`)
    .then((res) => res.json())
    .then((data) => {
      if (data.success && data.data?.campaigns) {
        setCampaigns(data.data.campaigns);
      }
    })
    .finally(() => setLoading(false));
};
```

---

## 구현 순서

| 순서 | 작업 | 파일 | 설명 |
|------|------|------|------|
| 1 | API 수정 | `src/app/api/accounts/[accountId]/campaigns/route.ts` | 소재 수 집계, budgetMode 추가 |
| 2 | 프론트엔드 수정 | `src/app/(dashboard)/accounts/[accountId]/page.tsx` | 인터페이스, 데이터 페칭, UI 수정 |
| 3 | 테스트 | - | 빌드 및 동작 확인 |

---

## 검증 항목

### API 응답 검증

```bash
# API 호출 테스트
curl http://localhost:3000/api/accounts/{accountId}/campaigns

# 예상 응답
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "...",
        "name": "캠페인 A",
        "adGroupCount": 3,
        "creativeCount": 5,
        "metrics": {
          "spend": 150000,
          "conversions": 25,
          "roas": 8.33
        }
      }
    ]
  }
}
```

### UI 검증

- [ ] 캠페인 카드에 지출, 전환, ROAS 표시
- [ ] 광고그룹 수 표시
- [ ] 소재 수 표시 (신규)
- [ ] 로딩 상태 정상 동작
- [ ] 새로고침 정상 동작

### 성능 검증

- [ ] API 호출 횟수: N+1 → 1회
- [ ] 페이지 로드 시간 감소 확인

---

## 변경 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/app/api/accounts/[accountId]/campaigns/route.ts` | 소재 수 집계 쿼리 추가, budgetMode 반환 |
| `src/app/(dashboard)/accounts/[accountId]/page.tsx` | Campaign 인터페이스 수정, 메트릭 API 호출 제거, UI 업데이트 |

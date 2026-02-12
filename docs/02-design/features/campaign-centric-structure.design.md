# 설계서: 캠페인 중심 구조 재편성

## 기능명
campaign-centric-structure

## 참조 문서
- Plan: `docs/01-plan/features/campaign-centric-structure.plan.md`

---

## 1. 아키텍처 개요

### TikTok Ads 계층 구조
```
Account (계정)
   └── Campaign (캠페인)
          └── AdGroup (광고그룹)
                 └── Ad (광고)
                        └── Creative (소재)
```

### 변경 후 화면 흐름
```
[/accounts] 계정 목록 (간소화)
    ↓ 계정 선택
[/accounts/[accountId]] 캠페인 목록
    ↓ 캠페인 선택
[/accounts/[accountId]/campaigns/[campaignId]] 캠페인 대시보드
    ├── 개요 (기본)
    ├── /creatives (소재 분석) ⭐ 신규
    ├── /insights (AI 인사이트)
    ├── /strategies (AI 전략)
    └── /reports (리포트) ⭐ 신규
```

---

## 2. 파일 변경 상세 설계

### 2.1 계정 목록 페이지 간소화

**파일**: `src/app/(dashboard)/accounts/page.tsx`

#### 제거할 코드
```typescript
// 제거: AccountMetrics 인터페이스 (21-26줄)
interface AccountMetrics {
  spend: number;
  roas: number;
  cpa: number;
  change: { spend: number; roas: number; cpa: number };
}

// 제거: ChangeIndicator 컴포넌트 (28-51줄)

// 제거: metricsMap 상태 및 fetchAllMetrics 함수 (90-167줄)
const [metricsMap, setMetricsMap] = useState<Record<string, AccountMetrics>>({});
const [loadingMetrics, setLoadingMetrics] = useState(false);

// 제거: Summary Cards (289-321줄) - 총 지출, 평균 ROAS 등

// 제거: 카드 내 메트릭 표시 (399-418줄)
<div className="grid grid-cols-3 gap-4">...</div>

// 제거: 메트릭 기반 정렬 옵션
const accountSortOptions = [
  { value: 'spend_desc', label: '지출 높은순' },
  { value: 'roas_desc', label: 'ROAS 높은순' },
  ...
];
```

#### 유지할 코드
```typescript
// 유지: Account 인터페이스
interface Account {
  id: string;
  name: string;
  tiktokAdvId: string;
  status: string;
  client: { name: string; industry: string | null };
  _count: { campaigns: number; insights: number };
}

// 유지: 검색, 필터링 기능
// 유지: 계정 카드 기본 정보 (이름, 클라이언트, 상태, 캠페인 수)
```

#### UI 변경
- 카드 내 메트릭 섹션 제거
- 심플한 카드/리스트 형태 유지
- 클릭 시 캠페인 목록으로 이동 (기존과 동일)

---

### 2.2 계정 상세 페이지 → 캠페인 목록

**파일**: `src/app/(dashboard)/accounts/[accountId]/page.tsx`

#### 현재 구조 (제거)
- KPI 그리드
- 성과 차트
- AI 인사이트/전략 요약
- SetupGuide

#### 새 구조
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Megaphone, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  budgetMode: string;
  metrics?: {
    spend: number;
    conversions: number;
    roas: number;
  };
  _count?: {
    adGroups: number;
  };
}

export default function CampaignListPage() {
  const params = useParams();
  const accountId = params.accountId as string;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountName, setAccountName] = useState('');

  // 캠페인 목록 조회
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch(`/api/accounts/${accountId}/campaigns`);
        const data = await response.json();
        if (data.success && data.data?.campaigns) {
          setCampaigns(data.data.campaigns);
        }
      } catch (error) {
        console.error('Failed to fetch campaigns:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [accountId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">캠페인 목록</h1>
        <p className="text-muted-foreground">
          캠페인을 선택하여 상세 성과를 확인하세요
        </p>
      </div>

      {/* Campaign Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <Link key={campaign.id} href={`/accounts/${accountId}/campaigns/${campaign.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{campaign.name}</CardTitle>
                  <Badge variant={campaign.status === 'ENABLE' ? 'default' : 'secondary'}>
                    {campaign.status === 'ENABLE' ? '운영중' : '일시정지'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {campaign.objective} · 예산 {formatCurrency(campaign.budget)}/{campaign.budgetMode === 'DAILY' ? '일' : '총'}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">지출</p>
                    <p className="font-semibold">{formatCurrency(campaign.metrics?.spend || 0)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">전환</p>
                    <p className="font-semibold">{campaign.metrics?.conversions || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ROAS</p>
                    <p className="font-semibold">{(campaign.metrics?.roas || 0).toFixed(2)}x</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

### 2.3 사이드바 네비게이션 변경

**파일**: `src/components/layout/sidebar.tsx`

#### 변경 사항

1. **계정 레벨 네비게이션 수정** (`getAccountNavItems`)
```typescript
function getAccountNavItems(accountId: string): NavItem[] {
  return [
    {
      label: '← 계정 목록',
      href: '/accounts',
      icon: <ArrowLeft className="h-5 w-5" />,
      isBackLink: true,
    },
    {
      label: '캠페인 목록',
      href: `/accounts/${accountId}`,
      icon: <Megaphone className="h-5 w-5" />,
    },
    {
      label: '전체 인사이트',
      href: `/accounts/${accountId}/insights`,
      icon: <Lightbulb className="h-5 w-5" />,
    },
    {
      label: '전체 전략',
      href: `/accounts/${accountId}/strategies`,
      icon: <Target className="h-5 w-5" />,
    },
  ];
}
```

2. **캠페인 레벨 네비게이션 수정** (`getCampaignNavItems`)
```typescript
function getCampaignNavItems(accountId: string, campaignId: string): NavItem[] {
  return [
    {
      label: '← 캠페인 목록',
      href: `/accounts/${accountId}`,
      icon: <ArrowLeft className="h-5 w-5" />,
      isBackLink: true,
    },
    {
      label: '개요',
      href: `/accounts/${accountId}/campaigns/${campaignId}`,
      icon: <LayoutDashboard className="h-5 w-5" />,
    },
    {
      label: '소재 분석',
      href: `/accounts/${accountId}/campaigns/${campaignId}/creatives`,
      icon: <Image className="h-5 w-5" />,
    },
    {
      label: 'AI 인사이트',
      href: `/accounts/${accountId}/campaigns/${campaignId}/insights`,
      icon: <Lightbulb className="h-5 w-5" />,
    },
    {
      label: 'AI 전략',
      href: `/accounts/${accountId}/campaigns/${campaignId}/strategies`,
      icon: <Target className="h-5 w-5" />,
    },
    {
      label: '리포트',
      href: `/accounts/${accountId}/campaigns/${campaignId}/reports`,
      icon: <FileText className="h-5 w-5" />,
    },
  ];
}
```

3. **사이드바 캠페인 섹션 제거**
- 계정 선택 시 사이드바에 캠페인 목록을 표시하던 `Collapsible` 섹션 제거
- 캠페인 목록은 메인 콘텐츠 영역에서 표시

---

### 2.4 캠페인 소재 분석 페이지 (신규)

**파일**: `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/creatives/page.tsx`

#### 데이터 조회 로직 (계층 구조 기반)
```typescript
// Campaign > AdGroup > Ad > Creative 계층을 통해 소재 조회
const fetchCampaignCreatives = async (accountId: string, campaignId: string) => {
  const response = await fetch(
    `/api/accounts/${accountId}/campaigns/${campaignId}/creatives`
  );
  return response.json();
};
```

#### 컴포넌트 구조
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { CreativeCard } from '@/components/creatives/creative-card';
import { CreativeTable } from '@/components/creatives/creative-table';
import { GradeDistribution } from '@/components/creatives/score-breakdown';

export default function CampaignCreativesPage() {
  const params = useParams();
  const accountId = params.accountId as string;
  const campaignId = params.campaignId as string;

  const [creatives, setCreatives] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCreatives = async () => {
      try {
        const response = await fetch(
          `/api/accounts/${accountId}/campaigns/${campaignId}/creatives`
        );
        const data = await response.json();
        if (data.success) {
          setCreatives(data.data.creatives || []);
        }
      } catch (error) {
        console.error('Failed to fetch creatives:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCreatives();
  }, [accountId, campaignId]);

  // 기존 소재 분석 페이지 UI 재사용
  // ...
}
```

---

### 2.5 캠페인 소재 API (신규)

**파일**: `src/app/api/accounts/[accountId]/campaigns/[campaignId]/creatives/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { accountId: string; campaignId: string } }
) {
  try {
    const { accountId, campaignId } = params;

    // Campaign > AdGroup > Ad > Creative 계층을 통해 소재 조회
    const creatives = await prisma.creative.findMany({
      where: {
        ads: {
          some: {
            adGroup: {
              campaignId: campaignId,
            },
          },
        },
      },
      include: {
        ads: {
          include: {
            adGroup: {
              select: {
                id: true,
                name: true,
                campaignId: true,
              },
            },
          },
        },
        fatigue: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        metrics: {
          where: {
            level: 'CREATIVE',
          },
          orderBy: { date: 'desc' },
          take: 7,
        },
      },
    });

    // 성과 데이터 집계
    const creativesWithMetrics = creatives.map((creative) => {
      const latestMetrics = creative.metrics[0] || {};
      const latestFatigue = creative.fatigue[0] || null;

      return {
        id: creative.id,
        tiktokCreativeId: creative.tiktokCreativeId,
        type: creative.type,
        thumbnailUrl: creative.thumbnailUrl,
        videoUrl: creative.videoUrl,
        duration: creative.duration,
        tags: creative.tags,
        hookScore: creative.hookScore,
        metrics: {
          spend: latestMetrics.spend || 0,
          impressions: latestMetrics.impressions || 0,
          clicks: latestMetrics.clicks || 0,
          conversions: latestMetrics.conversions || 0,
          ctr: latestMetrics.ctr || 0,
          cvr: latestMetrics.cvr || 0,
          cpa: latestMetrics.cpa || 0,
          roas: latestMetrics.roas || 0,
        },
        fatigue: latestFatigue
          ? {
              index: latestFatigue.fatigueIndex,
              trend: latestFatigue.performanceTrend,
              daysActive: latestFatigue.daysActive,
              recommendedAction: latestFatigue.recommendedAction,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        creatives: creativesWithMetrics,
        pagination: {
          total: creatives.length,
        },
      },
    });
  } catch (error) {
    console.error('Campaign creatives fetch error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FETCH_ERROR', message: 'Failed to fetch creatives' } },
      { status: 500 }
    );
  }
}
```

---

### 2.6 캠페인 리포트 페이지 (신규)

**파일**: `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/reports/page.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar } from 'lucide-react';

export default function CampaignReportsPage() {
  const params = useParams();
  const accountId = params.accountId as string;
  const campaignId = params.campaignId as string;

  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 리포트 목록 조회 (향후 캠페인 레벨 리포트 API 구현 필요)
  useEffect(() => {
    // 현재는 placeholder
    setIsLoading(false);
  }, [accountId, campaignId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">리포트</h1>
          <p className="text-muted-foreground">캠페인 성과 리포트를 생성하고 다운로드합니다</p>
        </div>
        <Button>
          <FileText className="h-4 w-4 mr-2" />
          리포트 생성
        </Button>
      </div>

      {/* 리포트 목록 또는 빈 상태 */}
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">생성된 리포트가 없습니다</p>
          <p className="text-sm text-muted-foreground mt-1">
            상단의 "리포트 생성" 버튼을 클릭하여 새 리포트를 만드세요
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 3. 구현 순서

### Phase 1: 기본 구조 변경 (필수)

| # | 작업 | 파일 | 예상 변경량 |
|---|------|------|------------|
| 1 | 계정 목록 메트릭 제거 | `accounts/page.tsx` | -150줄 |
| 2 | 계정 상세 → 캠페인 목록 | `accounts/[accountId]/page.tsx` | 전면 재작성 |
| 3 | 사이드바 네비게이션 변경 | `sidebar.tsx` | -50줄, +20줄 |

### Phase 2: 캠페인 레벨 페이지 (필수)

| # | 작업 | 파일 | 예상 변경량 |
|---|------|------|------------|
| 4 | 캠페인 소재 API | `.../campaigns/[campaignId]/creatives/route.ts` | 신규 ~100줄 |
| 5 | 캠페인 소재 페이지 | `.../campaigns/[campaignId]/creatives/page.tsx` | 신규 ~300줄 |
| 6 | 캠페인 리포트 페이지 | `.../campaigns/[campaignId]/reports/page.tsx` | 신규 ~100줄 |

### Phase 3: 부가 기능 (선택)

| # | 작업 | 파일 | 예상 변경량 |
|---|------|------|------------|
| 7 | Account 스키마 변경 | `schema.prisma` | +2줄 |
| 8 | 계정 별칭/메모 API | `api/accounts/[accountId]/route.ts` | +30줄 |
| 9 | 불필요 페이지 제거 | `accounts/[accountId]/creatives/page.tsx` 등 | 제거 또는 리다이렉트 |

---

## 4. 검증 체크리스트

### Phase 1 검증
- [ ] `/accounts` 페이지에서 지출/ROAS/CPA 메트릭이 표시되지 않음
- [ ] `/accounts` 페이지에서 Summary Cards가 제거됨
- [ ] `/accounts/[accountId]` 접속 시 캠페인 목록이 표시됨
- [ ] 사이드바가 계정/캠페인 컨텍스트에 맞게 변경됨

### Phase 2 검증
- [ ] `/accounts/[accountId]/campaigns/[campaignId]/creatives` 페이지 접근 가능
- [ ] 캠페인 소재 API가 Campaign > AdGroup > Ad > Creative 계층으로 조회
- [ ] `/accounts/[accountId]/campaigns/[campaignId]/reports` 페이지 접근 가능

### Phase 3 검증
- [ ] Account 테이블에 nickname, memo 필드 존재
- [ ] PATCH `/api/accounts/[id]`로 별칭/메모 수정 가능

---

## 5. 참고: 기존 API 활용

### 재사용 가능한 API
- `GET /api/accounts/[accountId]/campaigns` - 캠페인 목록 (이미 존재)
- `GET /api/accounts/[accountId]/campaigns/[campaignId]` - 캠페인 상세 (이미 존재)
- `GET /api/ai/insights/[accountId]/campaigns/[campaignId]` - 캠페인 인사이트 (이미 존재)
- `GET /api/ai/strategies/[accountId]/campaigns/[campaignId]` - 캠페인 전략 (이미 존재)

### 신규 API 필요
- `GET /api/accounts/[accountId]/campaigns/[campaignId]/creatives` - 캠페인 소재 목록

---

## 6. 롤백 계획

문제 발생 시 롤백 순서:
1. 사이드바 네비게이션을 원래 상태로 복원
2. 계정 상세 페이지를 원래 대시보드로 복원
3. 계정 목록 페이지에 메트릭 복원

Git 기반 롤백:
```bash
git revert HEAD~N  # N개의 커밋 롤백
```

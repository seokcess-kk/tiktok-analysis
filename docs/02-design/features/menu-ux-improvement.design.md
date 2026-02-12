# Design: 메뉴 구조 및 UI/UX 개선

**Feature**: menu-ux-improvement
**Created**: 2026-02-12
**Status**: 🔄 In Progress

---

## 1. 기존 인프라 분석

### 1.1 현재 파일 구조

| 파일 | 역할 | 현재 상태 |
|------|------|-----------|
| `src/components/layout/sidebar.tsx` | 데스크탑 사이드바 | 3단계 네비게이션 (Main/Account/Campaign) |
| `src/components/layout/mobile-sidebar.tsx` | 모바일 사이드바 | Account 레벨까지만 지원 ❌ |
| `src/components/layout/header.tsx` | 헤더 | 제목만 표시, 브레드크럼 없음 |
| `src/components/dashboard/drilldown-nav.tsx` | 브레드크럼 | 존재하지만 일부 페이지만 사용 |

### 1.2 현재 네비게이션 로직

```typescript
// sidebar.tsx 현재 구조
const { currentAccountId, currentCampaignId } = useMemo(() => {
  const accountMatch = pathname?.match(/\/accounts\/([^\/]+)/);
  const campaignMatch = pathname?.match(/\/accounts\/([^\/]+)\/campaigns\/([^\/]+)/);
  return {
    currentAccountId: accountId || accountMatch?.[1] || null,
    currentCampaignId: campaignMatch?.[2] || null,
  };
}, [pathname, accountId]);
```

### 1.3 문제점 요약

| 문제 | 현재 | 개선 후 |
|------|------|---------|
| 컨텍스트 표시 | 없음 | 계정명/캠페인명 헤더 표시 |
| 모바일 캠페인 | 미지원 | 전체 레벨 지원 |
| 광고그룹 레벨 | 미지원 | 사이드바 메뉴 추가 |
| 브레드크럼 | 일부 페이지 | 모든 페이지 적용 |

---

## 2. 구현 명세

### 2.1 수정 대상 파일

| 파일 | 수정 내용 | 우선순위 |
|------|-----------|----------|
| `src/components/layout/sidebar.tsx` | 컨텍스트 헤더, 광고그룹 레벨 추가 | High |
| `src/components/layout/mobile-sidebar.tsx` | 캠페인/광고그룹 레벨 추가 | High |
| `src/hooks/use-navigation-context.ts` (신규) | 네비게이션 상태 관리 훅 | High |
| `src/components/dashboard/page-header.tsx` (신규) | 페이지 헤더 + 브레드크럼 통합 | Medium |
| `src/components/dashboard/data-scope-indicator.tsx` (신규) | 데이터 범위 표시 | Medium |
| `src/components/ai/ai-hub-card.tsx` (신규) | AI 기능 통합 카드 | Low |

---

## 3. Phase 1: 네비게이션 개선 (High Priority)

### 3.1 useNavigationContext Hook

**파일**: `src/hooks/use-navigation-context.ts`

```typescript
'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

export type NavigationLevel = 'main' | 'account' | 'campaign' | 'adgroup' | 'ad';

export interface NavigationContext {
  level: NavigationLevel;
  accountId: string | null;
  campaignId: string | null;
  adGroupId: string | null;
  adId: string | null;
}

export function useNavigationContext(): NavigationContext {
  const pathname = usePathname();

  return useMemo(() => {
    const accountMatch = pathname?.match(/\/accounts\/([^\/]+)/);
    const campaignMatch = pathname?.match(/\/campaigns\/([^\/]+)/);
    const adGroupMatch = pathname?.match(/\/adgroups\/([^\/]+)/);
    const adMatch = pathname?.match(/\/ads\/([^\/]+)/);

    const accountId = accountMatch?.[1] || null;
    const campaignId = campaignMatch?.[1] || null;
    const adGroupId = adGroupMatch?.[1] || null;
    const adId = adMatch?.[1] || null;

    let level: NavigationLevel = 'main';
    if (adId) level = 'ad';
    else if (adGroupId) level = 'adgroup';
    else if (campaignId) level = 'campaign';
    else if (accountId) level = 'account';

    return { level, accountId, campaignId, adGroupId, adId };
  }, [pathname]);
}
```

### 3.2 사이드바 컨텍스트 헤더

**파일**: `src/components/layout/sidebar.tsx`

#### 3.2.1 추가할 Import

```typescript
import { Building2, Megaphone, Layers, FileImage } from 'lucide-react';
import { useNavigationContext } from '@/hooks/use-navigation-context';
```

#### 3.2.2 추가할 State (계정/캠페인 이름 조회)

```typescript
const [contextNames, setContextNames] = useState<{
  accountName?: string;
  campaignName?: string;
  adGroupName?: string;
}>({});

useEffect(() => {
  const fetchContextNames = async () => {
    if (currentAccountId) {
      // 계정 이름 조회
      try {
        const res = await fetch(`/api/accounts/${currentAccountId}`);
        if (res.ok) {
          const data = await res.json();
          setContextNames(prev => ({ ...prev, accountName: data.data?.name }));
        }
      } catch {}
    }
    if (currentCampaignId && currentAccountId) {
      // 캠페인 이름 조회
      try {
        const res = await fetch(`/api/accounts/${currentAccountId}/campaigns/${currentCampaignId}`);
        if (res.ok) {
          const data = await res.json();
          setContextNames(prev => ({ ...prev, campaignName: data.data?.name }));
        }
      } catch {}
    }
  };
  fetchContextNames();
}, [currentAccountId, currentCampaignId]);
```

#### 3.2.3 컨텍스트 헤더 UI

```tsx
{/* Context Header - Logo 아래에 추가 */}
{(currentAccountId || currentCampaignId) && (
  <div className="px-4 py-3 border-b bg-muted/30">
    {/* Account Level */}
    {currentAccountId && !currentCampaignId && (
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded bg-blue-100 dark:bg-blue-900">
          <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">광고 계정</p>
          <p className="text-sm font-medium truncate">
            {contextNames.accountName || '로딩중...'}
          </p>
        </div>
      </div>
    )}

    {/* Campaign Level */}
    {currentCampaignId && (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{contextNames.accountName || '...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-green-100 dark:bg-green-900">
            <Megaphone className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">캠페인</p>
            <p className="text-sm font-medium truncate">
              {contextNames.campaignName || '로딩중...'}
            </p>
          </div>
        </div>
      </div>
    )}

    {/* AdGroup Level */}
    {currentAdGroupId && (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="h-3 w-3" />
          <span className="truncate">{contextNames.accountName}</span>
          <span>/</span>
          <Megaphone className="h-3 w-3" />
          <span className="truncate">{contextNames.campaignName}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-900">
            <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">광고그룹</p>
            <p className="text-sm font-medium truncate">
              {contextNames.adGroupName || '로딩중...'}
            </p>
          </div>
        </div>
      </div>
    )}
  </div>
)}
```

### 3.3 광고그룹 레벨 네비게이션 추가

**파일**: `src/components/layout/sidebar.tsx`

```typescript
// 광고그룹 레벨 네비게이션
function getAdGroupNavItems(
  accountId: string,
  campaignId: string,
  adGroupId: string
): NavItem[] {
  return [
    {
      label: '← 캠페인으로',
      href: `/accounts/${accountId}/campaigns/${campaignId}`,
      icon: <ArrowLeft className="h-5 w-5" />,
      isBackLink: true,
    },
    {
      label: '광고그룹 개요',
      href: `/accounts/${accountId}/campaigns/${campaignId}/adgroups/${adGroupId}`,
      icon: <Layers className="h-5 w-5" />,
    },
    {
      label: '광고 목록',
      href: `/accounts/${accountId}/campaigns/${campaignId}/adgroups/${adGroupId}/ads`,
      icon: <FileImage className="h-5 w-5" />,
    },
  ];
}

// navItems 결정 로직 수정
const navItems = useMemo(() => {
  if (currentAdGroupId) {
    return getAdGroupNavItems(currentAccountId!, currentCampaignId!, currentAdGroupId);
  }
  if (currentCampaignId) {
    return getCampaignNavItems(currentAccountId!, currentCampaignId);
  }
  if (currentAccountId) {
    return getAccountNavItems(currentAccountId);
  }
  return mainNavItems;
}, [currentAccountId, currentCampaignId, currentAdGroupId]);
```

### 3.4 모바일 사이드바 개선

**파일**: `src/components/layout/mobile-sidebar.tsx`

#### 3.4.1 변경 사항

```typescript
// 1. Import 추가
import { ArrowLeft, Megaphone, Layers } from 'lucide-react';
import { useNavigationContext } from '@/hooks/use-navigation-context';

// 2. 컨텍스트 추출 로직 추가
const { level, accountId: ctxAccountId, campaignId, adGroupId } = useNavigationContext();
const effectiveAccountId = accountId || ctxAccountId;

// 3. 캠페인 레벨 네비게이션 함수 추가
function getCampaignNavItems(accountId: string, campaignId: string): NavItem[] {
  return [
    {
      label: '← 캠페인 목록',
      href: `/accounts/${accountId}`,
      icon: <ArrowLeft className="h-5 w-5" />,
      isBackLink: true,
    },
    {
      label: '캠페인 개요',
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
  ];
}

// 4. navItems 결정 로직 수정
const navItems = useMemo(() => {
  if (campaignId && effectiveAccountId) {
    return getCampaignNavItems(effectiveAccountId, campaignId);
  }
  if (effectiveAccountId) {
    return getAccountNavItems(effectiveAccountId);
  }
  return mainNavItems;
}, [effectiveAccountId, campaignId]);

// 5. 컨텍스트 헤더 추가 (Navigation 위에)
{effectiveAccountId && (
  <div className="px-4 py-3 border-b bg-muted/30">
    <div className="flex items-center gap-2 text-sm">
      <Building2 className="h-4 w-4 text-blue-500" />
      <span className="truncate">{contextNames.accountName || '...'}</span>
    </div>
    {campaignId && (
      <div className="flex items-center gap-2 text-sm mt-1">
        <Megaphone className="h-4 w-4 text-green-500" />
        <span className="truncate">{contextNames.campaignName || '...'}</span>
      </div>
    )}
  </div>
)}
```

---

## 4. Phase 2: UX 일관성 (Medium Priority)

### 4.1 PageHeader 컴포넌트 (브레드크럼 통합)

**파일**: `src/components/dashboard/page-header.tsx`

```tsx
'use client';

import { DrilldownNav, DrilldownLevel } from './drilldown-nav';
import { DataScopeIndicator } from './data-scope-indicator';

interface PageHeaderProps {
  title: string;
  description?: string;
  levels?: DrilldownLevel[];
  scope?: 'account' | 'campaign' | 'adgroup' | 'ad';
  scopeName?: string;
  dateRange?: { from: string; to: string };
  actions?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  levels = [],
  scope,
  scopeName,
  dateRange,
  actions,
}: PageHeaderProps) {
  return (
    <div className="space-y-4 mb-6">
      {/* 브레드크럼 */}
      {levels.length > 0 && (
        <DrilldownNav levels={levels} />
      )}

      {/* 제목 + 액션 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* 데이터 범위 표시 */}
      {scope && scopeName && (
        <DataScopeIndicator
          scope={scope}
          scopeName={scopeName}
          dateRange={dateRange}
        />
      )}
    </div>
  );
}
```

### 4.2 DataScopeIndicator 컴포넌트

**파일**: `src/components/dashboard/data-scope-indicator.tsx`

```tsx
'use client';

import { Building2, Megaphone, Layers, FileImage, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface DataScopeIndicatorProps {
  scope: 'account' | 'campaign' | 'adgroup' | 'ad';
  scopeName: string;
  dateRange?: { from: string; to: string };
  className?: string;
}

const scopeConfig = {
  account: { icon: Building2, label: '전체 계정', color: 'bg-blue-100 text-blue-700' },
  campaign: { icon: Megaphone, label: '캠페인', color: 'bg-green-100 text-green-700' },
  adgroup: { icon: Layers, label: '광고그룹', color: 'bg-purple-100 text-purple-700' },
  ad: { icon: FileImage, label: '광고', color: 'bg-orange-100 text-orange-700' },
};

export function DataScopeIndicator({
  scope,
  scopeName,
  dateRange,
  className,
}: DataScopeIndicatorProps) {
  const config = scopeConfig[scope];
  const Icon = config.icon;

  return (
    <div className={`flex flex-wrap items-center gap-2 text-sm ${className}`}>
      {/* 데이터 범위 */}
      <Badge variant="secondary" className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}: {scopeName}
      </Badge>

      {/* 기간 표시 */}
      {dateRange && (
        <Badge variant="outline" className="text-muted-foreground">
          <Calendar className="h-3 w-3 mr-1" />
          {format(new Date(dateRange.from), 'M/d', { locale: ko })} - {format(new Date(dateRange.to), 'M/d', { locale: ko })}
        </Badge>
      )}
    </div>
  );
}
```

---

## 5. Phase 3: AI 기능 개선 (Low Priority)

### 5.1 AIHubCard 컴포넌트

**파일**: `src/components/ai/ai-hub-card.tsx`

```tsx
'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Target, ChevronRight, Sparkles } from 'lucide-react';

interface AIHubCardProps {
  insightCount: number;
  newInsightCount?: number;
  strategyCount: number;
  pendingStrategyCount?: number;
  insightsHref: string;
  strategiesHref: string;
}

export function AIHubCard({
  insightCount,
  newInsightCount = 0,
  strategyCount,
  pendingStrategyCount = 0,
  insightsHref,
  strategiesHref,
}: AIHubCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI 분석 허브
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 인사이트 */}
        <Link href={insightsHref}>
          <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Lightbulb className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">AI 인사이트</p>
                <p className="text-sm text-muted-foreground">{insightCount}개 생성됨</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {newInsightCount > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {newInsightCount} 새로운
                </Badge>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Link>

        {/* 전략 */}
        <Link href={strategiesHref}>
          <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Target className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">AI 전략</p>
                <p className="text-sm text-muted-foreground">{strategyCount}개 제안됨</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingStrategyCount > 0 && (
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                  {pendingStrategyCount} 대기중
                </Badge>
              )}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}
```

---

## 6. 구현 체크리스트

### 6.1 Phase 1: 네비게이션 개선

| ID | 항목 | 파일 | 우선순위 |
|----|------|------|----------|
| P1-01 | useNavigationContext 훅 생성 | `src/hooks/use-navigation-context.ts` | High |
| P1-02 | 사이드바 컨텍스트 헤더 추가 | `sidebar.tsx` | High |
| P1-03 | 광고그룹 레벨 네비게이션 추가 | `sidebar.tsx` | High |
| P1-04 | 모바일 사이드바 캠페인 레벨 추가 | `mobile-sidebar.tsx` | High |
| P1-05 | 모바일 컨텍스트 헤더 추가 | `mobile-sidebar.tsx` | High |
| P1-06 | 뒤로가기 링크 스타일 개선 | `sidebar.tsx`, `mobile-sidebar.tsx` | Medium |

### 6.2 Phase 2: UX 일관성

| ID | 항목 | 파일 | 우선순위 |
|----|------|------|----------|
| P2-01 | PageHeader 컴포넌트 생성 | `src/components/dashboard/page-header.tsx` | Medium |
| P2-02 | DataScopeIndicator 컴포넌트 생성 | `src/components/dashboard/data-scope-indicator.tsx` | Medium |
| P2-03 | 주요 페이지에 PageHeader 적용 | 각 페이지 파일 | Medium |

### 6.3 Phase 3: AI 기능 개선

| ID | 항목 | 파일 | 우선순위 |
|----|------|------|----------|
| P3-01 | AIHubCard 컴포넌트 생성 | `src/components/ai/ai-hub-card.tsx` | Low |
| P3-02 | 대시보드에 AIHubCard 적용 | 대시보드 페이지 | Low |

---

## 7. 데이터 흐름

### 7.1 네비게이션 컨텍스트 흐름

```
URL 변경
    │
    ↓
useNavigationContext() 훅
    │
    ├─→ level 결정 (main/account/campaign/adgroup/ad)
    ├─→ ID 추출 (accountId, campaignId, adGroupId, adId)
    │
    ↓
Sidebar / MobileSidebar
    │
    ├─→ 적절한 navItems 선택
    ├─→ 컨텍스트 헤더 표시 (계정명/캠페인명)
    │
    ↓
API 호출 (필요시)
    │
    └─→ GET /api/accounts/{accountId}
    └─→ GET /api/accounts/{accountId}/campaigns/{campaignId}
```

### 7.2 컴포넌트 계층

```
Layout
├── Sidebar (Desktop)
│   ├── Logo
│   ├── ContextHeader (신규)
│   ├── Navigation Items
│   └── Bottom Actions
├── MobileSidebar (Mobile)
│   ├── Logo
│   ├── ContextHeader (신규)
│   ├── Navigation Items
│   └── Bottom Actions
└── Main Content
    └── PageHeader (신규)
        ├── DrilldownNav (브레드크럼)
        ├── Title + Actions
        └── DataScopeIndicator (신규)
```

---

## 8. 성공 기준

### 8.1 기능적 기준

| ID | 기준 | 검증 방법 |
|----|------|-----------|
| SC-01 | 사이드바에 계정명/캠페인명 표시 | 계정/캠페인 페이지 접속 시 확인 |
| SC-02 | 모바일에서 캠페인 레벨 네비게이션 동작 | 모바일 뷰에서 캠페인 메뉴 확인 |
| SC-03 | 광고그룹 페이지에서 사이드바 메뉴 표시 | 광고그룹 상세 페이지 접속 시 확인 |
| SC-04 | 데이터 범위 표시 동작 | 주요 페이지에서 범위 배지 확인 |
| SC-05 | AIHubCard 대시보드 표시 | 캠페인 개요 페이지에서 확인 |

### 8.2 품질 기준

| ID | 기준 | 검증 방법 |
|----|------|-----------|
| QC-01 | TypeScript 타입 체크 통과 | `npx tsc --noEmit --skipLibCheck` |
| QC-02 | 빌드 성공 | `npm run build` |
| QC-03 | 반응형 테스트 통과 | 375px, 768px, 1024px 테스트 |
| QC-04 | 기존 기능 동작 유지 | 기존 네비게이션 동작 확인 |

---

## 9. 주의사항

### 9.1 기존 코드 호환성

- 기존 `accountId` prop은 유지하되 URL에서 자동 추출 우선
- 기존 navItems 함수는 확장만 하고 삭제하지 않음
- 스타일 클래스는 기존 패턴 유지

### 9.2 성능 고려사항

- 컨텍스트 이름 조회는 필요할 때만 (계정/캠페인 레벨)
- API 응답은 캐싱 고려 (SWR 또는 React Query)
- 모바일에서는 최소한의 DOM 렌더링

---

*Created by bkit PDCA design phase*

# Design: Comprehensive UX Review & Enhancement

## 1. Overview

| 항목 | 내용 |
|------|------|
| **Feature Name** | comprehensive-ux-review |
| **Plan Reference** | `docs/01-plan/features/comprehensive-ux-review.plan.md` |
| **Created** | 2026-02-12 |
| **Phase** | Design |

### 1.1 Scope

이 설계 문서는 Plan 문서의 **Phase 1 (기반 강화)** 및 **Phase 2 (UX 개선)** 핵심 항목에 집중합니다:

1. 다크 모드 지원 (P1-3)
2. 로딩 상태 표준화 (P1-1) - 기존 컴포넌트 활용
3. 빈 상태 컴포넌트 확대 적용 (P1-2) - 기존 컴포넌트 활용
4. 모바일 테이블 카드 뷰 (P2-1)
5. 필터 UX 개선 (P2-2)

---

## 2. Architecture Overview

### 2.1 Component Hierarchy (변경 후)

```
src/components/
├── providers.tsx              # 🔄 수정: ThemeProvider 추가
├── ui/
│   └── theme-toggle.tsx       # 🆕 신규: 테마 전환 버튼
├── common/
│   ├── empty-state.tsx        # ✅ 기존 활용 (확대 적용)
│   ├── skeleton-loader.tsx    # ✅ 기존 활용 (확대 적용)
│   ├── responsive-data-view.tsx  # 🆕 신규: 테이블/카드 반응형 전환
│   └── loading-overlay.tsx    # 🆕 신규: 전체화면 로딩
├── filters/
│   ├── filter-bar.tsx         # 🔄 수정: 필터 칩 통합
│   ├── filter-chip.tsx        # 🆕 신규: 활성 필터 칩
│   └── filter-reset-button.tsx # 🆕 신규: 필터 초기화
├── layout/
│   └── header.tsx             # 🔄 수정: 테마 토글 추가
└── hooks/
    └── use-media-query.ts     # 🆕 신규: 반응형 훅
```

### 2.2 Theme Architecture

```
┌─────────────────────────────────────────────────────┐
│                    providers.tsx                     │
│  ┌───────────────────────────────────────────────┐  │
│  │           ThemeProvider (next-themes)          │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │     QueryClientProvider (react-query)    │  │  │
│  │  │  ┌─────────────────────────────────────┐ │  │  │
│  │  │  │      SessionProvider (next-auth)   │ │  │  │
│  │  │  │              children               │ │  │  │
│  │  │  └─────────────────────────────────────┘ │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Design

### 3.1 Dark Mode Implementation

#### 3.1.1 Dependencies

```bash
npm install next-themes
```

#### 3.1.2 providers.tsx (수정)

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
```

#### 3.1.3 ThemeToggle Component (신규)

**파일**: `src/components/ui/theme-toggle.tsx`

```tsx
'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">테마 변경</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          라이트
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          다크
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          시스템
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

#### 3.1.4 globals.css Dark Mode Variables

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;

    /* Chart colors */
    --chart-1: 221.2 83.2% 53.3%;
    --chart-2: 160 84.1% 39.4%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 224.3 76.3% 48%;

    /* Chart colors (darker) */
    --chart-1: 217.2 91.2% 59.8%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 70% 50%;
    --chart-4: 280 55% 55%;
    --chart-5: 340 65% 50%;
  }
}
```

#### 3.1.5 Header Integration

**파일**: `src/components/layout/header.tsx` (수정)

```tsx
// 기존 import에 추가
import { ThemeToggle } from '@/components/ui/theme-toggle';

// Header 컴포넌트 내 오른쪽 영역에 추가
<div className="flex items-center gap-2">
  <ThemeToggle />
  <NotificationBell />
  {/* ... 기존 사용자 메뉴 */}
</div>
```

---

### 3.2 Responsive Data View (테이블/카드 전환)

#### 3.2.1 useMediaQuery Hook (신규)

**파일**: `src/hooks/use-media-query.ts`

```tsx
'use client';

import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);

    // 초기값 설정
    setMatches(media.matches);

    // 변경 감지
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// Preset hooks
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
```

#### 3.2.2 ResponsiveDataView Component (신규)

**파일**: `src/components/common/responsive-data-view.tsx`

```tsx
'use client';

import { useIsMobile } from '@/hooks/use-media-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// Generic type for data items
interface DataItem {
  id: string;
  [key: string]: unknown;
}

// Card view configuration
interface CardConfig<T> {
  title: (item: T) => string;
  subtitle?: (item: T) => string;
  badge?: (item: T) => { label: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' };
  metrics: Array<{
    label: string;
    value: (item: T) => string | number;
    format?: 'currency' | 'percent' | 'number';
  }>;
  href?: (item: T) => string;
}

// Table view configuration
interface TableConfig<T> {
  columns: Array<{
    key: string;
    header: string;
    cell: (item: T) => React.ReactNode;
    className?: string;
  }>;
  onRowClick?: (item: T) => void;
}

interface ResponsiveDataViewProps<T extends DataItem> {
  data: T[];
  cardConfig: CardConfig<T>;
  tableConfig: TableConfig<T>;
  className?: string;
  emptyState?: React.ReactNode;
}

export function ResponsiveDataView<T extends DataItem>({
  data,
  cardConfig,
  tableConfig,
  className,
  emptyState,
}: ResponsiveDataViewProps<T>) {
  const isMobile = useIsMobile();

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  if (isMobile) {
    return <MobileCardView data={data} config={cardConfig} className={className} />;
  }

  return <DesktopTableView data={data} config={tableConfig} className={className} />;
}

// Mobile Card View
function MobileCardView<T extends DataItem>({
  data,
  config,
  className,
}: {
  data: T[];
  config: CardConfig<T>;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {data.map((item) => {
        const content = (
          <Card className="p-4 hover:bg-muted/50 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{config.title(item)}</h3>
                {config.subtitle && (
                  <p className="text-sm text-muted-foreground truncate">
                    {config.subtitle(item)}
                  </p>
                )}
              </div>
              {config.badge && (
                <Badge variant={config.badge(item).variant || 'secondary'}>
                  {config.badge(item).label}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              {config.metrics.map((metric, index) => (
                <div key={index}>
                  <p className="text-muted-foreground">{metric.label}</p>
                  <p className="font-medium">
                    {formatValue(metric.value(item), metric.format)}
                  </p>
                </div>
              ))}
            </div>

            {config.href && (
              <div className="flex items-center justify-end mt-3 pt-3 border-t">
                <span className="text-sm text-muted-foreground flex items-center">
                  자세히 보기 <ChevronRight className="h-4 w-4 ml-1" />
                </span>
              </div>
            )}
          </Card>
        );

        if (config.href) {
          return (
            <Link key={item.id} href={config.href(item)}>
              {content}
            </Link>
          );
        }

        return <div key={item.id}>{content}</div>;
      })}
    </div>
  );
}

// Desktop Table View
function DesktopTableView<T extends DataItem>({
  data,
  config,
  className,
}: {
  data: T[];
  config: TableConfig<T>;
  className?: string;
}) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            {config.columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-sm font-medium text-muted-foreground',
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr
              key={item.id}
              className={cn(
                'border-b hover:bg-muted/50 transition-colors',
                config.onRowClick && 'cursor-pointer'
              )}
              onClick={() => config.onRowClick?.(item)}
            >
              {config.columns.map((col) => (
                <td key={col.key} className={cn('px-4 py-3 text-sm', col.className)}>
                  {col.cell(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Helper function
function formatValue(value: string | number, format?: 'currency' | 'percent' | 'number'): string {
  if (typeof value === 'string') return value;

  switch (format) {
    case 'currency':
      return `₩${value.toLocaleString()}`;
    case 'percent':
      return `${value.toFixed(2)}%`;
    case 'number':
    default:
      return value.toLocaleString();
  }
}
```

#### 3.2.3 사용 예시 (캠페인 목록)

```tsx
// campaigns 페이지에서 사용
<ResponsiveDataView
  data={campaigns}
  cardConfig={{
    title: (c) => c.name,
    subtitle: (c) => c.objective,
    badge: (c) => ({
      label: c.status === 'ENABLE' ? '활성' : '비활성',
      variant: c.status === 'ENABLE' ? 'default' : 'secondary',
    }),
    metrics: [
      { label: '지출', value: (c) => c.metrics.spend, format: 'currency' },
      { label: 'CTR', value: (c) => c.metrics.ctr, format: 'percent' },
      { label: '전환', value: (c) => c.metrics.conversions, format: 'number' },
      { label: 'ROAS', value: (c) => c.metrics.roas, format: 'number' },
    ],
    href: (c) => `/accounts/${accountId}/campaigns/${c.id}`,
  }}
  tableConfig={{
    columns: [
      { key: 'name', header: '캠페인', cell: (c) => c.name },
      { key: 'status', header: '상태', cell: (c) => <StatusBadge status={c.status} /> },
      { key: 'spend', header: '지출', cell: (c) => `₩${c.metrics.spend.toLocaleString()}`, className: 'text-right' },
      // ... more columns
    ],
    onRowClick: (c) => router.push(`/accounts/${accountId}/campaigns/${c.id}`),
  }}
  emptyState={<NoDataFound title="캠페인이 없습니다" />}
/>
```

---

### 3.3 Filter UX Enhancement

#### 3.3.1 FilterChip Component (신규)

**파일**: `src/components/filters/filter-chip.tsx`

```tsx
'use client';

import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface FilterChipProps {
  label: string;
  value: string;
  onRemove: () => void;
  className?: string;
}

export function FilterChip({ label, value, onRemove, className }: FilterChipProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        'pl-2 pr-1 py-1 flex items-center gap-1 text-xs font-normal',
        className
      )}
    >
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove();
        }}
        className="ml-1 rounded-full hover:bg-muted p-0.5"
        aria-label={`${label} 필터 제거`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}

// Active filters display
interface ActiveFiltersProps {
  filters: Array<{
    key: string;
    label: string;
    value: string;
  }>;
  onRemove: (key: string) => void;
  onReset: () => void;
  className?: string;
}

export function ActiveFilters({ filters, onRemove, onReset, className }: ActiveFiltersProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">활성 필터:</span>
      {filters.map((filter) => (
        <FilterChip
          key={filter.key}
          label={filter.label}
          value={filter.value}
          onRemove={() => onRemove(filter.key)}
        />
      ))}
      <button
        onClick={onReset}
        className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
      >
        모두 초기화
      </button>
    </div>
  );
}
```

#### 3.3.2 FilterBar Enhancement (수정)

**파일**: `src/components/filters/filter-bar.tsx` (수정)

```tsx
'use client';

import { ReactNode } from 'react';
import { ActiveFilters } from './filter-chip';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  children: ReactNode;
  activeFilters?: Array<{
    key: string;
    label: string;
    value: string;
  }>;
  onRemoveFilter?: (key: string) => void;
  onResetFilters?: () => void;
  className?: string;
}

export function FilterBar({
  children,
  activeFilters = [],
  onRemoveFilter,
  onResetFilters,
  className,
}: FilterBarProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Filter controls */}
      <div className="flex flex-wrap items-center gap-3">
        {children}
      </div>

      {/* Active filters display */}
      {activeFilters.length > 0 && onRemoveFilter && onResetFilters && (
        <ActiveFilters
          filters={activeFilters}
          onRemove={onRemoveFilter}
          onReset={onResetFilters}
        />
      )}
    </div>
  );
}
```

#### 3.3.3 사용 예시

```tsx
const [filters, setFilters] = useState({
  status: '',
  objective: '',
  search: '',
});

const activeFilters = [
  filters.status && { key: 'status', label: '상태', value: statusLabels[filters.status] },
  filters.objective && { key: 'objective', label: '목표', value: objectiveLabels[filters.objective] },
].filter(Boolean);

const handleRemoveFilter = (key: string) => {
  setFilters((prev) => ({ ...prev, [key]: '' }));
};

const handleResetFilters = () => {
  setFilters({ status: '', objective: '', search: '' });
};

<FilterBar
  activeFilters={activeFilters}
  onRemoveFilter={handleRemoveFilter}
  onResetFilters={handleResetFilters}
>
  <SearchInput value={filters.search} onChange={(v) => setFilters((p) => ({ ...p, search: v }))} />
  <FilterDropdown value={filters.status} options={statusOptions} onChange={...} />
  <FilterDropdown value={filters.objective} options={objectiveOptions} onChange={...} />
</FilterBar>
```

---

### 3.4 Loading Overlay (신규)

**파일**: `src/components/common/loading-overlay.tsx`

```tsx
'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message = '로딩 중...', className }: LoadingOverlayProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Inline loading (for buttons, etc.)
export function InlineLoader({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />;
}
```

---

## 4. Implementation Order

### 4.1 Phase 1: Foundation (기반)

| 순서 | 작업 | 파일 | 의존성 |
|------|------|------|--------|
| 1 | next-themes 설치 | package.json | - |
| 2 | providers.tsx 수정 | src/components/providers.tsx | 1 |
| 3 | globals.css 다크모드 변수 | src/app/globals.css | - |
| 4 | ThemeToggle 컴포넌트 | src/components/ui/theme-toggle.tsx | 2 |
| 5 | Header에 테마 토글 추가 | src/components/layout/header.tsx | 4 |
| 6 | LoadingOverlay 컴포넌트 | src/components/common/loading-overlay.tsx | - |

### 4.2 Phase 2: UX Enhancement

| 순서 | 작업 | 파일 | 의존성 |
|------|------|------|--------|
| 7 | useMediaQuery 훅 | src/hooks/use-media-query.ts | - |
| 8 | ResponsiveDataView 컴포넌트 | src/components/common/responsive-data-view.tsx | 7 |
| 9 | FilterChip 컴포넌트 | src/components/filters/filter-chip.tsx | - |
| 10 | FilterBar 수정 | src/components/filters/filter-bar.tsx | 9 |
| 11 | 캠페인 목록 반응형 적용 | src/app/(dashboard)/accounts/[accountId]/page.tsx | 8 |
| 12 | 광고그룹 목록 반응형 적용 | src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/page.tsx | 8 |

---

## 5. Data Flow

### 5.1 Theme State Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  ThemeProvider  │ ──► │  useTheme Hook   │ ◄── │  ThemeToggle    │
│  (next-themes)  │     │  (context)       │     │  (UI)           │
└─────────────────┘     └──────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐     ┌──────────────────┐
│  localStorage   │     │  <html class>    │
│  (persistence)  │     │  (Tailwind)      │
└─────────────────┘     └──────────────────┘
```

### 5.2 Filter State Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  URL Params     │ ◄─► │  Page State      │ ◄── │  FilterBar      │
│  (persistence)  │     │  (useState)      │     │  (UI)           │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  ActiveFilters   │
                        │  (display)       │
                        └──────────────────┘
```

---

## 6. API Changes

이 기능은 API 변경이 필요하지 않습니다. 모두 프론트엔드 UI/UX 개선입니다.

---

## 7. Testing Checklist

### 7.1 Dark Mode

- [ ] 라이트 모드에서 모든 페이지 시각적 검토
- [ ] 다크 모드에서 모든 페이지 시각적 검토
- [ ] 시스템 테마 자동 감지 작동
- [ ] 테마 전환 시 깜빡임 없음
- [ ] 차트 색상 다크 모드 대응
- [ ] localStorage 지속성 확인

### 7.2 Responsive Data View

- [ ] 모바일 (< 768px)에서 카드 뷰 표시
- [ ] 데스크톱 (>= 768px)에서 테이블 뷰 표시
- [ ] 화면 크기 변경 시 즉시 전환
- [ ] 카드 클릭 시 상세 페이지 이동
- [ ] 모든 데이터 필드 올바르게 표시

### 7.3 Filter UX

- [ ] 필터 적용 시 칩 표시
- [ ] 칩 X 버튼으로 개별 필터 제거
- [ ] "모두 초기화" 버튼 작동
- [ ] URL과 필터 상태 동기화
- [ ] 페이지 새로고침 후 필터 유지

---

## 8. File Summary

### 8.1 New Files

| 파일 | 설명 |
|------|------|
| `src/components/ui/theme-toggle.tsx` | 테마 전환 드롭다운 |
| `src/hooks/use-media-query.ts` | 반응형 미디어 쿼리 훅 |
| `src/components/common/responsive-data-view.tsx` | 테이블/카드 반응형 전환 |
| `src/components/filters/filter-chip.tsx` | 활성 필터 칩 |
| `src/components/common/loading-overlay.tsx` | 전체화면 로딩 오버레이 |

### 8.2 Modified Files

| 파일 | 변경 내용 |
|------|----------|
| `src/components/providers.tsx` | ThemeProvider 추가 |
| `src/app/globals.css` | 다크 모드 CSS 변수 |
| `src/components/layout/header.tsx` | 테마 토글 버튼 추가 |
| `src/components/filters/filter-bar.tsx` | ActiveFilters 통합 |

### 8.3 Dependencies

```json
{
  "dependencies": {
    "next-themes": "^0.4.4"
  }
}
```

---

## 9. Acceptance Criteria

### 9.1 Must Have

1. ✅ 다크 모드 전환 가능
2. ✅ 모바일에서 테이블이 카드 뷰로 전환
3. ✅ 활성 필터가 칩으로 표시
4. ✅ 필터 초기화 버튼 작동

### 9.2 Should Have

1. ✅ 시스템 테마 자동 감지
2. ✅ 테마 설정 localStorage 저장
3. ✅ 부드러운 테마 전환 (깜빡임 없음)

### 9.3 Nice to Have

1. 차트 색상 다크 모드 최적화
2. 필터 프리셋 저장 기능
3. 고급 필터 패널

---

## 10. References

- Plan Document: `docs/01-plan/features/comprehensive-ux-review.plan.md`
- [next-themes Documentation](https://github.com/pacocoursey/next-themes)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/dark-mode)

---

**Document History**:
| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-02-12 | Claude | 초기 작성 |

# 설계서: Dashboard UX Improvement

## 기본 정보

| 항목 | 내용 |
|------|------|
| **Feature Name** | dashboard-ux-improvement |
| **Plan 문서** | [dashboard-ux-improvement.plan.md](../../01-plan/features/dashboard-ux-improvement.plan.md) |
| **작성일** | 2026-02-11 |
| **작성자** | Claude Opus 4.5 |
| **버전** | 1.0.0 |

---

## 1. 아키텍처 설계

### 1.1 컴포넌트 구조

```
src/
├── components/
│   ├── ui/                          # shadcn/ui 기본 컴포넌트
│   │   ├── sheet.tsx               # 드로어 (기존)
│   │   ├── command.tsx             # Command Palette (신규)
│   │   ├── calendar.tsx            # 캘린더 (신규)
│   │   ├── popover.tsx             # 팝오버 (기존)
│   │   └── breadcrumb.tsx          # 브레드크럼 (신규)
│   │
│   ├── layout/                      # 레이아웃 컴포넌트
│   │   ├── sidebar.tsx             # 사이드바 (수정)
│   │   ├── mobile-sidebar.tsx      # 모바일 사이드바 (신규)
│   │   ├── header.tsx              # 헤더 (수정)
│   │   └── command-menu.tsx        # 글로벌 검색 (신규)
│   │
│   ├── filters/                     # 필터 컴포넌트 (신규 디렉토리)
│   │   ├── filter-bar.tsx          # 필터 바 컨테이너
│   │   ├── search-input.tsx        # 검색 입력
│   │   ├── sort-dropdown.tsx       # 정렬 드롭다운
│   │   ├── filter-dropdown.tsx     # 필터 드롭다운
│   │   └── date-range-picker.tsx   # 날짜 범위 선택기
│   │
│   ├── dashboard/                   # 대시보드 컴포넌트
│   │   ├── kpi-grid.tsx            # KPI 그리드 (기존)
│   │   ├── performance-chart.tsx   # 성과 차트 (수정)
│   │   ├── account-card.tsx        # 계정 카드 (수정)
│   │   └── drilldown-nav.tsx       # 드릴다운 네비게이션 (신규)
│   │
│   ├── insights/                    # 인사이트 컴포넌트
│   │   ├── insight-card.tsx        # 인사이트 카드 (수정)
│   │   ├── insight-detail-sheet.tsx # 인사이트 상세 시트 (신규)
│   │   └── sparkline.tsx           # 스파크라인 차트 (신규)
│   │
│   └── common/                      # 공통 컴포넌트
│       ├── empty-state.tsx         # 빈 상태 (신규)
│       ├── skeleton-loader.tsx     # 스켈레톤 로더 (신규)
│       └── error-state.tsx         # 에러 상태 (신규)
│
├── hooks/                           # 커스텀 훅 (신규 디렉토리)
│   ├── use-url-state.ts            # URL 상태 동기화
│   ├── use-filters.ts              # 필터 상태 관리
│   ├── use-keyboard-shortcut.ts    # 키보드 단축키
│   └── use-local-storage.ts        # 로컬 스토리지
│
└── lib/
    └── utils/
        ├── format.ts               # 포맷팅 유틸 (기존)
        └── url-params.ts           # URL 파라미터 유틸 (신규)
```

### 1.2 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────┐
│                        URL Query Parameters                      │
│  ?dateRange=7d&sort=spend_desc&filter=active&campaign=123       │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                        useUrlState Hook                          │
│  - nuqs 라이브러리 활용                                           │
│  - URL ↔ State 양방향 동기화                                     │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ FilterBar│ │DatePicker│ │ SortDrop │
              └────┬─────┘ └────┬─────┘ └────┬─────┘
                   │            │            │
                   └────────────┼────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │          React Query                 │
              │  - queryKey에 필터 파라미터 포함      │
              │  - 자동 refetch on param change     │
              └─────────────────┬───────────────────┘
                                │
                                ▼
              ┌─────────────────────────────────────┐
              │            API Layer                 │
              │  GET /api/accounts?sort=spend_desc  │
              └─────────────────────────────────────┘
```

---

## 2. 컴포넌트 상세 설계

### 2.1 모바일 사이드바 (FR-04)

#### 2.1.1 MobileSidebar 컴포넌트

**파일**: `src/components/layout/mobile-sidebar.tsx`

```typescript
// Types
interface MobileSidebarProps {
  children?: React.ReactNode;
}

// State
const [open, setOpen] = useState(false);

// Features
- Sheet 컴포넌트 활용 (Radix UI)
- 왼쪽에서 슬라이드 인
- 외부 클릭/ESC로 닫기
- 네비게이션 아이템 클릭 시 자동 닫기
```

**레이아웃 변경**:

```tsx
// src/app/(dashboard)/layout.tsx 수정

// Before (현재)
<div className="flex h-screen">
  <Sidebar className="w-64 fixed" />  {/* 항상 표시 */}
  <main className="ml-64 flex-1">
    {children}
  </main>
</div>

// After (개선)
<div className="flex h-screen">
  {/* 데스크톱: 고정 사이드바 */}
  <Sidebar className="hidden md:flex w-64 fixed" />

  {/* 모바일: 드로어 */}
  <MobileSidebar className="md:hidden" />

  <main className="md:ml-64 flex-1">
    <Header className="sticky top-0">
      {/* 모바일: 햄버거 메뉴 */}
      <MobileMenuTrigger className="md:hidden" />
    </Header>
    {children}
  </main>
</div>
```

**반응형 브레이크포인트**:

| 화면 크기 | 사이드바 동작 |
|-----------|--------------|
| < 768px (모바일) | 드로어 (숨김 기본) |
| >= 768px (태블릿+) | 고정 사이드바 |

### 2.2 필터 바 시스템 (FR-01)

#### 2.2.1 FilterBar 컴포넌트

**파일**: `src/components/filters/filter-bar.tsx`

```typescript
interface FilterBarProps {
  children: React.ReactNode;
  className?: string;
}

// 레이아웃
<div className="flex flex-col sm:flex-row gap-2 sm:gap-4 p-4 bg-muted/50 rounded-lg">
  {children}
</div>
```

#### 2.2.2 SearchInput 컴포넌트

**파일**: `src/components/filters/search-input.tsx`

```typescript
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;  // 기본 300ms
}

// Features
- 디바운스 적용 (타이핑 완료 후 검색)
- Clear 버튼 (X 아이콘)
- 검색 아이콘 (돋보기)
- 키보드: Enter로 즉시 검색, ESC로 클리어
```

#### 2.2.3 SortDropdown 컴포넌트

**파일**: `src/components/filters/sort-dropdown.tsx`

```typescript
interface SortOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface SortDropdownProps {
  options: SortOption[];
  value: string;
  onChange: (value: string) => void;
}

// 정렬 옵션 예시 (계정 목록)
const accountSortOptions: SortOption[] = [
  { value: 'name_asc', label: '이름순', icon: <SortAsc /> },
  { value: 'spend_desc', label: '지출 높은순', icon: <TrendingDown /> },
  { value: 'spend_asc', label: '지출 낮은순', icon: <TrendingUp /> },
  { value: 'roas_desc', label: 'ROAS 높은순', icon: <Target /> },
  { value: 'cpa_asc', label: 'CPA 낮은순', icon: <DollarSign /> },
  { value: 'updated_desc', label: '최근 업데이트순', icon: <Clock /> },
];
```

#### 2.2.4 FilterDropdown 컴포넌트

**파일**: `src/components/filters/filter-dropdown.tsx`

```typescript
interface FilterOption {
  value: string;
  label: string;
  count?: number;  // 해당 필터의 아이템 수
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string | string[];  // 단일 또는 다중 선택
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}

// 필터 옵션 예시 (업종)
const industryOptions: FilterOption[] = [
  { value: 'all', label: '전체 업종' },
  { value: 'fashion', label: '패션', count: 5 },
  { value: 'beauty', label: '뷰티', count: 3 },
  { value: 'food', label: '식품', count: 2 },
  { value: 'tech', label: '테크', count: 4 },
  { value: 'other', label: '기타', count: 1 },
];

// 필터 옵션 예시 (상태)
const statusOptions: FilterOption[] = [
  { value: 'all', label: '모든 상태' },
  { value: 'active', label: '활성', count: 12 },
  { value: 'paused', label: '일시정지', count: 3 },
  { value: 'inactive', label: '비활성', count: 0 },
];
```

### 2.3 날짜 범위 피커 (FR-05)

#### 2.3.1 DateRangePicker 컴포넌트

**파일**: `src/components/filters/date-range-picker.tsx`

```typescript
interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  presets?: DateRangePreset[];
  enableCompare?: boolean;
  compareRange?: DateRange;
  onCompareChange?: (range: DateRange | null) => void;
}

interface DateRangePreset {
  label: string;
  value: string;  // '1d', '7d', '14d', '30d', 'mtd', 'custom'
  getRange: () => DateRange;
}

// 기본 프리셋
const defaultPresets: DateRangePreset[] = [
  {
    label: '오늘',
    value: '1d',
    getRange: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
  {
    label: '어제',
    value: 'yesterday',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    },
  },
  {
    label: '지난 7일',
    value: '7d',
    getRange: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: '지난 14일',
    value: '14d',
    getRange: () => ({ from: subDays(new Date(), 13), to: new Date() }),
  },
  {
    label: '지난 30일',
    value: '30d',
    getRange: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: '이번 달',
    value: 'mtd',
    getRange: () => ({ from: startOfMonth(new Date()), to: new Date() }),
  },
  {
    label: '사용자 지정',
    value: 'custom',
    getRange: () => ({ from: new Date(), to: new Date() }),
  },
];
```

**UI 구조**:

```
┌─────────────────────────────────────────────────────────────┐
│  📅 2026.02.04 - 2026.02.10  ▼                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ ┌─────────────────────┐  ┌────────────────────────────────┐ │
│ │ 빠른 선택            │  │        2026년 2월              │ │
│ ├─────────────────────┤  │  일 월 화 수 목 금 토          │ │
│ │ ○ 오늘              │  │                    1          │ │
│ │ ○ 어제              │  │  2  3  4 [5  6  7  8  9 10]11 │ │
│ │ ● 지난 7일          │  │  12 13 14 15 16 17 18         │ │
│ │ ○ 지난 14일         │  │  19 20 21 22 23 24 25         │ │
│ │ ○ 지난 30일         │  │  26 27 28                     │ │
│ │ ○ 이번 달           │  └────────────────────────────────┤ │
│ │ ○ 사용자 지정        │                                  │ │
│ └─────────────────────┘                                   │ │
│                                                           │ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☐ 이전 기간과 비교                                       │ │
│ │   비교 기간: 2026.01.28 - 2026.02.03                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                           │ │
│                              [ 취소 ]  [ 적용 ]            │ │
└─────────────────────────────────────────────────────────────┘
```

### 2.4 글로벌 검색 (FR-02)

#### 2.4.1 CommandMenu 컴포넌트

**파일**: `src/components/layout/command-menu.tsx`

```typescript
interface SearchResult {
  id: string;
  type: 'account' | 'campaign' | 'creative' | 'insight' | 'strategy';
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  href: string;
}

interface CommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 검색 API
// GET /api/search?q=keyword&types=account,campaign,creative
```

**UI 구조**:

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 검색...                                          ⌘K    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  최근 검색                                                   │
│  ├─ 🏢 패션브랜드A                                          │
│  └─ 📊 CTR 하락 인사이트                                    │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  계정 (3)                                                   │
│  ├─ 🏢 패션브랜드A        광고주: 패션컴퍼니                 │
│  ├─ 🏢 뷰티브랜드B        광고주: 뷰티코리아                 │
│  └─ 🏢 식품브랜드C        광고주: 푸드테크                   │
│                                                             │
│  캠페인 (5)                                                 │
│  ├─ 📁 봄 시즌 캠페인      패션브랜드A                       │
│  └─ 📁 신제품 런칭         뷰티브랜드B                       │
│                                                             │
│  인사이트 (2)                                               │
│  ├─ 💡 CTR 15% 하락 감지   패션브랜드A                      │
│  └─ 💡 ROAS 개선 기회      뷰티브랜드B                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**키보드 단축키**:

| 단축키 | 동작 |
|--------|------|
| `⌘/Ctrl + K` | 검색창 열기 |
| `↑ / ↓` | 결과 탐색 |
| `Enter` | 선택한 항목으로 이동 |
| `ESC` | 검색창 닫기 |

### 2.5 캠페인 드릴다운 (FR-03)

#### 2.5.1 DrilldownNav 컴포넌트

**파일**: `src/components/dashboard/drilldown-nav.tsx`

```typescript
interface DrilldownLevel {
  id: string;
  name: string;
  type: 'account' | 'campaign' | 'adgroup' | 'ad';
  href: string;
}

interface DrilldownNavProps {
  levels: DrilldownLevel[];
  currentLevel: number;
}

// Breadcrumb 표시
// 계정 > 캠페인 > 광고그룹 > 광고
```

#### 2.5.2 계정 대시보드 탭 구조

**파일**: `src/app/(dashboard)/accounts/[accountId]/page.tsx` 수정

```typescript
// 탭 구조
const tabs = [
  { id: 'overview', label: '개요', icon: LayoutDashboard },
  { id: 'campaigns', label: '캠페인', icon: FolderKanban },
  { id: 'adgroups', label: '광고그룹', icon: Layers },
  { id: 'ads', label: '광고', icon: FileImage },
];

// 각 탭의 데이터 로딩
// GET /api/accounts/{id}/campaigns
// GET /api/accounts/{id}/adgroups?campaign={campaignId}
// GET /api/accounts/{id}/ads?adgroup={adgroupId}
```

**캠페인 테이블 컬럼**:

| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| name | string | 캠페인 이름 |
| status | badge | 운영중/일시정지/종료 |
| objective | string | 캠페인 목표 |
| budget | currency | 일 예산 |
| spend | currency | 지출액 |
| impressions | number | 노출수 |
| clicks | number | 클릭수 |
| conversions | number | 전환수 |
| ctr | percent | 클릭률 |
| cpa | currency | 전환당 비용 |
| roas | number | 광고 수익률 |

### 2.6 URL 상태 동기화 (FR-10)

#### 2.6.1 useUrlState 훅

**파일**: `src/hooks/use-url-state.ts`

```typescript
import { parseAsString, parseAsArrayOf, useQueryState } from 'nuqs';

// 사용 예시
function AccountsPage() {
  // 단일 값
  const [sort, setSort] = useQueryState('sort', parseAsString.withDefault('spend_desc'));

  // 배열 값
  const [industries, setIndustries] = useQueryState(
    'industries',
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // 날짜 범위
  const [dateRange, setDateRange] = useQueryState('dateRange', parseAsString.withDefault('7d'));

  // 검색어
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));

  // 비교 모드
  const [compare, setCompare] = useQueryState('compare', parseAsString.withDefault('false'));
}
```

**URL 스키마**:

```
/accounts?
  q=패션&
  sort=spend_desc&
  industries=fashion,beauty&
  status=active&
  dateRange=7d&
  compare=true

/accounts/123?
  tab=campaigns&
  campaign=456&
  dateRange=30d&
  metrics=spend,roas,ctr
```

### 2.7 인사이트 개선 (FR-07)

#### 2.7.1 Sparkline 컴포넌트

**파일**: `src/components/insights/sparkline.tsx`

```typescript
interface SparklineProps {
  data: number[];
  width?: number;   // 기본 80
  height?: number;  // 기본 24
  color?: string;   // 기본 'currentColor'
  showTrend?: boolean;  // 상승/하락 표시
}

// SVG 기반 미니 차트
// Recharts의 LineChart를 간소화한 버전
```

#### 2.7.2 InsightDetailSheet 컴포넌트

**파일**: `src/components/insights/insight-detail-sheet.tsx`

```typescript
interface InsightDetailSheetProps {
  insight: Insight;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 시트 내용
// - 전체 인사이트 내용
// - 관련 메트릭 차트 (확대 버전)
// - 연관 캠페인/소재 목록
// - 권장 액션 버튼
// - 전략으로 전환 버튼
```

**UI 구조**:

```
┌─────────────────────────────────────────────────────────────┐
│  ← 인사이트 상세                                      [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ⚠️ CTR 하락 감지                                          │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  패션브랜드A의 "봄 시즌 캠페인"에서 지난 7일간               │
│  CTR이 2.5% → 1.8%로 28% 하락했습니다.                     │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │     CTR 추이 (14일)                                   │ │
│  │     📈 [차트 영역]                                    │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  📊 주요 지표                                               │
│  ├─ 노출수: 150,000 (+5%)                                  │
│  ├─ 클릭수: 2,700 (-25%)                                   │
│  └─ 전환수: 45 (-15%)                                      │
│                                                             │
│  🔗 관련 항목                                               │
│  ├─ 📁 봄 시즌 캠페인                          [바로가기]   │
│  ├─ 🖼️ 소재 A-001                             [바로가기]   │
│  └─ 🖼️ 소재 A-002                             [바로가기]   │
│                                                             │
│  💡 권장 액션                                               │
│  1. 소재 피로도 점검 및 교체 검토                            │
│  2. 타겟 오디언스 재검토                                     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  [ 전략으로 전환 ]                      [ 읽음으로 표시 ]    │
└─────────────────────────────────────────────────────────────┘
```

### 2.8 공통 컴포넌트

#### 2.8.1 EmptyState 컴포넌트

**파일**: `src/components/common/empty-state.tsx`

```typescript
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// 사용 예시
<EmptyState
  icon={<Search className="h-12 w-12 text-muted-foreground" />}
  title="검색 결과가 없습니다"
  description="다른 검색어로 시도해 보세요"
  action={{
    label: "필터 초기화",
    onClick: () => resetFilters()
  }}
/>
```

#### 2.8.2 SkeletonLoader 컴포넌트

**파일**: `src/components/common/skeleton-loader.tsx`

```typescript
interface SkeletonLoaderProps {
  type: 'card' | 'table' | 'chart' | 'list';
  count?: number;
}

// 각 타입별 스켈레톤 UI
// - card: 카드 형태 (KPI, 계정 카드 등)
// - table: 테이블 행
// - chart: 차트 영역
// - list: 리스트 아이템
```

#### 2.8.3 ErrorState 컴포넌트

**파일**: `src/components/common/error-state.tsx`

```typescript
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  showDetails?: boolean;
  error?: Error;
}

// 사용 예시
<ErrorState
  title="데이터를 불러올 수 없습니다"
  message="네트워크 연결을 확인하고 다시 시도해 주세요"
  onRetry={refetch}
/>
```

---

## 3. API 설계

### 3.1 검색 API

**엔드포인트**: `GET /api/search`

```typescript
// Request
interface SearchRequest {
  q: string;              // 검색어 (최소 2자)
  types?: string[];       // 검색 대상 타입 필터
  limit?: number;         // 결과 제한 (기본 10)
  accountId?: string;     // 특정 계정 내 검색
}

// Response
interface SearchResponse {
  results: {
    accounts: SearchResult[];
    campaigns: SearchResult[];
    creatives: SearchResult[];
    insights: SearchResult[];
    strategies: SearchResult[];
  };
  total: number;
  query: string;
}

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  metadata?: Record<string, any>;
  href: string;
  score: number;  // 검색 관련도
}
```

### 3.2 캠페인 API

**엔드포인트**: `GET /api/accounts/{accountId}/campaigns`

```typescript
// Request Query Parameters
interface CampaignListRequest {
  sort?: 'name' | 'spend' | 'roas' | 'ctr' | 'status';
  order?: 'asc' | 'desc';
  status?: 'active' | 'paused' | 'deleted';
  dateRange?: string;
  page?: number;
  limit?: number;
}

// Response
interface CampaignListResponse {
  campaigns: Campaign[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'deleted';
  objective: string;
  budget: number;
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
  adGroupCount: number;
  createdAt: string;
  updatedAt: string;
}
```

### 3.3 광고그룹 API

**엔드포인트**: `GET /api/accounts/{accountId}/adgroups`

```typescript
// Request Query Parameters
interface AdGroupListRequest {
  campaignId?: string;  // 특정 캠페인의 광고그룹만
  sort?: 'name' | 'spend' | 'roas' | 'ctr';
  order?: 'asc' | 'desc';
  dateRange?: string;
}

// Response
interface AdGroupListResponse {
  adGroups: AdGroup[];
  campaign?: Campaign;  // campaignId가 있을 경우 캠페인 정보 포함
}
```

### 3.4 계정 목록 API 수정

**엔드포인트**: `GET /api/accounts` (수정)

```typescript
// Request Query Parameters (추가)
interface AccountListRequest {
  q?: string;                  // 검색어
  sort?: 'name' | 'spend' | 'roas' | 'cpa' | 'updated';
  order?: 'asc' | 'desc';
  industry?: string[];         // 업종 필터
  status?: 'active' | 'paused' | 'all';
  dateRange?: string;
  compare?: boolean;           // 비교 기간 포함
}

// Response (추가 필드)
interface AccountWithMetrics {
  // 기존 필드...
  metrics: {
    current: MetricsData;
    previous?: MetricsData;    // compare=true일 때
    change?: ChangeData;       // 변화율
  };
}

interface ChangeData {
  spend: number;      // 퍼센트 변화
  roas: number;
  cpa: number;
  ctr: number;
}
```

---

## 4. 상태 관리

### 4.1 필터 상태 구조

```typescript
interface FilterState {
  // 공통 필터
  dateRange: {
    preset: string;       // '7d', '14d', '30d', 'custom'
    from: Date;
    to: Date;
  };
  compare: boolean;
  compareRange?: {
    from: Date;
    to: Date;
  };

  // 검색
  search: string;

  // 정렬
  sort: {
    field: string;
    order: 'asc' | 'desc';
  };

  // 페이지별 필터
  accounts: {
    industry: string[];
    status: string;
  };

  campaigns: {
    status: string;
    objective: string;
  };

  creatives: {
    type: string;
    grade: string;
    fatigueLevel: string;
  };

  insights: {
    type: string;
    severity: string;
    unreadOnly: boolean;
  };
}
```

### 4.2 React Query 키 구조

```typescript
// Query Keys
const queryKeys = {
  accounts: {
    all: ['accounts'] as const,
    list: (filters: AccountFilters) => ['accounts', 'list', filters] as const,
    detail: (id: string) => ['accounts', 'detail', id] as const,
    metrics: (id: string, dateRange: string) => ['accounts', id, 'metrics', dateRange] as const,
  },
  campaigns: {
    all: (accountId: string) => ['campaigns', accountId] as const,
    list: (accountId: string, filters: CampaignFilters) =>
      ['campaigns', accountId, 'list', filters] as const,
  },
  search: {
    results: (query: string, types?: string[]) => ['search', query, types] as const,
    recent: ['search', 'recent'] as const,
  },
};
```

---

## 5. UI/UX 가이드라인

### 5.1 반응형 브레이크포인트

| 브레이크포인트 | 화면 크기 | 레이아웃 |
|---------------|----------|----------|
| xs | < 640px | 1열, 드로어 사이드바 |
| sm | 640px ~ 767px | 1-2열, 드로어 사이드바 |
| md | 768px ~ 1023px | 2열, 고정 사이드바 |
| lg | 1024px ~ 1279px | 3열, 고정 사이드바 |
| xl | >= 1280px | 4열, 고정 사이드바 |

### 5.2 컬러 시스템

```typescript
// 상태 색상
const statusColors = {
  positive: 'text-green-600 bg-green-50',   // 상승, 성공
  negative: 'text-red-600 bg-red-50',       // 하락, 실패
  warning: 'text-yellow-600 bg-yellow-50',  // 주의
  neutral: 'text-gray-600 bg-gray-50',      // 중립
  info: 'text-blue-600 bg-blue-50',         // 정보
};

// 등급 색상
const gradeColors = {
  S: 'text-purple-600 bg-purple-50',
  A: 'text-blue-600 bg-blue-50',
  B: 'text-green-600 bg-green-50',
  C: 'text-yellow-600 bg-yellow-50',
  D: 'text-orange-600 bg-orange-50',
  F: 'text-red-600 bg-red-50',
};
```

### 5.3 애니메이션

```typescript
// 트랜지션 설정
const transitions = {
  sidebar: 'transition-transform duration-300 ease-in-out',
  dropdown: 'transition-opacity duration-150 ease-out',
  modal: 'transition-all duration-200 ease-out',
  skeleton: 'animate-pulse',
};

// 스켈레톤 shimmer 효과
const shimmerClass = `
  relative overflow-hidden
  before:absolute before:inset-0
  before:-translate-x-full
  before:animate-[shimmer_1.5s_infinite]
  before:bg-gradient-to-r
  before:from-transparent before:via-white/60 before:to-transparent
`;
```

### 5.4 접근성

- 모든 인터랙티브 요소에 `focus-visible` 스타일 적용
- 키보드 네비게이션 지원 (Tab, Enter, Space, Arrow keys)
- ARIA 레이블 필수 적용
- 색상만으로 정보 전달하지 않음 (아이콘, 텍스트 병용)
- 최소 터치 타겟 크기: 44x44px

---

## 6. 구현 순서

### Phase 1 (Week 1): 기본 UX

```
1. 모바일 사이드바 (FR-04)
   ├── src/components/ui/sheet.tsx (확인)
   ├── src/components/layout/mobile-sidebar.tsx (신규)
   └── src/app/(dashboard)/layout.tsx (수정)

2. 필터 바 시스템 (FR-01)
   ├── src/components/filters/filter-bar.tsx
   ├── src/components/filters/search-input.tsx
   ├── src/components/filters/sort-dropdown.tsx
   ├── src/components/filters/filter-dropdown.tsx
   └── src/app/(dashboard)/accounts/page.tsx (수정)

3. API 수정
   └── src/app/api/accounts/route.ts (수정)
```

### Phase 2 (Week 2): 날짜 & 검색

```
1. 날짜 범위 피커 (FR-05)
   ├── src/components/ui/calendar.tsx (신규)
   ├── src/components/filters/date-range-picker.tsx
   └── src/components/dashboard/performance-chart.tsx (수정)

2. 글로벌 검색 (FR-02)
   ├── src/components/ui/command.tsx (신규)
   ├── src/components/layout/command-menu.tsx
   ├── src/app/api/search/route.ts (신규)
   └── src/app/(dashboard)/layout.tsx (수정)

3. 훅 구현
   ├── src/hooks/use-keyboard-shortcut.ts
   └── src/hooks/use-url-state.ts
```

### Phase 3 (Week 3): 비교 & URL

```
1. 데이터 비교 기능 (FR-06)
   ├── src/app/api/accounts/[accountId]/metrics/route.ts (수정)
   ├── src/components/dashboard/kpi-grid.tsx (수정)
   └── src/components/dashboard/performance-chart.tsx (수정)

2. URL 상태 동기화 (FR-10)
   ├── 패키지 설치: nuqs
   ├── src/hooks/use-url-state.ts (확장)
   └── 각 페이지 필터 URL 연동
```

### Phase 4 (Week 4): 드릴다운 & 인사이트

```
1. 캠페인 드릴다운 (FR-03)
   ├── src/components/ui/breadcrumb.tsx (신규)
   ├── src/components/dashboard/drilldown-nav.tsx
   ├── src/app/api/accounts/[accountId]/campaigns/route.ts (신규)
   ├── src/app/api/accounts/[accountId]/adgroups/route.ts (신규)
   └── src/app/(dashboard)/accounts/[accountId]/page.tsx (수정)

2. 인사이트 연결 (FR-07)
   ├── src/components/insights/sparkline.tsx
   ├── src/components/insights/insight-detail-sheet.tsx
   └── src/components/insights/insight-card.tsx (수정)
```

### Phase 5 (선택): 고급 기능

```
1. 테이블 커스터마이징 (FR-09)
2. 차트 인터랙션 (FR-08)
3. 빈 상태 UI (FR-11)
4. 기타 Nice to Have
```

---

## 7. 테스트 계획

### 7.1 단위 테스트

- 각 필터 컴포넌트의 상태 변경 테스트
- URL 파라미터 파싱/직렬화 테스트
- 날짜 범위 계산 테스트

### 7.2 통합 테스트

- 필터 변경 → API 호출 → UI 업데이트 플로우
- URL 변경 → 필터 상태 동기화
- 검색 → 결과 표시 → 네비게이션

### 7.3 E2E 테스트

- 모바일 사이드바 열기/닫기
- 날짜 범위 선택 → 차트 업데이트
- 캠페인 드릴다운 네비게이션
- 글로벌 검색 → 결과 선택 → 페이지 이동

---

## 8. 패키지 의존성

### 8.1 신규 패키지

```json
{
  "dependencies": {
    "cmdk": "^0.2.0",
    "nuqs": "^1.17.0",
    "react-day-picker": "^8.10.0"
  }
}
```

### 8.2 설치 명령

```bash
npm install cmdk nuqs react-day-picker
```

---

## 9. 체크리스트

### 9.1 구현 체크리스트

- [x] FR-01: 대시보드 정렬/필터 ✅ Phase 1 완료
- [x] FR-02: 글로벌 검색 ✅ Phase 2 완료
- [x] FR-03: 캠페인 드릴다운 ✅ Phase 4 완료 (Breadcrumb, DrilldownNav, CampaignsTable, API)
- [x] FR-04: 모바일 사이드바 ✅ Phase 1 완료
- [x] FR-05: 날짜 범위 피커 ✅ Phase 2 완료
- [x] FR-06: 데이터 비교 기능 ✅ Phase 3 완료 (차트 비교 토글, URL 동기화)
- [x] FR-07: 인사이트-데이터 연결 ✅ Phase 4 완료 (Sparkline, InsightDetailSheet)
- [x] FR-08: 차트 인터랙션 강화 ✅ Phase 5 완료 (InteractiveChart - 줌, 브러시, 이상치 감지, 트렌드 표시)
- [x] FR-09: 테이블 컬럼 커스터마이징 ✅ Phase 5 완료 (ColumnCustomizer, useColumnVisibility, localStorage 연동)
- [x] FR-10: 필터 상태 URL 동기화 ✅ Phase 2-3 완료 (계정 목록, 대시보드)
- [x] FR-11: 빈 상태 UI ✅ Phase 2 완료 (EmptyState, SkeletonLoader)

### 9.2 품질 체크리스트

- [ ] 모바일 반응형 테스트 (iOS Safari, Android Chrome)
- [ ] 키보드 네비게이션 테스트
- [ ] 로딩 상태 확인
- [ ] 에러 상태 확인
- [ ] URL 공유 기능 테스트
- [ ] 성능 프로파일링 (React DevTools)

---

*이 문서는 PDCA Design 단계의 산출물입니다.*
*다음 단계: `/pdca do dashboard-ux-improvement`*

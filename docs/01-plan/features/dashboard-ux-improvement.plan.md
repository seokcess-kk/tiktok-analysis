# 계획서: Dashboard UX Improvement

## 기본 정보

| 항목 | 내용 |
|------|------|
| **Feature Name** | dashboard-ux-improvement |
| **작성일** | 2026-02-11 |
| **작성자** | Claude Opus 4.5 |
| **우선순위** | High |
| **예상 레벨** | Dynamic |

---

## 1. 배경 및 목적

### 1.1 현재 상황

TikTok Ads Analysis 시스템은 실시간 API 연동과 기본적인 기능 구현이 완료된 상태입니다. 그러나 사용자 경험(UX) 측면에서 다음과 같은 불편함이 존재합니다:

- **대시보드**: 데이터 표시 기준이 불명확하고, 정렬/필터링 옵션 부재
- **데이터 선택**: 날짜 범위만 선택 가능, 캠페인/광고그룹 레벨 필터 없음
- **인사이트 분석**: 연관 데이터 탐색이 불편, 컨텍스트 전환 빈번
- **모바일 사용성**: 사이드바가 화면의 50%를 차지, 테이블 스크롤 불편

### 1.2 개선 목적

1. **데이터 탐색 효율성 향상**: 사용자가 원하는 데이터를 빠르게 찾을 수 있도록
2. **의사결정 지원 강화**: 인사이트와 실제 데이터의 연결고리 개선
3. **모바일 최적화**: 어디서든 편리하게 광고 성과 확인
4. **일관된 UX**: 모든 페이지에서 동일한 인터랙션 패턴

---

## 2. 요구사항 정의

### 2.1 핵심 요구사항 (Must Have)

| ID | 요구사항 | 설명 | 우선순위 |
|----|----------|------|----------|
| FR-01 | 대시보드 정렬/필터 | 계정 목록 및 KPI를 다양한 기준으로 정렬 | Critical |
| FR-02 | 글로벌 검색 | 전체 페이지에서 키워드 검색 지원 | Critical |
| FR-03 | 캠페인 레벨 필터 | 계정 > 캠페인 > 광고그룹 > 광고 드릴다운 | Critical |
| FR-04 | 모바일 사이드바 개선 | 드로어 형태로 변경, 토글 버튼 | Critical |
| FR-05 | 날짜 범위 피커 고도화 | 캘린더 UI, 사용자 정의 기간 선택 | High |
| FR-06 | 데이터 비교 기능 | 이전 기간 대비 변화율 실제 구현 | High |

### 2.2 확장 요구사항 (Should Have)

| ID | 요구사항 | 설명 | 우선순위 |
|----|----------|------|----------|
| FR-07 | 인사이트-데이터 연결 | 인사이트 클릭 시 관련 차트/테이블 하이라이트 | Medium |
| FR-08 | 차트 인터랙션 강화 | 드래그 줌, 범위 선택, 데이터 포인트 클릭 | Medium |
| FR-09 | 테이블 컬럼 커스터마이징 | 사용자가 표시할 컬럼 선택 | Medium |
| FR-10 | 필터 상태 유지 | URL 쿼리 파라미터로 필터 상태 공유 가능 | Medium |
| FR-11 | 빈 상태 UI 개선 | 데이터 없을 때 안내 메시지 및 액션 제안 | Medium |

### 2.3 선택 요구사항 (Nice to Have)

| ID | 요구사항 | 설명 | 우선순위 |
|----|----------|------|----------|
| FR-12 | 대시보드 위젯 커스터마이징 | 사용자가 원하는 위젯 배치 | Low |
| FR-13 | 다크 모드 지원 | 시스템 설정 연동 | Low |
| FR-14 | 키보드 단축키 | 파워 유저를 위한 단축키 지원 | Low |
| FR-15 | 데이터 내보내기 | CSV/Excel 내보내기 기능 | Low |

---

## 3. 현재 UI/UX 문제점 분석

### 3.1 대시보드 페이지

#### 문제점
```
┌─────────────────────────────────────────────────────┐
│ 계정 목록                                            │
│ ┌─────┐ ┌─────┐ ┌─────┐                             │
│ │계정1│ │계정2│ │계정3│  ← 정렬 기준 없음            │
│ └─────┘ └─────┘ └─────┘                             │
│                                                     │
│ 변화율: 0%  0%  0%  ← 이전 기간 비교 미구현          │
└─────────────────────────────────────────────────────┘
```

#### 개선 방향
- 지출/ROAS/CPA 기준 정렬 드롭다운 추가
- 업종/상태별 필터 추가
- 실제 이전 기간 데이터로 변화율 계산

### 3.2 소재 분석 페이지

#### 문제점
```
┌─────────────────────────────────────────────────────┐
│ 소재 테이블 (11개 컬럼)                              │
│ ← 수평 스크롤 필요 →                                 │
│                                                     │
│ 특정 소재 검색 불가                                   │
│ 캠페인별 필터 없음                                    │
└─────────────────────────────────────────────────────┘
```

#### 개선 방향
- 검색창 추가 (소재ID, 이름 검색)
- 캠페인/광고그룹 드롭다운 필터
- 컬럼 표시/숨기기 옵션
- 카드 뷰 기본 설정 (모바일)

### 3.3 인사이트 페이지

#### 문제점
```
┌─────────────────────────────────────────────────────┐
│ 인사이트 카드                                        │
│ "CTR이 15% 하락했습니다"                             │
│                                                     │
│ → 어떤 소재/캠페인인지 바로 확인 불가                  │
│ → 관련 차트로 이동하려면 여러 번 클릭 필요             │
└─────────────────────────────────────────────────────┘
```

#### 개선 방향
- 인사이트 클릭 시 관련 데이터 팝업/슬라이드오버
- 미니 차트 인라인 표시
- "자세히 보기" → 해당 페이지로 컨텍스트 유지하며 이동

### 3.4 모바일 사용성

#### 문제점
```
┌──────────┬────────────────┐
│ Sidebar  │                │
│  (256px) │   Content      │
│          │   (좁음)       │
│  고정    │                │
└──────────┴────────────────┘
```

#### 개선 방향
```
┌───────────────────────────┐
│ ☰ Header                  │
├───────────────────────────┤
│                           │
│   Content (전체 너비)      │
│                           │
└───────────────────────────┘
│ 사이드바 → 드로어로 변경    │
```

---

## 4. 개선 계획

### 4.1 Phase 1: 기본 UX 개선 (Core)

#### 4.1.1 대시보드 정렬/필터 시스템

**구현 범위:**
- 계정 목록 정렬: 이름, 지출, ROAS, CPA, 마지막 업데이트
- 필터: 업종, 계정 상태 (활성/비활성)
- 검색: 계정명, 클라이언트명 검색

**UI 컴포넌트:**
```tsx
// FilterBar 컴포넌트
<FilterBar>
  <SearchInput placeholder="계정 검색..." />
  <SortDropdown options={['지출순', 'ROAS순', 'CPA순', '이름순']} />
  <FilterDropdown
    label="업종"
    options={['전체', '패션', '뷰티', '식품', '기타']}
  />
</FilterBar>
```

#### 4.1.2 모바일 반응형 사이드바

**구현 범위:**
- 모바일(< 768px): 햄버거 메뉴 + 드로어
- 태블릿/데스크톱: 기존 고정 사이드바 유지
- 드로어 외부 클릭/스와이프로 닫기

**UI 패턴:**
```tsx
// MobileSidebar 컴포넌트
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" className="md:hidden">
      <Menu className="h-6 w-6" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left">
    <Sidebar />
  </SheetContent>
</Sheet>
```

#### 4.1.3 날짜 범위 피커 고도화

**구현 범위:**
- 캘린더 UI (react-day-picker 활용)
- 사전 설정: 오늘, 어제, 지난 7일, 지난 14일, 지난 30일, 이번 달
- 사용자 정의 범위 선택
- 기간 비교 옵션 (이전 기간 vs 동일 기간 작년)

**UI 컴포넌트:**
```tsx
// DateRangePicker 컴포넌트
<Popover>
  <PopoverTrigger>
    <Button variant="outline">
      <CalendarIcon className="mr-2" />
      {formatDateRange(dateRange)}
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    <DateRangePresets onSelect={handlePresetSelect} />
    <Calendar
      mode="range"
      selected={dateRange}
      onSelect={setDateRange}
    />
    <CompareToggle
      enabled={compareEnabled}
      onToggle={setCompareEnabled}
    />
  </PopoverContent>
</Popover>
```

### 4.2 Phase 2: 데이터 탐색 강화

#### 4.2.1 글로벌 검색 (Command Palette)

**구현 범위:**
- Ctrl/Cmd + K로 검색창 열기
- 최근 검색 기록
- 검색 결과 카테고리별 그룹핑 (계정, 소재, 인사이트, 전략)
- 퍼지 검색 지원

**UI 패턴:**
```tsx
// CommandPalette 컴포넌트 (cmdk 라이브러리 활용)
<CommandDialog open={open} onOpenChange={setOpen}>
  <CommandInput placeholder="검색..." />
  <CommandList>
    <CommandGroup heading="계정">
      {accounts.map(account => (
        <CommandItem key={account.id}>
          <Building className="mr-2" />
          {account.name}
        </CommandItem>
      ))}
    </CommandGroup>
    <CommandGroup heading="소재">
      {creatives.map(creative => (...))}
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

#### 4.2.2 캠페인 레벨 드릴다운

**구현 범위:**
- 계정 대시보드에 캠페인 목록 탭 추가
- 캠페인 선택 시 광고그룹 목록 표시
- Breadcrumb 네비게이션
- 각 레벨별 메트릭 표시

**데이터 구조:**
```
계정 (Account)
├── 캠페인 1 (Campaign)
│   ├── 광고그룹 A (Ad Group)
│   │   ├── 광고 1 (Ad)
│   │   └── 광고 2 (Ad)
│   └── 광고그룹 B
└── 캠페인 2
```

**UI 패턴:**
```tsx
// DrilldownNav 컴포넌트
<Breadcrumb>
  <BreadcrumbItem>
    <Link href={`/accounts/${accountId}`}>계정</Link>
  </BreadcrumbItem>
  {campaign && (
    <BreadcrumbItem>
      <Link href={`/accounts/${accountId}/campaigns/${campaign.id}`}>
        {campaign.name}
      </Link>
    </BreadcrumbItem>
  )}
  {adGroup && (
    <BreadcrumbItem current>
      {adGroup.name}
    </BreadcrumbItem>
  )}
</Breadcrumb>
```

#### 4.2.3 필터 상태 URL 동기화

**구현 범위:**
- 모든 필터 상태를 URL 쿼리 파라미터로 저장
- 페이지 새로고침 시 필터 유지
- 필터링된 뷰 URL 공유 가능
- 뒤로 가기 시 이전 필터 상태 복원

**URL 패턴:**
```
/accounts/123?
  dateRange=7d&
  compare=true&
  sort=spend_desc&
  campaign=456&
  metrics=spend,roas,ctr
```

### 4.3 Phase 3: 인사이트 경험 개선

#### 4.3.1 인사이트-데이터 연결

**구현 범위:**
- 인사이트 카드에 미니 스파크라인 차트
- "관련 데이터 보기" 버튼 → 슬라이드오버 패널
- 해당 캠페인/소재로 바로 이동 링크
- 컨텍스트 유지 (필터, 날짜 범위)

**UI 패턴:**
```tsx
// InsightCard 확장
<InsightCard>
  <InsightHeader>
    <InsightIcon type={insight.type} />
    <InsightTitle>{insight.title}</InsightTitle>
    <Sparkline data={insight.relatedData} />
  </InsightHeader>
  <InsightBody>
    {insight.summary}
    <RelatedEntities>
      {insight.relatedCampaigns.map(c => (
        <Badge key={c.id} onClick={() => navigateTo(c)}>
          {c.name}
        </Badge>
      ))}
    </RelatedEntities>
  </InsightBody>
  <InsightFooter>
    <Button variant="ghost" onClick={openDetailSheet}>
      자세히 보기
    </Button>
  </InsightFooter>
</InsightCard>
```

#### 4.3.2 차트 인터랙션 강화

**구현 범위:**
- 데이터 포인트 클릭 시 해당 날짜 상세 정보
- 드래그로 범위 선택 → 해당 기간 확대
- 차트 툴바: 확대/축소, 리셋, 내보내기
- 비교 모드: 두 기간 오버레이

**UI 패턴:**
```tsx
// EnhancedChart 컴포넌트
<ChartContainer>
  <ChartToolbar>
    <ZoomControls />
    <ExportButton />
    <CompareToggle />
  </ChartToolbar>
  <ResponsiveContainer>
    <LineChart
      data={data}
      onMouseDown={handleBrushStart}
      onMouseUp={handleBrushEnd}
    >
      {/* 기존 차트 요소 */}
      <Brush dataKey="date" height={30} />
      <ReferenceArea
        x1={brushStart}
        x2={brushEnd}
        strokeOpacity={0.3}
      />
    </LineChart>
  </ResponsiveContainer>
</ChartContainer>
```

### 4.4 Phase 4: 고급 기능

#### 4.4.1 테이블 컬럼 커스터마이징

**구현 범위:**
- 컬럼 표시/숨기기 토글
- 컬럼 순서 드래그 앤 드롭
- 설정 로컬 스토리지 저장
- 프리셋: 기본, 성과 중심, 비용 중심

#### 4.4.2 빈 상태 및 로딩 UX

**구현 범위:**
- 데이터 없음: 안내 메시지 + 다음 액션 제안
- 로딩 중: 스켈레톤 UI (shimmer effect)
- 에러 상태: 재시도 버튼 + 상세 에러 정보

---

## 5. 기술 스택

### 5.1 추가 라이브러리

| 라이브러리 | 용도 | 버전 |
|-----------|------|------|
| `cmdk` | Command Palette (검색) | ^0.2.0 |
| `react-day-picker` | 캘린더 날짜 선택 | ^8.10.0 |
| `@dnd-kit/core` | 드래그 앤 드롭 | ^6.1.0 |
| `nuqs` | URL 쿼리 상태 관리 | ^1.17.0 |

### 5.2 기존 활용 라이브러리

- **Radix UI / shadcn/ui**: Sheet(드로어), Popover, Command
- **Recharts**: 차트 (Brush 컴포넌트 추가 활용)
- **Tailwind CSS**: 반응형 유틸리티

---

## 6. 성공 지표 (KPI)

### 6.1 정량적 지표

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| 페이지 이탈률 | 측정 필요 | -20% | Analytics |
| 평균 세션 시간 | 측정 필요 | +30% | Analytics |
| 작업 완료 시간 | 측정 필요 | -40% | User Testing |
| 모바일 사용률 | ~10% (추정) | 25% | Analytics |

### 6.2 정성적 지표

- 사용자 만족도 설문 (NPS)
- 기능 발견성 테스트
- 인지 부하 측정

---

## 7. 구현 우선순위

### 7.1 우선순위 매트릭스

```
           높은 영향력
              │
    ┌─────────┼─────────┐
    │  FR-04  │  FR-01  │
    │  FR-06  │  FR-02  │
낮은├─────────┼─────────┤높은
노력│  FR-11  │  FR-03  │노력
    │  FR-10  │  FR-07  │
    │         │  FR-08  │
    └─────────┼─────────┘
              │
           낮은 영향력
```

### 7.2 권장 구현 순서

1. **1단계 (Week 1)**: FR-04 (모바일 사이드바), FR-01 (정렬/필터)
2. **2단계 (Week 2)**: FR-02 (검색), FR-05 (날짜 피커)
3. **3단계 (Week 3)**: FR-06 (비교 기능), FR-10 (URL 동기화)
4. **4단계 (Week 4)**: FR-03 (드릴다운), FR-07 (인사이트 연결)
5. **5단계 (선택)**: FR-08 ~ FR-15

---

## 8. 리스크 및 완화 방안

| 리스크 | 영향 | 확률 | 완화 방안 |
|--------|------|------|----------|
| TikTok API 캠페인 레벨 데이터 제한 | 높음 | 중간 | 캐싱 전략, 점진적 로딩 |
| 기존 컴포넌트 파괴적 변경 | 중간 | 낮음 | 새 컴포넌트로 점진적 교체 |
| 모바일 성능 저하 | 중간 | 중간 | 가상화 리스트, 지연 로딩 |
| 브라우저 호환성 | 낮음 | 낮음 | Polyfill, 브라우저 테스트 |

---

## 9. 참고 자료

### 9.1 디자인 레퍼런스

- [Vercel Dashboard](https://vercel.com/dashboard) - 필터링, 검색 UX
- [Linear](https://linear.app) - Command Palette
- [Stripe Dashboard](https://dashboard.stripe.com) - 날짜 피커, 비교

### 9.2 관련 문서

- `docs/archive/2026-02/tiktok-analysis/` - 이전 PDCA 문서
- `src/components/` - 현재 컴포넌트 구조

---

## 10. 승인

| 역할 | 이름 | 승인일 |
|------|------|--------|
| 기획 | - | - |
| 개발 | - | - |
| 검토 | - | - |

---

*이 문서는 PDCA Plan 단계의 산출물입니다.*
*다음 단계: `/pdca design dashboard-ux-improvement`*

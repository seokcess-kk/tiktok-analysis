# Plan: 메뉴 구조 및 UI/UX 개선

**Feature**: menu-ux-improvement
**Created**: 2026-02-12
**Status**: 🔄 In Progress

---

## 1. 배경 및 목적

### 1.1 현재 상태 분석

TikTok Ads Analysis 플랫폼의 현재 구조:

| 항목 | 현재 상태 | 문제점 |
|------|-----------|--------|
| 사이드바 네비게이션 | 3단계 계층 구조 (Main → Account → Campaign) | 레벨 간 시각적 구분 불명확 |
| 모바일 네비게이션 | 캠페인 레벨 네비게이션 미지원 | 모바일에서 UX 불완전 |
| 브레드크럼 | 일부 페이지만 적용 | 일관성 부족 |
| 데이터 범위 표시 | 명시적 표시 없음 | 사용자가 어떤 데이터를 보는지 혼란 |
| AI 기능 접근성 | 여러 곳에 분산 | 발견하기 어려움 |

### 1.2 발견된 UX 이슈 (10개)

| # | 이슈 | 심각도 | 영향 |
|---|------|--------|------|
| 1 | 네비게이션 컨텍스트 구분 불명확 | High | 사용자 혼란 |
| 2 | Account/Campaign 레벨 소재 페이지 구분 어려움 | Medium | 데이터 범위 혼란 |
| 3 | AI 기능(인사이트/전략) 레벨별 중복 | Medium | 일관성 부족 |
| 4 | 광고그룹/광고 페이지 사이드바 미노출 | Medium | 탐색 불편 |
| 5 | 브레드크럼 일관성 부족 | Medium | 위치 파악 어려움 |
| 6 | 모바일 캠페인 레벨 네비게이션 없음 | High | 모바일 UX 불완전 |
| 7 | AI 기능 발견성 부족 | Medium | 기능 활용도 저하 |
| 8 | 필터 상태 초기화 이슈 | Low | 예상치 못한 필터 적용 |
| 9 | 데이터 범위(기간/범위) 표시 부족 | Medium | 데이터 해석 혼란 |
| 10 | 인사이트-전략 연결 시각화 부족 | Low | 관계 파악 어려움 |

### 1.3 목적

1. **명확한 네비게이션 계층**: 사용자가 현재 위치와 데이터 범위를 즉시 파악
2. **일관된 UX 패턴**: 모든 페이지에서 동일한 네비게이션 경험 제공
3. **모바일 완전 지원**: 모든 레벨의 네비게이션이 모바일에서도 동작
4. **AI 기능 접근성 향상**: AI 기능을 더 쉽게 발견하고 사용

---

## 2. 요구사항

### 2.1 기능 요구사항

| ID | 요구사항 | 우선순위 | 카테고리 |
|----|----------|----------|----------|
| FR-01 | 사이드바에 현재 레벨 표시 (색상/배지) | High | Navigation |
| FR-02 | 모든 페이지에 일관된 브레드크럼 적용 | High | Navigation |
| FR-03 | 모바일 사이드바에 캠페인 레벨 지원 | High | Mobile |
| FR-04 | 데이터 범위 표시 컴포넌트 추가 | Medium | UX |
| FR-05 | 광고그룹/광고 페이지 사이드바 항목 추가 | Medium | Navigation |
| FR-06 | AI 기능 통합 접근점 추가 (AI Hub) | Medium | AI |
| FR-07 | 페이지 전환 시 필터 초기화 옵션 | Low | UX |
| FR-08 | 인사이트-전략 연결 시각화 | Low | AI |

### 2.2 비기능 요구사항

| ID | 요구사항 | 목표 |
|----|----------|------|
| NFR-01 | 페이지 로드 시간 | < 2초 (네비게이션 변경 후에도) |
| NFR-02 | 모바일 반응성 | 터치 친화적, 최소 44px 탭 영역 |
| NFR-03 | 접근성 | WCAG 2.1 AA 준수 |
| NFR-04 | 브라우저 지원 | Chrome, Safari, Edge 최신 버전 |

---

## 3. 범위

### 3.1 포함 (In Scope)

#### Phase 1: 네비게이션 개선 (High Priority)

1. **사이드바 레벨 표시 개선**
   - 현재 레벨에 따른 사이드바 상단 배지/헤더
   - 계정명/캠페인명 표시
   - 뒤로가기 링크 시각적 강조

2. **통합 브레드크럼 시스템**
   - `DrilldownNav` 컴포넌트 전체 페이지 적용
   - 클릭 가능한 경로 네비게이션
   - 현재 페이지 하이라이트

3. **모바일 네비게이션 완성**
   - 모바일 사이드바에 캠페인 레벨 메뉴 추가
   - 계정/캠페인 컨텍스트 표시
   - 부드러운 애니메이션

#### Phase 2: UX 일관성 (Medium Priority)

4. **데이터 범위 표시 컴포넌트**
   - 현재 조회 기간 표시
   - 현재 범위 표시 (전체 계정 / 캠페인 X)
   - 날짜 범위 피커 통합

5. **광고그룹 레벨 네비게이션**
   - 광고그룹 상세 페이지 사이드바 메뉴
   - 광고 상세 페이지 사이드바 메뉴
   - 계층 구조 시각화

#### Phase 3: AI 기능 개선 (Medium-Low Priority)

6. **AI Hub 컴포넌트**
   - 인사이트/전략 통합 요약 카드
   - 빠른 액션 버튼
   - 알림 배지 (새 인사이트, 대기중 전략)

### 3.2 제외 (Out of Scope)

1. ❌ 새로운 페이지 추가 (기존 페이지 개선만)
2. ❌ API 변경 (프론트엔드만)
3. ❌ 실시간 알림 시스템 (별도 기능)
4. ❌ 다크 모드 (별도 기능)

---

## 4. 기술적 접근

### 4.1 수정 대상 파일

| 카테고리 | 파일 | 수정 내용 |
|----------|------|-----------|
| **Layout** | `src/components/layout/sidebar.tsx` | 레벨 표시, 컨텍스트 헤더 |
| **Layout** | `src/components/layout/mobile-sidebar.tsx` | 캠페인 레벨 지원 |
| **Layout** | `src/components/layout/header.tsx` | 브레드크럼 통합 |
| **Dashboard** | `src/components/dashboard/drilldown-nav.tsx` | 개선 및 표준화 |
| **New** | `src/components/dashboard/data-scope-indicator.tsx` | 데이터 범위 표시 |
| **New** | `src/components/ai/ai-hub-card.tsx` | AI 기능 통합 카드 |
| **Pages** | 모든 dashboard 페이지 | 브레드크럼/범위 표시 적용 |

### 4.2 컴포넌트 설계

#### 4.2.1 사이드바 컨텍스트 헤더

```tsx
// 사이드바 상단에 현재 컨텍스트 표시
<div className="px-4 py-3 border-b bg-muted/50">
  {level === 'account' && (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-blue-500" />
      <span className="text-sm font-medium truncate">{accountName}</span>
    </div>
  )}
  {level === 'campaign' && (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Building2 className="h-3 w-3" />
        <span className="truncate">{accountName}</span>
      </div>
      <div className="flex items-center gap-2">
        <Megaphone className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium truncate">{campaignName}</span>
      </div>
    </div>
  )}
</div>
```

#### 4.2.2 데이터 범위 표시 컴포넌트

```tsx
// 페이지 상단에 현재 데이터 범위 표시
<DataScopeIndicator
  scope="campaign"
  scopeName="Brand Awareness Q1"
  dateRange={{ from: '2026-02-05', to: '2026-02-12' }}
/>
```

#### 4.2.3 AI Hub 카드

```tsx
// 대시보드에 AI 기능 요약 표시
<AIHubCard
  insightCount={5}
  newInsightCount={2}
  strategyCount={8}
  pendingStrategyCount={3}
  onViewInsights={() => router.push('/insights')}
  onViewStrategies={() => router.push('/strategies')}
/>
```

### 4.3 네비게이션 상태 관리

```typescript
// useNavigationContext hook
const useNavigationContext = () => {
  const pathname = usePathname();

  const context = useMemo(() => {
    const accountMatch = pathname.match(/\/accounts\/([^\/]+)/);
    const campaignMatch = pathname.match(/\/campaigns\/([^\/]+)/);
    const adGroupMatch = pathname.match(/\/adgroups\/([^\/]+)/);
    const adMatch = pathname.match(/\/ads\/([^\/]+)/);

    return {
      level: adMatch ? 'ad' : adGroupMatch ? 'adgroup' : campaignMatch ? 'campaign' : accountMatch ? 'account' : 'main',
      accountId: accountMatch?.[1],
      campaignId: campaignMatch?.[1],
      adGroupId: adGroupMatch?.[1],
      adId: adMatch?.[1],
    };
  }, [pathname]);

  return context;
};
```

---

## 5. 구현 계획

### Phase 1: 네비게이션 개선 (Day 1)

| 순서 | 작업 | 예상 규모 |
|------|------|-----------|
| 1.1 | 사이드바 컨텍스트 헤더 추가 | Medium |
| 1.2 | 모바일 사이드바 캠페인 레벨 지원 | Medium |
| 1.3 | DrilldownNav 표준화 및 전체 적용 | Large |
| 1.4 | 네비게이션 상태 관리 훅 생성 | Small |

### Phase 2: UX 일관성 (Day 2)

| 순서 | 작업 | 예상 규모 |
|------|------|-----------|
| 2.1 | DataScopeIndicator 컴포넌트 생성 | Medium |
| 2.2 | 주요 페이지에 적용 | Medium |
| 2.3 | 광고그룹 레벨 사이드바 메뉴 추가 | Medium |
| 2.4 | 광고 레벨 사이드바 메뉴 추가 | Small |

### Phase 3: AI 기능 개선 (Day 2-3)

| 순서 | 작업 | 예상 규모 |
|------|------|-----------|
| 3.1 | AIHubCard 컴포넌트 생성 | Medium |
| 3.2 | 대시보드 페이지에 적용 | Small |
| 3.3 | 인사이트-전략 연결 시각화 | Medium |

---

## 6. 성공 기준

### 6.1 기능적 기준

- [ ] 사이드바에서 현재 컨텍스트(계정/캠페인명) 표시
- [ ] 모든 레벨에서 뒤로가기 링크 명확히 구분
- [ ] 모바일에서 캠페인 레벨 네비게이션 동작
- [ ] 모든 페이지에 일관된 브레드크럼 표시
- [ ] 데이터 범위 표시 컴포넌트 동작
- [ ] AI Hub 카드 대시보드 표시

### 6.2 품질 기준

- [ ] TypeScript 타입 체크 통과
- [ ] 빌드 성공
- [ ] 모바일 반응형 테스트 통과 (375px, 768px, 1024px)
- [ ] 기존 기능 동작 유지

---

## 7. 리스크 및 고려사항

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 사이드바 변경으로 레이아웃 깨짐 | High | 단계별 적용, 충분한 테스트 |
| 모바일 네비게이션 성능 저하 | Medium | 최소한의 상태 관리, lazy loading |
| 기존 사용자 혼란 | Low | 점진적 변경, 시각적 일관성 유지 |

---

## 8. 참고 자료

### 8.1 현재 파일 구조

```
src/components/layout/
├── sidebar.tsx           # 데스크탑 사이드바
├── mobile-sidebar.tsx    # 모바일 사이드바
├── header.tsx            # 헤더
└── notification-bell.tsx # 알림

src/components/dashboard/
├── drilldown-nav.tsx     # 브레드크럼
├── kpi-card.tsx          # KPI 카드
└── ...

src/components/ai/
├── insight-card.tsx      # 인사이트 카드
├── strategy-card.tsx     # 전략 카드
└── ...
```

### 8.2 네비게이션 레벨 구조

```
Level 0: Main
├── /accounts (광고 계정 목록)

Level 1: Account
├── /accounts/{accountId} (캠페인 목록)
├── /accounts/{accountId}/insights
├── /accounts/{accountId}/strategies
├── /accounts/{accountId}/creatives
└── /accounts/{accountId}/reports

Level 2: Campaign
├── /accounts/{accountId}/campaigns/{campaignId} (개요)
├── /accounts/{accountId}/campaigns/{campaignId}/insights
├── /accounts/{accountId}/campaigns/{campaignId}/strategies
├── /accounts/{accountId}/campaigns/{campaignId}/creatives
└── /accounts/{accountId}/campaigns/{campaignId}/reports

Level 3: AdGroup
├── /accounts/{accountId}/campaigns/{campaignId}/adgroups/{adGroupId}

Level 4: Ad
└── /accounts/{accountId}/campaigns/{campaignId}/adgroups/{adGroupId}/ads/{adId}
```

---

*Created by bkit PDCA plan phase*

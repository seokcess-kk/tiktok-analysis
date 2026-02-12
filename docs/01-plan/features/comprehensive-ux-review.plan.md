# Plan: Comprehensive UX Review & Enhancement

## 1. Overview

| 항목 | 내용 |
|------|------|
| **Feature Name** | comprehensive-ux-review |
| **Created** | 2026-02-12 |
| **Level** | Enterprise |
| **Priority** | HIGH |
| **Status** | Planning |

### 1.1 Background

TikTok Ads Analysis 플랫폼이 기본 기능 구현을 완료한 상태에서, 전체적인 사용자 경험과 UI/UX를 종합 점검하여 부족하거나 미흡한 부분을 식별하고 개선안을 제안합니다.

### 1.2 Goals

1. 현재 시스템의 UI/UX 강점과 약점 파악
2. 사용자 관점에서 불편한 부분 식별
3. 개선 우선순위 결정 및 로드맵 제시
4. 일관성 있는 디자인 시스템 강화

---

## 2. Current State Analysis (현재 상태 분석)

### 2.1 Overall Assessment: **7.5/10**

#### Strengths (강점) ✅

| 영역 | 평가 | 상세 |
|------|------|------|
| **아키텍처** | ⭐⭐⭐⭐⭐ | Next.js App Router 기반 계층적 라우팅 |
| **반응형** | ⭐⭐⭐⭐ | 모바일 사이드바, 반응형 그리드 |
| **디자인 일관성** | ⭐⭐⭐⭐ | shadcn/ui 기반 컴포넌트 통일 |
| **AI 통합** | ⭐⭐⭐⭐ | 인사이트/전략 카드 디자인 우수 |
| **네비게이션** | ⭐⭐⭐⭐⭐ | 컨텍스트 기반 동적 메뉴 |

#### Weaknesses (약점) ❌

| 영역 | 평가 | 문제점 |
|------|------|--------|
| **모바일 테이블** | ⭐⭐ | 수평 스크롤만 제공, 카드 뷰 없음 |
| **로딩 상태** | ⭐⭐⭐ | Skeleton, Loader2, Spinner 혼재 |
| **빈 상태** | ⭐⭐⭐ | 페이지마다 다른 빈 상태 표시 |
| **다크 모드** | ⭐ | 미지원 |
| **성능** | ⭐⭐⭐ | 무한스크롤/페이지네이션 부재 |
| **캐싱** | ⭐⭐ | React Query 미활용 |

---

## 3. Gap Analysis (개선 필요 항목)

### 3.1 Critical (즉시 개선 필요)

#### GAP-01: 모바일 테이블 UX
- **현재**: 수평 스크롤만 가능, 정보 확인 어려움
- **문제**: 7개 이상 컬럼 테이블이 모바일에서 사용 불가
- **영향**: 캠페인 목록, 광고그룹, 소재 테이블 등 핵심 기능
- **제안**:
  - 반응형 카드 뷰 전환 (md 미만에서)
  - 주요 컬럼만 선택 표시
  - 스와이프 액션 지원

#### GAP-02: 로딩 상태 일관성
- **현재**: Skeleton, Loader2 아이콘, 커스텀 스피너 혼재
- **문제**: UX 일관성 저하, 사용자 혼란
- **영향**: 전체 페이지
- **제안**:
  - 표준 Skeleton 컴포넌트 정의
  - 페이지 전체: Skeleton
  - 인라인 버튼: Loader2
  - 오버레이: 전체화면 로딩

#### GAP-03: 빈 상태(Empty State) 표준화
- **현재**: 페이지마다 다른 빈 상태 메시지/스타일
- **문제**: 브랜드 일관성 저하
- **영향**: 데이터 없는 모든 목록 페이지
- **제안**:
  - EmptyState 컴포넌트 활용 확대
  - 4가지 variant 통일 (no-data, no-result, error, loading)
  - 액션 버튼 포함 (데이터 생성 유도)

### 3.2 High Priority (높은 우선순위)

#### GAP-04: 다크 모드 미지원
- **현재**: 라이트 모드 전용
- **문제**: 야간 사용 시 눈 피로, 사용자 선호 무시
- **영향**: 전체 앱
- **제안**:
  - `next-themes` 라이브러리 도입
  - Tailwind `dark:` 클래스 활용
  - 차트 색상 팔레트 다크 모드 대응
  - 시스템 설정 자동 감지

#### GAP-05: 필터 UX 개선
- **현재**: 드롭다운 + 검색 분산 배치
- **문제**:
  - 활성 필터 시각적 확인 어려움
  - 필터 초기화 버튼 부재
  - 복합 필터 조합 불편
- **영향**: 계정/캠페인/인사이트 목록
- **제안**:
  - 활성 필터 칩(Badge) 표시
  - "필터 초기화" 버튼 추가
  - 고급 필터 패널 (드로어/모달)
  - 필터 프리셋 저장 기능

#### GAP-06: 데이터 로딩 성능
- **현재**: 전체 데이터 한 번에 로드
- **문제**: 대용량 데이터 시 느린 초기 로드
- **영향**: 소재 목록 (30개+), 인사이트/전략 목록
- **제안**:
  - 무한 스크롤 또는 페이지네이션 적용
  - 초기 로드 10~20개 제한
  - 가상 스크롤 (100개+ 목록)

### 3.3 Medium Priority (중간 우선순위)

#### GAP-07: 차트 반응성
- **현재**: 고정 높이 (300-350px)
- **문제**: 모바일에서 차트가 좁아 데이터 확인 어려움
- **제안**:
  - 컨테이너 기반 동적 높이
  - 모바일 전용 간소화 차트
  - 차트 메트릭 선택 UI 개선

#### GAP-08: 알림 시스템 강화
- **현재**: 기본 알림 벨 + 목록
- **문제**: 실시간 업데이트 없음, 중요 알림 놓침
- **제안**:
  - 실시간 알림 (WebSocket/SSE)
  - 알림 우선순위 분류
  - 데스크톱 알림 (Web Notifications API)
  - 이메일/슬랙 연동

#### GAP-09: 에러 핸들링 개선
- **현재**: 기본 에러 메시지
- **문제**: 사용자가 문제 해결 방법 모름
- **제안**:
  - 친화적 에러 메시지
  - 재시도 버튼
  - 에러 리포트 기능
  - 네트워크 오프라인 감지

#### GAP-10: 접근성(A11y) 강화
- **현재**: Radix UI 기반 기본 접근성
- **문제**: 추가 aria-label 부재, 포커스 스타일 불명확
- **제안**:
  - aria-label 추가
  - 포커스 링 명확화
  - 키보드 네비게이션 개선
  - WCAG AA 색상 대비 검증

### 3.4 Low Priority (낮은 우선순위)

#### GAP-11: 문서화
- **현재**: 컴포넌트 Props 문서 없음
- **제안**: Storybook 추가, JSDoc 주석

#### GAP-12: 애니메이션
- **현재**: 기본 트랜지션만
- **제안**: Framer Motion 적용, 페이지 전환 애니메이션

#### GAP-13: 국제화(i18n)
- **현재**: 한국어 고정
- **제안**: next-intl 도입, 영어/일본어 지원

---

## 4. Improvement Roadmap (개선 로드맵)

### Phase 1: Foundation (기반 강화)

| ID | 항목 | 예상 복잡도 | 의존성 |
|----|------|------------|--------|
| P1-1 | 로딩 상태 표준화 | EASY | 없음 |
| P1-2 | 빈 상태 컴포넌트 통일 | EASY | 없음 |
| P1-3 | 다크 모드 추가 | MEDIUM | next-themes |
| P1-4 | 에러 바운더리 개선 | EASY | 없음 |

### Phase 2: UX Enhancement (UX 개선)

| ID | 항목 | 예상 복잡도 | 의존성 |
|----|------|------------|--------|
| P2-1 | 모바일 테이블 카드 뷰 | MEDIUM | P1-1 |
| P2-2 | 필터 UX 개선 (칩, 초기화) | MEDIUM | 없음 |
| P2-3 | 고급 필터 패널 | MEDIUM | P2-2 |
| P2-4 | 차트 반응성 개선 | EASY | 없음 |

### Phase 3: Performance (성능 최적화)

| ID | 항목 | 예상 복잡도 | 의존성 |
|----|------|------------|--------|
| P3-1 | 무한 스크롤 적용 | MEDIUM | 없음 |
| P3-2 | React Query 도입 | HIGH | 전체 API 리팩토링 |
| P3-3 | 이미지 최적화 | EASY | 없음 |
| P3-4 | 번들 크기 최적화 | MEDIUM | 없음 |

### Phase 4: Advanced Features (고급 기능)

| ID | 항목 | 예상 복잡도 | 의존성 |
|----|------|------------|--------|
| P4-1 | 실시간 알림 | HIGH | WebSocket 서버 |
| P4-2 | 접근성 강화 | MEDIUM | 없음 |
| P4-3 | 애니메이션 추가 | EASY | Framer Motion |
| P4-4 | Storybook 문서화 | MEDIUM | 없음 |

---

## 5. Detailed Improvement Proposals

### 5.1 모바일 테이블 카드 뷰 (P2-1)

**Before (현재)**:
```
┌────────────────────────────────────────────────┐
│  ← 수평 스크롤 필요 →                           │
│  ┌───┬───┬───┬───┬───┬───┬───┐                │
│  │ A │ B │ C │ D │ E │ F │ G │                │
│  └───┴───┴───┴───┴───┴───┴───┘                │
└────────────────────────────────────────────────┘
```

**After (개선안)**:
```
┌────────────────────────────────┐
│  캠페인명                [상태]│
│  ────────────────────────────  │
│  지출: ₩1,234,567  CTR: 2.5%  │
│  전환: 150        ROAS: 3.2   │
│  ────────────────────────────  │
│  [자세히 보기 →]               │
└────────────────────────────────┘
```

**구현 방안**:
```tsx
// useMediaQuery 훅으로 뷰 전환
const isMobile = useMediaQuery('(max-width: 768px)');

return isMobile ? (
  <MobileCardView data={data} />
) : (
  <DesktopTableView data={data} />
);
```

### 5.2 다크 모드 (P1-3)

**구현 방안**:
```tsx
// providers.tsx
import { ThemeProvider } from 'next-themes';

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      {children}
    </ThemeProvider>
  );
}

// 토글 버튼
<Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
  {theme === 'dark' ? <Sun /> : <Moon />}
</Button>
```

**색상 팔레트**:
| 요소 | Light | Dark |
|------|-------|------|
| Background | #ffffff | #0f0f0f |
| Card | #f9fafb | #1a1a1a |
| Text | #111827 | #f9fafb |
| Border | #e5e7eb | #333333 |

### 5.3 필터 UX 개선 (P2-2)

**현재**:
```
[검색...] [상태 ▼] [목표 ▼] [날짜 범위]
```

**개선안**:
```
[🔍 검색...] [상태 ▼] [목표 ▼] [📅 날짜]  [⚙️ 고급 필터]

활성 필터: [상태: 활성 ✕] [목표: 전환 ✕]  [모두 초기화]
```

### 5.4 로딩 상태 표준화 (P1-1)

**표준 정의**:
| 상황 | 컴포넌트 | 예시 |
|------|---------|------|
| 페이지 로드 | `<PageSkeleton />` | 전체 레이아웃 스켈레톤 |
| 섹션 로드 | `<CardSkeleton />` | 카드 영역 스켈레톤 |
| 테이블 로드 | `<TableSkeleton rows={5} />` | 테이블 행 스켈레톤 |
| 버튼 액션 | `<Loader2 className="animate-spin" />` | 인라인 스피너 |
| 전체 오버레이 | `<LoadingOverlay />` | 반투명 배경 + 스피너 |

---

## 6. Success Metrics (성공 지표)

### 6.1 정량적 지표

| 지표 | 현재 | 목표 | 측정 방법 |
|------|------|------|----------|
| Lighthouse Performance | - | 90+ | Chrome DevTools |
| First Contentful Paint | - | < 1.5s | Lighthouse |
| Time to Interactive | - | < 3.5s | Lighthouse |
| Cumulative Layout Shift | - | < 0.1 | Lighthouse |
| Mobile Usability | - | 100% | PageSpeed Insights |

### 6.2 정성적 지표

| 지표 | 측정 방법 |
|------|----------|
| 모바일 사용성 | 직접 테스트 (다양한 디바이스) |
| 다크 모드 완성도 | 모든 페이지 시각적 검토 |
| 로딩 UX 일관성 | 체크리스트 검증 |
| 접근성 | WAVE/axe 도구 검사 |

---

## 7. Risks & Mitigations

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| 기존 스타일 깨짐 | 높음 | 점진적 적용, 스냅샷 테스트 |
| 성능 저하 | 중간 | 번들 분석, lazy loading |
| 브라우저 호환성 | 낮음 | 폴리필, 점진적 향상 |
| 개발 시간 초과 | 중간 | Phase 단위 배포 |

---

## 8. Implementation Checklist

### Phase 1 체크리스트
- [ ] 로딩 상태 컴포넌트 표준화
- [ ] EmptyState 컴포넌트 확대 적용
- [ ] next-themes 설치 및 다크 모드 구현
- [ ] 에러 바운더리 개선

### Phase 2 체크리스트
- [ ] useMediaQuery 훅 구현
- [ ] MobileCardView 컴포넌트 생성
- [ ] 테이블 반응형 전환 적용
- [ ] FilterChip 컴포넌트 추가
- [ ] AdvancedFilterPanel 구현

### Phase 3 체크리스트
- [ ] useInfiniteScroll 훅 구현
- [ ] 목록 페이지 무한 스크롤 적용
- [ ] React Query Provider 설정
- [ ] API 호출 React Query로 마이그레이션

### Phase 4 체크리스트
- [ ] WebSocket 연결 구현
- [ ] 실시간 알림 컴포넌트
- [ ] WCAG 접근성 검사 및 수정
- [ ] Storybook 설정 및 문서화

---

## 9. References

- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [next-themes](https://github.com/pacocoursey/next-themes)
- [React Query](https://tanstack.com/query/latest)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Recharts Responsive](https://recharts.org/en-US/api/ResponsiveContainer)

---

## 10. Next Steps

1. **Design Review**: 이 Plan 문서를 바탕으로 Design 문서 작성
2. **Priority Confirmation**: 사용자와 우선순위 확정
3. **Phase 1 Implementation**: 기반 강화 작업 시작

---

**Document History**:
| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|----------|
| 1.0 | 2026-02-12 | Claude | 초기 작성 |

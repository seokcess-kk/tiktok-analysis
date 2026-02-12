# Plan: 광고그룹 레벨 AI 연동

**Feature**: adgroup-ai-integration
**Created**: 2026-02-12
**Status**: Draft

---

## 1. 배경 및 목적

### 1.1 현재 상태

AI 인사이트/전략 기능이 **계정 레벨**과 **캠페인 레벨**에서 완전히 구현되어 있습니다:

| 레벨 | 인사이트 | 전략 | AI 카드 |
|------|----------|------|---------|
| 계정 | ✅ | ✅ | ✅ |
| 캠페인 | ✅ | ✅ | ✅ |
| 광고그룹 | ❌ | ❌ | ❌ |
| 광고 | ❌ | ❌ | ❌ |

**문제점:**
- 광고그룹 상세 페이지에서 AI 기능에 접근할 수 없음
- 광고그룹별 성과 분석 및 최적화 제안을 직접 확인 불가
- 사용자가 캠페인 페이지로 돌아가서 AI 기능을 사용해야 함

### 1.2 목적

1. 광고그룹 상세 페이지에 AI 인사이트/전략 요약 카드 추가
2. 해당 광고그룹에 관련된 캠페인 레벨 인사이트/전략 필터링 표시
3. 사용자가 광고그룹 레벨에서 AI 기능에 빠르게 접근 가능하게 함

---

## 2. 요구사항

### 2.1 기능 요구사항

| ID | 요구사항 | 우선순위 |
|----|----------|----------|
| FR-01 | 광고그룹 상세 페이지에 AI 인사이트 카드 추가 | High |
| FR-02 | 광고그룹 상세 페이지에 AI 전략 카드 추가 | High |
| FR-03 | AI 카드 클릭 시 캠페인 인사이트/전략 페이지로 이동 | High |
| FR-04 | 광고그룹 관련 인사이트 카운트 표시 | Medium |
| FR-05 | 광고그룹 관련 대기 전략 카운트 표시 | Medium |

### 2.2 비기능 요구사항

| ID | 요구사항 | 목표 |
|----|----------|------|
| NFR-01 | 기존 캠페인 AI 카드와 동일한 UI/UX | 일관성 유지 |
| NFR-02 | 페이지 로딩 시간 증가 최소화 | < 100ms 추가 |
| NFR-03 | 타입 안전성 | TypeScript 100% |

---

## 3. 범위

### 3.1 포함 (In Scope)

1. **광고그룹 상세 페이지 UI 개선**
   - AI 인사이트 요약 카드 추가
   - AI 전략 요약 카드 추가
   - 캠페인 페이지와 동일한 카드 디자인

2. **API 개선**
   - 광고그룹 API에 AI 카운트 정보 추가 (`aiSummary`)
   - 또는 별도 쿼리로 캠페인 레벨 AI 카운트 조회

3. **네비게이션**
   - AI 카드 클릭 시 캠페인 인사이트/전략 페이지로 이동
   - URL에 광고그룹 필터 파라미터 전달 (선택적)

### 3.2 제외 (Out of Scope)

1. ❌ 광고그룹 전용 인사이트/전략 생성 API (캠페인 레벨 재사용)
2. ❌ 광고그룹 전용 인사이트/전략 페이지 (캠페인 페이지로 이동)
3. ❌ 광고 레벨 AI 연동 (별도 기능으로 분리)
4. ❌ 새로운 AI 분석 로직 개발

---

## 4. 기술적 접근

### 4.1 접근 방식 A: 캠페인 AI 카운트 재사용 (권장)

광고그룹은 캠페인에 속하므로, 해당 캠페인의 AI 카운트를 표시:

```typescript
// 광고그룹 상세 페이지에서
const campaignAISummary = {
  insightCount: 캠페인의 전체 인사이트 수,
  pendingStrategyCount: 캠페인의 대기 전략 수
}
```

**장점:**
- 추가 API 개발 불필요
- 기존 캠페인 API 활용
- 간단한 구현

**단점:**
- 광고그룹별 필터링 없음
- "해당 광고그룹 관련" 인사이트만 표시 불가

### 4.2 접근 방식 B: 광고그룹 필터링 카운트 (선택적)

광고그룹 ID로 필터링된 인사이트/전략 카운트:

```typescript
// 광고그룹 관련 인사이트만 카운트
const adGroupAISummary = {
  insightCount: AIInsight.count({
    where: { campaignId, adGroupId }
  }),
  pendingStrategyCount: AIStrategy.count({
    where: { campaignId, adGroupId, status: 'PENDING' }
  })
}
```

**참고:** 현재 AIInsight/AIStrategy 모델에 `adGroupId` 필드가 없을 수 있음.
이 경우 접근 방식 A를 사용.

### 4.3 UI 구현

캠페인 대시보드의 AI 카드 패턴 재사용:

```tsx
{/* AI Summary Cards - 광고그룹 페이지 */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <Link href={`/accounts/${accountId}/campaigns/${campaignId}/insights`}>
    <Card className="hover:border-primary/50 cursor-pointer">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Lightbulb className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">AI 인사이트</p>
            <p className="text-2xl font-bold">{insightCount}</p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </CardContent>
    </Card>
  </Link>
  {/* 전략 카드도 동일 패턴 */}
</div>
```

---

## 5. 구현 계획

### Phase 1: API 확인 및 데이터 준비

1. 광고그룹 API 응답 구조 확인
2. 캠페인 AI 카운트 조회 방법 결정
3. 필요 시 광고그룹 API에 `aiSummary` 필드 추가

### Phase 2: UI 구현

1. 광고그룹 상세 페이지에 AI 카드 컴포넌트 추가
2. 캠페인 페이지의 AI 카드 스타일 복사/적용
3. 링크 연결 (캠페인 인사이트/전략 페이지)

### Phase 3: 테스트 및 검증

1. UI 렌더링 확인
2. 링크 동작 확인
3. 빌드 및 타입 체크

---

## 6. 리스크 및 완화 방안

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| AI 카운트 조회 추가 쿼리 | 낮음 | 캠페인 API에서 이미 조회 중이므로 재사용 |
| 사용자 혼동 (캠페인 vs 광고그룹 데이터) | 중간 | 카드에 "캠페인 AI 인사이트" 라벨 명시 |
| 기존 페이지 레이아웃 변경 | 낮음 | 기존 KPI 카드 하단에 추가 |

---

## 7. 성공 기준

- [ ] 광고그룹 상세 페이지에 AI 인사이트 카드 표시
- [ ] 광고그룹 상세 페이지에 AI 전략 카드 표시
- [ ] AI 카드 클릭 시 캠페인 인사이트/전략 페이지로 이동
- [ ] 캠페인 페이지와 동일한 UI/UX 유지
- [ ] 빌드 및 타입 체크 통과

---

## 8. 관련 문서

- 광고그룹 상세 페이지: `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/adgroups/[adGroupId]/page.tsx`
- 캠페인 대시보드 (AI 카드 참조): `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/page.tsx` (351-381줄)
- 캠페인 인사이트 페이지: `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/insights/page.tsx`
- 캠페인 전략 페이지: `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/strategies/page.tsx`

---

*Created by bkit PDCA plan phase*

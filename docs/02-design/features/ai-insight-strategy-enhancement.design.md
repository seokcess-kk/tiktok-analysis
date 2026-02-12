# Design: AI 인사이트 및 전략 기능 개선

**Feature**: ai-insight-strategy-enhancement
**Created**: 2026-02-12
**Status**: ✅ Archived (PDCA 완료)

---

## 1. 현재 구현 상태 분석

### 1.1 API 구현 상태

| API Endpoint | 상태 | 파일 위치 |
|-------------|------|----------|
| `GET /api/ai/insights/{accountId}` | ✅ 완료 | `src/app/api/ai/insights/[accountId]/route.ts` |
| `POST /api/ai/insights/{accountId}/generate` | ✅ 완료 | `src/app/api/ai/insights/[accountId]/generate/route.ts` |
| `GET /api/ai/insights/{accountId}/campaigns/{campaignId}` | ✅ 완료 | `src/app/api/ai/insights/[accountId]/campaigns/[campaignId]/route.ts` |
| `POST /api/ai/insights/{accountId}/campaigns/{campaignId}/generate` | ✅ 완료 | `src/app/api/ai/insights/[accountId]/campaigns/[campaignId]/generate/route.ts` |
| `GET /api/ai/strategies/{accountId}` | ✅ 완료 | `src/app/api/ai/strategies/[accountId]/route.ts` |
| `POST /api/ai/strategies/{accountId}/generate` | ✅ 완료 | `src/app/api/ai/strategies/[accountId]/generate/route.ts` |
| `GET /api/ai/strategies/{accountId}/campaigns/{campaignId}` | ✅ 완료 | `src/app/api/ai/strategies/[accountId]/campaigns/[campaignId]/route.ts` |
| `POST /api/ai/strategies/{accountId}/campaigns/{campaignId}/generate` | ✅ 완료 | `src/app/api/ai/strategies/[accountId]/campaigns/[campaignId]/generate/route.ts` |

### 1.2 UI 페이지 구현 상태

| 페이지 | 상태 | 파일 위치 |
|-------|------|----------|
| 계정 인사이트 페이지 | ✅ 완료 | `src/app/(dashboard)/accounts/[accountId]/insights/page.tsx` |
| 계정 전략 페이지 | ✅ 완료 | `src/app/(dashboard)/accounts/[accountId]/strategies/page.tsx` |
| 캠페인 인사이트 페이지 | ✅ 완료 | `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/insights/page.tsx` |
| 캠페인 전략 페이지 | ✅ 완료 | `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/strategies/page.tsx` |
| 캠페인 대시보드 AI 카드 | ✅ 완료 | `src/app/(dashboard)/accounts/[accountId]/campaigns/[campaignId]/page.tsx` (351-381줄) |

### 1.3 컴포넌트 구현 상태

| 컴포넌트 | 상태 | 파일 위치 |
|---------|------|----------|
| InsightCard | ✅ 완료 | `src/components/ai/insight-card.tsx` |
| InsightList | ✅ 완료 | `src/components/ai/insight-card.tsx` |
| StrategyCard | ✅ 완료 | `src/components/ai/strategy-card.tsx` |
| StrategyList | ✅ 완료 | `src/components/ai/strategy-card.tsx` |
| AnomalyAlert | ✅ 완료 | `src/components/ai/anomaly-alert.tsx` |
| AnomalyBanner | ✅ 완료 | `src/components/ai/anomaly-alert.tsx` |

---

## 2. 아키텍처 개요

### 2.1 AI 모듈 구조

```
src/lib/ai/
├── client.ts                    # OpenAI API 클라이언트
├── fallback.ts                  # 규칙 기반 폴백 분석
├── prompts/
│   ├── insight.ts               # 인사이트 프롬프트
│   └── strategy.ts              # 전략 프롬프트
├── schemas/
│   ├── insight.schema.ts        # Zod 스키마 (인사이트)
│   └── strategy.schema.ts       # Zod 스키마 (전략)
└── modules/
    ├── insight-generator.ts     # 인사이트 생성 모듈
    ├── strategy-advisor.ts      # 전략 생성 모듈
    ├── anomaly-detector.ts      # 이상 탐지 모듈
    └── creative-insight-generator.ts  # 크리에이티브 분석
```

### 2.2 데이터 흐름

```
[TikTok API] → [PerformanceMetric DB] → [AI 분석 모듈]
                                              ↓
                                    [OpenAI GPT-4o] or [Fallback]
                                              ↓
                                    [AIInsight / AIStrategy DB]
                                              ↓
                                    [Dashboard UI]
```

### 2.3 캠페인 대시보드 AI 연동

```
캠페인 대시보드 (page.tsx)
    │
    ├── AI 인사이트 카드 → /campaigns/{id}/insights
    │   └── insightCount (campaignData.aiSummary.insightCount)
    │
    └── AI 전략 카드 → /campaigns/{id}/strategies
        └── pendingStrategyCount (campaignData.aiSummary.pendingStrategyCount)
```

---

## 3. API 스펙 (구현됨)

### 3.1 캠페인 인사이트 생성

```typescript
// POST /api/ai/insights/{accountId}/campaigns/{campaignId}/generate
// Request Body
{
  type?: 'DAILY_SUMMARY' | 'ANOMALY' | 'TREND' | 'CREATIVE' | 'PREDICTION'
}

// Response
{
  success: true,
  data: {
    campaign: { id, name },
    insights: AIInsight[]
  }
}
```

### 3.2 캠페인 전략 생성

```typescript
// POST /api/ai/strategies/{accountId}/campaigns/{campaignId}/generate
// Request Body
{
  type?: 'BUDGET' | 'CREATIVE' | 'TARGETING' | 'BIDDING' | 'CAMPAIGN',
  insightId?: string,
  constraints?: object
}

// Response
{
  success: true,
  data: {
    campaign: { id, name },
    strategies: AIStrategy[],
    summary: { total, byPriority }
  }
}
```

### 3.3 캠페인 전략 조회

```typescript
// GET /api/ai/strategies/{accountId}/campaigns/{campaignId}
// Query Params: type, status, priority, limit, offset

// Response
{
  success: true,
  data: {
    campaign: { id, name },
    strategies: AIStrategy[],
    pagination: { total, limit, offset },
    summary: { total, byStatus, pendingByPriority }
  }
}
```

---

## 4. UI 기능 (구현됨)

### 4.1 캠페인 인사이트 페이지

- ✅ 인사이트 목록 표시
- ✅ 유형별 필터 (DAILY_SUMMARY, ANOMALY, TREND, CREATIVE, PREDICTION)
- ✅ 심각도별 필터 (INFO, WARNING, CRITICAL)
- ✅ 읽지 않음 필터
- ✅ 인사이트 새로고침 (생성) 버튼
- ✅ 이상 탐지 배너
- ✅ 요약 카드 (전체, 읽지 않음, 긴급, 연결된 전략)

### 4.2 캠페인 전략 페이지

- ✅ 전략 목록 표시
- ✅ 상태별 필터 (PENDING, ACCEPTED, IN_PROGRESS, COMPLETED, REJECTED)
- ✅ 우선순위별 필터 (HIGH, MEDIUM, LOW)
- ✅ 유형별 필터 및 탭 (BUDGET, CREATIVE, TARGETING, BIDDING)
- ✅ 전략 생성 버튼
- ✅ 빠른 유형별 생성 버튼
- ✅ 전략 수락/거절/시작/완료 액션

### 4.3 캠페인 대시보드

- ✅ AI 인사이트 요약 카드 (insightCount)
- ✅ 대기 중인 전략 카드 (pendingStrategyCount)
- ✅ 각 카드 클릭 시 상세 페이지 이동

---

## 5. 누락된 기능 (향후 개선 사항)

### 5.1 광고그룹 레벨 AI 연동

현재 광고그룹 상세 페이지에는 AI 인사이트/전략 카드가 없음.

**향후 추가 고려:**
- 광고그룹 페이지에 관련 캠페인 인사이트 표시
- 광고그룹 레벨 전략 생성 기능

### 5.2 인사이트-전략 자동 연결

현재 인사이트 기반 전략 생성은 수동으로만 가능.

**향후 추가 고려:**
- 인사이트 생성 시 관련 전략 자동 제안
- 인사이트 상세 화면에서 "전략 생성" 버튼

### 5.3 실시간 알림

CRITICAL 인사이트 발생 시 사용자 알림.

**향후 추가 고려:**
- Notification 모델 활용
- 브라우저 푸시 알림 또는 이메일

---

## 6. 결론

**AI 인사이트 및 전략 기능은 이미 95% 이상 구현 완료 상태입니다.**

### 구현 완료 항목
- ✅ 계정 레벨 인사이트/전략 API 및 UI
- ✅ 캠페인 레벨 인사이트/전략 API 및 UI
- ✅ 캠페인 대시보드 AI 카드 연동
- ✅ OpenAI GPT-4o 통합
- ✅ 규칙 기반 폴백
- ✅ 일일 크론 작업

### 향후 개선 사항 (선택적)
- ⏳ 광고그룹 레벨 AI 연동
- ⏳ 인사이트-전략 자동 연결
- ⏳ 실시간 알림 시스템

---

*Created by bkit PDCA design phase*

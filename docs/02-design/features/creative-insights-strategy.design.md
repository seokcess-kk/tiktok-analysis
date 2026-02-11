# Design: Creative Insights & Strategy

## Overview
| Item | Description |
|------|-------------|
| Feature Name | creative-insights-strategy |
| Plan Document | [creative-insights-strategy.plan.md](../../01-plan/features/creative-insights-strategy.plan.md) |
| Created | 2026-02-11 |
| Author | Claude Opus 4.5 |
| Status | Draft |

## Architecture

### System Flow
```
┌──────────────────────────────────────────────────────────────────────┐
│                      Creative Insights & Strategy                      │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  [Creative Data]          [AI Analysis]           [User Interface]    │
│       │                        │                        │              │
│       ▼                        ▼                        ▼              │
│  ┌─────────┐            ┌───────────┐           ┌────────────┐        │
│  │ Prisma  │───────────▶│  OpenAI   │──────────▶│ Creative   │        │
│  │ DB      │  metrics   │  GPT-4o   │ insights  │ Detail     │        │
│  └─────────┘            └───────────┘           │ Page       │        │
│       │                        │                 └────────────┘        │
│       │                        │                        │              │
│       ▼                        ▼                        ▼              │
│  ┌─────────┐            ┌───────────┐           ┌────────────┐        │
│  │ Fatigue │            │ Strategy  │           │ Strategy   │        │
│  │ Calc    │            │ Generator │           │ Card       │        │
│  └─────────┘            └───────────┘           └────────────┘        │
│                                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### Component Diagram
```
src/
├── app/api/
│   ├── creatives/
│   │   └── [accountId]/
│   │       └── [creativeId]/
│   │           ├── insights/          # NEW: 소재별 인사이트 API
│   │           │   └── route.ts
│   │           └── strategies/        # NEW: 소재별 전략 API
│   │               └── route.ts
│   └── ai/
│       └── creatives/                 # NEW: AI 소재 분석 API
│           └── [accountId]/
│               └── analyze/
│                   └── route.ts
├── lib/ai/
│   ├── modules/
│   │   ├── creative-insight-generator.ts  # NEW: 소재별 인사이트 생성
│   │   └── creative-strategy-advisor.ts   # NEW: 소재별 전략 생성
│   ├── prompts/
│   │   └── creative.ts                    # MODIFY: 상세 프롬프트 추가
│   └── schemas/
│       └── creative-insight.schema.ts     # NEW: 스키마 정의
├── components/
│   └── creatives/
│       ├── creative-insight-card.tsx      # NEW: 인사이트 카드
│       ├── creative-strategy-list.tsx     # NEW: 전략 목록
│       └── creative-detail-panel.tsx      # NEW: 상세 패널
└── app/(dashboard)/accounts/[accountId]/creatives/
    └── [creativeId]/
        └── page.tsx                       # NEW: 소재 상세 페이지
```

## Database Schema

### 기존 스키마 활용
현재 Prisma 스키마에서 이미 정의된 모델들을 활용:
- `Creative`: 소재 기본 정보
- `AIInsight`: 인사이트 저장 (type: CREATIVE)
- `AIStrategy`: 전략 저장 (type: CREATIVE)
- `CreativeFatigue`: 피로도 데이터

### 새로운 필드 추가 (Optional)
```prisma
// AIInsight 모델에 추가
model AIInsight {
  // 기존 필드...
  creativeId String?      // NEW: 소재 ID 연결
  creative   Creative?    @relation(fields: [creativeId], references: [id])
}

// AIStrategy 모델에 추가
model AIStrategy {
  // 기존 필드...
  creativeId String?      // NEW: 소재 ID 연결
  creative   Creative?    @relation(fields: [creativeId], references: [id])
}
```

## API Specification

### 1. 소재별 인사이트 생성 API

**Endpoint**: `POST /api/creatives/{accountId}/{creativeId}/insights`

**Request**:
```typescript
interface GenerateCreativeInsightRequest {
  forceRegenerate?: boolean;  // 기존 인사이트 무시하고 재생성
}
```

**Response**:
```typescript
interface CreativeInsightResponse {
  success: boolean;
  data: {
    creativeId: string;
    insights: CreativeInsight[];
    generatedAt: string;
  };
}

interface CreativeInsight {
  id: string;
  type: 'PERFORMANCE' | 'FATIGUE' | 'OPTIMIZATION' | 'COMPARISON';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  summary: string;
  details: {
    metrics?: {
      name: string;
      value: number;
      benchmark: number;
      status: 'ABOVE' | 'BELOW' | 'AVERAGE';
    }[];
    trends?: {
      metric: string;
      direction: 'UP' | 'DOWN' | 'STABLE';
      changePercent: number;
    }[];
    comparison?: {
      accountAverage: number;
      creativeValue: number;
      percentile: number;
    };
  };
  recommendations: string[];
}
```

### 2. 소재별 전략 생성 API

**Endpoint**: `POST /api/creatives/{accountId}/{creativeId}/strategies`

**Request**:
```typescript
interface GenerateCreativeStrategyRequest {
  insightIds?: string[];  // 특정 인사이트 기반 전략 생성
}
```

**Response**:
```typescript
interface CreativeStrategyResponse {
  success: boolean;
  data: {
    creativeId: string;
    strategies: CreativeStrategy[];
    generatedAt: string;
  };
}

interface CreativeStrategy {
  id: string;
  type: 'SCALE' | 'OPTIMIZE' | 'REPLACE' | 'TEST';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  actionItems: {
    action: string;
    reason: string;
    expectedImpact: string;
  }[];
  estimatedImpact: {
    metric: string;
    changePercent: number;
    confidence: number;
  };
  relatedInsightId?: string;
}
```

### 3. 소재 일괄 분석 API

**Endpoint**: `POST /api/ai/creatives/{accountId}/analyze`

**Request**:
```typescript
interface BatchAnalyzeRequest {
  creativeIds?: string[];  // 특정 소재만 분석 (없으면 전체)
  limit?: number;          // 최대 분석 개수 (기본: 10)
}
```

**Response**:
```typescript
interface BatchAnalyzeResponse {
  success: boolean;
  data: {
    analyzed: number;
    results: {
      creativeId: string;
      insightsCount: number;
      strategiesCount: number;
      topInsight?: CreativeInsight;
      topStrategy?: CreativeStrategy;
    }[];
    summary: {
      totalInsights: number;
      totalStrategies: number;
      criticalCount: number;
      highPriorityCount: number;
    };
  };
}
```

## AI Module Design

### CreativeInsightGenerator

```typescript
// src/lib/ai/modules/creative-insight-generator.ts

export interface CreativeAnalysisContext {
  creative: {
    id: string;
    type: 'VIDEO' | 'IMAGE' | 'CAROUSEL';
    duration?: number;
    tags?: string[];
    daysActive: number;
  };
  metrics: {
    current: CreativeMetrics;
    previous?: CreativeMetrics;
    trend: DailyMetric[];
  };
  fatigue: {
    index: number;
    trend: PerformanceTrend;
    estimatedExhaustion?: Date;
  };
  accountBenchmark: {
    avgCtr: number;
    avgCvr: number;
    avgCpa: number;
    topPerformerCtr: number;
  };
}

export async function generateCreativeInsights(
  context: CreativeAnalysisContext
): Promise<CreativeInsight[]> {
  // 1. 성과 분석 인사이트
  // 2. 피로도 분석 인사이트
  // 3. 비교 분석 인사이트
  // 4. 최적화 제안 인사이트
}
```

### CreativeStrategyAdvisor

```typescript
// src/lib/ai/modules/creative-strategy-advisor.ts

export interface CreativeStrategyContext {
  creative: CreativeAnalysisContext;
  insights: CreativeInsight[];
  existingStrategies?: Strategy[];  // 중복 방지
}

export async function generateCreativeStrategies(
  context: CreativeStrategyContext
): Promise<CreativeStrategy[]> {
  // 인사이트 기반 전략 생성
  // 1. 고성과 소재 → SCALE 전략
  // 2. 저성과 소재 → OPTIMIZE/REPLACE 전략
  // 3. 피로도 높음 → REPLACE 전략
  // 4. 성과 가능성 → TEST 전략
}
```

### AI Prompts

```typescript
// src/lib/ai/prompts/creative.ts

export const creativePrompts = {
  // 소재별 인사이트 생성
  creativeInsight: {
    system: `당신은 TikTok 광고 소재 분석 전문가입니다.
개별 소재의 성과 데이터를 분석하여 구체적이고 실행 가능한 인사이트를 제공합니다.

분석 관점:
1. 성과 분석: CTR, CVR, CPA, ROAS 등 핵심 지표 평가
2. 피로도 분석: 소재 수명 및 교체 시점 판단
3. 비교 분석: 계정 평균 및 Top 소재 대비 성과
4. 최적화 분석: 개선 가능한 영역 식별

응답 형식 (JSON):
{
  "insights": [{
    "type": "PERFORMANCE" | "FATIGUE" | "OPTIMIZATION" | "COMPARISON",
    "severity": "INFO" | "WARNING" | "CRITICAL",
    "title": "인사이트 제목 (20자 이내)",
    "summary": "핵심 요약 (2문장)",
    "details": {
      "metrics": [...],
      "trends": [...],
      "comparison": {...}
    },
    "recommendations": ["권장 조치 1", "권장 조치 2"]
  }]
}`,

    user: (context: CreativeAnalysisContext) => `
## 소재 정보
- ID: ${context.creative.id}
- 유형: ${context.creative.type}
- 운영 기간: ${context.creative.daysActive}일
- 태그: ${context.creative.tags?.join(', ') || '없음'}

## 현재 성과
${JSON.stringify(context.metrics.current, null, 2)}

## 피로도 현황
- 피로도 지수: ${context.fatigue.index}/100
- 추세: ${context.fatigue.trend}
${context.fatigue.estimatedExhaustion ? `- 예상 소진일: ${context.fatigue.estimatedExhaustion}` : ''}

## 계정 벤치마크
- 평균 CTR: ${context.accountBenchmark.avgCtr}%
- 평균 CVR: ${context.accountBenchmark.avgCvr}%
- 평균 CPA: ${context.accountBenchmark.avgCpa}원
- Top 소재 CTR: ${context.accountBenchmark.topPerformerCtr}%

이 소재에 대한 인사이트를 생성해주세요.
성과 수준, 피로도 상태, 계정 내 위치를 종합적으로 분석해주세요.
`,
  },

  // 소재별 전략 생성
  creativeStrategy: {
    system: `당신은 TikTok 광고 소재 전략 전문가입니다.
인사이트를 기반으로 실행 가능한 전략을 제안합니다.

전략 유형:
1. SCALE: 고성과 소재 확장 (예산 증액, 유사 소재 제작)
2. OPTIMIZE: 소재 최적화 (타겟팅 조정, 시간대 최적화)
3. REPLACE: 소재 교체 (신규 소재 준비, 기존 소재 중지)
4. TEST: A/B 테스트 (변형 테스트, 새로운 시도)

응답 형식 (JSON):
{
  "strategies": [{
    "type": "SCALE" | "OPTIMIZE" | "REPLACE" | "TEST",
    "priority": "HIGH" | "MEDIUM" | "LOW",
    "title": "전략 제목 (30자 이내)",
    "description": "전략 설명 (3문장 이내)",
    "actionItems": [{
      "action": "구체적 조치",
      "reason": "이유",
      "expectedImpact": "예상 효과"
    }],
    "estimatedImpact": {
      "metric": "개선 지표",
      "changePercent": 예상 개선율,
      "confidence": 신뢰도(0-100)
    }
  }]
}`,

    user: (context: CreativeStrategyContext) => `
## 소재 정보
${JSON.stringify(context.creative.creative, null, 2)}

## 분석된 인사이트
${JSON.stringify(context.insights, null, 2)}

## 현재 성과
${JSON.stringify(context.creative.metrics.current, null, 2)}

## 피로도: ${context.creative.fatigue.index}/100

이 소재에 대한 전략을 제안해주세요.
인사이트를 기반으로 가장 효과적인 조치를 우선순위와 함께 제시해주세요.
`,
  },
};
```

## UI Components

### 1. CreativeInsightCard

```typescript
// src/components/creatives/creative-insight-card.tsx

interface CreativeInsightCardProps {
  insight: CreativeInsight;
  onDismiss?: () => void;
  onGenerateStrategy?: () => void;
}

// UI:
// ┌──────────────────────────────────────┐
// │ 🔍 PERFORMANCE          ⚠️ WARNING   │
// │ ──────────────────────────────────── │
// │ CTR이 계정 평균 대비 25% 낮습니다      │
// │                                       │
// │ 이 소재의 CTR 0.8%는 계정 평균 1.2%    │
// │ 대비 낮은 수준입니다.                  │
// │                                       │
// │ 📊 지표 비교                          │
// │ • CTR: 0.8% (평균: 1.2%) ↓           │
// │ • CVR: 2.1% (평균: 2.0%) →           │
// │                                       │
// │ 💡 권장 조치                          │
// │ • 썸네일/후크 개선 테스트              │
// │ • 타겟팅 범위 조정                     │
// │                                       │
// │ [전략 생성] [닫기]                    │
// └──────────────────────────────────────┘
```

### 2. CreativeStrategyList

```typescript
// src/components/creatives/creative-strategy-list.tsx

interface CreativeStrategyListProps {
  creativeId: string;
  strategies: CreativeStrategy[];
  onAccept?: (strategyId: string) => void;
  onReject?: (strategyId: string, reason: string) => void;
}

// UI:
// ┌──────────────────────────────────────┐
// │ 📋 추천 전략 (3개)                    │
// ├──────────────────────────────────────┤
// │ 🔴 HIGH | REPLACE                    │
// │ 소재 교체 준비 권장                    │
// │ 피로도 75%로 2주 내 교체 필요          │
// │ [수락] [거절] [상세]                  │
// ├──────────────────────────────────────┤
// │ 🟡 MEDIUM | SCALE                    │
// │ 유사 소재 추가 제작                    │
// │ 현재 ROAS 3.2x 유지 중                │
// │ [수락] [거절] [상세]                  │
// └──────────────────────────────────────┘
```

### 3. CreativeDetailPanel

```typescript
// src/components/creatives/creative-detail-panel.tsx

interface CreativeDetailPanelProps {
  creative: Creative;
  insights: CreativeInsight[];
  strategies: CreativeStrategy[];
  onGenerateInsights?: () => void;
  onGenerateStrategies?: () => void;
}

// 탭 구성:
// [개요] [인사이트] [전략] [성과 추이] [피로도]
```

## Implementation Order

### Phase 1: Backend (1.5일)
1. Prisma 스키마 수정 (creativeId 관계 추가)
2. `creative-insight-generator.ts` 모듈 구현
3. `creative-strategy-advisor.ts` 모듈 구현
4. `/api/creatives/[accountId]/[creativeId]/insights` API 구현
5. `/api/creatives/[accountId]/[creativeId]/strategies` API 구현

### Phase 2: Frontend Components (1일)
1. `creative-insight-card.tsx` 구현
2. `creative-strategy-list.tsx` 구현
3. `creative-detail-panel.tsx` 구현

### Phase 3: Page Integration (1일)
1. 소재 상세 페이지 생성 (`/accounts/[accountId]/creatives/[creativeId]`)
2. 크리에이티브 목록 페이지에 인사이트 요약 추가
3. 인사이트/전략 생성 버튼 연동

### Phase 4: Testing (0.5일)
1. API 테스트
2. UI 테스트
3. 통합 테스트

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `src/lib/ai/modules/creative-insight-generator.ts` | 소재별 인사이트 생성 |
| `src/lib/ai/modules/creative-strategy-advisor.ts` | 소재별 전략 생성 |
| `src/lib/ai/schemas/creative-insight.schema.ts` | Zod 스키마 |
| `src/app/api/creatives/[accountId]/[creativeId]/insights/route.ts` | 인사이트 API |
| `src/app/api/creatives/[accountId]/[creativeId]/strategies/route.ts` | 전략 API |
| `src/components/creatives/creative-insight-card.tsx` | 인사이트 UI |
| `src/components/creatives/creative-strategy-list.tsx` | 전략 목록 UI |
| `src/components/creatives/creative-detail-panel.tsx` | 상세 패널 |
| `src/app/(dashboard)/accounts/[accountId]/creatives/[creativeId]/page.tsx` | 상세 페이지 |

### Modified Files
| File | Changes |
|------|---------|
| `prisma/schema.prisma` | AIInsight, AIStrategy에 creativeId 관계 추가 |
| `src/lib/ai/prompts/creative.ts` | 상세 프롬프트 추가 |
| `src/components/creatives/creative-card.tsx` | 인사이트 요약 표시 추가 |
| `src/app/(dashboard)/accounts/[accountId]/creatives/page.tsx` | 상세 페이지 링크 추가 |

## Testing Checklist

- [ ] 소재별 인사이트 생성 API 동작 확인
- [ ] 소재별 전략 생성 API 동작 확인
- [ ] 피로도 기반 교체 전략 생성 확인
- [ ] 인사이트 카드 UI 렌더링 확인
- [ ] 전략 수락/거절 기능 확인
- [ ] 소재 상세 페이지 접근 확인
- [ ] 에러 처리 확인

---

## Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | - | - | Pending |
| Tech Lead | - | - | Pending |
| Developer | Claude Opus 4.5 | 2026-02-11 | Draft |

---
*Generated by bkit PDCA Skill v1.5.0*

# Design Document: AI 인사이트/전략 생성 오류 수정

**Feature**: ai-generation-fix
**Created**: 2026-02-12
**Plan Reference**: `docs/01-plan/features/ai-generation-fix.plan.md`

---

## 1. 설계 개요

### 1.1 목적

Daily Insights Job과 Campaign Insight 생성 시 AI에 빈 데이터가 전달되는 문제를 수정하고, OpenAI 클라이언트의 안정성을 강화합니다.

### 1.2 핵심 변경 사항

| 우선순위 | 파일 | 변경 내용 |
|----------|------|-----------|
| Critical | `daily-insights/route.ts` | trend, topCreatives, campaigns 데이터 조회 추가 |
| Critical | `campaigns/.../generate/route.ts` | topCreatives 조회 추가 |
| High | `lib/ai/client.ts` | timeout 설정, retry 로직 추가 |

---

## 2. 상세 설계

### 2.1 Daily Insights Job 수정

**파일**: `src/app/api/jobs/daily-insights/route.ts`

#### 2.1.1 Trend 데이터 조회 추가

**위치**: Line 91 이후 (메트릭 조회 후)

```typescript
// 7일간 트렌드 조회
const trendMetrics = await prisma.performanceMetric.findMany({
  where: {
    accountId: account.id,
    level: 'ACCOUNT',
    date: {
      gte: new Date(new Date().setDate(new Date().getDate() - 7)),
      lte: today,
    },
  },
  orderBy: { date: 'asc' },
  take: 7,
});

const trend = trendMetrics.map((m) => ({
  date: m.date.toISOString(),
  spend: m.spend,
  ctr: m.ctr || 0,
  cpa: m.cpa || 0,
}));
```

#### 2.1.2 Top Creatives 조회 추가

**위치**: Line 91 이후

```typescript
// 상위 5개 크리에이티브 조회
const topCreatives = await prisma.creative.findMany({
  where: {
    ad: {
      adGroup: {
        campaign: {
          accountId: account.id,
        },
      },
    },
  },
  include: {
    metrics: {
      where: {
        date: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      },
    },
  },
  take: 10,
});

const topCreativesData = topCreatives
  .map((c) => {
    const totalSpend = c.metrics.reduce((sum, m) => sum + m.spend, 0);
    const totalConversions = c.metrics.reduce((sum, m) => sum + m.conversions, 0);
    return {
      id: c.id,
      name: c.name || c.id,
      spend: totalSpend,
      conversions: totalConversions,
      roas: totalSpend > 0 ? (totalConversions * 100) / totalSpend : 0,
    };
  })
  .sort((a, b) => b.roas - a.roas)
  .slice(0, 5);
```

#### 2.1.3 Campaigns 데이터 조회 추가

**위치**: Line 91 이후

```typescript
// 활성 캠페인 조회 (상위 5개)
const campaigns = await prisma.campaign.findMany({
  where: {
    accountId: account.id,
    status: 'ACTIVE',
  },
  include: {
    metrics: {
      where: {
        level: 'CAMPAIGN',
        date: {
          gte: new Date(new Date().setDate(new Date().getDate() - 7)),
        },
      },
    },
  },
  take: 5,
});

const campaignsData = campaigns.map((c) => {
  const totalSpend = c.metrics.reduce((sum, m) => sum + m.spend, 0);
  const totalImpressions = c.metrics.reduce((sum, m) => sum + m.impressions, 0);
  const totalClicks = c.metrics.reduce((sum, m) => sum + m.clicks, 0);
  const totalConversions = c.metrics.reduce((sum, m) => sum + m.conversions, 0);
  return {
    name: c.name,
    status: c.status,
    metrics: {
      spend: totalSpend,
      impressions: totalImpressions,
      clicks: totalClicks,
      conversions: totalConversions,
    },
  };
});
```

#### 2.1.4 AI 호출 시 데이터 전달

**수정 위치**: Lines 161-163

**Before**:
```typescript
trend: [],
topCreatives: [],
campaigns: [],
```

**After**:
```typescript
trend: trend,
topCreatives: topCreativesData,
campaigns: campaignsData,
```

---

### 2.2 Campaign Insight Route 수정

**파일**: `src/app/api/ai/insights/[accountId]/campaigns/[campaignId]/generate/route.ts`

#### 2.2.1 Top Creatives 조회 추가

**위치**: Line 82 이후 (adGroupMetrics 조회 후)

```typescript
// 캠페인 크리에이티브 조회
const creatives = await prisma.creative.findMany({
  where: {
    ad: {
      adGroup: {
        campaignId: campaignId,
      },
    },
  },
  include: {
    metrics: {
      where: {
        date: { gte: weekAgo, lte: today },
      },
    },
    fatigue: true,
  },
  take: 10,
});

const topCreatives = creatives
  .map((c) => {
    const totalSpend = c.metrics.reduce((sum, m) => sum + m.spend, 0);
    const totalConversions = c.metrics.reduce((sum, m) => sum + m.conversions, 0);
    const totalClicks = c.metrics.reduce((sum, m) => sum + m.clicks, 0);
    const totalImpressions = c.metrics.reduce((sum, m) => sum + m.impressions, 0);
    return {
      id: c.id,
      name: c.name || c.id,
      spend: totalSpend,
      conversions: totalConversions,
      ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      fatigueIndex: c.fatigue?.fatigueIndex || 0,
    };
  })
  .sort((a, b) => b.conversions - a.conversions)
  .slice(0, 5);
```

#### 2.2.2 AI 호출 시 데이터 전달

**수정 위치**: Line 115

**Before**:
```typescript
topCreatives: [],
```

**After**:
```typescript
topCreatives: topCreatives,
```

---

### 2.3 OpenAI Client 안정성 강화

**파일**: `src/lib/ai/client.ts`

#### 2.3.1 Timeout 설정

```typescript
function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openaiInstance = new OpenAI({
      apiKey,
      timeout: 30000, // 30초 timeout
      maxRetries: 0,  // 직접 retry 로직 사용
    });
  }
  return openaiInstance;
}
```

#### 2.3.2 Retry 로직 추가

```typescript
const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1초

async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Rate limit 또는 일시적 오류인 경우에만 재시도
      const isRetryable =
        error instanceof OpenAI.APIError &&
        (error.status === 429 || error.status === 500 || error.status === 503);

      if (!isRetryable || attempt === retries - 1) {
        throw lastError;
      }

      const delay = INITIAL_DELAY * Math.pow(2, attempt);
      console.log(`[AI Client] Retry attempt ${attempt + 1}/${retries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
```

#### 2.3.3 generateCompletion 수정

```typescript
export async function generateCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodType<T>,
  options: AIRequestOptions = {}
): Promise<T> {
  const { temperature = 0.3, maxTokens = 4096 } = options;
  const openai = getOpenAI();

  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error('AI response is empty');
    }

    try {
      const parsed = JSON.parse(content);
      return schema.parse(parsed);
    } catch (error) {
      console.error('AI Response parsing error:', error);
      console.error('Raw content:', content);
      throw new Error('Failed to parse AI response');
    }
  });
}
```

---

## 3. 구현 체크리스트

### 3.1 Phase 1: Data Flow 수정 (Critical)

| ID | 항목 | 파일 | 상태 |
|----|------|------|------|
| P1-01 | Trend 데이터 조회 추가 | `daily-insights/route.ts` | ⬜ |
| P1-02 | TopCreatives 조회 추가 | `daily-insights/route.ts` | ⬜ |
| P1-03 | Campaigns 데이터 조회 추가 | `daily-insights/route.ts` | ⬜ |
| P1-04 | AI 호출 시 실제 데이터 전달 | `daily-insights/route.ts` | ⬜ |
| P1-05 | Campaign insight topCreatives 조회 | `campaigns/.../generate/route.ts` | ⬜ |
| P1-06 | Campaign insight topCreatives 전달 | `campaigns/.../generate/route.ts` | ⬜ |

### 3.2 Phase 2: Client 안정성 (High)

| ID | 항목 | 파일 | 상태 |
|----|------|------|------|
| P2-01 | OpenAI timeout 설정 (30초) | `lib/ai/client.ts` | ⬜ |
| P2-02 | withRetry 헬퍼 함수 추가 | `lib/ai/client.ts` | ⬜ |
| P2-03 | generateCompletion에 retry 적용 | `lib/ai/client.ts` | ⬜ |
| P2-04 | 에러 로깅 개선 | `lib/ai/client.ts` | ⬜ |

---

## 4. 데이터 흐름

### 4.1 수정 전 (현재)

```
Daily Job
    ↓
Account 조회
    ↓
현재/이전 메트릭 조회
    ↓
AI 호출 (trend=[], topCreatives=[], campaigns=[])  ← 문제!
    ↓
제네릭한 인사이트 생성
```

### 4.2 수정 후

```
Daily Job
    ↓
Account 조회
    ↓
병렬 조회:
├─ 현재/이전 메트릭
├─ 7일 트렌드 (NEW)
├─ 상위 크리에이티브 (NEW)
└─ 활성 캠페인 (NEW)
    ↓
AI 호출 (모든 데이터 포함)
    ↓
컨텍스트 기반 고품질 인사이트 생성
```

---

## 5. 성공 기준

### 5.1 기능적 검증

| ID | 기준 | 검증 방법 |
|----|------|-----------|
| SC-01 | Daily Job에 실제 데이터 전달 | 로그에서 trend/topCreatives/campaigns 길이 확인 |
| SC-02 | 캠페인 인사이트에 크리에이티브 분석 포함 | API 응답의 keyFindings에 크리에이티브 관련 내용 |
| SC-03 | Retry 동작 확인 | 의도적 429 에러 시 재시도 로그 확인 |
| SC-04 | Timeout 동작 확인 | 느린 응답 시 30초 후 에러 |

### 5.2 품질 검증

| ID | 기준 | 목표 |
|----|------|------|
| QC-01 | TypeScript 컴파일 | 에러 없음 |
| QC-02 | 빌드 성공 | `npm run build` 통과 |
| QC-03 | 인사이트 품질 | keyFindings 평균 3개 이상 |

---

## 6. 구현 순서

```
1. lib/ai/client.ts 수정 (P2-01~04)
   - timeout, retry 로직 먼저 추가
   - 이후 작업의 안정성 확보

2. daily-insights/route.ts 수정 (P1-01~04)
   - 데이터 조회 로직 추가
   - AI 호출 시 데이터 전달

3. campaigns/.../generate/route.ts 수정 (P1-05~06)
   - topCreatives 조회 및 전달

4. 테스트 및 검증
   - TypeScript 체크
   - 로컬 테스트
   - 빌드 확인
```

---

## 7. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|-----------|
| DB 쿼리 성능 저하 | Medium | 쿼리 병렬 실행, take 제한 |
| OpenAI 비용 증가 | Low | 기존과 동일 호출 횟수 |
| Vercel Function Timeout | High | 30초 client timeout |

---

*Generated by bkit PDCA workflow*

# Design: 시스템 개선 v1

## 개요

| 항목 | 내용 |
|------|------|
| **기능명** | system-improvement-v1 |
| **Plan 문서** | [system-improvement-v1.plan.md](../../01-plan/features/system-improvement-v1.plan.md) |
| **작성일** | 2026-02-19 |
| **목표** | 코드 품질 점수 72점 → 90점 |

---

## Phase 1: API 보안 강화

### 1.1 입력 검증 미들웨어

#### 신규 파일: `src/lib/api/validation.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<ValidationResult<T>> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ZodError) {
      const details: Record<string, string[]> = {};
      error.errors.forEach((err) => {
        const path = err.path.join('.');
        if (!details[path]) details[path] = [];
        details[path].push(err.message);
      });
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details,
        },
      };
    }
    return {
      success: false,
      error: {
        code: 'PARSE_ERROR',
        message: 'Failed to parse request body',
      },
    };
  }
}

export function validationErrorResponse(error: ValidationResult<unknown>['error']) {
  return NextResponse.json(
    { success: false, error },
    { status: 400 }
  );
}
```

#### 신규 파일: `src/lib/api/schemas.ts`

```typescript
import { z } from 'zod';

// AI Insight 생성 요청 스키마
export const GenerateInsightSchema = z.object({
  type: z.enum(['DAILY_SUMMARY', 'ANOMALY', 'TREND', 'CREATIVE', 'PREDICTION'])
    .optional()
    .default('DAILY_SUMMARY'),
  days: z.number().min(1).max(30).optional().default(7),
  forceRegenerate: z.boolean().optional().default(false),
});

export type GenerateInsightRequest = z.infer<typeof GenerateInsightSchema>;

// AI Strategy 생성 요청 스키마
export const GenerateStrategySchema = z.object({
  types: z.array(z.enum(['BUDGET', 'CAMPAIGN', 'TARGETING', 'CREATIVE', 'BIDDING']))
    .optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
  days: z.number().min(1).max(30).optional().default(7),
});

export type GenerateStrategyRequest = z.infer<typeof GenerateStrategySchema>;

// Strategy 액션 스키마
export const StrategyActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type StrategyActionRequest = z.infer<typeof StrategyActionSchema>;

// 메트릭 조회 스키마
export const MetricsQuerySchema = z.object({
  days: z.coerce.number().min(1).max(30).optional().default(7),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  level: z.enum(['ADVERTISER', 'CAMPAIGN', 'ADGROUP', 'AD']).optional().default('ADVERTISER'),
  compare: z.coerce.boolean().optional().default(false),
});

export type MetricsQueryRequest = z.infer<typeof MetricsQuerySchema>;
```

#### 수정 예시: `src/app/api/ai/insights/[accountId]/generate/route.ts`

```typescript
// Before
let type = 'DAILY_SUMMARY';
try {
  const body = await request.json();
  type = body.type || 'DAILY_SUMMARY';
} catch {
  // Body is empty or invalid, use default
}

// After
import { validateRequest, validationErrorResponse } from '@/lib/api/validation';
import { GenerateInsightSchema } from '@/lib/api/schemas';

const validation = await validateRequest(request, GenerateInsightSchema);
if (!validation.success) {
  return validationErrorResponse(validation.error);
}
const { type, days, forceRegenerate } = validation.data;
```

---

### 1.2 인증 미들웨어

#### 신규 파일: `src/lib/api/auth.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/db/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export interface AuthContext {
  userId: string;
  accountId: string;
  account: {
    id: string;
    name: string;
    tiktokAccountId: string;
  };
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export async function verifyAccountAccess(
  request: NextRequest,
  accountId: string
): Promise<AuthContext> {
  // 1. 세션 확인
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new UnauthorizedError('Session not found');
  }

  // 2. 계정 소유권 확인
  const userAccount = await prisma.userAccount.findFirst({
    where: {
      userId: session.user.id,
      accountId: accountId,
    },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          tiktokAccountId: true,
        },
      },
    },
  });

  if (!userAccount) {
    throw new ForbiddenError('Account access denied');
  }

  return {
    userId: session.user.id,
    accountId: accountId,
    account: userAccount.account,
  };
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json(
    { success: false, error: { code: 'UNAUTHORIZED', message } },
    { status: 401 }
  );
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json(
    { success: false, error: { code: 'FORBIDDEN', message } },
    { status: 403 }
  );
}
```

#### 수정 예시: `src/app/api/accounts/[accountId]/route.ts`

```typescript
// Before
const account = await prisma.account.findUnique({
  where: { id: accountId },
});

// After
import { verifyAccountAccess, unauthorizedResponse, forbiddenResponse, UnauthorizedError, ForbiddenError } from '@/lib/api/auth';

try {
  const authContext = await verifyAccountAccess(request, accountId);
  // authContext.account 사용
} catch (error) {
  if (error instanceof UnauthorizedError) {
    return unauthorizedResponse(error.message);
  }
  if (error instanceof ForbiddenError) {
    return forbiddenResponse(error.message);
  }
  throw error;
}
```

---

### 1.3 Rate Limiting

#### 신규 파일: `src/lib/api/rate-limit.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  interval: number;  // ms
  maxRequests: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitCache = new LRUCache<string, RateLimitEntry>({
  max: 10000,
  ttl: 60 * 1000, // 1 minute
});

export function rateLimit(options: RateLimitOptions) {
  const { interval, maxRequests } = options;

  return async function checkRateLimit(
    request: NextRequest,
    identifier: string
  ): Promise<{ success: boolean; remaining: number; resetAt: number }> {
    const now = Date.now();
    const key = `rate-limit:${identifier}`;

    let entry = rateLimitCache.get(key);

    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt: now + interval,
      };
    }

    entry.count++;
    rateLimitCache.set(key, entry);

    const remaining = Math.max(0, maxRequests - entry.count);
    const success = entry.count <= maxRequests;

    return {
      success,
      remaining,
      resetAt: entry.resetAt,
    };
  };
}

// AI API용 Rate Limiter (분당 5회)
export const aiRateLimiter = rateLimit({
  interval: 60 * 1000,
  maxRequests: 5,
});

export function rateLimitExceededResponse(resetAt: number) {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    }
  );
}
```

#### 수정 예시: `src/app/api/ai/insights/[accountId]/generate/route.ts`

```typescript
import { aiRateLimiter, rateLimitExceededResponse } from '@/lib/api/rate-limit';

export async function POST(request: NextRequest, { params }: { params: { accountId: string } }) {
  const { accountId } = params;

  // Rate Limit 체크
  const rateLimitResult = await aiRateLimiter(request, `ai-insight:${accountId}`);
  if (!rateLimitResult.success) {
    return rateLimitExceededResponse(rateLimitResult.resetAt);
  }

  // ... 기존 로직
}
```

---

## Phase 2: AI 비용 최적화

### 2.1 프롬프트 템플릿 통합

#### 신규 파일: `src/lib/ai/prompts/templates.ts`

```typescript
export const PROMPT_TEMPLATES = {
  // 기본 시스템 프롬프트
  BASE_ANALYST: `당신은 TikTok 광고 성과 분석 전문가입니다.
한국어로 응답해야 합니다.
데이터 기반의 객관적인 분석과 실행 가능한 권장사항을 제공하세요.`,

  // 인사이트 시스템 프롬프트
  INSIGHT_SYSTEM: (context?: string) => `${PROMPT_TEMPLATES.BASE_ANALYST}
${context ? `\n추가 컨텍스트:\n${context}` : ''}

분석 시 다음 사항을 고려하세요:
1. 주요 지표의 변화율과 추세
2. 이상 징후 및 기회 요소
3. 경쟁 벤치마크 대비 성과
4. 실행 가능한 개선 제안`,

  // 전략 시스템 프롬프트
  STRATEGY_SYSTEM: (context?: string) => `${PROMPT_TEMPLATES.BASE_ANALYST}
${context ? `\n추가 컨텍스트:\n${context}` : ''}

전략 수립 시 다음 사항을 고려하세요:
1. ROI 극대화를 위한 예산 배분
2. 타겟 오디언스 최적화
3. 소재 성과 개선 방안
4. 입찰 전략 조정`,

  // 일간 요약 프롬프트
  DAILY_SUMMARY: (data: {
    accountName: string;
    period: string;
    metrics: string;
    topCreatives: string;
  }) => `계정 "${data.accountName}"의 ${data.period} 성과를 분석해주세요.

## 성과 데이터
${data.metrics}

## 상위 소재
${data.topCreatives}

다음 형식으로 인사이트를 제공해주세요:
1. 핵심 성과 요약 (3-5개 포인트)
2. 주목할 변화 또는 이상 징후
3. 개선 기회
4. 권장 조치`,

  // 소재 분석 프롬프트
  CREATIVE_ANALYSIS: (data: {
    topCreatives: string;
    bottomCreatives: string;
    benchmarks: string;
  }) => `소재 성과를 분석해주세요.

## 상위 성과 소재
${data.topCreatives}

## 하위 성과 소재
${data.bottomCreatives}

## 벤치마크
${data.benchmarks}

다음을 분석해주세요:
1. 상위 소재의 성공 요인
2. 하위 소재의 문제점
3. 소재 최적화 권장사항`,
};

export type PromptTemplateKey = keyof typeof PROMPT_TEMPLATES;
```

### 2.2 모델 선택 최적화

#### 수정 파일: `src/lib/ai/client.ts`

```typescript
import OpenAI from 'openai';
import { ZodType } from 'zod';

type ModelType = 'gpt-4o' | 'gpt-4o-mini';

interface AIRequestOptions {
  model?: ModelType;
  complexity?: 'low' | 'medium' | 'high';
  temperature?: number;
  maxTokens?: number;
  retries?: number;
}

// 복잡도에 따른 모델 자동 선택
function selectModel(complexity: AIRequestOptions['complexity']): ModelType {
  switch (complexity) {
    case 'low':
      return 'gpt-4o-mini';  // 간단한 분류, 요약
    case 'medium':
      return 'gpt-4o-mini';  // 일반 분석
    case 'high':
      return 'gpt-4o';       // 복잡한 전략, 예측
    default:
      return 'gpt-4o-mini';
  }
}

export async function generateCompletion<T>(
  systemPrompt: string,
  userPrompt: string,
  schema: ZodType<T>,
  options: AIRequestOptions = {}
): Promise<T> {
  const {
    model = selectModel(options.complexity),
    temperature = 0.7,
    maxTokens = 2000,
    retries = 3,
  } = options;

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('Empty response');

      const parsed = JSON.parse(content);
      return schema.parse(parsed);
    } catch (error) {
      lastError = error as Error;
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

// 작업별 복잡도 매핑
export const TASK_COMPLEXITY: Record<string, AIRequestOptions['complexity']> = {
  'daily-summary': 'medium',
  'anomaly-detection': 'low',
  'trend-analysis': 'medium',
  'creative-analysis': 'medium',
  'prediction': 'high',
  'budget-strategy': 'high',
  'targeting-strategy': 'high',
  'creative-strategy': 'medium',
  'bidding-strategy': 'medium',
};
```

### 2.3 AI 응답 캐싱

#### 신규 파일: `src/lib/ai/cache.ts`

```typescript
import { prisma } from '@/lib/db/prisma';
import crypto from 'crypto';

interface CacheOptions {
  ttl: number;  // seconds
}

const DEFAULT_TTL = 6 * 60 * 60;  // 6 hours

export function generateCacheKey(
  type: 'insight' | 'strategy',
  accountId: string,
  params: Record<string, unknown>
): string {
  const paramsString = JSON.stringify(params, Object.keys(params).sort());
  const hash = crypto.createHash('md5').update(paramsString).digest('hex');
  return `ai-${type}:${accountId}:${hash}`;
}

export async function getCachedResult<T>(
  cacheKey: string
): Promise<T | null> {
  const cached = await prisma.aICache.findUnique({
    where: { key: cacheKey },
  });

  if (!cached) return null;
  if (cached.expiresAt < new Date()) {
    // 만료된 캐시 삭제
    await prisma.aICache.delete({ where: { key: cacheKey } });
    return null;
  }

  return cached.value as T;
}

export async function setCachedResult(
  cacheKey: string,
  value: unknown,
  options: CacheOptions = { ttl: DEFAULT_TTL }
): Promise<void> {
  const expiresAt = new Date(Date.now() + options.ttl * 1000);

  await prisma.aICache.upsert({
    where: { key: cacheKey },
    update: { value: value as any, expiresAt },
    create: { key: cacheKey, value: value as any, expiresAt },
  });
}

export async function invalidateCache(
  pattern: string
): Promise<number> {
  const result = await prisma.aICache.deleteMany({
    where: { key: { startsWith: pattern } },
  });
  return result.count;
}
```

#### DB 스키마 추가 (prisma/schema.prisma)

```prisma
model AICache {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([expiresAt])
}
```

### 2.4 Fallback 로직 활성화

#### 수정: `src/app/api/ai/insights/[accountId]/generate/route.ts`

```typescript
import { isOpenAIAvailable, generateFallbackInsights } from '@/lib/ai/fallback';
import { generateCacheKey, getCachedResult, setCachedResult } from '@/lib/ai/cache';

export async function POST(request: NextRequest, { params }: { params: { accountId: string } }) {
  const { accountId } = params;

  // 1. 검증 및 인증 (Phase 1에서 구현)
  // ...

  // 2. 캐시 확인
  const cacheKey = generateCacheKey('insight', accountId, { type, days });
  if (!forceRegenerate) {
    const cached = await getCachedResult<AIInsight[]>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: { insights: cached, cached: true } });
    }
  }

  // 3. AI 가용성 확인
  if (!isOpenAIAvailable()) {
    // Fallback 로직 사용
    const fallbackInsights = generateFallbackInsights(currentMetrics, previousMetrics, account.name);

    // Fallback 결과 저장
    await saveFallbackInsights(accountId, fallbackInsights);

    return NextResponse.json({
      success: true,
      data: { insights: fallbackInsights, fallback: true },
    });
  }

  // 4. AI 인사이트 생성
  try {
    const insights = await generateDailyInsight(context);

    // 캐시 저장
    await setCachedResult(cacheKey, insights);

    return NextResponse.json({ success: true, data: { insights } });
  } catch (error) {
    // AI 실패 시 Fallback 사용
    const fallbackInsights = generateFallbackInsights(currentMetrics, previousMetrics, account.name);
    return NextResponse.json({
      success: true,
      data: { insights: fallbackInsights, fallback: true },
    });
  }
}
```

---

## Phase 3: DB 성능 최적화

### 3.1 복합 인덱스 추가

#### 수정: `prisma/schema.prisma`

```prisma
model PerformanceMetric {
  // ... 기존 필드

  // 기존 인덱스
  @@index([accountId, date])
  @@index([campaignId, date])
  @@index([adGroupId, date])
  @@index([adId, date])
  @@index([creativeId, date])

  // 신규 복합 인덱스
  @@index([accountId, level, date])           // 레벨별 조회 최적화
  @@index([accountId, date, level])           // 날짜 범위 + 레벨
  @@index([campaignId, level, date])          // 캠페인별 레벨 조회
}

model AIInsight {
  // ... 기존 필드

  // 신규 인덱스
  @@index([accountId, type, createdAt])       // 타입별 최신 조회
  @@index([campaignId, type, createdAt])      // 캠페인별 타입 조회
}

model AIStrategy {
  // ... 기존 필드

  // 신규 인덱스
  @@index([accountId, status, createdAt])     // 상태별 조회
  @@index([campaignId, status, createdAt])    // 캠페인별 상태 조회
}
```

### 3.2 토큰 암호화

#### 신규 파일: `src/lib/crypto.ts`

```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // iv:tag:encrypted 형식으로 저장
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, encryptedHex] = encrypted.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

export function isEncrypted(value: string): boolean {
  // iv:tag:encrypted 형식 확인
  const parts = value.split(':');
  return parts.length === 3 && parts[0].length === 32 && parts[1].length === 32;
}
```

#### 수정: `src/lib/tiktok/auth.ts`

```typescript
import { encryptToken, decryptToken, isEncrypted } from '@/lib/crypto';

// 토큰 저장 시 암호화
export async function saveTokens(accountId: string, accessToken: string, refreshToken: string) {
  await prisma.account.update({
    where: { id: accountId },
    data: {
      accessToken: encryptToken(accessToken),
      refreshToken: encryptToken(refreshToken),
    },
  });
}

// 토큰 조회 시 복호화
export async function getDecryptedTokens(accountId: string): Promise<{ accessToken: string; refreshToken: string }> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { accessToken: true, refreshToken: true },
  });

  if (!account?.accessToken || !account?.refreshToken) {
    throw new Error('Tokens not found');
  }

  return {
    accessToken: isEncrypted(account.accessToken)
      ? decryptToken(account.accessToken)
      : account.accessToken,
    refreshToken: isEncrypted(account.refreshToken)
      ? decryptToken(account.refreshToken)
      : account.refreshToken,
  };
}
```

### 3.3 소프트 삭제 구현

#### 수정: `prisma/schema.prisma`

```prisma
model Account {
  // ... 기존 필드
  deletedAt DateTime?

  @@index([deletedAt])
}

model Campaign {
  // ... 기존 필드
  deletedAt DateTime?

  @@index([deletedAt])
}

// AdGroup, Ad, Creative 등에도 동일하게 적용
```

#### 수정: `src/lib/db/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  const prisma = new PrismaClient();

  // 소프트 삭제 미들웨어
  prisma.$use(async (params, next) => {
    // 삭제 요청을 업데이트로 변환
    if (params.action === 'delete') {
      params.action = 'update';
      params.args['data'] = { deletedAt: new Date() };
    }

    if (params.action === 'deleteMany') {
      params.action = 'updateMany';
      if (params.args.data !== undefined) {
        params.args.data['deletedAt'] = new Date();
      } else {
        params.args['data'] = { deletedAt: new Date() };
      }
    }

    // 조회 시 삭제된 레코드 제외
    if (params.action === 'findUnique' || params.action === 'findFirst') {
      params.action = 'findFirst';
      params.args.where['deletedAt'] = null;
    }

    if (params.action === 'findMany') {
      if (params.args.where) {
        if (params.args.where.deletedAt === undefined) {
          params.args.where['deletedAt'] = null;
        }
      } else {
        params.args['where'] = { deletedAt: null };
      }
    }

    return next(params);
  });

  return prisma;
};

// ... 기존 코드
```

---

## Phase 4: 프론트엔드 개선

### 4.1 React Query 도입

#### 설치

```bash
npm install @tanstack/react-query
```

#### 신규 파일: `src/lib/providers/query-provider.tsx`

```typescript
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,  // 5분
            gcTime: 30 * 60 * 1000,    // 30분
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

#### 신규 파일: `src/lib/hooks/useQueries.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// 캠페인 목록 조회
export function useCampaigns(accountId: string) {
  return useQuery({
    queryKey: ['campaigns', accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}/campaigns`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
  });
}

// 계정 상세 조회
export function useAccount(accountId: string) {
  return useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data.account;
    },
  });
}

// 메트릭 조회
export function useMetrics(accountId: string, days = 7) {
  return useQuery({
    queryKey: ['metrics', accountId, days],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}/metrics?days=${days}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data;
    },
  });
}

// 인사이트 조회
export function useInsights(accountId: string) {
  return useQuery({
    queryKey: ['insights', accountId],
    queryFn: async () => {
      const res = await fetch(`/api/ai/insights/${accountId}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data.insights;
    },
  });
}

// 인사이트 생성
export function useGenerateInsights(accountId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type = 'DAILY_SUMMARY') => {
      const res = await fetch(`/api/ai/insights/${accountId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message);
      return data.data.insights;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights', accountId] });
    },
  });
}
```

### 4.2 타입 안전성 강화

#### 신규 파일: `src/types/api.ts`

```typescript
// API 응답 기본 타입
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

// 계정 타입
export interface Account {
  id: string;
  name: string;
  tiktokAccountId: string;
  clientName: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'DISCONNECTED';
  lastSyncAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 캠페인 타입
export interface Campaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget: number;
  budgetMode: string;
  adGroupCount: number;
  creativeCount: number;
  metrics: CampaignMetrics;
  createdAt: string;
  updatedAt: string;
}

// 캠페인 메트릭 타입
export interface CampaignMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cvr: number;
  cpa: number;
  roas: number;
}

// 인사이트 타입
export interface Insight {
  id: string;
  type: 'ANOMALY' | 'DAILY_SUMMARY' | 'TREND' | 'CREATIVE' | 'PREDICTION';
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  relatedMetrics: Record<string, number>;
  createdAt: string;
}

// 전략 타입
export interface Strategy {
  id: string;
  type: 'BUDGET' | 'CAMPAIGN' | 'TARGETING' | 'CREATIVE' | 'BIDDING';
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  title: string;
  description: string;
  expectedImpact: string;
  actionItems: string[];
  createdAt: string;
}
```

### 4.3 전역 상태 관리 (Zustand)

#### 설치

```bash
npm install zustand
```

#### 신규 파일: `src/stores/account-store.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account } from '@/types/api';

interface AccountState {
  currentAccount: Account | null;
  accounts: Account[];
  setCurrentAccount: (account: Account | null) => void;
  setAccounts: (accounts: Account[]) => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      currentAccount: null,
      accounts: [],
      setCurrentAccount: (account) => set({ currentAccount: account }),
      setAccounts: (accounts) => set({ accounts }),
    }),
    {
      name: 'account-storage',
    }
  )
);
```

#### 신규 파일: `src/stores/filter-store.ts`

```typescript
import { create } from 'zustand';

interface FilterState {
  dateRange: {
    startDate: string | null;
    endDate: string | null;
    days: number;
  };
  campaignStatus: string | null;
  searchQuery: string;
  setDateRange: (range: Partial<FilterState['dateRange']>) => void;
  setCampaignStatus: (status: string | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

const initialState = {
  dateRange: { startDate: null, endDate: null, days: 7 },
  campaignStatus: null,
  searchQuery: '',
};

export const useFilterStore = create<FilterState>((set) => ({
  ...initialState,
  setDateRange: (range) =>
    set((state) => ({ dateRange: { ...state.dateRange, ...range } })),
  setCampaignStatus: (status) => set({ campaignStatus: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () => set(initialState),
}));
```

---

## Phase 5: 코드 품질 개선

### 5.1 중복 코드 통합

#### 수정: `src/lib/utils.ts`

```typescript
// 변화율 계산 함수 (기존 중복 제거)
export function calculateChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// 통화 포맷
export function formatCurrency(value: number, currency = 'KRW'): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

// 퍼센트 포맷
export function formatPercent(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

// 숫자 포맷 (K, M 등)
export function formatNumber(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}

// 날짜 포맷
export function formatDate(date: Date | string, format = 'YYYY-MM-DD'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day);
}
```

### 5.2 하드코딩 값 설정화

#### 신규 파일: `src/lib/config.ts`

```typescript
// 환경 설정
export const config = {
  // AI 설정
  ai: {
    defaultModel: (process.env.AI_DEFAULT_MODEL as 'gpt-4o' | 'gpt-4o-mini') || 'gpt-4o-mini',
    cacheTTL: parseInt(process.env.AI_CACHE_TTL || '21600'), // 6 hours
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),
  },

  // 분석 설정
  analytics: {
    defaultConversionValue: parseInt(process.env.DEFAULT_CONVERSION_VALUE || '50000'),
    benchmarks: {
      ctr: parseFloat(process.env.BENCHMARK_CTR || '1.0'),
      cvr: parseFloat(process.env.BENCHMARK_CVR || '2.0'),
      cpa: parseInt(process.env.BENCHMARK_CPA || '10000'),
      avgImpressions: parseInt(process.env.BENCHMARK_IMPRESSIONS || '50000'),
      avgVideoPlayTime: parseInt(process.env.BENCHMARK_VIDEO_PLAY_TIME || '8'),
    },
  },

  // Rate Limiting
  rateLimit: {
    ai: {
      interval: parseInt(process.env.RATE_LIMIT_AI_INTERVAL || '60000'), // 1 min
      maxRequests: parseInt(process.env.RATE_LIMIT_AI_MAX || '5'),
    },
  },
};

export type Config = typeof config;
```

#### 수정: `src/app/api/accounts/[accountId]/metrics/route.ts`

```typescript
import { config } from '@/lib/config';

// Before
const roas = totalSpend > 0 ? (totalConversions * 50000) / totalSpend : 0;

// After
const roas = totalSpend > 0
  ? (totalConversions * config.analytics.defaultConversionValue) / totalSpend
  : 0;
```

---

## 구현 순서 체크리스트

### Phase 1: API 보안 강화
- [ ] `src/lib/api/validation.ts` 생성
- [ ] `src/lib/api/schemas.ts` 생성
- [ ] `src/lib/api/auth.ts` 생성
- [ ] `src/lib/api/rate-limit.ts` 생성
- [ ] AI API 라우트에 검증/인증/Rate Limit 적용

### Phase 2: AI 비용 최적화
- [ ] `src/lib/ai/prompts/templates.ts` 생성
- [ ] `src/lib/ai/client.ts` 수정 (모델 선택)
- [ ] `src/lib/ai/cache.ts` 생성
- [ ] `prisma/schema.prisma`에 AICache 모델 추가
- [ ] AI 라우트에 캐싱/Fallback 적용

### Phase 3: DB 성능 최적화
- [ ] `prisma/schema.prisma` 인덱스 추가
- [ ] `src/lib/crypto.ts` 생성
- [ ] `src/lib/tiktok/auth.ts` 수정
- [ ] `src/lib/db/prisma.ts` 소프트 삭제 미들웨어
- [ ] 마이그레이션 실행

### Phase 4: 프론트엔드 개선
- [ ] @tanstack/react-query, zustand 설치
- [ ] `src/lib/providers/query-provider.tsx` 생성
- [ ] `src/lib/hooks/useQueries.ts` 생성
- [ ] `src/types/api.ts` 생성
- [ ] `src/stores/*.ts` 생성
- [ ] 대시보드 페이지 리팩토링

### Phase 5: 코드 품질 개선
- [ ] `src/lib/utils.ts` 함수 추가
- [ ] `src/lib/config.ts` 생성
- [ ] 중복 코드 import 변경
- [ ] 하드코딩 값 설정 참조로 변경

---

## 성공 기준

| 항목 | 기준 |
|------|------|
| API 입력 검증 | 모든 POST/PUT API에 Zod 스키마 적용 |
| 인증 적용 | 모든 계정 관련 API에 소유권 검증 |
| Rate Limiting | AI API에 분당 5회 제한 |
| 프롬프트 통합 | 템플릿 파일 1개로 통합 |
| AI 비용 | 40% 이상 절감 |
| DB 쿼리 | 레벨별 조회 50% 이상 개선 |
| 타입 안전성 | `any` 타입 0개 |
| 테스트 커버리지 | 핵심 알고리즘 80% |

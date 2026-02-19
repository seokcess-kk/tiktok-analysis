import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// 타입 정의
// ============================================================

interface RateLimitOptions {
  interval: number;    // 시간 윈도우 (ms)
  maxRequests: number; // 최대 요청 수
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

// ============================================================
// 인메모리 캐시 (Map 기반)
// 프로덕션에서는 Redis 권장
// ============================================================

const rateLimitCache = new Map<string, RateLimitEntry>();

// 캐시 정리 (1분마다)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitCache.entries()) {
    if (entry.resetAt < now) {
      rateLimitCache.delete(key);
    }
  }
}, 60 * 1000);

// ============================================================
// Rate Limiter 생성
// ============================================================

export function createRateLimiter(options: RateLimitOptions) {
  const { interval, maxRequests } = options;

  return async function checkRateLimit(
    request: NextRequest,
    identifier: string
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const key = `rate-limit:${identifier}`;

    let entry = rateLimitCache.get(key);

    // 새 윈도우 시작 또는 기존 윈도우 만료
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
      limit: maxRequests,
    };
  };
}

// ============================================================
// 사전 정의된 Rate Limiters
// ============================================================

// AI API용: 분당 5회
export const aiRateLimiter = createRateLimiter({
  interval: 60 * 1000,  // 1분
  maxRequests: 5,
});

// 일반 API용: 분당 60회
export const generalRateLimiter = createRateLimiter({
  interval: 60 * 1000,
  maxRequests: 60,
});

// 동기화 API용: 분당 2회
export const syncRateLimiter = createRateLimiter({
  interval: 60 * 1000,
  maxRequests: 2,
});

// ============================================================
// 응답 헬퍼
// ============================================================

export function rateLimitExceededResponse(result: RateLimitResult) {
  const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);

  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter,
      },
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Limit': String(result.limit),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
      },
    }
  );
}

/**
 * Rate Limit 헤더 추가
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult
): NextResponse {
  response.headers.set('X-RateLimit-Limit', String(result.limit));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
  return response;
}

// ============================================================
// Identifier 생성 헬퍼
// ============================================================

/**
 * 요청에서 클라이언트 식별자 추출
 * IP + User-Agent 조합 또는 사용자 ID
 */
export function getClientIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // IP 주소 추출
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';

  // User-Agent 해시
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const uaHash = hashString(userAgent).slice(0, 8);

  return `ip:${ip}:${uaHash}`;
}

/**
 * 간단한 해시 함수
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// ============================================================
// 미들웨어 래퍼
// ============================================================

type RouteHandler = (
  request: NextRequest,
  context: { params: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Rate Limiting이 적용된 라우트 핸들러 래퍼
 */
export function withRateLimit(
  handler: RouteHandler,
  rateLimiter: ReturnType<typeof createRateLimiter>,
  getIdentifier?: (request: NextRequest, params: Record<string, string>) => string
): RouteHandler {
  return async (request, context) => {
    const identifier = getIdentifier
      ? getIdentifier(request, context.params)
      : getClientIdentifier(request);

    const result = await rateLimiter(request, identifier);

    if (!result.success) {
      return rateLimitExceededResponse(result);
    }

    const response = await handler(request, context);
    return addRateLimitHeaders(response, result);
  };
}

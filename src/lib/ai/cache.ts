/**
 * AI 응답 캐싱 모듈
 *
 * 동일한 파라미터에 대한 AI 응답을 캐싱하여 비용을 절감합니다.
 * 기본 TTL: 6시간
 */

import crypto from 'crypto';

// ============================================================
// 타입 정의
// ============================================================

export interface CacheOptions {
  ttl?: number;  // seconds, default: 6 hours
}

export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

export type CacheType = 'insight' | 'strategy';

// ============================================================
// 상수
// ============================================================

const DEFAULT_TTL = 6 * 60 * 60; // 6 hours in seconds
const MAX_CACHE_SIZE = 1000;     // 최대 캐시 항목 수

// ============================================================
// 인메모리 캐시 (Map 기반)
// 프로덕션에서는 Redis 또는 DB 기반 캐싱 권장
// ============================================================

const cache = new Map<string, CacheEntry<unknown>>();

// 주기적 캐시 정리 (5분마다)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (entry.expiresAt < now) {
        cache.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

// ============================================================
// 캐시 키 생성
// ============================================================

/**
 * 캐시 키 생성
 * type + accountId + params의 해시로 구성
 */
export function generateCacheKey(
  type: CacheType,
  accountId: string,
  params: Record<string, unknown>
): string {
  // 파라미터를 정렬된 JSON으로 변환 후 해시
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((obj, key) => {
      obj[key] = params[key];
      return obj;
    }, {} as Record<string, unknown>);

  const paramsString = JSON.stringify(sortedParams);
  const hash = crypto.createHash('md5').update(paramsString).digest('hex');

  return `ai-${type}:${accountId}:${hash}`;
}

// ============================================================
// 캐시 조회
// ============================================================

/**
 * 캐시에서 결과 조회
 * 만료된 경우 null 반환
 */
export function getCachedResult<T>(cacheKey: string): T | null {
  const entry = cache.get(cacheKey) as CacheEntry<T> | undefined;

  if (!entry) {
    return null;
  }

  // 만료 확인
  if (entry.expiresAt < Date.now()) {
    cache.delete(cacheKey);
    return null;
  }

  console.log(`[AI Cache] Cache hit: ${cacheKey}`);
  return entry.value;
}

// ============================================================
// 캐시 저장
// ============================================================

/**
 * 캐시에 결과 저장
 */
export function setCachedResult<T>(
  cacheKey: string,
  value: T,
  options: CacheOptions = {}
): void {
  const ttl = options.ttl || DEFAULT_TTL;
  const now = Date.now();

  // 캐시 크기 제한 - LRU 방식으로 오래된 항목 제거
  if (cache.size >= MAX_CACHE_SIZE) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  cache.set(cacheKey, {
    value,
    expiresAt: now + ttl * 1000,
    createdAt: now,
  });

  console.log(`[AI Cache] Cache set: ${cacheKey} (TTL: ${ttl}s)`);
}

// ============================================================
// 캐시 무효화
// ============================================================

/**
 * 특정 패턴의 캐시 무효화
 */
export function invalidateCache(pattern: string): number {
  let count = 0;

  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
      count++;
    }
  }

  if (count > 0) {
    console.log(`[AI Cache] Invalidated ${count} entries matching: ${pattern}`);
  }

  return count;
}

/**
 * 특정 계정의 모든 캐시 무효화
 */
export function invalidateAccountCache(accountId: string): number {
  return invalidateCache(`ai-:${accountId}:`);
}

/**
 * 전체 캐시 클리어
 */
export function clearCache(): void {
  const size = cache.size;
  cache.clear();
  console.log(`[AI Cache] Cleared all ${size} entries`);
}

// ============================================================
// 캐시 통계
// ============================================================

export interface CacheStats {
  size: number;
  maxSize: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}

/**
 * 캐시 통계 조회
 */
export function getCacheStats(): CacheStats {
  let oldestEntry: number | null = null;
  let newestEntry: number | null = null;

  for (const entry of cache.values()) {
    if (oldestEntry === null || entry.createdAt < oldestEntry) {
      oldestEntry = entry.createdAt;
    }
    if (newestEntry === null || entry.createdAt > newestEntry) {
      newestEntry = entry.createdAt;
    }
  }

  return {
    size: cache.size,
    maxSize: MAX_CACHE_SIZE,
    oldestEntry,
    newestEntry,
  };
}

// ============================================================
// 캐시 래퍼 (편의 함수)
// ============================================================

/**
 * 캐시를 적용한 AI 호출 래퍼
 */
export async function withCache<T>(
  cacheKey: string,
  fn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<{ data: T; cached: boolean }> {
  // 캐시 확인
  const cached = getCachedResult<T>(cacheKey);
  if (cached !== null) {
    return { data: cached, cached: true };
  }

  // AI 호출
  const result = await fn();

  // 캐시 저장
  setCachedResult(cacheKey, result, options);

  return { data: result, cached: false };
}

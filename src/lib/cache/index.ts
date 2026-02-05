/**
 * Simple In-Memory Cache
 * 실제 프로덕션에서는 Redis로 교체 권장
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 주기적으로 만료된 항목 정리 (5분마다)
    if (typeof window === 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    }
  }

  /**
   * 캐시에서 값 가져오기
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * 캐시에 값 저장
   * @param key 캐시 키
   * @param value 저장할 값
   * @param ttlSeconds TTL (초 단위, 기본 5분)
   */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * 캐시에서 삭제
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 패턴과 일치하는 키 모두 삭제
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 전체 캐시 초기화
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 만료된 항목 정리
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 캐시 통계
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 싱글톤 인스턴스
export const cache = new MemoryCache();

/**
 * 캐시 키 생성 헬퍼
 */
export const cacheKeys = {
  metrics: (accountId: string, period: string) => `metrics:${accountId}:${period}`,
  insights: (accountId: string) => `insights:${accountId}`,
  strategies: (accountId: string) => `strategies:${accountId}`,
  creatives: (accountId: string) => `creatives:${accountId}`,
  dashboard: (accountId: string, period: string) => `dashboard:${accountId}:${period}`,
  account: (accountId: string) => `account:${accountId}`,
};

/**
 * 캐시된 함수 실행 (캐시 미스 시 함수 실행 후 캐싱)
 */
export async function cached<T>(
  key: string,
  fn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const cachedValue = cache.get<T>(key);

  if (cachedValue !== null) {
    return cachedValue;
  }

  const result = await fn();
  cache.set(key, result, ttlSeconds);

  return result;
}

/**
 * 계정 데이터 변경 시 관련 캐시 무효화
 */
export function invalidateAccountCache(accountId: string): void {
  cache.deletePattern(`*:${accountId}:*`);
  cache.deletePattern(`*:${accountId}`);
}

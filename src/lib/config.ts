/**
 * 애플리케이션 설정
 *
 * 환경 변수 기반 중앙 집중식 설정 관리
 * 하드코딩된 값 대신 이 설정을 사용하세요.
 */

// ============================================================
// 환경 변수 파싱 헬퍼
// ============================================================

function getEnvString(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

function getEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvFloat(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

function getEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

// ============================================================
// 설정 객체
// ============================================================

export const config = {
  /**
   * AI 관련 설정
   */
  ai: {
    /** 기본 AI 모델 */
    defaultModel: getEnvString('AI_DEFAULT_MODEL', 'gpt-4o-mini') as 'gpt-4o' | 'gpt-4o-mini',
    /** 캐시 TTL (초) - 기본 6시간 */
    cacheTTL: getEnvInt('AI_CACHE_TTL', 21600),
    /** 최대 재시도 횟수 */
    maxRetries: getEnvInt('AI_MAX_RETRIES', 3),
    /** 요청 타임아웃 (ms) */
    timeout: getEnvInt('AI_TIMEOUT', 30000),
    /** 최대 토큰 수 */
    maxTokens: getEnvInt('AI_MAX_TOKENS', 2000),
  },

  /**
   * 분석 관련 설정
   */
  analytics: {
    /** 기본 전환 가치 (원) */
    defaultConversionValue: getEnvInt('DEFAULT_CONVERSION_VALUE', 50000),
    /** 기본 조회 기간 (일) */
    defaultDays: getEnvInt('DEFAULT_ANALYTICS_DAYS', 7),
    /** 벤치마크 기준값 */
    benchmarks: {
      /** CTR 벤치마크 (%) */
      ctr: getEnvFloat('BENCHMARK_CTR', 1.0),
      /** CVR 벤치마크 (%) */
      cvr: getEnvFloat('BENCHMARK_CVR', 2.0),
      /** CPA 벤치마크 (원) */
      cpa: getEnvInt('BENCHMARK_CPA', 10000),
      /** 평균 노출수 */
      avgImpressions: getEnvInt('BENCHMARK_IMPRESSIONS', 50000),
      /** 평균 영상 재생 시간 (초) */
      avgVideoPlayTime: getEnvInt('BENCHMARK_VIDEO_PLAY_TIME', 8),
    },
  },

  /**
   * 이상 탐지 임계값
   */
  anomalyThresholds: {
    /** CPA 급등 임계값 (%) */
    cpaSpike: getEnvInt('ANOMALY_CPA_SPIKE', 30),
    /** CTR 급락 임계값 (%) */
    ctrDrop: getEnvInt('ANOMALY_CTR_DROP', 20),
    /** 노출수 급감 임계값 (%) */
    impressionDrop: getEnvInt('ANOMALY_IMPRESSION_DROP', 50),
    /** 예산 소진 속도 임계값 (%) */
    spendVelocity: getEnvInt('ANOMALY_SPEND_VELOCITY', 150),
    /** ROAS 하락 임계값 (%) */
    roasDrop: getEnvInt('ANOMALY_ROAS_DROP', 30),
  },

  /**
   * 크리에이티브 피로도 설정
   */
  creativeFatigue: {
    /** 높은 피로도 임계값 */
    highThreshold: getEnvInt('FATIGUE_HIGH_THRESHOLD', 70),
    /** 중간 피로도 임계값 */
    mediumThreshold: getEnvInt('FATIGUE_MEDIUM_THRESHOLD', 40),
    /** 피로도 계산 기간 (일) */
    calculationDays: getEnvInt('FATIGUE_CALCULATION_DAYS', 14),
  },

  /**
   * Rate Limiting 설정
   */
  rateLimit: {
    /** AI API Rate Limit */
    ai: {
      /** 간격 (ms) - 기본 1분 */
      interval: getEnvInt('RATE_LIMIT_AI_INTERVAL', 60000),
      /** 최대 요청 수 */
      maxRequests: getEnvInt('RATE_LIMIT_AI_MAX', 5),
    },
    /** 일반 API Rate Limit */
    api: {
      /** 간격 (ms) - 기본 1분 */
      interval: getEnvInt('RATE_LIMIT_API_INTERVAL', 60000),
      /** 최대 요청 수 */
      maxRequests: getEnvInt('RATE_LIMIT_API_MAX', 100),
    },
  },

  /**
   * TikTok API 설정
   */
  tiktok: {
    /** API 기본 URL */
    apiBaseUrl: getEnvString('TIKTOK_API_BASE_URL', 'https://business-api.tiktok.com/open_api/v1.3'),
    /** 초당 요청 제한 */
    rateLimit: getEnvInt('TIKTOK_RATE_LIMIT', 10),
    /** 요청 타임아웃 (ms) */
    timeout: getEnvInt('TIKTOK_TIMEOUT', 30000),
    /** 재시도 횟수 */
    maxRetries: getEnvInt('TIKTOK_MAX_RETRIES', 3),
  },

  /**
   * 캐시 설정
   */
  cache: {
    /** 메트릭 캐시 TTL (초) - 기본 5분 */
    metricsTTL: getEnvInt('CACHE_METRICS_TTL', 300),
    /** 캠페인 캐시 TTL (초) - 기본 10분 */
    campaignsTTL: getEnvInt('CACHE_CAMPAIGNS_TTL', 600),
    /** 인사이트 캐시 TTL (초) - 기본 6시간 */
    insightsTTL: getEnvInt('CACHE_INSIGHTS_TTL', 21600),
  },

  /**
   * 페이지네이션 설정
   */
  pagination: {
    /** 기본 페이지 크기 */
    defaultPageSize: getEnvInt('DEFAULT_PAGE_SIZE', 20),
    /** 최대 페이지 크기 */
    maxPageSize: getEnvInt('MAX_PAGE_SIZE', 100),
  },

  /**
   * 기능 플래그
   */
  features: {
    /** AI 기능 활성화 */
    aiEnabled: getEnvBool('FEATURE_AI_ENABLED', true),
    /** 캐싱 활성화 */
    cachingEnabled: getEnvBool('FEATURE_CACHING_ENABLED', true),
    /** Rate Limiting 활성화 */
    rateLimitEnabled: getEnvBool('FEATURE_RATE_LIMIT_ENABLED', true),
    /** 디버그 모드 */
    debugMode: getEnvBool('DEBUG_MODE', false),
  },
} as const;

// ============================================================
// 타입 내보내기
// ============================================================

export type Config = typeof config;
export type AIConfig = typeof config.ai;
export type AnalyticsConfig = typeof config.analytics;
export type RateLimitConfig = typeof config.rateLimit;

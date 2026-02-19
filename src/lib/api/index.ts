// API 유틸리티 모듈 익스포트

// 검증
export {
  validateRequest,
  validateQuery,
  validationErrorResponse,
  type ValidationResult,
} from './validation';

// 스키마
export {
  // AI Insight
  InsightTypeEnum,
  GenerateInsightSchema,
  type GenerateInsightRequest,
  // AI Strategy
  StrategyTypeEnum,
  StrategyPriorityEnum,
  GenerateStrategySchema,
  StrategyActionSchema,
  type GenerateStrategyRequest,
  type StrategyActionRequest,
  // Metrics
  MetricLevelEnum,
  MetricsQuerySchema,
  type MetricsQueryRequest,
  // Campaign
  CampaignQuerySchema,
  type CampaignQueryRequest,
  // Creative
  CreativeQuerySchema,
  FatigueQuerySchema,
  type CreativeQueryRequest,
  type FatigueQueryRequest,
  // Common
  PaginationSchema,
  DateRangeSchema,
  type PaginationRequest,
  type DateRangeRequest,
} from './schemas';

// 인증
export {
  UnauthorizedError,
  ForbiddenError,
  verifyAccountAccess,
  tryVerifyAccountAccess,
  getCurrentUser,
  unauthorizedResponse,
  forbiddenResponse,
  withAuth,
  type AuthContext,
  type SessionUser,
} from './auth';

// Rate Limiting
export {
  createRateLimiter,
  aiRateLimiter,
  generalRateLimiter,
  syncRateLimiter,
  rateLimitExceededResponse,
  addRateLimitHeaders,
  getClientIdentifier,
  withRateLimit,
} from './rate-limit';

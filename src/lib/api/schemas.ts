import { z } from 'zod';

// ============================================================
// AI Insight 관련 스키마
// ============================================================

export const InsightTypeEnum = z.enum([
  'DAILY_SUMMARY',
  'ANOMALY',
  'TREND',
  'CREATIVE',
  'PREDICTION',
]);

export const GenerateInsightSchema = z.object({
  type: InsightTypeEnum.optional().default('DAILY_SUMMARY'),
  days: z.coerce.number().min(1).max(30).optional().default(7),
  forceRegenerate: z.coerce.boolean().optional().default(false),
});

export type GenerateInsightRequest = z.infer<typeof GenerateInsightSchema>;

// ============================================================
// AI Strategy 관련 스키마
// ============================================================

export const StrategyTypeEnum = z.enum([
  'BUDGET',
  'CAMPAIGN',
  'TARGETING',
  'CREATIVE',
  'BIDDING',
]);

export const StrategyPriorityEnum = z.enum(['HIGH', 'MEDIUM', 'LOW']);

export const GenerateStrategySchema = z.object({
  types: z.array(StrategyTypeEnum).optional(),
  priority: StrategyPriorityEnum.optional(),
  days: z.coerce.number().min(1).max(30).optional().default(7),
});

export type GenerateStrategyRequest = z.infer<typeof GenerateStrategySchema>;

export const StrategyActionSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type StrategyActionRequest = z.infer<typeof StrategyActionSchema>;

// ============================================================
// Metrics 조회 스키마
// ============================================================

export const MetricLevelEnum = z.enum([
  'ADVERTISER',
  'CAMPAIGN',
  'ADGROUP',
  'AD',
]);

export const MetricsQuerySchema = z.object({
  days: z.coerce.number().min(1).max(30).optional().default(7),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').optional(),
  level: MetricLevelEnum.optional().default('ADVERTISER'),
  compare: z.coerce.boolean().optional().default(false),
});

export type MetricsQueryRequest = z.infer<typeof MetricsQuerySchema>;

// ============================================================
// Campaign 관련 스키마
// ============================================================

export const CampaignQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

export type CampaignQueryRequest = z.infer<typeof CampaignQuerySchema>;

// ============================================================
// Creative 관련 스키마
// ============================================================

export const CreativeQuerySchema = z.object({
  days: z.coerce.number().min(1).max(30).optional().default(7),
  topN: z.coerce.number().min(1).max(50).optional().default(10),
  sortBy: z.enum(['score', 'spend', 'ctr', 'cvr', 'roas']).optional().default('score'),
});

export type CreativeQueryRequest = z.infer<typeof CreativeQuerySchema>;

export const FatigueQuerySchema = z.object({
  days: z.coerce.number().min(1).max(30).optional().default(7),
  minImpressions: z.coerce.number().min(0).optional().default(1000),
});

export type FatigueQueryRequest = z.infer<typeof FatigueQuerySchema>;

// ============================================================
// 공통 스키마
// ============================================================

export const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  offset: z.coerce.number().min(0).optional().default(0),
});

export type PaginationRequest = z.infer<typeof PaginationSchema>;

export const DateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  days: z.coerce.number().min(1).max(90).optional().default(7),
});

export type DateRangeRequest = z.infer<typeof DateRangeSchema>;
